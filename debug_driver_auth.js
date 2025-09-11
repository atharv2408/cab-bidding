#!/usr/bin/env node
/**
 * Debug script to test driver authentication with Supabase
 * This will help identify where the authentication flow is failing
 */

// Import required modules
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://gxnolhrjdkfyyrtkcjhm.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4bm9saHJqZGtmeXlydGtjamhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MDg5NTksImV4cCI6MjA3MDQ4NDk1OX0.YdHAqb5W02sprZSC-h8L4KduWTgzfPcXG6I5-HEWWVw';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🚀 Starting Driver Authentication Debug...\n');
console.log('📋 Supabase URL:', supabaseUrl);
console.log('🔑 Supabase Key:', supabaseKey.substring(0, 20) + '...\n');

// Test data
const testDriver = {
  email: 'test.driver@example.com',
  password: 'testdriver123',
  name: 'Test Driver',
  phone: '+919876543210',
  vehicle_type: 'sedan',
  vehicle_number: 'TEST-001',
  vehicle_model: 'Test Car',
  license_number: 'TEST-LICENSE-001'
};

async function checkDatabaseTables() {
  console.log('📊 Checking database tables...');
  
  try {
    // Check drivers table structure
    const { data: drivers, error: driversError } = await supabase
      .from('drivers')
      .select('*')
      .limit(1);
    
    if (driversError) {
      console.error('❌ Drivers table error:', driversError);
      return false;
    }
    
    console.log('✅ Drivers table accessible');
    
    // Check if user_id column exists
    const { data: allDrivers, error: allDriversError } = await supabase
      .from('drivers')
      .select('id, user_id, name, email, phone, vehicle_type, vehicle_number, created_at');
    
    if (allDriversError) {
      console.error('❌ Error fetching drivers:', allDriversError);
    } else {
      console.log('📋 Current drivers in database:', allDrivers.length);
      if (allDrivers.length > 0) {
        console.log('📄 Sample driver record:', JSON.stringify(allDrivers[0], null, 2));
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Database check failed:', error);
    return false;
  }
}

async function testDriverRegistration() {
  console.log('\n🔐 Testing Driver Registration...');
  
  try {
    // First, check if user already exists
    const { data: existingUser } = await supabase.auth.getUser();
    if (existingUser?.user) {
      console.log('🔓 Signing out existing user...');
      await supabase.auth.signOut();
    }
    
    // Try to register new driver
    console.log('📝 Attempting to register driver with email:', testDriver.email);
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testDriver.email,
      password: testDriver.password,
      options: {
        data: {
          full_name: testDriver.name,
          phone: testDriver.phone,
          is_driver: true,
          vehicle_type: testDriver.vehicle_type,
          vehicle_number: testDriver.vehicle_number,
          vehicle_model: testDriver.vehicle_model,
          license_number: testDriver.license_number
        }
      }
    });
    
    if (authError) {
      if (authError.message.includes('User already registered')) {
        console.log('⚠️ User already exists, this is expected if we ran this test before');
        return await testExistingUserLogin();
      } else {
        console.error('❌ Auth registration failed:', authError);
        return false;
      }
    }
    
    console.log('✅ Auth user created successfully');
    console.log('👤 User ID:', authData.user?.id);
    console.log('📧 User email:', authData.user?.email);
    
    // Wait a moment for the trigger to execute
    console.log('⏳ Waiting 2 seconds for driver profile creation...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Check if driver profile was created
    const { data: driverProfile, error: driverError } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', authData.user.id)
      .single();
    
    if (driverError) {
      console.error('❌ Driver profile not found:', driverError);
      
      // Try to create manually
      console.log('🔧 Attempting to create driver profile manually...');
      const { data: manualDriver, error: manualError } = await supabase
        .from('drivers')
        .insert([{
          user_id: authData.user.id,
          name: testDriver.name,
          email: testDriver.email,
          phone: testDriver.phone,
          vehicle_type: testDriver.vehicle_type,
          vehicle_number: testDriver.vehicle_number,
          vehicle_model: testDriver.vehicle_model,
          license_number: testDriver.license_number,
          rating: 5.0,
          total_rides: 0,
          available: false,
          earnings: 0.0
        }])
        .select()
        .single();
      
      if (manualError) {
        console.error('❌ Manual driver creation failed:', manualError);
        return false;
      } else {
        console.log('✅ Driver profile created manually');
        console.log('🚗 Driver data:', JSON.stringify(manualDriver, null, 2));
      }
    } else {
      console.log('✅ Driver profile created automatically by trigger');
      console.log('🚗 Driver data:', JSON.stringify(driverProfile, null, 2));
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Registration test failed:', error);
    return false;
  }
}

async function testExistingUserLogin() {
  console.log('\n🔑 Testing existing user login...');
  
  try {
    // Try to login with existing credentials
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testDriver.email,
      password: testDriver.password
    });
    
    if (authError) {
      console.error('❌ Login failed:', authError);
      return false;
    }
    
    console.log('✅ Login successful');
    console.log('👤 User ID:', authData.user?.id);
    
    // Check if driver profile exists
    const { data: driverProfile, error: driverError } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', authData.user.id)
      .single();
    
    if (driverError) {
      console.error('❌ Driver profile not found for logged in user:', driverError);
      return false;
    }
    
    console.log('✅ Driver profile found');
    console.log('🚗 Driver data:', JSON.stringify(driverProfile, null, 2));
    
    return true;
    
  } catch (error) {
    console.error('❌ Login test failed:', error);
    return false;
  }
}

