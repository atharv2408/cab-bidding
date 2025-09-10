import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../components/Modal.css';

const ActiveRides = ({ appState }) => {
  const { activeRides, setActiveRides, driver, socket } = appState;

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
      otp: '4785',
      bookingId: 'booking_123',
      customerId: 'customer_456'
    }
  ].filter(ride => {
    // Filter out completed rides
    return !localStorage.getItem(`ride_completed_${ride.id}`) && 
           !localStorage.getItem(`ride_completed_${ride.bookingId}`);
  }));

  const [rideTimers, setRideTimers] = useState({});
  const [otpVerificationModal, setOtpVerificationModal] = useState(null);
  const [enteredOtp, setEnteredOtp] = useState('');
  const [cancellationModal, setCancellationModal] = useState(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  // Verify OTP before allowing ride completion
  const handleOtpVerification = (ride) => {
    setOtpVerificationModal(ride);
    setEnteredOtp('');
    setError('');
  };

  // Verify OTP and proceed with ride completion
  const verifyOtpAndComplete = async () => {
    if (!otpVerificationModal || !enteredOtp) {
      setError('Please enter the OTP');
      return;
    }

    const ride = otpVerificationModal;
    if (enteredOtp !== ride.otp) {
      setError('Invalid OTP. Please check with the customer.');
      return;
    }

    setError('');
    setOtpVerificationModal(null);
    
    // Show ride completion options
    handleRideCompletion(ride);
  };

  // Show ride completion options (Complete or Cancel)
  const handleRideCompletion = (ride) => {
    const confirmCompletion = window.confirm(
      `Ride verification successful!\n\nCustomer: ${ride.customer.name}\nFare: $${ride.fare}\n\nDo you want to COMPLETE this ride?\n\nClick OK to Complete or Cancel to report an issue.`
    );
    
    if (confirmCompletion) {
      completeRide(ride);
    } else {
      setCancellationModal(ride);
      setCancellationReason('');
    }
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
        
        // Show success message
        alert(`🎉 Ride Completed Successfully!\n\nEarnings: $${ride.fare}\nTotal Earnings: $${newEarnings.toFixed(2)}\n\nPayment has been processed automatically.`);
        
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
                      onClick={() => handleOtpVerification(ride)}
                    >
                      🔐 Verify OTP & Complete
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

      {/* OTP Verification Modal */}
      {otpVerificationModal && (
        <div className="modal-overlay" onClick={() => setOtpVerificationModal(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>🔐 Verify Customer OTP</h3>
              <button 
                className="close-btn"
                onClick={() => setOtpVerificationModal(null)}
              >
                ×
              </button>
            </div>
            
            <div className="modal-body">
              <div className="customer-info">
                <p><strong>Customer:</strong> {otpVerificationModal.customer.name}</p>
                <p><strong>Phone:</strong> {otpVerificationModal.customer.phone}</p>
                <p><strong>Fare:</strong> ${otpVerificationModal.fare}</p>
              </div>
              
              <div className="otp-input-section">
                <label htmlFor="otpInput">Enter 6-digit OTP from customer:</label>
                <input
                  type="text"
                  id="otpInput"
                  value={enteredOtp}
                  onChange={(e) => setEnteredOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="otp-input"
                  maxLength={6}
                />
                <p className="otp-hint">Customer's OTP: {otpVerificationModal.otp} (for demo)</p>
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
                onClick={() => setOtpVerificationModal(null)}
                disabled={loading}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={verifyOtpAndComplete}
                disabled={loading || enteredOtp.length !== 6}
              >
                {loading ? '🔄 Verifying...' : '✅ Verify & Proceed'}
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
    </div>
  );
};

export default ActiveRides;
