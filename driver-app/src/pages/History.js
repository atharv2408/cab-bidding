import React, { useEffect, useState } from 'react';
import axios from 'axios';

const History = ({ appState }) => {
  const { driver } = appState;
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await axios.get('http://localhost:3001/api/driver/history', {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('driverToken')}`
          }
        });
        if (res.data.success) {
          setHistory(res.data.history);
        } else {
          setError(res.data.message || 'Failed to load history');
        }
      } catch (err) {
        setError('Network error loading history');
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, []);
  
  if (loading) {
    return (
      <div className="dashboard-container">
        <p>Loading history...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <div className="dashboard-welcome">
          <h1>📋 Ride History</h1>
          <p className="dashboard-subtitle">
            View your completed rides and customer feedback.
          </p>
        </div>
      </div>

      {error && (
        <div className="error-message" style={{ marginBottom: 16 }}>
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      <div className="rides-section">
        {history.map(ride => (
          <div key={ride.id} className="ride-card">
            <div className="ride-header">
              <div className="ride-customer">
                <div className="customer-avatar">
                  {ride.customer?.name?.charAt(0) || '?'}
                </div>
                <div className="customer-info">
                  <h4>{ride.customer?.name || 'Customer'}</h4>
                  <div className="customer-rating">
                    <span>⭐ {ride.customerRating || ride.customer?.rating || '-'}</span>
                    <span>{new Date(ride.date || ride.completedAt || Date.now()).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div className="ride-price">
                <h3 className="price-value">${ride.fare?.toFixed ? ride.fare.toFixed(2) : ride.fare}</h3>
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
      </div>
    </div>
  );
};

export default History;
