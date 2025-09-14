import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseDB } from '../utils/supabaseService';

const DriverBidNotification = ({ driverData, onRideConfirmed }) => {
  const navigate = useNavigate();
  const [confirmedRide, setConfirmedRide] = useState(null);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  const [startingRide, setStartingRide] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  
  const driver = driverData || JSON.parse(localStorage.getItem('driverData') || '{}');

  // Listen for immediate notifications via localStorage events
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'pendingDriverNotification' && e.newValue) {
        const notification = JSON.parse(e.newValue);
        if (notification.driverId === (driver.id || driver.uid)) {
          console.log('🚨 Instant notification received!', notification);
          const rideData = {
            id: notification.bookingId,
            customer_name: notification.customerName,
            pickup_address: notification.pickup,
            drop_address: notification.drop,
            otp: notification.otp,
            status: 'confirmed',
            selected_driver_id: notification.driverId
          };
          setConfirmedRide(rideData);
          setShowNotification(true);
          // Clear the notification
          localStorage.removeItem('pendingDriverNotification');
        }
      }
    };
    
    // Listen for storage events
    window.addEventListener('storage', handleStorageChange);
    
    // Also check immediately for any pending notifications
    const checkPendingNotification = () => {
      const pendingNotification = localStorage.getItem('pendingDriverNotification');
      if (pendingNotification) {
        const notification = JSON.parse(pendingNotification);
        if (notification.driverId === (driver.id || driver.uid)) {
          console.log('🚨 Found pending notification on load!', notification);
          handleStorageChange({ key: 'pendingDriverNotification', newValue: pendingNotification });
        }
      }
    };
    
    checkPendingNotification();
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [driver.id, driver.uid]);
  
  // Check for bid acceptance with faster polling (backup method)
  useEffect(() => {
    const checkForAcceptedBid = async () => {
      try {
        // Try database first
        try {
          const { data: acceptedRides, error } = await supabaseDB.bookings.getAll();
          
          if (!error && acceptedRides && acceptedRides.length > 0) {
            // Find rides confirmed for this driver
            const myConfirmedRide = acceptedRides.find(ride => 
              (ride.selected_driver_id === driver.id || 
               ride.selected_driver_id === driver.uid ||
               ride.driver_id === driver.id ||
               ride.driver_id === driver.uid) &&
              ride.status === 'confirmed' &&
              !ride.started_at // Not started yet
            );
            
            if (myConfirmedRide && !confirmedRide) {
              console.log('🎉 Customer accepted your bid!', myConfirmedRide);
              setConfirmedRide(myConfirmedRide);
              setShowNotification(true);
              
              // Play notification sound if available
              try {
                new Audio('/notification.mp3').play().catch(() => {});
              } catch (e) {}
              
              return;
            }
          }
        } catch (dbError) {
          console.log('Database check failed, checking localStorage...');
        }
        
        // Fallback: Check localStorage for accepted bookings
        const acceptedBooking = JSON.parse(localStorage.getItem('acceptedBooking') || '{}');
        const confirmedBooking = JSON.parse(localStorage.getItem('confirmedBooking') || '{}');
        
        const bookingToCheck = confirmedBooking.id ? confirmedBooking : acceptedBooking;
        
        if (bookingToCheck.selected_driver_id === (driver.id || driver.uid) && 
            bookingToCheck.status === 'confirmed' && 
            !confirmedRide) {
          
          console.log('🎉 Customer accepted your bid! (localStorage)', bookingToCheck);
          setConfirmedRide(bookingToCheck);
          setShowNotification(true);
          
          // Play notification sound if available
          try {
            new Audio('/notification.mp3').play().catch(() => {});
          } catch (e) {}
        }
        
      } catch (error) {
        console.error('Error checking for accepted bids:', error);
      }
    };

    // Check immediately and then every 1 second for faster response
    checkForAcceptedBid();
    const interval = setInterval(checkForAcceptedBid, 1000);
    
    return () => clearInterval(interval);
  }, [driver.id, driver.uid, confirmedRide]);

  const handleOtpChange = (value) => {
    setOtpInput(value);
    if (otpError) {
      setOtpError('');
    }
  };

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
        alert(`🎉 Ride Started Successfully!\n\nCustomer: ${confirmedRide.customer_name || confirmedRide.customerName}\nDestination: ${confirmedRide.drop_address || confirmedRide.drop}`);
        
        // Clear notification
        setShowNotification(false);
        setConfirmedRide(null);
        setOtpInput('');
        
        // Notify parent component
        if (onRideConfirmed) {
          onRideConfirmed(confirmedRide);
        }
        
        // Navigate to active rides page
        navigate('/driver/active-rides');
      }
      
    } catch (error) {
      console.error('Error starting ride:', error);
      setOtpError('Failed to start ride. Please try again.');
    } finally {
      setStartingRide(false);
    }
  };

  const dismissNotification = () => {
    setShowNotification(false);
    setConfirmedRide(null);
    setOtpInput('');
    setOtpError('');
  };

  if (!showNotification || !confirmedRide) {
    return null;
  }

  return (
    <div className="driver-notification-overlay">
      <div className="driver-notification-modal">
        <div className="notification-header">
          <div className="success-icon">🎉</div>
          <h2>Ride Confirmed!</h2>
          <p>Customer accepted your bid</p>
        </div>

        <div className="ride-details">
          <div className="customer-info">
            <h3>👤 Customer: {confirmedRide.customer_name || confirmedRide.customerName || 'Customer'}</h3>
            {(confirmedRide.customer_phone || confirmedRide.customerPhone) && (
              <p>📞 {confirmedRide.customer_phone || confirmedRide.customerPhone}</p>
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

        <div className="otp-section">
          <h3>🔐 Enter Customer's OTP to Start Ride</h3>
          <p className="otp-instruction">Ask the customer for their 4-digit OTP code</p>
          
          <div className="otp-input-group">
            <input
              type="text"
              placeholder="Enter 4-digit OTP"
              value={otpInput}
              onChange={(e) => handleOtpChange(e.target.value)}
              maxLength={4}
              pattern="[0-9]{4}"
              className={`otp-input ${otpError ? 'error' : ''}`}
              autoFocus
            />
            <button 
              className="start-ride-btn" 
              onClick={startRide}
              disabled={startingRide || !otpInput || otpInput.length !== 4}
            >
              {startingRide ? (
                <>⟳ Starting...</>
              ) : (
                <>🚗 Start Ride</>
              )}
            </button>
          </div>

          {otpError && (
            <div className="otp-error">
              ⚠️ {otpError}
            </div>
          )}
        </div>

        <div className="notification-actions">
          <button className="dismiss-btn" onClick={dismissNotification}>
            ✕ Dismiss
          </button>
        </div>
      </div>
      
      {/* Overlay styles */}
      <style jsx>{`
        .driver-notification-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          animation: fadeIn 0.3s ease-out;
        }

        .driver-notification-modal {
          background: white;
          border-radius: 16px;
          padding: 32px;
          max-width: 500px;
          width: 90%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: slideIn 0.3s ease-out;
        }

        .notification-header {
          text-align: center;
          margin-bottom: 24px;
        }

        .success-icon {
          font-size: 3rem;
          margin-bottom: 8px;
        }

        .notification-header h2 {
          color: #10b981;
          margin: 0 0 8px 0;
          font-size: 1.8rem;
        }

        .notification-header p {
          color: #6b7280;
          margin: 0;
        }

        .ride-details {
          background: #f9fafb;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
        }

        .customer-info h3 {
          color: #1f2937;
          margin: 0 0 8px 0;
        }

        .customer-info p {
          color: #3b82f6;
          margin: 0;
        }

        .route-info {
          margin: 16px 0;
        }

        .route-item {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 8px 0;
        }

        .route-item .icon {
          font-size: 1.2rem;
        }

        .route-item .label {
          font-size: 0.9rem;
          color: #6b7280;
          margin-bottom: 4px;
        }

        .route-item .address {
          font-weight: 500;
          color: #1f2937;
        }

        .route-arrow {
          text-align: center;
          color: #6b7280;
          margin: 4px 0;
          font-size: 1.2rem;
        }

        .fare-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid #e5e7eb;
        }

        .fare-info .label {
          color: #6b7280;
        }

        .fare-info .amount {
          font-size: 1.2rem;
          font-weight: 700;
          color: #10b981;
        }

        .otp-section {
          background: #f0f9ff;
          border: 2px solid #0ea5e9;
          border-radius: 12px;
          padding: 20px;
          margin-bottom: 24px;
        }

        .otp-section h3 {
          color: #0369a1;
          margin: 0 0 8px 0;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .otp-instruction {
          color: #0369a1;
          font-size: 0.9rem;
          margin: 0 0 16px 0;
          font-weight: 500;
        }

        .otp-input-group {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .otp-input {
          flex: 1;
          padding: 12px 16px;
          border: 2px solid #cbd5e1;
          border-radius: 8px;
          font-size: 18px;
          font-weight: 600;
          text-align: center;
          letter-spacing: 4px;
          max-width: 120px;
        }

        .otp-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .otp-input.error {
          border-color: #dc2626;
          background-color: #fef2f2;
        }

        .start-ride-btn {
          background: linear-gradient(135deg, #059669, #047857);
          color: white;
          border: none;
          border-radius: 8px;
          padding: 12px 24px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .start-ride-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(5, 150, 105, 0.3);
        }

        .start-ride-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .otp-error {
          color: #dc2626;
          font-size: 0.85rem;
          margin-top: 8px;
          font-weight: 500;
        }

        .notification-actions {
          text-align: center;
        }

        .dismiss-btn {
          background: #6b7280;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 10px 20px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .dismiss-btn:hover {
          background: #4b5563;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideIn {
          from { 
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to { 
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
};

export default DriverBidNotification;
