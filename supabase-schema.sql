-- Complete SQL Schema for Cab Bidding System
-- Run these commands in your Supabase SQL Editor

-- 1. Create Users Table (for customers)
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE,
    name VARCHAR(255) NOT NULL,
    profile_picture TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Create Drivers Table
CREATE TABLE IF NOT EXISTS drivers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    vehicle_type VARCHAR(50) NOT NULL,
    vehicle_number VARCHAR(20) UNIQUE NOT NULL,
    vehicle_model VARCHAR(100),
    license_number VARCHAR(50) UNIQUE,
    rating DECIMAL(3,2) DEFAULT 4.5 CHECK (rating >= 0 AND rating <= 5),
    total_rides INTEGER DEFAULT 0,
    available BOOLEAN DEFAULT true,
    location JSONB, -- {lat: number, lng: number}
    earnings DECIMAL(10,2) DEFAULT 0,
    profile_picture TEXT,
    documents JSONB, -- Store license, vehicle docs etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Create Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    customer_name VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    pickup_location JSONB NOT NULL, -- {lat: number, lng: number}
    drop_location JSONB NOT NULL, -- {lat: number, lng: number}
    pickup_address TEXT NOT NULL,
    drop_address TEXT NOT NULL,
    distance DECIMAL(8,2), -- in kilometers
    estimated_fare DECIMAL(10,2) NOT NULL,
    final_fare DECIMAL(10,2),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'ongoing', 'completed', 'cancelled')),
    payment_method VARCHAR(20) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'card', 'upi', 'wallet')),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded')),
    special_requests TEXT,
    
    -- Driver assignment fields
    driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
    driver_name VARCHAR(255),
    driver_phone VARCHAR(20),
    vehicle_type VARCHAR(50),
    vehicle_number VARCHAR(20),
    driver_rating DECIMAL(3,2),
    
    -- Booking lifecycle timestamps
    booking_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    accepted_at TIMESTAMP WITH TIME ZONE,
    pickup_time TIMESTAMP WITH TIME ZONE,
    drop_time TIMESTAMP WITH TIME ZONE,
    
    -- Additional fields
    otp VARCHAR(6),
    eta_minutes INTEGER,
    customer_rating DECIMAL(3,2) CHECK (customer_rating >= 0 AND customer_rating <= 5),
    driver_rating_given DECIMAL(3,2) CHECK (driver_rating_given >= 0 AND driver_rating_given <= 5),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create Bids Table (Enhanced)
CREATE TABLE IF NOT EXISTS bids (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    driver_name VARCHAR(255) NOT NULL,
    driver_phone VARCHAR(20),
    vehicle_type VARCHAR(50) NOT NULL,
    vehicle_number VARCHAR(20),
    driver_rating DECIMAL(3,2) DEFAULT 4.5,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
    bid_message TEXT, -- Optional message from driver
    estimated_arrival_time INTEGER, -- in minutes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure one bid per driver per booking
    UNIQUE(booking_id, driver_id)
);

-- 5. Create Notifications Table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
    bid_id UUID REFERENCES bids(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- 'new_booking', 'bid_received', 'bid_accepted', 'ride_confirmed', etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    read_status BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create Ratings Table
CREATE TABLE IF NOT EXISTS ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    rating DECIMAL(3,2) NOT NULL CHECK (rating >= 0 AND rating <= 5),
    review TEXT,
    rated_by VARCHAR(10) NOT NULL CHECK (rated_by IN ('customer', 'driver')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure only one rating per booking per person
    UNIQUE(booking_id, rated_by)
);

-- 7. Create Payment Transactions Table
CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    transaction_id VARCHAR(255) UNIQUE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
    gateway_response JSONB, -- Store payment gateway response
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create Indexes for Better Performance
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_driver_id ON bookings(driver_id);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);

CREATE INDEX IF NOT EXISTS idx_bids_booking_id ON bids(booking_id);
CREATE INDEX IF NOT EXISTS idx_bids_driver_id ON bids(driver_id);
CREATE INDEX IF NOT EXISTS idx_bids_status ON bids(status);
CREATE INDEX IF NOT EXISTS idx_bids_created_at ON bids(created_at);

CREATE INDEX IF NOT EXISTS idx_drivers_available ON drivers(available);
CREATE INDEX IF NOT EXISTS idx_drivers_location ON drivers USING GIN(location);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_driver_id ON notifications(driver_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read_status ON notifications(read_status);

-- Create Functions for Updated Timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create Triggers for Updated Timestamps
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bids_updated_at BEFORE UPDATE ON bids FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_transactions_updated_at BEFORE UPDATE ON payment_transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies (Basic - you might want to customize these)

-- Users can only see/edit their own data
CREATE POLICY "Users can view own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);

-- Drivers can only see/edit their own data
CREATE POLICY "Drivers can view own data" ON drivers FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Drivers can update own data" ON drivers FOR UPDATE USING (auth.uid() = id);

-- Bookings - users can see their bookings, drivers can see bookings they're assigned to or can bid on
CREATE POLICY "Users can view own bookings" ON bookings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Drivers can view available bookings" ON bookings FOR SELECT USING (status = 'pending' OR driver_id = auth.uid());

-- Bids - drivers can see their own bids, users can see bids on their bookings
CREATE POLICY "Drivers can view own bids" ON bids FOR SELECT USING (driver_id = auth.uid());
CREATE POLICY "Users can view bids on their bookings" ON bids FOR SELECT USING (
    EXISTS (SELECT 1 FROM bookings WHERE bookings.id = booking_id AND bookings.user_id = auth.uid())
);

-- Insert sample data (Optional - for testing)
-- You can uncomment these if you want some test data

/*
-- Sample Users
INSERT INTO users (email, phone, name) VALUES
('john.doe@example.com', '+919876543210', 'John Doe'),
('jane.smith@example.com', '+919876543211', 'Jane Smith'),
('mike.wilson@example.com', '+919876543212', 'Mike Wilson');

-- Sample Drivers  
INSERT INTO drivers (email, phone, name, vehicle_type, vehicle_number, vehicle_model, license_number) VALUES
('rajesh.driver@example.com', '+919876543220', 'Rajesh Kumar', 'Hatchback', 'DL01AB1234', 'Maruti Swift', 'DL1234567890'),
('priya.driver@example.com', '+919876543221', 'Priya Singh', 'Sedan', 'DL02CD5678', 'Honda City', 'DL1234567891'),
('amit.driver@example.com', '+919876543222', 'Amit Sharma', 'SUV', 'DL03EF9012', 'Mahindra XUV', 'DL1234567892');
*/

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Cab Bidding System schema created successfully!';
    RAISE NOTICE 'Tables created: users, drivers, bookings, bids, notifications, ratings, payment_transactions';
    RAISE NOTICE 'Indexes, triggers, and RLS policies have been set up.';
    RAISE NOTICE 'You can now run your application with the enhanced database schema.';
END $$;
