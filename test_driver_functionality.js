#!/usr/bin/env node

// Test Driver Login and Data Storage Functionality
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Test data
const testDriver = {
  email: 'testdriver@example.com',
  password: 'testpass123',
  name: 'Test Driver',
  phone: '+1234567890',
  vehicle_type: 'sedan',
  vehicle_number: 'TEST123',
  license_number: 'LIC123456',
  rating: 5.0,
  total_rides: 0,
  available: false,
  location: null
};

async function testDriverFunctionality() {
  console.log('🔍 Testing Driver Login and Data Storage Functionality\n');
  
  try {
    // Step 1: Clean up any existing test data
    console.log('🧹 Cleaning up existing test data...');
    try {
      await supabase.from('drivers').delete().eq('email', testDriver.email);
      await supabase.auth.admin.deleteUser('testdriver@example.com');
    } catch (error) {
      console.log('⚠️  Cleanup warning (expected if no existing data)');
    }
    
    // Step 2: Test driver registration
    console.log('\n📝 Testing Driver Registration...');
    
    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testDriver.email,
      password: testDriver.password,
      options: {
        data: {
          full_name: testDriver.name,
          phone: testDriver.phone
        }
      }
    });
    
    if (authError) {
      console.error('❌ Auth registration failed:', authError.message);
      if (!authError.message.includes('already registered')) {
        return false;
      } else {
        console.log('ℹ️  User already exists, proceeding with login test...');
      }
    } else {
      console.log('✅ Auth user created successfully');
    }
    
    // Create driver record
    const { data: driverData, error: driverError } = await supabase
      .from('drivers')
      .insert([{
        name: testDriver.name,
        phone: testDriver.phone,
        email: testDriver.email,
        vehicle_type: testDriver.vehicle_type,
        vehicle_number: testDriver.vehicle_number,
        license_number: testDriver.license_number,
        rating: testDriver.rating,
        total_rides: testDriver.total_rides,
        available: testDriver.available,
        location: testDriver.location
      }])
      .select();
    
    if (driverError) {
      console.error('❌ Driver record creation failed:', driverError.message);
      return false;
    }
    
    const createdDriver = driverData[0];
    console.log('✅ Driver record created with ID:', createdDriver.id);
    
    // Step 3: Test driver login
    console.log('\n🔐 Testing Driver Login...');
    
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: testDriver.email,
      password: testDriver.password
    });
    
    if (loginError) {
      console.error('❌ Driver login failed:', loginError.message);
      return false;
    }
    
    console.log('✅ Driver login successful');
    console.log('   User ID:', loginData.user.id);
    console.log('   Email:', loginData.user.email);
    
    // Step 4: Test driver data retrieval
    console.log('\n📊 Testing Driver Data Retrieval...');
    
    // Get all drivers
    const { data: allDrivers, error: getAllError } = await supabase
      .from('drivers')
      .select('*');
    
    if (getAllError) {
      console.error('❌ Failed to get all drivers:', getAllError.message);
      return false;
    }
    
    console.log('✅ Retrieved', allDrivers.length, 'drivers from database');
    
    // Find test driver
    const retrievedDriver = allDrivers.find(d => d.email === testDriver.email);
    if (!retrievedDriver) {
      console.error('❌ Test driver not found in retrieved data');
      return false;
    }
    
    console.log('✅ Test driver found:', retrievedDriver.name);
    
    // Step 5: Test driver update
    console.log('\n🔄 Testing Driver Update...');
    
    const updateData = { available: true, location: { lat: 28.6139, lng: 77.2090 } };
    const { data: updatedDriver, error: updateError } = await supabase
      .from('drivers')
      .update(updateData)
      .eq('id', retrievedDriver.id)
      .select();
    
    if (updateError) {
      console.error('❌ Driver update failed:', updateError.message);
      return false;
    }
    
    console.log('✅ Driver updated successfully');
    console.log('   Available:', updatedDriver[0].available);
    console.log('   Location:', JSON.stringify(updatedDriver[0].location));
    
    // Step 6: Test real-time subscription (basic test)
    console.log('\n⚡ Testing Real-time Subscription...');
    
    const subscription = supabase
      .channel('drivers')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'drivers' }, 
        (payload) => {
          console.log('📡 Real-time update received:', payload.eventType);
        }
      )
      .subscribe();
    
    // Wait a moment to ensure subscription is active
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Make another update to test real-time
    await supabase
      .from('drivers')
      .update({ rating: 4.9 })
      .eq('id', retrievedDriver.id);
    
    // Wait to see if we receive the real-time update
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Clean up subscription
    supabase.removeChannel(subscription);
    console.log('✅ Real-time subscription test completed');
    
    // Step 7: Test driver logout
    console.log('\n🚪 Testing Driver Logout...');
    
    const { error: logoutError } = await supabase.auth.signOut();
    if (logoutError) {
      console.error('❌ Logout failed:', logoutError.message);
      return false;
    }
    
    console.log('✅ Driver logout successful');
    
    // Step 8: Final cleanup
    console.log('\n🧹 Cleaning up test data...');
    
    // Re-login as admin or service user to delete data
    await supabase.auth.signInWithPassword({
      email: testDriver.email,
      password: testDriver.password
    });
    
    await supabase.from('drivers').delete().eq('email', testDriver.email);
    console.log('✅ Test driver data cleaned up');
    
    console.log('\n🎉 All Driver Functionality Tests Passed!');
    return true;
    
  } catch (error) {
    console.error('💥 Unexpected error during testing:', error);
    return false;
  }
}

// Run the test
if (require.main === module) {
  testDriverFunctionality()
    .then(success => {
      if (success) {
        console.log('\n✅ Driver functionality is working correctly');
        process.exit(0);
      } else {
        console.log('\n❌ Driver functionality has issues');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('\n💥 Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { testDriverFunctionality };
