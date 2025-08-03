import React, { useEffect, useState } from 'react';
import './App.css';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, useMapEvents, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTranslation } from 'react-i18next';
import './i18n';
import Login from './components/Login';

// Check if user is authenticated
const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  return token !== null;
};

// Get user data from localStorage
const getUserData = () => {
  const userData = localStorage.getItem('user');
  return userData ? JSON.parse(userData) : null;
};

// Logout function
const logout = () => {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  window.location.reload();
};

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const ReverseGeocode = async (lat, lon) => {
  try {
    const res = await axios.get('https://nominatim.openstreetmap.org/reverse', {
      params: { format: 'jsonv2', lat, lon },
    });
    return res.data.display_name || `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
  } catch {
    return `${lat.toFixed(3)}, ${lon.toFixed(3)}`;
  }
};

const AutoLocationMarker = ({ pickupSet, dropSet, setPickup, setDrop }) => {
  useMapEvents({
    click: async (e) => {
      const { lat, lng } = e.latlng;
      const address = await ReverseGeocode(lat, lng);
      if (!pickupSet) {
        setPickup({ coords: [lat, lng], address });
      } else if (!dropSet) {
        setDrop({ coords: [lat, lng], address });
      }
    },
  });
  return null;
};

// Calculate haversine distance in km
const calculateDistance = (coord1, coord2) => {
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return (R * c).toFixed(2);
};

function App() {
  const { t, i18n } = useTranslation();
  
  // Authentication state
  const [user, setUser] = useState(getUserData());
  const [authLoading, setAuthLoading] = useState(false);
  
  // Menubar state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeMenuItem, setActiveMenuItem] = useState('home');
  
  // App state
  const [pickup, setPickup] = useState({ coords: null, address: '' });
  const [drop, setDrop] = useState({ coords: null, address: '' });

  const [bids, setBids] = useState([]);
  const [selectedBid, setSelectedBid] = useState(null);
  const [biddingActive, setBiddingActive] = useState(false);
  const [selectionTime, setSelectionTime] = useState(false);
  const [timer, setTimer] = useState(60);
  const [selectionTimer, setSelectionTimer] = useState(15);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [suggestedPrice, setSuggestedPrice] = useState('');
  const [useSuggestedPrice, setUseSuggestedPrice] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  const [rideOTP, setRideOTP] = useState('');
  const [showRideDetails, setShowRideDetails] = useState(false);
  const lastBidRef = React.useRef(null);
  
  // Handle login
  const handleLogin = (userData) => {
    setUser(userData);
    setAuthLoading(false);
  };
  
  // Handle logout
  const handleLogout = () => {
    logout();
    setUser(null);
  };
  
  // Toggle mobile menu
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  // Handle menu item click
  const handleMenuClick = (item) => {
    setActiveMenuItem(item);
    setIsMenuOpen(false); // Close mobile menu after selection
  };
  
  // Check authentication on component mount
  useEffect(() => {
    if (!isAuthenticated()) {
      setUser(null);
    }
  }, []);
  // Scroll to last bid when bids change
  useEffect(() => {
    if (lastBidRef.current) {
      lastBidRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [bids]);

  useEffect(() => {
    document.body.className = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    let bidTimer;
    if (biddingActive && timer > 0) {
      bidTimer = setInterval(() => setTimer((prev) => prev - 1), 1000);
    } else if (timer === 0 && biddingActive) {
      setBiddingActive(false);
      setSelectionTime(true);
    }
    return () => clearInterval(bidTimer);
  }, [biddingActive, timer]);

  useEffect(() => {
    let selectTimer;
    if (selectionTime && selectionTimer > 0) {
      selectTimer = setInterval(() => setSelectionTimer((prev) => prev - 1), 1000);
    } else if (selectionTimer === 0 && selectionTime && !selectedBid) {
      autoSelectLowestBid();
    }
    return () => clearInterval(selectTimer);
  }, [selectionTime, selectionTimer, selectedBid]);

  const autoSelectLowestBid = () => {
    const lowest = bids.reduce((prev, curr) => (prev.amount < curr.amount ? prev : curr));
    const otp = generateOTP();
    const numberPlate = generateNumberPlate(pickup.address);
    const carModel = carModels[Math.floor(Math.random() * carModels.length)];
    
    const enhancedBid = {
      ...lowest,
      numberPlate,
      carModel,
      otp,
      phoneNumber: `+91${Math.floor(Math.random() * 9000000000 + 1000000000)}` // Generate Indian phone number
    };
    
    setSelectedBid(enhancedBid);
    setRideOTP(otp);
    setSelectionTime(false);
    setShowRideDetails(true);
    
    // Stop bidding process immediately
    setBiddingActive(false);
    setTimer(0);
    setSelectionTimer(0);
    
    alert(`Auto-selected driver: ${lowest.driverName} for ₹${lowest.amount}`);
  };

  // Generate location-based number plate
  const generateNumberPlate = (location) => {
    // Extract state/region from location for number plate prefix
    const locationLower = location.toLowerCase();
    let prefix = 'MH07'; // Default to Maharashtra Sindhudurg
    
    if (locationLower.includes('maharashtra') || locationLower.includes('sindhudurg') || locationLower.includes('mumbai')) {
      prefix = 'MH07';
    } else if (locationLower.includes('karnataka') || locationLower.includes('bangalore')) {
      prefix = 'KA03';
    } else if (locationLower.includes('tamil nadu') || locationLower.includes('chennai')) {
      prefix = 'TN01';
    } else if (locationLower.includes('delhi')) {
      prefix = 'DL01';
    } else if (locationLower.includes('gujarat') || locationLower.includes('ahmedabad')) {
      prefix = 'GJ01';
    } else if (locationLower.includes('rajasthan') || locationLower.includes('jaipur')) {
      prefix = 'RJ14';
    }
    
    // Generate random 4-digit number
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    return `${prefix} ${randomNum}`;
  };
  
  // Generate random OTP
  const generateOTP = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
  };
  
  // Car models for Indian market
  const carModels = [
    'Maruti Suzuki Swift', 'Hyundai i20', 'Tata Nexon', 'Mahindra XUV300',
    'Honda City', 'Maruti Suzuki Dzire', 'Hyundai Creta', 'Kia Seltos',
    'Toyota Innova', 'Maruti Suzuki Ertiga', 'Hyundai Verna', 'Tata Harrier'
  ];

  const handleSelect = (bid) => {
    const otp = generateOTP();
    const numberPlate = generateNumberPlate(pickup.address);
    const carModel = carModels[Math.floor(Math.random() * carModels.length)];
    
    const enhancedBid = {
      ...bid,
      numberPlate,
      carModel,
      otp,
      phoneNumber: `+91${Math.floor(Math.random() * 9000000000 + 1000000000)}` // Generate Indian phone number
    };
    
    setSelectedBid(enhancedBid);
    setRideOTP(otp);
    setSelectionTime(false);
    setShowRideDetails(true);
    
    // Stop bidding process immediately
    setBiddingActive(false);
    setTimer(0);
    setSelectionTimer(0);
  };

  useEffect(() => {
    if (!biddingActive || !pickup.coords || !drop.coords) return;
    const distance = calculateDistance(pickup.coords, drop.coords);
    const bidInterval = setInterval(() => {
      let fare;
      if (useSuggestedPrice && suggestedPrice && !isNaN(Number(suggestedPrice))) {
        // Drivers may bid around the suggested price, +/- up to 20%
        const min = Number(suggestedPrice) * 0.8;
        const max = Number(suggestedPrice) * 1.2;
        fare = (Math.random() * (max - min) + min).toFixed(0);
      } else {
        fare = (parseFloat(distance) * (10 + Math.random() * 5)).toFixed(0);
      }
      // Professional driver names for Indian context
      const driverNames = [
        'Rajesh Kumar', 'Amit Singh', 'Suresh Sharma', 'Vikram Gupta', 'Ravi Patel',
        'Ajay Verma', 'Sanjay Yadav', 'Deepak Jain', 'Manish Agarwal', 'Ashok Mehta',
        'Pradeep Singh', 'Ramesh Chandra', 'Dinesh Kumar', 'Mukesh Soni', 'Naveen Saxena'
      ];
      
      // Simple professional driver avatars - using initials-based avatars
      const driverName = driverNames[Math.floor(Math.random() * driverNames.length)];
      const driverIndex = Math.floor(Math.random() * 50) + 1; // More variety
      
      const newBid = {
        driverName: driverName,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(driverName)}&background=random&color=fff&size=150&bold=true&format=png`,
        amount: fare,
        rating: (Math.random() * 2 + 3).toFixed(1),
        distance: `${distance} km`,
        eta: `${Math.floor(Math.random() * 15) + 5} mins`,
      };
      setBids((prev) => [...prev, newBid]);
    }, 5000);
    return () => clearInterval(bidInterval);
  }, [biddingActive, pickup, drop, suggestedPrice, useSuggestedPrice]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const geocodeAddress = async (address, setLocation) => {
    try {
      const res = await axios.get(`https://nominatim.openstreetmap.org/search`, {
        params: { q: address, format: 'json', limit: 1 },
      });
      if (res.data[0]) {
        const { lat, lon } = res.data[0];
        setLocation({ address, coords: [parseFloat(lat), parseFloat(lon)] });
      }
    } catch (err) {
      console.warn('Geocoding failed:', err);
    }
  };

  // Auto-detect user's current location
  const detectCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by this browser.');
      return;
    }

    setLocationLoading(true);
    setLocationError('');

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000 // Cache location for 1 minute
    };

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const address = await ReverseGeocode(latitude, longitude);
          
          setPickup({ 
            coords: [latitude, longitude], 
            address: address
          });
          
          setLocationLoading(false);
          setLocationError('');
        } catch (error) {
          console.error('Error getting location address:', error);
          setLocationError('Failed to get address for current location.');
          setLocationLoading(false);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        let errorMessage = 'Failed to get your location. ';
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Please allow location access in your browser.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out.';
            break;
          default:
            errorMessage += 'An unknown error occurred.';
            break;
        }
        
        setLocationError(errorMessage);
        setLocationLoading(false);
      },
      options
    );
  };

  // Handle calling the driver
  const handleCallDriver = () => {
    if (selectedBid && selectedBid.phoneNumber) {
      // In a real app, this would integrate with phone calling functionality
      const confirmed = window.confirm(
        `Call ${selectedBid.driverName}?\n\nPhone: ${selectedBid.phoneNumber}\n\nThis will open your phone's dialer.`
      );
      
      if (confirmed) {
        // Try to initiate a phone call (works on mobile devices)
        window.location.href = `tel:${selectedBid.phoneNumber}`;
      }
    } else {
      alert('Driver contact information not available.');
    }
  };
  
  // Handle tracking the cab
  const handleTrackCab = () => {
    if (selectedBid) {
      // Simulate opening tracking interface
      const confirmed = window.confirm(
        `Track ${selectedBid.driverName}'s location?\n\nVehicle: ${selectedBid.carModel}\nPlate: ${selectedBid.numberPlate}\nETA: ${selectedBid.eta}\n\nThis will open the live tracking view.`
      );
      
      if (confirmed) {
        // In a real app, this would open a map view with live tracking
        // For demo purposes, we'll show a tracking simulation
        showTrackingSimulation();
      }
    } else {
      alert('No active ride to track.');
    }
  };
  
  // Simulate tracking interface
  const showTrackingSimulation = () => {
    alert(
      `🚗 Live Tracking Active\n\n` +
      `Driver: ${selectedBid.driverName}\n` +
      `Vehicle: ${selectedBid.carModel} (${selectedBid.numberPlate})\n` +
      `Current Status: En route to pickup\n` +
      `ETA: ${selectedBid.eta}\n\n` +
      `📍 Driver is 2.3 km away from your location\n` +
      `⏱️ Estimated arrival: ${selectedBid.eta}\n\n` +
      `You will receive SMS updates with driver's location.`
    );
  };

  const startBidding = () => {
    if (!pickup.address || !drop.address) {
      alert('Please set both pickup and drop locations before starting bidding.');
      return;
    }
    setBids([]);
    setSelectedBid(null);
    setShowRideDetails(false);
    setTimer(60);
    setSelectionTimer(15);
    setBiddingActive(true);
    setSelectionTime(false);
  };

  // If user is not authenticated, show login page
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="App">
      <nav className="app-menubar">
        <div className="menubar-container">
          <div className="menubar-brand">
            <span className="brand-text">BidCab</span>
          </div>
          
          {/* Hamburger Menu Button for Mobile */}
          <button 
            className={`hamburger ${isMenuOpen ? 'active' : ''}`}
            onClick={toggleMenu}
            aria-label="Toggle navigation menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
          
          {/* Desktop Navigation */}
          <ul className={`menubar-nav ${isMenuOpen ? 'mobile-open' : ''}`}>
            <li>
              <a 
                href="#home" 
                className={activeMenuItem === 'home' ? 'active' : ''}
                onClick={() => handleMenuClick('home')}
              >
                🏠 Home
              </a>
            </li>
            <li>
              <a 
                href="#profile" 
                className={activeMenuItem === 'profile' ? 'active' : ''}
                onClick={() => handleMenuClick('profile')}
              >
                👤 Profile
              </a>
            </li>
            <li>
              <a 
                href="#rides" 
                className={activeMenuItem === 'rides' ? 'active' : ''}
                onClick={() => handleMenuClick('rides')}
              >
                🚗 My Rides
              </a>
            </li>
            <li>
              <a 
                href="#bids" 
                className={activeMenuItem === 'bids' ? 'active' : ''}
                onClick={() => handleMenuClick('bids')}
              >
                💰 Bids
              </a>
            </li>
            <li>
              <button 
                className="menubar-logout" 
                onClick={handleLogout}
                title="Logout"
              >
                🚪 Logout
              </button>
            </li>
          </ul>
        </div>
      </nav>
      {/* REMOVED: app-header */}
      <div className="app-title-section">
        <h2>BidCab India</h2>
        <p className="app-tagline">Your Ride, Your Price</p>
      </div>

      <div>
        <div className="pickup-input-container">
          <label>Pickup Location</label>
          <div className="pickup-input-row">
            <input
              value={pickup.address}
              onChange={(e) => setPickup({ ...pickup, address: e.target.value })}
              onBlur={() => geocodeAddress(pickup.address, setPickup)}
              placeholder="Type address or click on map"
            />
            <button 
              onClick={detectCurrentLocation}
              disabled={locationLoading}
              className="detect-location-btn"
              title="Detect My Location"
              tabIndex={-1}
            >
              {locationLoading ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="location-icon loading">
                  <defs>
                    <linearGradient id="locationGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#4285F4"/>
                      <stop offset="100%" stopColor="#34A853"/>
                    </linearGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                      <feMerge>
                        <feMergeNode in="coloredBlur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>
                  <circle cx="12" cy="12" r="10" fill="url(#locationGradient)" opacity="0.1" filter="url(#glow)">
                    <animate attributeName="r" values="8;12;8" dur="2s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite"/>
                  </circle>
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="url(#locationGradient)"/>
                  <circle cx="12" cy="9" r="2.5" fill="white"/>
                  <circle cx="12" cy="9" r="1" fill="url(#locationGradient)">
                    <animate attributeName="opacity" values="0.5;1;0.5" dur="1.5s" repeatCount="indefinite"/>
                  </circle>
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="location-icon">
                  <defs>
                    <linearGradient id="locationGradientStatic" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#4285F4"/>
                      <stop offset="100%" stopColor="#34A853"/>
                    </linearGradient>
                    <filter id="shadow">
                      <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.3"/>
                    </filter>
                  </defs>
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" fill="url(#locationGradientStatic)" filter="url(#shadow)"/>
                  <circle cx="12" cy="9" r="2.5" fill="white"/>
                  <circle cx="12" cy="9" r="1" fill="url(#locationGradientStatic)"/>
                  <circle cx="12" cy="9" r="0.5" fill="white" opacity="0.8"/>
                </svg>
              )}
            </button>
          </div>
        </div>
        {locationLoading && (
          <div className="location-feedback loading">
            🔄 Detecting your location...
          </div>
        )}
        {locationError && (
          <div className="location-feedback error">
            ❌ {locationError}
          </div>
        )}
      </div>
      <div>
        <div className="drop-input-container">
          <label>Drop Location</label>
          <input
            value={drop.address}
            onChange={(e) => setDrop({ ...drop, address: e.target.value })}
            onBlur={() => geocodeAddress(drop.address, setDrop)}
            placeholder="Type address or click on map"
          />
        </div>
      </div>
      <div style={{ margin: '10px 0' }}>
        <label>
          <input
            type="checkbox"
            checked={useSuggestedPrice}
            onChange={e => setUseSuggestedPrice(e.target.checked)}
            style={{ marginRight: 6 }}
          />
          Suggest a Price
        </label>
        {useSuggestedPrice && (
          <input
            type="number"
            min="0"
            value={suggestedPrice}
            onChange={e => setSuggestedPrice(e.target.value)}
            placeholder="Enter suggested price in ₹"
            style={{ width: 120, marginLeft: 10, marginRight: 10, padding: '6px 10px', borderRadius: 6, border: '1px solid #ccc', fontSize: 16 }}
            inputMode="numeric"
            step="1"
            autoFocus
          />
        )}
      </div>

      <MapContainer center={[28.61, 77.23]} zoom={12} style={{ height: '400px', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        {pickup.coords && <Marker position={pickup.coords} />}
        {drop.coords && <Marker position={drop.coords} />}
        {pickup.coords && drop.coords && (
          <Polyline positions={[pickup.coords, drop.coords]} color="blue" />
        )}
        <AutoLocationMarker
          pickupSet={!!pickup.coords}
          dropSet={!!drop.coords}
          setPickup={setPickup}
          setDrop={setDrop}
        />
      </MapContainer>

      <div className="start-bidding-section">
        <button onClick={startBidding} className="start-bidding-btn">
          <span className="btn-icon">🚕</span>
          <span className="btn-text">Find My Ride</span>
          <span className="btn-subtitle">Get competitive offers</span>
        </button>
      </div>

      {pickup.address && drop.address && (
        <div className="route-summary">
          <div className="route-item">
            <span className="route-icon pickup">📍</span>
            <div className="route-details">
              <span className="route-label">Pickup</span>
              <span className="route-address">{pickup.address}</span>
            </div>
          </div>
          <div className="route-connector">···</div>
          <div className="route-item">
            <span className="route-icon dropoff">🎯</span>
            <div className="route-details">
              <span className="route-label">Drop-off</span>
              <span className="route-address">{drop.address}</span>
            </div>
          </div>
          {pickup.coords && drop.coords && (
            <div className="route-distance">
              <span className="distance-badge">
                📏 {calculateDistance(pickup.coords, drop.coords)} km
              </span>
            </div>
          )}
        </div>
      )}

      {biddingActive && (
        <div className="bidding-status">
          <div className="timer-card">
            <div className="timer-icon">⏳</div>
            <div className="timer-info">
              <span className="timer-label">Bidding Time Left</span>
              <span className="timer-value">{timer} seconds</span>
            </div>
            <div className="timer-progress">
              <div 
                className="timer-progress-bar" 
                style={{width: `${(timer/60)*100}%`}}
              ></div>
            </div>
          </div>
        </div>
      )}
      
      {selectionTime && !selectedBid && (
        <div className="selection-status">
          <div className="selection-card">
            <div className="selection-icon">🕒</div>
            <div className="selection-info">
              <span className="selection-title">Choose Your Driver</span>
              <span className="selection-subtitle">
                Auto-selection in {selectionTimer} seconds
              </span>
            </div>
            <div className="selection-progress">
              <div 
                className="selection-progress-bar" 
                style={{width: `${(selectionTimer/15)*100}%`}}
              ></div>
            </div>
          </div>
        </div>
      )}

      {selectedBid && showRideDetails && (
        <div className="ride-confirmation-card">
          <div className="confirmation-header">
            <div className="success-icon">✅</div>
            <h2>Ride Confirmed!</h2>
            <p className="confirmation-subtitle">Your cab is on the way</p>
          </div>
          
          <div className="driver-section">
            <div className="driver-avatar-container">
              <img src={selectedBid.avatar} alt="Driver" className="driver-avatar" />
              <div className="online-indicator"></div>
            </div>
            <div className="driver-info">
              <h3 className="driver-name">{selectedBid.driverName}</h3>
              <div className="driver-rating">
                <span className="rating-stars">{'⭐'.repeat(Math.floor(selectedBid.rating))}</span>
                <span className="rating-value">{selectedBid.rating}</span>
                <span className="rating-reviews">({Math.floor(Math.random() * 500 + 50)} reviews)</span>
              </div>
              <div className="driver-experience">
                <span className="experience-badge">{Math.floor(Math.random() * 8 + 2)} years experience</span>
              </div>
            </div>
          </div>
          
          <div className="vehicle-section">
            <div className="vehicle-info">
              <div className="car-icon">🚗</div>
              <div className="vehicle-details">
                <h4 className="car-model">{selectedBid.carModel}</h4>
                <p className="number-plate">{selectedBid.numberPlate}</p>
                <div className="vehicle-color">
                  <span className="color-dot" style={{backgroundColor: ['#000', '#fff', '#silver', '#red', '#blue'][Math.floor(Math.random() * 5)]}}></span>
                  <span>{['Black', 'White', 'Silver', 'Red', 'Blue'][Math.floor(Math.random() * 5)]}</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="ride-details-section">
            <div className="detail-item">
              <div className="detail-icon">💰</div>
              <div className="detail-content">
                <span className="detail-label">Fare</span>
                <span className="detail-value">₹{selectedBid.amount}</span>
              </div>
            </div>
            
            <div className="detail-item">
              <div className="detail-icon">📍</div>
              <div className="detail-content">
                <span className="detail-label">Distance</span>
                <span className="detail-value">{selectedBid.distance}</span>
              </div>
            </div>
            
            <div className="detail-item">
              <div className="detail-icon">⏰</div>
              <div className="detail-content">
                <span className="detail-label">ETA</span>
                <span className="detail-value">{selectedBid.eta}</span>
              </div>
            </div>
          </div>
          
          <div className="otp-section">
            <div className="otp-container">
              <h4>🔒 Your Ride OTP</h4>
              <div className="otp-display">
                <span className="otp-number">{selectedBid.otp}</span>
              </div>
              <p className="otp-instruction">Share this OTP with your driver to start the ride</p>
            </div>
          </div>
          
          <div className="action-buttons">
            <button className="call-driver-btn" onClick={handleCallDriver}>
              📞 Call Driver
            </button>
            <button className="track-cab-btn" onClick={handleTrackCab}>
              📍 Track Cab
            </button>
            <button className="cancel-ride-btn" onClick={() => {
              if (window.confirm('Are you sure you want to cancel this ride?')) {
                setSelectedBid(null);
                setShowRideDetails(false);
                setRideOTP('');
                setBids([]);
                setBiddingActive(false);
              }
            }}>
              ❌ Cancel Ride
            </button>
          </div>
        </div>
      )}

      {bids.length > 0 && (
        <div className="bids-section">
          <div className="bids-header">
            <h3>💰 Available Offers ({bids.length})</h3>
            <div className="bids-subtitle">Choose the best offer for your ride</div>
          </div>
          <div className="bids-container">
            {bids.map((bid, index) => (
              <div
                key={index}
                ref={index === bids.length - 1 ? lastBidRef : null}
                className={`bid-card ${selectedBid && selectedBid.driverName === bid.driverName ? 'selected' : ''}`}
              >
                <div className="bid-driver-info">
                  <img src={bid.avatar} alt="Driver" className="bid-avatar" />
                  <div className="bid-details">
                    <div className="bid-driver-name">{bid.driverName}</div>
                    <div className="bid-rating">
                      <span className="stars">⭐</span>
                      <span>{bid.rating}</span>
                    </div>
                  </div>
                </div>
                
                <div className="bid-info-grid">
                  <div className="bid-info-item">
                    <span className="bid-info-icon">💰</span>
                    <span className="bid-info-value">₹{bid.amount}</span>
                  </div>
                  <div className="bid-info-item">
                    <span className="bid-info-icon">📍</span>
                    <span className="bid-info-value">{bid.distance}</span>
                  </div>
                  <div className="bid-info-item">
                    <span className="bid-info-icon">⏰</span>
                    <span className="bid-info-value">{bid.eta}</span>
                  </div>
                </div>
                
                <div className="bid-actions">
                  {!selectedBid && (
                    <button onClick={() => handleSelect(bid)} className="accept-bid-btn">
                      ✅ Accept Offer
                    </button>
                  )}
                  {selectedBid && selectedBid.driverName === bid.driverName && (
                    <div className="bid-accepted">
                      <span className="accepted-icon">✅</span>
                      <span className="accepted-text">Accepted</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
