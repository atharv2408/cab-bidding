import React, { useEffect, useState } from 'react';
import './App.css';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, useMapEvents, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTranslation } from 'react-i18next';
import './i18n';
import { BrowserRouter as Router, Route, Routes, Link, useNavigate, useLocation } from 'react-router-dom';
import io from 'socket.io-client';

// Components
import Login from './components/Login';
import Home from './pages/Home';
import AvailableRides from './pages/AvailableRides';
import ActiveRides from './pages/ActiveRides';
import Earnings from './pages/Earnings';
import Profile from './pages/Profile';
import History from './pages/History';

// Check if driver is authenticated
const isAuthenticated = () => {
  const token = localStorage.getItem('driverToken');
  return token !== null;
};

// Get driver data from localStorage
const getDriverData = () => {
  const driverData = localStorage.getItem('driver');
  return driverData ? JSON.parse(driverData) : null;
};

// Logout function
const logout = () => {
  localStorage.removeItem('driverToken');
  localStorage.removeItem('driver');
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

// Navigation Bar Component
const NavigationBar = ({ driver, handleLogout, isMenuOpen, toggleMenu, theme, setTheme }) => {
  const location = useLocation().pathname;
  const navigate = useNavigate();
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  
  const toggleMenuAndClose = () => {
    toggleMenu();
  };
  
  const handleMenuClick = () => {
    if (isMenuOpen) {
      toggleMenu(); // Close mobile menu after selection
    }
  };
  
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };
  
  const toggleAccountMenu = () => {
    setIsAccountMenuOpen(!isAccountMenuOpen);
  };
  
  const handleAccountMenuClick = () => {
    setIsAccountMenuOpen(false);
  };
  
  const handleLogoClick = () => {
    navigate('/');
  };
  
  return (
    <nav className="app-menubar">
      <div className="menubar-container">
        <div className="menubar-brand" onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
          <span className="brand-text">🚗 BidCab Driver</span>
        </div>
        
        {/* Hamburger Menu Button for Mobile */}
        <button 
          className={`hamburger ${isMenuOpen ? 'active' : ''}`}
          onClick={toggleMenuAndClose}
          aria-label="Toggle navigation menu"
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
        
        {/* Desktop Navigation */}
        <ul className={`menubar-nav ${isMenuOpen ? 'mobile-open' : ''}`}>
          <li>
            <Link 
              to="/" 
              className={location === '/' ? 'active' : ''}
              onClick={handleMenuClick}
            >
              🏠 Dashboard
            </Link>
          </li>
          <li>
            <Link 
              to="/available-rides" 
              className={location === '/available-rides' ? 'active' : ''}
              onClick={handleMenuClick}
            >
              🔍 Available Rides
            </Link>
          </li>
          <li>
            <Link 
              to="/active-rides" 
              className={location === '/active-rides' ? 'active' : ''}
              onClick={handleMenuClick}
            >
              🚗 Active Rides
            </Link>
          </li>
          <li>
            <Link 
              to="/earnings" 
              className={location === '/earnings' ? 'active' : ''}
              onClick={handleMenuClick}
            >
              💰 Earnings
            </Link>
          </li>
          <li>
            <button 
              className="menubar-theme-toggle" 
              onClick={toggleTheme}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              {theme === 'light' ? '🌙' : '☀️'}
            </button>
          </li>
          <li className="account-menu-container">
            <button 
              className="menubar-account" 
              onClick={toggleAccountMenu}
              title="Account Menu"
            >
              👤 {driver?.name || 'Driver'}
            </button>
            {isAccountMenuOpen && (
              <div className="account-dropdown">
                <Link 
                  to="/profile" 
                  onClick={handleAccountMenuClick}
                  className="account-menu-item"
                >
                  👤 Profile
                </Link>
                <Link 
                  to="/history" 
                  onClick={handleAccountMenuClick}
                  className="account-menu-item"
                >
                  📋 History
                </Link>
                <button 
                  onClick={() => { handleAccountMenuClick(); handleLogout(); }}
                  className="account-menu-item logout-item"
                >
                  🚪 Logout
                </button>
              </div>
            )}
          </li>
        </ul>
      </div>
    </nav>
  );
};

