// Check if users are being registered in Supabase
require('dotenv').config();

console.log('=== Checking Registered Users ===');

async function checkRegisteredUsers() {
  try {
    const { createClient } = require('@supabase/supabase-js');
    
    const supabase = createClient(
      process.env.REACT_APP_SUPABASE_URL,
      process.env.REACT_APP_SUPABASE_ANON_KEY
    );
    
    console.log('\n1. Checking Supabase Auth users...');
    
    // Note: We can't directly query auth.users with the anon key
    // But we can check our custom users table
    
    console.log('\n2. Checking custom users table...');
    const { data: customUsers, error: customError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
      
    if (customError) {
      console.error('❌ Error checking custom users table:', customError);
    } else {
      console.log('✅ Custom users table query successful');
      console.log(`Found ${customUsers?.length || 0} users in custom table:`);
      
      customUsers?.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email} (${user.user_type}) - Created: ${new Date(user.created_at).toLocaleString()}`);
      });
    }
    
    console.log('\n3. Testing registration with a new user...');
    
    const testEmail = `test${Date.now()}@gmail.com`;
    const testPassword = 'testpassword123';
    
    console.log(`Testing with email: ${testEmail}`);
    
    // Test registration
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test User',
          phone: '+1234567890',
          user_type: 'customer'
        }
      }
    });
    
    if (signUpError) {
      console.error('❌ Registration failed:', signUpError);
    } else {
      console.log('✅ Registration successful!');
      console.log('User ID:', signUpData.user?.id);
      console.log('Email confirmed:', signUpData.user?.email_confirmed_at ? 'Yes' : 'No');
      console.log('Session created:', signUpData.session ? 'Yes' : 'No');
      
      // Test immediate login
      console.log('\n4. Testing immediate login with same credentials...');
      
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      });
      
      if (signInError) {
        console.error('❌ Immediate login failed:', signInError);
        console.error('This explains why you see "Invalid email or password"');
        
        if (signInError.message.includes('Email not confirmed')) {
          console.log('💡 Solution: Email confirmation is required before login');
          console.log('💡 Check your Supabase dashboard settings for email confirmation');
        }
      } else {
        console.log('✅ Immediate login successful!');
        console.log('This means the issue is elsewhere...');
      }
    }
    
  } catch (error) {
    console.error('\n❌ Debug failed:', error.message);
  }
}

checkRegisteredUsers();
