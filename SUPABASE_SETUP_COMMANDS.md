# Supabase Setup Commands

This guide provides the exact commands and SQL scripts needed to set up your Supabase database for the cab-bidding-system.

## Project Configuration

**Project URL:** `https://gxnolhrjdkfyyrtkcjhm.supabase.co`
**Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4bm9saHJqZGtmeXlydGtjamhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MDg5NTksImV4cCI6MjA3MDQ4NDk1OX0.YdHAqb5W02sprZSC-h8L4KduWTgzfPcXG6I5-HEWWVw`

## Step 1: Environment Configuration

Create/update your `.env` file in the project root:

```bash
# Copy the new configuration
echo "# Supabase Configuration
REACT_APP_SUPABASE_URL=https://gxnolhrjdkfyyrtkcjhm.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4bm9saHJqZGtmeXlydGtjamhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MDg5NTksImV4cCI6MjA3MDQ4NDk1OX0.YdHAqb5W02sprZSC-h8L4KduWTgzfPcXG6I5-HEWWVw" > .env
```

## Step 2: Database Schema Setup

### Option A: Complete Schema (Recommended)
Go to your Supabase project → SQL Editor → New query, and run this complete schema:

```sql
-- Complete SQL Schema for Cab Bidding System
-- Run this in your Supabase SQL Editor

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

-- Enable Row Level Security (RLS) - Basic setup
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (You can customize these)
-- Allow read access for authenticated users
CREATE POLICY "Allow read for authenticated users" ON drivers FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read for authenticated users" ON bookings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Allow read for authenticated users" ON bids FOR SELECT USING (auth.role() = 'authenticated');

-- Insert sample data for testing
INSERT INTO drivers (email, phone, name, vehicle_type, vehicle_number, vehicle_model, license_number, location) VALUES
('rajesh.driver@example.com', '+919876543220', 'Rajesh Kumar', 'Hatchback', 'DL01AB1234', 'Maruti Swift', 'DL1234567890', '{"lat": 28.6139, "lng": 77.2090}'),
('priya.driver@example.com', '+919876543221', 'Priya Singh', 'Sedan', 'DL02CD5678', 'Honda City', 'DL1234567891', '{"lat": 28.6219, "lng": 77.2085}'),
('amit.driver@example.com', '+919876543222', 'Amit Sharma', 'SUV', 'DL03EF9012', 'Mahindra XUV', 'DL1234567892', '{"lat": 28.6129, "lng": 77.2295}');

-- Success message
SELECT 'Cab Bidding System database setup completed successfully! 🎉' as message;
```

## Step 3: Authentication Setup

### Enable Email Authentication (In Supabase Dashboard)

1. Go to **Authentication** → **Settings** → **Auth Providers**
2. Enable **Email** provider
3. Configure email templates (optional)

### Configure Authentication Settings

```sql
-- Run this in SQL Editor to set up auth configuration
-- Enable email confirmations (optional)
UPDATE auth.config SET enable_email_confirmations = false WHERE id = 1;

-- Set JWT expiry (optional - 7 days)
UPDATE auth.config SET jwt_expiry = 604800 WHERE id = 1;
```

## Step 4: Testing Commands

```bash
# Test Supabase connection
node test_supabase_connection.js

# Test authentication system
node test_supabase_auth.js

# Test full registration flow
node debug_full_registration.js

# Start the development servers
# Terminal 1 - Backend
cd backend && node index.js

# Terminal 2 - Frontend
npm start
```

## Step 5: Verification Steps

### 1. Check Database Tables
Run this query in Supabase SQL Editor to verify tables:

```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

### 2. Check Authentication
```sql
-- Check if auth is working (should show your project info)
SELECT * FROM auth.config;
```

### 3. Test Sample Data
```sql
-- Verify sample drivers were inserted
SELECT name, vehicle_type, phone FROM drivers;
```

## Step 6: Optional RLS Policy Customization

If you want more restrictive access, run these policies:

```sql
-- More restrictive policies (customize as needed)

-- Users can only see their own data
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);

-- Drivers can only see available bookings or their assigned ones
CREATE POLICY "Drivers can view bookings" ON bookings FOR SELECT 
USING (status = 'pending' OR driver_id = auth.uid());

-- Users can see bids on their bookings
CREATE POLICY "Users can view bids on their bookings" ON bids FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM bookings 
    WHERE bookings.id = booking_id 
    AND bookings.user_id = auth.uid()
  )
);
```

## Quick Reference Commands

```bash
# Install dependencies
npm install
cd backend && npm install
cd ../my-react-app && npm install

# Start all services
# Terminal 1
cd backend && node index.js

# Terminal 2  
npm start

# Terminal 3 (optional)
cd my-react-app && npm run dev
```

## Troubleshooting

### Common Issues:

1. **"relation does not exist"**
   - Ensure you've run the complete SQL schema
   - Check table names match exactly in code

2. **"insufficient_privilege"**
   - Check RLS policies
   - Verify your anon key has correct permissions

3. **Authentication not working**
   - Verify `.env` file has correct values
   - Restart development server after changing `.env`
   - Check browser console for detailed errors

4. **Connection timeout**
   - Verify the project URL is correct
   - Check your internet connection
   - Ensure Supabase project is active

Your Supabase database is now ready for the cab-bidding-system! 🚀
