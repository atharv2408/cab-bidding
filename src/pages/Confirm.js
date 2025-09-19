import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { database } from '../utils/database';
import { createApiUrl, API_ENDPOINTS } from '../config/api';
import otpManager from '../utils/otpManager';
import urgentNotificationManager from '../utils/urgentNotificationManager';

function Confirm({ appState }) {
  const navigate = useNavigate();
  const { selectedBid, showRideDetails, setShowRideDetails, rideOTP, setRideOTP, pickup, drop } = appState;
  const [driverDetails, setDriverDetails] = useState(null);
  const [estimatedArrival, setEstimatedArrival] = useState('');
  const [bookingId, setBookingId] = useState('');

  // Apply dark theme to body when component mounts
  useEffect(() => {
    document.body.classList.add('dark');
    
    return () => {
      // Keep dark theme when unmounting since it's the default for the entire app
      // document.body.classList.remove('dark');
    };
  }, []);

  // Generate OTP and get driver details when component mounts
  useEffect(() => {
    const fetchDriverDetails = async () => {
      if (selectedBid) {
        // Only generate OTP if one doesn't exist
        if (!rideOTP) {
          const newOTP = otpManager.getInstantOTP('temp_' + Date.now(), selectedBid.driver_id);
          setRideOTP(newOTP);
          console.log('🚀 Instant OTP generated for ride:', newOTP);
        }

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
  }, [selectedBid, setRideOTP]); // Removed rideOTP to prevent duplicate generation

  const handleConfirm = async () => {
    if (!selectedBid) {
      alert('No bid selected. Going back to bids page.');
      navigate('/bids');
      return;
    }

    console.log('🚗 Confirming ride with driver:', selectedBid.driver);
    
    // Get user data
    const user = JSON.parse(localStorage.getItem('customerData') || localStorage.getItem('user') || '{}');
    
    // Prepare booking data for Supabase
    const bookingData = {
      id: bookingId,
      customer_name: user?.name || user?.full_name || 'Demo User',
      customer_phone: user?.phone || user?.phoneNumber || '+91 0000000000',
      pickup_location: {
        lat: pickup.coords?.[0] || 0,
        lng: pickup.coords?.[1] || 0
      },
      drop_location: {
        lat: drop.coords?.[0] || 0,
        lng: drop.coords?.[1] || 0
      },
      pickup_address: pickup.address,
      drop_address: drop.address,
      distance: parseFloat(selectedBid.distance) || 0,
      estimated_fare: parseFloat(selectedBid.price) || 0,
      status: 'confirmed',
      selected_driver_id: selectedBid.driver_id,
      payment_method: 'cash',
      special_requests: ''
    };

    try {
      let bookingSaved = false;
      
      // Try to save to Supabase database first
      try {
        const response = await fetch(createApiUrl(API_ENDPOINTS.BOOKINGS), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('customerToken') || localStorage.getItem('authToken')}`
          },
          body: JSON.stringify(bookingData)
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('✅ Booking saved to Supabase:', result);
          bookingSaved = true;
        } else {
          throw new Error('API request failed');
        }
      } catch (apiError) {
        console.log('⚠️ Supabase API unavailable, using fallback booking save...');
        
        // Fallback: Store booking locally
        const fallbackBooking = {
          ...bookingData,
          id: bookingId,
          status: 'confirmed',
          created_at: new Date().toISOString(),
          driverName: selectedBid.driver,
          price: selectedBid.price,
          distance: selectedBid.distance,
          eta: selectedBid.eta,
          otp: rideOTP,
          car: selectedBid.car,
          driverPhone: driverDetails?.phone || 'Contact via app',
          estimatedArrival: estimatedArrival
        };
        
        localStorage.setItem('confirmedBooking', JSON.stringify(fallbackBooking));
        localStorage.setItem(`confirmed_${bookingId}`, JSON.stringify(fallbackBooking));
        // Store OTP in multiple locations for immediate driver access
        localStorage.setItem('currentRideOTP', rideOTP);
        localStorage.setItem('rideOTP', rideOTP);
        localStorage.setItem(`otp_${bookingId}`, rideOTP);
        localStorage.setItem(`driver_otp_${selectedBid.driver_id}`, rideOTP);
        localStorage.setItem('latestRideOTP', JSON.stringify({
          otp: rideOTP,
          bookingId: bookingId,
          driverId: selectedBid.driver_id,
          timestamp: Date.now(),
          customerName: user?.name || 'Customer'
        }));
        
        console.log('🔐 Customer OTP stored for driver verification:', rideOTP);
        console.log('🔐 OTP Storage Debug:', {
          currentRideOTP: localStorage.getItem('currentRideOTP'),
          rideOTP: localStorage.getItem('rideOTP'),
          driverSpecificOTP: localStorage.getItem(`driver_otp_${selectedBid.driver_id}`),
          latestRideOTP: localStorage.getItem('latestRideOTP')
        });
        
        // Create urgent notification for driver with reduced timeout
        const urgentRideData = {
          id: bookingId,
          driverId: selectedBid.driver_id,
          otp: rideOTP,
          customerName: user?.name || 'Customer',
          pickup: pickup.address,
          drop: drop.address,
          fare: selectedBid.price,
          distance: selectedBid.distance,
          eta: selectedBid.eta,
          timestamp: Date.now()
        };
        
        // Create urgent OTP notification with 45-second timeout
        const urgentNotification = urgentNotificationManager.createUrgentOTPNotification(urgentRideData);
        
        // Legacy notification system for backward compatibility
        const driverNotification = {
          type: 'RIDE_ACCEPTED',
          driverId: selectedBid.driver_id,
          bookingId: bookingId,
          otp: rideOTP,
          timestamp: Date.now(),
          customerName: user?.name || 'Customer',
          pickup: pickup.address,
          drop: drop.address,
          fare: selectedBid.price,
          urgent: true,
          urgentNotificationId: urgentNotification.id
        };
        
        // Store notification for immediate driver pickup
        localStorage.setItem('pendingDriverNotification', JSON.stringify(driverNotification));
        localStorage.setItem(`notification_${selectedBid.driver_id}`, JSON.stringify(driverNotification));
        localStorage.setItem(`urgent_${selectedBid.driver_id}`, JSON.stringify(urgentNotification));
        
        // Trigger a storage event to notify other tabs/windows
        window.dispatchEvent(new StorageEvent('storage', {
          key: 'pendingDriverNotification',
          newValue: JSON.stringify(driverNotification)
        }));
        
        // Dispatch urgent notification event
        window.dispatchEvent(new CustomEvent('urgentNotification', {
          detail: urgentNotification
        }));
        
        console.log('🚨 URGENT: Driver notification created with 45s timeout for ride', bookingId);
        
        console.log('✅ Booking saved in fallback mode:', bookingId);
        bookingSaved = true;
      }
      
      if (bookingSaved) {
        setShowRideDetails(true);
        navigate('/success');
      }
      
    } catch (error) {
      console.error('Error confirming booking:', error);
      console.error('Error details:', {
        message: error.message,
        bookingData: booking,
        selectedBid: selectedBid
      });
      alert('Failed to confirm booking. Please try again.');
    }
  };

  const handleCall = () => {
    if (driverDetails?.phone) {
      window.open(`tel:${driverDetails.phone}`);
    }
  };

  const handleCancel = () => {
    if (window.confirm('Are you sure you want to cancel this ride?')) {
      navigate('/bids');
    }
  };

  if (!selectedBid) {
    return (
      <div className="container">
        <h2>No Selection Made</h2>
        <p>Please go back and select a driver.</p>
        <button onClick={() => navigate('/bids')}>Go Back to Bids</button>
      </div>
    );
  }

  return (
    <div className="container dark-theme">
      {/* Enhanced Confirmation Card */}
      <div className="ride-confirmation-card enhanced dark-card">
        {/* Booking Header */}
        <div className="confirmation-header dark-header">
          <div className="booking-status">
            <div className="status-icon">✅</div>
            <div className="status-text">
              <h2>Ride Confirmed!</h2>
              <p>Booking ID: <span className="booking-id">{bookingId}</span></p>
            </div>
          </div>
          {estimatedArrival && (
            <div className="arrival-time">
              <div className="arrival-label">Arriving at</div>
              <div className="arrival-value">{estimatedArrival}</div>
            </div>
          )}
        </div>

        {/* Driver Profile Section */}
        <div className="driver-profile-section">
          <div className="driver-header">
            <h3>Your Driver</h3>
            <div className="driver-status online">• Online</div>
          </div>
          
          <div className="driver-main-info">
            <div className="driver-avatar-large">
              <div className="avatar-circle">{selectedBid.avatar}</div>
              <div className="verification-badge">✓</div>
            </div>
            
            <div className="driver-details">
              <h2 className="driver-name">{selectedBid.driver}</h2>
              
              <div className="driver-stats">
                <div className="stat-item">
                  <span className="stat-icon">⭐</span>
                  <span className="stat-value">{selectedBid.rating}</span>
                  <span className="stat-label">Rating</span>
                </div>
                <div className="stat-item">
                  <span className="stat-icon">🚗</span>
                  <span className="stat-value">{driverDetails?.totalRides || '1000+'}</span>
                  <span className="stat-label">Rides</span>
                </div>
                <div className="stat-item">
                  <span className="stat-icon">📅</span>
                  <span className="stat-value">{selectedBid.experience}</span>
                  <span className="stat-label">Experience</span>
                </div>
              </div>
              
              {driverDetails?.phone && (
                <div className="driver-contact">
                  <span className="contact-icon">📞</span>
                  <span className="contact-number">{driverDetails.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Vehicle Information */}
        <div className="vehicle-info-section">
          <h3>Vehicle Details</h3>
          <div className="vehicle-card">
            <div className="vehicle-icon">
              <span className="car-emoji">🚗</span>
            </div>
            <div className="vehicle-info">
              <h4 className="vehicle-model">{selectedBid.car}</h4>
              <div className="vehicle-meta">
                <span className="vehicle-plate">{driverDetails?.car?.plate || 'DL 01 AB 1234'}</span>
                <span className="vehicle-type">{driverDetails?.car?.type || 'Sedan'}</span>
              </div>
              <div className="vehicle-color-info">
                <span>Color: </span>
                <span className="color-name">{driverDetails?.car?.color || 'White'}</span>
                <div className="color-indicator" style={{ background: getColorCode(driverDetails?.car?.color) }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Trip Details */}
        <div className="trip-details-section">
          <h3>Trip Information</h3>
          <div className="trip-route">
            <div className="route-point pickup">
              <div className="route-icon">📍</div>
              <div className="route-info">
                <div className="route-label">Pickup Location</div>
                <div className="route-address">{pickup.address}</div>
              </div>
            </div>
            
            <div className="route-line">
              <div className="route-dots"></div>
            </div>
            
            <div className="route-point drop">
              <div className="route-icon">🏁</div>
              <div className="route-info">
                <div className="route-label">Drop Location</div>
                <div className="route-address">{drop.address}</div>
              </div>
            </div>
          </div>
          
          <div className="trip-metrics">
            <div className="metric">
              <div className="metric-icon">💰</div>
              <div className="metric-info">
                <div className="metric-value">₹{selectedBid.price}</div>
                <div className="metric-label">Total Fare</div>
              </div>
            </div>
            <div className="metric">
              <div className="metric-icon">📏</div>
              <div className="metric-info">
                <div className="metric-value">{selectedBid.distance} km</div>
                <div className="metric-label">Distance</div>
              </div>
            </div>
            <div className="metric">
              <div className="metric-icon">⏱️</div>
              <div className="metric-info">
                <div className="metric-value">{selectedBid.eta} min</div>
                <div className="metric-label">ETA</div>
              </div>
            </div>
          </div>
        </div>

        {/* OTP Section */}
        <div className="otp-section-enhanced">
          <div className="otp-header">
            <div className="otp-icon">🔐</div>
            <div className="otp-title">Ride OTP</div>
          </div>
          <div className="otp-display-enhanced">
            <div className="otp-digits">{rideOTP}</div>
            <div className="otp-copy-btn" onClick={() => navigator.clipboard.writeText(rideOTP)}>📋</div>
          </div>
          <div className="otp-instructions">
            <p>Share this OTP with your driver when boarding</p>
            <p className="security-note">🛡️ Never share your OTP before boarding the vehicle</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="action-buttons-enhanced">
          <button className="action-btn call-btn" onClick={handleCall}>
            <span className="btn-icon">📞</span>
            <span className="btn-text">Call Driver</span>
          </button>
          <button className="action-btn message-btn">
            <span className="btn-icon">💬</span>
            <span className="btn-text">Message</span>
          </button>
          <button className="action-btn track-btn">
            <span className="btn-icon">📍</span>
            <span className="btn-text">Track Live</span>
          </button>
        </div>

        {/* Main Confirm Button */}
        <button className="confirm-ride-btn" onClick={handleConfirm}>
          <span className="confirm-icon">✅</span>
          <span className="confirm-text">Confirm & Start Ride</span>
        </button>
        
        {/* Cancel Option */}
        <button className="cancel-ride-link" onClick={handleCancel}>
          Cancel Booking
        </button>
      </div>
    </div>
  );

  function getColorCode(color) {
    const colors = {
      'White': '#ffffff',
      'Silver': '#c0c0c0',
      'Blue': '#4169e1',
      'Gray': '#808080',
      'Red': '#dc143c',
      'Black': '#000000'
    };
    return colors[color] || '#ffffff';
  }
}

export default Confirm;
