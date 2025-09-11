#!/usr/bin/env node
/**
 * Test to run AFTER the SQL fix has been applied in Supabase
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://gxnolhrjdkfyyrtkcjhm.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4bm9saHJqZGtmeXlydGtjamhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MDg5NTksImV4cCI6MjA3MDQ4NDk1OX0.YdHAqb5W02sprZSC-h8L4KduWTgzfPcXG6I5-HEWWVw';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🚀 Testing After SQL Fix Applied\n');

async function testDriverCreationAfterFix() {
  console.log('🔐 Testing driver profile creation after RLS fix...');
  
  try {
    // Login
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'test.driver@example.com',
      password: 'testdriver123'
    });
    
    if (authError) {
      console.error('❌ Auth failed:', authError);
      return false;
    }
    
    console.log('✅ Auth successful - User ID:', authData.user?.id);
    
    // Try to create driver profile
    const driverData = {
      user_id: authData.user.id,
      name: 'Test Driver Fixed',
      email: 'test.driver@example.com',
      phone: '+919876543210',
      vehicle_type: 'sedan',
      vehicle_number: 'FIXED-001',
      vehicle_model: 'Fixed Car',
      license_number: 'FIXED-LICENSE',
      rating: 5.0,
      total_rides: 0,
      available: true,
      earnings: 0.0
    };
    
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .insert([driverData])
      .select()
      .single();
    
    if (driverError) {
      if (driverError.code === '23505') { // Unique constraint violation
        console.log('⚠️ Driver profile already exists, trying to fetch...');
        const { data: existingDriver, error: fetchError } = await supabase
          .from('drivers')
          .select('*')
          .eq('user_id', authData.user.id)
          .single();
        
        if (fetchError) {
          console.error('❌ Could not fetch existing driver:', fetchError);
          return false;
        } else {
          console.log('✅ Found existing driver profile:', existingDriver.name);
          return true;
        }
      } else {
        console.error('❌ Driver creation still failed:', driverError);
        return false;
      }
    } else {
      console.log('✅ Driver profile created successfully!');
      console.log('🚗 Driver:', driver.name, 'ID:', driver.id);
      return true;
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

async function testCompleteFlow() {
  console.log('🔄 Testing complete login flow...');
  
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
    
    console.log('✅ Login successful');
    
    // Get driver profile
    const { data: driver, error: driverError } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', authData.user.id)
      .single();
    
    if (driverError) {
      console.error('❌ Driver profile not found:', driverError);
      return false;
    }
    
    console.log('✅ Driver profile found:', driver.name);
    console.log('📊 Driver details:', {
      name: driver.name,
      email: driver.email,
      vehicle: `${driver.vehicle_type} (${driver.vehicle_number})`,
      rating: driver.rating,
      available: driver.available
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ Flow test failed:', error);
    return false;
  }
}

async function runFinalTest() {
  console.log('🧪 Running final authentication test...\n');
  
  try {
    // Test 1: Driver creation
    console.log('='.repeat(50));
    const creationTest = await testDriverCreationAfterFix();
    
    // Test 2: Complete flow
    console.log('\n' + '='.repeat(50));
    const flowTest = await testCompleteFlow();
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 FINAL TEST RESULTS:');
    console.log('=======================');
    console.log('Driver Creation:', creationTest ? '✅ PASS' : '❌ FAIL');
    console.log('Login Flow:', flowTest ? '✅ PASS' : '❌ FAIL');
    
    if (creationTest && flowTest) {
      console.log('\n🎉 SUCCESS! Driver authentication is now working correctly!');
      console.log('\n🚀 Ready to test in your app:');
      console.log('   • Driver registration should work');
      console.log('   • Driver login should work');
      console.log('   • Driver dashboard should load');
    } else {
      console.log('\n⚠️ Still having issues. Please check:');
      console.log('   1. Did you run the fix_rls_and_trigger.sql in Supabase SQL Editor?');
      console.log('   2. Are there any error messages in the Supabase logs?');
      console.log('   3. Check the RLS policies in Supabase Authentication settings');
    }
    
  } catch (error) {
    console.error('❌ Final test failed:', error);
  }
}

runFinalTest().then(() => {
  console.log('\n✅ Final test completed');
  process.exit(0);
}).catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
