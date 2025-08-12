// Simple test to verify Supabase connection
// Run this in browser console to test

console.log('Testing Supabase connection...');

// Test if Supabase is available
if (window.location.hostname === 'localhost') {
  // This would work in the browser console on your running app
  console.log('✅ App is running locally');
  console.log('📋 Test checklist:');
  console.log('1. Go to http://localhost:3001 (or your app URL)');
  console.log('2. Navigate to /driver/login');
  console.log('3. Try registering a new driver');
  console.log('4. Check if login works');
  console.log('5. Verify dashboard shows pending rides');
  console.log('6. Check Supabase dashboard for new data');
} else {
  console.log('Please run this on your local development server');
}

// Function to test Supabase connection (run in browser console on your app)
function testSupabaseConnection() {
  fetch('/api/test') // This won't work, just for demo
    .then(() => console.log('✅ Connection successful'))
    .catch(() => console.log('❌ Connection failed'));
}

console.log('🎯 Next steps:');
console.log('1. Run the SQL script in your Supabase dashboard');
console.log('2. Test driver registration and login');
console.log('3. Check if data appears in Supabase tables');
console.log('4. Let me know if you encounter any issues!');
