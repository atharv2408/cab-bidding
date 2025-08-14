import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Route, Routes, Link, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DriverLogin from './components/DriverLogin';
import DriverDashboard from './pages/DriverDashboard';
import DriverHistory from './pages/DriverHistory';

// Check if driver is authenticated
const isDriverAuthenticated = () => {
  const token = localStorage.getItem('driverToken');
  return token !== null;
};

// Get driver data from localStorage
const getDriverData = () => {
  const driverData = localStorage.getItem('driverData');
  return driverData ? JSON.parse(driverData) : null;
};

// Driver logout function
const driverLogout = () => {
  localStorage.removeItem('driverToken');
  localStorage.removeItem('driverData');
  window.location.reload();
};

// Driver Navigation Bar Component
const DriverNavigationBar = ({ driver, handleLogout, isMenuOpen, toggleMenu, theme, setTheme }) => {
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
    navigate('/driver/dashboard');
  };
  
  return (
    <nav className="app-menubar driver-menubar">
      <div className="menubar-container">
        <div className="menubar-brand" onClick={handleLogoClick} style={{ cursor: 'pointer' }}>
          <span className="brand-text">🚗 BidCab Driver</span>
        </div>
        
        {/* Driver Status Indicator */}
        <div className="driver-status-indicator">
          <span className="status-dot online"></span>
          <span className="driver-name">{driver?.name}</span>
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
              to="/driver/dashboard" 
              className={location === '/driver/dashboard' ? 'active' : ''}
              onClick={handleMenuClick}
            >
              🏠 Dashboard
            </Link>
          </li>
          <li>
            <Link 
              to="/driver/history" 
              className={location === '/driver/history' ? 'active' : ''}
              onClick={handleMenuClick}
            >
              📊 History
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
              title="Driver Menu"
            >
              🚗 Driver
            </button>
            {isAccountMenuOpen && (
              <div className="account-dropdown">
                <div className="driver-info-dropdown">
                  <span className="driver-rating">⭐ {driver?.rating || 5.0}</span>
                  <span className="driver-vehicle">🚙 {driver?.vehicleType}</span>
                </div>
                <button 
                  onClick={() => window.location.pathname = '/'}
                  className="account-menu-item"
                >
                  👤 Switch to Customer
                </button>
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

function DriverApp({ ReverseGeocode }) {
  const { t } = useTranslation();
  
  // Driver authentication state
  const [driver, setDriver] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // UI state
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  
  // Handle driver login
  const handleDriverLogin = (driverData) => {
    setDriver(driverData);
    setAuthLoading(false);
  };
  
  // Handle driver logout
  const handleDriverLogout = () => {
    driverLogout();
    setDriver(null);
  };
  
  // Toggle mobile menu
  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };
  
  // Check driver authentication on component mount
  useEffect(() => {
    const checkDriverAuth = () => {
      if (isDriverAuthenticated()) {
        const driverData = getDriverData();
        setDriver(driverData);
      } else {
        setDriver(null);
      }
      setAuthLoading(false);
    };
    
    checkDriverAuth();
  }, []);

  useEffect(() => {
    document.body.className = `${theme} driver-mode`;
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner">🚗</div>
        <p>Loading BidCab Driver...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="DriverApp">
        {driver && (
          <DriverNavigationBar 
            driver={driver}
            handleLogout={handleDriverLogout}
            isMenuOpen={isMenuOpen}
            toggleMenu={toggleMenu}
            theme={theme}
            setTheme={setTheme}
          />
        )}
        
        <main className="main-content driver-content">
          <Routes>
            <Route 
              path="/driver/login" 
              element={<DriverLogin onLogin={handleDriverLogin} />} 
            />
            <Route 
              path="/driver/dashboard" 
              element={
                driver ? (
                  <DriverDashboard 
                    driverData={driver}
                    setDriverData={setDriver}
                    ReverseGeocode={ReverseGeocode}
                  />
                ) : (
                  <DriverLogin onLogin={handleDriverLogin} />
                )
              } 
            />
            <Route 
              path="/driver/history" 
              element={
                driver ? (
                  <DriverHistory 
                    driverData={driver}
                  />
                ) : (
                  <DriverLogin onLogin={handleDriverLogin} />
                )
              } 
            />
            {/* Default route for /driver/* - redirect to login if not authenticated, dashboard if authenticated */}
            <Route 
              path="/driver/*" 
              element={
                driver ? (
                  <DriverDashboard 
                    driverData={driver}
                    setDriverData={setDriver}
                    ReverseGeocode={ReverseGeocode}
                  />
                ) : (
                  <DriverLogin onLogin={handleDriverLogin} />
                )
              } 
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default DriverApp;
