import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabaseAuth, supabaseDB } from '../utils/supabaseService';

const DriverLoginFixed = ({ onLogin }) => {
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
    vehicleModel: '',
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
      if (!formData.name || !formData.phone || !formData.vehicleNumber) {
        setError('Name, phone, and vehicle number are required for registration');
        return false;
      }
      if (formData.password.length < 6) {
        setError('Password must be at least 6 characters');
        return false;
      }
    }
    return true;
  };

  const createDriverRecord = async (authUser, retryCount = 0) => {
    const driverData = {
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      vehicle_type: formData.vehicleType,
      vehicle_number: formData.vehicleNumber,
      rating: 5.0,
      total_rides: 0,
      available: false, // Start offline
      location: null,
      earnings: 0
    };
    
    // Only add license_number if the field exists in the database
    if (formData.licenseNumber) {
      driverData.license_number = formData.licenseNumber;
    }

    try {
      console.log('🔄 Attempting to create driver record...');
      const { data: dbDriverRecord, error: driverError } = await supabaseDB.drivers.add(driverData);
      
      if (driverError) {
        console.error('❌ Driver record creation failed:', driverError);
        
        // If RLS policy error, try a different approach
        if (driverError.message?.includes('row-level security') || driverError.code === '42501') {
          if (retryCount < 2) {
            console.log('🔄 Retrying driver creation with auth context...');
            // Wait a moment for auth context to be established
            await new Promise(resolve => setTimeout(resolve, 1000));
            return createDriverRecord(authUser, retryCount + 1);
          }
          throw new Error('Database permission error. Please ensure RLS policies are correctly configured for driver registration.');
        }
        throw new Error(driverError.message || 'Failed to create driver profile');
      }
      
      return dbDriverRecord[0];
    } catch (error) {
      console.error('💥 Driver record creation error:', error);
      throw error;
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        // Login existing driver
        console.log('🔐 Attempting driver login...');
        const { data: authData, error: authError } = await supabaseAuth.signIn(formData.email, formData.password);
        
        if (authError) {
          throw new Error(authError.message);
        }
        
        const user = authData.user;
        console.log('✅ Auth login successful for:', user.email);
        
        // Check if user is a driver by finding them in the drivers table
        const { data: drivers, error: driverError } = await supabaseDB.drivers.getAll();
        if (driverError) {
          console.error('❌ Error fetching drivers:', driverError);
          throw new Error('Failed to verify driver status');
        }
        
        const driverRecord = drivers.find(d => d.email === user.email);
        if (!driverRecord) {
          console.log('❌ Driver record not found for email:', user.email);
          console.log('📊 Available drivers:', drivers.map(d => d.email));
          setError('This account is not registered as a driver. Please register first.');
          await supabaseAuth.signOut();
          return;
        }

        console.log('✅ Driver record found:', driverRecord.id);

        const driverInfo = {
          uid: user.id,
          id: driverRecord.id,
          email: user.email,
          name: driverRecord.name,
          phone: driverRecord.phone,
          vehicleType: driverRecord.vehicle_type,
          vehicleNumber: driverRecord.vehicle_number,
          licenseNumber: driverRecord.license_number || 'N/A', // Handle missing field
          rating: driverRecord.rating || 5.0,
          totalRides: driverRecord.total_rides || 0,
          isOnline: false,
          currentLocation: null,
          available: driverRecord.available
        };

        localStorage.setItem('driverToken', authData.session.access_token);
        localStorage.setItem('driverData', JSON.stringify(driverInfo));
        
        console.log('✅ Driver login completed successfully');
        if (onLogin) onLogin(driverInfo);
        navigate('/driver/dashboard');
      } else {
        // Register new driver
        console.log('📝 Starting driver registration process...');
        
        // Check if email already exists in drivers table
        const { data: existingDrivers } = await supabaseDB.drivers.getAll();
        const existingDriver = existingDrivers?.find(d => d.email === formData.email);
        
        if (existingDriver) {
          setError('A driver account with this email already exists. Please login instead.');
          return;
        }

        // Step 1: Create auth user
        const { data: authData, error: authError } = await supabaseAuth.signUp(
          formData.email, 
          formData.password,
          {
            full_name: formData.name,
            phone: formData.phone
          }
        );
        
        if (authError) {
          console.error('❌ Auth registration failed:', authError);
          throw new Error(authError.message);
        }

        console.log('✅ Auth user created:', authData.user?.id);

        // Step 2: Create driver record
        let driverRecord = null;
        let driverId = null;

        try {
          driverRecord = await createDriverRecord(authData.user);
          driverId = driverRecord.id;
          console.log('✅ Driver profile created successfully:', driverId);
        } catch (dbError) {
          console.error('❌ Database driver creation failed:', dbError.message);
          
          // Clean up auth user if driver creation fails
          if (authData.user) {
            console.log('🧹 Cleaning up auth user due to driver creation failure...');
            try {
              await supabaseAuth.signOut();
            } catch (cleanupError) {
              console.warn('⚠️ Failed to clean up auth user:', cleanupError);
            }
          }
          
          // Show user-friendly error
          if (dbError.message.includes('permission') || dbError.message.includes('policy')) {
            setError('Registration temporarily unavailable. Please contact support or try again later.');
          } else {
            setError(dbError.message || 'Failed to create driver profile');
          }
          return;
        }

        const driverInfo = {
          uid: authData.user?.id,
          id: driverId,
          email: formData.email,
          name: formData.name,
          phone: formData.phone,
          vehicleType: formData.vehicleType,
          vehicleNumber: formData.vehicleNumber,
          licenseNumber: formData.licenseNumber || 'N/A', // Handle missing field
          rating: 5.0,
          totalRides: 0,
          isOnline: false,
          currentLocation: null,
          available: false
        };

        localStorage.setItem('driverToken', authData.session?.access_token || 'temp-token');
        localStorage.setItem('driverData', JSON.stringify(driverInfo));
        
        console.log('✅ Driver registration completed successfully');
        if (onLogin) onLogin(driverInfo);
        navigate('/driver/dashboard');
      }
    } catch (error) {
      console.error('💥 Authentication error:', error);
      
      // Handle Supabase-specific error messages
      const message = error.message || 'Authentication failed';
      if (message.includes('Invalid login credentials') || message.includes('Invalid email or password')) {
        setError('Invalid email or password');
      } else if (message.includes('User already registered')) {
        setError('Email is already registered. Please login instead.');
      } else if (message.includes('Password should be at least')) {
        setError('Password must be at least 6 characters');
      } else if (message.includes('Invalid email')) {
        setError('Invalid email address');
      } else if (message.includes('Email rate limit exceeded')) {
        setError('Too many requests. Please try again in a few minutes.');
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
