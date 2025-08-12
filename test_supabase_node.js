// Test Supabase connection from Node.js
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testSupabaseConnection() {
  console.log('Testing Supabase connection...');
  console.log('URL:', process.env.REACT_APP_SUPABASE_URL);
  console.log('Key:', process.env.REACT_APP_SUPABASE_ANON_KEY ? 'Found' : 'Missing');
  
  try {
    const supabase = createClient(
      process.env.REACT_APP_SUPABASE_URL,
      process.env.REACT_APP_SUPABASE_ANON_KEY
    );
    
    // Test database connection by querying a table
    console.log('\n🔍 Testing database connection...');
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);
      
    if (error) {
      console.error('❌ Database connection failed:', error.message);
      return false;
    }
    
    console.log('✅ Database connection successful!');
    console.log('Users table accessible:', data ? 'Yes' : 'No');
    
    // Test if we can query for a specific test user
    console.log('\n🔍 Looking for test users...');
    const { data: testUsers, error: testError } = await supabase
      .from('users')
      .select('*')
      .in('email', ['customer@test.com', 'driver@test.com']);
      
    if (testError) {
      console.error('❌ Error querying test users:', testError.message);
    } else {
      console.log('✅ Test users found:', testUsers?.length || 0);
      if (testUsers && testUsers.length > 0) {
        testUsers.forEach(user => {
          console.log(`  - ${user.email} (${user.user_type})`);
        });
      } else {
        console.log('ℹ️  No test users found. You may need to register them first.');
      }
    }
    
    return true;
    
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
    return false;
  }
}

testSupabaseConnection()
  .then(success => {
    if (success) {
      console.log('\n🎉 Supabase is configured correctly!');
    } else {
      console.log('\n❌ Supabase configuration needs attention.');
    }
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
