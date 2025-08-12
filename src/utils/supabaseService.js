import { supabase } from './supabase.js';

// Authentication Functions
export const supabaseAuth = {
  // Sign up new user
  signUp: async (email, password, userData = {}) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData
        }
      });
      return { data, error };
    } catch (error) {
      console.error('Sign up error:', error);
      return { data: null, error };
    }
  },

  // Sign in user
  signIn: async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      return { data, error };
    } catch (error) {
      console.error('Sign in error:', error);
      return { data: null, error };
    }
  },

  // Sign out user
  signOut: async () => {
    try {
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error };
    }
  },

  // Get current user
  getCurrentUser: () => {
    return supabase.auth.getUser();
  },

  // Listen to auth state changes
  onAuthStateChange: (callback) => {
    return supabase.auth.onAuthStateChange(callback);
  }
};

// Database Functions
export const supabaseDB = {
  // Drivers operations
  drivers: {
    // Get all drivers
    getAll: async () => {
      try {
        const { data, error } = await supabase
          .from('drivers')
          .select('*');
        return { data, error };
      } catch (error) {
        console.error('Get drivers error:', error);
        return { data: null, error };
      }
    },

    // Get available drivers
    getAvailable: async () => {
      try {
        const { data, error } = await supabase
          .from('drivers')
          .select('*')
          .eq('available', true);
        return { data, error };
      } catch (error) {
        console.error('Get available drivers error:', error);
        return { data: null, error };
      }
    },

    // Add new driver
    add: async (driverData) => {
      try {
        const { data, error } = await supabase
          .from('drivers')
          .insert([driverData])
          .select();
        return { data, error };
      } catch (error) {
        console.error('Add driver error:', error);
        return { data: null, error };
      }
    },

    // Update driver
    update: async (id, updateData) => {
      try {
        const { data, error } = await supabase
          .from('drivers')
          .update(updateData)
          .eq('id', id)
          .select();
        return { data, error };
      } catch (error) {
        console.error('Update driver error:', error);
        return { data: null, error };
      }
    },

    // Delete driver
    delete: async (id) => {
      try {
        const { data, error } = await supabase
          .from('drivers')
          .delete()
          .eq('id', id);
        return { data, error };
      } catch (error) {
        console.error('Delete driver error:', error);
        return { data: null, error };
      }
    }
  },

  // Bookings operations
  bookings: {
    // Get all bookings
    getAll: async () => {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .order('created_at', { ascending: false });
        return { data, error };
      } catch (error) {
        console.error('Get bookings error:', error);
        return { data: null, error };
      }
    },

    // Get bookings by status
    getByStatus: async (status) => {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('status', status)
          .order('created_at', { ascending: false });
        return { data, error };
      } catch (error) {
        console.error('Get bookings by status error:', error);
        return { data: null, error };
      }
    },

    // Add new booking
    add: async (bookingData) => {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .insert([{
            ...bookingData,
            created_at: new Date().toISOString()
          }])
          .select();
        return { data, error };
      } catch (error) {
        console.error('Add booking error:', error);
        return { data: null, error };
      }
    },

    // Update booking
    update: async (id, updateData) => {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .update({
            ...updateData,
            updated_at: new Date().toISOString()
          })
          .eq('id', id)
          .select();
        return { data, error };
      } catch (error) {
        console.error('Update booking error:', error);
        return { data: null, error };
      }
    },

    // Delete booking
    delete: async (id) => {
      try {
        const { data, error } = await supabase
          .from('bookings')
          .delete()
          .eq('id', id);
        return { data, error };
      } catch (error) {
        console.error('Delete booking error:', error);
        return { data: null, error };
      }
    }
  },

  // Bids operations
  bids: {
    // Get all bids
    getAll: async () => {
      try {
        const { data, error } = await supabase
          .from('bids')
          .select('*')
          .order('created_at', { ascending: false });
        return { data, error };
      } catch (error) {
        console.error('Get bids error:', error);
        return { data: null, error };
      }
    },

    // Get bids for a specific booking
    getByBooking: async (bookingId) => {
      try {
        const { data, error } = await supabase
          .from('bids')
          .select('*')
          .eq('booking_id', bookingId)
          .order('amount', { ascending: true });
        return { data, error };
      } catch (error) {
        console.error('Get bids by booking error:', error);
        return { data: null, error };
      }
    },

    // Add new bid
    add: async (bidData) => {
      try {
        const { data, error } = await supabase
          .from('bids')
          .insert([{
            ...bidData,
            created_at: new Date().toISOString()
          }])
          .select();
        return { data, error };
      } catch (error) {
        console.error('Add bid error:', error);
        return { data: null, error };
      }
    },

    // Update bid
    update: async (id, updateData) => {
      try {
        const { data, error } = await supabase
          .from('bids')
          .update(updateData)
          .eq('id', id)
          .select();
        return { data, error };
      } catch (error) {
        console.error('Update bid error:', error);
        return { data: null, error };
      }
    },

    // Delete bid
    delete: async (id) => {
      try {
        const { data, error } = await supabase
          .from('bids')
          .delete()
          .eq('id', id);
        return { data, error };
      } catch (error) {
        console.error('Delete bid error:', error);
        return { data: null, error };
      }
    }
  },

  // Real-time subscriptions
  realtime: {
    // Subscribe to bookings changes
    subscribeToBookings: (callback) => {
      return supabase
        .channel('bookings')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'bookings' }, 
          callback
        )
        .subscribe();
    },

    // Subscribe to bids changes
    subscribeToBids: (callback) => {
      return supabase
        .channel('bids')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'bids' }, 
          callback
        )
        .subscribe();
    },

    // Subscribe to drivers changes
    subscribeToDrivers: (callback) => {
      return supabase
        .channel('drivers')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'drivers' }, 
          callback
        )
        .subscribe();
    },

    // Unsubscribe from a channel
    unsubscribe: (subscription) => {
      if (subscription) {
        supabase.removeChannel(subscription);
      }
    }
  }
};

// Utility function to handle errors consistently
export const handleSupabaseError = (error) => {
  if (error) {
    console.error('Supabase error:', error);
    return {
      message: error.message || 'An error occurred',
      details: error.details || null,
      hint: error.hint || null
    };
  }
  return null;
};

export default { supabaseAuth, supabaseDB, handleSupabaseError };
