import React, { useState, useEffect } from 'react';

const ActiveRides = ({ appState }) => {
  const { activeRides, setActiveRides, driver } = appState;

  // Mock active rides for demo
  const [rides, setRides] = useState([
    {
      id: 'active_ride_1',
      customer: {
        name: 'Sarah Johnson',
        phone: '+1234567890',
        rating: 4.8,
        avatar: 'SJ'
      },
      pickup: {
        address: 'Downtown Shopping Mall, Main Street',
        coords: [40.7128, -74.0060]
      },
      drop: {
        address: 'JFK International Airport, Terminal 4',
        coords: [40.6413, -73.7781]
      },
      distance: '18.5 km',
      estimatedTime: '25 min',
      fare: 32.50,
      status: 'en_route_to_pickup',
      startTime: Date.now() - 300000, // 5 minutes ago
      otp: '4785'
    }
  ]);

  const [rideTimers, setRideTimers] = useState({});

  useEffect(() => {
    const timer = setInterval(() => {
      const newTimers = {};
      rides.forEach(ride => {
        const elapsed = Date.now() - ride.startTime;
        const minutes = Math.floor(elapsed / 60000);
        const seconds = Math.floor((elapsed % 60000) / 1000);
        newTimers[ride.id] = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      });
      setRideTimers(newTimers);
    }, 1000);

    return () => clearInterval(timer);
  }, [rides]);

  const handleCall = (phoneNumber) => {
    // In a real app, this would trigger a phone call
    window.open(`tel:${phoneNumber}`);
  };

  const handleNavigate = (destination) => {
    // In a real app, this would open maps with navigation
    const [lat, lng] = destination;
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`);
  };

  const handleStatusUpdate = (rideId, newStatus) => {
    setRides(prev => prev.map(ride => 
      ride.id === rideId 
        ? { ...ride, status: newStatus }
        : ride
    ));
  };

  const handleCompleteRide = (rideId) => {
    // Mark ride as completed
    setRides(prev => prev.filter(ride => ride.id !== rideId));
    // In a real app, this would update the backend and earnings
    alert('Ride completed! Payment received.');
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'en_route_to_pickup':
        return {
          label: 'En Route to Pickup',
          icon: '🚗',
          color: '#3b82f6',
          bgColor: '#dbeafe'
        };
      case 'arrived_at_pickup':
        return {
          label: 'Arrived at Pickup',
          icon: '📍',
          color: '#f59e0b',
          bgColor: '#fef3c7'
        };
      case 'passenger_on_board':
        return {
          label: 'Passenger On Board',
          icon: '👥',
          color: '#10b981',
          bgColor: '#d1fae5'
        };
      case 'en_route_to_destination':
        return {
          label: 'En Route to Destination',
          icon: '🎯',
          color: '#8b5cf6',
          bgColor: '#e9d5ff'
        };
      default:
        return {
          label: 'Active',
          icon: '🚗',
          color: '#6b7280',
          bgColor: '#f3f4f6'
        };
    }
  };

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-welcome">
          <h1>🚗 Active Rides</h1>
          <p className="dashboard-subtitle">
            Manage your ongoing trips and communicate with passengers.
          </p>
        </div>
      </div>

      {rides.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">🚗</div>
          <h3 className="empty-title">No active rides</h3>
          <p className="empty-description">
            When you accept a ride request, it will appear here for you to manage.
          </p>
        </div>
      ) : (
        <div className="rides-section">
          {rides.map(ride => {
            const statusInfo = getStatusInfo(ride.status);
            
            return (
              <div key={ride.id} className="active-ride-card">
                {/* Ride Status Header */}
                <div className="ride-status" style={{ backgroundColor: statusInfo.bgColor }}>
                  <div className="status-info">
                    <span className="status-icon" style={{ color: statusInfo.color }}>
                      {statusInfo.icon}
                    </span>
                    <span className="status-label" style={{ color: statusInfo.color }}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <div className="ride-timer">
                    <span>⏱️ {rideTimers[ride.id] || '0:00'}</span>
                  </div>
                </div>

                {/* Customer Information */}
                <div className="ride-header">
                  <div className="ride-customer">
                    <div className="customer-avatar">
                      {ride.customer.avatar}
                    </div>
                    <div className="customer-info">
                      <h4>{ride.customer.name}</h4>
                      <div className="customer-rating">
                        <span>⭐ {ride.customer.rating}</span>
                        <span>📞 {ride.customer.phone}</span>
                      </div>
                    </div>
                  </div>
                  <div className="ride-price">
                    <h3 className="price-value">${ride.fare}</h3>
                    <p className="price-label">Trip Fare</p>
                  </div>
                </div>

                {/* Route Information */}
                <div className="ride-route">
                  <div className="route-item">
                    <span className="route-icon pickup-icon">📍</span>
                    <span className="route-address">{ride.pickup.address}</span>
                  </div>
                  <div className="route-item">
                    <span className="route-icon drop-icon">🎯</span>
                    <span className="route-address">{ride.drop.address}</span>
                  </div>
                </div>

                {/* Trip Details */}
                <div className="ride-meta">
                  <div className="meta-item">
                    <span>📏 {ride.distance}</span>
                  </div>
                  <div className="meta-item">
                    <span>⏱️ ~{ride.estimatedTime}</span>
                  </div>
                  <div className="meta-item">
                    <span>🔐 OTP: {ride.otp}</span>
                  </div>
                </div>

                {/* Action Buttons based on Status */}
                <div className="action-buttons">
                  <button 
                    className="action-btn call-btn"
                    onClick={() => handleCall(ride.customer.phone)}
                  >
                    📞 Call Customer
                  </button>
                  
                  <button 
                    className="action-btn navigate-btn"
                    onClick={() => handleNavigate(
                      ride.status === 'en_route_to_pickup' 
                        ? ride.pickup.coords 
                        : ride.drop.coords
                    )}
                  >
                    🗺️ Navigate
                  </button>

                  {ride.status === 'en_route_to_pickup' && (
                    <button 
                      className="action-btn"
                      style={{ background: '#f59e0b' }}
                      onClick={() => handleStatusUpdate(ride.id, 'arrived_at_pickup')}
                    >
                      📍 Arrived at Pickup
                    </button>
                  )}

                  {ride.status === 'arrived_at_pickup' && (
                    <button 
                      className="action-btn"
                      style={{ background: '#10b981' }}
                      onClick={() => handleStatusUpdate(ride.id, 'passenger_on_board')}
                    >
                      👥 Passenger Boarded
                    </button>
                  )}

                  {ride.status === 'passenger_on_board' && (
                    <button 
                      className="action-btn"
                      style={{ background: '#8b5cf6' }}
                      onClick={() => handleStatusUpdate(ride.id, 'en_route_to_destination')}
                    >
                      🎯 Start Trip
                    </button>
                  )}

                  {ride.status === 'en_route_to_destination' && (
                    <button 
                      className="action-btn complete-btn"
                      onClick={() => handleCompleteRide(ride.id)}
                    >
                      ✅ Complete Ride
                    </button>
                  )}
                </div>

                {/* Emergency Actions */}
                <div className="emergency-actions">
                  <button 
                    className="emergency-btn"
                    onClick={() => alert('Emergency services contacted')}
                  >
                    🚨 Emergency
                  </button>
                  
                  <button 
                    className="support-btn"
                    onClick={() => alert('Support team contacted')}
                  >
                    📞 Support
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Actions */}
      <div className="rides-section">
        <div className="section-header">
          <h2 className="section-title">⚡ Quick Actions</h2>
        </div>
        
        <div className="quick-actions-grid">
          <button className="quick-action-card">
            <div className="action-icon">🚨</div>
            <h4>Emergency</h4>
            <p>Contact emergency services</p>
          </button>
          
          <button className="quick-action-card">
            <div className="action-icon">📞</div>
            <h4>Support</h4>
            <p>Get help from our team</p>
          </button>
          
          <button className="quick-action-card">
            <div className="action-icon">⛽</div>
            <h4>Gas Stations</h4>
            <p>Find nearby fuel stops</p>
          </button>
          
          <button className="quick-action-card">
            <div className="action-icon">🏥</div>
            <h4>Hospitals</h4>
            <p>Locate nearest hospital</p>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActiveRides;
