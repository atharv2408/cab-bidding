-- SQL Commands to Add Missing Fields to Existing Tables
-- Use this if you already have some tables and just want to add the missing fields

-- 1. Add missing fields to existing BIDS table
ALTER TABLE bids ADD COLUMN IF NOT EXISTS driver_name VARCHAR(255);
ALTER TABLE bids ADD COLUMN IF NOT EXISTS driver_phone VARCHAR(20);
ALTER TABLE bids ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(50);
ALTER TABLE bids ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR(20);
ALTER TABLE bids ADD COLUMN IF NOT EXISTS driver_rating DECIMAL(3,2) DEFAULT 4.5;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS bid_message TEXT;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS estimated_arrival_time INTEGER;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add constraint to ensure one bid per driver per booking
ALTER TABLE bids ADD CONSTRAINT unique_driver_booking_bid UNIQUE(booking_id, driver_id);

-- 2. Add missing fields to existing DRIVERS table (if needed)
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS vehicle_model VARCHAR(100);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS license_number VARCHAR(50);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS total_rides INTEGER DEFAULT 0;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS earnings DECIMAL(10,2) DEFAULT 0;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS profile_picture TEXT;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS documents JSONB;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Add missing fields to existing BOOKINGS table (if needed)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS final_fare DECIMAL(10,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_method VARCHAR(20) DEFAULT 'cash';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS special_requests TEXT;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS driver_name VARCHAR(255);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS driver_phone VARCHAR(20);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(50);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS vehicle_number VARCHAR(20);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS driver_rating DECIMAL(3,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS booking_time TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS pickup_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS drop_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS otp VARCHAR(6);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS eta_minutes INTEGER;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS customer_rating DECIMAL(3,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS driver_rating_given DECIMAL(3,2);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 4. Add missing fields to existing USERS table (if needed)
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_bids_booking_id ON bids(booking_id);
CREATE INDEX IF NOT EXISTS idx_bids_driver_id ON bids(driver_id);
CREATE INDEX IF NOT EXISTS idx_bids_status ON bids(status);
CREATE INDEX IF NOT EXISTS idx_bids_created_at ON bids(created_at);

CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at);

CREATE INDEX IF NOT EXISTS idx_drivers_available ON drivers(available);

-- 6. Add constraints for data integrity
ALTER TABLE bids ADD CONSTRAINT check_bid_amount CHECK (amount > 0);
ALTER TABLE bids ADD CONSTRAINT check_bid_status CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn'));

ALTER TABLE bookings ADD CONSTRAINT check_booking_status CHECK (status IN ('pending', 'confirmed', 'ongoing', 'completed', 'cancelled'));
ALTER TABLE bookings ADD CONSTRAINT check_payment_method CHECK (payment_method IN ('cash', 'card', 'upi', 'wallet'));
ALTER TABLE bookings ADD CONSTRAINT check_payment_status CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'));

ALTER TABLE drivers ADD CONSTRAINT check_driver_rating CHECK (rating >= 0 AND rating <= 5);

-- 7. Create function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 8. Create triggers for auto-updating timestamps
DROP TRIGGER IF EXISTS update_bids_updated_at ON bids;
CREATE TRIGGER update_bids_updated_at BEFORE UPDATE ON bids FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_drivers_updated_at ON drivers;
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
DO $$
BEGIN
    RAISE NOTICE 'Missing fields added to existing tables successfully!';
    RAISE NOTICE 'Enhanced bids table with driver details, booking lifecycle tracking, and performance indexes.';
    RAISE NOTICE 'Your cab bidding system is now ready with a complete database schema.';
END $$;
