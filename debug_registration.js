// Debug registration flow to identify the password hashing error
require('dotenv').config();

console.log('=== Debugging Registration Flow ===');

async function testRegistration() {
  try {
    console.log('\n1. Testing Supabase Auth Package...');
    const { createClient } = require('@supabase/supabase-js');
    
    const supabase = createClient(
      process.env.REACT_APP_SUPABASE_URL,
      process.env.REACT_APP_SUPABASE_ANON_KEY
    );
    
    console.log('✅ Supabase client created successfully');
    
    console.log('\n2. Testing Registration Call...');
    
    // Test the exact signup call that should be happening
    const testUserData = {
      email: 'testuser@example.com',
      password: 'testpassword123',
      options: {
        data: {
          full_name: 'Test User',
          phone: '+1234567890',
          user_type: 'customer'
        }
      }
    };
    
    console.log('Calling supabase.auth.signUp with:', {
      email: testUserData.email,
      password: '[REDACTED]',
      options: testUserData.options
    });
    
    // This will actually try to create a user - just for testing
    const { data, error } = await supabase.auth.signUp(testUserData);
    
    if (error) {
      console.error('❌ Registration failed:', error);
      console.error('Error code:', error.status);
      console.error('Error message:', error.message);
    } else {
      console.log('✅ Registration successful!');
      console.log('User created:', data.user?.id);
      console.log('Email confirmation required:', !data.user?.email_confirmed_at);
      
      // Clean up - remove the test user if needed
      if (data.user) {
        console.log('\nℹ️  Test user created successfully. You may want to delete it from your Supabase dashboard.');
      }
    }
    
    console.log('\n3. Testing the customAuth wrapper...');
    
    // Simulate what our customAuth.register function does
    const mockCustomAuthRegister = async (userData) => {
      try {
        console.log('Mock registering user:', userData.email);
        
        const { data, error } = await supabase.auth.signUp({
          email: userData.email.toLowerCase(),
          password: userData.password,
          options: {
            data: {
              full_name: userData.full_name || userData.name,
              phone: userData.phone,
              user_type: userData.user_type || 'customer'
            }
          }
        });
        
        if (error) {
          console.error('Mock registration error:', error);
          throw new Error(error.message || 'Registration failed');
        }
        
        if (!data.user) {
          throw new Error('Registration failed - no user created');
        }
        
        return {
          success: true,
          user: {
            id: data.user.id,
            email: data.user.email,
            full_name: userData.full_name || userData.name,
            phone: userData.phone,
            user_type: userData.user_type || 'customer'
          }
        };
        
      } catch (error) {
        console.error('Mock registration wrapper error:', error);
        return {
          success: false,
          error: error.message
        };
      }
    };
    
    // Test with different user to avoid conflicts
    const mockResult = await mockCustomAuthRegister({
      email: 'mockuser@example.com',
      password: 'mockpassword123',
      full_name: 'Mock User',
      phone: '+9876543210',
      user_type: 'customer'
    });
    
    console.log('Mock registration result:', mockResult);
    
  } catch (error) {
    console.error('\n❌ Debug test failed:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

testRegistration();
