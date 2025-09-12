// API Configuration
const getBackendUrl = () => {
  // In Replit environment, use the dev domain for backend on port 3001
  if (process.env.NODE_ENV === 'development' && process.env.REACT_APP_BACKEND_URL) {
    return process.env.REACT_APP_BACKEND_URL;
  }
  
  // Check if we're in Replit environment
  const replitDomain = process.env.REPLIT_DEV_DOMAIN;
  if (replitDomain) {
    // Replace the port number with 3001 for backend
    return `https://${replitDomain}`.replace(':5000', ':3001');
  }
  
  // Fallback to localhost for local development
  return 'http://localhost:3001';
};

export const API_BASE_URL = getBackendUrl();

export const API_ENDPOINTS = {
  // Auth endpoints
  REGISTER: '/auth/register',
  VERIFY_OTP: '/auth/verify-otp',
  RESEND_OTP: '/auth/resend-otp',
  PROFILE: '/auth/profile',
  
  // Customer endpoints
  CUSTOMER_HISTORY: '/api/customer/history',
  
  // Driver endpoints  
  DRIVER_LOGIN: '/api/driver/login',
  DRIVER_HISTORY: '/api/driver/history',
  
  // Ride endpoints
  BID: '/bid',
  BOOKINGS: '/api/bookings',
  RIDE_COMPLETE: '/api/ride/complete',
  RIDE_CANCEL: '/api/ride/cancel',
  
  // System
  HEALTH: '/health'
};

// Helper function to create full API URL
export const createApiUrl = (endpoint) => {
  return `${API_BASE_URL}${endpoint}`;
};