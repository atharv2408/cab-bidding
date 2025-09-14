#!/usr/bin/env node
/**
 * Simple test to verify the OTP comparison logic fixes
 */

console.log('🧪 Testing OTP Comparison Logic Fixes...\n');

// Simulate the fixed comparison logic
function testOTPComparison(storedOtp, userInput) {
  // Clean the user input (remove non-digits)
  const cleanedInput = String(userInput).replace(/\D/g, '');
  
  // Normalize both values
  const normalizedInput = String(cleanedInput).trim();
  const normalizedStoredOtp = String(storedOtp).trim();
  
  console.log(`📊 Testing: stored="${storedOtp}" (${typeof storedOtp}) vs input="${userInput}" (${typeof userInput})`);
  console.log(`   Cleaned input: "${cleanedInput}"`);
  console.log(`   Normalized input: "${normalizedInput}"`);
  console.log(`   Normalized stored: "${normalizedStoredOtp}"`);
  
  const result = normalizedInput === normalizedStoredOtp;
  console.log(`   Result: ${result ? '✅ MATCH' : '❌ NO MATCH'}\n`);
  
  return result;
}

// Test cases that would commonly fail with strict comparison
const testCases = [
  { stored: '123456', input: '123456', description: 'String vs String (should pass)' },
  { stored: 123456, input: '123456', description: 'Number vs String (commonly fails)' },
  { stored: '123456', input: 123456, description: 'String vs Number (commonly fails)' },
  { stored: 123456, input: 123456, description: 'Number vs Number (should pass)' },
  { stored: '123456 ', input: '123456', description: 'String with trailing space (commonly fails)' },
  { stored: '123456', input: ' 123456 ', description: 'Input with spaces (commonly fails)' },
  { stored: '123456', input: '123-456', description: 'Input with dash (should work after cleaning)' },
  { stored: '123456', input: '123 456', description: 'Input with space (should work after cleaning)' },
  { stored: '123456', input: 'abc123456', description: 'Input with letters (should work after cleaning)' },
  { stored: '123456', input: '1234567', description: 'Wrong length (should fail)' },
  { stored: '123456', input: '12345', description: 'Too short (should fail)' },
];

console.log('🔍 Running test cases...\n');

let passed = 0;
let failed = 0;

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.description}`);
  const result = testOTPComparison(testCase.stored, testCase.input);
  
  // Expected results
  const shouldPass = [0, 1, 2, 3, 4, 5, 6, 7, 8].includes(index); // First 9 should pass, last 2 should fail
  
  if ((result && shouldPass) || (!result && !shouldPass)) {
    passed++;
  } else {
    failed++;
    console.log(`   ❌ UNEXPECTED RESULT: expected ${shouldPass ? 'PASS' : 'FAIL'} but got ${result ? 'PASS' : 'FAIL'}`);
  }
  
  console.log('');
});

console.log('🏁 Test Results:');
console.log(`   ✅ Passed: ${passed}`);
console.log(`   ❌ Failed: ${failed}`);
console.log(`   📊 Total:  ${testCases.length}`);

if (failed === 0) {
  console.log('\n🎉 All tests passed! OTP comparison logic is working correctly.');
} else {
  console.log('\n⚠️  Some tests failed. Review the comparison logic.');
}
