import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../utils/firebase';

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
        const userCredential = await signInWithEmailAndPassword(auth, formData.email, formData.password);
        const user = userCredential.user;
        
        // Check if user is a driver
        const driverDoc = await getDoc(doc(db, 'drivers', user.uid));
        if (!driverDoc.exists()) {
          setError('This account is not registered as a driver');
          await auth.signOut();
          return;
        }

        const driverData = driverDoc.data();
        const driverInfo = {
          uid: user.uid,
          email: user.email,
          name: driverData.name,
          phone: driverData.phone,
          vehicleType: driverData.vehicleType,
          vehicleNumber: driverData.vehicleNumber,
          licenseNumber: driverData.licenseNumber,
          rating: driverData.rating || 5.0,
          totalRides: driverData.totalRides || 0,
          isOnline: false,
          currentLocation: null
        };

        localStorage.setItem('driverToken', user.accessToken);
        localStorage.setItem('driverData', JSON.stringify(driverInfo));
        
        if (onLogin) onLogin(driverInfo);
        navigate('/driver/dashboard');
      } else {
        // Register new driver
        const userCredential = await createUserWithEmailAndPassword(auth, formData.email, formData.password);
        const user = userCredential.user;

        // Update display name
        await updateProfile(user, {
          displayName: formData.name
        });

        // Create driver document in Firestore
        const driverData = {
          uid: user.uid,
          email: user.email,
          name: formData.name,
          phone: formData.phone,
          vehicleType: formData.vehicleType,
          vehicleNumber: formData.vehicleNumber,
          licenseNumber: formData.licenseNumber,
          rating: 5.0,
          totalRides: 0,
          joinDate: new Date().toISOString(),
          isOnline: false,
          isVerified: false, // Requires admin verification
          status: 'pending' // pending, approved, rejected
        };

        await setDoc(doc(db, 'drivers', user.uid), driverData);

        localStorage.setItem('driverToken', user.accessToken);
        localStorage.setItem('driverData', JSON.stringify(driverData));
        
        if (onLogin) onLogin(driverData);
        navigate('/driver/dashboard');
      }
    } catch (error) {
      console.error('Authentication error:', error);
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          setError('Invalid email or password');
          break;
        case 'auth/email-already-in-use':
          setError('Email is already registered');
          break;
        case 'auth/weak-password':
          setError('Password is too weak');
          break;
        case 'auth/invalid-email':
          setError('Invalid email address');
          break;
        default:
          setError(error.message || 'Authentication failed');
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
              onClick={() => navigate('/')}
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
