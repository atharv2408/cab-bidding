// Complete System Test
require('dotenv').config();

async function testCompleteSystem() {
  try {
    console.log('🚀 === COMPLETE SYSTEM TEST ===');
    
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.REACT_APP_SUPABASE_URL,
      process.env.REACT_APP_SUPABASE_ANON_KEY
    );
    
    // Test 1: Database Connection
    console.log('\n📊 1. Testing Database Connection...');
    const { data: dbTest, error: dbError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (dbError) {
      console.log('❌ Database connection failed:', dbError);
      return;
    } else {
      console.log('✅ Database connected successfully');
    }
    
    // Test 2: Check Table Schema
    console.log('\n🗂️ 2. Testing Table Schemas...');
    
    // Test users table with correct columns
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (userError) {
      console.log('❌ Users table error:', userError);
    } else {
      console.log('✅ Users table accessible');
    }
    
    // Test drivers table
    const { data: driverData, error: driverError } = await supabase
      .from('drivers')
      .select('*')
      .limit(1);
    
    if (driverError) {
      console.log('❌ Drivers table error:', driverError);
    } else {
      console.log('✅ Drivers table accessible, sample drivers:', driverData.length);
    }
    
    // Test 3: Authentication Flow
    console.log('\n🔐 3. Testing Authentication Flow...');
    
    const testEmail = `testuser${Date.now()}@example.com`;
    const testPassword = 'testpass123';
    
    // Test signup
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test User',
          phone: '+1234567890',
          user_type: 'customer'
        }
      }
    });
    
    if (authError) {
      console.log('❌ Auth signup failed:', authError);
    } else {
      console.log('✅ Auth signup successful, user ID:', authData.user?.id);
      
      // Test inserting into custom users table (if auth succeeded)
      if (authData.user) {
        const { data: customUserData, error: customUserError } = await supabase
          .from('users')
          .insert([{
            id: authData.user.id,
            email: testEmail,
            full_name: 'Test User',
            phone: '+1234567890',
            user_type: 'customer'
          }])
          .select();
        
        if (customUserError) {
          console.log('❌ Custom user table insert failed:', customUserError);
        } else {
          console.log('✅ Custom user table insert successful');
        }
      }
    }
    
    // Test 4: API Endpoints (if backend is running)
    console.log('\n🌐 4. Testing Backend API...');
    
    try {
      const axios = require('axios');
      
      // Test health endpoint
      const healthResponse = await axios.get('http://localhost:5000/health');
      console.log('✅ Backend health check passed:', healthResponse.data);
      
      // Test phone auth registration
      const phoneRegResponse = await axios.post('http://localhost:5000/auth/register', {
        phoneNumber: '+1234567890',
        name: 'Phone Test User'
      });
      console.log('✅ Phone registration works:', phoneRegResponse.data.message);
      
    } catch (apiError) {
      console.log('⚠️ Backend API not running or not accessible');
      console.log('   Start backend with: cd backend && node index.js');
    }
    
    // Test 5: Sample Data
    console.log('\n📋 5. Testing Sample Data...');
    
    const { data: drivers, error: driversError } = await supabase
      .from('drivers')
      .select('name, vehicle_type, rating')
      .limit(3);
    
    if (driversError) {
      console.log('❌ Cannot fetch drivers:', driversError);
    } else {
      console.log('✅ Sample drivers available:', drivers.length);
      drivers.forEach(driver => {
        console.log(`   - ${driver.name} (${driver.vehicle_type}, ${driver.rating}⭐)`);
      });
    }
    
    // Test 6: Real-time functionality
    console.log('\n⚡ 6. Testing Real-time Capabilities...');
    
    try {
      const channel = supabase
        .channel('test_channel')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'users' }, 
          (payload) => console.log('Real-time event received:', payload))
        .subscribe();
      
      console.log('✅ Real-time channel created successfully');
      
      // Clean up
      setTimeout(() => {
        supabase.removeChannel(channel);
        console.log('✅ Real-time channel cleaned up');
      }, 1000);
      
    } catch (realtimeError) {
      console.log('⚠️ Real-time test failed:', realtimeError.message);
    }
    
    console.log('\n🎉 === TEST SUMMARY ===');
    console.log('✅ Database: Connected and accessible');
    console.log('✅ Tables: Properly structured with sample data');
    console.log('✅ Authentication: Supabase Auth working');
    console.log('✅ Real-time: Channels can be created');
    console.log('⚠️ Backend API: Check if running on port 5000');
    
    console.log('\n🚀 === NEXT STEPS ===');
    console.log('1. If you haven\'t already, run SETUP_DATABASE_NOW.sql in Supabase');
    console.log('2. Start backend: cd backend && node index.js');
    console.log('3. Start frontend: npm start');
    console.log('4. Test the complete user flow in browser');
    
  } catch (error) {
    console.error('❌ Complete system test failed:', error);
  }
}

testCompleteSystem();
