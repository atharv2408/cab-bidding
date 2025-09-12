import React, { useState, useEffect } from 'react';
import './Login.css';
import { createApiUrl, API_ENDPOINTS } from '../config/api';

const Login = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoaded, setGoogleLoaded] = useState(false);

  // Load Google Identity Services
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => {
      setGoogleLoaded(true);
      // Initialize Google Identity Services
      window.google.accounts.id.initialize({
        client_id: '1234567890-abcdefghijklmnopqrstuvwxyz.apps.googleusercontent.com', // Demo client ID
        callback: handleGoogleLogin,
        auto_select: false,
        cancel_on_tap_outside: false,
      });
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup script on unmount
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
    };
  }, []);

  const handleGoogleLogin = async (response) => {
    try {
      // In a real application, you would send the credential to your backend
      // For demo purposes, we'll decode the JWT token client-side
      const credential = response.credential;
      const payload = JSON.parse(atob(credential.split('.')[1]));
      
      const userData = {
        id: payload.sub,
        name: payload.name,
        email: payload.email,
        picture: payload.picture,
        loginMethod: 'google'
      };

      // Store user data
      localStorage.setItem('token', 'demo-google-token');
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Call parent component's login handler
      onLogin(userData);
    } catch (error) {
      console.error('Google login error:', error);
      setError('Google login failed. Please try again.');
    }
  };

  const handleDemoLogin = () => {
    // Demo login without backend
    const demoUser = {
      id: 'demo-user-123',
      name: 'Demo User',
      email: 'demo@example.com',
      picture: 'https://i.pravatar.cc/150?img=1',
      loginMethod: 'demo'
    };

    localStorage.setItem('token', 'demo-token');
    localStorage.setItem('user', JSON.stringify(demoUser));
    
    onLogin(demoUser);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError(''); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(createApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // Store token in localStorage
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        
        // Call parent component's login handler
        onLogin(data.user);
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
      console.error('Login error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2>🚗 BidCab India</h2>
          <p>Sign In to Your Account</p>
        </div>
        
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="error-message">{error}</div>}
          
          <div className="form-group">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="Enter your password"
              className="form-input"
            />
          </div>

          <button 
            type="submit" 
            className="login-button"
            disabled={loading}
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Divider */}
        <div className="login-divider">
          <div className="divider-line"></div>
          <span className="divider-text">or</span>
          <div className="divider-line"></div>
        </div>

        {/* Google Sign-In Button */}
        <div className="google-login-container">
          <div id="google-signin-button"></div>
          {googleLoaded && (
            <button 
              type="button" 
              className="google-login-button"
              onClick={() => {
                window.google.accounts.id.renderButton(
                  document.getElementById('google-signin-button'),
                  {
                    theme: 'outline',
                    size: 'large',
                    type: 'standard',
                    text: 'signin_with',
                    shape: 'rectangular',
                    width: '100%'
                  }
                );
              }}
            >
              <svg className="google-icon" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          )}
        </div>

        {/* Demo Login Button */}
        <div className="demo-login-container">
          <button 
            type="button" 
            className="demo-login-button"
            onClick={handleDemoLogin}
          >
            🚀 Try Demo Login
          </button>
          <p className="demo-text">No registration required - perfect for testing!</p>
        </div>

        <div className="login-footer">
          <p>Don't have an account? <a href="#signup">Sign up here</a></p>
          <p><a href="#forgot">Forgot your password?</a></p>
        </div>
      </div>
    </div>
  );
};

export default Login;
