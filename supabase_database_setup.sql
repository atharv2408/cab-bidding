-- Supabase Database Setup for Cab Bidding System
-- Run this in your Supabase SQL Editor

-- Create users table for authentication
CREATE TABLE users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  user_type VARCHAR(20) DEFAULT 'customer' CHECK (user_type IN ('customer', 'driver', 'admin')),
  profile_image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  is_verified BOOLEAN DEFAULT false,
  last_login TIMESTAMPTZ,
  login_count INTEGER DEFAULT 0,
  password_reset_token TEXT,
  password_reset_expires TIMESTAMPTZ,
  email_verification_token TEXT,
  email_verification_expires TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create drivers table
CREATE TABLE drivers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(100) UNIQUE,
  vehicle_type VARCHAR(50),
  vehicle_number VARCHAR(20),
  rating DECIMAL(3,2) DEFAULT 5.0,
  available BOOLEAN DEFAULT true,
  location JSONB,
  earnings DECIMAL(10,2) DEFAULT 0.00,
  total_rides INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create bookings table
CREATE TABLE bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name VARCHAR(100),
  customer_phone VARCHAR(20),
  pickup_location JSONB NOT NULL,
  drop_location JSONB NOT NULL,
  pickup_address TEXT,
  drop_address TEXT,
  distance DECIMAL(10,2),
  estimated_fare DECIMAL(10,2),
  actual_fare DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'pending',
  selected_driver_id UUID REFERENCES drivers(id),
  payment_method VARCHAR(50),
  special_requests TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create bids table
CREATE TABLE bids (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  estimated_time INTEGER, -- in minutes
  message TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one bid per driver per booking
  UNIQUE(booking_id, driver_id)
);

-- Create indexes for better performance
-- Users table indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_type ON users(user_type);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_last_login ON users(last_login);
CREATE INDEX idx_users_created_at ON users(created_at DESC);

-- Drivers table indexes
CREATE INDEX idx_drivers_available ON drivers(available);
CREATE INDEX idx_drivers_location ON drivers USING GIN(location);
CREATE INDEX idx_drivers_email ON drivers(email);

CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_driver ON bookings(selected_driver_id);
CREATE INDEX idx_bookings_created_at ON bookings(created_at DESC);

CREATE INDEX idx_bids_booking ON bids(booking_id);
CREATE INDEX idx_bids_driver ON bids(driver_id);
CREATE INDEX idx_bids_amount ON bids(amount);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers for automatic timestamp updates
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at 
    BEFORE UPDATE ON drivers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at 
    BEFORE UPDATE ON bookings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample users for testing (password: 'password123' for all)
-- Note: In production, use proper password hashing
INSERT INTO users (email, password_hash, full_name, phone, user_type, is_verified) VALUES
('customer@example.com', '$2b$10$K7GpqD/XiU.uYtJ9fVyJ/OhT2KZQKrjmF4K1kQUCFGxgQT0O8T4a.', 'Test Customer', '+91 99999 11111', 'customer', true),
('driver@example.com', '$2b$10$K7GpqD/XiU.uYtJ9fVyJ/OhT2KZQKrjmF4K1kQUCFGxgQT0O8T4a.', 'Test Driver', '+91 88888 22222', 'driver', true),
('admin@example.com', '$2b$10$K7GpqD/XiU.uYtJ9fVyJ/OhT2KZQKrjmF4K1kQUCFGxgQT0O8T4a.', 'Admin User', '+91 77777 33333', 'admin', true),
('john.doe@example.com', '$2b$10$K7GpqD/XiU.uYtJ9fVyJ/OhT2KZQKrjmF4K1kQUCFGxgQT0O8T4a.', 'John Doe', '+91 98765 43210', 'customer', true),
('jane.smith@example.com', '$2b$10$K7GpqD/XiU.uYtJ9fVyJ/OhT2KZQKrjmF4K1kQUCFGxgQT0O8T4a.', 'Jane Smith', '+91 87654 32109', 'customer', true);

-- Insert sample drivers for testing
INSERT INTO drivers (name, phone, email, vehicle_type, vehicle_number, rating, location, earnings, total_rides) VALUES
('Rajesh Kumar', '+91 98765 43210', 'rajesh@example.com', 'Hatchback', 'DL 01 AB 1234', 4.5, '{"lat": 28.6139, "lng": 77.2090}', 15000, 1247),
('Priya Singh', '+91 87654 32109', 'priya@example.com', 'Sedan', 'DL 02 CD 5678', 4.7, '{"lat": 28.6219, "lng": 77.2085}', 12500, 876),
('Amit Sharma', '+91 76543 21098', 'amit@example.com', 'SUV', 'DL 03 EF 9012', 4.2, '{"lat": 28.6129, "lng": 77.2295}', 25000, 2156),
('Neha Patel', '+91 65432 10987', 'neha@example.com', 'MUV', 'DL 04 GH 3456', 4.8, '{"lat": 28.6289, "lng": 77.2065}', 18500, 1543),
('Vikash Yadav', '+91 54321 09876', 'vikash@example.com', 'Sedan', 'DL 05 IJ 7890', 4.3, '{"lat": 28.6199, "lng": 77.2175}', 21000, 1789);

-- Insert sample bookings for testing
INSERT INTO bookings (customer_name, customer_phone, pickup_location, drop_location, pickup_address, drop_address, distance, estimated_fare, status) VALUES
('John Doe', '+91 99999 11111', '{"lat": 28.6139, "lng": 77.2090}', '{"lat": 28.6219, "lng": 77.2085}', 'Connaught Place, Delhi', 'India Gate, Delhi', 5.2, 120, 'pending'),
('Jane Smith', '+91 88888 22222', '{"lat": 28.6289, "lng": 77.2065}', '{"lat": 28.6129, "lng": 77.2295}', 'Karol Bagh, Delhi', 'Lajpat Nagar, Delhi', 8.7, 200, 'pending'),
('Bob Johnson', '+91 77777 33333', '{"lat": 28.6199, "lng": 77.2175}', '{"lat": 28.6139, "lng": 77.2090}', 'Rajouri Garden, Delhi', 'CP Metro Station, Delhi', 3.4, 80, 'pending');

-- Show success message
SELECT 'Database setup completed successfully! 🎉' as message;
