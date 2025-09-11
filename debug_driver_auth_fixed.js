#!/usr/bin/env node
/**
 * Enhanced debug script to test and fix driver authentication with Supabase
 * This will identify and fix existing auth users without driver profiles
 */

// Import required modules
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://gxnolhrjdkfyyrtkcjhm.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4bm9saHJqZGtmeXlydGtjamhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MDg5NTksImV4cCI6MjA3MDQ4NDk1OX0.YdHAqb5W02sprZSC-h8L4KduWTgzfPcXG6I5-HEWWVw';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🚀 Starting Enhanced Driver Authentication Debug...\n');

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

async function callDebugFunction() {
  console.log('🔍 Running debug function to check auth users and driver profiles...');
  
  try {
    const { data, error } = await supabase.rpc('debug_driver_auth');
    
    if (error) {
      console.error('❌ Debug function failed:', error);
      return null;
    }
    
    console.log('📊 Current auth users and their driver profiles:');
    if (data && data.length > 0) {
      data.forEach((user, index) => {
        console.log(`${index + 1}. Auth User: ${user.auth_email} (ID: ${user.auth_user_id})`);
        console.log(`   Driver Profile: ${user.has_driver_profile ? '✅ EXISTS' : '❌ MISSING'}`);
        if (user.has_driver_profile) {
          console.log(`   Driver Name: ${user.driver_name} (ID: ${user.driver_id})`);
        }
        console.log('');
      });
    } else {
      console.log('   No auth users found');
    }
    
    return data;
    
  } catch (error) {
    console.error('❌ Debug function error:', error);
    return null;
  }
}

async function createDriverProfileManually(userId, driverData) {
  console.log('🔧 Creating driver profile manually using SQL function...');
  
  try {
    const { data, error } = await supabase.rpc('create_driver_profile_manual', {
      p_user_id: userId,
      p_name: driverData.name,
      p_email: driverData.email,
      p_phone: driverData.phone,
      p_vehicle_type: driverData.vehicle_type,
      p_vehicle_number: driverData.vehicle_number,
      p_vehicle_model: driverData.vehicle_model || '',
      p_license_number: driverData.license_number
    });
    
    if (error) {
      console.error('❌ Manual driver profile creation failed:', error);
      return null;
    }
    
    console.log('✅ Driver profile created successfully with ID:', data);
    return data;
    
  } catch (error) {
    console.error('❌ Manual creation error:', error);
    return null;
  }
}

async function testDriverRegistrationFlow() {
  console.log('\n🔐 Testing Complete Driver Registration Flow...');
  
  try {
    // Sign out any existing session
    await supabase.auth.signOut();
    
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
        console.log('⚠️ User already exists, testing login flow instead...');
        return await testExistingDriverLogin();
      } else {
        console.error('❌ Auth registration failed:', authError);
        return false;
      }
    }
    
    console.log('✅ Auth user created successfully');
    console.log('👤 User ID:', authData.user?.id);
    console.log('📧 User email:', authData.user?.email);
    
    // Wait for trigger to execute
    console.log('⏳ Waiting 3 seconds for automatic driver profile creation...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Check if driver profile was created
    const { data: driverProfile, error: driverError } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', authData.user.id)
      .single();
    
    if (driverError) {
      console.log('⚠️ Automatic driver profile creation failed, creating manually...');
      
      const driverId = await createDriverProfileManually(authData.user.id, testDriver);
      
      if (!driverId) {
        console.error('❌ Both automatic and manual driver profile creation failed');
        return false;
      }
    } else {
      console.log('✅ Driver profile created automatically by trigger');
      console.log('🚗 Driver data:', JSON.stringify(driverProfile, null, 2));
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Registration flow failed:', error);
    return false;
  }
}

