// Supabase Authentication Service
// Using Supabase Auth for proper password handling

import { supabase } from './supabase';

// Authentication service using Supabase Auth
export const customAuth = {
  // Login using Supabase Auth
  verifyCredentials: async (email, password) => {
    try {
      console.log('Signing in with Supabase Auth for:', email);
      
      // Use Supabase Auth to sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase(),
        password: password
      });

      if (error) {
        console.error('Supabase Auth error:', error);
        throw new Error(error.message || 'Authentication failed');
      }

      if (!data.user) {
        throw new Error('Authentication failed');
      }

      // Get additional user data from our custom users table if it exists
      const { data: userProfile } = await supabase
        .from('users')
        .select('*')
        .eq('email', email.toLowerCase())
        .single();

      const userData = {
        id: data.user.id,
        email: data.user.email,
        full_name: userProfile?.full_name || data.user.user_metadata?.full_name || '',
        phone: userProfile?.phone || data.user.user_metadata?.phone || '',
        user_type: userProfile?.user_type || 'customer',
        is_verified: data.user.email_confirmed_at ? true : false
      };
      
      return {
        success: true,
        user: userData,
        session: data.session
      };

    } catch (error) {
      console.error('Authentication error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Register new user using Supabase Auth
  register: async (userData) => {
    try {
      console.log('🔐 Starting registration with Supabase Auth for:', userData.email);
      console.log('📝 Registration data:', {
        email: userData.email,
        full_name: userData.full_name || userData.name,
        phone: userData.phone,
        user_type: userData.user_type || 'customer'
      });

      // Validate input data
      if (!userData.email || !userData.password) {
        throw new Error('Email and password are required');
      }

      if (userData.password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
      }

      console.log('✅ Input validation passed');
      console.log('📡 Calling Supabase Auth signUp...');

      // Use Supabase Auth to create user - it handles password hashing automatically
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
        console.error('Supabase Auth registration error:', error);
        throw new Error(error.message || 'Registration failed');
      }

      if (!data.user) {
        throw new Error('Registration failed - no user created');
      }

      // Note: We're using Supabase Auth, so we don't need to store in custom users table
      // All user data is stored in auth.users and metadata
      console.log('✅ Using Supabase Auth - no custom table needed');

      const userResponse = {
        id: data.user.id,
        email: data.user.email,
        full_name: userData.full_name || userData.name,
        phone: userData.phone,
        user_type: userData.user_type || 'customer',
        is_verified: data.user.email_confirmed_at ? true : false
      };

      return {
        success: true,
        user: userResponse,
        session: data.session
      };

    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Sign out user
  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: error.message };
    }
  },

  // Get current user
  getCurrentUser: async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      // Get additional user data from our custom users table
      const { data: userProfile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      return {
        id: user.id,
        email: user.email,
        full_name: userProfile?.full_name || user.user_metadata?.full_name || '',
        phone: userProfile?.phone || user.user_metadata?.phone || '',
        user_type: userProfile?.user_type || 'customer',
        is_verified: user.email_confirmed_at ? true : false
      };
    } catch (error) {
      console.error('Get current user error:', error);
      return null;
    }
  },

  // Update login statistics
  updateLoginStats: async (userId) => {
    try {
      await supabase
        .from('users')
        .update({
          last_login: new Date().toISOString(),
          login_count: supabase.rpc('increment_login_count', { user_id: userId })
        })
        .eq('id', userId);
    } catch (error) {
      console.error('Error updating login stats:', error);
      // Don't throw error here as it's not critical for authentication
    }
  },

  // Get user by ID
  getUserById: async (userId) => {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .eq('is_active', true)
        .limit(1);

      if (error || !users || users.length === 0) {
        return null;
      }

      const { password_hash, password_reset_token, email_verification_token, ...userData } = users[0];
      return userData;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  },

  // Check if user exists
  userExists: async (email) => {
    try {
      const { data: users, error } = await supabase
        .from('users')
        .select('id')
        .eq('email', email.toLowerCase())
        .limit(1);

      return !error && users && users.length > 0;
    } catch (error) {
      console.error('Error checking user existence:', error);
      return false;
    }
  },

  // Update user profile
  updateProfile: async (userId, updates) => {
    try {
      const allowedUpdates = ['full_name', 'phone', 'profile_image_url'];
      const filteredUpdates = {};
      
      for (const key of allowedUpdates) {
        if (updates[key] !== undefined) {
          filteredUpdates[key] = updates[key];
        }
      }

      const { data: updatedUsers, error } = await supabase
        .from('users')
        .update(filteredUpdates)
        .eq('id', userId)
        .select('*');

      if (error) {
        throw new Error('Profile update failed');
      }

      const { password_hash, password_reset_token, email_verification_token, ...userData } = updatedUsers[0];
      return {
        success: true,
        user: userData
      };

    } catch (error) {
      console.error('Profile update error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  // Deactivate user account
  deactivateAccount: async (userId) => {
    try {
      await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', userId);

      return { success: true };
    } catch (error) {
      console.error('Account deactivation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};

// Helper function to create database function for incrementing login count
export const createLoginCountFunction = async () => {
  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE OR REPLACE FUNCTION increment_login_count(user_id UUID)
        RETURNS INTEGER AS $$
        DECLARE
          new_count INTEGER;
        BEGIN
          UPDATE users 
          SET login_count = login_count + 1 
          WHERE id = user_id
          RETURNING login_count INTO new_count;
          
          RETURN COALESCE(new_count, 0);
        END;
        $$ LANGUAGE plpgsql;
      `
    });

    if (error) {
      console.error('Error creating login count function:', error);
    } else {
      console.log('Login count function created successfully');
    }
  } catch (error) {
    console.error('Error creating login count function:', error);
  }
};

export default customAuth;
