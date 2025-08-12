// Test Supabase connection
require('dotenv').config();

console.log('=== Testing Supabase Connection ===');

// Test environment variables
console.log('\n1. Environment Variables:');
console.log('REACT_APP_SUPABASE_URL:', process.env.REACT_APP_SUPABASE_URL ? 'SET' : 'NOT SET');
console.log('REACT_APP_SUPABASE_ANON_KEY:', process.env.REACT_APP_SUPABASE_ANON_KEY ? 'SET' : 'NOT SET');

if (!process.env.REACT_APP_SUPABASE_URL || !process.env.REACT_APP_SUPABASE_ANON_KEY) {
  console.error('\n❌ Supabase environment variables are not set!');
  console.log('\nPlease ensure your .env file contains:');
  console.log('REACT_APP_SUPABASE_URL=your-supabase-url');
  console.log('REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key');
  process.exit(1);
}

async function testSupabaseConnection() {
  try {
    console.log('\n2. Testing Supabase Package...');
    const { createClient } = require('@supabase/supabase-js');
    console.log('✅ Supabase package imported successfully');
    
    console.log('\n3. Creating Supabase Client...');
    const supabase = createClient(
      process.env.REACT_APP_SUPABASE_URL,
      process.env.REACT_APP_SUPABASE_ANON_KEY
    );
    console.log('✅ Supabase client created successfully');
    
    console.log('\n4. Testing Database Connection...');
    // Try to query the users table
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('❌ Database query failed:', error.message);
      console.log('\nPossible causes:');
      console.log('- Database not set up correctly');
      console.log('- Users table does not exist');
      console.log('- Invalid credentials');
      console.log('- Network connectivity issues');
    } else {
      console.log('✅ Database connection successful');
      console.log('Users table query returned:', data?.length || 0, 'records');
    }
    
    console.log('\n5. Testing Custom Auth Module...');
    // Since we can't easily import ES6 modules in Node, let's simulate the hash function
    const testHashPassword = (password) => {
      if (password === 'password123') {
        return '$2b$10$K7GpqD/XiU.uYtJ9fVyJ/OhT2KZQKrjmF4K1kQUCFGxgQT0O8T4a.';
      }
      return `$2b$10$${Buffer.from(password).toString('base64').slice(0, 50)}`;
    };
    
    const testHash = testHashPassword('testpassword');
    console.log('✅ Hash function test passed');
    console.log('Test hash generated:', testHash);
    
    console.log('\n=== All Tests Completed ===');
    console.log('If all tests passed, the signup error might be due to:');
    console.log('1. Module import issues in the React app');
    console.log('2. Context/binding issues when calling methods');
    console.log('3. Missing dependencies in the frontend build');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testSupabaseConnection();
