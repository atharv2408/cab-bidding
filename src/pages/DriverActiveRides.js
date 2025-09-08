import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseDB } from '../utils/supabaseService';

const DriverActiveRides = ({ driverData }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeRides, setActiveRides] = useState([]);
  const [otpInput, setOtpInput] = useState({});
  const [otpError, setOtpError] = useState({});
  const [startingRide, setStartingRide] = useState({});
  
  // Get driver data from localStorage if not passed as prop
  const driver = driverData || JSON.parse(localStorage.getItem('driverData') || '{}');

  useEffect(() => {
    if (!driver.uid && !driver.id) {
      navigate('/driver/login');
      return;
    }

    loadActiveRides();
    
    // Set up refresh interval for real-time updates
    const refreshInterval = setInterval(loadActiveRides, 10000); // Refresh every 10 seconds
    
    return () => clearInterval(refreshInterval);
  }, [driver.uid, driver.id, navigate]);

  const loadActiveRides = async () => {
    try {
      let ridesFound = false;
      let rides = [];
      
      // Try to load from database first
      try {
        const { data: dbRides, error } = await supabaseDB.bookings.getAll();
        
        if (!error && dbRides && dbRides.length > 0) {
          // Filter for rides assigned to this driver with status 'confirmed'
          const driverRides = dbRides.filter(ride => 
            (ride.selected_driver_id === (driver.id || driver.uid) || 
             ride.driver_id === (driver.id || driver.uid)) &&
            (ride.status === 'confirmed' || ride.status === 'in_progress')
          );
          
          if (driverRides.length > 0) {
            console.log('✅ Found database active rides:', driverRides.length);
            rides = driverRides;
            ridesFound = true;
          }
        }
      } catch (dbError) {
        console.log('⚠️ Database active rides unavailable:', dbError.message);
      }
      
      // Fallback: Check for accepted bookings in localStorage
      if (!ridesFound) {
        console.log('📝 Checking for fallback active rides...');
        
        // Check for confirmed bookings that include this driver
        const confirmedBooking = JSON.parse(localStorage.getItem('confirmedBooking') || '{}');
        const acceptedBooking = JSON.parse(localStorage.getItem('acceptedBooking') || '{}');
        
        const fallbackRides = [];
        
        // Check if confirmed booking is for this driver
        if (confirmedBooking.selected_driver_id === (driver.id || driver.uid)) {
          fallbackRides.push({
            id: confirmedBooking.id,
            customer_name: confirmedBooking.customerName,
            customer_phone: confirmedBooking.customerPhone,
            pickup_address: confirmedBooking.pickup,
            drop_address: confirmedBooking.drop,
            final_fare: confirmedBooking.price,
            distance: confirmedBooking.distance,
            status: 'confirmed',
            otp: confirmedBooking.otp,
            created_at: confirmedBooking.created_at || new Date().toISOString()
          });
        }
        
        // Check if accepted booking is for this driver
        if (acceptedBooking.selected_driver_id === (driver.id || driver.uid)) {
          fallbackRides.push({
            id: acceptedBooking.id,
            customer_name: acceptedBooking.customerName,
            customer_phone: acceptedBooking.customerPhone,
            pickup_address: acceptedBooking.pickup_address,
            drop_address: acceptedBooking.drop_address,
            final_fare: acceptedBooking.final_fare,
            distance: acceptedBooking.distance,
            status: 'confirmed',
            otp: acceptedBooking.otp,
            created_at: acceptedBooking.created_at || new Date().toISOString()
          });
        }
        
        if (fallbackRides.length > 0) {
          rides = fallbackRides;
          ridesFound = true;
          console.log('✅ Found fallback active rides:', fallbackRides.length);
        }
      }
      
      setActiveRides(rides);
      
    } catch (error) {
      console.error('Error loading active rides:', error);
      setActiveRides([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (rideId, value) => {
    setOtpInput(prev => ({ ...prev, [rideId]: value }));
    // Clear error when user starts typing
    if (otpError[rideId]) {
      setOtpError(prev => ({ ...prev, [rideId]: '' }));
    }
  };

  const startRide = async (ride) => {
    const enteredOtp = otpInput[ride.id];
    
    if (!enteredOtp) {
      setOtpError(prev => ({ ...prev, [ride.id]: 'Please enter the OTP' }));
      return;
    }
    
    if (enteredOtp.length !== 4) {
      setOtpError(prev => ({ ...prev, [ride.id]: 'OTP must be 4 digits' }));
      return;
    }
    
    if (enteredOtp !== ride.otp) {
      setOtpError(prev => ({ ...prev, [ride.id]: 'Invalid OTP. Please check with customer.' }));
      return;
    }
    
    // OTP is correct, start the ride
    setStartingRide(prev => ({ ...prev, [ride.id]: true }));
    
    try {
      let rideStarted = false;
      
      // Try to update in database first
      try {
        const { data, error } = await supabaseDB.bookings.update(ride.id, {
          status: 'in_progress',
          started_at: new Date().toISOString()
        });
        
        if (error) {
          throw new Error('Database not available');
        }
        
        rideStarted = true;
        console.log('✅ Ride started in database');
      } catch (dbError) {
        console.log('⚠️ Database unavailable, using fallback ride start...');
        
        // Fallback: Update localStorage
        const startedRide = {
          ...ride,
          status: 'in_progress',
          started_at: new Date().toISOString()
        };
        
        // Update the stored booking
        localStorage.setItem('activeRide', JSON.stringify(startedRide));
        localStorage.setItem(`ride_${ride.id}`, JSON.stringify(startedRide));
        
        rideStarted = true;
        console.log('✅ Ride started in fallback mode');
      }
      
      if (rideStarted) {
        // Update the ride status locally
        setActiveRides(prev => 
          prev.map(r => 
            r.id === ride.id 
              ? { ...r, status: 'in_progress', started_at: new Date().toISOString() }
              : r
          )
        );
        
        // Clear OTP input
        setOtpInput(prev => ({ ...prev, [ride.id]: '' }));
        
        alert(`Ride started successfully! Customer: ${ride.customer_name}`);
      }
      
    } catch (error) {
      console.error('Error starting ride:', error);
      setOtpError(prev => ({ ...prev, [ride.id]: 'Failed to start ride. Please try again.' }));
    } finally {
      setStartingRide(prev => ({ ...prev, [ride.id]: false }));
    }
  };

  const completeRide = async (ride) => {
    if (!window.confirm('Mark this ride as completed?')) {
      return;
    }
    
    try {
      let rideCompleted = false;
      
      // Try to update in database first
      try {
        const completedRideData = {
          status: 'completed',
          completed_at: new Date().toISOString(),
          // Add driver info if missing
          driver_name: driver.name || driver.displayName,
          driver_phone: driver.phone,
          driver_rating: driver.rating || 4.5,
          vehicle_type: driver.vehicleType || 'Vehicle',
          // Ensure customer info is present
          customer_name: ride.customer_name || 'Customer',
          customer_phone: ride.customer_phone || '+91 0000000000'
        };
        
        const { data, error } = await supabaseDB.bookings.update(ride.id, completedRideData);
        
        if (error) {
          throw new Error('Database not available');
        }
        
        rideCompleted = true;
        console.log('✅ Ride completed in database');
        
        // Update driver stats
        try {
          await supabaseDB.drivers.update(driver.id || driver.uid, {
            total_rides: (driver.totalRides || 0) + 1,
            earnings: (driver.earnings || 0) + parseFloat(ride.final_fare || 0)
          });
          console.log('✅ Driver stats updated');
        } catch (statsError) {
          console.log('⚠️ Driver stats update failed:', statsError);
        }
        
      } catch (dbError) {
        console.log('⚠️ Database unavailable, using fallback ride completion...');
        
        // Fallback: Update localStorage with comprehensive ride data
        const completedRide = {
          ...ride,
          status: 'completed',
          completed_at: new Date().toISOString(),
          driver_name: driver.name || driver.displayName,
          driver_phone: driver.phone,
          driver_rating: driver.rating || 4.5,
          vehicle_type: driver.vehicleType || 'Vehicle',
          vehicle_model: driver.vehicleModel || driver.vehicleType || 'Vehicle',
          customer_name: ride.customer_name || 'Customer',
          customer_phone: ride.customer_phone || '+91 0000000000',
          // Add booking ID for tracking
          bookingId: ride.id || 'BC' + Date.now().toString().slice(-6),
          timestamp: new Date().toISOString()
        };
        
        // Save to multiple localStorage keys for easy access
        localStorage.setItem('completedRide', JSON.stringify(completedRide));
        localStorage.setItem(`completed_${ride.id}`, JSON.stringify(completedRide));
        localStorage.setItem(`driver_ride_${ride.id}`, JSON.stringify(completedRide));
        
        // Add to driver history array
        const driverHistory = JSON.parse(localStorage.getItem('driverRideHistory') || '[]');
        driverHistory.unshift(completedRide); // Add to beginning
        localStorage.setItem('driverRideHistory', JSON.stringify(driverHistory.slice(0, 50))); // Keep last 50
        
        // Add to customer history array (for customer access)
        const customerHistory = JSON.parse(localStorage.getItem('customerRideHistory') || '[]');
        customerHistory.unshift(completedRide);
        localStorage.setItem('customerRideHistory', JSON.stringify(customerHistory.slice(0, 50)));
        
        // Remove from active rides
        localStorage.removeItem('activeRide');
        localStorage.removeItem(`ride_${ride.id}`);
        
        rideCompleted = true;
        console.log('✅ Ride completed in fallback mode with history saved');
      }
      
      if (rideCompleted) {
        // Remove from active rides
        setActiveRides(prev => prev.filter(r => r.id !== ride.id));
        
        // Show success message with ride details
        const fareAmount = ride.final_fare || ride.estimated_fare || 0;
        const customerName = ride.customer_name || 'Customer';
        
        alert(`✅ Ride Completed Successfully!\n\nCustomer: ${customerName}\nEarnings: ₹${fareAmount}\n\nRide has been saved to your history.`);
        
        console.log('🎉 Ride completed and saved to both customer and driver history');
      }
      
    } catch (error) {
      console.error('Error completing ride:', error);
      alert('Failed to complete ride. Please try again.');
    }
  };

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} days ago`;
  };

  if (loading) {
    return (
      <div className="driver-dashboard-loading">
        <div className="loading-spinner">⟳</div>
        <p>Loading active rides...</p>
      </div>
    );
  }

  return (
    <div className="driver-active-rides">
      <div className="driver-header">
        <div className="driver-info">
          <h2>Active Rides 🚗</h2>
          <div className="driver-stats">
            <span className="rating">⭐ {driver.rating || 5.0}</span>
            <span className="rides">🚕 {activeRides.length} active</span>
            <span className="vehicle">🚙 {driver.vehicleType}</span>
          </div>
        </div>
      </div>

      <div className="active-rides-section">
        <h3>
          Your Assigned Rides 
          <span className="rides-count">({activeRides.length})</span>
        </h3>
        
        {activeRides.length === 0 ? (
          <div className="no-rides">
            <p>🚕 No active rides at the moment</p>
            <p>Check your dashboard for new ride requests</p>
            <button 
              onClick={() => navigate('/driver/dashboard')}
              className="back-to-dashboard-btn"
            >
              Back to Dashboard
            </button>
          </div>
        ) : (
          <div className="rides-list">
            {activeRides.map(ride => (
              <div key={ride.id} className="active-ride-card">
                <div className="ride-header">
                  <div className="ride-status">
                    <span className={`status-badge ${ride.status}`}>
                      {ride.status === 'confirmed' ? '✅ Ready to Start' : 
                       ride.status === 'in_progress' ? '🚗 In Progress' : 
                       '📍 ' + ride.status}
                    </span>
                    <span className="ride-time">{formatTimeAgo(ride.created_at)}</span>
                  </div>
                </div>

                <div className="ride-details">
                  <div className="customer-info">
                    <div className="customer-header">
                      <span className="customer-name">👤 {ride.customer_name || 'Customer'}</span>
                      {ride.customer_phone && (
                        <a href={`tel:${ride.customer_phone}`} className="customer-phone">
                          📞 {ride.customer_phone}
                        </a>
                      )}
                    </div>
                  </div>
                  
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

                  <div className="ride-metadata">
                    <div className="fare-info">
                      <span className="label">Fare:</span>
                      <span className="fare">₹{ride.final_fare || ride.estimated_fare}</span>
                    </div>
                    
                    {ride.distance && (
                      <div className="distance-info">
                        <span className="label">Distance:</span>
                        <span className="distance">{ride.distance} km</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="ride-actions">
                  {ride.status === 'confirmed' ? (
                    <div className="start-ride-section">
                      <div className="otp-verification">
                        <h4>🔐 Enter Customer's OTP to Start Ride</h4>
                        <p className="otp-instruction">Ask the customer for their 4-digit OTP before starting</p>
                        
                        <div className="otp-input-group">
                          <input
                            type="text"
                            placeholder="Enter 4-digit OTP"
                            value={otpInput[ride.id] || ''}
                            onChange={(e) => handleOtpChange(ride.id, e.target.value)}
                            maxLength={4}
                            pattern="[0-9]{4}"
                            className={`otp-input ${otpError[ride.id] ? 'error' : ''}`}
                          />
                          <button 
                            className="start-ride-btn" 
                            onClick={() => startRide(ride)}
                            disabled={startingRide[ride.id] || !otpInput[ride.id] || otpInput[ride.id].length !== 4}
                          >
                            {startingRide[ride.id] ? (
                              <>⟳ Starting...</>
                            ) : (
                              <>🚗 Start Ride</>
                            )}
                          </button>
                        </div>
                        
                        {otpError[ride.id] && (
                          <div className="otp-error">
                            ⚠️ {otpError[ride.id]}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : ride.status === 'in_progress' ? (
                    <div className="in-progress-section">
                      <div className="progress-info">
                        <h4>🚗 Ride in Progress</h4>
                        <p>Started: {ride.started_at ? new Date(ride.started_at).toLocaleTimeString() : 'Just now'}</p>
                      </div>
                      
                      <div className="progress-actions">
                        <button 
                          className="navigate-btn"
                          onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ride.drop_address)}`, '_blank')}
                        >
                          🗺️ Navigate
                        </button>
                        
                        <button 
                          className="complete-ride-btn" 
                          onClick={() => completeRide(ride)}
                        >
                          ✅ Complete Ride
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="ride-status-info">
                      <p>Status: {ride.status}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="navigation-actions">
        <button 
          onClick={() => navigate('/driver/dashboard')}
          className="back-to-dashboard-btn"
        >
          ← Back to Dashboard
        </button>
      </div>
    </div>
  );
};

export default DriverActiveRides;
