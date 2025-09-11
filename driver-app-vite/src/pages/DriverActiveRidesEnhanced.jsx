import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabaseDB } from '../utils/supabaseService';
import OTPVerification from '../components/OTPVerification';

const DriverActiveRidesEnhanced = ({ driverData }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeRide, setActiveRide] = useState(null);
  const [error, setError] = useState('');
  const subscriptionRef = useRef(null);
  
  // Get driver data from localStorage if not passed as prop
  const driver = driverData || JSON.parse(localStorage.getItem('driverData') || '{}');

  useEffect(() => {
    if (!driver.uid && !driver.id) {
      navigate('/driver/login');
      return;
    }

    loadActiveRide();
    setupRealtimeSubscription();
    
    return () => {
      if (subscriptionRef.current) {
        supabaseDB.realtime.unsubscribe(subscriptionRef.current);
      }
    };
  }, [driver.uid, driver.id, navigate]);

  const loadActiveRide = async () => {
    try {
      setLoading(true);
      
      // Try to get active ride from enhanced system first
      const { data: activeRideData, error: activeRideError } = await supabaseDB.activeRides.getByDriverUserId(driver.uid);
      
      if (!activeRideError && activeRideData) {
        console.log('✅ Found active ride from enhanced system:', activeRideData);
        
        // Ensure we only have one ride record
        const rideData = Array.isArray(activeRideData) ? activeRideData[0] : activeRideData;
        
        // Transform the data to match expected format
        const rideHistoryData = rideData.ride_history;
        const bookingData = rideData.booking;
        
        const transformedRide = {
          ride_history_id: rideData.ride_history_id,
          driver_user_id: rideData.driver_user_id,
          booking_id: rideData.booking_id,
          current_status: rideData.current_status,
          otp_verified: rideData.otp_verified,
          
          // From ride_history
          otp: rideHistoryData?.otp,
          pickup_location: rideHistoryData?.pickup_location,
          drop_location: rideHistoryData?.drop_location,
          pickup_address: rideHistoryData?.pickup_address,
          drop_address: rideHistoryData?.drop_address,
          bid_amount: rideHistoryData?.bid_amount,
          status: rideHistoryData?.status,
          
          // From booking
          customer_name: bookingData?.customer_name,
          customer_phone: bookingData?.customer_phone,
          distance: bookingData?.distance,
          
          created_at: rideData.created_at,
          updated_at: rideData.updated_at
        };
        
        // Check if this ride was just accepted from dashboard
        const acceptedRideInfo = JSON.parse(localStorage.getItem('acceptedRideInfo') || '{}');
        if (acceptedRideInfo.rideHistoryId === transformedRide.ride_history_id) {
          // Mark as should be auto-verified
          transformedRide.shouldAutoVerify = true;
        }
        
        setActiveRide(transformedRide);
      } else {
        console.log('ℹ️ No active ride found in enhanced system');
        
        // Fallback: Check legacy system
        await loadLegacyActiveRide();
      }
    } catch (error) {
      console.error('Error loading active ride:', error);
      setError('Failed to load active ride');
      
      // Try fallback
      await loadLegacyActiveRide();
    } finally {
      setLoading(false);
    }
  };

  const loadLegacyActiveRide = async () => {
    try {
      // Try database rides
      const { data: dbRides, error } = await supabaseDB.bookings.getAll();
      
      if (!error && dbRides && dbRides.length > 0) {
        const driverRides = dbRides.filter(ride => 
          (ride.selected_driver_id === (driver.id || driver.uid) || 
           ride.driver_id === (driver.id || driver.uid)) &&
          (ride.status === 'confirmed' || ride.status === 'in_progress')
        );
        
        if (driverRides.length > 0) {
          console.log('✅ Found legacy database rides:', driverRides.length);
          // Use first ride and transform to new format
          const legacyRide = driverRides[0];
          
          const transformedRide = {
            // Legacy compatibility
            id: legacyRide.id,
            ride_history_id: null, // Will be null for legacy rides
            driver_user_id: driver.uid,
            booking_id: legacyRide.id,
            current_status: legacyRide.status === 'in_progress' ? 'started' : 'assigned',
            otp_verified: legacyRide.status === 'in_progress',
            
            // Ride details
            otp: legacyRide.otp || '1234',
            pickup_location: legacyRide.pickup_location || { lat: 28.6139, lng: 77.2090 },
            drop_location: legacyRide.drop_location || { lat: 28.6219, lng: 77.2085 },
            pickup_address: legacyRide.pickup_address || 'Pickup Location',
            drop_address: legacyRide.drop_address || 'Drop Location',
            bid_amount: legacyRide.final_fare || legacyRide.estimated_fare || 100,
            status: legacyRide.status,
            
            customer_name: legacyRide.customer_name || 'Customer',
            customer_phone: legacyRide.customer_phone,
            distance: legacyRide.distance,
            
            created_at: legacyRide.created_at,
            updated_at: legacyRide.updated_at
          };
          
          setActiveRide(transformedRide);
          return;
        }
      }
      
      // Fallback to localStorage
      const confirmedBooking = JSON.parse(localStorage.getItem('confirmedBooking') || '{}');
      const acceptedBooking = JSON.parse(localStorage.getItem('acceptedBooking') || '{}');
      
      let fallbackRide = null;
      
      if (confirmedBooking.selected_driver_id === (driver.id || driver.uid)) {
        fallbackRide = {
          id: confirmedBooking.id,
          ride_history_id: null,
          driver_user_id: driver.uid,
          booking_id: confirmedBooking.id,
          current_status: 'assigned',
          otp_verified: false,
          
          otp: confirmedBooking.otp || '1234',
          pickup_location: { lat: 28.6139, lng: 77.2090 },
          drop_location: { lat: 28.6219, lng: 77.2085 },
          pickup_address: confirmedBooking.pickup,
          drop_address: confirmedBooking.drop,
          bid_amount: confirmedBooking.price,
          status: 'assigned',
          
          customer_name: confirmedBooking.customerName,
          customer_phone: confirmedBooking.customerPhone,
          distance: confirmedBooking.distance,
          
          created_at: confirmedBooking.created_at || new Date().toISOString()
        };
      } else if (acceptedBooking.selected_driver_id === (driver.id || driver.uid)) {
        fallbackRide = {
          id: acceptedBooking.id,
          ride_history_id: null,
          driver_user_id: driver.uid,
          booking_id: acceptedBooking.id,
          current_status: 'assigned',
          otp_verified: false,
          
          otp: acceptedBooking.otp || '1234',
          pickup_location: { lat: 28.6139, lng: 77.2090 },
          drop_location: { lat: 28.6219, lng: 77.2085 },
          pickup_address: acceptedBooking.pickup_address,
          drop_address: acceptedBooking.drop_address,
          bid_amount: acceptedBooking.final_fare,
          status: 'assigned',
          
          customer_name: acceptedBooking.customer_name,
          customer_phone: acceptedBooking.customer_phone,
          distance: acceptedBooking.distance,
          
          created_at: acceptedBooking.created_at || new Date().toISOString()
        };
      }
      
      if (fallbackRide) {
        console.log('✅ Found fallback active ride');
        setActiveRide(fallbackRide);
      }
      
    } catch (error) {
      console.error('Legacy active ride load error:', error);
    }
  };

  const setupRealtimeSubscription = () => {
    try {
      // Subscribe to active rides changes
      subscriptionRef.current = supabaseDB.realtime.subscribeToActiveRides((payload) => {
        console.log('🔄 Active ride change:', payload);
        
        if (payload.eventType === 'DELETE' && payload.old?.driver_user_id === driver.uid) {
          // Ride was completed or cancelled
          setActiveRide(null);
        } else if (payload.eventType === 'UPDATE' && payload.new?.driver_user_id === driver.uid) {
          // Ride was updated, reload
          loadActiveRide();
        }
      });
    } catch (error) {
      console.error('Failed to setup realtime subscription:', error);
    }
  };

  const handleRideStart = async (rideHistoryId) => {
    console.log('🚗 Ride started:', rideHistoryId);
    
    // Update local state
    setActiveRide(prev => prev ? {
      ...prev,
      current_status: 'started',
      otp_verified: true,
      status: 'started'
    } : null);
  };

  const handleRideComplete = async (result) => {
    console.log('✅ Ride completed:', result);
    
    if (result.success) {
      // Clear active ride
      setActiveRide(null);
      
      // Show success notification (already handled by OTPVerification component)
      console.log(`💰 Earnings: ₹${result.earnings}`);
      
      // Optional: Navigate back to dashboard after a delay
      setTimeout(() => {
        navigate('/driver/dashboard');
      }, 3000);
    }
  };

  if (loading) {
    return (
      <div className="driver-dashboard-loading">
        <div className="loading-spinner">⟳</div>
        <p>Loading active rides...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="driver-error">
        <h3>⚠️ Error</h3>
        <p>{error}</p>
        <button onClick={loadActiveRide} className="retry-btn">
          🔄 Retry
        </button>
      </div>
    );
  }

  return (
    <div className="driver-active-rides-enhanced">
      <div className="driver-header">
        <div className="driver-info">
          <h2>Active Rides 🚗</h2>
          <div className="driver-stats">
            <span className="rating">⭐ {driver.rating || 5.0}</span>
            <span className="rides">🚕 {activeRide ? 1 : 0} active</span>
            <span className="vehicle">🚙 {driver.vehicleType}</span>
          </div>
        </div>
        <button 
          onClick={() => navigate('/driver/dashboard')}
          className="back-btn"
        >
          ← Dashboard
        </button>
      </div>

      <div className="active-ride-section">
        <OTPVerification
          activeRide={activeRide}
          onRideStart={handleRideStart}
          onRideComplete={handleRideComplete}
        />
      </div>

      {/* Navigation */}
      <div className="navigation-actions">
        <button 
          onClick={() => navigate('/driver/dashboard')}
          className="nav-btn"
        >
          🏠 Dashboard
        </button>
        <button 
          onClick={() => navigate('/driver/history')}
          className="nav-btn"
        >
          📋 History
        </button>
        <button 
          onClick={() => navigate('/driver/earnings')}
          className="nav-btn"
        >
          💰 Earnings
        </button>
      </div>

      <style jsx>{`
        .driver-active-rides-enhanced {
          min-height: 100vh;
          background: #f5f5f5;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .driver-header {
          background: white;
          padding: 20px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.1);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .driver-info h2 {
          margin: 0 0 10px 0;
          color: #333;
        }

        .driver-stats {
          display: flex;
          gap: 15px;
          font-size: 14px;
        }

        .driver-stats span {
          padding: 4px 8px;
          background: #f0f0f0;
          border-radius: 4px;
        }

        .back-btn, .nav-btn {
          background: #2196f3;
          color: white;
          border: none;
          padding: 10px 15px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 14px;
        }

        .back-btn:hover, .nav-btn:hover {
          background: #1976d2;
        }

        .active-ride-section {
          padding: 20px;
        }

        .navigation-actions {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: white;
          padding: 15px 20px;
          box-shadow: 0 -2px 10px rgba(0,0,0,0.1);
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
        }

        .driver-dashboard-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: #f5f5f5;
        }

        .loading-spinner {
          font-size: 48px;
          animation: spin 1s linear infinite;
        }

        .driver-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: #f5f5f5;
          text-align: center;
          padding: 20px;
        }

        .retry-btn {
          background: #ff5722;
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 16px;
          margin-top: 15px;
        }

        .retry-btn:hover {
          background: #e64a19;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @media (max-width: 768px) {
          .driver-header {
            flex-direction: column;
            gap: 15px;
            text-align: center;
          }

          .navigation-actions {
            position: relative;
            margin-top: 20px;
          }
        }
      `}</style>
    </div>
  );
};

export default DriverActiveRidesEnhanced;
