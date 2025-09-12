const { createClient } = require('@supabase/supabase-js');

// Supabase configuration - use environment variables with safe URL fallback
const supabaseUrl = process.env.SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL || 'https://gxnolhrjdkfyyrtkcjhm.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY must be set as environment variable');
  process.exit(1);
}

let supabase = null;

try {
  // Initialize Supabase client with service role for backend operations
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false // Backend doesn't need persistent sessions
    }
  });
  console.log('🔗 Backend Supabase client initialized successfully');
} catch (error) {
  console.error('❌ Failed to initialize Supabase client:', error.message);
}

// Helper functions for common database operations
const supabaseHelpers = {
  // Test connection
  testConnection: async () => {
    try {
      const { data, error } = await supabase.from('users').select('count').limit(1);
      if (error) throw error;
      console.log('✅ Supabase connection test successful');
      return true;
    } catch (error) {
      console.error('❌ Supabase connection test failed:', error.message);
      return false;
    }
  },

  // Users operations
  users: {
    // Create user (for phone authentication)
    create: async (userData) => {
      try {
        const { data, error } = await supabase
          .from('users')
          .insert([{
            email: userData.email || `${userData.phoneNumber.replace(/[^0-9]/g, '')}@phone.local`,
            name: userData.name,
            phone: userData.phoneNumber
          }])
          .select()
          .single();
        return { data, error };
      } catch (error) {
        return { data: null, error };
      }
    },

    // Find user by phone
    findByPhone: async (phoneNumber) => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('phone', phoneNumber)
          .single();
        return { data, error };
      } catch (error) {
        return { data: null, error };
      }
    },

    // Find user by ID
    findById: async (id) => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', id)
          .single();
        return { data, error };
      } catch (error) {
        return { data: null, error };
      }
    }
  },

  // Drivers operations
  drivers: {
    // Get all drivers
    getAll: async () => {
      try {
        const { data, error } = await supabase
          .from('drivers')
          .select('*')
          .order('created_at', { ascending: false });
        return { data, error };
      } catch (error) {
        return { data: [], error };
      }
    },

    // Update driver earnings
    updateEarnings: async (driverId, additionalEarnings) => {
      try {
        const { data: driver, error: fetchError } = await supabase
          .from('drivers')
          .select('earnings, total_rides')
          .eq('id', driverId)
          .single();

        if (fetchError) return { data: null, error: fetchError };

        const { data, error } = await supabase
          .from('drivers')
          .update({
            earnings: (driver.earnings || 0) + additionalEarnings,
            total_rides: (driver.total_rides || 0) + 1
          })
          .eq('id', driverId)
          .select();
        return { data, error };
      } catch (error) {
        return { data: null, error };
      }
    }
  },

  // Bookings operations
  bookings: {
    // Create booking
    create: async (bookingData) => {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .insert([bookingData])
          .select()
          .single();
        return { data, error };
      } catch (error) {
        return { data: null, error };
      }
    },

    // Update booking
    update: async (id, updateData) => {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();
        return { data, error };
      } catch (error) {
        return { data: null, error };
      }
    },

    // Get bookings by customer phone
    getByCustomerPhone: async (phone) => {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('customer_phone', phone)
          .order('created_at', { ascending: false });
        return { data, error };
      } catch (error) {
        return { data: [], error };
      }
    },

    // Get booking by ID
    getById: async (id) => {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('id', id)
          .single();
        return { data, error };
      } catch (error) {
        return { data: null, error };
      }
    }
  }
};

module.exports = { supabase, supabaseHelpers };
