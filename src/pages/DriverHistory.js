import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseDB } from '../utils/supabaseService';

const DriverHistory = ({ driverData }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRides: 0,
    totalEarnings: 0,
    averageRating: 5.0,
    completionRate: 100
  });
  const [rideHistory, setRideHistory] = useState([]);
  const [filter, setFilter] = useState('all'); // all, completed, today

  // Get driver data from localStorage if not passed as prop
  const driver = driverData || JSON.parse(localStorage.getItem('driverData') || '{}');

  useEffect(() => {
    if (!driver.uid && !driver.id) {
      navigate('/driver/login');
      return;
    }

    loadDriverHistory();
  }, [driver, navigate]);

  const loadDriverHistory = async () => {
    try {
      let allRides = [];
      
      // Try to load from database first
      try {
        const { data: dbRides, error } = await supabaseDB.bookings.getAll();
        
        if (!error && dbRides && dbRides.length > 0) {
          // Filter for this driver's completed rides
          const driverCompletedRides = dbRides.filter(ride => 
            (ride.selected_driver_id === (driver.id || driver.uid) ||
             ride.driver_id === (driver.id || driver.uid)) &&
            ride.status === 'completed'
          );
          
          allRides = driverCompletedRides;
          console.log('✅ Found database ride history:', allRides.length);
        }
      } catch (dbError) {
        console.log('⚠️ Database unavailable, checking localStorage...');
      }
      
      // Fallback: Load from localStorage
      if (allRides.length === 0) {
        const localHistory = JSON.parse(localStorage.getItem('driverRideHistory') || '[]');
        allRides = localHistory.filter(ride => ride.status === 'completed');
        console.log('📝 Found localStorage ride history:', allRides.length);
      }
      
      // Sort by completion date (newest first)
      allRides.sort((a, b) => new Date(b.completed_at || b.timestamp) - new Date(a.completed_at || a.timestamp));
      
      setRideHistory(allRides);
      
      // Calculate stats from actual ride data
      const totalEarningsAmount = allRides.reduce((sum, ride) => 
        sum + parseFloat(ride.final_fare || ride.estimated_fare || 0), 0
      );
      
      setStats({
        totalRides: allRides.length,
        totalEarnings: totalEarningsAmount,
        averageRating: driver.rating || 4.5,
        completionRate: allRides.length > 0 ? 100 : 98.5
      });
      
    } catch (error) {
      console.error('Error loading driver history:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="driver-history-loading">
        <div className="loading-spinner">⟳</div>
        <p>Loading ride history...</p>
      </div>
    );
  }

  return (
    <div className="driver-history">
      <div className="history-header">
        <h2>📊 Ride History</h2>
        <p>Track your performance and earnings</p>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card rides">
          <div className="stat-icon">🚗</div>
          <div className="stat-content">
            <span className="stat-value">{stats.totalRides}</span>
            <span className="stat-label">Total Rides</span>
          </div>
        </div>
        
        <div className="stat-card earnings">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <span className="stat-value">₹{stats.totalEarnings.toLocaleString()}</span>
            <span className="stat-label">Total Earnings</span>
          </div>
        </div>
        
        <div className="stat-card rating">
          <div className="stat-icon">⭐</div>
          <div className="stat-content">
            <span className="stat-value">{stats.averageRating}</span>
            <span className="stat-label">Average Rating</span>
          </div>
        </div>
        
        <div className="stat-card completion">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <span className="stat-value">{stats.completionRate}%</span>
            <span className="stat-label">Completion Rate</span>
          </div>
        </div>
      </div>

      {/* Actual Ride History */}
      <div className="rides-history-section">
        <h3>
          Completed Rides 
          <span className="rides-count">({rideHistory.length})</span>
        </h3>
        
        {rideHistory.length === 0 ? (
          <div className="no-rides">
            <p>🚗 No completed rides yet</p>
            <p>Start taking rides to see your history here</p>
            <button 
              onClick={() => navigate('/driver/dashboard')}
              className="back-to-dashboard-btn"
            >
              Go to Dashboard
            </button>
          </div>
        ) : (
          <div className="rides-list">
            {rideHistory.map((ride, index) => (
              <div key={ride.id || index} className="ride-history-card">
                <div className="ride-header">
                  <div className="ride-id">
                    <span className="label">Ride</span>
                    <span className="value">#{ride.bookingId || ride.id || (index + 1).toString().padStart(3, '0')}</span>
                  </div>
                  <div className="status-badge completed">✅ Completed</div>
                  <div className="ride-date">
                    {new Date(ride.completed_at || ride.timestamp).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>

                <div className="ride-route">
                  <div className="route-point pickup">
                    <div className="route-icon">📍</div>
                    <div className="location">
                      <div className="label">Pickup</div>
                      <div className="address">{ride.pickup_address || 'Pickup Location'}</div>
                    </div>
                  </div>
                  <div className="route-arrow">→</div>
                  <div className="route-point drop">
                    <div className="route-icon">🏁</div>
                    <div className="location">
                      <div className="label">Drop</div>
                      <div className="address">{ride.drop_address || 'Drop Location'}</div>
                    </div>
                  </div>
                </div>

                <div className="ride-details">
                  <div className="detail-item customer">
                    <span className="icon">👤</span>
                    <span className="label">Customer:</span>
                    <span className="value">{ride.customer_name || 'Customer'}</span>
                  </div>
                  
                  <div className="detail-item distance">
                    <span className="icon">📏</span>
                    <span className="label">Distance:</span>
                    <span className="value">{ride.distance || 0} km</span>
                  </div>
                  
                  <div className="detail-item duration">
                    <span className="icon">⏱️</span>
                    <span className="label">Duration:</span>
                    <span className="value">
                      {ride.started_at && ride.completed_at 
                        ? Math.round((new Date(ride.completed_at) - new Date(ride.started_at)) / 60000) + ' min'
                        : 'N/A'
                      }
                    </span>
                  </div>
                  
                  <div className="detail-item earnings">
                    <span className="icon">💰</span>
                    <span className="label">Earnings:</span>
                    <span className="amount">₹{ride.final_fare || ride.estimated_fare || 0}</span>
                  </div>
                  
                  {ride.customer_phone && (
                    <div className="detail-item phone">
                      <span className="icon">📞</span>
                      <span className="label">Phone:</span>
                      <span className="value">{ride.customer_phone}</span>
                    </div>
                  )}
                </div>

                {ride.customer_rating && (
                  <div className="customer-feedback">
                    <div className="feedback-label">Customer Rating:</div>
                    <div className="rating">
                      {[...Array(Math.floor(ride.customer_rating))].map((_, i) => (
                        <span key={i} className="star">⭐</span>
                      ))}
                      <span className="rating-value">({ride.customer_rating})</span>
                    </div>
                    {ride.customer_feedback && (
                      <div className="feedback-text">"{ride.customer_feedback}"</div>
                    )}
                  </div>
                )}

                <div className="ride-footer">
                  <div className="payment-method">
                    💳 {ride.payment_method || 'Cash'}
                  </div>
                  {ride.tips && (
                    <div className="tips">
                      💡 Tip: ₹{ride.tips}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Earnings Chart Placeholder */}
      <div className="earnings-chart-section">
        <h3>📈 Earnings Trend</h3>
        <div className="chart-placeholder">
          <p>Earnings chart visualization would go here</p>
          <p>Shows daily/weekly/monthly earnings trends</p>
        </div>
      </div>
    </div>
  );
};

export default DriverHistory;
