#!/usr/bin/env node
/**
 * Debug script to test driver OTP verification issue
 * This will simulate the exact conditions where "wrong OTP" occurs
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://gxnolhrjdkfyyrtkcjhm.supabase.co';
const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4bm9saHJqZGtmeXlydGtjamhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MDg5NTksImV4cCI6MjA3MDQ4NDk1OX0.YdHAqb5W02sprZSC-h8L4KduWTgzfPcXG6I5-HEWWVw';

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('🐛 Starting Driver OTP Debug Test...\n');

async function createTestRide() {
  console.log('1. 🚗 Creating test ride with OTP...');
  
  // Create a test ride with known OTP
  const testRide = {
    customer_name: 'Test Customer',
    customer_phone: '+919876543210',
    pickup_address: 'Test Pickup Location',
    drop_address: 'Test Drop Location', 
    pickup_location: { lat: 28.6139, lng: 77.2090 },
    drop_location: { lat: 28.6129, lng: 77.2100 },
    distance: 2.5,
    estimated_fare: 150,
    actual_fare: 150,
    status: 'active',
    otp: '123456', // Known OTP for testing
    selected_driver_id: 'test-driver-123'
  };
  
  const { data: newRide, error } = await supabase
    .from('bookings')
    .insert([testRide])
    .select()
    .single();
  
  if (error) {
    console.error('❌ Failed to create test ride:', error);
    return null;
  }
  
  console.log('✅ Test ride created:', newRide.id);
  console.log('🔐 Test OTP:', testRide.otp);
  
  return newRide;
}

function testOTPComparison(storedOtp, userInput) {
  console.log('\n2. 🔍 Testing OTP comparison methods...');
  
  // Test different data types and comparison methods
  const tests = [
    {
      name: 'Exact string match (===)',
      result: storedOtp === userInput,
      code: 'storedOtp === userInput'
    },
    {
      name: 'String conversion comparison',
      result: String(storedOtp) === String(userInput),
      code: 'String(storedOtp) === String(userInput)'
    },
    {
      name: 'Trimmed comparison',
      result: String(storedOtp).trim() === String(userInput).trim(),
      code: 'String(storedOtp).trim() === String(userInput).trim()'
    },
    {
      name: 'Number comparison',
      result: Number(storedOtp) === Number(userInput),
      code: 'Number(storedOtp) === Number(userInput)'
    }
  ];
  
  console.log(`📊 Comparing stored: "${storedOtp}" (${typeof storedOtp}) vs input: "${userInput}" (${typeof userInput})`);
  
  tests.forEach((test, index) => {
    const status = test.result ? '✅ PASS' : '❌ FAIL';
    console.log(`   ${index + 1}. ${test.name}: ${status}`);
    console.log(`      Code: ${test.code}`);
  });
  
  return tests;
}

async function simulateDriverOTPFlow(rideId, testOtp) {
  console.log('\n3. 🎯 Simulating driver OTP verification flow...');
  
  // Get the ride data (as driver would)
  const { data: ride, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', rideId)
    .single();
    
  if (error) {
    console.error('❌ Failed to get ride:', error);
    return false;
  }
  
  console.log('📋 Retrieved ride data:');
  console.log(`   OTP in database: "${ride.otp}" (${typeof ride.otp})`);
  console.log(`   Driver input: "${testOtp}" (${typeof testOtp})`);
  
  // Test the current comparison logic from OTPVerification.jsx
  const currentLogicResult = testOtp === ride.otp;
  console.log(`\n🔧 Current logic result (otpInput === activeRide.otp): ${currentLogicResult ? '✅ PASS' : '❌ FAIL'}`);
  
  // Show detailed comparison
  testOTPComparison(ride.otp, testOtp);
  
  return currentLogicResult;
}

async function testDifferentOTPFormats() {
  console.log('\n4. 🧪 Testing different OTP formats...');
  
  const testCases = [
    { otp: '123456', input: '123456', description: 'String vs String' },
    { otp: 123456, input: '123456', description: 'Number vs String' },
    { otp: '123456', input: 123456, description: 'String vs Number' },
    { otp: 123456, input: 123456, description: 'Number vs Number' },
    { otp: '123456 ', input: '123456', description: 'String with space vs String' },
    { otp: '123456', input: ' 123456 ', description: 'String vs String with spaces' },
  ];
  
  testCases.forEach((testCase, index) => {
    console.log(`\n   Test ${index + 1}: ${testCase.description}`);
    console.log(`   Stored: "${testCase.otp}" (${typeof testCase.otp})`);
    console.log(`   Input:  "${testCase.input}" (${typeof testCase.input})`);
    
    const strictResult = testCase.otp === testCase.input;
    const safeResult = String(testCase.otp).trim() === String(testCase.input).trim();
    
    console.log(`   Strict (===):     ${strictResult ? '✅' : '❌'}`);
    console.log(`   Safe comparison:  ${safeResult ? '✅' : '❌'}`);
  });
}

async function cleanupTestData(rideId) {
  console.log('\n5. 🧹 Cleaning up test data...');
  
  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', rideId);
    
  if (error) {
    console.error('❌ Failed to cleanup:', error);
  } else {
    console.log('✅ Test data cleaned up');
  }
}

async function runDebugTest() {
  try {
    // Step 1: Create test ride
    const testRide = await createTestRide();
    if (!testRide) return;
    
    // Step 2: Test OTP verification with known good OTP
    const result = await simulateDriverOTPFlow(testRide.id, '123456');
    
    // Step 3: Test different formats
    await testDifferentOTPFormats();
    
    // Step 4: Clean up
    await cleanupTestData(testRide.id);
    
    console.log('\n🏁 Debug test completed!');
    console.log('\n📋 DIAGNOSIS:');
    console.log('   The OTP verification issue is likely caused by:');
    console.log('   1. Data type mismatch (string vs number)');
    console.log('   2. Whitespace in stored or input OTP');
    console.log('   3. Case sensitivity issues');
    console.log('   4. Database schema storing OTP as different type');
    
    console.log('\n🔧 RECOMMENDED FIX:');
    console.log('   Replace the strict comparison (===) with:');
    console.log('   String(otpInput).trim() === String(activeRide.otp).trim()');
    
  } catch (error) {
    console.error('❌ Debug test failed:', error);
  }
}

// Run the debug test
runDebugTest();
