import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { database } from '../utils/database';

function Success({ appState }) {
  const navigate = useNavigate();
  const { selectedBid, rideOTP, pickup, drop } = appState;
  const [driverDetails, setDriverDetails] = useState(null);
  const [estimatedArrival, setEstimatedArrival] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchDriverDetails = async () => {
      if (selectedBid) {
        try {
          // Get detailed driver info from database
          const drivers = await database.getDrivers();
          const driver = drivers.find(d => d.name === selectedBid.driver);
          if (driver) {
            setDriverDetails(driver);
            // Calculate estimated arrival time
            const now = new Date();
            const arrivalTime = new Date(now.getTime() + selectedBid.eta * 60000);
            setEstimatedArrival(arrivalTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
          }
        } catch (error) {
          console.error('Error fetching driver details:', error);
        }

        // Generate booking ID
        setBookingId('BC' + Date.now().toString().slice(-6));
      }
    };

    fetchDriverDetails();
  }, [selectedBid]);

  const handleCall = () => {
    if (driverDetails?.phone) {
      window.open(`tel:${driverDetails.phone}`);
    }
  };

  const handleTrackRide = () => {
    // Future implementation for live tracking
    alert('Live tracking feature will be available soon!');
  };

  const handleMessage = () => {
    // Future implementation for messaging
    alert('Messaging feature will be available soon!');
  };

  const handleGoToHistory = () => {
    navigate('/history');
  };

  const handleBookAnother = () => {
    navigate('/');
  };

  if (!selectedBid) {
    return (
      <div className="container">
        <div className="success-fallback">
          <h2>🎉 Ride Booked Successfully!</h2>
          <p>Your cab has been booked. Please check your booking history for details.</p>
          <div className="success-actions">
            <button className="primary-btn" onClick={handleGoToHistory}>
              View History
            </button>
            <button className="secondary-btn" onClick={handleBookAnother}>
              Book Another Ride
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Success Confirmation Card */}
      <div className="success-confirmation-card">
        {/* Success Header */}
        <div className="success-header">
          <div className="success-animation">
            <div className="checkmark-animation">✅</div>
          </div>
          <div className="success-message">
            <h1>Ride Confirmed Successfully!</h1>
            <p>Your cab is on the way</p>
            {bookingId && (
              <div className="success-booking-id">
                Booking ID: <span className="booking-ref">{bookingId}</span>
              </div>
            )}
          </div>
        </div>

        {/* Driver Information */}
        <div className="success-driver-section">
          <div className="section-title">
            <h3>🚗 Your Driver</h3>
            <div className="driver-status online">• Online</div>
          </div>
          
          <div className="driver-card">
            <div className="driver-avatar-section">
              <div className="driver-avatar">
                <div className="avatar-initial">{selectedBid.avatar || selectedBid.driver.charAt(0)}</div>
                <div className="verified-badge">✓</div>
              </div>
            </div>
            
            <div className="driver-info">
              <h2>{selectedBid.driver}</h2>
              <div className="driver-details">
                <div className="detail">
                  <span className="icon">⭐</span>
                  <span>{selectedBid.rating} Rating</span>
                </div>
                <div className="detail">
                  <span className="icon">🚗</span>
                  <span>{driverDetails?.totalRides || '1000+'} Rides</span>
                </div>
                <div className="detail">
                  <span className="icon">📅</span>
                  <span>{selectedBid.experience} Experience</span>
                </div>
              </div>
              
              {driverDetails?.phone && (
                <div className="driver-phone">
                  <span className="phone-icon">📞</span>
                  <span>{driverDetails.phone}</span>
                </div>
              )}
              
              {estimatedArrival && (
                <div className="arrival-info">
                  <span className="arrival-icon">🕐</span>
                  <span>Arriving at <strong>{estimatedArrival}</strong></span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Vehicle Information */}
        <div className="success-vehicle-section">
          <h3>🚙 Vehicle Details</h3>
          <div className="vehicle-info">
            <div className="vehicle-model">
              <span className="car-icon">🚗</span>
              <span><strong>{selectedBid.car}</strong></span>
            </div>
            <div className="vehicle-details">
              <div className="vehicle-plate">
                {driverDetails?.car?.plate || 'DL 01 AB 1234'}
              </div>
              <div className="vehicle-type">
                {driverDetails?.car?.type || 'Sedan'} • {driverDetails?.car?.color || 'White'}
              </div>
            </div>
          </div>
        </div>

        {/* Trip Information */}
        <div className="success-trip-section">
          <h3>📍 Trip Details</h3>
          <div className="trip-route">
            <div className="route-item">
              <div className="route-marker pickup">📍</div>
              <div className="route-details">
                <div className="route-label">Pickup</div>
                <div className="route-address">{pickup?.address || 'Pickup Location'}</div>
              </div>
            </div>
            <div className="route-divider">↓</div>
            <div className="route-item">
              <div className="route-marker drop">🏁</div>
              <div className="route-details">
                <div className="route-label">Drop</div>
                <div className="route-address">{drop?.address || 'Drop Location'}</div>
              </div>
            </div>
          </div>
          
          <div className="trip-summary">
            <div className="summary-item">
              <span className="summary-icon">💰</span>
              <span className="summary-label">Fare</span>
              <span className="summary-value">₹{selectedBid.price}</span>
            </div>
            <div className="summary-item">
              <span className="summary-icon">📏</span>
              <span className="summary-label">Distance</span>
              <span className="summary-value">{selectedBid.distance} km</span>
            </div>
            <div className="summary-item">
              <span className="summary-icon">⏱️</span>
              <span className="summary-label">ETA</span>
              <span className="summary-value">{selectedBid.eta} min</span>
            </div>
          </div>
        </div>

        {/* OTP Section */}
        {rideOTP && (
          <div className="success-otp-section">
            <div className="otp-header">
              <span className="otp-icon">🔐</span>
              <h3>Your Ride OTP</h3>
            </div>
            <div className="otp-display">
              <div className="otp-number">{rideOTP}</div>
              <button 
                className="otp-copy-btn" 
                onClick={() => navigator.clipboard.writeText(rideOTP)}
                title="Copy OTP"
              >
                📋
              </button>
            </div>
            <div className="otp-instructions">
              <p>🛡️ Share this OTP with your driver when boarding</p>
              <p className="security-note">Keep this OTP secure and never share before boarding</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="success-actions">
          <button className="action-btn call-btn" onClick={handleCall}>
            <span className="btn-icon">📞</span>
            <span>Call Driver</span>
          </button>
          <button className="action-btn track-btn" onClick={handleTrackRide}>
            <span className="btn-icon">📍</span>
            <span>Track Live</span>
          </button>
          <button className="action-btn message-btn" onClick={handleMessage}>
            <span className="btn-icon">💬</span>
            <span>Message</span>
          </button>
        </div>

        {/* Navigation Actions */}
        <div className="success-navigation">
          <button className="nav-btn history-btn" onClick={handleGoToHistory}>
            View Booking History
          </button>
          <button className="nav-btn book-another-btn" onClick={handleBookAnother}>
            Book Another Ride
          </button>
        </div>
      </div>
    </div>
  );
}

export default Success;
