// Simple Supabase Connection Test
// Run this with: node test-supabase.js

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

// Get environment variables
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

console.log('🧪 Testing Supabase Connection...\n');

// Check environment variables
console.log('📋 Environment Check:');
console.log('Supabase URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('Supabase Key:', supabaseKey ? '✅ Set' : '❌ Missing');
console.log('');

if (!supabaseUrl || !supabaseKey) {
  console.log('❌ Error: Missing Supabase credentials in .env file');
  console.log('Make sure you have:');
  console.log('REACT_APP_SUPABASE_URL=your-project-url');
  console.log('REACT_APP_SUPABASE_ANON_KEY=your-anon-key');
  process.exit(1);
}

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  try {
    console.log('🔗 Testing Connection...');
    
    // Test 1: Simple connection test
    const { data, error } = await supabase
      .from('drivers')
      .select('count(*)', { count: 'exact' });
    
    if (error) {
      console.log('❌ Connection Error:', error.message);
      return false;
    }
    
    console.log('✅ Connection successful!');
    console.log(`📊 Drivers table: ${data.length} records\n`);
    
    // Test 2: Test bookings table
    console.log('📋 Testing bookings table...');
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('*')
      .limit(1);
    
    if (bookingsError) {
      console.log('❌ Bookings Error:', bookingsError.message);
      if (bookingsError.message.includes('406')) {
        console.log('💡 Tip: Run the database_fix.sql script in your Supabase SQL Editor');
      }
      return false;
    }
    
    console.log('✅ Bookings table accessible');
    console.log(`📊 Sample booking columns:`, bookings[0] ? Object.keys(bookings[0]) : 'No data');
    
    // Test 3: Test bids table
    console.log('\n🎯 Testing bids table...');
    const { data: bids, error: bidsError } = await supabase
      .from('bids')
      .select('*')
      .limit(1);
    
    if (bidsError) {
      console.log('❌ Bids Error:', bidsError.message);
      return false;
    }
    
    console.log('✅ Bids table accessible');
    console.log(`📊 Sample bid columns:`, bids[0] ? Object.keys(bids[0]) : 'No data');
    
    console.log('\n🎉 All tests passed! Your Supabase connection is working correctly.');
    return true;
    
  } catch (error) {
    console.log('❌ Unexpected Error:', error.message);
    return false;
  }
}

// Run the test
testConnection().then(success => {
  if (success) {
    console.log('\n✅ Your application should work now!');
    console.log('👉 Try running: npm start');
  } else {
    console.log('\n❌ Please fix the issues above and try again.');
    console.log('💡 Make sure you\'ve run the database_fix.sql script in Supabase SQL Editor');
  }
  process.exit(success ? 0 : 1);
});