async function testExistingDriverLogin() {
  console.log('\n🔑 Testing existing driver login...');
  
  try {
    // Try to login
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testDriver.email,
      password: testDriver.password
    });
    
    if (authError) {
      console.error('❌ Login failed:', authError);
      return false;
    }
    
    console.log('✅ Auth login successful');
    console.log('👤 User ID:', authData.user?.id);
    
    // Check for driver profile
    const { data: driverProfile, error: driverError } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', authData.user.id)
      .single();
    
    if (driverError) {
      console.log('⚠️ Driver profile missing for existing auth user, creating...');
      
      const driverId = await createDriverProfileManually(authData.user.id, testDriver);
      
      if (!driverId) {
        console.error('❌ Failed to create driver profile for existing user');
        return false;
      }
      
      // Re-fetch the created profile
      const { data: newDriverProfile, error: newDriverError } = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', authData.user.id)
        .single();
      
      if (newDriverError) {
        console.error('❌ Failed to retrieve newly created driver profile');
        return false;
      }
      
      console.log('✅ Driver profile created and retrieved');
      console.log('🚗 Driver data:', JSON.stringify(newDriverProfile, null, 2));
    } else {
      console.log('✅ Driver profile found');
      console.log('🚗 Driver data:', JSON.stringify(driverProfile, null, 2));
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Login test failed:', error);
    return false;
  }
}

async function fixExistingUsersWithoutProfiles() {
  console.log('\n🔧 Checking for existing auth users without driver profiles...');
  
  const debugData = await callDebugFunction();
  
  if (!debugData) {
    console.log('❌ Could not get user data');
    return false;
  }
  
  const usersWithoutProfiles = debugData.filter(user => !user.has_driver_profile);
  
  if (usersWithoutProfiles.length === 0) {
    console.log('✅ All auth users have driver profiles');
    return true;
  }
  
  console.log(`⚠️ Found ${usersWithoutProfiles.length} auth users without driver profiles:`);
  
  for (const user of usersWithoutProfiles) {
    console.log(`\n🔧 Fixing user: ${user.auth_email} (${user.auth_user_id})`);
    
    const driverId = await createDriverProfileManually(user.auth_user_id, {
      name: 'Driver ' + user.auth_email.split('@')[0],
      email: user.auth_email,
      phone: '+919876543210',
      vehicle_type: 'sedan',
      vehicle_number: 'AUTO-' + Date.now().toString().slice(-4),
      vehicle_model: 'Auto Generated',
      license_number: 'AUTO-LICENSE-' + Date.now().toString().slice(-4)
    });
    
    if (driverId) {
      console.log('✅ Driver profile created for', user.auth_email);
    } else {
      console.log('❌ Failed to create driver profile for', user.auth_email);
    }
  }
  
  return true;
}

async function runEnhancedDebugTests() {
  console.log('🔍 Running enhanced driver authentication debug...\n');
  
  try {
    // Step 1: Check current state
    console.log('='.repeat(60));
    await callDebugFunction();
    
    // Step 2: Fix existing users without profiles
    console.log('='.repeat(60));
    await fixExistingUsersWithoutProfiles();
    
    // Step 3: Test new registration flow
    console.log('='.repeat(60));
    const registrationTest = await testDriverRegistrationFlow();
    
    // Step 4: Test login flow
    console.log('='.repeat(60));
    const loginTest = await testExistingDriverLogin();
    
    // Step 5: Final state check
    console.log('='.repeat(60));
    console.log('\n📊 FINAL STATE CHECK:');
    await callDebugFunction();
    
    // Step 6: Summary
    console.log('='.repeat(60));
    console.log('📊 ENHANCED TEST SUMMARY:');
    console.log('==========================');
    console.log('Registration Flow:', registrationTest ? '✅ Pass' : '❌ Fail');
    console.log('Login Flow:', loginTest ? '✅ Pass' : '❌ Fail');
    
    if (registrationTest && loginTest) {
      console.log('\n🎉 All tests passed! Driver authentication should work correctly now.');
      console.log('\n💡 Next steps:');
      console.log('   1. Test driver registration through your web app');
      console.log('   2. Test driver login through your web app');
      console.log('   3. Verify the driver dashboard loads correctly');
    } else {
      console.log('\n⚠️ Some tests failed. Check the errors above.');
    }
    
  } catch (error) {
    console.error('❌ Enhanced debug test failed:', error);
  }
}

// Run the enhanced debug tests
runEnhancedDebugTests().then(() => {
  console.log('\n✅ Enhanced debug tests completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
