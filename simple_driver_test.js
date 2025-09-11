#!/usr/bin/env node
/**
 * Simple test to verify driver authentication without SQL functions
 * This will test the basic flow and manually create driver profiles
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://gxnolhrjdkfyyrtkcjhm.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4bm9saHJqZGtmeXlydGtjamhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MDg5NTksImV4cCI6MjA3MDQ4NDk1OX0.YdHAqb5W02sprZSC-h8L4KduWTgzfPcXG6I5-HEWWVw';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🚀 Simple Driver Authentication Test\n');

async function testDriverProfileCreation() {
  console.log('🔐 Testing driver profile creation for existing auth user...');
  
  try {
    // Login with existing test user
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test.driver@example.com',
      password: 'testdriver123'
    });
    
    if (authError) {
      console.error('❌ Auth login failed:', authError);
      return false;
    }
    
    console.log('✅ Auth login successful');
    console.log('👤 User ID:', authData.user?.id);
    
    // Try to create driver profile directly
    console.log('🔧 Attempting to create driver profile directly...');
    
    const driverData = {
      user_id: authData.user.id,
      name: 'Test Driver',
      email: 'test.driver@example.com',
      phone: '+919876543210',
      vehicle_type: 'sedan',
      vehicle_number: 'TEST-001',
      vehicle_model: 'Test Car',
      license_number: 'TEST-LICENSE-001',
      rating: 5.0,
      total_rides: 0,
      available: true,
      earnings: 0.0
    };
    
    const { data: driverRecord, error: driverError } = await supabase
      .from('drivers')
      .insert([driverData])
      .select()
      .single();
    
    if (driverError) {
      console.error('❌ Driver profile creation failed:', driverError);
      
      // Check if driver already exists
      const { data: existingDriver, error: existingError } = await supabase
        .from('drivers')
        .select('*')
        .eq('user_id', authData.user.id)
        .single();
      
      if (existingError) {
        console.error('❌ Driver profile doesn\'t exist and can\'t be created');
        return false;
      } else {
        console.log('✅ Driver profile already exists:', JSON.stringify(existingDriver, null, 2));
        return true;
      }
    } else {
      console.log('✅ Driver profile created successfully:', JSON.stringify(driverRecord, null, 2));
      return true;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

async function testDriverLogin() {
  console.log('\n🔑 Testing driver login flow...');
  
  try {
    // Login
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test.driver@example.com',
      password: 'testdriver123'
    });
    
    if (authError) {
      console.error('❌ Login failed:', authError);
      return false;
    }
    
    console.log('✅ Auth login successful');
    
    // Get driver profile
    const { data: driverProfile, error: driverError } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', authData.user.id)
      .single();
    
    if (driverError) {
      console.error('❌ Driver profile not found:', driverError);
      return false;
    }
    
    console.log('✅ Driver profile retrieved:', JSON.stringify(driverProfile, null, 2));
    return true;
    
  } catch (error) {
    console.error('❌ Login test failed:', error);
    return false;
  }
}

async function showCurrentData() {
  console.log('\n📊 Current database state:');
  
  try {
    // Get all drivers
    const { data: drivers, error: driversError } = await supabase
      .from('drivers')
      .select('*');
    
    if (driversError) {
      console.error('❌ Could not fetch drivers:', driversError);
    } else {
      console.log(`📋 Total drivers in database: ${drivers.length}`);
      drivers.forEach((driver, index) => {
        console.log(`${index + 1}. ${driver.name} (${driver.email}) - User ID: ${driver.user_id}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Database query failed:', error);
  }
}

async function runSimpleTest() {
  console.log('🔍 Running simple driver authentication test...\n');
  
  try {
    // Show current state
    await showCurrentData();
    
    // Test driver profile creation
    console.log('\n' + '='.repeat(50));
    const creationTest = await testDriverProfileCreation();
    
    // Test login
    console.log('\n' + '='.repeat(50));
    const loginTest = await testDriverLogin();
    
    // Show final state
    console.log('\n' + '='.repeat(50));
    await showCurrentData();
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 TEST SUMMARY:');
    console.log('================');
    console.log('Profile Creation:', creationTest ? '✅ Pass' : '❌ Fail');
    console.log('Login Flow:', loginTest ? '✅ Pass' : '❌ Fail');
    
    if (creationTest && loginTest) {
      console.log('\n🎉 Basic driver authentication is working!');
      console.log('\n💡 Next steps:');
      console.log('   1. Run the RLS fix SQL script in Supabase');
      console.log('   2. Test driver registration through your web app');
      console.log('   3. Test driver login through your web app');
    } else {
      console.log('\n⚠️ Some tests failed. Driver authentication needs fixing.');
      console.log('\n🔧 Recommended actions:');
      console.log('   1. Run the fix_rls_and_trigger.sql script in Supabase SQL Editor');
      console.log('   2. Check RLS policies are set correctly');
      console.log('   3. Verify the user_id column exists in drivers table');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

runSimpleTest().then(() => {
  console.log('\n✅ Simple test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