function App() {
  const { t, i18n } = useTranslation();
  
  // Authentication state
  const [driver, setDriver] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Menubar state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeMenuItem, setActiveMenuItem] = useState('home');
  
  // App state - driver specific
  const [availableRides, setAvailableRides] = useState([]);
  const [activeRides, setActiveRides] = useState([]);
  const [driverLocation, setDriverLocation] = useState({ coords: null, address: '' });
  const [isOnline, setIsOnline] = useState(false);
  const [myBids, setMyBids] = useState([]);
  const [earnings, setEarnings] = useState({
    today: 0,
    week: 0,
    month: 0,
    total: 0
  });
  const [socket, setSocket] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState('');
  
  // Handle login
  const handleLogin = (driverData) => {
    setDriver(driverData);
    setAuthLoading(false);
    // Initialize socket connection after login
    initializeSocket(driverData);
  };
  
  // Handle logout
  const handleLogout = () => {
    logout();
    setDriver(null);
    if (socket) {
      socket.disconnect();
    }
  };
  
  // Initialize Socket.IO connection
  const initializeSocket = (driverData) => {
    const newSocket = io('http://localhost:3001', {
      query: { driverId: driverData.id, type: 'driver' }
    });
    
    newSocket.on('connect', () => {
      console.log('Connected to server as driver');
    });
    
    newSocket.on('newRideRequest', (rideData) => {
      setAvailableRides(prev => [...prev, rideData]);
      // You can add notification here
    });
    
    newSocket.on('rideAccepted', (rideData) => {
      setAvailableRides(prev => prev.filter(ride => ride.id !== rideData.id));
      setActiveRides(prev => [...prev, rideData]);
    });
    
    newSocket.on('bidUpdate', (bidData) => {
      setMyBids(prev => {
        const existingIndex = prev.findIndex(bid => bid.id === bidData.id);
        if (existingIndex >= 0) {
          const updated = [...prev];
          updated[existingIndex] = bidData;
          return updated;
        } else {
          return [...prev, bidData];
        }
      });
    });
    
    setSocket(newSocket);
  };
  
  // Toggle mobile menu
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = () => {
      if (isAuthenticated()) {
        const driverData = getDriverData();
        setDriver(driverData);
        initializeSocket(driverData);
      } else {
        setDriver(null);
      }
      setAuthLoading(false);
    };
    
    checkAuth();
    
    // Cleanup socket on unmount
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    document.body.className = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  // App state and functions that will be passed to child components
  const appState = {
    availableRides,
    setAvailableRides,
    activeRides,
    setActiveRides,
    driverLocation,
    setDriverLocation,
    isOnline,
    setIsOnline,
    myBids,
    setMyBids,
    earnings,
    setEarnings,
    socket,
    theme,
    setTheme,
    locationLoading,
    setLocationLoading,
    locationError,
    setLocationError,
    ReverseGeocode,
    driver
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">🚗</div>
        <p>Loading BidCab Driver...</p>
      </div>
    );
  }

  // If driver is not authenticated, show login page
  if (!driver) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="App">
        <NavigationBar 
          driver={driver}
          handleLogout={handleLogout}
          isMenuOpen={isMenuOpen}
          toggleMenu={toggleMenu}
          theme={theme}
          setTheme={setTheme}
        />
        
        <main className="main-content">
          <Routes>
            <Route 
              path="/" 
              element={<Home appState={appState} />} 
            />
            <Route 
              path="/available-rides" 
              element={<AvailableRides appState={appState} />} 
            />
            <Route 
              path="/active-rides" 
              element={<ActiveRides appState={appState} />} 
            />
            <Route 
              path="/earnings" 
              element={<Earnings appState={appState} />} 
            />
            <Route 
              path="/profile" 
              element={<Profile appState={appState} />} 
            />
            <Route 
              path="/history" 
              element={<History appState={appState} />} 
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
