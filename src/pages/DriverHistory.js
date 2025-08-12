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

  // Get driver data from localStorage if not passed as prop
  const driver = driverData || JSON.parse(localStorage.getItem('driverData') || '{}');

  useEffect(() => {
    if (!driver.uid && !driver.id) {
      navigate('/driver/login');
      return;
    }

    // Load basic stats (simplified for now)
    setStats({
      totalRides: driver.totalRides || 0,
      totalEarnings: driver.earnings || 0,
      averageRating: driver.rating || 5.0,
      completionRate: 98.5
    });
    setLoading(false);
  }, [driver, navigate]);

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

      {/* Placeholder for future features */}
      <div className="rides-history-section">
        <h3>
          Completed Rides 
          <span className="rides-count">(0)</span>
        </h3>
        
        <div className="no-rides">
          <p>🚗 No completed rides yet</p>
          <p>Start taking rides to see your history here</p>
        </div>
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
