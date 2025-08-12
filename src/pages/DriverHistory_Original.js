import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabaseDB } from '../utils/supabaseService';

const DriverHistory = ({ driverData }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [completedRides, setCompletedRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, today, week, month
  const [stats, setStats] = useState({
    totalRides: 0,
    totalEarnings: 0,
    averageRating: 0,
    completionRate: 100
  });

  // Get driver data from localStorage if not passed as prop
  const driver = driverData || JSON.parse(localStorage.getItem('driverData') || '{}');

  useEffect(() => {
    if (!driver.uid) {
      navigate('/driver/login');
      return;
    }

    // Query completed rides
    const ridesQuery = query(
      collection(db, 'rideRequests'),
      where('driverId', '==', driver.uid),
      where('status', '==', 'completed'),
      orderBy('completedAt', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(ridesQuery, (snapshot) => {
      const rides = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setCompletedRides(rides);
      calculateStats(rides);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [driver.uid, navigate]);

  const calculateStats = (rides) => {
    const totalRides = rides.length;
    const totalEarnings = rides.reduce((sum, ride) => sum + (ride.finalAmount || 0), 0);
    const avgRating = rides.length > 0 
      ? rides.reduce((sum, ride) => sum + (ride.customerRating || 5), 0) / rides.length 
      : 5.0;

    setStats({
      totalRides,
      totalEarnings,
      averageRating: avgRating.toFixed(1),
      completionRate: 98.5 // This would be calculated from accepted vs completed rides
    });
  };

  const filterRides = (rides, filterType) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    switch (filterType) {
      case 'today':
        return rides.filter(ride => 
          ride.completedAt?.toDate() >= today
        );
      case 'week':
        return rides.filter(ride => 
          ride.completedAt?.toDate() >= weekAgo
        );
      case 'month':
        return rides.filter(ride => 
          ride.completedAt?.toDate() >= monthAgo
        );
      default:
        return rides;
    }
  };

  const filteredRides = filterRides(completedRides, filter);

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

      {/* Filter Controls */}
      <div className="filter-controls">
        <h3>Filter by:</h3>
        <div className="filter-buttons">
          <button 
            className={filter === 'all' ? 'active' : ''} 
            onClick={() => setFilter('all')}
          >
            All Time
          </button>
          <button 
            className={filter === 'today' ? 'active' : ''} 
            onClick={() => setFilter('today')}
          >
            Today
          </button>
          <button 
            className={filter === 'week' ? 'active' : ''} 
            onClick={() => setFilter('week')}
          >
            This Week
          </button>
          <button 
            className={filter === 'month' ? 'active' : ''} 
            onClick={() => setFilter('month')}
          >
            This Month
          </button>
        </div>
      </div>

      {/* Rides List */}
      <div className="rides-history-section">
        <h3>
          Completed Rides 
          <span className="rides-count">({filteredRides.length})</span>
        </h3>
        
        {filteredRides.length === 0 ? (
          <div className="no-rides">
            <p>🚗 No completed rides found for the selected period</p>
          </div>
        ) : (
          <div className="rides-history-list">
            {filteredRides.map(ride => (
              <RideHistoryCard key={ride.id} ride={ride} />
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

// Component for individual ride history cards
const RideHistoryCard = ({ ride }) => {
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp.toDate()).toLocaleString();
  };

  const formatDuration = (start, end) => {
    if (!start || !end) return 'N/A';
    const duration = (end.toDate() - start.toDate()) / (1000 * 60); // minutes
    return `${Math.round(duration)} min`;
  };

  const getRatingStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={i <= rating ? 'star filled' : 'star'}>
          ⭐
        </span>
      );
    }
    return stars;
  };

  return (
    <div className="ride-history-card">
      <div className="ride-header">
        <div className="ride-id">
          <span className="label">Ride ID:</span>
          <span className="value">#{ride.id.substring(0, 8)}</span>
        </div>
        <div className="ride-date">
          <span className="date">{formatDate(ride.completedAt)}</span>
        </div>
      </div>

      <div className="ride-route">
        <div className="route-point pickup">
          <span className="icon">📍</span>
          <div className="location">
            <span className="label">Pickup</span>
            <span className="address">{ride.pickup.address}</span>
          </div>
        </div>
        
        <div className="route-arrow">→</div>
        
        <div className="route-point drop">
          <span className="icon">🏁</span>
          <div className="location">
            <span className="label">Drop</span>
            <span className="address">{ride.drop.address}</span>
          </div>
        </div>
      </div>

      <div className="ride-details">
        <div className="detail-item">
          <span className="icon">👤</span>
          <span className="label">Customer:</span>
          <span className="value">{ride.customerName || 'Customer'}</span>
        </div>
        
        <div className="detail-item">
          <span className="icon">⏱️</span>
          <span className="label">Duration:</span>
          <span className="value">{formatDuration(ride.startedAt, ride.completedAt)}</span>
        </div>
        
        <div className="detail-item">
          <span className="icon">💰</span>
          <span className="label">Earnings:</span>
          <span className="value amount">₹{ride.finalAmount || 0}</span>
        </div>
        
        {ride.customerRating && (
          <div className="detail-item">
            <span className="icon">⭐</span>
            <span className="label">Rating:</span>
            <span className="value rating">
              {getRatingStars(ride.customerRating)}
              <span className="rating-value">({ride.customerRating}/5)</span>
            </span>
          </div>
        )}
      </div>

      {ride.customerFeedback && (
        <div className="customer-feedback">
          <span className="feedback-label">Customer Feedback:</span>
          <p className="feedback-text">"{ride.customerFeedback}"</p>
        </div>
      )}

      <div className="ride-footer">
        <div className="payment-method">
          <span className="icon">💳</span>
          <span>{ride.paymentMethod || 'Cash'}</span>
        </div>
        
        {ride.tips && ride.tips > 0 && (
          <div className="tips">
            <span className="icon">🎉</span>
            <span className="tip-amount">Tip: ₹{ride.tips}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverHistory;
