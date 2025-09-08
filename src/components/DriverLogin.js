import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabaseAuth, supabaseDB } from '../utils/supabaseService';

const DriverLogin = ({ onLogin }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    vehicleType: 'sedan',
    vehicleNumber: '',
    licenseNumber: ''
  });

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
  };

  const validateForm = () => {
    if (!formData.email || !formData.password) {
      setError('Email and password are required');
      return false;
    }

    if (!isLogin) {
      if (!formData.name || !formData.phone || !formData.vehicleNumber || !formData.licenseNumber) {
        setError('All fields are required for registration');
        return false;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return false;
      }
    }
    return true;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        // Login existing driver
        const { data: authData, error: authError } = await supabaseAuth.signIn(formData.email, formData.password);
        
        if (authError) {
          throw new Error(authError.message);
        }
        
        const user = authData.user;
        
        // Check if user is a driver by finding them in the drivers table
        const { data: drivers, error: driverError } = await supabaseDB.drivers.getAll();
        if (driverError) {
          throw new Error('Failed to check driver status');
        }
        
        const driverRecord = drivers.find(d => d.email === user.email);
        if (!driverRecord) {
          setError('This account is not registered as a driver');
          await supabaseAuth.signOut();
          return;
        }

        const driverInfo = {
          uid: user.id,
          id: driverRecord.id,
          email: user.email,
          name: driverRecord.name,
          phone: driverRecord.phone,
          vehicleType: driverRecord.vehicle_type,
          vehicleNumber: driverRecord.vehicle_number,
          rating: driverRecord.rating || 5.0,
          totalRides: driverRecord.total_rides || 0,
          isOnline: false,
          currentLocation: null,
          available: driverRecord.available
        };

        localStorage.setItem('driverToken', authData.session.access_token);
        localStorage.setItem('driverData', JSON.stringify(driverInfo));
        
        if (onLogin) onLogin(driverInfo);
        navigate('/driver/dashboard');
      } else {
        // Register new driver
        const { data: authData, error: authError } = await supabaseAuth.signUp(
          formData.email, 
          formData.password,
          {
            full_name: formData.name,
            phone: formData.phone
          }
        );
        
        if (authError) {
          throw new Error(authError.message);
        }

        // Create driver record in drivers table
        const driverData = {
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          vehicle_type: formData.vehicleType,
          vehicle_number: formData.vehicleNumber,
          vehicle_model: '', // Can be added later
          license_number: formData.licenseNumber,
          rating: 5.0,
          total_rides: 0,
          available: false, // Start offline
          location: null
        };

        let driverRecord = null;
        let driverId = null;

        // Try to create driver record in database
        try {
          const { data: dbDriverRecord, error: driverError } = await supabaseDB.drivers.add(driverData);
          
          if (driverError) {
            console.warn('Supabase driver creation failed:', driverError);
            throw new Error('Database not available');
          }
          
          driverRecord = dbDriverRecord[0];
          driverId = driverRecord.id;
          console.log('✅ Driver profile created in database:', driverId);
        } catch (dbError) {
          console.log('Database unavailable, using fallback driver registration...');
          
          // Fallback: Create a temporary driver ID and store locally
          driverId = 'driver_' + Date.now();
          driverRecord = {
            id: driverId,
            ...driverData,
            created_at: new Date().toISOString()
          };
          
          // Store driver data in localStorage as backup
          const existingDrivers = JSON.parse(localStorage.getItem('fallbackDrivers') || '[]');
          existingDrivers.push(driverRecord);
          localStorage.setItem('fallbackDrivers', JSON.stringify(existingDrivers));
          
          console.log('✅ Driver profile created in fallback mode:', driverId);
        }

        const driverInfo = {
          uid: authData.user?.id,
          id: driverId,
          email: formData.email,
          name: formData.name,
          phone: formData.phone,
          vehicleType: formData.vehicleType,
          vehicleNumber: formData.vehicleNumber,
          licenseNumber: formData.licenseNumber,
          rating: 5.0,
          totalRides: 0,
          isOnline: false,
          currentLocation: null,
          available: false
        };

        localStorage.setItem('driverToken', authData.session?.access_token || 'temp-token');
        localStorage.setItem('driverData', JSON.stringify(driverInfo));
        
        if (onLogin) onLogin(driverInfo);
        navigate('/driver/dashboard');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      
      // Handle Supabase-specific error messages
      const message = error.message || 'Authentication failed';
      if (message.includes('Invalid login credentials') || message.includes('Invalid email or password')) {
        setError('Invalid email or password');
      } else if (message.includes('User already registered')) {
        setError('Email is already registered');
      } else if (message.includes('Password should be at least')) {
        setError('Password must be at least 6 characters');
      } else if (message.includes('Invalid email')) {
        setError('Invalid email address');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="driver-login-container">
      <div className="driver-login-card">
        <div className="driver-login-header">
          <h2>🚗 Driver {isLogin ? 'Login' : 'Registration'}</h2>
          <p>Join BidCab as a professional driver</p>
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="driver-login-form">
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="Enter your email"
              required
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
              placeholder="Enter your password"
              required
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
                  placeholder="Enter your full name"
                  required
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
                  placeholder="Enter your phone number"
                  required
                />
              </div>

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
                  <option value="hatchback">Hatchback</option>
                  <option value="suv">SUV</option>
                  <option value="mini">Mini</option>
                  <option value="luxury">Luxury</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="vehicleNumber">Vehicle Number</label>
                <input
                  type="text"
                  id="vehicleNumber"
                  name="vehicleNumber"
                  value={formData.vehicleNumber}
                  onChange={handleInputChange}
                  placeholder="Enter vehicle registration number"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="licenseNumber">Driving License Number</label>
                <input
                  type="text"
                  id="licenseNumber"
                  name="licenseNumber"
                  value={formData.licenseNumber}
                  onChange={handleInputChange}
                  placeholder="Enter driving license number"
                  required
                />
              </div>
            </>
          )}

          <button type="submit" className="driver-login-btn" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner">⟳</span>
                {isLogin ? 'Signing In...' : 'Registering...'}
              </>
            ) : (
              <>
                <span className="btn-icon">🚗</span>
                {isLogin ? 'Login as Driver' : 'Register as Driver'}
              </>
            )}
          </button>
        </form>

        <div className="driver-login-footer">
          <p>
            {isLogin ? "New driver? " : "Already have an account? "}
            <button 
              type="button" 
              className="toggle-mode-btn" 
              onClick={() => {
                setIsLogin(!isLogin);
                setError('');
                setFormData({
                  email: '',
                  password: '',
                  name: '',
                  phone: '',
                  vehicleType: 'sedan',
                  vehicleNumber: '',
                  licenseNumber: ''
                });
              }}
            >
              {isLogin ? 'Register here' : 'Login here'}
            </button>
          </p>
          
          <p className="customer-link">
            Are you a customer? 
            <button 
              type="button" 
              className="customer-btn" 
              onClick={() => window.location.pathname = '/'}
            >
              Book a Ride
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default DriverLogin;
