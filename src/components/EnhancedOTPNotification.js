import React, { useState, useEffect, useRef } from 'react';
import { supabaseDB } from '../utils/supabaseService';
import urgentNotificationManager from '../utils/urgentNotificationManager';

const EnhancedOTPNotification = ({ driverData, onRideConfirmed }) => {
  const [confirmedRide, setConfirmedRide] = useState(null);
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  const [startingRide, setStartingRide] = useState(false);
  const [notificationState, setNotificationState] = useState('hidden'); // hidden, showing, dismissed
  const [hasShownNotification, setHasShownNotification] = useState(new Set());
  const [urgentCountdown, setUrgentCountdown] = useState(null);
  const [isUrgent, setIsUrgent] = useState(false);
  
  // Use ref to track if we've already processed a specific ride
  const processedRides = useRef(new Set());
  const checkInterval = useRef(null);
  const componentMounted = useRef(true);
  
  const driver = driverData || JSON.parse(localStorage.getItem('driverData') || '{}');

  // Enhanced notification check that prevents duplicates and reduces frequency
  useEffect(() => {
    const checkForAcceptedBid = async () => {
      // Don't check if we're already showing a notification, dismissed recently, or have already processed rides
      if (notificationState !== 'hidden') {
        return;
      }
      
      // If we've already shown any notification in this session, don't check again
      if (hasShownNotification.size > 0) {
        console.log('🔒 OTP notification already shown this session, skipping checks');
        return;
      }

      try {
        let rideToShow = null;
        let urgentNotification = null;
        
        // Check for urgent notifications first
        const activeUrgentNotifications = urgentNotificationManager.getActiveNotifications();
        const driverUrgentNotification = activeUrgentNotifications.find(notification => 
          notification.rideData && 
          (notification.rideData.driverId === driver.id || notification.rideData.driverId === driver.uid)
        );
        
        if (driverUrgentNotification) {
          console.log('🚨 URGENT: Processing urgent notification for driver', driver.id);
          rideToShow = driverUrgentNotification.rideData;
          urgentNotification = driverUrgentNotification;
          setIsUrgent(true);
        }
        
        // Fallback: Try database first
        if (!rideToShow) {
          try {
            const { data: acceptedRides, error } = await supabaseDB.bookings.getAll();
            
            if (!error && acceptedRides && acceptedRides.length > 0) {
              // Find rides confirmed for this driver that we haven't processed yet
              // IMPORTANT: Only show rides that are 'confirmed' and NOT started, completed, or cancelled
              rideToShow = acceptedRides.find(ride => 
                (ride.selected_driver_id === driver.id || 
                 ride.selected_driver_id === driver.uid ||
                 ride.driver_id === driver.id ||
                 ride.driver_id === driver.uid) &&
                ride.status === 'confirmed' &&
                !ride.started_at && // Not started yet
                !ride.completed_at && // Not completed
                ride.status !== 'completed' && // Not marked as completed
                ride.status !== 'cancelled' && // Not cancelled
                !processedRides.current.has(ride.id) && // Not already processed
                !hasShownNotification.has(ride.id) // Not already shown
              );
            }
          } catch (dbError) {
            console.log('Database check failed, trying localStorage...');
          }
        }
        
        // Only check localStorage if database didn't find anything
        if (!rideToShow) {
          const acceptedBooking = JSON.parse(localStorage.getItem('acceptedBooking') || '{}');
          const confirmedBooking = JSON.parse(localStorage.getItem('confirmedBooking') || '{}');
          
          const bookingToCheck = confirmedBooking.id ? confirmedBooking : acceptedBooking;
          
          // Enhanced localStorage check - ensure ride is still active and not completed
          if (bookingToCheck.id && 
              bookingToCheck.selected_driver_id === (driver.id || driver.uid) && 
              bookingToCheck.status === 'confirmed' &&
              !bookingToCheck.started_at && // Not started
              !bookingToCheck.completed_at && // Not completed
              bookingToCheck.status !== 'completed' && // Not completed status
              bookingToCheck.status !== 'in_progress' && // Not in progress
              !processedRides.current.has(bookingToCheck.id) &&
              !hasShownNotification.has(bookingToCheck.id)) {
            
            // Additional check: verify this ride isn't already completed in localStorage
            const completedRide = localStorage.getItem(`completed_${bookingToCheck.id}`);
            const activeRide = localStorage.getItem('activeRide');
            const activeRideData = activeRide ? JSON.parse(activeRide) : null;
            
            // Don't show if ride is completed or already active
            if (!completedRide && (!activeRideData || activeRideData.id !== bookingToCheck.id)) {
              rideToShow = bookingToCheck;
            } else {
              console.log('🔒 Ride already completed or active, not showing OTP notification');
              // Mark as processed to prevent future checks
              processedRides.current.add(bookingToCheck.id);
              setHasShownNotification(prev => new Set(prev).add(bookingToCheck.id));
            }
          }
        }
        
        // Only show notification if we found a new ride
        if (rideToShow) {
          console.log('🎉 New ride confirmation detected:', rideToShow.id, isUrgent ? '(URGENT)' : '');
          
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
          
          // Set up urgent countdown if this is an urgent notification
          if (urgentNotification && urgentNotification.remainingSeconds) {
            setUrgentCountdown(urgentNotification.remainingSeconds);
            
            // Set up countdown updater
            const countdownInterval = setInterval(() => {
              const currentNotification = urgentNotificationManager.getNotification(urgentNotification.id);
              if (currentNotification && currentNotification.remainingSeconds > 0) {
                setUrgentCountdown(currentNotification.remainingSeconds);
              } else {
                clearInterval(countdownInterval);
                setUrgentCountdown(0);
              }
            }, 1000);
            
            // Cleanup interval when notification is dismissed
            setTimeout(() => clearInterval(countdownInterval), urgentNotification.remainingTime);
          }
          
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
      
      // Also check for completed rides and mark them as processed
      const completedRides = JSON.parse(localStorage.getItem('customerRideHistory') || '[]');
      completedRides.forEach(ride => {
        if (ride.status === 'completed' && (ride.selected_driver_id === driver.id || ride.selected_driver_id === driver.uid)) {
          processedRides.current.add(ride.id);
          setHasShownNotification(prev => new Set(prev).add(ride.id));
          console.log('🔒 Completed ride found, preventing OTP notification:', ride.id);
        }
      });
      
      // Check for active rides and mark them as processed
      const activeRide = localStorage.getItem('activeRide');
      if (activeRide) {
        const activeRideData = JSON.parse(activeRide);
        if (activeRideData.selected_driver_id === driver.id || activeRideData.selected_driver_id === driver.uid) {
          processedRides.current.add(activeRideData.id);
          setHasShownNotification(prev => new Set(prev).add(activeRideData.id));
          console.log('🔒 Active ride found, preventing OTP notification:', activeRideData.id);
        }
      }
    };

    // Load shown notifications on mount
    loadShownNotifications();

    // Only start checking if we don't have an active notification and haven't shown any yet
    if (notificationState === 'hidden' && hasShownNotification.size === 0) {
      // Initial check
      setTimeout(checkForAcceptedBid, 500); // Reduced delay for faster response
      
      // Set up interval with increased frequency for urgent notifications
      checkInterval.current = setInterval(checkForAcceptedBid, 2000); // Check every 2 seconds (reduced from 3)
    }

    // Listen for urgent notification events
    const handleUrgentNotification = (event) => {
      const urgentNotification = event.detail;
      if (urgentNotification.rideData.driverId === (driver.id || driver.uid)) {
        console.log('🚨 URGENT: Received urgent notification event', urgentNotification.id);
        checkForAcceptedBid(); // Immediately check for the urgent notification
      }
    };
    
    window.addEventListener('urgentNotification', handleUrgentNotification);

    return () => {
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
        checkInterval.current = null;
      }
      window.removeEventListener('urgentNotification', handleUrgentNotification);
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
    
    // Enhanced OTP debugging
    console.log('🔐 OTP Verification Debug:');
    console.log('   Driver Input OTP:', otpInput, '(type:', typeof otpInput, ')');
    console.log('   Stored Ride OTP:', confirmedRide.otp, '(type:', typeof confirmedRide.otp, ')');
    console.log('   Ride Data:', {
      id: confirmedRide.id,
      otp: confirmedRide.otp,
      customerName: confirmedRide.customer_name || confirmedRide.customerName
    });
    
    // Normalize both values for comparison
    const normalizedInput = String(otpInput).trim();
    const normalizedStored = String(confirmedRide.otp).trim();
    
    console.log('   Normalized Input:', normalizedInput);
    console.log('   Normalized Stored:', normalizedStored);
    console.log('   Match Result:', normalizedInput === normalizedStored);
    
    // Check multiple OTP sources
    const otpSources = {
      confirmedRide: confirmedRide.otp,
      currentRideOTP: localStorage.getItem('currentRideOTP'),
      rideOTP: localStorage.getItem('rideOTP'),
      driverOTP: localStorage.getItem(`driver_otp_${confirmedRide.selected_driver_id || confirmedRide.driver_id}`),
      latestRideOTP: JSON.parse(localStorage.getItem('latestRideOTP') || '{}').otp
    };
    
    console.log('   Available OTP Sources:', otpSources);
    
    // Try to find a matching OTP from any source
    let isValidOTP = false;
    let matchedSource = null;
    
    for (const [source, storedOTP] of Object.entries(otpSources)) {
      if (storedOTP && String(storedOTP).trim() === normalizedInput) {
        isValidOTP = true;
        matchedSource = source;
        break;
      }
    }
    
    if (!isValidOTP) {
      console.log('❌ OTP Verification Failed - No matching OTP found');
      setOtpError('Invalid OTP. Please ask the customer for the correct 4-digit code.');
      return;
    }
    
    console.log('✅ OTP Verified successfully from source:', matchedSource);
    
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
        
        // Clear all related notification data to prevent re-showing
        localStorage.removeItem(`notification_${driver.id}`);
        localStorage.removeItem(`notification_${driver.uid}`);
        localStorage.removeItem(`urgent_${driver.id}`);
        localStorage.removeItem(`urgent_${driver.uid}`);
        localStorage.removeItem('pendingDriverNotification');
        
        // Mark the ride as processed permanently
        processedRides.current.add(confirmedRide.id);
        setHasShownNotification(prev => new Set(prev).add(confirmedRide.id));
        
        // Store in permanent shown list to prevent future notifications
        const shownRides = JSON.parse(localStorage.getItem('shownNotificationRides') || '[]');
        if (!shownRides.includes(confirmedRide.id)) {
          shownRides.push(confirmedRide.id);
          localStorage.setItem('shownNotificationRides', JSON.stringify(shownRides.slice(-50)));
        }
        
        rideStarted = true;
        console.log('✅ Ride started in fallback mode');
      }
      
      if (rideStarted) {
        // Mark urgent notification as responded if it exists
        const activeUrgentNotifications = urgentNotificationManager.getActiveNotifications();
        const respondedNotification = activeUrgentNotifications.find(notification => 
          notification.rideData && 
          notification.rideData.id === confirmedRide.id
        );
        
        if (respondedNotification) {
          urgentNotificationManager.markAsResponded(respondedNotification.id);
          console.log('✅ URGENT: Marked notification as responded', respondedNotification.id);
        }
        
        // Show success message
        const successMessage = `🎉 Ride Started Successfully!\n\nCustomer: ${confirmedRide.customer_name || confirmedRide.customerName}\nDestination: ${confirmedRide.drop_address || confirmedRide.drop}`;
        
        // Clear notification state
        setNotificationState('dismissed');
        setConfirmedRide(null);
        setOtpInput('');
        setOtpError('');
        setUrgentCountdown(null);
        setIsUrgent(false);
        
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
      
      // Stop the notification checking interval to prevent further popups
      if (checkInterval.current) {
        clearInterval(checkInterval.current);
        checkInterval.current = null;
        console.log('🔒 OTP notification dismissed - stopping further checks');
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
    }, 300); // Reduced from 1000ms for faster response
  };

  // Don't render if notification should be hidden
  if (notificationState !== 'showing' || !confirmedRide) {
    return null;
  }

  return (
    <div className="enhanced-notification-overlay dark-theme">
      <div className="enhanced-notification-modal dark-modal">
        {/* Header */}
        <div className={`notification-header ${isUrgent ? 'urgent' : ''} dark-header`}>
          <div className="success-icon">{isUrgent ? '🚨' : '🎉'}</div>
          <h2>{isUrgent ? 'URGENT RIDE!' : 'Ride Confirmed!'}</h2>
          <p>{isUrgent ? 'Customer needs immediate pickup' : 'Customer accepted your bid'}</p>
          {urgentCountdown !== null && urgentCountdown > 0 && (
            <div className="urgent-countdown">
              ⏰ Respond in {urgentCountdown}s
            </div>
          )}
          <div className="ride-id">Ride ID: {confirmedRide.id?.slice(-8) || 'N/A'}</div>
        </div>

        {/* Ride Details */}
        <div className="ride-details dark-details">
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
        <div className="otp-section dark-otp">
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
      
      {/* Enhanced Styles are now in App.css for proper dark theme support */}
    </div>
  );
};

export default EnhancedOTPNotification;
