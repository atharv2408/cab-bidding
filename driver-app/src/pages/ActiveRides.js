import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import '../components/Modal.css';

// Fix Leaflet default markers
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const ActiveRides = ({ appState }) => {
  const { activeRides, setActiveRides, driver, socket } = appState;

  // Single active ride for demo
  const [rides, setRides] = useState(() => {
    // Only show one active ride if not completed
    const sampleRide = {
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
      status: 'assigned',
      startTime: Date.now() - 300000, // 5 minutes ago
      bookingId: 'booking_123',
      customerId: 'customer_456'
    };
    
    // Return empty array if ride is completed, otherwise return single ride
    const isCompleted = localStorage.getItem(`ride_completed_${sampleRide.id}`) || 
                       localStorage.getItem(`ride_completed_${sampleRide.bookingId}`);
    
    return isCompleted ? [] : [sampleRide];
  });

  const [rideTimers, setRideTimers] = useState({});
  const [cancellationModal, setCancellationModal] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [completedRideDetails, setCompletedRideDetails] = useState(null);
  const [showCompletionMap, setShowCompletionMap] = useState(false);
  const [completionStatus, setCompletionStatus] = useState(null);

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

  // Direct ride completion - show map then complete
  const handleCompleteRide = async (ride) => {
    // First show the map with starting location
    setCompletedRideDetails(ride);
    setShowCompletionMap(true);
  };

  // Complete the ride from map view
  const finalizeRideCompletion = async () => {
    if (!completedRideDetails) return;
    
    const ride = completedRideDetails;
    setShowCompletionMap(false);
    await completeRide(ride);
  };

  // Complete the ride and update history
  const completeRide = async (ride) => {
    setLoading(true);
    try {
      // Update ride status in database
      const rideCompletionData = {
        bookingId: ride.bookingId,
        driverId: driver.id,
        customerId: ride.customerId,
        finalFare: ride.fare,
        status: 'completed',
        completedAt: new Date().toISOString(),
        paymentStatus: 'paid'
      };

      // Call API to complete ride
      const response = await axios.post(
        'http://localhost:3001/api/ride/complete',
        rideCompletionData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('driverToken')}`
          }
        }
      );

      if (response.data.success) {
        // Immediately remove from active rides to prevent re-appearance
        setRides(prev => prev.filter(r => r.id !== ride.id));
        
        // Update driver earnings
        const earnings = localStorage.getItem('driverEarnings') || '0';
        const newEarnings = parseFloat(earnings) + ride.fare;
        localStorage.setItem('driverEarnings', newEarnings.toString());
        
        // Save completed ride to history
        const completedRideRecord = {
          id: ride.id,
          bookingId: ride.bookingId,
          customerId: ride.customerId,
          customerName: ride.customer.name,
          customerPhone: ride.customer.phone,
          pickup: ride.pickup.address,
          drop: ride.drop.address,
          distance: ride.distance,
          fare: ride.fare,
          status: 'completed',
          completedAt: new Date().toISOString(),
          paymentStatus: 'paid'
        };
        
        // Save to localStorage for history
        const existingHistory = JSON.parse(localStorage.getItem('driverRideHistory') || '[]');
        existingHistory.unshift(completedRideRecord);
        localStorage.setItem('driverRideHistory', JSON.stringify(existingHistory));
        
        // Mark ride as permanently completed
        localStorage.setItem(`ride_completed_${ride.id}`, 'true');
        localStorage.setItem(`ride_completed_${ride.bookingId}`, 'true');
        
        // Set completion status
        setCompletionStatus({
          message: 'Ride Completed!',
          earnings: ride.fare
        });
        
        // Clear completion details and status after showing message
        setTimeout(() => {
          setCompletedRideDetails(null);
          setCompletionStatus(null);
        }, 3000);
        
        // Emit socket event for real-time updates to customer
        if (socket) {
          socket.emit('rideCompleted', {
            rideId: ride.id,
            bookingId: ride.bookingId,
            driverId: driver.id,
            customerId: ride.customerId,
            fare: ride.fare,
            completedAt: completedRideRecord.completedAt,
            customerName: ride.customer.name
          });
        }
      } else {
        setError(response.data.message || 'Failed to complete ride');
      }
    } catch (error) {
      console.error('Error completing ride:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Cancel ride with reason
  const cancelRideWithReason = async () => {
    if (!cancellationModal || !cancellationReason.trim()) {
      setError('Please provide a cancellation reason');
      return;
    }

    const ride = cancellationModal;
    setLoading(true);
    
    try {
      const cancellationData = {
        bookingId: ride.bookingId,
        driverId: driver.id,
        customerId: ride.customerId,
        reason: cancellationReason,
        status: 'cancelled',
        cancelledAt: new Date().toISOString(),
        cancelledBy: 'driver'
      };

      const response = await axios.post(
        'http://localhost:3001/api/ride/cancel',
        cancellationData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('driverToken')}`
          }
        }
      );

      if (response.data.success) {
        // Remove from active rides
        setRides(prev => prev.filter(r => r.id !== ride.id));
        
        setCancellationModal(null);
        setCancellationReason('');
        
        alert(`Ride cancelled successfully.\nReason: ${cancellationReason}\n\nCustomer has been notified.`);
        
        // Emit socket event
        if (socket) {
          socket.emit('rideCancelled', {
            rideId: ride.id,
            driverId: driver.id,
            customerId: ride.customerId,
            reason: cancellationReason
          });
        }
      } else {
        setError(response.data.message || 'Failed to cancel ride');
      }
    } catch (error) {
      console.error('Error cancelling ride:', error);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'assigned':
        return {
          label: 'Ride Assigned',
          icon: '🎡',
          color: '#22c55e',
          bgColor: '#dcfce7'
        };
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
                </div>

                {/* Action Buttons based on Status */}
                <div className="action-buttons">
                  {ride.status === 'assigned' ? (
                    // Only show Navigate and Complete Ride for assigned rides
                    <>
                      <button 
                        className="action-btn navigate-btn"
                        onClick={() => handleNavigate(ride.pickup.coords)}
                      >
                        🗺️ Navigate
                      </button>
                      
                      <button 
                        className="action-btn complete-btn"
                        style={{ background: '#10b981' }}
                        onClick={() => handleCompleteRide(ride)}
                      >
                        ✅ Complete Ride
                      </button>
                    </>
                  ) : (
                    // Other status buttons for non-assigned rides
                    <>
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
                          style={{ background: '#10b981' }}
                          onClick={() => handleCompleteRide(ride)}
                        >
                          ✅ Complete Ride
                        </button>
                      )}
                    </>
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

      {/* Completion Map Modal */}
      {showCompletionMap && completedRideDetails && (
        <div className="modal-overlay" onClick={() => setShowCompletionMap(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🗺️ Starting Location</h3>
              <button 
                className="close-btn"
                onClick={() => setShowCompletionMap(false)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <p><strong>Customer:</strong> {completedRideDetails.customer.name}</p>
              <p><strong>Pickup:</strong> {completedRideDetails.pickup.address}</p>
              <p><strong>Fare:</strong> ${completedRideDetails.fare}</p>
              
              <div style={{ height: '300px', width: '100%', marginTop: '10px' }}>
                <MapContainer
                  center={completedRideDetails.pickup.coords}
                  zoom={13}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={completedRideDetails.pickup.coords}>
                    <Popup>Pickup Location: {completedRideDetails.pickup.address}</Popup>
                  </Marker>
                </MapContainer>
              </div>
            </div>
            
            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowCompletionMap(false)}
                disabled={loading}
              >
                Back
              </button>
              <button 
                className="btn btn-primary"
                onClick={finalizeRideCompletion}
                disabled={loading}
              >
                {loading ? '🔄 Completing...' : '✅ Complete Ride'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {cancellationModal && (
        <div className="modal-overlay" onClick={() => setCancellationModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚠️ Cancel Ride</h3>
              <button 
                className="close-btn"
                onClick={() => setCancellationModal(null)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="customer-info">
                <p><strong>Customer:</strong> {cancellationModal.customer.name}</p>
                <p><strong>Phone:</strong> {cancellationModal.customer.phone}</p>
              </div>
              
              <div className="cancellation-reason-section">
                <label htmlFor="cancellationReason">Reason for cancellation:</label>
                <select
                  id="cancellationReason"
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="cancellation-select"
                >
                  <option value="">Select a reason...</option>
                  <option value="Customer not found at pickup">Customer not found at pickup</option>
                  <option value="Customer cancelled">Customer cancelled</option>
                  <option value="Vehicle breakdown">Vehicle breakdown</option>
                  <option value="Emergency situation">Emergency situation</option>
                  <option value="Customer was intoxicated">Customer was intoxicated</option>
                  <option value="Unsafe pickup location">Unsafe pickup location</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              
              {error && (
                <div className="error-message">
                  <span className="error-icon">⚠️</span>
                  {error}
                </div>
              )}
            </div>
            
            <div className="modal-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setCancellationModal(null)}
                disabled={loading}
              >
                Back
              </button>
              <button 
                className="btn btn-danger"
                onClick={cancelRideWithReason}
                disabled={loading || !cancellationReason}
              >
                {loading ? '🔄 Cancelling...' : '⚠️ Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completion Status Modal */}
      {completionStatus && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '60px', marginBottom: '20px' }}>🎉</div>
            <h2 style={{ color: '#10b981', marginBottom: '10px' }}>{completionStatus.message}</h2>
            <p style={{ fontSize: '24px', fontWeight: 'bold', color: '#111827' }}>
              Money Earned: ${completionStatus.earnings}
            </p>
            <div style={{ marginTop: '20px', fontSize: '16px', color: '#6b7280' }}>
              Ride has been removed from assigned section
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ActiveRides;
