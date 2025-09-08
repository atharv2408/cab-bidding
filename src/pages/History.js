import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { database } from '../utils/database';

function History({ appState }) {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, completed, cancelled

  useEffect(() => {
    loadBookingHistory();
  }, []);

  const loadBookingHistory = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || localStorage.getItem('customerData') || '{}');
      const userId = user?.id || user?.uid || 'demo-user-123';
      
      let allBookings = [];
      
      // Try to load from database first
      try {
        const userBookings = await database.getUserBookingHistory(userId);
        if (userBookings && userBookings.length > 0) {
          allBookings = userBookings;
          console.log('✅ Found database booking history:', allBookings.length);
        }
      } catch (dbError) {
        console.log('⚠️ Database unavailable, checking localStorage...');
      }
      
      // Fallback: Load from localStorage
      if (allBookings.length === 0) {
        const localHistory = JSON.parse(localStorage.getItem('customerRideHistory') || '[]');
        const confirmedBookings = JSON.parse(localStorage.getItem('confirmedBooking') || '{}');
        
        // Add confirmed booking if it exists
        if (confirmedBookings.id) {
          localHistory.unshift(confirmedBookings);
        }
        
        // Remove duplicates based on ID
        const uniqueBookings = localHistory.filter((booking, index, self) => 
          index === self.findIndex(b => b.id === booking.id)
        );
        
        allBookings = uniqueBookings;
        console.log('📝 Found localStorage booking history:', allBookings.length);
      }
      
      // Sort by date (newest first)
      allBookings.sort((a, b) => 
        new Date(b.completed_at || b.timestamp || b.created_at) - 
        new Date(a.completed_at || a.timestamp || a.created_at)
      );
      
      setBookings(allBookings);
      
      // Calculate stats from actual booking data
      const completedRides = allBookings.filter(b => b.status === 'completed');
      const totalSpent = allBookings.reduce((sum, b) => 
        sum + parseFloat(b.final_fare || b.estimated_fare || b.price || 0), 0
      );
      
      setStats({
        totalBookings: allBookings.length,
        completedRides: completedRides.length,
        cancelledRides: allBookings.filter(b => b.status === 'cancelled').length,
        totalSpent: totalSpent,
        averageRating: 4.8 // Can be calculated from actual ratings later
      });
      
    } catch (error) {
      console.error('Error loading booking history:', error);
      setBookings([]);
      setStats({});
    } finally {
      setLoading(false);
    }
  };

  const filteredBookings = bookings.filter(booking => {
    if (filter === 'all') return true;
    return booking.status === filter;
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status) => {
    switch(status) {
      case 'completed': return '✅';
      case 'confirmed': return '🔄';
      case 'cancelled': return '❌';
      default: return '📋';
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return '#10b981';
      case 'confirmed': return '#3b82f6';
      case 'cancelled': return '#ef4444';
      default: return '#6b7280';
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your booking history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="history-page">
        {/* Header */}
        <div className="history-header">
          <h1>🚗 My Rides</h1>
          <p>Track all your cab bookings and ride history</p>
        </div>

        {/* Stats Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-info">
              <div className="stat-value">{stats.totalBookings || 0}</div>
              <div className="stat-label">Total Rides</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">✅</div>
            <div className="stat-info">
              <div className="stat-value">{stats.completedRides || 0}</div>
              <div className="stat-label">Completed</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💰</div>
            <div className="stat-info">
              <div className="stat-value">₹{stats.totalSpent || 0}</div>
              <div className="stat-label">Total Spent</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">⭐</div>
            <div className="stat-info">
              <div className="stat-value">{(stats.averageRating || 5).toFixed(1)}</div>
              <div className="stat-label">Avg Rating</div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All ({bookings.length})
          </button>
          <button 
            className={`filter-tab ${filter === 'completed' ? 'active' : ''}`}
            onClick={() => setFilter('completed')}
          >
            Completed ({bookings.filter(b => b.status === 'completed').length})
          </button>
          <button 
            className={`filter-tab ${filter === 'confirmed' ? 'active' : ''}`}
            onClick={() => setFilter('confirmed')}
          >
            Active ({bookings.filter(b => b.status === 'confirmed').length})
          </button>
          <button 
            className={`filter-tab ${filter === 'cancelled' ? 'active' : ''}`}
            onClick={() => setFilter('cancelled')}
          >
            Cancelled ({bookings.filter(b => b.status === 'cancelled').length})
          </button>
        </div>

        {/* Bookings List */}
        <div className="bookings-list">
          {filteredBookings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h3>No rides found</h3>
              <p>
                {filter === 'all' 
                  ? "You haven't booked any rides yet. Start your first journey!"
                  : `No ${filter} rides found.`
                }
              </p>
              {filter === 'all' && (
                <button className="primary-btn" onClick={() => navigate('/')}>
                  Book Your First Ride
                </button>
              )}
            </div>
          ) : (
            filteredBookings.map((booking) => (
              <div key={booking.id} className="booking-card">
                <div className="booking-header">
                  <div className="booking-status">
                    <span className="status-icon">{getStatusIcon(booking.status)}</span>
                    <span 
                      className="status-text" 
                      style={{ color: getStatusColor(booking.status) }}
                    >
                      {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                    </span>
                  </div>
                  <div className="booking-date">{formatDate(booking.timestamp || booking.created_at)}</div>
                </div>

                <div className="booking-route">
                  <div className="route-point">
                    <div className="route-icon pickup">📍</div>
                  <div className="route-text">
                    <div className="route-label">From</div>
                    <div className="route-address">{booking.pickup_address || booking.pickup || 'Unknown Location'}</div>
                  </div>
                </div>
                <div className="route-arrow">→</div>
                <div className="route-point">
                  <div className="route-icon drop">🏁</div>
                  <div className="route-text">
                    <div className="route-label">To</div>
                    <div className="route-address">{booking.drop_address || booking.drop || 'Unknown Destination'}</div>
                  </div>
                  </div>
                </div>

              <div className="booking-details">
                <div className="detail-item">
                  <span className="detail-icon">🚗</span>
                  <span className="detail-text">{booking.driver_name || booking.driverName || 'Driver'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-icon">🚙</span>
                  <span className="detail-text">{booking.vehicle_model || booking.car || 'Vehicle'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-icon">📏</span>
                  <span className="detail-text">{booking.distance || 0} km</span>
                </div>
                <div className="detail-item">
                  <span className="detail-icon">💰</span>
                  <span className="detail-text">₹{booking.estimated_fare || booking.price || 0}</span>
                </div>
              </div>

                {booking.bookingId && (
                  <div className="booking-id">
                    <span>Booking ID: </span>
                    <span className="id-value">{booking.bookingId}</span>
                  </div>
                )}

                <div className="booking-actions">
                  {booking.status === 'confirmed' && (
                    <>
                      <button className="action-btn track-btn">
                        📍 Track Ride
                      </button>
                      <button className="action-btn call-btn">
                        📞 Call Driver
                      </button>
                    </>
                  )}
                  {booking.status === 'completed' && (
                    <button className="action-btn rate-btn">
                      ⭐ Rate Ride
                    </button>
                  )}
                  <button className="action-btn details-btn">
                    📋 View Details
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {filteredBookings.length > 0 && (
          <div className="pagination-info">
            Showing {filteredBookings.length} of {bookings.length} rides
          </div>
        )}
      </div>
    </div>
  );
}

export default History;
