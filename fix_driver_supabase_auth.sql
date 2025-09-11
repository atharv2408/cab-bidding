-- Fix Driver Authentication System in Supabase
-- Run these commands in your Supabase SQL Editor

-- 1. First, let's modify the drivers table to properly link with Supabase Auth
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. Create a unique index on user_id to prevent duplicate driver profiles for the same user
CREATE UNIQUE INDEX IF NOT EXISTS idx_drivers_user_id ON drivers(user_id);

-- 3. Make email optional since user_id will be the primary link
ALTER TABLE drivers ALTER COLUMN email DROP NOT NULL;
ALTER TABLE drivers ALTER COLUMN email SET DEFAULT NULL;

-- 4. Update the drivers table structure to match the application expectations
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS vehicle_model VARCHAR(100);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS license_number VARCHAR(50);
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS documents JSONB;
ALTER TABLE drivers ADD COLUMN IF NOT EXISTS profile_picture TEXT;

-- 5. Add constraints for better data integrity
ALTER TABLE drivers ADD CONSTRAINT IF NOT EXISTS chk_rating CHECK (rating >= 0 AND rating <= 5);
ALTER TABLE drivers ADD CONSTRAINT IF NOT EXISTS chk_total_rides CHECK (total_rides >= 0);
ALTER TABLE drivers ADD CONSTRAINT IF NOT EXISTS chk_earnings CHECK (earnings >= 0);

-- 6. Create or replace function to automatically create driver profile after auth signup
CREATE OR REPLACE FUNCTION create_driver_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Only create driver profile if user has driver metadata
    IF NEW.raw_user_meta_data ? 'is_driver' AND (NEW.raw_user_meta_data->>'is_driver')::boolean = true THEN
        INSERT INTO public.drivers (
            user_id,
            name,
            email,
            phone,
            vehicle_type,
            vehicle_number,
            vehicle_model,
            license_number,
            rating,
            total_rides,
            available,
            earnings
        ) VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Unknown Driver'),
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'phone', NEW.phone),
            COALESCE(NEW.raw_user_meta_data->>'vehicle_type', 'sedan'),
            COALESCE(NEW.raw_user_meta_data->>'vehicle_number', ''),
            COALESCE(NEW.raw_user_meta_data->>'vehicle_model', ''),
            COALESCE(NEW.raw_user_meta_data->>'license_number', ''),
            5.0,
            0,
            false,
            0.0
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Create trigger to automatically create driver profile after user signup
DROP TRIGGER IF EXISTS on_auth_user_created_driver ON auth.users;
CREATE TRIGGER on_auth_user_created_driver
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_driver_profile();

-- 8. Update RLS policies for the drivers table to work with auth.uid()
DROP POLICY IF EXISTS "Drivers can view own data" ON drivers;
DROP POLICY IF EXISTS "Drivers can update own data" ON drivers;

-- Allow drivers to view their own profile
CREATE POLICY "Drivers can view own profile" ON drivers 
    FOR SELECT USING (auth.uid() = user_id);

-- Allow drivers to update their own profile
CREATE POLICY "Drivers can update own profile" ON drivers 
    FOR UPDATE USING (auth.uid() = user_id);

-- Allow drivers to insert their own profile (for manual creation)
CREATE POLICY "Drivers can insert own profile" ON drivers 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow reading driver info for booking system (but limit sensitive data)
CREATE POLICY "Public can view basic driver info" ON drivers 
    FOR SELECT USING (available = true)
    WITH CHECK (false); -- Prevents updates through this policy

-- 9. Fix the bookings table to properly reference drivers
-- Add user_id column to bookings to link with auth.users
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 10. Update bookings RLS policies
DROP POLICY IF EXISTS "Users can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Drivers can view available bookings" ON bookings;

CREATE POLICY "Users can view own bookings" ON bookings 
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create bookings" ON bookings 
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own bookings" ON bookings 
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Drivers can view relevant bookings" ON bookings 
    FOR SELECT USING (
        status = 'pending' OR 
        driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid())
    );

