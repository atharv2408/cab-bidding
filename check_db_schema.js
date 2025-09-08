// Check Database Schema
require('dotenv').config();

async function checkDatabaseSchema() {
  try {
    console.log('=== Database Schema Check ===');
    
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.REACT_APP_SUPABASE_URL,
      process.env.REACT_APP_SUPABASE_ANON_KEY
    );
    
    console.log('\n1. Checking existing tables...');
    
    // Try to query information schema
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.log('❌ Cannot access information_schema, trying direct table access...');
    } else {
      console.log('✅ Public tables found:', tables?.map(t => t.table_name) || []);
    }
    
    // Check if users table exists and what columns it has
    console.log('\n2. Testing users table structure...');
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (usersError) {
      console.log('❌ Users table error:', usersError);
    } else {
      console.log('✅ Users table accessible, sample data:', usersData);
    }
    
    // Check drivers table
    console.log('\n3. Testing drivers table...');
    const { data: driversData, error: driversError } = await supabase
      .from('drivers')
      .select('*')
      .limit(1);
    
    if (driversError) {
      console.log('❌ Drivers table error:', driversError);
    } else {
      console.log('✅ Drivers table accessible, sample data:', driversData);
    }
    
    // Check bookings table
    console.log('\n4. Testing bookings table...');
    const { data: bookingsData, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .limit(1);
    
    if (bookingsError) {
      console.log('❌ Bookings table error:', bookingsError);
    } else {
      console.log('✅ Bookings table accessible, sample data:', bookingsData);
    }
    
    // Check bids table
    console.log('\n5. Testing bids table...');
    const { data: bidsData, error: bidsError } = await supabase
      .from('bids')
      .select('*')
      .limit(1);
    
    if (bidsError) {
      console.log('❌ Bids table error:', bidsError);
    } else {
      console.log('✅ Bids table accessible, sample data:', bidsData);
    }
    
    console.log('\n=== Schema Check Complete ===');
    
  } catch (error) {
    console.error('Schema check failed:', error);
  }
}

checkDatabaseSchema();
