const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Joi = require('joi');
const { supabase, supabaseHelpers } = require('./supabase');

const app = express();
const PORT = 5000;
const JWT_SECRET = 'your-secret-key'; // In production, use environment variables

app.use(cors());
app.use(bodyParser.json());

// OTP storage for demo purposes (in production, use Redis or similar)
let otpStore = new Map();

// Validation schemas
const phoneValidationSchema = Joi.object({
  phoneNumber: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required().messages({
    'string.pattern.base': 'Phone number must be in valid E.164 format (e.g., +1234567890)',
    'any.required': 'Phone number is required'
  }),
  name: Joi.string().min(2).max(50).required().messages({
    'string.min': 'Name must be at least 2 characters long',
    'string.max': 'Name must be at most 50 characters long',
    'any.required': 'Name is required'
  })
});

const otpValidationSchema = Joi.object({
  phoneNumber: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required(),
  otp: Joi.string().length(6).pattern(/^[0-9]+$/).required().messages({
    'string.length': 'OTP must be exactly 6 digits',
    'string.pattern.base': 'OTP must contain only numbers',
    'any.required': 'OTP is required'
  })
});

// Generate OTP
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Simulate SMS sending (replace with actual SMS service like Twilio)
function sendOTP(phoneNumber, otp) {
  console.log(`\n📱 SMS Simulation:`);
  console.log(`   To: ${phoneNumber}`);
  console.log(`   Message: Your OTP is: ${otp}`);
  console.log(`   Valid for: 5 minutes\n`);
  
  // In production, integrate with Twilio or other SMS service
  // const twilio = require('twilio');
  // const client = twilio(accountSid, authToken);
  // return client.messages.create({
  //   body: `Your OTP is: ${otp}`,
  //   from: '+your-twilio-number',
  //   to: phoneNumber
  // });
  return Promise.resolve({ success: true });
}

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Register/Login with phone number
app.post('/auth/register', async (req, res) => {
  try {
    const { error, value } = phoneValidationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { phoneNumber, name } = value;
    
    // Check if user already exists in Supabase
    const { data: existingUser, error: findError } = await supabaseHelpers.users.findByPhone(phoneNumber);
    
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    
    if (existingUser && !findError) {
      // User exists, generate new OTP
      console.log('📱 Existing user found:', existingUser.full_name);
      
      // Store OTP in memory for demo
      otpStore.set(phoneNumber, { otp, expiry: otpExpiry, userId: existingUser.id });
      
      await sendOTP(phoneNumber, otp);
      
      return res.json({ 
        message: 'OTP sent successfully', 
        phoneNumber,
        isNewUser: false
      });
    }
    
    // Create new user in Supabase
    const { data: newUser, error: createError } = await supabaseHelpers.users.create({
      phoneNumber,
      name
    });
    
    if (createError) {
      console.error('Error creating user in Supabase:', createError);
      return res.status(500).json({ error: 'Failed to create user account' });
    }
    
    console.log('👤 New user created in Supabase:', newUser.full_name, 'ID:', newUser.id);
    
    // Store OTP in memory for demo
    otpStore.set(phoneNumber, { otp, expiry: otpExpiry, userId: newUser.id });
    
    await sendOTP(phoneNumber, otp);
    
    res.json({ 
      message: 'User registered successfully. OTP sent to your phone.', 
      phoneNumber,
      isNewUser: true
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Verify OTP
app.post('/auth/verify-otp', async (req, res) => {
  try {
    const { error, value } = otpValidationSchema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { phoneNumber, otp } = value;
    
    // Check OTP from memory store (for demo)
    const storedOtpData = otpStore.get(phoneNumber);
    if (!storedOtpData) {
      return res.status(400).json({ error: 'OTP not found. Please request a new OTP.' });
    }
    
    if (new Date() > storedOtpData.expiry) {
      otpStore.delete(phoneNumber);
      return res.status(400).json({ error: 'OTP has expired. Please request a new OTP.' });
    }
    
    if (storedOtpData.otp !== otp) {
      return res.status(400).json({ error: 'Invalid OTP. Please try again.' });
    }
    
    // OTP is valid, get user from Supabase
    const { data: user, error: userError } = await supabaseHelpers.users.findById(storedOtpData.userId);
    if (!user || userError) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log('✅ OTP verified for user:', user.full_name);
    
    // Clear OTP from memory
    otpStore.delete(phoneNumber);
    
    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, phoneNumber: user.phone },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      message: 'Phone number verified successfully',
      token,
      user: {
        id: user.id,
        name: user.full_name,
        phoneNumber: user.phone,
        isVerified: user.is_verified
      }
    });
    
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Resend OTP
app.post('/auth/resend-otp', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }
    
    const user = users.find(user => user.phoneNumber === phoneNumber);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    
    user.otp = otp;
    user.otpExpiry = otpExpiry;
    
    // Store OTP in memory for demo
    otpStore.set(phoneNumber, { otp, expiry: otpExpiry });
    
    await sendOTP(phoneNumber, otp);
    
    res.json({ message: 'OTP resent successfully' });
    
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user profile (protected route)
app.get('/auth/profile', authenticateToken, async (req, res) => {
  try {
    const { data: user, error } = await supabaseHelpers.users.findById(req.user.userId);
    if (!user || error) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({
      user: {
        id: user.id,
        name: user.full_name,
        phoneNumber: user.phone,
        isVerified: user.is_verified
      }
    });
  } catch (error) {
    console.error('Profile error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Protected bid endpoint
app.post('/bid', authenticateToken, async (req, res) => {
  try {
    const { pickup, drop } = req.body;
    
    if (!pickup || !drop) {
      return res.status(400).json({ error: 'Pickup and drop locations are required' });
    }
    
    // Verify user is authenticated and verified
    const user = users.find(user => user.id === req.user.userId);
    if (!user || !user.isVerified) {
      return res.status(403).json({ error: 'User not verified' });
    }
    
    const bids = drivers.map(driver => ({
      ...driver,
      bidAmount: Math.floor(Math.random() * 200) + 100
    }));

    res.json({
      bids,
      user: {
        name: user.name,
        phoneNumber: user.phoneNumber
      }
    });
  } catch (error) {
    console.error('Bid error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Booking management endpoints
app.post('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const bookingData = req.body;
    
    // Add user ID from token
    const { data: user, error: userError } = await supabaseHelpers.users.findById(req.user.userId);
    if (userError || !user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Ensure customer phone matches the authenticated user
    bookingData.customer_phone = user.phone;
    bookingData.customer_name = user.full_name;
    
    const { data: booking, error } = await supabaseHelpers.bookings.create(bookingData);
    
    if (error) {
      console.error('Error creating booking:', error);
      return res.status(500).json({ success: false, message: 'Failed to create booking' });
    }
    
    console.log('🎆 New booking created:', booking.id, 'for user:', user.full_name);
    
    res.json({
      success: true,
      booking,
      message: 'Booking created successfully'
    });
    
  } catch (error) {
    console.error('Booking creation error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Update booking status endpoint
app.put('/api/bookings/:id/status', authenticateToken, async (req, res) => {
  try {
    const bookingId = req.params.id;
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required' });
    }
    
    // Validate status
    const validStatuses = ['pending', 'confirmed', 'active', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    
    const updateData = {
      status,
      updated_at: new Date().toISOString()
    };
    
    // Add timestamp for specific status updates
    if (status === 'confirmed') {
      updateData.confirmed_at = new Date().toISOString();
    } else if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    } else if (status === 'cancelled') {
      updateData.cancelled_at = new Date().toISOString();
    }
    
    const { data: booking, error } = await supabaseHelpers.bookings.update(bookingId, updateData);
    
    if (error) {
      console.error('Error updating booking status:', error);
      return res.status(500).json({ success: false, message: 'Failed to update booking status' });
    }
    
    console.log(`📋 Booking ${bookingId} status updated to: ${status}`);
    
    res.json({
      success: true,
      booking,
      message: `Booking status updated to ${status}`
    });
    
  } catch (error) {
    console.error('Booking status update error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get active bookings (not completed or cancelled)
app.get('/api/bookings/active', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user data from Supabase
    const { data: user, error: userError } = await supabaseHelpers.users.findById(userId);
    if (!user || userError) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Get active bookings from Supabase
    const { data: allBookings, error } = await supabaseHelpers.bookings.getByCustomerPhone(user.phone);
    
    if (error) {
      console.error('Error fetching bookings:', error);
      return res.json({ success: true, bookings: [] });
    }
    
    // Filter for active bookings (not completed or cancelled)
    const activeBookings = (allBookings || []).filter(booking => 
      !['completed', 'cancelled'].includes(booking.status)
    );
    
    console.log(`📊 Found ${activeBookings.length} active bookings for user ${user.full_name}`);
    
    res.json({
      success: true,
      bookings: activeBookings
    });
    
  } catch (error) {
    console.error('Get active bookings error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Driver authentication endpoints
app.post('/api/driver/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // In a real app, verify against database
    // For demo, accept any driver email/password
    const demoDriver = {
      id: 'driver_' + Date.now(),
      email,
      name: 'Demo Driver',
      phone: '+1234567890',
      vehicleType: 'Sedan',
      rating: 4.7,
      totalRides: 245
    };
    
    const token = jwt.sign(
      { driverId: demoDriver.id, email: demoDriver.email, type: 'driver' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      success: true,
      message: 'Driver login successful',
      token,
      driver: demoDriver
    });
  } catch (error) {
    console.error('Driver login error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Complete ride endpoint
app.post('/api/ride/complete', authenticateToken, async (req, res) => {
  try {
    const { bookingId, driverId, customerId, finalFare, completedAt, paymentStatus } = req.body;
    
    if (!bookingId || !driverId || !customerId || !finalFare) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    // Check if booking exists in Supabase
    const { data: existingBooking, error: findError } = await supabaseHelpers.bookings.getById(bookingId);
    
    if (!existingBooking) {
      // If booking doesn't exist, create it
      const { data: user, error: userError } = await supabaseHelpers.users.findById(customerId);
      
      const bookingData = {
        id: bookingId,
        customer_phone: user?.phone || 'Unknown',
        customer_name: user?.full_name || 'Customer', 
        pickup_location: { lat: 0, lng: 0 },
        drop_location: { lat: 0, lng: 0 },
        pickup_address: 'Pickup Location',
        drop_address: 'Drop Location',
        distance: 0,
        estimated_fare: parseFloat(finalFare),
        actual_fare: parseFloat(finalFare),
        status: 'completed',
        selected_driver_id: driverId,
        completed_at: completedAt || new Date().toISOString()
      };
      
      const { data: newBooking, error: createError } = await supabaseHelpers.bookings.create(bookingData);
      
      if (createError) {
        console.error('Error creating booking:', createError);
        return res.status(500).json({ success: false, message: 'Failed to create booking record' });
      }
      
      console.log('🎆 New booking created and completed:', newBooking.id);
    } else if (existingBooking.status === 'completed') {
      return res.json({
        success: true,
        message: 'Ride already completed',
        rideRecord: existingBooking
      });
    } else {
      // Update existing booking to completed
      const updateData = {
        status: 'completed',
        actual_fare: parseFloat(finalFare),
        completed_at: completedAt || new Date().toISOString()
      };
      
      const { data: updatedBooking, error: updateError } = await supabaseHelpers.bookings.update(bookingId, updateData);
      
      if (updateError) {
        console.error('Error updating booking:', updateError);
        return res.status(500).json({ success: false, message: 'Failed to update booking' });
      }
      
      console.log('📝 Ride completed in Supabase:', updatedBooking.id);
    }
    
    // Update driver earnings in Supabase
    const { data: driverUpdate, error: driverError } = await supabaseHelpers.drivers.updateEarnings(driverId, parseFloat(finalFare));
    
    if (driverError) {
      console.error('Error updating driver earnings:', driverError);
    } else {
      console.log('💰 Driver earnings updated:', driverUpdate);
    }
    
    const rideRecord = {
      id: bookingId,
      bookingId,
      driverId,
      customerId,
      finalFare: parseFloat(finalFare),
      status: 'completed',
      completedAt: completedAt || new Date().toISOString(),
      paymentStatus: paymentStatus || 'paid'
    };
    
    res.json({
      success: true,
      message: 'Ride completed successfully',
      rideRecord,
      earnings: finalFare
    });
    
  } catch (error) {
    console.error('Complete ride error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Cancel ride endpoint
app.post('/api/ride/cancel', authenticateToken, async (req, res) => {
  try {
    const { bookingId, driverId, customerId, reason, cancelledAt, cancelledBy } = req.body;
    
    if (!bookingId || !driverId || !reason) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }
    
    // In a real app, update database records
    const cancellationRecord = {
      bookingId,
      driverId,
      customerId,
      reason,
      status: 'cancelled',
      cancelledAt: cancelledAt || new Date().toISOString(),
      cancelledBy: cancelledBy || 'driver'
    };
    
    // Simulate database update
    console.log('❌ Ride cancelled:', cancellationRecord);
    
    res.json({
      success: true,
      message: 'Ride cancelled successfully',
      cancellationRecord
    });
    
  } catch (error) {
    console.error('Cancel ride error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get customer ride history
app.get('/api/customer/history', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // Get user data from Supabase
    const { data: user, error: userError } = await supabaseHelpers.users.findById(userId);
    if (!user || userError) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Get bookings from Supabase for this customer
    const { data: bookings, error: bookingsError } = await supabaseHelpers.bookings.getByCustomerPhone(user.phone);
    
    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      // Fall back to mock data if Supabase query fails
    } else if (bookings && bookings.length > 0) {
      // Transform Supabase bookings to expected format
      const customerHistory = bookings.map(booking => ({
        id: booking.id,
        user_id: userId,
        customer_name: booking.customer_name || user.full_name,
        customer_phone: booking.customer_phone || user.phone,
        pickup_address: booking.pickup_address || 'Pickup Location',
        drop_address: booking.drop_address || 'Drop Location',
        distance: booking.distance?.toString() || '0',
        estimated_fare: parseFloat(booking.estimated_fare || 0),
        final_fare: parseFloat(booking.actual_fare || booking.estimated_fare || 0),
        status: booking.status,
        payment_status: booking.status === 'completed' ? 'paid' : 'pending',
        driver_name: 'Driver', // Will be enhanced with driver data later
        driver_phone: '',
        vehicle_model: 'Cab',
        vehicle_number: 'N/A',
        driver_rating: 4.5,
        customer_rating: null,
        booking_time: booking.created_at,
        completed_at: booking.completed_at,
        created_at: booking.created_at
      }));
      
      console.log(`📊 Found ${customerHistory.length} bookings for user ${user.full_name}`);
      
      return res.json({
        success: true,
        history: customerHistory,
        totalBookings: customerHistory.length,
        completedRides: customerHistory.filter(booking => booking.status === 'completed').length,
        totalSpent: customerHistory
          .filter(booking => booking.status === 'completed')
          .reduce((sum, booking) => sum + (booking.final_fare || 0), 0)
      });
    }
    
    // Mock customer ride history data (fallback)
    const customerHistory = [
      {
        id: 'booking_001',
        user_id: userId,
        customer_name: 'John Doe',
        customer_phone: '+1234567890',
        pickup_address: 'Downtown Shopping Mall, Main Street',
        drop_address: 'JFK International Airport, Terminal 4',
        distance: '18.5',
        estimated_fare: 32.50,
        final_fare: 32.50,
        status: 'completed',
        payment_status: 'paid',
        driver_name: 'Sarah Johnson',
        driver_phone: '+1234567891',
        vehicle_model: 'Toyota Camry',
        vehicle_number: 'ABC-123',
        driver_rating: 4.8,
        customer_rating: 5,
        booking_time: new Date(Date.now() - 86400000).toISOString(),
        completed_at: new Date(Date.now() - 86400000 + 1800000).toISOString(),
        created_at: new Date(Date.now() - 86400000).toISOString()
      },
      {
        id: 'booking_002',
        user_id: userId,
        customer_name: 'John Doe',
        customer_phone: '+1234567890',
        pickup_address: 'University Campus, College Ave',
        drop_address: 'Business District, Wall Street',
        distance: '12.3',
        estimated_fare: 24.75,
        final_fare: 24.75,
        status: 'completed',
        payment_status: 'paid',
        driver_name: 'Mike Chen',
        driver_phone: '+1234567892',
        vehicle_model: 'Honda Civic',
        vehicle_number: 'DEF-456',
        driver_rating: 4.6,
        customer_rating: 4,
        booking_time: new Date(Date.now() - 172800000).toISOString(),
        completed_at: new Date(Date.now() - 172800000 + 1200000).toISOString(),
        created_at: new Date(Date.now() - 172800000).toISOString()
      },
      {
        id: 'booking_003',
        user_id: userId,
        customer_name: 'John Doe',
        customer_phone: '+1234567890',
        pickup_address: 'Train Station, Platform 3',
        drop_address: 'Residential Area, Oak Street',
        distance: '15.2',
        estimated_fare: 28.00,
        final_fare: null,
        status: 'cancelled',
        payment_status: 'refunded',
        driver_name: 'David Brown',
        driver_phone: '+1234567893',
        vehicle_model: 'Nissan Altima',
        vehicle_number: 'GHI-789',
        driver_rating: 4.3,
        customer_rating: null,
        booking_time: new Date(Date.now() - 345600000).toISOString(),
        cancelled_at: new Date(Date.now() - 345600000 + 600000).toISOString(),
        cancellation_reason: 'Customer cancelled',
        created_at: new Date(Date.now() - 345600000).toISOString()
      }
    ];
    
    res.json({
      success: true,
      history: customerHistory,
      totalBookings: customerHistory.length,
      completedRides: customerHistory.filter(booking => booking.status === 'completed').length,
      totalSpent: customerHistory
        .filter(booking => booking.status === 'completed')
        .reduce((sum, booking) => sum + (booking.final_fare || 0), 0)
    });
    
  } catch (error) {
    console.error('Get customer history error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Get driver ride history
app.get('/api/driver/history', authenticateToken, async (req, res) => {
  try {
    const driverId = req.user.driverId;
    
    // Mock ride history data (in real app, fetch from database)
    const rideHistory = [
      {
        id: 'ride_h1',
        bookingId: 'booking_001',
        date: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        customer: {
          name: 'Sarah Johnson',
          phone: '+1234567890',
          rating: 4.8
        },
        pickup: 'Downtown Shopping Mall, Main Street',
        drop: 'JFK International Airport, Terminal 4',
        distance: '18.5 km',
        fare: 32.50,
        status: 'completed',
        paymentStatus: 'paid',
        customerRating: 5,
        completedAt: new Date(Date.now() - 86400000 + 1800000).toISOString() // 30 min later
      },
      {
        id: 'ride_h2',
        bookingId: 'booking_002',
        date: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        customer: {
          name: 'Mike Chen',
          phone: '+1234567891',
          rating: 4.6
        },
        pickup: 'University Campus, College Ave',
        drop: 'Business District, Wall Street',
        distance: '12.3 km',
        fare: 24.75,
        status: 'completed',
        paymentStatus: 'paid',
        customerRating: 4,
        completedAt: new Date(Date.now() - 172800000 + 1200000).toISOString() // 20 min later
      },
      {
        id: 'ride_h3',
        bookingId: 'booking_003',
        date: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
        customer: {
          name: 'Emma Wilson',
          phone: '+1234567892',
          rating: 4.9
        },
        pickup: 'Hotel Grand Plaza, 5th Avenue',
        drop: 'Central Shopping Center, Mall Road',
        distance: '8.7 km',
        fare: 19.25,
        status: 'completed',
        paymentStatus: 'paid',
        customerRating: 5,
        completedAt: new Date(Date.now() - 259200000 + 900000).toISOString() // 15 min later
      },
      {
        id: 'ride_h4',
        bookingId: 'booking_004',
        date: new Date(Date.now() - 345600000).toISOString(), // 4 days ago
        customer: {
          name: 'David Brown',
          phone: '+1234567893',
          rating: 4.3
        },
        pickup: 'Train Station, Platform 3',
        drop: 'Residential Area, Oak Street',
        distance: '15.2 km',
        fare: 28.00,
        status: 'cancelled',
        paymentStatus: 'refunded',
        cancellationReason: 'Customer not found at pickup',
        cancelledAt: new Date(Date.now() - 345600000 + 600000).toISOString() // 10 min later
      }
    ];
    
    res.json({
      success: true,
      history: rideHistory,
      totalRides: rideHistory.filter(ride => ride.status === 'completed').length,
      totalEarnings: rideHistory
        .filter(ride => ride.status === 'completed')
        .reduce((sum, ride) => sum + ride.fare, 0)
    });
    
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start driver server on port 3001
const DRIVER_PORT = 3001;
app.listen(DRIVER_PORT, async () => {
  console.log(`\n🚀 Cab Bidding System Server running at http://localhost:${DRIVER_PORT}`);
  
  // Test Supabase connection
  console.log('\n🔍 Testing database connection...');
  const isConnected = await supabaseHelpers.testConnection();
  
  if (isConnected) {
    console.log('✅ Database: Connected to Supabase successfully');
    console.log('📋 Database: All data will be stored in Supabase');
  } else {
    console.log('⚠️ Database: Supabase connection failed - using fallback mode');
  }
  
  console.log('\n📋 Available endpoints:');
  console.log('\n🔐 Customer Authentication:');
  console.log('   POST /auth/register - Register/Login with phone number');
  console.log('   POST /auth/verify-otp - Verify OTP');
  console.log('   POST /auth/resend-otp - Resend OTP');
  console.log('   GET /auth/profile - Get user profile (protected)');
  console.log('   GET /api/customer/history - Get customer ride history (protected)');
  console.log('\n🚗 Driver Authentication & Management:');
  console.log('   POST /api/driver/login - Driver login');
  console.log('   GET /api/driver/history - Get driver ride history (protected)');
  console.log('   POST /api/ride/complete - Complete ride (protected)');
  console.log('   POST /api/ride/cancel - Cancel ride (protected)');
  console.log('\n🎯 Booking System:');
  console.log('   POST /bid - Place bid (protected)');
  console.log('\n🏥 System:');
  console.log('   GET /health - Health check');
  console.log('\n🔐 Authentication required for protected routes');
  console.log('   Add Authorization header: Bearer <token>\n');
});
