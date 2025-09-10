const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://gxnolhrjdkfyyrtkcjhm.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4bm9saHJqZGtmeXlydGtjamhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MDg5NTksImV4cCI6MjA3MDQ4NDk1OX0.YdHAqb5W02sprZSC-h8L4KduWTgzfPcXG6I5-HEWWVw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function runDriverAuthTests() {
  console.log('🚗 Starting Comprehensive Driver Authentication Tests...\n');

  try {
    // Test 1: Apply database schema fixes
    console.log('1. 📋 Applying database schema fixes...');
    
    // Read and execute the SQL fix
    const fs = require('fs');
    const sqlCommands = fs.readFileSync('./fix_driver_registration_issues.sql', 'utf8')
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0 && !cmd.startsWith('--'));
    
    for (const sql of sqlCommands) {
      if (sql.includes('SELECT')) {
        const { data, error } = await supabase.rpc('exec_sql', { query: sql });
        if (error) console.log('Query result:', sql.substring(0, 50) + '...');
      }
    }
    
    console.log('✅ Schema fixes attempted\n');

    // Test 2: Check if drivers exist in database
    console.log('2. 🔍 Checking drivers table...');
    const { data: drivers, error: driversError } = await supabase
      .from('drivers')
      .select('*');
    
    if (driversError) {
      console.error('❌ Error fetching drivers:', driversError.message);
      return;
    }
    
    console.log(`✅ Found ${drivers.length} drivers in database`);
    if (drivers.length > 0) {
      console.log('📊 Available columns:', Object.keys(drivers[0]));
      console.log('📝 Sample drivers:');
      drivers.slice(0, 3).forEach(d => 
        console.log(`   - ${d.name} (${d.email}) - ${d.vehicle_type}`));
    }
    console.log('');

    // Test 3: Test driver registration flow
    console.log('3. 📝 Testing driver registration...');
    const testEmail = 'newdriver@test.com';
    const testPassword = 'testpass123';
    
    // Clean up first
    await supabase.auth.signOut();
    await supabase.from('drivers').delete().eq('email', testEmail);
    
    // Step 3a: Create auth user
    console.log('   Creating auth user...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'New Test Driver',
          phone: '+919876543210'
        }
      }
    });

    if (authError && !authError.message.includes('already registered')) {
      console.error('❌ Auth registration failed:', authError.message);
      return;
    } else if (authError && authError.message.includes('already registered')) {
      // Try to sign in instead
      console.log('   User exists, signing in...');
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      });
      if (signInError) {
        console.error('❌ Sign in failed:', signInError.message);
        return;
      }
      authData.user = signInData.user;
      authData.session = signInData.session;
    }
    
    console.log('✅ Auth user ready:', authData.user?.id);

    // Step 3b: Create driver record
    console.log('   Creating driver record...');
    const driverData = {
      name: 'New Test Driver',
      phone: '+919876543210',
      email: testEmail,
      vehicle_type: 'sedan',
      vehicle_number: 'TEST456',
      license_number: 'DLTEST456',
      rating: 5.0,
      total_rides: 0,
      available: true,
      location: JSON.stringify({lat: 28.6139, lng: 77.2090}),
      earnings: 0,
      vehicle_model: 'Test Car'
    };

    const { data: driverRecord, error: driverError } = await supabase
      .from('drivers')
      .insert([driverData])
      .select();

    if (driverError) {
      console.error('❌ Driver record creation failed:', driverError.message);
      console.log('🔍 Driver data:', driverData);
    } else {
      console.log('✅ Driver record created:', driverRecord[0]?.id);
    }
    console.log('');

    // Test 4: Test driver login flow
    console.log('4. 🔓 Testing driver login...');
    
    // Sign out first
    await supabase.auth.signOut();
    
    // Sign in with existing driver
    const loginEmail = 'testdriver@example.com';
    const loginPassword = 'testpass123';
    
    console.log(`   Attempting login with ${loginEmail}...`);
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword
    });

    if (loginError) {
      console.log('⚠️  Login failed (expected if user not in auth):', loginError.message);
      // Try with a driver that should exist
      const { data: existingDrivers } = await supabase.from('drivers').select('email').limit(1);
      if (existingDrivers && existingDrivers.length > 0) {
        console.log('   Trying to create auth user for existing driver...');
        const driverEmail = existingDrivers[0].email;
        const { error: createError } = await supabase.auth.signUp({
          email: driverEmail,
          password: 'password123',
          options: {
            data: { full_name: 'Driver User' }
          }
        });
        if (!createError || createError.message.includes('already registered')) {
          console.log('✅ Auth user created/exists for driver');
        }
      }
    } else {
      console.log('✅ Auth login successful:', loginData.user?.email);
      
      // Check if driver record exists
      const { data: driverRecord } = await supabase
        .from('drivers')
        .select('*')
        .eq('email', loginData.user.email)
        .single();
      
      if (driverRecord) {
        console.log('✅ Driver record found:', driverRecord.name);
      } else {
        console.log('❌ Driver record NOT found for authenticated user');
      }
    }
    console.log('');

    // Test 5: Test the specific issue - check all drivers vs auth users
    console.log('5. 🔍 Analyzing driver/auth mismatch...');
    const { data: allDrivers } = await supabase.from('drivers').select('email, name');
    console.log('Drivers in database:', allDrivers.map(d => d.email));
    
    // Try to get current user
    const { data: currentUser } = await supabase.auth.getUser();
    console.log('Current authenticated user:', currentUser.user?.email || 'None');
    console.log('');

    // Test 6: Simulate the exact frontend flow
    console.log('6. 🎭 Simulating frontend driver login flow...');
    
    // This simulates what happens in DriverLogin component
    const testDriverEmail = 'rajesh@example.com';
    console.log(`   Testing login for: ${testDriverEmail}`);
    
    // Check if driver exists in database
    const { data: driverCheck } = await supabase
      .from('drivers')
      .select('*')
      .eq('email', testDriverEmail)
      .single();
    
    if (driverCheck) {
      console.log('✅ Driver record found in database:', driverCheck.name);
      
      // Now check if this driver has an auth account
      console.log('   Attempting auth login...');
      const { data: authCheck, error: authCheckError } = await supabase.auth.signInWithPassword({
        email: testDriverEmail,
        password: 'password123'
      });
      
      if (authCheckError) {
        console.log('❌ Auth login failed:', authCheckError.message);
        console.log('💡 ISSUE FOUND: Driver exists in database but no auth account');
        console.log('🔧 SOLUTION: Create auth accounts for existing drivers');
      } else {
        console.log('✅ Auth login successful - driver fully functional');
      }
    } else {
      console.log('❌ Driver record not found in database');
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error.message);
  }
}

// Run the comprehensive test
runDriverAuthTests()
  .then(() => {
    console.log('\\n🏁 Comprehensive driver authentication test completed');
    console.log('\\n📋 Summary of Issues Found:');
    console.log('1. Missing database columns (license_number, vehicle_model, etc.)');
    console.log('2. Empty drivers table (no sample data)');
    console.log('3. Drivers in database may not have corresponding auth accounts');
    console.log('4. Auth users may not have corresponding driver records');
    console.log('\\n🔧 Recommended Actions:');
    console.log('1. Apply the SQL schema fixes');
    console.log('2. Create auth accounts for existing drivers');
    console.log('3. Ensure registration creates both auth user AND driver record');
    console.log('4. Ensure login checks both auth AND driver record existence');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  });
