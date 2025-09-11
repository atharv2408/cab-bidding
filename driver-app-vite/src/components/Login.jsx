import React, { useState } from 'react';
import axios from 'axios';
import './Login.css';

const Login = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    licenseNumber: '',
    vehicleModel: '',
    vehicleColor: '',
    vehicleType: 'sedan',
    plateNumber: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const endpoint = isLogin ? '/api/driver/login' : '/api/driver/register';
      const response = await axios.post(`http://localhost:3001${endpoint}`, formData);
      
      if (response.data.success) {
        localStorage.setItem('driverToken', response.data.token);
        localStorage.setItem('driver', JSON.stringify(response.data.driver));
        onLogin(response.data.driver);
      } else {
        setError(response.data.message || 'Authentication failed');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Network error occurred');
      console.error('Auth error:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.body.className = newTheme;
    localStorage.setItem('theme', newTheme);
  };

  // Demo login with sample data
  const handleDemoLogin = () => {
    const demoDriver = {
      id: 'demo_driver_1',
      name: 'John Driver',
      email: 'john@example.com',
      phone: '+1234567890',
      licenseNumber: 'DL123456789',
      vehicleModel: 'Toyota Camry',
      vehicleColor: 'White',
      vehicleType: 'sedan',
      plateNumber: 'ABC-123',
      rating: 4.8,
      totalRides: 245,
      isOnline: false,
      avatar: 'JD'
    };
    
    localStorage.setItem('driverToken', 'demo_token');
    localStorage.setItem('driver', JSON.stringify(demoDriver));
    onLogin(demoDriver);
  };

  React.useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="brand-section">
            <div className="brand-icon">🚗</div>
            <h1>BidCab Driver</h1>
            <p>Start earning with every ride</p>
          </div>
          
          <button 
            className="theme-toggle"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>

        <div className="login-tabs">
          <button 
            className={`tab ${isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(true)}
          >
            Login
          </button>
          <button 
            className={`tab ${!isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(false)}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              required
              placeholder="driver@example.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleInputChange}
              required
              placeholder="••••••••"
            />
          </div>

          {!isLogin && (
            <>
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="John Doe"
                />
              </div>

              <div className="form-group">
                <label htmlFor="phone">Phone Number</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  placeholder="+1234567890"
                />
              </div>

              <div className="form-group">
                <label htmlFor="licenseNumber">Driver License Number</label>
                <input
                  type="text"
                  id="licenseNumber"
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleInputChange}
                  required
                  placeholder="DL123456789"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="vehicleModel">Vehicle Model</label>
                  <input
                    type="text"
                    id="vehicleModel"
                    name="vehicleModel"
                    value={formData.vehicleModel}
                    onChange={handleInputChange}
                    required
                    placeholder="Toyota Camry"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="vehicleColor">Vehicle Color</label>
                  <input
                    type="text"
                    id="vehicleColor"
                    name="vehicleColor"
                    value={formData.vehicleColor}
                    onChange={handleInputChange}
                    required
                    placeholder="White"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="vehicleType">Vehicle Type</label>
                  <select
                    id="vehicleType"
                    name="vehicleType"
                    value={formData.vehicleType}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="sedan">Sedan</option>
                    <option value="suv">SUV</option>
                    <option value="hatchback">Hatchback</option>
                    <option value="luxury">Luxury</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="plateNumber">License Plate</label>
                  <input
                    type="text"
                    id="plateNumber"
                    name="plateNumber"
                    value={formData.plateNumber}
                    onChange={handleInputChange}
                    required
                    placeholder="ABC-123"
                  />
                </div>
              </div>
            </>
          )}

          <button 
            type="submit" 
            className="login-btn"
            disabled={loading}
          >
            {loading ? (
              <div className="loading-spinner">🔄</div>
            ) : (
              <>
                <span>{isLogin ? 'Login' : 'Register'}</span>
                <span className="btn-arrow">→</span>
              </>
            )}
          </button>
        </form>

        <div className="demo-section">
          <div className="divider">
            <span>OR</span>
          </div>
          <button 
            type="button" 
            onClick={handleDemoLogin}
            className="demo-btn"
          >
            <span className="demo-icon">🚀</span>
            Try Demo Mode
          </button>
        </div>

        <div className="login-footer">
          <p>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button 
              type="button"
              className="switch-btn"
              onClick={() => setIsLogin(!isLogin)}
            >
              {isLogin ? "Register here" : "Login here"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
