import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabaseDB } from '../utils/supabaseService';
import PreciseLocationMap from '../components/PreciseLocationMap';

const DriverDashboard = ({ driverData, setDriverData, ReverseGeocode }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [availableRides, setAvailableRides] = useState([]);
  const [activeRide, setActiveRide] = useState(null);
  const [earnings, setEarnings] = useState({ today: 0, week: 0, month: 0, total: 0 });
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState('');
  const [watchId, setWatchId] = useState(null);

  // Get driver data from localStorage if not passed as prop
  const driver = driverData || JSON.parse(localStorage.getItem('driverData') || '{}');

  useEffect(() => {
    if (!driver.uid && !driver.id) {
      navigate('/driver/login');
      return;
    }

    // Load available ride requests from Supabase
    const loadAvailableRides = async () => {
      try {
        const { data: rides, error } = await supabaseDB.bookings.getByStatus('pending');
        if (!error) {
          setAvailableRides(rides);
        }
      } catch (error) {
        console.error('Error loading rides:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAvailableRides();

    // Set up real-time subscription for bookings
    const subscription = supabaseDB.realtime.subscribeToBookings((payload) => {
      console.log('Booking update:', payload);
      loadAvailableRides(); // Refresh rides when changes occur
    });

    return () => {
      if (subscription) {
        supabaseDB.realtime.unsubscribe(subscription);
      }
    };
  }, [driver.uid, driver.id, navigate]);

  const toggleOnlineStatus = async () => {
    if (!isOnline) {
      // Going online - get current location
      if (!navigator.geolocation) {
        setLocationError('Geolocation is not supported by this browser.');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const coords = [latitude, longitude];
          
          try {
            const address = await ReverseGeocode(latitude, longitude);
            setCurrentLocation({ coords, address });
            
            // Update driver status in database
            await supabaseDB.drivers.update(driver.id || driver.uid, {
              available: true,
              location: {
                lat: latitude,
                lng: longitude,
                address: address,
                lastUpdated: new Date().toISOString()
              }
            });

            setIsOnline(true);
            
            // Start location tracking
            const id = navigator.geolocation.watchPosition(
              (position) => {
                const { latitude, longitude } = position.coords;
                setCurrentLocation({ coords: [latitude, longitude], address });
                
                // Update location in database periodically
                updateDoc(doc(db, 'drivers', driver.uid), {
                  currentLocation: {
                    lat: latitude,
                    lng: longitude,
                    address: address,
                    lastUpdated: serverTimestamp()
                  }
                });
              },
              (error) => {
                console.warn('Location tracking error:', error);
              },
              {
                enableHighAccuracy: true,
                timeout: 30000,
                maximumAge: 60000
              }
            );
            setWatchId(id);
            
          } catch (error) {
            setLocationError('Failed to get your current address.');
          }
        },
        (error) => {
          setLocationError('Unable to get your location. Please enable location services.');
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 60000
        }
      );
    } else {
      // Going offline
      await updateDoc(doc(db, 'drivers', driver.uid), {
        isOnline: false,
        currentLocation: null
      });
      
      setIsOnline(false);
      setCurrentLocation(null);
      
      if (watchId) {
        navigator.geolocation.clearWatch(watchId);
        setWatchId(null);
      }
    }
  };

  const submitBid = async (rideId, bidAmount) => {
    try {
      await addDoc(collection(db, 'bids'), {
        rideId: rideId,
        driverId: driver.uid,
        driverName: driver.name,
        driverRating: driver.rating,
        vehicleType: driver.vehicleType,
        vehicleNumber: driver.vehicleNumber,
        bidAmount: parseFloat(bidAmount),
        status: 'pending',
        createdAt: serverTimestamp(),
        driverLocation: currentLocation
      });

      // Update available rides to show bid submitted
      setAvailableRides(prevRides => 
        prevRides.map(ride => 
          ride.id === rideId 
            ? { ...ride, bidSubmitted: true }
            : ride
        )
      );
    } catch (error) {
      console.error('Error submitting bid:', error);
    }
  };

  const acceptRide = async (rideId) => {
    try {
      await updateDoc(doc(db, 'rideRequests', rideId), {
        status: 'accepted',
        driverId: driver.uid,
        driverName: driver.name,
        acceptedAt: serverTimestamp()
      });
      
      // Set as active ride
      const ride = availableRides.find(r => r.id === rideId);
      setActiveRide(ride);
    } catch (error) {
      console.error('Error accepting ride:', error);
    }
  };

  const calculateDistance = (pickup, current) => {
    if (!pickup || !current) return 0;
    
    const R = 6371; // Earth's radius in kilometers
    const dLat = (pickup[0] - current.coords[0]) * Math.PI / 180;
    const dLng = (pickup[1] - current.coords[1]) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(pickup[0] * Math.PI / 180) * Math.cos(current.coords[0] * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  if (loading) {
    return (
      <div className="driver-dashboard-loading">
        <div className="loading-spinner">⟳</div>
        <p>Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="driver-dashboard">
      {/* Header */}
      <div className="driver-header">
        <div className="driver-info">
          <h2>Welcome, {driver.name}! 🚗</h2>
          <div className="driver-stats">
            <span className="rating">⭐ {driver.rating}</span>
            <span className="rides">🚕 {driver.totalRides} rides</span>
            <span className="vehicle">🚙 {driver.vehicleType}</span>
          </div>
        </div>
        
        <div className="online-toggle">
          <button
            className={`online-btn ${isOnline ? 'online' : 'offline'}`}
            onClick={toggleOnlineStatus}
          >
            <span className="status-dot"></span>
            {isOnline ? 'Go Offline' : 'Go Online'}
          </button>
        </div>
      </div>

      {/* Location Error */}
      {locationError && (
        <div className="location-error">
          <span className="error-icon">⚠️</span>
          <span>{locationError}</span>
        </div>
      )}

      {/* Driver Status */}
      <div className="driver-status-card">
        <div className="status-info">
          <h3>Status: {isOnline ? '🟢 Online' : '🔴 Offline'}</h3>
          {currentLocation && (
            <p>📍 {currentLocation.address}</p>
          )}
          {!isOnline && (
            <p className="offline-message">
              Go online to start receiving ride requests
            </p>
          )}
        </div>
      </div>

      {/* Map - only show when online */}
      {isOnline && (
        <div className="driver-map-container">
          <h3>Your Current Location</h3>
          <PreciseLocationMap
            pickup={{ coords: currentLocation?.coords, address: currentLocation?.address }}
            setPickup={() => {}} // Driver location is read-only
            drop={{ coords: null, address: '' }}
            setDrop={() => {}}
            ReverseGeocode={ReverseGeocode}
            height="300px"
            className="driver-location-map"
          />
        </div>
      )}

      {/* Available Rides */}
      <div className="available-rides-section">
        <h3>
          Available Ride Requests 
          <span className="rides-count">({availableRides.length})</span>
        </h3>
        
        {availableRides.length === 0 ? (
          <div className="no-rides">
            <p>🚕 No ride requests available at the moment</p>
            <p>Stay online to receive new requests</p>
          </div>
        ) : (
          <div className="rides-list">
            {availableRides.map(ride => (
              <RideRequestCard
                key={ride.id}
                ride={ride}
                currentLocation={currentLocation}
                onSubmitBid={submitBid}
                onAcceptRide={acceptRide}
                isOnline={isOnline}
              />
            ))}
          </div>
        )}
      </div>

      {/* Active Ride */}
      {activeRide && (
        <div className="active-ride-section">
          <h3>🚗 Current Ride</h3>
          <div className="active-ride-card">
            <div className="ride-details">
              <p><strong>From:</strong> {activeRide.pickup.address}</p>
              <p><strong>To:</strong> {activeRide.drop.address}</p>
              <p><strong>Customer:</strong> {activeRide.customerName}</p>
              <p><strong>Amount:</strong> ₹{activeRide.finalAmount}</p>
            </div>
            <div className="ride-actions">
              <button className="btn-primary">Start Ride</button>
              <button className="btn-secondary">Contact Customer</button>
            </div>
          </div>
        </div>
      )}

      {/* Earnings Summary */}
      <div className="earnings-summary">
        <h3>💰 Earnings</h3>
        <div className="earnings-grid">
          <div className="earning-card">
            <span className="label">Today</span>
            <span className="amount">₹{earnings.today}</span>
          </div>
          <div className="earning-card">
            <span className="label">This Week</span>
            <span className="amount">₹{earnings.week}</span>
          </div>
          <div className="earning-card">
            <span className="label">This Month</span>
            <span className="amount">₹{earnings.month}</span>
          </div>
          <div className="earning-card">
            <span className="label">Total</span>
            <span className="amount">₹{earnings.total}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Component for individual ride request cards
const RideRequestCard = ({ ride, currentLocation, onSubmitBid, onAcceptRide, isOnline }) => {
  const [bidAmount, setBidAmount] = useState('');
  const [showBidForm, setShowBidForm] = useState(false);

  const distance = currentLocation ? 
    ((pickup, current) => {
      if (!pickup || !current) return 0;
      const R = 6371;
      const dLat = (pickup[0] - current.coords[0]) * Math.PI / 180;
      const dLng = (pickup[1] - current.coords[1]) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(pickup[0] * Math.PI / 180) * Math.cos(current.coords[0] * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    })(ride.pickup.coords, currentLocation) : 0;

  const handleSubmitBid = () => {
    if (bidAmount && parseFloat(bidAmount) > 0) {
      onSubmitBid(ride.id, bidAmount);
      setShowBidForm(false);
      setBidAmount('');
    }
  };

  return (
    <div className="ride-request-card">
      <div className="ride-header">
        <div className="route-info">
          <div className="pickup">
            <span className="icon">📍</span>
            <span className="address">{ride.pickup.address}</span>
          </div>
          <div className="arrow">↓</div>
          <div className="drop">
            <span className="icon">🏁</span>
            <span className="address">{ride.drop.address}</span>
          </div>
        </div>
        
        <div className="ride-meta">
          <span className="distance">{distance.toFixed(1)} km away</span>
          <span className="time">{new Date(ride.createdAt?.toDate()).toLocaleTimeString()}</span>
        </div>
      </div>

      <div className="ride-details">
        <div className="customer-info">
          <span className="customer">👤 {ride.customerName || 'Customer'}</span>
        </div>
        
        {ride.suggestedPrice && (
          <div className="suggested-price">
            <span className="label">Suggested Price:</span>
            <span className="price">₹{ride.suggestedPrice}</span>
          </div>
        )}
      </div>

      {!ride.bidSubmitted && isOnline && (
        <div className="ride-actions">
          {!showBidForm ? (
            <button 
              className="bid-btn"
              onClick={() => setShowBidForm(true)}
            >
              💰 Place Bid
            </button>
          ) : (
            <div className="bid-form">
              <input
                type="number"
                placeholder="Enter bid amount"
                value={bidAmount}
                onChange={(e) => setBidAmount(e.target.value)}
                min="0"
                step="1"
              />
              <button onClick={handleSubmitBid}>Submit Bid</button>
              <button onClick={() => setShowBidForm(false)}>Cancel</button>
            </div>
          )}
          
          {ride.suggestedPrice && (
            <button 
              className="accept-btn"
              onClick={() => onAcceptRide(ride.id)}
            >
              ✅ Accept (₹{ride.suggestedPrice})
            </button>
          )}
        </div>
      )}

      {ride.bidSubmitted && (
        <div className="bid-submitted">
          ✅ Bid submitted - waiting for customer response
        </div>
      )}
    </div>
  );
};

export default DriverDashboard;
