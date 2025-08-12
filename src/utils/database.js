// Supabase database utility
// Provides database operations using Supabase PostgreSQL database

import { supabaseDB } from './supabaseService';

class SupabaseDatabase {
  constructor() {
    this.bookingsCollection = 'bookings';
    this.driversCollection = 'drivers';
    this.usersCollection = 'users';
    this.initializeData();
  }

  // Initialize with sample data if empty
  async initializeData() {
    try {
      const { data: existingDrivers, error } = await supabaseDB.drivers.getAll();
      
      if (!error && (!existingDrivers || existingDrivers.length === 0)) {
        const sampleDrivers = [
          {
            name: 'Rajesh Kumar',
            phone: '+91 98765 43210',
            email: 'rajesh@example.com',
            vehicle_type: 'Hatchback',
            vehicle_number: 'DL 01 AB 1234',
            rating: 4.5,
            available: true,
            location: { lat: 28.6139, lng: 77.2090 },
            earnings: 15000,
            total_rides: 1247
          },
          {
            name: 'Priya Singh',
            phone: '+91 87654 32109',
            email: 'priya@example.com',
            vehicle_type: 'Sedan',
            vehicle_number: 'DL 02 CD 5678',
            rating: 4.7,
            available: true,
            location: { lat: 28.6219, lng: 77.2085 },
            earnings: 12500,
            total_rides: 876
          },
          {
            name: 'Amit Sharma',
            phone: '+91 76543 21098',
            email: 'amit@example.com',
            vehicle_type: 'SUV',
            vehicle_number: 'DL 03 EF 9012',
            rating: 4.2,
            available: true,
            location: { lat: 28.6129, lng: 77.2295 },
            earnings: 25000,
            total_rides: 2156
          },
          {
            name: 'Neha Patel',
            phone: '+91 65432 10987',
            email: 'neha@example.com',
            vehicle_type: 'MUV',
            vehicle_number: 'DL 04 GH 3456',
            rating: 4.8,
            available: true,
            location: { lat: 28.6289, lng: 77.2065 },
            earnings: 18500,
            total_rides: 1543
          },
          {
            name: 'Vikash Yadav',
            phone: '+91 54321 09876',
            email: 'vikash@example.com',
            vehicle_type: 'Sedan',
            vehicle_number: 'DL 05 IJ 7890',
            rating: 4.3,
            available: true,
            location: { lat: 28.6199, lng: 77.2175 },
            earnings: 21000,
            total_rides: 1789
          }
        ];

        // Add each sample driver
        for (const driver of sampleDrivers) {
          await supabaseDB.drivers.add(driver);
        }
        
        console.log('Sample drivers initialized in Supabase');
      }
    } catch (error) {
      console.error('Error initializing sample data:', error);
    }
  }

  // Booking operations
  async saveBooking(booking) {
    try {
      console.log('Attempting to save booking:', booking);
      
      // Default coordinates for Delhi if no specific location provided
      const defaultPickupLocation = { lat: 28.6139, lng: 77.2090 };
      const defaultDropLocation = { lat: 28.6219, lng: 77.2085 };
      
      const bookingData = {
        customer_name: booking.customerName || booking.customer_name || 'Unknown Customer',
        customer_phone: booking.customerPhone || booking.customer_phone || '+91 0000000000',
        pickup_location: booking.pickup?.coords ? 
          { lat: booking.pickup.coords[0], lng: booking.pickup.coords[1] } : 
          defaultPickupLocation,
        drop_location: booking.drop?.coords ? 
          { lat: booking.drop.coords[0], lng: booking.drop.coords[1] } : 
          defaultDropLocation,
        pickup_address: typeof booking.pickup === 'string' ? booking.pickup : (booking.pickup_address || 'Unknown Location'),
        drop_address: typeof booking.drop === 'string' ? booking.drop : (booking.drop_address || 'Unknown Destination'),
        distance: parseFloat(booking.distance) || 0,
        estimated_fare: parseFloat(booking.price || booking.estimated_fare) || 0,
        status: booking.status || 'pending',
        payment_method: booking.paymentMethod || booking.payment_method || 'cash',
        special_requests: booking.specialRequests || booking.special_requests || null
      };
      
      // Add optional fields if they exist
      if (booking.driverId) {
        bookingData.selected_driver_id = booking.driverId;
      }
      
      console.log('Processed booking data:', bookingData);

      const { data, error } = await supabaseDB.bookings.add(bookingData);
      
      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }
      
      console.log('Booking saved successfully:', data);
      return data[0];
    } catch (error) {
      console.error('Error saving booking:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      throw error;
    }
  }

