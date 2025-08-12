// Quick verification script for Supabase setup
// Run this in browser console on your app to test connection

console.log('🔍 BidCab Setup Verification');
console.log('==========================');

// Check environment variables
console.log('📊 Environment Check:');
console.log('Supabase URL:', process?.env?.REACT_APP_SUPABASE_URL ? '✅ Set' : '❌ Missing');
console.log('Supabase Key:', process?.env?.REACT_APP_SUPABASE_ANON_KEY ? '✅ Set' : '❌ Missing');

// Check localStorage for any existing sessions
console.log('\n💾 Storage Check:');
console.log('Customer Token:', localStorage.getItem('customerToken') ? '✅ Found' : '❌ None');
console.log('Driver Token:', localStorage.getItem('driverToken') ? '✅ Found' : '❌ None');
console.log('Customer Data:', localStorage.getItem('customerData') ? '✅ Found' : '❌ None');
console.log('Driver Data:', localStorage.getItem('driverData') ? '✅ Found' : '❌ None');

// Test steps
console.log('\n🧪 Test Steps:');
console.log('1. Open http://localhost:3000');
console.log('2. Should see customer auth modal');
console.log('3. Register with: customer@test.com / password123');
console.log('4. Test login with same credentials');
console.log('5. Access driver portal via modal button');

// Connection test function
window.testSupabaseConnection = async function() {
    console.log('\n🔗 Testing Supabase Connection...');
    
    try {
        // This would only work if the Supabase client is available
        if (window.supabase) {
            const { data, error } = await window.supabase.from('drivers').select('count');
            console.log('✅ Supabase connection successful');
            console.log('Drivers table accessible:', !error);
        } else {
            console.log('⚠️ Supabase client not available in window scope');
            console.log('This is normal - client is scoped to React components');
        }
    } catch (error) {
        console.log('❌ Connection test failed:', error.message);
    }
};

console.log('\n🎯 Manual Test Checklist:');
const checklist = [
    'Auth modal appears on page load',
    'Can switch between login/register modes', 
    'Registration creates new account',
    'Login works with created credentials',
    'Session persists on page refresh',
    'Logout clears session',
    'Driver portal link works',
    'No console errors during flow'
];

checklist.forEach((item, index) => {
    console.log(`${index + 1}. ☐ ${item}`);
});

console.log('\n🎉 Ready to test! Open the app and follow the checklist above.');