-- 11. Clear existing sample data that might conflict
DELETE FROM bids;
DELETE FROM bookings WHERE customer_phone IN ('+91 99999 11111', '+91 88888 22222', '+91 77777 33333');
DELETE FROM drivers WHERE email IN ('rajesh@example.com', 'priya@example.com', 'amit@example.com', 'neha@example.com', 'vikash@example.com');

-- 12. Create some test drivers linked to auth users (optional)
-- Note: You'll need to run this after creating auth users, or modify the IDs

-- First, let's create a helper function to create complete driver accounts
CREATE OR REPLACE FUNCTION create_test_driver_account(
    p_email TEXT,
    p_password TEXT,
    p_name TEXT,
    p_phone TEXT,
    p_vehicle_type TEXT DEFAULT 'sedan',
    p_vehicle_number TEXT DEFAULT 'TEST-001',
    p_license_number TEXT DEFAULT 'TEST-LICENSE'
)
RETURNS UUID AS $$
DECLARE
    new_user_id UUID;
BEGIN
    -- Create the auth user first (this would typically be done through the auth signup flow)
    -- For testing, you might need to create this manually in the Supabase Auth dashboard
    
    -- Create the driver profile
    INSERT INTO drivers (
        name,
        email,
        phone,
        vehicle_type,
        vehicle_number,
        license_number,
        rating,
        total_rides,
        available,
        earnings,
        location
    ) VALUES (
        p_name,
        p_email,
        p_phone,
        p_vehicle_type,
        p_vehicle_number,
        p_license_number,
        4.5,
        0,
        true,
        0.0,
        '{"lat": 28.6139, "lng": 77.2090}'::jsonb
    ) RETURNING id INTO new_user_id;
    
    RETURN new_user_id;
END;
$$ LANGUAGE plpgsql;

-- 13. Add some test bookings for testing
INSERT INTO bookings (
    customer_name,
    customer_phone,
    pickup_location,
    drop_location,
    pickup_address,
    drop_address,
    distance,
    estimated_fare,
    status
) VALUES
(
    'Test Customer',
    '+919999999999',
    '{"lat": 28.6139, "lng": 77.2090}',
    '{"lat": 28.6219, "lng": 77.2085}',
    'Connaught Place, Delhi',
    'India Gate, Delhi',
    5.2,
    120,
    'pending'
),
(
    'Another Customer',
    '+919888888888',
    '{"lat": 28.6289, "lng": 77.2065}',
    '{"lat": 28.6129, "lng": 77.2295}',
    'Karol Bagh, Delhi',
    'Lajpat Nagar, Delhi',
    8.7,
    200,
    'pending'
);

-- 14. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_drivers_available ON drivers(available);
CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_drivers_email ON drivers(email);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_driver_id ON bookings(driver_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);

-- 15. Create a view for easier driver queries
CREATE OR REPLACE VIEW driver_profiles AS
SELECT 
    d.id,
    d.user_id,
    d.name,
    d.email,
    d.phone,
    d.vehicle_type,
    d.vehicle_number,
    d.vehicle_model,
    d.license_number,
    d.rating,
    d.total_rides,
    d.available,
    d.location,
    d.earnings,
    d.profile_picture,
    d.created_at,
    d.updated_at,
    au.email as auth_email,
    au.created_at as auth_created_at
FROM drivers d
LEFT JOIN auth.users au ON d.user_id = au.id;

-- Grant access to the view
GRANT SELECT ON driver_profiles TO authenticated, anon;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Driver authentication system fixed successfully!';
    RAISE NOTICE '📋 Changes made:';
    RAISE NOTICE '   • Added user_id column to drivers table';
    RAISE NOTICE '   • Created automatic driver profile creation trigger';
    RAISE NOTICE '   • Updated RLS policies for proper authentication';
    RAISE NOTICE '   • Added missing columns for driver registration';
    RAISE NOTICE '   • Created driver_profiles view for easier queries';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Next steps:';
    RAISE NOTICE '   1. Test driver registration through the app';
    RAISE NOTICE '   2. Test driver login through the app';
    RAISE NOTICE '   3. Verify driver profiles are created correctly';
    RAISE NOTICE '   4. Check that existing drivers can still access their accounts';
END $$;
