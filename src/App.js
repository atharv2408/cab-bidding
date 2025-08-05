import React, { useEffect, useState } from 'react';
import './App.css';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, useMapEvents, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTranslation } from 'react-i18next';
import './i18n';
import { BrowserRouter as Router, Route, Routes, Link, useNavigate, useLocation } from 'react-router-dom';
import Login from './components/Login';
import Home from './pages/Home';
import Bid from './pages/Bid';
import Confirm from './pages/Confirm';
import Success from './pages/Success';
import History from './pages/History';

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

// Navigation Bar Component
const NavigationBar = ({ user, handleLogout, isMenuOpen, toggleMenu, theme, setTheme }) => {
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
          <span className="brand-text">BidCab</span>
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
              🏠 Home
            </Link>
          </li>
          <li>
            <Link 
              to="/bids" 
              className={location === '/bids' ? 'active' : ''}
              onClick={handleMenuClick}
            >
              💰 Find My Bid
            </Link>
          </li>
          <li>
            <Link 
              to="/confirm" 
              className={location === '/confirm' ? 'active' : ''}
              onClick={handleMenuClick}
            >
              🚗 Ride Confirm
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
              👤 Account
            </button>
            {isAccountMenuOpen && (
              <div className="account-dropdown">
                <Link 
                  to="/history" 
                  onClick={handleAccountMenuClick}
                  className="account-menu-item"
                >
                  🚗 Ride History
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
  const [user, setUser] = useState(getUserData());
  const [authLoading, setAuthLoading] = useState(false);
  
  // Menubar state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeMenuItem, setActiveMenuItem] = useState('home');
  
  // App state - these will be passed as props to child components
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

  useEffect(() => {
    document.body.className = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  // App state and functions that will be passed to child components
  const appState = {
    pickup,
    setPickup,
    drop,
    setDrop,
    bids,
    setBids,
    selectedBid,
    setSelectedBid,
    biddingActive,
    setBiddingActive,
    selectionTime,
    setSelectionTime,
    timer,
    setTimer,
    selectionTimer,
    setSelectionTimer,
    theme,
    setTheme,
    suggestedPrice,
    setSuggestedPrice,
    useSuggestedPrice,
    setUseSuggestedPrice,
    locationLoading,
    setLocationLoading,
    locationError,
    setLocationError,
    rideOTP,
    setRideOTP,
    showRideDetails,
    setShowRideDetails,
    lastBidRef,
    ReverseGeocode
  };

  // If user is not authenticated, show login page
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="App">
        <NavigationBar 
          user={user}
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
              path="/bids" 
              element={<Bid appState={appState} />} 
            />
            <Route 
              path="/confirm" 
              element={<Confirm appState={appState} />} 
            />
            <Route 
              path="/success" 
              element={<Success appState={appState} />} 
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