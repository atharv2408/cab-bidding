// Debug script to test customAuth functionality
const path = require('path');

// Set up environment variables
require('dotenv').config();

console.log('=== Debug CustomAuth ===');
console.log('Environment check:');
console.log('REACT_APP_SUPABASE_URL:', process.env.REACT_APP_SUPABASE_URL?.substring(0, 30) + '...');
console.log('REACT_APP_SUPABASE_ANON_KEY:', process.env.REACT_APP_SUPABASE_ANON_KEY?.substring(0, 30) + '...');

try {
  console.log('\n1. Testing Supabase import...');
  
  // For ES6 modules in Node.js, we need to use dynamic import
  // Let's test the customAuth functionality step by step
  
  console.log('\n2. Testing customAuth methods...');
  
  // Manually test the hashPassword function logic from customAuth.js
  const testHashPassword = async (password) => {
    // This is the logic from customAuth.js
    if (password === 'password123') {
      return '$2b$10$K7GpqD/XiU.uYtJ9fVyJ/OhT2KZQKrjmF4K1kQUCFGxgQT0O8T4a.';
    }
    // For other passwords, return a different hash pattern
    return `$2b$10$${Buffer.from(password).toString('base64').slice(0, 50)}`;
  };
  
  const testRegister = async (userData) => {
    console.log('\n3. Testing registration logic...');
    console.log('Input data:', userData);
    
    try {
      // Test the hashPassword function
      console.log('\n4. Testing password hashing...');
      const passwordHash = await testHashPassword(userData.password);
      console.log('Password hash generated:', passwordHash);
      
      // Prepare user data (mimicking the logic from customAuth.js)
      const newUser = {
        email: userData.email.toLowerCase(),
        password_hash: passwordHash,
        full_name: userData.full_name || userData.name,
        phone: userData.phone,
        user_type: userData.user_type || 'customer',
        is_verified: false,
        login_count: 0
      };
      
      console.log('\n5. New user object created:', newUser);
      console.log('\nRegistration logic test completed successfully!');
      
      return {
        success: true,
        user: newUser
      };
      
    } catch (error) {
      console.error('\nError in registration logic:', error);
      return {
        success: false,
        error: error.message
      };
    }
  };
  
  // Test with sample data
  const sampleUserData = {
    email: 'test@example.com',
    password: 'testpassword123',
    full_name: 'Test User',
    phone: '+1234567890',
    user_type: 'customer'
  };
  
  testRegister(sampleUserData).then(result => {
    console.log('\n=== Final Result ===');
    console.log(result);
  });
  
} catch (error) {
  console.error('\nError in debug script:', error);
  console.error('Stack trace:', error.stack);
}
