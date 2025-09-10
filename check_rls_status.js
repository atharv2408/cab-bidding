#!/usr/bin/env node

// Check RLS Status and Driver Table Policies
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

async function checkRLSStatus() {
  console.log('🔍 Checking Row Level Security Status\n');
  
  try {
    // Check current user and session
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('👤 Current User:', user ? user.email : 'Not logged in');
    
    // Try to get all drivers to see what error we get
    console.log('\n📊 Testing drivers table access...');
    const { data: drivers, error: driversError } = await supabase
      .from('drivers')
      .select('*');
    
    if (driversError) {
      console.log('❌ Drivers table access error:', driversError.message);
      console.log('   Code:', driversError.code);
      console.log('   Details:', driversError.details);
    } else {
      console.log('✅ Successfully retrieved', drivers.length, 'drivers');
      drivers.forEach(driver => {
        console.log(`   - ${driver.name} (${driver.email})`);
      });
    }
    
    // Try to insert a test driver record to see the specific error
    console.log('\n🧪 Testing driver insert...');
    const testDriverData = {
      name: 'Test Driver',
      phone: '+1234567890',
      email: 'test@example.com',
      vehicle_type: 'sedan',
      vehicle_number: 'TEST123',
      rating: 5.0,
      total_rides: 0,
      available: false,
      location: null
    };
    
    const { data: insertData, error: insertError } = await supabase
      .from('drivers')
      .insert([testDriverData])
      .select();
    
    if (insertError) {
      console.log('❌ Insert error:', insertError.message);
      console.log('   Code:', insertError.code);
      console.log('   Hint:', insertError.hint);
      
      if (insertError.message.includes('row-level security')) {
        console.log('\n🔒 RLS ISSUE DETECTED!');
        console.log('   The drivers table has Row Level Security enabled');
        console.log('   but lacks proper policies for driver registration.');
        console.log('\n💡 SOLUTIONS:');
        console.log('   1. Disable RLS temporarily for testing:');
        console.log('      ALTER TABLE drivers DISABLE ROW LEVEL SECURITY;');
        console.log('\n   2. Or add proper RLS policies (recommended):');
        console.log('      Run the SQL from fix_driver_rls_policies.sql');
        console.log('\n   3. Execute the fix:');
        console.log('      Go to Supabase SQL Editor and run the policy fix');
      }
    } else {
      console.log('✅ Insert successful:', insertData[0].id);
      // Clean up
      await supabase.from('drivers').delete().eq('email', 'test@example.com');
    }
    
    // Additional diagnostics
    console.log('\n🔧 Diagnostics:');
    console.log('   Supabase URL:', supabaseUrl);
    console.log('   Auth State:', user ? 'Authenticated' : 'Anonymous');
    
    return true;
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
    return false;
  }
}

// Run the check
if (require.main === module) {
  checkRLSStatus()
    .then(success => {
      console.log('\n' + '='.repeat(50));
      console.log('RLS Status Check Complete');
      console.log('='.repeat(50));
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n💥 Check execution failed:', error);
      process.exit(1);
    });
}

module.exports = { checkRLSStatus };
