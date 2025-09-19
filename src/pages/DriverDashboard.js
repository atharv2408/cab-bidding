import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseDB } from '../utils/supabaseService';
import EnhancedOTPNotification from '../components/EnhancedOTPNotification';

const DriverDashboard = ({ driverData }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [availableRides, setAvailableRides] = useState([]);
  const [bidAmount, setBidAmount] = useState('');
  const [activeBidRide, setActiveBidRide] = useState(null);
  const [bidStatus, setBidStatus] = useState({});
  const [confirmedRide, setConfirmedRide] = useState(null);
  const [showNotification, setShowNotification] = useState(false);
  
  // Get driver data from localStorage if not passed as prop
  const driver = driverData || JSON.parse(localStorage.getItem('driverData') || '{}');

  useEffect(() => {
    if (!driver.uid && !driver.id) {
      navigate('/driver/login');
      return;
    }

    // Clean up completed ride notifications to prevent OTP popups
    const cleanupCompletedRideNotifications = () => {
      try {
        // Check for completed rides and mark them as processed
        const completedRides = JSON.parse(localStorage.getItem('customerRideHistory') || '[]');
        const driverRideHistory = JSON.parse(localStorage.getItem('driverRideHistory') || '[]');
        const allCompletedRides = [...completedRides, ...driverRideHistory];
        
        // Get existing shown notifications list
        const shownRides = JSON.parse(localStorage.getItem('shownNotificationRides') || '[]');
        let updated = false;
        
        allCompletedRides.forEach(ride => {
          if ((ride.status === 'completed' || ride.completed_at) && 
              (ride.selected_driver_id === driver.id || ride.selected_driver_id === driver.uid) &&
              !shownRides.includes(ride.id)) {
            shownRides.push(ride.id);
            updated = true;
            console.log('🔒 Marked completed ride to prevent OTP notifications:', ride.id);
          }
        });
        
        // Check for active ride and mark to prevent OTP notifications
        const activeRide = localStorage.getItem('activeRide');
        if (activeRide) {
          const activeRideData = JSON.parse(activeRide);
          if ((activeRideData.selected_driver_id === driver.id || activeRideData.selected_driver_id === driver.uid) &&
              !shownRides.includes(activeRideData.id)) {
            shownRides.push(activeRideData.id);
            updated = true;
            console.log('🔒 Marked active ride to prevent OTP notifications:', activeRideData.id);
          }
        }
        
        if (updated) {
          localStorage.setItem('shownNotificationRides', JSON.stringify(shownRides.slice(-50)));
        }
        
        // Clear any stale notification data
        localStorage.removeItem('pendingDriverNotification');
        localStorage.removeItem(`notification_${driver.id}`);
        localStorage.removeItem(`notification_${driver.uid}`);
        
      } catch (error) {
        console.warn('Warning: Failed to cleanup completed ride notifications:', error);
      }
    };
    
    // Run cleanup immediately
    cleanupCompletedRideNotifications();

    // Load available rides - try database first, fallback to localStorage with deduplication
    const loadRides = async () => {
      try {
        let allRides = [];
        const rideIds = new Set(); // Track unique ride IDs to prevent duplicates
        
        // Try to load from database first
        try {
          const { data: rides, error } = await supabaseDB.bookings.getByStatus('pending');
          if (!error && rides && rides.length > 0) {
            console.log('✅ Found database rides:', rides.length);
            // Filter for live rides only (created within last 60 seconds)
            const now = new Date();
            const sixtySecondsAgo = new Date(now.getTime() - 60 * 1000);
            
            const liveRides = rides.filter(ride => {
              const rideCreated = new Date(ride.created_at);
              return rideCreated >= sixtySecondsAgo && !rideIds.has(ride.id);
            });
            
            if (liveRides.length > 0) {
              // For each live ride, check if this driver has already bid
              const ridesWithBidStatus = await Promise.all(
                liveRides.map(async (ride) => {
                  try {
                    const { data: existingBids } = await supabaseDB.bids.getByBooking(ride.id);
                    const hasDriverBid = existingBids?.some(bid => 
                      bid.driver_id === (driver.id || driver.uid)
                    );
                    
                    rideIds.add(ride.id); // Mark as processed
                    return {
                      ...ride,
                      source: 'database',
                      hasDriverBid,
                      timeRemaining: Math.max(0, Math.floor((new Date(ride.created_at).getTime() + 60 * 1000 - now.getTime()) / 1000))
                    };
                  } catch (error) {
                    console.error('Error checking bids for ride:', ride.id, error);
                    rideIds.add(ride.id);
                    return {
                      ...ride,
                      source: 'database',
                      hasDriverBid: false,
                      timeRemaining: Math.max(0, Math.floor((new Date(ride.created_at).getTime() + 60 * 1000 - now.getTime()) / 1000))
                    };
                  }
                })
              );
              
              allRides.push(...ridesWithBidStatus);
            }
          }
        } catch (dbError) {
          console.log('⚠️ Database rides unavailable:', dbError.message);
        }
        
        // Only check localStorage fallback if we have no database rides
        if (allRides.length === 0) {
          console.log('📝 Checking for local ride requests...');
          
          // Check if there are any active ride requests from customers
          const currentRideRequestId = localStorage.getItem('currentRideRequestId');
          const currentRideRequest = JSON.parse(localStorage.getItem('currentRideRequest') || '{}');
          
          if (currentRideRequestId && currentRideRequest.pickup_address && !rideIds.has(currentRideRequestId)) {
            const nowTs = Date.now();
            const createdTs = currentRideRequest.created_at ? new Date(currentRideRequest.created_at).getTime() : nowTs;
            const timeRemaining = Math.max(0, Math.floor((createdTs + 60 * 1000 - nowTs) / 1000));
            
            if (timeRemaining > 0) {
              console.log('🚗 Found active local ride request:', currentRideRequestId);
              const mockRide = {
                id: currentRideRequestId,
                customer_name: currentRideRequest.customer_name || 'Customer',
                customer_phone: currentRideRequest.customer_phone || '+91 0000000000',
                pickup_address: currentRideRequest.pickup_address,
                drop_address: currentRideRequest.drop_address,
                distance: currentRideRequest.distance || 5.2,
                estimated_fare: currentRideRequest.estimated_fare || 100,
                status: 'pending',
                source: 'localStorage',
                created_at: new Date(createdTs).toISOString(),
                hasDriverBid: false,
                timeRemaining
              };
              rideIds.add(currentRideRequestId); // Mark as processed
              allRides.push(mockRide);
            } else {
              // Cleanup stale local request
              localStorage.removeItem('currentRideRequestId');
              localStorage.removeItem('currentRideRequest');
            }
          }
        }
        
        // Set the final deduplicated rides
        setAvailableRides(allRides);
      } catch (error) {
        console.error('Error loading rides:', error);
        setAvailableRides([]);
      } finally {
        setLoading(false);
      }
    };

    loadRides();

    // Set up a refresh interval to check for new ride requests (increased frequency for responsiveness)
    const refreshInterval = setInterval(() => {
      loadRides();
    }, 5000); // Refresh every 5 seconds (reduced from 10) for faster ride updates

    // Set up a cleanup interval to remove expired rides
    const cleanupInterval = setInterval(() => {
      setAvailableRides(prev => {
        const now = Date.now();
        const validRides = prev.filter(ride => {
          const rideCreated = new Date(ride.created_at).getTime();
          const timeRemaining = Math.max(0, Math.floor((rideCreated + 60 * 1000 - now) / 1000));
          
          if (timeRemaining <= 0) {
            console.log('🧹 Removing expired ride:', ride.id);
            
            // Clean up related localStorage data for expired ride
            try {
              localStorage.removeItem(`bids_${ride.id}`);
              localStorage.removeItem(`ride_request_${ride.id}`);
              localStorage.removeItem(`booking_${ride.id}`);
              
              // Remove from fallback bids if it's there
              const fallbackBids = JSON.parse(localStorage.getItem('fallbackBids') || '[]');
              const cleanedFallbackBids = fallbackBids.filter(bid => bid.booking_id !== ride.id);
              if (cleanedFallbackBids.length !== fallbackBids.length) {
                localStorage.setItem('fallbackBids', JSON.stringify(cleanedFallbackBids));
                console.log('🧹 Cleaned up expired bid data for ride:', ride.id);
              }
              
              // Clean up current ride request if it matches
              const currentRideRequestId = localStorage.getItem('currentRideRequestId');
              if (currentRideRequestId === ride.id) {
                localStorage.removeItem('currentRideRequestId');
                localStorage.removeItem('currentRideRequest');
              }
            } catch (error) {
              console.warn('Warning: Failed to cleanup expired ride data:', error);
            }
            
            return false;
          }
          
          // Update time remaining for display
          ride.timeRemaining = timeRemaining;
          return true;
        });
        return validRides.length !== prev.length ? validRides : prev;
      });
    }, 1000); // Check every second for real-time countdown

    // Clean up intervals on component unmount
    return () => {
      clearInterval(refreshInterval);
      clearInterval(cleanupInterval);
    };
  }, [driver.uid, driver.id, navigate]);

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

    // Validate driver data
    if (!driver.id && !driver.uid) {
      alert('Driver information is missing. Please login again.');
      return;
    }

    if (!driver.name) {
      alert('Driver name is missing. Please complete your profile.');
      return;
    }

    const bidData = {
      booking_id: rideId,
      driver_id: driver.id || driver.uid,
      amount: parseFloat(bidAmount),
      status: 'pending'
    };

    console.log('Submitting bid with data:', bidData);

    try {
      let bidSubmitted = false;
      
      // Try to save the bid to the database first
      try {
        const { data, error } = await supabaseDB.bids.add(bidData);
        
        console.log('Database bid submission response:', { data, error });

        if (error) {
          console.warn('Database bid submission failed:', error);
          throw new Error('Database not available');
        }

        if (!data || data.length === 0) {
          throw new Error('No data returned from database');
        }
        
        bidSubmitted = true;
        console.log('✅ Bid submitted to database successfully');
      } catch (dbError) {
        console.log('⚠️ Database unavailable, using fallback bid submission...');
        
        // Fallback: Store bid locally and simulate submission
        const fallbackBid = {
          id: `fallback_bid_${Date.now()}`,
          booking_id: rideId,
          driver_id: driver.id || driver.uid,
          driver_name: driver.name,
          driver_phone: driver.phone,
          vehicle_type: driver.vehicleType,
          vehicle_number: driver.vehicleNumber,
          driver_rating: driver.rating || 5.0,
          amount: parseFloat(bidAmount),
          status: 'pending',
          created_at: new Date().toISOString()
        };
        
        // Store in localStorage for the customer to see
        const existingBids = JSON.parse(localStorage.getItem('fallbackBids') || '[]');
        existingBids.push(fallbackBid);
        localStorage.setItem('fallbackBids', JSON.stringify(existingBids));
        
        // Also store specifically for this ride
        const rideSpecificBids = JSON.parse(localStorage.getItem(`bids_${rideId}`) || '[]');
        rideSpecificBids.push(fallbackBid);
        localStorage.setItem(`bids_${rideId}`, JSON.stringify(rideSpecificBids));
        
        bidSubmitted = true;
        console.log('✅ Bid submitted in fallback mode:', fallbackBid.id);
      }
      
      if (bidSubmitted) {
        // Update bid status
        setBidStatus(prev => ({ ...prev, [rideId]: 'submitted' }));
        setActiveBidRide(null);
        setBidAmount('');

        // Show success message
        alert('Your bid has been submitted successfully!');
        
        // Update the ride to show bid was placed
        setAvailableRides(prev => 
          prev.map(ride => 
            ride.id === rideId 
              ? { ...ride, hasDriverBid: true }
              : ride
          )
        );
      }
      
    } catch (error) {
      console.error('Full error submitting bid:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        bidData,
        driverInfo: {
          id: driver.id,
          uid: driver.uid,
          name: driver.name,
          vehicleType: driver.vehicleType
        }
      });
      
      let errorMessage = 'Failed to submit bid. ';
      if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Please check your connection and try again.';
      }
      
      alert(errorMessage);
    }
  };

  const handleAcceptRide = async (rideId, fare) => {
    try {
      let rideAccepted = false;
      const currentRide = availableRides.find(ride => ride.id === rideId);
      
      // Get the real customer OTP for database case too
      const customerOTP = localStorage.getItem('currentRideOTP') || 
                         localStorage.getItem('rideOTP') ||
                         '1234'; // Fallback for testing
      
      console.log('🔐 Using customer OTP for database ride:', customerOTP);
      
      // Try to update the booking status to 'confirmed' in database first
      try {
        await supabaseDB.bookings.update(rideId, {
          status: 'confirmed',
          driver_id: driver.id || driver.uid,
          driver_name: driver.name,
          vehicle_type: driver.vehicleType,
          driver_rating: driver.rating || 4.5,
          final_fare: fare,
          accepted_at: new Date().toISOString(),
          otp: customerOTP // Include customer OTP in database record
        });
        
        // Cancel/release other driver bids on this ride
        try {
          const { data: otherBids } = await supabaseDB.bids.getByBooking(rideId);
          if (otherBids && otherBids.length > 0) {
            // Update all other bids to 'cancelled' status
            await Promise.all(
              otherBids
                .filter(bid => bid.driver_id !== (driver.id || driver.uid))
                .map(bid => supabaseDB.bids.update(bid.id, { status: 'cancelled' }))
            );
            console.log('✅ Other driver bids cancelled');
          }
        } catch (bidError) {
          console.warn('Warning: Could not cancel other bids:', bidError);
        }
        
        rideAccepted = true;
        console.log('✅ Ride accepted in database');
      } catch (dbError) {
        console.log('⚠️ Database unavailable, using fallback ride acceptance...');
        
        // Get the real customer OTP from their booking process
        const customerOTP = localStorage.getItem('currentRideOTP') || 
                           localStorage.getItem('rideOTP') ||
                           '1234'; // Fallback for testing
        
        console.log('🔐 Using customer OTP for ride verification:', customerOTP);
        
        // Fallback: Store acceptance in localStorage with all ride details
        const acceptedRide = {
          ...currentRide,
          id: rideId,
          status: 'confirmed',
          selected_driver_id: driver.id || driver.uid,
          driver_id: driver.id || driver.uid,
          driver_name: driver.name,
          vehicle_type: driver.vehicleType,
          driver_rating: driver.rating || 4.5,
          final_fare: fare,
          accepted_at: new Date().toISOString(),
          otp: customerOTP // Use real customer OTP
        };
        
        localStorage.setItem('acceptedBooking', JSON.stringify(acceptedRide));
        localStorage.setItem(`booking_${rideId}`, JSON.stringify(acceptedRide));
        
        rideAccepted = true;
        console.log('✅ Ride accepted in fallback mode');
      }
      
      if (rideAccepted) {
        // Set confirmed ride data for notification
        const confirmedRideData = {
          ...currentRide,
          status: 'confirmed',
          driver_id: driver.id || driver.uid,
          driver_name: driver.name,
          final_fare: fare,
          accepted_at: new Date().toISOString()
        };
        
        setConfirmedRide(confirmedRideData);
        setShowNotification(true);
        
        // Remove the ride from available rides
        setAvailableRides(prev => prev.filter(ride => ride.id !== rideId));
        
        console.log('✅ Ride confirmed and notification triggered');
      }
      
    } catch (error) {
      console.error('Error accepting ride:', error);
      alert('Failed to accept ride. Please try again.');
    }
  };

  // Handle when ride is confirmed from notification
  const handleRideConfirmed = () => {
    setShowNotification(false);
    setConfirmedRide(null);
    
    // Navigate to active rides page
    navigate('/driver/active-rides');
  };

  if (loading) {
    return (
      <div className="driver-dashboard-loading">
        <div className="loading-spinner">⟳</div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="driver-dashboard">
      {/* Real-time bid notification (enhanced to avoid duplicate/old OTP popups) */}
      <EnhancedOTPNotification
        driverData={driver}
        onRideConfirmed={handleRideConfirmed}
      />
      
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

      <div className="available-rides-section">
        <h3>
          Available Ride Requests 
          <span className="rides-count">({availableRides.length})</span>
        </h3>
        
        {availableRides.length === 0 ? (
          <div className="no-rides">
            <p>🚕 No ride requests available at the moment</p>
            <p>Check back later for new requests</p>
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
                  <div className={`time-remaining ${ride.timeRemaining <= 0 ? 'expired' : ride.timeRemaining <= 10 ? 'warning' : ''}`}>
                      <span className="icon">⏱️</span>
                      <span className="time">
                        {ride.timeRemaining <= 0 ? 'EXPIRED' : 
                         `${Math.floor(ride.timeRemaining / 60)}:${(ride.timeRemaining % 60).toString().padStart(2, '0')} left`}
                      </span>
                    </div>
                    
                    {ride.estimated_fare && (
                      <div className="suggested-price">
                        <span className="label">Estimated Fare:</span>
                        <span className="price">₹{ride.estimated_fare}</span>
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
                    <>
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
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="earnings-summary">
        <h3>💰 Earnings</h3>
        <div className="earnings-grid">
          <div className="earning-card">
            <span className="label">Total</span>
            <span className="amount">₹{driver.earnings || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverDashboard;
