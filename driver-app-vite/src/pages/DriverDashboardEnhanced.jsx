import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseDB } from '../utils/supabaseService';
import bidTimerManager from '../utils/bidTimerSync';

const DriverDashboardEnhanced = ({ driverData }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [availableRides, setAvailableRides] = useState([]);
  const [bidAmount, setBidAmount] = useState('');
  const [activeBidRide, setActiveBidRide] = useState(null);
  const [bidStatus, setBidStatus] = useState({});
  const [hasActiveRide, setHasActiveRide] = useState(false);
  const [driverEarnings, setDriverEarnings] = useState(null);
  
  const bidTimerSubscriptionRef = useRef(null);
  const bookingSubscriptionRef = useRef(null);
  const refreshIntervalRef = useRef(null);
  
  // Get driver data from localStorage if not passed as prop
  const driver = driverData || JSON.parse(localStorage.getItem('driverData') || '{}');

  useEffect(() => {
    if (!driver.uid && !driver.id) {
      navigate('/driver/login');
      return;
    }

    initializeDashboard();
    
    return () => {
      // Cleanup subscriptions and intervals
      if (bookingSubscriptionRef.current) {
        supabaseDB.realtime.unsubscribe(bookingSubscriptionRef.current);
      }
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      
      // Cleanup all bid timers managed by bidTimerManager
      bidTimerManager.cleanup();
    };
  }, [driver.uid, driver.id, navigate]);

  const initializeDashboard = async () => {
    await Promise.all([
      checkForActiveRide(),
      loadDriverEarnings(),
      loadAvailableRides()
    ]);
    
    setupRealtimeSubscriptions();
    setupTimerUpdates();
    setLoading(false);
  };

  const checkForActiveRide = async () => {
    try {
      const { data: activeRideData, error } = await supabaseDB.activeRides.getByDriverUserId(driver.uid);
      
      if (!error && activeRideData) {
        console.log('✅ Driver has active ride, redirecting...');
        setHasActiveRide(true);
        // Optionally auto-navigate to active rides
        setTimeout(() => {
          navigate('/driver/active-rides');
        }, 2000);
      } else {
        setHasActiveRide(false);
      }
    } catch (error) {
      console.error('Error checking active ride:', error);
      setHasActiveRide(false);
    }
  };

  const loadDriverEarnings = async () => {
    try {
      const driverId = driver.id || driver.uid;
      const { data: earnings, error } = await supabaseDB.driverEarnings.getByDriverId(driverId);
      
      if (!error && earnings) {
        setDriverEarnings(earnings);
      }
    } catch (error) {
      console.error('Error loading driver earnings:', error);
    }
  };

  const loadAvailableRides = async () => {
    try {
      // Get pending bookings
      const { data: rides, error } = await supabaseDB.bookings.getByStatus('pending');
      
      if (!error && rides && rides.length > 0) {
        console.log('✅ Found available rides:', rides.length);
        
        // Process rides with synchronized timers
        const ridesWithTimers = await Promise.all(
          rides.map(async (ride) => {
            try {
              // Check if driver has already bid
              const { data: existingBids } = await supabaseDB.bids.getByBooking(ride.id);
              const hasDriverBid = existingBids?.some(bid => 
                bid.driver_id === (driver.id || driver.uid)
              );
              
              // Start synchronized timer for this ride
              const timerInfo = await bidTimerManager.startTimer(
                ride.id,
                300, // 5 minutes
                (timerUpdate) => {
                  // Update callback - update ride in state
                  setAvailableRides(prev => 
                    prev.map(r => 
                      r.id === ride.id 
                        ? { ...r, timeRemaining: timerUpdate.remainingSeconds }
                        : r
                    ).filter(r => r.timeRemaining > 0) // Remove expired rides
                  );
                },
                (expiredBookingId) => {
                  // Expire callback - remove ride from list
                  console.log(`⏰ Ride ${expiredBookingId} expired, removing from list`);
                  setAvailableRides(prev => prev.filter(r => r.id !== expiredBookingId));
                }
              );
              
              const timeRemaining = timerInfo ? timerInfo.remainingSeconds : 0;
              
              return {
                ...ride,
                timeRemaining,
                hasDriverBid,
                source: 'database',
                timerInfo
              };
            } catch (error) {
              console.error('Error processing ride timer:', ride.id, error);
              return {
                ...ride,
                timeRemaining: 0,
                hasDriverBid: false,
                source: 'database'
              };
            }
          })
        );
        
        // Filter out expired rides
        const validRides = ridesWithTimers.filter(ride => ride.timeRemaining > 0);
        setAvailableRides(validRides);
      } else {
        console.log('ℹ️ No available rides found');
        setAvailableRides([]);
      }
    } catch (error) {
      console.error('Error loading available rides:', error);
      setAvailableRides([]);
    }
  };

  const setupRealtimeSubscriptions = () => {
    try {
      // Subscribe to booking changes only (timers are handled by bidTimerManager)
      bookingSubscriptionRef.current = supabaseDB.realtime.subscribeToBookings((payload) => {
        console.log('📋 Booking update:', payload);
        
        if (payload.eventType === 'INSERT' && payload.new?.status === 'pending') {
          // New ride available, reload rides
          loadAvailableRides();
        } else if (payload.eventType === 'UPDATE' && payload.new?.status === 'confirmed') {
          // Ride was confirmed, remove from available rides
          const confirmedRideId = payload.new.id;
          
          // Stop timer for this ride
          bidTimerManager.stopTimer(confirmedRideId);
          
          // Remove from available rides
          setAvailableRides(prev => prev.filter(ride => ride.id !== confirmedRideId));
        }
      });
    } catch (error) {
      console.error('Failed to setup realtime subscriptions:', error);
    }
  };

  const setupTimerUpdates = () => {
    // Timer updates are now handled by bidTimerManager
    // This function is kept for compatibility but does nothing
    console.log('✅ Timer updates delegated to bidTimerManager');
  };

  const startBidding = (rideId) => {
    setBidStatus(prev => ({ ...prev, [rideId]: 'bidding' }));
    setActiveBidRide(rideId);
    setBidAmount('');
  };

  const cancelBidding = (rideId) => {
    setBidStatus(prev => ({ ...prev, [rideId]: null }));
    setActiveBidRide(null);
    setBidAmount('');
  };

  const handleBidSubmit = async (rideId) => {
    if (!bidAmount || parseFloat(bidAmount) <= 0) {
      alert('Please enter a valid bid amount.');
      return;
    }

    const bidData = {
      booking_id: rideId,
      driver_id: driver.id || driver.uid,
      amount: parseFloat(bidAmount),
      status: 'pending'
    };

    try {
      const { data, error } = await supabaseDB.bids.add(bidData);
      
      if (error) {
        throw error;
      }

      // Update bid status
      setBidStatus(prev => ({ ...prev, [rideId]: 'submitted' }));
      setActiveBidRide(null);
      setBidAmount('');

      // Update the ride to show bid was placed
      setAvailableRides(prev => 
        prev.map(ride => 
          ride.id === rideId 
            ? { ...ride, hasDriverBid: true }
            : ride
        )
      );

      alert('Your bid has been submitted successfully!');
    } catch (error) {
      console.error('Error submitting bid:', error);
      alert('Failed to submit bid. Please try again.');
    }
  };

  const handleAcceptRide = async (rideId, fare) => {
    try {
      const currentRide = availableRides.find(ride => ride.id === rideId);
      
      if (!currentRide) {
        alert('Ride not found');
        return;
      }

      console.log('🚗 Accepting ride:', rideId, 'for driver:', driver.uid);

      // Check if driver already has an active ride to prevent duplicates
      const { data: existingActiveRide } = await supabaseDB.activeRides.getByDriverUserId(driver.uid);
      if (existingActiveRide) {
        alert('You already have an active ride. Complete it before accepting a new one.');
        return;
      }

      // Use the enhanced assign_ride_to_driver function
      const { data, error } = await supabaseDB.rpc('assign_ride_to_driver', {
        p_booking_id: rideId,
        p_driver_id: driver.id || driver.uid,
        p_driver_user_id: driver.uid,
        p_user_id: currentRide.user_id,
        p_bid_amount: fare
      });

      if (error) {
        console.error('Ride assignment error:', error);
        throw error;
      }

      const result = typeof data === 'string' ? JSON.parse(data) : data;
      
      if (result.success) {
        console.log('✅ Ride assigned successfully:', result);
        
        // Stop timer for this ride
        bidTimerManager.stopTimer(rideId);
        
        // Remove ride from available rides
        setAvailableRides(prev => prev.filter(ride => ride.id !== rideId));
        
        // Store ride acceptance info for seamless flow
        localStorage.setItem('acceptedRideInfo', JSON.stringify({
          rideHistoryId: result.ride_history_id,
          otp: result.otp,
          acceptedAt: new Date().toISOString(),
          skipOtpEntry: true // Flag to skip OTP entry in active rides
        }));
        
        // Show success message
        alert(`Ride accepted successfully!\n\nRedirecting to your active ride...`);
        
        // Navigate to active rides immediately
        navigate('/driver/active-rides');
      } else {
        alert(result.message || 'Failed to accept ride');
      }
    } catch (error) {
      console.error('Error accepting ride:', error);
      if (error.message.includes('already has an active ride')) {
        alert('You already have an active ride. Please complete it first.');
      } else {
        alert('Failed to accept ride. Please try again.');
      }
    }
  };

  const formatTimeRemaining = (seconds) => {
    return bidTimerManager.formatTime(seconds);
  };

  if (loading) {
    return (
      <div className="driver-dashboard-loading">
        <div className="loading-spinner">⟳</div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  if (hasActiveRide) {
    return (
      <div className="driver-active-ride-notice">
        <div className="notice-card">
          <h2>🚗 You have an active ride!</h2>
          <p>Redirecting to your active ride...</p>
          <button 
            onClick={() => navigate('/driver/active-rides')}
            className="goto-active-btn"
          >
            Go to Active Ride
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="driver-dashboard-enhanced">
      <div className="driver-header">
        <div className="driver-info">
          <h2>Welcome, {driver.name}! 🚗</h2>
          <div className="driver-stats">
            <span className="rating">⭐ {driver.rating || 5.0}</span>
            <span className="rides">🚕 {driver.totalRides || 0} rides</span>
            <span className="vehicle">🚙 {driver.vehicleType}</span>
          </div>
        </div>
      </div>

      {/* Earnings Summary */}
      {driverEarnings && (
        <div className="earnings-summary">
          <h3>💰 Your Earnings</h3>
          <div className="earnings-grid">
            <div className="earning-card">
              <span className="label">Today</span>
              <span className="amount">₹{driverEarnings.today_earnings || 0}</span>
            </div>
            <div className="earning-card">
              <span className="label">Total</span>
              <span className="amount">₹{driverEarnings.total_earnings || 0}</span>
            </div>
            <div className="earning-card">
              <span className="label">Rides</span>
              <span className="amount">{driverEarnings.completed_rides || 0}</span>
            </div>
          </div>
        </div>
      )}

      {/* Available Rides */}
      <div className="available-rides-section">
        <h3>
          Available Ride Requests 
          <span className="rides-count">({availableRides.length})</span>
        </h3>
        
        {availableRides.length === 0 ? (
          <div className="no-rides">
            <p>🚕 No ride requests available at the moment</p>
            <p>New requests will appear here automatically</p>
          </div>
        ) : (
          <div className="rides-list">
            {availableRides.map(ride => (
              <div key={ride.id} className="ride-request-card">
                <div className="ride-header">
                  <div className="route-info">
                    <div className="pickup">
                      <span className="icon">📍</span>
                      <span className="address">{ride.pickup_address || 'Pickup Location'}</span>
                    </div>
                    <div className="arrow">↓</div>
                    <div className="drop">
                      <span className="icon">🏁</span>
                      <span className="address">{ride.drop_address || 'Drop Location'}</span>
                    </div>
                  </div>
                </div>

                <div className="ride-details">
                  <div className="customer-info">
                    <span className="customer">👤 {ride.customer_name || 'Customer'}</span>
                  </div>
                  
                  <div className="ride-metadata">
                    <div className={`time-remaining ${ride.timeRemaining <= 0 ? 'expired' : ride.timeRemaining <= 30 ? 'warning' : ''}`}>
                      <span className="icon">⏱️</span>
                      <span className="time">
                        {ride.timeRemaining <= 0 ? 'EXPIRED' : `${formatTimeRemaining(ride.timeRemaining)} left`}
                      </span>
                    </div>
                    
                    {ride.estimated_fare && (
                      <div className="suggested-price">
                        <span className="label">Estimated Fare:</span>
                        <span className="price">₹{ride.estimated_fare}</span>
                      </div>
                    )}

                    {ride.distance && (
                      <div className="distance">
                        <span className="label">Distance:</span>
                        <span className="value">{ride.distance} km</span>
                      </div>
                    )}
                  </div>
                  
                  {ride.hasDriverBid && (
                    <div className="already-bid-notice">
                      ✅ You have already placed a bid for this ride
                    </div>
                  )}
                </div>
                
                <div className="ride-actions">
                  {bidStatus[ride.id] === 'bidding' ? (
                    <div className="bid-form">
                      <input
                        type="number"
                        placeholder="Enter your bid"
                        value={bidAmount}
                        onChange={(e) => setBidAmount(e.target.value)}
                        min={1}
                        className="bid-input"
                      />
                      <button 
                        className="bid-submit-btn" 
                        onClick={() => handleBidSubmit(ride.id)}
                        disabled={!bidAmount || parseFloat(bidAmount) <= 0}
                      >
                        Submit Bid
                      </button>
                      <button 
                        className="bid-cancel-btn" 
                        onClick={() => cancelBidding(ride.id)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : bidStatus[ride.id] === 'submitted' ? (
                    <div className="bid-submitted">
                      ✅ Bid submitted - waiting for customer response
                    </div>
                  ) : ride.hasDriverBid ? (
                    <div className="bid-already-placed">
                      ✅ Bid Already Placed
                    </div>
                  ) : (
                    <div className="action-buttons">
                      <button 
                        className="bid-btn" 
                        onClick={() => startBidding(ride.id)}
                        disabled={ride.timeRemaining <= 0}
                      >
                        💰 Place Bid
                      </button>
                      <button 
                        className="accept-btn" 
                        onClick={() => handleAcceptRide(ride.id, ride.estimated_fare)}
                        disabled={ride.timeRemaining <= 0}
                      >
                        ✅ Accept (₹{ride.estimated_fare})
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .driver-dashboard-enhanced {
          min-height: 100vh;
          background: #f5f5f5;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          padding-bottom: 20px;
        }

        .driver-header {
          background: white;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .driver-info h2 {
          margin: 0 0 10px 0;
          color: #333;
        }

        .driver-stats {
          display: flex;
          gap: 15px;
          font-size: 14px;
        }

        .driver-stats span {
          padding: 4px 8px;
          background: #f0f0f0;
          border-radius: 4px;
        }

        .earnings-summary {
          background: white;
          margin: 20px;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .earnings-summary h3 {
          margin: 0 0 15px 0;
          color: #333;
        }

        .earnings-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 15px;
        }

        .earning-card {
          background: #f8f9fa;
          padding: 15px;
          border-radius: 8px;
          text-align: center;
        }

        .earning-card .label {
          display: block;
          font-size: 14px;
          color: #666;
          margin-bottom: 5px;
        }

        .earning-card .amount {
          display: block;
          font-size: 18px;
          font-weight: bold;
          color: #333;
        }

        .available-rides-section {
          margin: 20px;
        }

        .available-rides-section h3 {
          color: #333;
          margin-bottom: 15px;
        }

        .rides-count {
          color: #666;
          font-weight: normal;
        }

        .no-rides {
          text-align: center;
          padding: 40px 20px;
          background: white;
          border-radius: 12px;
          color: #666;
        }

        .rides-list {
          display: grid;
          gap: 15px;
        }

        .ride-request-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }

        .route-info {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 15px;
        }

        .pickup, .drop {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .arrow {
          text-align: center;
          color: #666;
          font-size: 18px;
        }

        .ride-details {
          margin-bottom: 15px;
        }

        .customer-info {
          margin-bottom: 10px;
        }

        .ride-metadata {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 10px;
        }

        .time-remaining {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 5px 10px;
          border-radius: 20px;
          background: #e8f5e8;
          color: #2e7d32;
          font-weight: 500;
        }

        .time-remaining.warning {
          background: #fff3e0;
          color: #f57c00;
        }

        .time-remaining.expired {
          background: #ffebee;
          color: #c62828;
        }

        .suggested-price, .distance {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .already-bid-notice {
          background: #e8f5e8;
          color: #2e7d32;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 14px;
        }

        .action-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .bid-btn, .accept-btn {
          padding: 12px;
          border: none;
          border-radius: 8px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
        }

        .bid-btn {
          background: #2196f3;
          color: white;
        }

        .bid-btn:hover:not(:disabled) {
          background: #1976d2;
        }

        .accept-btn {
          background: #4caf50;
          color: white;
        }

        .accept-btn:hover:not(:disabled) {
          background: #45a049;
        }

        .bid-btn:disabled, .accept-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .bid-form {
          display: grid;
          grid-template-columns: 1fr auto auto;
          gap: 10px;
          align-items: center;
        }

        .bid-input {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 6px;
          font-size: 14px;
        }

        .bid-submit-btn, .bid-cancel-btn {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
        }

        .bid-submit-btn {
          background: #4caf50;
          color: white;
        }

        .bid-cancel-btn {
          background: #f44336;
          color: white;
        }

        .bid-submitted, .bid-already-placed {
          background: #e8f5e8;
          color: #2e7d32;
          padding: 10px;
          border-radius: 6px;
          text-align: center;
          font-size: 14px;
        }

        .driver-dashboard-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: #f5f5f5;
        }

        .loading-spinner {
          font-size: 48px;
          animation: spin 1s linear infinite;
        }

        .driver-active-ride-notice {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: #f5f5f5;
        }

        .notice-card {
          background: white;
          padding: 40px;
          border-radius: 12px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          text-align: center;
        }

        .goto-active-btn {
          background: #4caf50;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          margin-top: 20px;
        }

        .goto-active-btn:hover {
          background: #45a049;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .earnings-grid {
            grid-template-columns: 1fr;
          }

          .ride-metadata {
            grid-template-columns: 1fr;
          }

          .action-buttons {
            grid-template-columns: 1fr;
          }

          .bid-form {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default DriverDashboardEnhanced;
