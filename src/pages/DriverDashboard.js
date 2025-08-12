import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseDB } from '../utils/supabaseService';

const DriverDashboard = ({ driverData }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [availableRides, setAvailableRides] = useState([]);
  
  // Get driver data from localStorage if not passed as prop
  const driver = driverData || JSON.parse(localStorage.getItem('driverData') || '{}');

  useEffect(() => {
    if (!driver.uid && !driver.id) {
      navigate('/driver/login');
      return;
    }

    // Load available rides
    const loadRides = async () => {
      try {
        const { data: rides, error } = await supabaseDB.bookings.getByStatus('pending');
        if (!error) {
          setAvailableRides(rides || []);
        } else {
          console.error('Error loading rides:', error);
        }
      } catch (error) {
        console.error('Error loading rides:', error);
      } finally {
        setLoading(false);
      }
    };

    loadRides();
  }, [driver.uid, driver.id, navigate]);

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
                  
                  {ride.estimated_fare && (
                    <div className="suggested-price">
                      <span className="label">Estimated Fare:</span>
                      <span className="price">₹{ride.estimated_fare}</span>
                    </div>
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
