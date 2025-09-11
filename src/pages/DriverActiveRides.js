import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabaseDB } from '../utils/supabaseService';
import '../styles/DriverStyles.css';

// Fix Leaflet default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const DriverActiveRides = ({ driverData }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeRides, setActiveRides] = useState([]);
  const [completionStatus, setCompletionStatus] = useState(null);
  
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
            // Only take the first ride to show single ride
            rides = [driverRides[0]];
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
          // Only show the first ride to ensure single active ride
          rides = [fallbackRides[0]];
          ridesFound = true;
          console.log('✅ Found fallback active rides: 1 (showing single ride)');
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


  // Complete ride directly
  const handleCompleteRide = (ride) => {
    completeRide(ride);
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
        
        // Show completion status modal instead of alert
        const fareAmount = ride.final_fare || ride.estimated_fare || 0;
        const customerName = ride.customer_name || 'Customer';
        
        setCompletionStatus({
          message: 'Ride Completed!',
          earnings: fareAmount,
          customer: customerName
        });
        
        // Clear completion status after 3 seconds
        setTimeout(() => {
          setCompletionStatus(null);
        }, 3000);
        
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
                    <div className="assigned-ride-actions">
                      <h4>🎡 Ride Assigned - Ready to Go!</h4>
                      <div className="action-buttons">
                        <button 
                          className="complete-ride-btn" 
                          onClick={() => handleCompleteRide(ride)}
                        >
                          ✅ Complete Ride
                        </button>
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
                          className="complete-ride-btn" 
                          onClick={() => handleCompleteRide(ride)}
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

      {/* Completion Status Modal */}
      {completionStatus && (
        <div className="modal-overlay">
          <div className="modal-content completion-modal">
            <div className="completion-message">
              <div className="success-icon">🎉</div>
              <h3>{completionStatus.message}</h3>
              <div className="earnings-display">
                <span className="earnings-label">Earnings:</span>
                <span className="earnings-amount">₹{completionStatus.earnings}</span>
              </div>
              <p>Customer: {completionStatus.customer}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DriverActiveRides;