async function testDriverLogin() {
  console.log('\n🔐 Testing Driver Login Flow...');
  
  try {
    // Sign out any existing session
    await supabase.auth.signOut();
    
    // Try to login
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testDriver.email,
      password: testDriver.password
    });
    
    if (authError) {
      console.error('❌ Auth login failed:', authError);
      return false;
    }
    
    console.log('✅ Auth login successful');
    console.log('👤 User ID:', authData.user?.id);
    
    // Try to get driver profile by user_id
    const { data: driverData, error: driverError } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', authData.user.id)
      .single();
    
    if (driverError) {
      console.error('❌ Failed to get driver profile:', driverError);
      
      // Try by email as fallback
      const { data: driverByEmail, error: emailError } = await supabase
        .from('drivers')
        .select('*')
        .eq('email', authData.user.email)
        .single();
      
      if (emailError) {
        console.error('❌ Driver not found by email either:', emailError);
        return false;
      } else {
        console.log('⚠️ Found driver by email (but not user_id):', JSON.stringify(driverByEmail, null, 2));
      }
    } else {
      console.log('✅ Driver profile retrieved successfully');
      console.log('🚗 Driver profile:', JSON.stringify(driverData, null, 2));
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Login test failed:', error);
    return false;
  }
}

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...');
  
  try {
    // Delete driver record
    const { error: driverDeleteError } = await supabase
      .from('drivers')
      .delete()
      .eq('email', testDriver.email);
    
    if (driverDeleteError) {
      console.log('⚠️ Driver deletion error (might not exist):', driverDeleteError);
    } else {
      console.log('✅ Test driver record deleted');
    }
    
    // Note: We can't delete auth users via the client, only via Supabase dashboard
    console.log('ℹ️ Auth user cleanup must be done manually in Supabase dashboard');
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

async function runDebugTests() {
  console.log('🔍 Running comprehensive driver authentication debug...\n');
  
  try {
    // Step 1: Check database accessibility
    const dbCheck = await checkDatabaseTables();
    if (!dbCheck) {
      console.error('❌ Database check failed. Exiting.');
      process.exit(1);
    }
    
    // Step 2: Test registration
    console.log('\n' + '='.repeat(50));
    const registrationTest = await testDriverRegistration();
    
    // Step 3: Test login
    console.log('\n' + '='.repeat(50));
    const loginTest = await testDriverLogin();
    
    // Step 4: Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY:');
    console.log('================');
    console.log('Database Access:', dbCheck ? '✅ Pass' : '❌ Fail');
    console.log('Registration:', registrationTest ? '✅ Pass' : '❌ Fail');
    console.log('Login:', loginTest ? '✅ Pass' : '❌ Fail');
    
    if (registrationTest && loginTest) {
      console.log('\n🎉 All tests passed! Driver authentication should work.');
    } else {
      console.log('\n⚠️ Some tests failed. Check the errors above.');
    }
    
    // Cleanup
    console.log('\n❓ Do you want to clean up test data? (Comment out the next line to keep test data)');
    // await cleanupTestData();
    
  } catch (error) {
    console.error('❌ Debug test failed:', error);
  }
}

// Run the debug tests
runDebugTests().then(() => {
  console.log('\n✅ Debug tests completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
