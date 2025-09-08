// Populate sample data for testing
require('dotenv').config();

async function populateSampleData() {
  try {
    console.log('🚀 Populating sample data for testing...');
    
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.REACT_APP_SUPABASE_URL,
      process.env.REACT_APP_SUPABASE_ANON_KEY
    );
    
    // 1. Insert sample drivers
    console.log('\n👥 Inserting sample drivers...');
    const { data: drivers, error: driversError } = await supabase
      .from('drivers')
      .insert([
        {
          email: 'rajesh.driver@example.com',
          phone: '+919876543220',
          name: 'Rajesh Kumar',
          vehicle_type: 'Hatchback',
          vehicle_number: 'DL01AB1234',
          vehicle_model: 'Maruti Swift',
          license_number: 'DL1234567890',
          location: { lat: 28.6139, lng: 77.2090 },
          rating: 4.7,
          total_rides: 152,
          available: true
        },
        {
          email: 'priya.driver@example.com',
          phone: '+919876543221',
          name: 'Priya Singh',
          vehicle_type: 'Sedan',
          vehicle_number: 'DL02CD5678',
          vehicle_model: 'Honda City',
          license_number: 'DL1234567891',
          location: { lat: 28.6219, lng: 77.2085 },
          rating: 4.9,
          total_rides: 203,
          available: true
        },
        {
          email: 'amit.driver@example.com',
          phone: '+919876543222',
          name: 'Amit Sharma',
          vehicle_type: 'SUV',
          vehicle_number: 'DL03EF9012',
          vehicle_model: 'Mahindra XUV',
          license_number: 'DL1234567892',
          location: { lat: 28.6129, lng: 77.2295 },
          rating: 4.5,
          total_rides: 89,
          available: true
        }
      ])
      .select();
    
    if (driversError) {
      console.log('❌ Failed to insert drivers:', driversError);
    } else {
      console.log('✅ Sample drivers inserted:', drivers.length);
    }
    
    // 2. Insert a test customer user
    console.log('\n👤 Inserting test customer...');
    const { data: users, error: usersError } = await supabase
      .from('users')
      .insert([
        {
          email: 'test.customer@example.com',
          full_name: 'Test Customer',
          phone: '+919876543200',
          user_type: 'customer'
        }
      ])
      .select();
    
    if (usersError) {
      console.log('❌ Failed to insert test user:', usersError);
    } else {
      console.log('✅ Test customer inserted');
    }
    
    // 3. Verify sample data
    console.log('\n🔍 Verifying sample data...');
    const { data: allDrivers, error: verifyError } = await supabase
      .from('drivers')
      .select('name, vehicle_type, rating, total_rides')
      .limit(10);
    
    if (verifyError) {
      console.log('❌ Failed to verify data:', verifyError);
    } else {
      console.log('✅ Sample drivers verified:', allDrivers.length);
      allDrivers.forEach(driver => {
        console.log(`   - ${driver.name} (${driver.vehicle_type}, ${driver.rating}⭐, ${driver.total_rides} rides)`);
      });
    }
    
    console.log('\n🎉 Sample data population complete!');
    
  } catch (error) {
    console.error('❌ Sample data population failed:', error);
  }
}

populateSampleData();
