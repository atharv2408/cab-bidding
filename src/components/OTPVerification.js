import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabaseDB } from '../utils/supabaseService';

// Fix for default markers in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const OTPVerification = ({ activeRide, onRideComplete, onRideStart }) => {
  const [otpInput, setOtpInput] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [showNavigation, setShowNavigation] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completionMessage, setCompletionMessage] = useState('');
  const [earnings, setEarnings] = useState(null);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [autoVerified, setAutoVerified] = useState(false);

  // Get current location and handle auto-verification
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          // Default to Delhi center if location access denied
          setCurrentLocation({
            lat: 28.6139,
            lng: 77.2090
          });
        }
      );
    }

    // Check if this ride was accepted from dashboard and should skip OTP entry
    const acceptedRideInfo = JSON.parse(localStorage.getItem('acceptedRideInfo') || '{}');
    
    if (activeRide && acceptedRideInfo.skipOtpEntry && 
        acceptedRideInfo.rideHistoryId === activeRide.ride_history_id) {
      console.log('🚀 Auto-verifying OTP for dashboard-accepted ride');
      
      // Auto-verify the OTP and start the ride
      handleAutoOTPVerification(acceptedRideInfo);
      
      // Clear the accepted ride info
      localStorage.removeItem('acceptedRideInfo');
    }
  }, [activeRide]);

  const handleAutoOTPVerification = async (acceptedRideInfo) => {
    try {
      console.log('🎆 Starting auto OTP verification for ride:', acceptedRideInfo.rideHistoryId);
      
      setAutoVerified(true);
      
      // Start the ride automatically
      const { data, error } = await supabaseDB.rpc('start_ride', {
        p_ride_history_id: acceptedRideInfo.rideHistoryId,
        p_driver_user_id: activeRide.driver_user_id
      });

      if (error) {
        console.error('Auto start ride error:', error);
        // Fallback to manual OTP entry
        setAutoVerified(false);
        return;
      }

      if (data) {
        setOtpVerified(true);
        if (onRideStart) {
          onRideStart(acceptedRideInfo.rideHistoryId);
        }
        console.log('✅ Auto-verification successful - ride started');
      } else {
        console.warn('Auto start ride returned no data, falling back to manual OTP');
        setAutoVerified(false);
      }
    } catch (error) {
      console.error('Auto OTP verification error:', error);
      setAutoVerified(false);
    }
  };

  const handleOTPVerification = async () => {
    // Validate OTP input
    const cleanedInput = otpInput.replace(/\D/g, ''); // Remove non-digits
    
    if (!cleanedInput || cleanedInput.length !== 6) {
      alert('Please enter a valid 6-digit OTP (numbers only)');
      return;
    }
    
    if (!/^\d{6}$/.test(cleanedInput)) {
      alert('OTP must be exactly 6 digits');
      return;
    }

    setIsVerifying(true);

    try {
      // Verify OTP with the ride - handle different data types and whitespace
      const normalizedInput = String(cleanedInput).trim();
      const normalizedStoredOtp = String(activeRide.otp).trim();
      
      console.log('🔐 OTP Verification Debug (Main Component):');
      console.log(`   Original Input: "${otpInput}" -> Cleaned: "${cleanedInput}"`);
      console.log(`   Normalized Input: "${normalizedInput}" (${typeof normalizedInput})`);
      console.log(`   Stored OTP: "${activeRide.otp}" (${typeof activeRide.otp}) -> normalized: "${normalizedStoredOtp}"`);
      console.log(`   Match result: ${normalizedInput === normalizedStoredOtp}`);
      
      if (normalizedInput === normalizedStoredOtp) {
        // Start the ride
        const { data, error } = await supabaseDB.rpc('start_ride', {
          p_ride_history_id: activeRide.ride_history_id,
          p_driver_user_id: activeRide.driver_user_id
        });

        if (error) {
          throw error;
        }

        if (data) {
          setOtpVerified(true);
          if (onRideStart) {
            onRideStart(activeRide.ride_history_id);
          }
        } else {
          console.error('Failed to start ride - no data returned from start_ride function');
          alert('Failed to start ride. Please try again.');
        }
      } else {
        console.warn('OTP mismatch:', { input: normalizedInput, stored: normalizedStoredOtp });
        alert(`Invalid OTP. Please check with the customer.\n\nEntered: ${normalizedInput}\nExpected format: 6-digit number`);
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      alert('Error verifying OTP. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleCompleteRide = async () => {
    setIsCompleting(true);

    try {
      const { data, error } = await supabaseDB.rpc('complete_ride', {
        p_ride_history_id: activeRide.ride_history_id,
        p_driver_user_id: activeRide.driver_user_id
      });

      if (error) {
        throw error;
      }

      const result = typeof data === 'string' ? JSON.parse(data) : data;

      if (result.success) {
        setEarnings(result);
        setCompletionMessage(result.message);
        
        // Notify parent component
        if (onRideComplete) {
          onRideComplete(result);
        }

        // Auto-close after 5 seconds
        setTimeout(() => {
          setCompletionMessage('');
          setEarnings(null);
          setOtpVerified(false);
          setOtpInput('');
        }, 5000);
      } else {
        alert(result.message || 'Failed to complete ride');
      }
    } catch (error) {
      console.error('Complete ride error:', error);
      alert('Error completing ride. Please try again.');
    } finally {
      setIsCompleting(false);
    }
  };

  const handleNavigateToPickup = () => {
    setShowNavigation(true);
  };

  const openGoogleMapsNavigation = () => {
    const { lat, lng } = activeRide.pickup_location;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    window.open(url, '_blank');
  };

  if (!activeRide) {
    return (
      <div className="otp-verification-container">
        <div className="no-active-ride">
          <h3>🚗 No Active Ride</h3>
          <p>You don't have any active rides at the moment.</p>
        </div>
      </div>
    );
  }

  // Show earnings after completion
  if (earnings && completionMessage) {
    return (
      <div className="otp-verification-container">
        <div className="ride-completion-success">
          <div className="completion-header">
            <span className="completion-icon">🎉</span>
            <h3>Ride Completed!</h3>
          </div>
          
          <div className="earnings-display">
            <div className="earnings-card">
              <h4>💰 Your Earnings</h4>
              <div className="earnings-breakdown">
                <div className="earning-row">
                  <span>Total Amount:</span>
                  <span className="amount">₹{earnings.total_amount}</span>
                </div>
                <div className="earning-row">
                  <span>Platform Fee:</span>
                  <span className="fee">₹{earnings.platform_fee}</span>
                </div>
                <div className="earning-row total">
                  <span>Your Earnings:</span>
                  <span className="earnings">₹{earnings.earnings}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="completion-message">
            <p>{completionMessage}</p>
            <p className="auto-close">This will close automatically in 5 seconds...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="otp-verification-container">
      <div className="active-ride-info">
        <h3>🚗 Active Ride</h3>
        <div className="ride-details">
          <p><strong>From:</strong> {activeRide.pickup_address}</p>
          <p><strong>To:</strong> {activeRide.drop_address}</p>
          <p><strong>Customer:</strong> {activeRide.customer_name}</p>
          <p><strong>Amount:</strong> ₹{activeRide.bid_amount}</p>
        </div>
      </div>

      {!otpVerified && !autoVerified ? (
        // OTP Verification Stage
        <div className="otp-verification-stage">
          <div className="otp-input-section">
            <h4>🔐 Enter Customer OTP</h4>
            <p>Ask the customer for their 6-digit OTP to start the ride</p>
            
            <div className="otp-input-container">
              <input
                type="text"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit OTP"
                className="otp-input"
                maxLength="6"
              />
              <button
                onClick={handleOTPVerification}
                disabled={isVerifying || otpInput.length !== 6}
                className="verify-otp-btn"
              >
                {isVerifying ? (
                  <>
                    <span className="spinner">⟳</span>
                    Verifying...
                  </>
                ) : (
                  <>
                    <span>✓</span>
                    Verify OTP
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Post-OTP Options Stage
        <div className="post-otp-options">
          <div className="verification-success">
            <span className="success-icon">✅</span>
            <h4>{autoVerified ? 'Ride Started Automatically!' : 'OTP Verified Successfully!'}</h4>
            <p>{autoVerified ? 'Your ride is ready. Choose your next action:' : 'Ride has been started. Choose your next action:'}</p>
          </div>

          <div className="ride-action-buttons">
            <button
              onClick={handleNavigateToPickup}
              className="navigate-btn"
            >
              <span className="btn-icon">🧭</span>
              Navigate to Pickup
            </button>

            <button
              onClick={handleCompleteRide}
              disabled={isCompleting}
              className="complete-ride-btn"
            >
              {isCompleting ? (
                <>
                  <span className="spinner">⟳</span>
                  Completing...
                </>
              ) : (
                <>
                  <span className="btn-icon">🏁</span>
                  Complete Ride
                </>
              )}
            </button>
          </div>

          {/* Navigation Modal */}
          {showNavigation && (
            <div className="navigation-modal">
              <div className="navigation-content">
                <div className="navigation-header">
                  <h4>🗺️ Navigation to Pickup</h4>
                  <button
                    onClick={() => setShowNavigation(false)}
                    className="close-modal-btn"
                  >
                    ✕
                  </button>
                </div>

                <div className="navigation-options">
                  <button
                    onClick={openGoogleMapsNavigation}
                    className="google-maps-btn"
                  >
                    <span>📍</span>
                    Open in Google Maps
                  </button>

                  {currentLocation && (
                    <div className="inline-map">
                      <MapContainer
                        center={[activeRide.pickup_location.lat, activeRide.pickup_location.lng]}
                        zoom={13}
                        style={{ height: '300px', width: '100%' }}
                      >
                        <TileLayer
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                        
                        {/* Current location marker */}
                        <Marker position={[currentLocation.lat, currentLocation.lng]}>
                          <Popup>Your Current Location</Popup>
                        </Marker>
                        
                        {/* Pickup location marker */}
                        <Marker position={[activeRide.pickup_location.lat, activeRide.pickup_location.lng]}>
                          <Popup>
                            <div>
                              <strong>Pickup Location</strong><br />
                              {activeRide.pickup_address}
                            </div>
                          </Popup>
                        </Marker>
                      </MapContainer>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .otp-verification-container {
          max-width: 500px;
          margin: 0 auto;
          padding: 20px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .no-active-ride {
          text-align: center;
          padding: 40px 20px;
          background: #f8f9fa;
          border-radius: 12px;
          border: 2px dashed #dee2e6;
        }

        .active-ride-info {
          background: #e3f2fd;
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 20px;
          border-left: 4px solid #2196f3;
        }

        .active-ride-info h3 {
          margin: 0 0 15px 0;
          color: #1565c0;
        }

        .ride-details p {
          margin: 8px 0;
          color: #333;
        }

        .otp-input-section {
          background: white;
          padding: 25px;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          text-align: center;
        }

        .otp-input-section h4 {
          color: #333;
          margin-bottom: 10px;
        }

        .otp-input-section p {
          color: #666;
          margin-bottom: 25px;
        }

        .otp-input-container {
          display: flex;
          flex-direction: column;
          gap: 15px;
          align-items: center;
        }

        .otp-input {
          width: 200px;
          padding: 15px;
          font-size: 24px;
          text-align: center;
          border: 2px solid #ddd;
          border-radius: 8px;
          letter-spacing: 8px;
        }

        .otp-input:focus {
          outline: none;
          border-color: #2196f3;
          box-shadow: 0 0 5px rgba(33, 150, 243, 0.3);
        }

        .verify-otp-btn {
          background: #4caf50;
          color: white;
          border: none;
          padding: 12px 30px;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .verify-otp-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .verify-otp-btn:hover:not(:disabled) {
          background: #45a049;
        }

        .post-otp-options {
          background: white;
          padding: 25px;
          border-radius: 12px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .verification-success {
          text-align: center;
          margin-bottom: 25px;
        }

        .verification-success .success-icon {
          font-size: 48px;
          display: block;
          margin-bottom: 10px;
        }

        .verification-success h4 {
          color: #4caf50;
          margin: 10px 0;
        }

        .ride-action-buttons {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
        }

        .navigate-btn, .complete-ride-btn {
          padding: 15px;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-weight: 500;
        }

        .navigate-btn {
          background: #2196f3;
          color: white;
        }

        .navigate-btn:hover {
          background: #1976d2;
        }

        .complete-ride-btn {
          background: #ff5722;
          color: white;
        }

        .complete-ride-btn:hover:not(:disabled) {
          background: #e64a19;
        }

        .complete-ride-btn:disabled {
          background: #ccc;
          cursor: not-allowed;
        }

        .navigation-modal {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          z-index: 1000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .navigation-content {
          background: white;
          border-radius: 12px;
          max-width: 500px;
          width: 100%;
          max-height: 80vh;
          overflow-y: auto;
        }

        .navigation-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          border-bottom: 1px solid #eee;
        }

        .close-modal-btn {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          padding: 5px;
        }

        .navigation-options {
          padding: 20px;
        }

        .google-maps-btn {
          background: #4285f4;
          color: white;
          border: none;
          padding: 15px;
          border-radius: 8px;
          width: 100%;
          font-size: 16px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          margin-bottom: 20px;
        }

        .google-maps-btn:hover {
          background: #3367d6;
        }

        .inline-map {
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #ddd;
        }

        .ride-completion-success {
          background: white;
          padding: 30px;
          border-radius: 12px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
          text-align: center;
        }

        .completion-header {
          margin-bottom: 25px;
        }

        .completion-icon {
          font-size: 64px;
          display: block;
          margin-bottom: 15px;
        }

        .completion-header h3 {
          color: #4caf50;
          margin: 0;
        }

        .earnings-card {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
        }

        .earnings-card h4 {
          margin-top: 0;
          color: #333;
        }

        .earnings-breakdown {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .earning-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
        }

        .earning-row.total {
          border-top: 2px solid #4caf50;
          font-weight: bold;
          color: #4caf50;
          font-size: 18px;
        }

        .amount, .fee, .earnings {
          font-weight: bold;
        }

        .earnings {
          color: #4caf50;
        }

        .completion-message {
          color: #666;
        }

        .auto-close {
          font-size: 14px;
          color: #999;
          margin-top: 10px;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 600px) {
          .ride-action-buttons {
            grid-template-columns: 1fr;
          }
          
          .otp-verification-container {
            padding: 10px;
          }
        }
      `}</style>
    </div>
  );
};

export default OTPVerification;
