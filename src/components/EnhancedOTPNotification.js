import React, { useState, useEffect, useRef } from 'react';
import { supabaseDB } from '../utils/supabaseService';

const EnhancedOTPNotification = ({ driverData, onRideConfirmed }) => {
  const [confirmedRide, setConfirmedRide] = useState(null);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  const [startingRide, setStartingRide] = useState(false);
  const [notificationState, setNotificationState] = useState('hidden'); // hidden, showing, dismissed
  const [hasShownNotification, setHasShownNotification] = useState(new Set());
  
  // Use ref to track if we've already processed a specific ride
  const processedRides = useRef(new Set());
  const checkInterval = useRef(null);
  
  const driver = driverData || JSON.parse(localStorage.getItem('driverData') || '{}');

  // Enhanced notification check that prevents duplicates and reduces frequency
  useEffect(() => {
    const checkForAcceptedBid = async () => {
      // Don't check if we're already showing a notification or dismissed recently
      if (notificationState !== 'hidden') {
        return;
      }

      try {
        let rideToShow = null;
        
        // Try database first
        try {
          const { data: acceptedRides, error } = await supabaseDB.bookings.getAll();
          
          if (!error && acceptedRides && acceptedRides.length > 0) {
            // Find rides confirmed for this driver that we haven't processed yet
            rideToShow = acceptedRides.find(ride => 
              (ride.selected_driver_id === driver.id || 
               ride.selected_driver_id === driver.uid ||
               ride.driver_id === driver.id ||
               ride.driver_id === driver.uid) &&
              ride.status === 'confirmed' &&
              !ride.started_at && // Not started yet
              !processedRides.current.has(ride.id) && // Not already processed
              !hasShownNotification.has(ride.id) // Not already shown
            );
          }
        } catch (dbError) {
          console.log('Database check failed, trying localStorage...');
        }
        
        // Only check localStorage if database didn't find anything
        if (!rideToShow) {
          const acceptedBooking = JSON.parse(localStorage.getItem('acceptedBooking') || '{}');
          const confirmedBooking = JSON.parse(localStorage.getItem('confirmedBooking') || '{}');
          
          const bookingToCheck = confirmedBooking.id ? confirmedBooking : acceptedBooking;
          
          if (bookingToCheck.id && 
              bookingToCheck.selected_driver_id === (driver.id || driver.uid) && 
              bookingToCheck.status === 'confirmed' && 
              !processedRides.current.has(bookingToCheck.id) &&
              !hasShownNotification.has(bookingToCheck.id)) {
            rideToShow = bookingToCheck;
          }
        }
        
        // Only show notification if we found a new ride
        if (rideToShow) {
          console.log('🎉 New ride confirmation detected:', rideToShow.id);
          
          // Mark this ride as processed and shown permanently
          processedRides.current.add(rideToShow.id);
          setHasShownNotification(prev => new Set(prev).add(rideToShow.id));
          
          // Store in localStorage to persist across page reloads
          const shownRides = JSON.parse(localStorage.getItem('shownNotificationRides') || '[]');
          if (!shownRides.includes(rideToShow.id)) {
            shownRides.push(rideToShow.id);
            localStorage.setItem('shownNotificationRides', JSON.stringify(shownRides.slice(-50))); // Keep last 50
          }
          
          setConfirmedRide(rideToShow);
          setNotificationState('showing');
          
          // Play notification sound
          try {
            const audio = new Audio('/notification.mp3');
            audio.play().catch(() => console.log('Could not play notification sound'));
          } catch (e) {
            console.log('Notification sound not available');
          }
        }
        
      } catch (error) {
        console.error('Error checking for accepted bids:', error);
      }
    };

    // Load previously shown notifications to prevent re-showing
    const loadShownNotifications = () => {
      const shownRides = JSON.parse(localStorage.getItem('shownNotificationRides') || '[]');
      shownRides.forEach(rideId => {
        processedRides.current.add(rideId);
        setHasShownNotification(prev => new Set(prev).add(rideId));
      });
    };

    // Load shown notifications on mount
    loadShownNotifications();

    // Only start checking if we don't have an active notification
    if (notificationState === 'hidden') {
      // Initial check
      setTimeout(checkForAcceptedBid, 1000); // Delay initial check to avoid race conditions
      
      // Set up interval with reduced frequency
      checkInterval.current = setInterval(checkForAcceptedBid, 15000); // Check every 15 seconds
    }

    return () => {
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
        checkInterval.current = null;
      }
    };
  }, [driver.id, driver.uid, notificationState]);

  // Handle OTP input changes
  const handleOtpChange = (value) => {
    // Only allow numeric input, max 4 digits
    const numericValue = value.replace(/\D/g, '').slice(0, 4);
    setOtpInput(numericValue);
    
    if (otpError) {
      setOtpError('');
    }
  };

  // Start the ride after OTP verification
  const startRide = async () => {
    if (!otpInput) {
      setOtpError('Please enter the customer\'s OTP');
      return;
    }
    
    if (otpInput.length !== 4) {
      setOtpError('OTP must be exactly 4 digits');
      return;
    }
    
    if (otpInput !== confirmedRide.otp) {
      setOtpError('Invalid OTP. Please ask the customer for the correct 4-digit code.');
      return;
    }
    
    setStartingRide(true);
    
    try {
      // Update ride status to in_progress
      let rideStarted = false;
      
      try {
        await supabaseDB.bookings.update(confirmedRide.id, {
          status: 'in_progress',
          started_at: new Date().toISOString()
        });
        rideStarted = true;
        console.log('✅ Ride started in database');
      } catch (dbError) {
        // Fallback: Update localStorage
        const startedRide = {
          ...confirmedRide,
          status: 'in_progress',
          started_at: new Date().toISOString()
        };
        
        localStorage.setItem('activeRide', JSON.stringify(startedRide));
        localStorage.setItem(`ride_${confirmedRide.id}`, JSON.stringify(startedRide));
        
        // Remove from confirmed bookings
        localStorage.removeItem('confirmedBooking');
        localStorage.removeItem('acceptedBooking');
        
        rideStarted = true;
        console.log('✅ Ride started in fallback mode');
      }
      
      if (rideStarted) {
        // Show success message
        const successMessage = `🎉 Ride Started Successfully!\n\nCustomer: ${confirmedRide.customer_name || confirmedRide.customerName}\nDestination: ${confirmedRide.drop_address || confirmedRide.drop}`;
        
        // Clear notification state
        setNotificationState('dismissed');
        setConfirmedRide(null);
        setOtpInput('');
        setOtpError('');
        
        // Notify parent component
        if (onRideConfirmed) {
          onRideConfirmed(confirmedRide);
        }
        
        // Show success alert and navigate
        alert(successMessage);
        
        // Use window.location to navigate (more reliable than navigate hook)
        window.location.href = '/driver/active-rides';
      }
      
    } catch (error) {
      console.error('Error starting ride:', error);
      setOtpError('Failed to start ride. Please try again.');
    } finally {
      setStartingRide(false);
    }
  };

  // Dismiss notification permanently
  const dismissNotification = () => {
    setNotificationState('dismissed');
    
    // Mark this ride as permanently dismissed
    if (confirmedRide) {
      processedRides.current.add(confirmedRide.id);
      setHasShownNotification(prev => new Set(prev).add(confirmedRide.id));
      
      // Store dismissal in localStorage to persist across page reloads
      const shownRides = JSON.parse(localStorage.getItem('shownNotificationRides') || '[]');
      if (!shownRides.includes(confirmedRide.id)) {
        shownRides.push(confirmedRide.id);
        localStorage.setItem('shownNotificationRides', JSON.stringify(shownRides.slice(-50)));
      }
      
      // Also remove from active booking data to prevent re-showing
      localStorage.removeItem('acceptedBooking');
      localStorage.removeItem('confirmedBooking');
      localStorage.removeItem(`booking_${confirmedRide.id}`);
    }
    
    setConfirmedRide(null);
    setOtpInput('');
    setOtpError('');
    
    // Reset to hidden state after a short delay
    setTimeout(() => {
      setNotificationState('hidden');
    }, 1000);
  };

  // Don't render if notification should be hidden
  if (notificationState !== 'showing' || !confirmedRide) {
    return null;
  }

  return (
    <div className="enhanced-notification-overlay">
      <div className="enhanced-notification-modal">
        {/* Header */}
        <div className="notification-header">
          <div className="success-icon">🎉</div>
          <h2>Ride Confirmed!</h2>
          <p>Customer accepted your bid</p>
          <div className="ride-id">Ride ID: {confirmedRide.id?.slice(-8) || 'N/A'}</div>
        </div>

        {/* Ride Details */}
        <div className="ride-details">
          <div className="customer-info">
            <h3>👤 {confirmedRide.customer_name || confirmedRide.customerName || 'Customer'}</h3>
            {(confirmedRide.customer_phone || confirmedRide.customerPhone) && (
              <a href={`tel:${confirmedRide.customer_phone || confirmedRide.customerPhone}`} className="phone-link">
                📞 {confirmedRide.customer_phone || confirmedRide.customerPhone}
              </a>
            )}
          </div>

          <div className="route-info">
            <div className="route-item">
              <span className="icon">📍</span>
              <div>
                <div className="label">Pickup</div>
                <div className="address">{confirmedRide.pickup_address || confirmedRide.pickup || 'Pickup Location'}</div>
              </div>
            </div>
            <div className="route-arrow">↓</div>
            <div className="route-item">
              <span className="icon">🏁</span>
              <div>
                <div className="label">Drop</div>
                <div className="address">{confirmedRide.drop_address || confirmedRide.drop || 'Drop Location'}</div>
              </div>
            </div>
          </div>

          <div className="fare-info">
            <span className="label">Fare:</span>
            <span className="amount">₹{confirmedRide.final_fare || confirmedRide.price || confirmedRide.estimated_fare}</span>
          </div>
        </div>

        {/* OTP Section */}
        <div className="otp-section">
          <h3>🔐 Enter Customer's OTP</h3>
          <p className="otp-instruction">Ask the customer for their 4-digit OTP code to start the ride</p>
          
          <div className="otp-input-container">
            <input
              type="text"
              placeholder="0000"
              value={otpInput}
              onChange={(e) => handleOtpChange(e.target.value)}
              maxLength={4}
              className={`otp-input ${otpError ? 'error' : ''}`}
              autoFocus
              inputMode="numeric"
              pattern="[0-9]*"
            />
          </div>

          {otpError && (
            <div className="otp-error">
              ⚠️ {otpError}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="notification-actions">
          <button 
            className="start-ride-btn" 
            onClick={startRide}
            disabled={startingRide || otpInput.length !== 4}
          >
            {startingRide ? (
              <>⟳ Starting Ride...</>
            ) : (
              <>🚗 Start Ride</>
            )}
          </button>
          
          <button 
            className="dismiss-btn" 
            onClick={dismissNotification}
            disabled={startingRide}
          >
            ✕ Dismiss
          </button>
        </div>
      </div>
      
      {/* Enhanced Styles */}
      <style jsx>{`
        .enhanced-notification-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          animation: fadeIn 0.3s ease-out;
          backdrop-filter: blur(4px);
        }

        .enhanced-notification-modal {
          background: white;
          border-radius: 20px;
          padding: 32px;
          max-width: 480px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 25px 80px rgba(0, 0, 0, 0.4);
          animation: slideIn 0.3s ease-out;
          border: 2px solid #10b981;
        }

        .notification-header {
          text-align: center;
          margin-bottom: 28px;
        }

        .success-icon {
          font-size: 4rem;
          margin-bottom: 12px;
          animation: bounce 0.6s ease-out;
        }

        .notification-header h2 {
          color: #10b981;
          margin: 0 0 8px 0;
          font-size: 2rem;
          font-weight: 700;
        }

        .notification-header p {
          color: #6b7280;
          margin: 0 0 8px 0;
          font-size: 1.1rem;
        }

        .ride-id {
          font-size: 0.9rem;
          color: #9ca3af;
          font-family: monospace;
          background: #f9fafb;
          padding: 4px 12px;
          border-radius: 20px;
          display: inline-block;
        }

        .ride-details {
          background: linear-gradient(135deg, #f9fafb, #f3f4f6);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 28px;
          border: 1px solid #e5e7eb;
        }

        .customer-info h3 {
          color: #1f2937;
          margin: 0 0 8px 0;
          font-size: 1.3rem;
        }

        .phone-link {
          color: #3b82f6;
          text-decoration: none;
          font-weight: 500;
          padding: 4px 8px;
          border-radius: 8px;
          background: #eff6ff;
          display: inline-block;
          transition: all 0.2s ease;
        }

        .phone-link:hover {
          background: #dbeafe;
          transform: translateY(-1px);
        }

        .route-info {
          margin: 20px 0;
        }

        .route-item {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          margin: 12px 0;
        }

        .route-item .icon {
          font-size: 1.4rem;
          margin-top: 4px;
        }

        .route-item .label {
          font-size: 0.9rem;
          color: #6b7280;
          margin-bottom: 6px;
          font-weight: 500;
        }

        .route-item .address {
          font-weight: 600;
          color: #1f2937;
          line-height: 1.3;
        }

        .route-arrow {
          text-align: center;
          color: #10b981;
          margin: 8px 0;
          font-size: 1.4rem;
          font-weight: bold;
        }

        .fare-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 20px;
          padding-top: 20px;
          border-top: 2px solid #e5e7eb;
        }

        .fare-info .label {
          color: #6b7280;
          font-weight: 500;
          font-size: 1.1rem;
        }

        .fare-info .amount {
          font-size: 1.8rem;
          font-weight: 800;
          color: #10b981;
        }

        .otp-section {
          background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
          border: 3px solid #0ea5e9;
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 28px;
          text-align: center;
        }

        .otp-section h3 {
          color: #0369a1;
          margin: 0 0 8px 0;
          font-size: 1.4rem;
          font-weight: 700;
        }

        .otp-instruction {
          color: #0369a1;
          font-size: 1rem;
          margin: 0 0 20px 0;
          font-weight: 500;
        }

        .otp-input-container {
          margin-bottom: 16px;
        }

        .otp-input {
          width: 200px;
          padding: 16px 20px;
          border: 3px solid #cbd5e1;
          border-radius: 12px;
          font-size: 2rem;
          font-weight: 700;
          text-align: center;
          letter-spacing: 8px;
          background: white;
          transition: all 0.2s ease;
        }

        .otp-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
          transform: scale(1.02);
        }

        .otp-input.error {
          border-color: #dc2626;
          background-color: #fef2f2;
        }

        .otp-error {
          color: #dc2626;
          font-size: 0.9rem;
          margin-top: 8px;
          font-weight: 600;
          background: #fef2f2;
          padding: 8px 12px;
          border-radius: 8px;
        }

        .notification-actions {
          display: flex;
          gap: 16px;
          justify-content: center;
        }

        .start-ride-btn {
          background: linear-gradient(135deg, #10b981, #059669);
          color: white;
          border: none;
          border-radius: 12px;
          padding: 16px 32px;
          font-weight: 700;
          font-size: 1.1rem;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.3);
        }

        .start-ride-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
        }

        .start-ride-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .dismiss-btn {
          background: #6b7280;
          color: white;
          border: none;
          border-radius: 12px;
          padding: 16px 24px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .dismiss-btn:hover:not(:disabled) {
          background: #4b5563;
          transform: translateY(-1px);
        }

        .dismiss-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideIn {
          from { 
            opacity: 0;
            transform: translateY(-30px) scale(0.9);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes bounce {
          0%, 20%, 53%, 80%, 100% {
            transform: translateY(0);
          }
          40%, 43% {
            transform: translateY(-10px);
          }
          70% {
            transform: translateY(-5px);
          }
          90% {
            transform: translateY(-2px);
          }
        }
      `}</style>
    </div>
  );
};

export default EnhancedOTPNotification;
