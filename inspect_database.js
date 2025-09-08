// Inspect the actual database schema
require('dotenv').config();

async function inspectDatabase() {
  try {
    console.log('🔍 Inspecting current database structure...');
    
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.REACT_APP_SUPABASE_URL,
      process.env.REACT_APP_SUPABASE_ANON_KEY
    );
    
    // Test auth users table
    console.log('\n1. Checking Supabase Auth users...');
    const { data: authUsers, error: authError } = await supabase.auth.getSession();
    console.log('Auth session check:', authError ? 'Error: ' + authError.message : 'Working');
    
    // Test users table and see what columns exist
    console.log('\n2. Testing users table structure...');
    try {
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .limit(1);
      
      if (usersError) {
        console.log('Users table error:', usersError);
      } else {
        console.log('Users table accessible. Sample record:', usersData[0] || 'No records');
      }
    } catch (err) {
      console.log('Users table access error:', err.message);
    }
    
    // Test drivers table
    console.log('\n3. Testing drivers table structure...');
    try {
      const { data: driversData, error: driversError } = await supabase
        .from('drivers')
        .select('*')
        .limit(1);
      
      if (driversError) {
        console.log('Drivers table error:', driversError);
      } else {
        console.log('Drivers table accessible. Sample record:', driversData[0] || 'No records');
      }
    } catch (err) {
      console.log('Drivers table access error:', err.message);
    }
    
    // Try to insert a simple driver record with minimal fields
    console.log('\n4. Testing minimal driver insert...');
    try {
      const { data: insertData, error: insertError } = await supabase
        .from('drivers')
        .insert({
          name: 'Test Driver',
          vehicle_type: 'Hatchback',
          phone: '+919999999999'
        })
        .select();
      
      if (insertError) {
        console.log('Minimal insert error:', insertError);
      } else {
        console.log('✅ Minimal insert successful:', insertData);
        
        // Clean up the test record
        await supabase
          .from('drivers')
          .delete()
          .eq('phone', '+919999999999');
        console.log('✅ Test record cleaned up');
      }
    } catch (err) {
      console.log('Insert test error:', err.message);
    }
    
    // Test bookings table
    console.log('\n5. Testing bookings table...');
    try {
      const { data: bookingsData, error: bookingsError } = await supabase
        .from('bookings')
        .select('*')
        .limit(1);
      
      if (bookingsError) {
        console.log('Bookings table error:', bookingsError);
      } else {
        console.log('Bookings table accessible. Records count:', bookingsData.length);
      }
    } catch (err) {
      console.log('Bookings table access error:', err.message);
    }
    
    // Test bids table
    console.log('\n6. Testing bids table...');
    try {
      const { data: bidsData, error: bidsError } = await supabase
        .from('bids')
        .select('*')
        .limit(1);
      
      if (bidsError) {
        console.log('Bids table error:', bidsError);
      } else {
        console.log('Bids table accessible. Records count:', bidsData.length);
      }
    } catch (err) {
      console.log('Bids table access error:', err.message);
    }
    
    console.log('\n🎯 Database inspection complete!');
    
  } catch (error) {
    console.error('❌ Database inspection failed:', error);
  }
}

inspectDatabase();
