import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseDB } from '../utils/supabaseService';
import DriverBidNotification from '../components/DriverBidNotification';

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

    // Load available rides - try database first, fallback to mock data
    const loadRides = async () => {
      try {
        let ridesFound = false;
        
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
              return rideCreated >= sixtySecondsAgo;
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
              ridesFound = true;
            }
          }
        } catch (dbError) {
          console.log('⚠️ Database rides unavailable:', dbError.message);
        }
        
        // Fallback to check for active customer ride requests in localStorage
        if (!ridesFound) {
          console.log('📝 Checking for demo/local ride requests...');
          
          // Check if there are any active ride requests from customers
          const currentRideRequestId = localStorage.getItem('currentRideRequestId');
          const currentRideRequest = JSON.parse(localStorage.getItem('currentRideRequest') || '{}');
          
          if (currentRideRequestId && currentRideRequest.pickup_address) {
            console.log('🚗 Found active customer ride request:', currentRideRequestId);
            
            // Create a mock ride request for drivers to bid on
            const mockRide = {
              id: currentRideRequestId,
              customer_name: currentRideRequest.customer_name || 'Customer',
              customer_phone: currentRideRequest.customer_phone || '+91 0000000000',
              pickup_address: currentRideRequest.pickup_address,
              drop_address: currentRideRequest.drop_address,
              distance: currentRideRequest.distance || 5.2,
              estimated_fare: currentRideRequest.estimated_fare || 100,
              status: 'pending',
              created_at: new Date().toISOString(),
              hasDriverBid: false,
              timeRemaining: 45 // Always show some time remaining for demo
            };
            
            setAvailableRides([mockRide]);
            ridesFound = true;
          }
          
          // If still no rides found, create demo rides periodically
          if (!ridesFound) {
            // Create a demo ride occasionally for drivers to practice with
            const shouldShowDemo = Math.random() < 0.3; // 30% chance
            if (shouldShowDemo) {
              const demoLocations = [
                { pickup: 'Connaught Place, New Delhi', drop: 'India Gate, New Delhi', distance: 4.2, fare: 95 },
                { pickup: 'Karol Bagh, New Delhi', drop: 'Lajpat Nagar, New Delhi', distance: 8.1, fare: 140 },
                { pickup: 'Rajouri Garden, New Delhi', drop: 'CP Metro Station, New Delhi', distance: 6.5, fare: 115 }
              ];
              
              const demoLocation = demoLocations[Math.floor(Math.random() * demoLocations.length)];
              
              const demoRide = {
                id: 'demo_ride_' + Date.now(),
                customer_name: 'Demo Customer',
                customer_phone: '+91 9999999999',
                pickup_address: demoLocation.pickup,
                drop_address: demoLocation.drop,
                distance: demoLocation.distance,
                estimated_fare: demoLocation.fare,
                status: 'pending',
                created_at: new Date().toISOString(),
                hasDriverBid: false,
                timeRemaining: 50
              };
              
              setAvailableRides([demoRide]);
              console.log('🎭 Created demo ride for driver practice:', demoRide.pickup_address);
            } else {
              setAvailableRides([]);
            }
          }
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
      {/* Real-time bid notification */}
      <DriverBidNotification
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
