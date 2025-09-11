import { supabase } from './supabase.js';

// Check if supabase is properly initialized
const isSupabaseReady = () => {
  return supabase && typeof supabase.from === 'function';
};

// Authentication Functions
export const supabaseAuth = {
  // Sign up new user
  signUp: async (email, password, userData = {}) => {
    try {
      if (!isSupabaseReady()) {
        throw new Error('Supabase not initialized');
      }
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
      if (!isSupabaseReady()) {
        throw new Error('Supabase not initialized');
      }
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
      if (!isSupabaseReady()) {
        throw new Error('Supabase not initialized');
      }
      const { error } = await supabase.auth.signOut();
      return { error };
    } catch (error) {
      console.error('Sign out error:', error);
      return { error };
    }
  },

  // Get current user
  getCurrentUser: () => {
    if (!isSupabaseReady()) {
      return { data: null, error: new Error('Supabase not initialized') };
    }
    return supabase.auth.getUser();
  },

  // Listen to auth state changes
  onAuthStateChange: (callback) => {
    if (!isSupabaseReady()) {
      return () => {}; // Return empty unsubscribe function
    }
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
        if (!isSupabaseReady()) {
          return { data: [], error: new Error('Supabase not initialized') };
        }
        const { data, error } = await supabase
          .from('drivers')
          .select('*');
        return { data: data || [], error };
      } catch (error) {
        console.error('Get drivers error:', error);
        return { data: [], error };
      }
    },

    // Get driver by email
    getByEmail: async (email) => {
      try {
        if (!isSupabaseReady()) {
          return { data: null, error: new Error('Supabase not initialized') };
        }
        const { data, error } = await supabase
          .from('drivers')
          .select('*')
          .eq('email', email)
          .single();
        return { data, error };
      } catch (error) {
        console.error('Get driver by email error:', error);
        return { data: null, error };
      }
    },

    // Get driver by ID
    getById: async (id) => {
      try {
        if (!isSupabaseReady()) {
          return { data: null, error: new Error('Supabase not initialized') };
        }
        const { data, error } = await supabase
          .from('drivers')
          .select('*')
          .eq('id', id)
          .single();
        return { data, error };
      } catch (error) {
        console.error('Get driver by ID error:', error);
        return { data: null, error };
      }
    },

    // Get driver by user_id (auth user ID)
    getByUserId: async (userId) => {
      try {
        if (!isSupabaseReady()) {
          return { data: null, error: new Error('Supabase not initialized') };
        }
        const { data, error } = await supabase
          .from('drivers')
          .select('*')
          .eq('user_id', userId)
          .single();
        return { data, error };
      } catch (error) {
        console.error('Get driver by user ID error:', error);
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
        if (!isSupabaseReady()) {
          return { data: null, error: new Error('Supabase not initialized') };
        }
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
        if (!isSupabaseReady()) {
          return { data: [], error: new Error('Supabase not initialized') };
        }
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .order('created_at', { ascending: false });
        return { data: data || [], error };
      } catch (error) {
        console.error('Get bookings error:', error);
        return { data: [], error };
      }
    },

    // Get booking by ID
    getById: async (id) => {
      try {
        if (!isSupabaseReady()) {
          return { data: null, error: new Error('Supabase not initialized') };
        }
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('id', id)
          .single();
        return { data, error };
      } catch (error) {
        console.error('Get booking by ID error:', error);
        return { data: null, error };
      }
    },

    // Get bookings by status
    getByStatus: async (status) => {
      try {
        if (!isSupabaseReady()) {
          return { data: [], error: new Error('Supabase not initialized') };
        }
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('status', status)
          .order('created_at', { ascending: false });
        return { data: data || [], error };
      } catch (error) {
        console.error('Get bookings by status error:', error);
        return { data: [], error };
      }
    },

    // Add new booking
    add: async (bookingData) => {
      try {
        if (!isSupabaseReady()) {
          return { data: null, error: new Error('Supabase not initialized') };
        }
        const { data, error } = await supabase
          .from('bookings')
          .insert([bookingData])
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
        if (!isSupabaseReady()) {
          return { data: null, error: new Error('Supabase not initialized') };
        }
        const { data, error } = await supabase
          .from('bookings')
          .update(updateData)
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

  // RPC functions for enhanced ride system
  rpc: async (functionName, parameters = {}) => {
    try {
      if (!isSupabaseReady()) {
        return { data: null, error: new Error('Supabase not initialized') };
      }
      const { data, error } = await supabase.rpc(functionName, parameters);
      return { data, error };
    } catch (error) {
      console.error(`RPC ${functionName} error:`, error);
      return { data: null, error };
    }
  },

  // Active rides operations
  activeRides: {
    // Get active ride for driver
    getByDriverId: async (driverId) => {
      try {
        if (!isSupabaseReady()) {
          return { data: null, error: new Error('Supabase not initialized') };
        }
        const { data, error } = await supabase
          .from('active_rides')
          .select(`
            *,
            ride_history:ride_history_id(*),
            booking:booking_id(*)
          `)
          .eq('driver_id', driverId)
          .single();
        return { data, error };
      } catch (error) {
        console.error('Get active ride error:', error);
        return { data: null, error };
      }
    },

    // Get active ride by user ID (auth user ID)
    getByDriverUserId: async (driverUserId) => {
      try {
        if (!isSupabaseReady()) {
          return { data: null, error: new Error('Supabase not initialized') };
        }
        const { data, error } = await supabase
          .from('active_rides')
          .select(`
            *,
            ride_history:ride_history_id(*),
            booking:booking_id(*)
          `)
          .eq('driver_user_id', driverUserId)
          .single();
        return { data, error };
      } catch (error) {
        console.error('Get active ride by user ID error:', error);
        return { data: null, error };
      }
    }
  },

  // Bid timers operations
  bidTimers: {
    // Get timer for booking
    getByBookingId: async (bookingId) => {
      try {
        const { data, error } = await supabase
          .from('bid_timers')
          .select('*')
          .eq('booking_id', bookingId)
          .single();
        return { data, error };
      } catch (error) {
        console.error('Get bid timer error:', error);
        return { data: null, error };
      }
    },

    // Create new timer
    create: async (bookingId, duration = 300) => {
      try {
        const expiresAt = new Date(Date.now() + duration * 1000);
        const { data, error } = await supabase
          .from('bid_timers')
          .insert([{
            booking_id: bookingId,
            timer_duration: duration,
            expires_at: expiresAt.toISOString(),
            remaining_seconds: duration
          }])
          .select()
          .single();
        return { data, error };
      } catch (error) {
        console.error('Create bid timer error:', error);
        return { data: null, error };
      }
    }
  },

  // Ride history operations
  rideHistory: {
    // Get ride history for user
    getByUserId: async (userId) => {
      try {
        const { data, error } = await supabase
          .from('ride_history')
          .select('*')
          .eq('user_id', userId)
          .order('completed_at', { ascending: false });
        return { data: error ? [] : data, error };
      } catch (error) {
        console.error('Get user ride history error:', error);
        return { data: [], error };
      }
    },

    // Get ride history for driver
    getByDriverUserId: async (driverUserId) => {
      try {
        const { data, error } = await supabase
          .from('ride_history')
          .select('*')
          .eq('driver_user_id', driverUserId)
          .order('completed_at', { ascending: false });
        return { data: error ? [] : data, error };
      } catch (error) {
        console.error('Get driver ride history error:', error);
        return { data: [], error };
      }
    }
  },

  // Driver earnings operations
  driverEarnings: {
    // Get earnings for driver
    getByDriverId: async (driverId) => {
      try {
        const { data, error } = await supabase
          .from('driver_earnings')
          .select('*')
          .eq('driver_id', driverId)
          .single();
        return { data, error };
      } catch (error) {
        console.error('Get driver earnings error:', error);
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

    // Subscribe to active rides changes
    subscribeToActiveRides: (callback) => {
      return supabase
        .channel('active_rides')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'active_rides' }, 
          callback
        )
        .subscribe();
    },

    // Subscribe to bid timers changes
    subscribeToBidTimers: (callback) => {
      return supabase
        .channel('bid_timers')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'bid_timers' }, 
          callback
        )
        .subscribe();
    },

    // Subscribe to ride history changes
    subscribeToRideHistory: (callback) => {
      return supabase
        .channel('ride_history')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'ride_history' }, 
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
