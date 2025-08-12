import React, { useState, useEffect } from 'react';
import { customAuth } from '../utils/customAuth';
import '../styles/CustomerAuth.css';

const CustomerAuth = ({ onLogin, onClose, onDriverLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: ''
  });

  // Load saved credentials and attempt auto-login on component mount
  useEffect(() => {
    const checkAndAutoLogin = async () => {
      const savedCredentials = localStorage.getItem('bidcab_remember_me');
      if (savedCredentials) {
        try {
          const { email, password } = JSON.parse(savedCredentials);
          setFormData(prev => ({
            ...prev,
            email,
            password
          }));
          setRememberMe(true);
          
          // Attempt auto-login with saved credentials
          console.log('Attempting auto-login with saved credentials...');
          setLoading(true);
          
          try {
            const authResult = await customAuth.verifyCredentials(email, password);
            
            if (!authResult.success) {
              console.log('Auto-login failed, credentials may be invalid:', authResult.error);
              // Remove invalid saved credentials
              localStorage.removeItem('bidcab_remember_me');
              setRememberMe(false);
              setFormData(prev => ({
                ...prev,
                password: '' // Clear password but keep email
              }));
            } else {
              // Auto-login successful
              console.log('Auto-login successful!');
              const user = authResult.user;
              
              const customerInfo = {
                uid: user.id,
                email: user.email,
                name: user.full_name || email.split('@')[0],
                phone: user.phone || '',
                type: user.user_type || 'customer'
              };

              // Generate a session token (simplified for demo)
              const sessionToken = btoa(`${user.id}:${Date.now()}:${Math.random()}`);
              localStorage.setItem('customerToken', sessionToken);
              localStorage.setItem('customerData', JSON.stringify(customerInfo));
              
              // Refresh saved credentials with successful login
              localStorage.setItem('bidcab_remember_me', JSON.stringify({
                email,
                password
              }));
              
              if (onLogin) onLogin(customerInfo);
              if (onClose) onClose();
              return; // Exit early on successful auto-login
            }
          } catch (autoLoginError) {
            console.log('Auto-login error:', autoLoginError.message);
            // Remove invalid saved credentials
            localStorage.removeItem('bidcab_remember_me');
            setRememberMe(false);
            setFormData(prev => ({
              ...prev,
              password: '' // Clear password but keep email
            }));
          }
          
          setLoading(false);
        } catch (error) {
          console.error('Error loading saved credentials:', error);
          // Remove corrupted saved credentials
          localStorage.removeItem('bidcab_remember_me');
        }
      }
    };
    
    checkAndAutoLogin();
  }, [onLogin, onClose]);

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
      if (!formData.name || !formData.phone) {
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        // Login existing customer using custom auth
        const authResult = await customAuth.verifyCredentials(formData.email, formData.password);
        
        if (!authResult.success) {
          throw new Error(authResult.error);
        }
        
        const user = authResult.user;
        
        const customerInfo = {
          uid: user.id,
          email: user.email,
          name: user.full_name || formData.email.split('@')[0],
          phone: user.phone || '',
          type: user.user_type || 'customer'
        };

        // Generate a session token (simplified for demo)
        const sessionToken = btoa(`${user.id}:${Date.now()}:${Math.random()}`);
        localStorage.setItem('customerToken', sessionToken);
        localStorage.setItem('customerData', JSON.stringify(customerInfo));
        
        // Save credentials if Remember Me is checked
        if (rememberMe) {
          localStorage.setItem('bidcab_remember_me', JSON.stringify({
            email: formData.email,
            password: formData.password
          }));
        } else {
          localStorage.removeItem('bidcab_remember_me');
        }
        
        if (onLogin) onLogin(customerInfo);
        if (onClose) onClose();
        
      } else {
        // Register new customer using Supabase Auth
        const registrationData = {
          email: formData.email,
          password: formData.password,
          full_name: formData.name,
          phone: formData.phone,
          user_type: 'customer'
        };
        
        const authResult = await customAuth.register(registrationData);
        
        if (!authResult.success) {
          throw new Error(authResult.error);
        }

        const user = authResult.user;
        
        // Check if email confirmation is required
        if (!user.is_verified && authResult.session === null) {
          // Email confirmation required
          setError('Registration successful! Please check your email and click the confirmation link to complete your account setup.');
          setIsLogin(true); // Switch to login mode
          setFormData(prev => ({ ...prev, password: '' })); // Clear password
          return;
        }
        
        // User is verified or confirmation not required, proceed with login
        const customerInfo = {
          uid: user.id,
          email: user.email,
          name: user.full_name,
          phone: user.phone,
          type: user.user_type
        };

        // Generate a session token (simplified for demo)
        const sessionToken = btoa(`${user.id}:${Date.now()}:${Math.random()}`);
        localStorage.setItem('customerToken', sessionToken);
        localStorage.setItem('customerData', JSON.stringify(customerInfo));
        
        if (onLogin) onLogin(customerInfo);
        if (onClose) onClose();
        
        // Show success message for registration
        alert('Registration successful! You can now book rides.');
      }
    } catch (error) {
      console.error('🚨 Authentication error:', error);
      console.error('🚨 Error stack:', error.stack);
      
      const message = error.message || 'Authentication failed';
      
      // Handle specific error messages
      if (message.includes('Invalid login credentials') || message.includes('Invalid email or password')) {
        setError('Invalid email or password');
      } else if (message.includes('Email not confirmed') || message.includes('email_not_confirmed')) {
        setError('Please check your email and click the confirmation link before logging in.');
      } else if (message.includes('User already registered') || message.includes('already registered')) {
        setError('Email is already registered');
      } else if (message.includes('Password should be at least') || message.includes('Password must be at least')) {
        setError('Password must be at least 6 characters');
      } else if (message.includes('Invalid email') || message.includes('email_address_invalid')) {
        setError('Please enter a valid email address');
      } else if (message.includes('Password hashing failed')) {
        // This should not happen with the new Supabase Auth, but just in case
        setError('Registration failed. Please try again.');
        console.error('❌ CRITICAL: Old password hashing code was somehow called!');
      } else {
        // Show the actual error message for debugging
        setError(message);
        console.error('🔍 Unhandled error message:', message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="customer-auth-overlay">
      <div className="customer-auth-modal">
        <div className="auth-header">
          <h2>🚕 {isLogin ? 'Login to BidCab' : 'Join BidCab'}</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        {loading && !error && (
          <div className="auto-login-message">
            <span className="auto-login-icon">🔐</span>
            <span>Signing you in automatically...</span>
          </div>
        )}
        
        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">📧 Email Address</label>
            <div className="input-wrapper">
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Enter your email address"
                className="form-input"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">🔒 Password</label>
            <div className="input-wrapper password-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                placeholder="Enter your password"
                className="form-input"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {!isLogin && (
            <>
              <div className="form-group">
                <label htmlFor="name">👤 Full Name</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="phone">📱 Phone Number</label>
                <div className="input-wrapper">
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="Enter your phone number"
                    className="form-input"
                    required
                  />
                </div>
              </div>
            </>
          )}

          {isLogin && (
            <div className="form-options">
              <label className="checkbox-wrapper">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="checkbox-input"
                />
                <span className="checkbox-custom"></span>
                <span className="checkbox-label">Remember me</span>
              </label>
              <button type="button" className="forgot-password-btn">
                Forgot Password?
              </button>
            </div>
          )}

          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner">⟳</span>
                {isLogin ? 'Signing In...' : 'Creating Account...'}
              </>
            ) : (
              <>
                <span className="btn-icon">🚕</span>
                {isLogin ? 'Login' : 'Create Account'}
              </>
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>
            {isLogin ? "Don't have an account? " : "Already have an account? "}
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
                  phone: ''
                });
              }}
            >
              {isLogin ? 'Sign up here' : 'Login here'}
            </button>
          </p>
          
          <p className="driver-link">
            Are you a driver? 
            <button 
              type="button" 
              className="driver-btn" 
              onClick={onDriverLogin}
            >
              Driver Login
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default CustomerAuth;
