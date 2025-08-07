import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Home = ({ appState }) => {
  const navigate = useNavigate();
  const {
    availableRides,
    activeRides,
    isOnline,
    setIsOnline,
    earnings,
    driver,
    socket,
    driverLocation,
    setDriverLocation,
    locationLoading,
    setLocationLoading,
    locationError,
    setLocationError,
    ReverseGeocode
  } = appState;

  const [stats, setStats] = useState({
    todayRides: 3,
    pendingBids: 2,
    totalEarnings: 245.50,
    rating: 4.8
  });

  const handleToggleOnline = () => {
    if (!isOnline && !driverLocation.coords) {
      // Get location before going online
      detectLocation();
      return;
    }
    
    const newStatus = !isOnline;
    setIsOnline(newStatus);
    
    if (socket) {
      socket.emit('driverStatusUpdate', {
        driverId: driver.id,
        isOnline: newStatus,
        location: driverLocation.coords
      });
    }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.');
      return;
    }

    setLocationLoading(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const address = await ReverseGeocode(latitude, longitude);
        setDriverLocation({
          coords: [latitude, longitude],
          address
        });
        setLocationLoading(false);
        
        // Auto go online after getting location
        setIsOnline(true);
        if (socket) {
          socket.emit('driverStatusUpdate', {
            driverId: driver.id,
            isOnline: true,
            location: [latitude, longitude]
          });
        }
      },
      (error) => {
        setLocationLoading(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location access denied. Please enable location services.');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('Location information unavailable.');
            break;
          case error.TIMEOUT:
            setLocationError('Location request timeout. Please try again.');
            break;
          default:
            setLocationError('An unknown error occurred while retrieving location.');
            break;
        }
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  // Mock data for demo
  const recentRides = [
    {
      id: '1',
      passenger: 'Sarah Johnson',
      pickup: 'Downtown Mall',
      drop: 'Airport Terminal',
      fare: 25.50,
      rating: 5,
      time: '2 hours ago'
    },
    {
      id: '2',
      passenger: 'Mike Chen',
      pickup: 'University Campus',
      drop: 'Business District',
      fare: 18.75,
      rating: 4,
      time: '5 hours ago'
    }
  ];

  return (
    <div className="dashboard-container">
      {/* Dashboard Header */}
      <div className="dashboard-header">
        <div className="dashboard-welcome">
          <h1>Welcome back, {driver?.name || 'Driver'}! 👋</h1>
          <p className="dashboard-subtitle">
            Ready to start earning? Toggle your status to go online and receive ride requests.
          </p>
        </div>
      </div>

      {/* Online Status Toggle */}
      <div className="online-status-card">
        <div className="status-info">
          <div className={`status-icon ${isOnline ? 'online' : 'offline'}`}>
            {isOnline ? '🟢' : '🔴'}
          </div>
          <div className="status-text">
            <h3>{isOnline ? 'You are Online' : 'You are Offline'}</h3>
            <p className="status-description">
              {isOnline 
                ? 'Ready to receive ride requests' 
                : locationLoading 
                  ? 'Getting your location...' 
                  : 'Go online to start accepting rides'
              }
            </p>
            {locationError && (
              <div className="location-error-display">
                <span className="error-icon">⚠️</span>
                <span className="error-text">{locationError}</span>
              </div>
            )}
          </div>
        </div>
        
        <label className="toggle-switch">
          <input
            type="checkbox"
            checked={isOnline}
            onChange={handleToggleOnline}
            disabled={locationLoading}
          />
          <span className="slider"></span>
        </label>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon">🚗</div>
            <h3 className="stat-title">Today's Rides</h3>
          </div>
          <div className="stat-value">{stats.todayRides}</div>
          <p className="stat-subtitle">+2 from yesterday</p>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon">💰</div>
            <h3 className="stat-title">Today's Earnings</h3>
          </div>
          <div className="stat-value">${stats.totalEarnings}</div>
          <p className="stat-subtitle">+$45.50 from yesterday</p>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon">⭐</div>
            <h3 className="stat-title">Rating</h3>
          </div>
          <div className="stat-value">{stats.rating}</div>
          <p className="stat-subtitle">Based on {driver?.totalRides || 245} rides</p>
        </div>

        <div className="stat-card">
          <div className="stat-header">
            <div className="stat-icon">🎯</div>
            <h3 className="stat-title">Pending Bids</h3>
          </div>
          <div className="stat-value">{stats.pendingBids}</div>
          <p className="stat-subtitle">Awaiting customer selection</p>
        </div>
      </div>

      {/* Available Rides Section */}
      {isOnline && (
        <div className="rides-section">
          <div className="section-header">
            <h2 className="section-title">🔍 Available Rides Near You</h2>
          </div>
          
          {availableRides.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🔍</div>
              <h3 className="empty-title">No rides available right now</h3>
              <p className="empty-description">
                New ride requests will appear here. Stay online to receive notifications!
              </p>
            </div>
          ) : (
            <div>
              {availableRides.slice(0, 3).map(ride => (
                <div key={ride.id} className="ride-card">
                  <div className="ride-header">
                    <div className="ride-customer">
                      <div className="customer-avatar">
                        {ride.customer?.name?.charAt(0) || 'U'}
                      </div>
                      <div className="customer-info">
                        <h4>{ride.customer?.name || 'Anonymous'}</h4>
                        <div className="customer-rating">
                          <span>⭐ {ride.customer?.rating || 4.5}</span>
                          <span>({ride.customer?.totalRides || 50} rides)</span>
                        </div>
                      </div>
                    </div>
                    <div className="ride-price">
                      <p className="price-label">Suggested Fare</p>
                      <h3 className="price-value">${ride.suggestedPrice || 25}</h3>
                    </div>
                  </div>

                  <div className="ride-route">
                    <div className="route-item">
                      <span className="route-icon pickup-icon">📍</span>
                      <span className="route-address">{ride.pickup?.address || 'Pickup location'}</span>
                    </div>
                    <div className="route-item">
                      <span className="route-icon drop-icon">🎯</span>
                      <span className="route-address">{ride.drop?.address || 'Drop location'}</span>
                    </div>
                  </div>

                  <div className="ride-meta">
                    <div className="meta-item">
                      <span>📏 {ride.distance || '5.2'} km</span>
                    </div>
                    <div className="meta-item">
                      <span>⏱️ {ride.estimatedTime || '15'} min</span>
                    </div>
                    <div className="meta-item">
                      <span>🕒 {ride.requestTime || 'Just now'}</span>
                    </div>
                  </div>

                  <div className="action-buttons">
                    <button 
                      className="bid-btn"
                      onClick={() => navigate('/available-rides')}
                    >
                      Place Bid
                    </button>
                  </div>
                </div>
              ))}
              
              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <button 
                  className="bid-btn"
                  onClick={() => navigate('/available-rides')}
                  style={{ background: 'transparent', color: '#ff6b35', border: '2px solid #ff6b35' }}
                >
                  View All Available Rides →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active Rides Section */}
      {activeRides.length > 0 && (
        <div className="rides-section">
          <div className="section-header">
            <h2 className="section-title">🚗 Your Active Rides</h2>
          </div>
          
          {activeRides.map(ride => (
            <div key={ride.id} className="active-ride-card">
              <div className="ride-status">
                <span className="status-badge">EN ROUTE</span>
                <span className="ride-timer">Started 5 min ago</span>
              </div>
              
              <div className="ride-header">
                <div className="ride-customer">
                  <div className="customer-avatar">
                    {ride.customer?.name?.charAt(0) || 'U'}
                  </div>
                  <div className="customer-info">
                    <h4>{ride.customer?.name || 'Anonymous'}</h4>
                    <div className="customer-rating">
                      <span>⭐ {ride.customer?.rating || 4.5}</span>
                    </div>
                  </div>
                </div>
                <div className="ride-price">
                  <h3 className="price-value">${ride.acceptedBid || 25}</h3>
                </div>
              </div>

              <div className="ride-route">
                <div className="route-item">
                  <span className="route-icon pickup-icon">📍</span>
                  <span className="route-address">{ride.pickup?.address}</span>
                </div>
                <div className="route-item">
                  <span className="route-icon drop-icon">🎯</span>
                  <span className="route-address">{ride.drop?.address}</span>
                </div>
              </div>

              <div className="action-buttons">
                <button className="action-btn call-btn">
                  📞 Call
                </button>
                <button className="action-btn navigate-btn">
                  🗺️ Navigate
                </button>
                <button className="action-btn complete-btn">
                  ✅ Complete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recent Rides */}
      <div className="rides-section">
        <div className="section-header">
          <h2 className="section-title">📋 Recent Rides</h2>
        </div>
        
        {recentRides.map(ride => (
          <div key={ride.id} className="ride-card" style={{ opacity: 0.8 }}>
            <div className="ride-header">
              <div className="ride-customer">
                <div className="customer-avatar">
                  {ride.passenger.charAt(0)}
                </div>
                <div className="customer-info">
                  <h4>{ride.passenger}</h4>
                  <div className="customer-rating">
                    <span>⭐ {ride.rating}</span>
                    <span>{ride.time}</span>
                  </div>
                </div>
              </div>
              <div className="ride-price">
                <h3 className="price-value">${ride.fare}</h3>
              </div>
            </div>

            <div className="ride-route">
              <div className="route-item">
                <span className="route-icon pickup-icon">📍</span>
                <span className="route-address">{ride.pickup}</span>
              </div>
              <div className="route-item">
                <span className="route-icon drop-icon">🎯</span>
                <span className="route-address">{ride.drop}</span>
              </div>
            </div>
          </div>
        ))}
        
        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <button 
            className="bid-btn"
            onClick={() => navigate('/history')}
            style={{ background: 'transparent', color: '#ff6b35', border: '2px solid #ff6b35' }}
          >
            View All History →
          </button>
        </div>
      </div>
    </div>
  );
};

export default Home;
