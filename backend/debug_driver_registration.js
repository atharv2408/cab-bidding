const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://gxnolhrjdkfyyrtkcjhm.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4bm9saHJqZGtmeXlydGtjamhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MDg5NTksImV4cCI6MjA3MDQ4NDk1OX0.YdHAqb5W02sprZSC-h8L4KduWTgzfPcXG6I5-HEWWVw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testDriverOperations() {
  console.log('🔍 Testing Driver Registration and Login Issues...\n');

  try {
    // Test 1: Check drivers table structure
    console.log('📋 1. Checking drivers table structure...');
    const { data: drivers, error: driversError } = await supabase
      .from('drivers')
      .select('*')
      .limit(1);
    
    if (driversError) {
      console.error('❌ Error fetching drivers:', driversError);
      return;
    }
    
    if (drivers.length > 0) {
      console.log('✅ Drivers table columns:', Object.keys(drivers[0]));
    } else {
      console.log('⚠️  No drivers found in table');
    }

    // Test 2: Try to register a test driver
    console.log('\n🔐 2. Testing driver authentication...');
    const testEmail = 'testdriver@example.com';
    const testPassword = 'testpass123';
    
    // First, clean up any existing test data
    const { data: existingAuth } = await supabase.auth.getUser();
    if (existingAuth.user) {
      await supabase.auth.signOut();
    }
    
    // Delete test driver if exists
    await supabase.from('drivers').delete().eq('email', testEmail);

    // Test registration process
    console.log('📝 Registering test driver in auth...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test Driver',
          phone: '+919999999999'
        }
      }
    });

    if (authError) {
      console.error('❌ Auth registration failed:', authError.message);
      return;
    }
    
    console.log('✅ Auth user created:', authData.user?.id);

    // Test driver record creation
    console.log('📝 Creating driver record in database...');
    const driverData = {
      name: 'Test Driver',
      phone: '+919999999999',
      email: testEmail,
      vehicle_type: 'sedan',
      vehicle_number: 'TEST123',
      license_number: 'DL123456789', // This field is missing from the schema!
      rating: 5.0,
      total_rides: 0,
      available: false,
      location: null
    };

    const { data: driverRecord, error: driverError } = await supabase
      .from('drivers')
      .insert([driverData])
      .select();

    if (driverError) {
      console.error('❌ Driver record creation failed:', driverError);
      console.log('🔍 Driver data being inserted:', driverData);
    } else {
      console.log('✅ Driver record created:', driverRecord[0]?.id);
    }

    // Test 3: Try to login with the registered driver
    console.log('\n🔓 3. Testing driver login...');
    
    // Sign out first
    await supabase.auth.signOut();
    
    // Sign in
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (loginError) {
      console.error('❌ Login failed:', loginError.message);
      return;
    }
    
    console.log('✅ Auth login successful:', loginData.user?.email);

    // Check if driver exists in drivers table
    const { data: allDrivers, error: getAllError } = await supabase
      .from('drivers')
      .select('*');
    
    if (getAllError) {
      console.error('❌ Error getting all drivers:', getAllError);
    } else {
      console.log('📊 Total drivers in database:', allDrivers.length);
      const driverRecord = allDrivers.find(d => d.email === testEmail);
      if (driverRecord) {
        console.log('✅ Driver record found:', driverRecord.id);
      } else {
        console.log('❌ Driver record NOT found for email:', testEmail);
        console.log('🔍 Available drivers:', allDrivers.map(d => ({email: d.email, id: d.id})));
      }
    }

    // Test 4: Check database schema vs code expectations
    console.log('\n📐 4. Checking schema compatibility...');
    const { data: schemaDrivers } = await supabase.from('drivers').select('*').limit(1);
    if (schemaDrivers && schemaDrivers.length > 0) {
      const schemaColumns = Object.keys(schemaDrivers[0]);
      const expectedColumns = ['name', 'phone', 'email', 'vehicle_type', 'vehicle_number', 'license_number', 'rating', 'total_rides', 'available', 'location'];
      
      console.log('📋 Schema columns:', schemaColumns);
      console.log('📋 Expected columns:', expectedColumns);
      
      const missingColumns = expectedColumns.filter(col => !schemaColumns.includes(col));
      if (missingColumns.length > 0) {
        console.log('❌ Missing columns:', missingColumns);
      } else {
        console.log('✅ All expected columns present');
      }
    }

  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

// Run the test
testDriverOperations()
  .then(() => {
    console.log('\n🏁 Driver registration test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });
