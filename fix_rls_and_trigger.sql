-- Fix RLS Policies and Trigger Issues for Driver Authentication
-- Run this in Supabase SQL Editor

-- 1. First, let's fix the RLS policies that are blocking driver creation
DROP POLICY IF EXISTS "Drivers can insert own profile" ON drivers;
DROP POLICY IF EXISTS "Public can view basic driver info" ON drivers;
DROP POLICY IF EXISTS "Drivers can view own profile" ON drivers;
DROP POLICY IF EXISTS "Drivers can update own profile" ON drivers;

-- 2. Create more permissive policies for driver registration
-- Allow authenticated users to insert driver profiles
CREATE POLICY "Authenticated users can insert driver profiles" ON drivers 
    FOR INSERT 
    TO authenticated 
    WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

-- Allow drivers to view their own profile
CREATE POLICY "Drivers can view own profile" ON drivers 
    FOR SELECT 
    TO authenticated
    USING (auth.uid() = user_id);

-- Allow drivers to update their own profile
CREATE POLICY "Drivers can update own profile" ON drivers 
    FOR UPDATE 
    TO authenticated
    USING (auth.uid() = user_id);

-- Allow anonymous and authenticated users to view available drivers (for booking system)
CREATE POLICY "Anyone can view available drivers" ON drivers 
    FOR SELECT 
    TO anon, authenticated
    USING (available = true);

-- 3. Fix the trigger function with better error handling
CREATE OR REPLACE FUNCTION create_driver_profile()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if user metadata indicates this should be a driver
    IF NEW.raw_user_meta_data ? 'is_driver' AND (NEW.raw_user_meta_data->>'is_driver')::boolean = true THEN
        BEGIN
            -- Insert driver profile
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
            
            -- Log success
            RAISE NOTICE 'Driver profile created for user: %', NEW.id;
        EXCEPTION
            WHEN OTHERS THEN
                -- Log error but don't fail the auth user creation
                RAISE WARNING 'Failed to create driver profile for user %: %', NEW.id, SQLERRM;
        END;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Recreate the trigger
DROP TRIGGER IF EXISTS on_auth_user_created_driver ON auth.users;
CREATE TRIGGER on_auth_user_created_driver
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_driver_profile();

-- 5. Create a function to manually create driver profiles for existing users
CREATE OR REPLACE FUNCTION create_driver_profile_manual(
    p_user_id UUID,
    p_name TEXT,
    p_email TEXT,
    p_phone TEXT,
    p_vehicle_type TEXT DEFAULT 'sedan',
    p_vehicle_number TEXT DEFAULT '',
    p_vehicle_model TEXT DEFAULT '',
    p_license_number TEXT DEFAULT ''
)
RETURNS UUID AS $$
DECLARE
    new_driver_id UUID;
BEGIN
    -- Insert driver profile
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
        p_user_id,
        p_name,
        p_email,
        p_phone,
        p_vehicle_type,
        p_vehicle_number,
        p_vehicle_model,
        p_license_number,
        5.0,
        0,
        false,
        0.0
    ) RETURNING id INTO new_driver_id;
    
    RETURN new_driver_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.drivers TO authenticated;
GRANT SELECT ON public.drivers TO anon;

-- 7. Test the manual function with our test user
-- (This will be run by the debug script)

-- 8. Create a helper function to debug auth users and their driver profiles
CREATE OR REPLACE FUNCTION debug_driver_auth()
RETURNS TABLE (
    auth_user_id UUID,
    auth_email TEXT,
    driver_id UUID,
    driver_name TEXT,
    has_driver_profile BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        au.id as auth_user_id,
        au.email as auth_email,
        d.id as driver_id,
        d.name as driver_name,
        (d.id IS NOT NULL) as has_driver_profile
    FROM auth.users au
    LEFT JOIN public.drivers d ON au.id = d.user_id
    ORDER BY au.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant access to the debug function
GRANT EXECUTE ON FUNCTION debug_driver_auth() TO authenticated, anon;

-- 9. Show success message
DO $$
BEGIN
    RAISE NOTICE '✅ RLS policies and trigger fixed!';
    RAISE NOTICE '📋 Changes made:';
    RAISE NOTICE '   • Fixed RLS policies to allow driver profile creation';
    RAISE NOTICE '   • Updated trigger function with better error handling';  
    RAISE NOTICE '   • Created manual driver profile creation function';
    RAISE NOTICE '   • Added debug function to check auth users and drivers';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 You can now test driver registration again';
END $$;
