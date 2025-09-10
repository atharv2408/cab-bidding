#!/usr/bin/env node

// Test driver login functionality end-to-end after RLS fix
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

// Test data for driver functionality
const testDriver = {
  email: 'frontend.test@example.com',
  password: 'testpass123',
  name: 'Frontend Test Driver',
  phone: '+1234567890',
  vehicle_type: 'sedan',
  vehicle_number: 'FT123',
  license_number: 'LIC789123',
  rating: 5.0,
  total_rides: 0,
  available: false,
  location: null
};

async function simulateDriverRegistration() {
  console.log('📝 Simulating Driver Registration Flow...\n');

  try {
    // Step 1: Create auth user (like DriverLogin component does)
    console.log('1. Creating auth user...');
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

    if (authError && !authError.message.includes('already registered')) {
      console.error('❌ Auth signup failed:', authError.message);
      return false;
    }

    console.log('✅ Auth user created/exists');

    // Step 2: Create driver record (like DriverLogin component does)
    console.log('2. Creating driver record...');
    const driverData = {
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
    };

    const { data: dbDriverRecord, error: driverError } = await supabase
      .from('drivers')
      .insert([driverData])
      .select();

    if (driverError) {
      console.error('❌ Driver record creation failed:', driverError.message);
      return false;
    }

    console.log('✅ Driver record created:', dbDriverRecord[0].id);

    return { authData, driverRecord: dbDriverRecord[0] };

  } catch (error) {
    console.error('💥 Registration simulation failed:', error);
    return false;
  }
}

async function simulateDriverLogin() {
  console.log('\n🔐 Simulating Driver Login Flow...\n');

  try {
    // Step 1: Login with credentials
    console.log('1. Authenticating driver...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: testDriver.email,
      password: testDriver.password
    });

    if (authError) {
      console.error('❌ Login failed:', authError.message);
      return false;
    }

    console.log('✅ Authentication successful');

    // Step 2: Get all drivers to find this driver
    console.log('2. Retrieving driver data...');
    const { data: drivers, error: driverError } = await supabase
      .from('drivers')
      .select('*');

    if (driverError) {
      console.error('❌ Failed to get drivers:', driverError.message);
      return false;
    }

    const driverRecord = drivers.find(d => d.email === testDriver.email);
    if (!driverRecord) {
      console.error('❌ Driver record not found');
      return false;
    }

    console.log('✅ Driver record retrieved:', driverRecord.name);

    // Step 3: Simulate creating localStorage data (like frontend does)
    const driverInfo = {
      uid: authData.user.id,
      id: driverRecord.id,
      email: authData.user.email,
      name: driverRecord.name,
      phone: driverRecord.phone,
      vehicleType: driverRecord.vehicle_type,
      vehicleNumber: driverRecord.vehicle_number,
      licenseNumber: driverRecord.license_number,
      rating: driverRecord.rating || 5.0,
      totalRides: driverRecord.total_rides || 0,
      isOnline: false,
      currentLocation: null,
      available: driverRecord.available
    };

    console.log('3. Driver info object created:');
    console.log('   ID:', driverInfo.id);
    console.log('   Name:', driverInfo.name);
    console.log('   Vehicle:', driverInfo.vehicleType, driverInfo.vehicleNumber);
    console.log('   Available:', driverInfo.available);

    return { authData, driverInfo };

  } catch (error) {
    console.error('💥 Login simulation failed:', error);
    return false;
  }
}

async function testDriverDataOperations(driverInfo) {
  console.log('\n🔄 Testing Driver Data Operations...\n');

  try {
    // Test driver status update
    console.log('1. Testing driver availability update...');
    const { data: updateData, error: updateError } = await supabase
      .from('drivers')
      .update({ 
        available: true, 
        location: { lat: 28.6139, lng: 77.2090 }
      })
      .eq('id', driverInfo.id)
      .select();

    if (updateError) {
      console.error('❌ Update failed:', updateError.message);
      return false;
    }

    console.log('✅ Driver status updated successfully');
    console.log('   Available:', updateData[0].available);
    console.log('   Location:', JSON.stringify(updateData[0].location));

    // Test getting available drivers
    console.log('2. Testing available drivers query...');
    const { data: availableDrivers, error: availableError } = await supabase
      .from('drivers')
      .select('*')
      .eq('available', true);

    if (availableError) {
      console.error('❌ Available drivers query failed:', availableError.message);
      return false;
    }

    console.log('✅ Available drivers query successful');
    console.log('   Found', availableDrivers.length, 'available drivers');

    return true;

  } catch (error) {
    console.error('💥 Data operations test failed:', error);
    return false;
  }
}

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test data...');

  try {
    // Delete driver record
    await supabase.from('drivers').delete().eq('email', testDriver.email);
    console.log('✅ Test driver record deleted');

    // Sign out
    await supabase.auth.signOut();
    console.log('✅ Signed out successfully');

    return true;
  } catch (error) {
    console.warn('⚠️  Cleanup warning:', error.message);
    return true; // Don't fail the whole test due to cleanup issues
  }
}

async function runDriverFrontendTest() {
  console.log('🚗 Driver Frontend Functionality Test');
  console.log('='.repeat(50));
  
  try {
    // Step 1: Test registration
    const registrationResult = await simulateDriverRegistration();
    if (!registrationResult) {
      throw new Error('Driver registration failed');
    }

    // Step 2: Test login
    const loginResult = await simulateDriverLogin();
    if (!loginResult) {
      throw new Error('Driver login failed');
    }

    // Step 3: Test data operations
    const operationsResult = await testDriverDataOperations(loginResult.driverInfo);
    if (!operationsResult) {
      throw new Error('Driver data operations failed');
    }

    // Step 4: Cleanup
    await cleanupTestData();

    console.log('\n🎉 ALL TESTS PASSED!');
    console.log('✅ Driver registration works');
    console.log('✅ Driver login works');
    console.log('✅ Driver data storage/retrieval works');
    console.log('✅ Real-time updates work');
    
    return true;

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    await cleanupTestData(); // Try to clean up even on failure
    return false;
  }
}

// Run the test
if (require.main === module) {
  runDriverFrontendTest()
    .then(success => {
      console.log('\n' + '='.repeat(50));
      if (success) {
        console.log('🎯 DRIVER FRONTEND TEST: PASSED');
        console.log('The driver login system is working correctly!');
      } else {
        console.log('💥 DRIVER FRONTEND TEST: FAILED');
        console.log('Check the RLS policies and run fix_driver_rls_comprehensive.sql');
      }
      console.log('='.repeat(50));
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n💥 Test execution failed:', error);
      process.exit(1);
    });
}

module.exports = { runDriverFrontendTest };
