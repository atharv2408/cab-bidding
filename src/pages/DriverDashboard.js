import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseDB } from '../utils/supabaseService';

const DriverDashboard = ({ driverData }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [availableRides, setAvailableRides] = useState([]);
  const [bidAmount, setBidAmount] = useState('');
  const [activeBidRide, setActiveBidRide] = useState(null);
  const [bidStatus, setBidStatus] = useState({});
  
  // Get driver data from localStorage if not passed as prop
  const driver = driverData || JSON.parse(localStorage.getItem('driverData') || '{}');

  useEffect(() => {
    if (!driver.uid && !driver.id) {
      navigate('/driver/login');
      return;
    }

    // Load available rides - only fresh/live ride requests
    const loadRides = async () => {
      try {
        const { data: rides, error } = await supabaseDB.bookings.getByStatus('pending');
        if (!error && rides) {
          // Filter for live rides only (created within last 60 seconds)
          const now = new Date();
          const sixtySecondsAgo = new Date(now.getTime() - 60 * 1000);
          
          const liveRides = rides.filter(ride => {
            const rideCreated = new Date(ride.created_at);
            return rideCreated >= sixtySecondsAgo;
          });
          
          // For each live ride, check if this driver has already bid
          const ridesWithBidStatus = await Promise.all(
            liveRides.map(async (ride) => {
              try {
                const { data: existingBids } = await supabaseDB.bids.getByBooking(ride.id);
                const hasDriverBid = existingBids?.some(bid => 
                  bid.driver_id === (driver.id || driver.uid)
                );
                
                return {
                  ...ride,
                  hasDriverBid,
                  timeRemaining: Math.max(0, Math.floor((new Date(ride.created_at).getTime() + 60 * 1000 - now.getTime()) / 1000))
                };
              } catch (error) {
                console.error('Error checking bids for ride:', ride.id, error);
                return {
                  ...ride,
                  hasDriverBid: false,
                  timeRemaining: Math.max(0, Math.floor((new Date(ride.created_at).getTime() + 60 * 1000 - now.getTime()) / 1000))
                };
              }
            })
          );
          
          setAvailableRides(ridesWithBidStatus);
        } else {
          console.error('Error loading rides:', error);
          setAvailableRides([]);
        }
      } catch (error) {
        console.error('Error loading rides:', error);
        setAvailableRides([]);
      } finally {
        setLoading(false);
      }
    };

    loadRides();

    // Set up a refresh interval to check for new ride requests
    const refreshInterval = setInterval(() => {
      loadRides();
    }, 5000); // Refresh every 5 seconds for real-time updates

    // Clean up interval on component unmount
    return () => clearInterval(refreshInterval);
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
      // Save the bid to the database
      const { data, error } = await supabaseDB.bids.add(bidData);
      
      console.log('Bid submission response:', { data, error });

      if (error) {
        console.error('Detailed error:', error);
        throw new Error(error.message || 'Database error occurred');
      }

      if (!data || data.length === 0) {
        throw new Error('No data returned from bid submission');
      }

      // Update bid status
      setBidStatus(prev => ({ ...prev, [rideId]: 'submitted' }));
      setActiveBidRide(null);
      setBidAmount('');

      // Show success message
      alert('Your bid has been submitted successfully!');
      
      // Refresh the rides list to update status
      // You can uncomment the line below if needed
      // loadRides();
      
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
      // Update the booking status to 'confirmed'
      await supabaseDB.bookings.update(rideId, {
        status: 'confirmed',
        driver_id: driver.id || driver.uid,
        driver_name: driver.name,
        vehicle_type: driver.vehicleType,
        driver_rating: driver.rating || 4.5,
        final_fare: fare,
        accepted_at: new Date().toISOString()
      });

      // Remove the ride from available rides
      setAvailableRides(prev => prev.filter(ride => ride.id !== rideId));
      
      // Optional: Show success message
      alert('Ride accepted successfully! Navigate to the pickup location.');

      // Redirect to active rides page or update UI
      // navigate('/driver/active-rides');
    } catch (error) {
      console.error('Error accepting ride:', error);
      alert('Failed to accept ride. Please try again.');
    }
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
                    <div className="time-remaining">
                      <span className="icon">⏱️</span>
                      <span className="time">
                        {Math.floor(ride.timeRemaining / 60)}:{(ride.timeRemaining % 60).toString().padStart(2, '0')} left
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