  async getBookings(userId = null) {
    try {
      const { data, error } = await supabaseDB.bookings.getAll();
      
      if (error) {
        console.error('Error getting bookings:', error);
        return [];
      }
      
      // Filter by userId if provided (you might need to add user_id field to bookings table)
      return userId ? data.filter(booking => booking.user_id === userId) : data;
    } catch (error) {
      console.error('Error getting bookings:', error);
      return [];
    }
  }

  async getBookingById(id) {
    try {
      const { data, error } = await supabaseDB.bookings.getAll();
      
      if (error) {
        console.error('Error getting booking by ID:', error);
        return null;
      }
      
      return data.find(booking => booking.id === id) || null;
    } catch (error) {
      console.error('Error getting booking by ID:', error);
      return null;
    }
  }

  async updateBookingStatus(id, status) {
    try {
      const { data, error } = await supabaseDB.bookings.update(id, { status });
      
      if (error) {
        console.error('Error updating booking status:', error);
        return null;
      }
      
      return data[0];
    } catch (error) {
      console.error('Error updating booking status:', error);
      return null;
    }
  }

  // Driver operations
  async getDrivers() {
    try {
      const { data, error } = await supabaseDB.drivers.getAll();
      
      if (error) {
        console.error('Error getting drivers:', error);
        return [];
      }
      
      // Map to maintain compatibility with existing code
      return data.map(driver => ({
        ...driver,
        docId: driver.id,
        // Map Supabase fields to legacy field names for compatibility
        totalRides: driver.total_rides,
        car: {
          model: driver.vehicle_type,
          type: driver.vehicle_type,
          plate: driver.vehicle_number
        },
        status: driver.available ? 'available' : 'offline'
      }));
    } catch (error) {
      console.error('Error getting drivers:', error);
      return [];
    }
  }

  async getDriverById(id) {
    try {
      const drivers = await this.getDrivers();
      return drivers.find(driver => driver.id === id || driver.docId === id) || null;
    } catch (error) {
      console.error('Error getting driver by ID:', error);
      return null;
    }
  }

  async updateDriverStatus(id, status) {
    try {
      const available = status === 'available';
      const { data, error } = await supabaseDB.drivers.update(id, { available });
      
      if (error) {
        console.error('Error updating driver status:', error);
        return null;
      }
      
      return await this.getDriverById(id);
    } catch (error) {
      console.error('Error updating driver status:', error);
      return null;
    }
  }

  // User operations
  async getUserBookingHistory(userId) {
    try {
      const bookings = await this.getBookings(userId);
      return bookings.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    } catch (error) {
      console.error('Error getting user booking history:', error);
      return [];
    }
  }

  // Analytics
  async getBookingStats(userId) {
    try {
      const userBookings = await this.getBookings(userId);
      
      return {
        totalBookings: userBookings.length,
        completedRides: userBookings.filter(b => b.status === 'completed').length,
        cancelledRides: userBookings.filter(b => b.status === 'cancelled').length,
        totalSpent: userBookings.reduce((sum, b) => sum + (b.estimated_fare || 0), 0),
        averageRating: userBookings.reduce((sum, b) => sum + (b.rating || 5), 0) / userBookings.length || 5
      };
    } catch (error) {
      console.error('Error getting booking stats:', error);
      return {
        totalBookings: 0,
        completedRides: 0,
        cancelledRides: 0,
        totalSpent: 0,
        averageRating: 5
      };
    }
  }
}

export const database = new SupabaseDatabase();
