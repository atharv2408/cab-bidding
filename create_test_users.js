// Script to create test users for authentication testing
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.REACT_APP_SUPABASE_URL,
  process.env.REACT_APP_SUPABASE_ANON_KEY
);

// Hash password function (simplified for demo - matches customAuth.js)
const hashPassword = (password) => {
  if (password === 'password123') {
    return '$2b$10$K7GpqD/XiU.uYtJ9fVyJ/OhT2KZQKrjmF4K1kQUCFGxgQT0O8T4a.';
  }
  return `$2b$10${Buffer.from(password).toString('base64').slice(0, 50)}`;
};

async function createTestUsers() {
  console.log('🚀 Creating test users...');
  
  const testUsers = [
    {
      email: 'customer@test.com',
      password_hash: hashPassword('password123'),
      full_name: 'Test Customer',
      phone: '+1 234 567 8900',
      user_type: 'customer',
      is_verified: true,
      is_active: true,
      login_count: 0
    },
    {
      email: 'driver@test.com',
      password_hash: hashPassword('password123'),
      full_name: 'Test Driver',
      phone: '+1 987 654 3210',
      user_type: 'driver',
      is_verified: true,
      is_active: true,
      login_count: 0
    }
  ];
  
  for (const userData of testUsers) {
    console.log(`\n👤 Creating user: ${userData.email}`);
    
    try {
      // Check if user already exists
      const { data: existingUsers } = await supabase
        .from('users')
        .select('email')
        .eq('email', userData.email)
        .limit(1);
        
      if (existingUsers && existingUsers.length > 0) {
        console.log(`   ℹ️  User ${userData.email} already exists, skipping...`);
        continue;
      }
      
      // Create new user
      const { data: createdUser, error } = await supabase
        .from('users')
        .insert([userData])
        .select('*');
        
      if (error) {
        console.error(`   ❌ Error creating user ${userData.email}:`, error.message);
      } else {
        console.log(`   ✅ Successfully created user ${userData.email}`);
      }
      
    } catch (error) {
      console.error(`   ❌ Exception creating user ${userData.email}:`, error.message);
    }
  }
  
  // Verify users were created
  console.log('\n🔍 Verifying test users...');
  const { data: allTestUsers, error } = await supabase
    .from('users')
    .select('*')
    .in('email', ['customer@test.com', 'driver@test.com']);
    
  if (error) {
    console.error('❌ Error verifying users:', error.message);
  } else {
    console.log('✅ Test users in database:', allTestUsers?.length || 0);
    allTestUsers?.forEach(user => {
      console.log(`   - ${user.email} (${user.user_type}) - Active: ${user.is_active}`);
    });
  }
}

// Run the script
createTestUsers()
  .then(() => {
    console.log('\n🎉 Test user creation completed!');
    console.log('\n📋 Test Credentials:');
    console.log('Customer: customer@test.com / password123');
    console.log('Driver: driver@test.com / password123');
    console.log('\nYou can now test the authentication system!');
  })
  .catch(error => {
    console.error('❌ Script failed:', error);
  });
