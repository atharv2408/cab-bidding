// Debug the full registration flow step by step
require('dotenv').config();

console.log('=== Full Registration Debug ===');

async function debugRegistration() {
  try {
    console.log('\n1. Environment Check...');
    console.log('SUPABASE_URL exists:', !!process.env.REACT_APP_SUPABASE_URL);
    console.log('SUPABASE_KEY exists:', !!process.env.REACT_APP_SUPABASE_ANON_KEY);
    
    if (!process.env.REACT_APP_SUPABASE_URL || !process.env.REACT_APP_SUPABASE_ANON_KEY) {
      console.error('❌ Missing environment variables!');
      return;
    }
    
    console.log('\n2. Creating Supabase Client...');
    const { createClient } = require('@supabase/supabase-js');
    
    const supabase = createClient(
      process.env.REACT_APP_SUPABASE_URL,
      process.env.REACT_APP_SUPABASE_ANON_KEY
    );
    
    console.log('✅ Supabase client created');
    
    console.log('\n3. Testing Database Connection...');
    
    // First, let's see what tables exist
    try {
      const { data: tablesTest, error: tablesError } = await supabase
        .from('users')
        .select('count')
        .limit(1);
        
      if (tablesError) {
        console.error('❌ Users table access error:', tablesError);
        console.log('This might mean the users table doesn\'t exist or has wrong permissions');
      } else {
        console.log('✅ Users table is accessible');
      }
    } catch (tableError) {
      console.error('❌ Table access failed:', tableError);
    }
    
    console.log('\n4. Testing Auth Registration...');
    
    const testEmail = `debug${Date.now()}@gmail.com`;
    const testPassword = 'debugtest123';
    
    console.log(`Testing registration with: ${testEmail}`);
    
    // Test Step 1: Supabase Auth Registration
    console.log('\nStep 4a: Testing supabase.auth.signUp...');
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Debug User',
          phone: '+1234567890',
          user_type: 'customer'
        }
      }
    });
    
    if (authError) {
      console.error('❌ Supabase Auth registration failed:', authError);
      console.error('Error details:', {
        message: authError.message,
        status: authError.status,
        code: authError.code
      });
      return;
    }
    
    console.log('✅ Supabase Auth registration successful!');
    console.log('Auth user created:', {
      id: authData.user?.id,
      email: authData.user?.email,
      email_confirmed: authData.user?.email_confirmed_at ? 'Yes' : 'No',
      session_created: authData.session ? 'Yes' : 'No'
    });
    
    // Test Step 2: Custom Users Table Insert
    console.log('\nStep 4b: Testing custom users table insert...');
    
    try {
      const { data: customUser, error: customError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id, // Use the same ID from Supabase Auth
            email: testEmail,
            full_name: 'Debug User',
            phone: '+1234567890',
            user_type: 'customer',
            is_verified: false,
            is_active: true,
            login_count: 0,
            created_at: new Date().toISOString()
          }
        ])
        .select('*');
        
      if (customError) {
        console.error('❌ Custom users table insert failed:', customError);
        console.error('This explains why you see no users in the table!');
        console.error('Error details:', {
          message: customError.message,
          code: customError.code,
          details: customError.details,
          hint: customError.hint
        });
      } else {
        console.log('✅ Custom users table insert successful!');
        console.log('Custom user created:', customUser);
      }
    } catch (insertError) {
      console.error('❌ Custom table insert exception:', insertError);
    }
    
    console.log('\n5. Checking what\'s in the users table now...');
    const { data: allUsers, error: selectError } = await supabase
      .from('users')
      .select('*');
      
    if (selectError) {
      console.error('❌ Can\'t query users table:', selectError);
    } else {
      console.log(`Found ${allUsers?.length || 0} users in custom table:`);
      allUsers?.forEach(user => {
        console.log(`- ${user.email} (${user.user_type})`);
      });
    }
    
    console.log('\n6. Testing Our Custom Auth Function...');
    
    // Simulate what our customAuth.register should do
    const mockRegister = async (userData) => {
      console.log('Mock register called with:', userData);
      
      // Step 1: Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.full_name,
            phone: userData.phone,
            user_type: userData.user_type
          }
        }
      });
      
      if (error) {
        console.error('Mock auth error:', error);
        return { success: false, error: error.message };
      }
      
      console.log('Mock auth success, user ID:', data.user?.id);
      
      // Step 2: Custom table (optional)
      try {
        await supabase.from('users').insert([{
          id: data.user.id,
          email: userData.email,
          full_name: userData.full_name,
          phone: userData.phone,
          user_type: userData.user_type,
          is_verified: false,
          is_active: true,
          login_count: 0,
          created_at: new Date().toISOString()
        }]);
        console.log('Mock custom table insert success');
      } catch (customError) {
        console.warn('Mock custom table insert failed:', customError);
      }
      
      return {
        success: true,
        user: {
          id: data.user.id,
          email: data.user.email,
          full_name: userData.full_name,
          phone: userData.phone,
          user_type: userData.user_type
        }
      };
    };
    
    const mockResult = await mockRegister({
      email: `mock${Date.now()}@gmail.com`,
      password: 'mocktest123',
      full_name: 'Mock Test User',
      phone: '+9876543210',
      user_type: 'customer'
    });
    
    console.log('Mock register result:', mockResult);
    
  } catch (error) {
    console.error('\n❌ Debug script failed:', error);
    console.error('Stack trace:', error.stack);
  }
}

debugRegistration();
