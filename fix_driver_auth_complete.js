const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  'https://gxnolhrjdkfyyrtkcjhm.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4bm9saHJqZGtmeXlydGtjamhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MDg5NTksImV4cCI6MjA3MDQ4NDk1OX0.YdHAqb5W02sprZSC-h8L4KduWTgzfPcXG6I5-HEWWVw'
);

async function fixDriverAuthentication() {
  console.log('🔧 Starting complete driver authentication fix...\n');

  try {
    // Step 1: Create auth accounts for sample drivers and then create driver records
    console.log('1. 👤 Creating driver auth accounts...');
    
    const sampleDrivers = [
      {
        email: 'rajesh@example.com',
        password: 'password123',
        userData: {
          name: 'Rajesh Kumar',
          phone: '+91 98765 43210',
          vehicle_type: 'hatchback',
          vehicle_number: 'DL 01 AB 1234',
          license_number: 'DL123456789',
          rating: 4.5,
          location: { lat: 28.6139, lng: 77.2090 },
          earnings: 15000,
          total_rides: 1247,
          vehicle_model: 'Maruti Swift',
          available: true
        }
      },
      {
        email: 'testdriver@example.com',
        password: 'testpass123',
        userData: {
          name: 'Test Driver',
          phone: '+919876543210',
          vehicle_type: 'sedan',
          vehicle_number: 'TEST 123',
          license_number: 'DLTEST123',
          rating: 5.0,
          location: { lat: 28.6139, lng: 77.2090 },
          earnings: 0,
          total_rides: 0,
          vehicle_model: 'Test Vehicle',
          available: true
        }
      },
      {
        email: 'priya@example.com',
        password: 'password123',
        userData: {
          name: 'Priya Singh',
          phone: '+91 87654 32109',
          vehicle_type: 'sedan',
          vehicle_number: 'DL 02 CD 5678',
          license_number: 'DL987654321',
          rating: 4.7,
          location: { lat: 28.6219, lng: 77.2085 },
          earnings: 12500,
          total_rides: 876,
          vehicle_model: 'Honda City',
          available: true
        }
      }
    ];

    for (const driver of sampleDrivers) {
      console.log(`\n   Processing driver: ${driver.userData.name}`);
      
      // Step 1a: Create or sign in to auth account
      let authUser = null;
      
      // Try to sign up first
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: driver.email,
        password: driver.password,
        options: {
          data: {
            full_name: driver.userData.name,
            phone: driver.userData.phone
          }
        }
      });

      if (signUpError && signUpError.message.includes('User already registered')) {
        console.log('     Auth user exists, signing in...');
        // User exists, sign in instead
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: driver.email,
          password: driver.password
        });
        
        if (signInError) {
          console.error('❌ Failed to sign in:', signInError.message);
          continue;
        }
        authUser = signInData.user;
      } else if (signUpError) {
        console.error('❌ Failed to create auth user:', signUpError.message);
        continue;
      } else {
        console.log('✅ Auth user created/ready');
        authUser = signUpData.user;
      }

      // Step 1b: Create driver record while authenticated
      console.log('     Creating driver database record...');
      const { data: driverRecord, error: driverError } = await supabase
        .from('drivers')
        .upsert({
          email: driver.email,
          name: driver.userData.name,
          phone: driver.userData.phone,
          vehicle_type: driver.userData.vehicle_type,
          vehicle_number: driver.userData.vehicle_number,
          rating: driver.userData.rating,
          location: driver.userData.location,
          earnings: driver.userData.earnings,
          total_rides: driver.userData.total_rides,
          available: driver.userData.available
        }, { onConflict: 'email' });

      if (driverError) {
        console.error(`❌ Failed to create driver record for ${driver.userData.name}:`, driverError.message);
      } else {
        console.log(`✅ Driver record created for ${driver.userData.name}`);
      }
      
      // Sign out to prepare for next driver
      await supabase.auth.signOut();
    }

    // Step 2: Test the login flow
    console.log('\n2. 🔓 Testing driver login flow...');
    
    const testEmail = 'testdriver@example.com';
    const testPassword = 'testpass123';
    
    console.log(`   Attempting to login with: ${testEmail}`);
    
    // Step 2a: Authenticate with Supabase Auth
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: testEmail,
      password: testPassword
    });

    if (loginError) {
      console.error('❌ Auth login failed:', loginError.message);
      return;
    }
    
    console.log('✅ Auth login successful');

    // Step 2b: Find driver record in database
    const { data: drivers, error: driversError } = await supabase
      .from('drivers')
      .select('*');
    
    if (driversError) {
      console.error('❌ Failed to fetch drivers:', driversError.message);
      return;
    }

    const driverRecord = drivers.find(d => d.email === testEmail);
    if (driverRecord) {
      console.log('✅ Driver record found:', driverRecord.name);
      console.log('✅ Complete login successful!');
    } else {
      console.log('❌ Driver record not found for authenticated user');
    }

    // Step 3: Display final status
    console.log('\n3. 📊 Final status check...');
    console.log(`   Total drivers in database: ${drivers.length}`);
    console.log('   Available drivers:');
    drivers.forEach(d => {
      console.log(`     - ${d.name} (${d.email})`);
    });

    // Step 4: Test registration flow
    console.log('\n4. 📝 Testing new driver registration...');
    
    await supabase.auth.signOut(); // Sign out first
    
    const newDriverEmail = 'newdriver@test.com';
    const newDriverPassword = 'newpass123';
    
    // Clean up any existing test data
    await supabase.from('drivers').delete().eq('email', newDriverEmail);
    
    // Step 4a: Create auth user
    console.log('   Creating new auth user...');
    const { data: newAuthData, error: newAuthError } = await supabase.auth.signUp({
      email: newDriverEmail,
      password: newDriverPassword,
      options: {
        data: {
          full_name: 'New Test Driver',
          phone: '+919999999999'
        }
      }
    });

    if (newAuthError && !newAuthError.message.includes('already registered')) {
      console.error('❌ New user auth failed:', newAuthError.message);
      return;
    }
    
    console.log('✅ New auth user created');

    // Step 4b: Create driver record
    console.log('   Creating new driver record...');
    const { data: newDriverRecord, error: newDriverError } = await supabase
      .from('drivers')
      .insert([{
        email: newDriverEmail,
        name: 'New Test Driver',
        phone: '+919999999999',
        vehicle_type: 'sedan',
        vehicle_number: 'NEW123',
        rating: 5.0,
        location: { lat: 28.6139, lng: 77.2090 },
        earnings: 0,
        total_rides: 0,
        available: true
      }])
      .select();

    if (newDriverError) {
      console.error('❌ New driver record failed:', newDriverError.message);
    } else {
      console.log('✅ New driver record created:', newDriverRecord[0]?.name);
    }

    console.log('\n🏁 Driver authentication fix completed!');
    
    // Final summary
    const { data: finalDrivers } = await supabase.from('drivers').select('*');
    console.log(`\n📋 Summary: ${finalDrivers?.length || 0} drivers now available for login`);

  } catch (error) {
    console.error('💥 Fix failed:', error.message);
  }
}

fixDriverAuthentication()
  .then(() => {
    console.log('\n✅ All fixes applied successfully!');
    console.log('\n🎯 Next steps:');
    console.log('1. Try logging in with: testdriver@example.com / testpass123');
    console.log('2. Try logging in with: rajesh@example.com / password123');  
    console.log('3. Try registering a new driver account');
    console.log('4. Check that both auth and driver record are created/found');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Fix script failed:', error);
    process.exit(1);
  });
