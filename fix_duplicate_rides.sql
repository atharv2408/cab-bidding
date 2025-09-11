-- Fix Duplicate Ride Issues
-- Run this in Supabase SQL Editor

-- 1. First, let's clean up any duplicate active rides
DELETE FROM active_rides 
WHERE id NOT IN (
    SELECT DISTINCT ON (driver_id) id 
    FROM active_rides 
    ORDER BY driver_id, created_at DESC
);

-- 2. Ensure the unique constraint exists
ALTER TABLE active_rides DROP CONSTRAINT IF EXISTS active_rides_driver_id_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_rides_driver_id_unique ON active_rides(driver_id);

-- 3. Also add unique constraint for driver_user_id to prevent duplicates by auth user
CREATE UNIQUE INDEX IF NOT EXISTS idx_active_rides_driver_user_id_unique ON active_rides(driver_user_id);

-- 4. Update the assign_ride_to_driver function to be more robust
CREATE OR REPLACE FUNCTION assign_ride_to_driver(
    p_booking_id UUID,
    p_driver_id UUID,
    p_driver_user_id UUID,
    p_user_id UUID,
    p_bid_amount DECIMAL
)
RETURNS JSONB AS $$
DECLARE
    active_ride_exists BOOLEAN;
    ride_history_id UUID;
    otp_code VARCHAR(6);
    result JSONB;
    booking_status TEXT;
BEGIN
    -- Check booking status first
    SELECT status INTO booking_status FROM bookings WHERE id = p_booking_id;
    
    IF booking_status != 'pending' THEN
        RETURN '{"success": false, "message": "Booking is no longer available"}'::jsonb;
    END IF;
    
    -- Check if driver already has an active ride (by driver_id and driver_user_id)
    SELECT EXISTS(
        SELECT 1 FROM active_rides 
        WHERE driver_id = p_driver_id OR driver_user_id = p_driver_user_id
    ) INTO active_ride_exists;
    
    IF active_ride_exists THEN
        RETURN '{"success": false, "message": "Driver already has an active ride"}'::jsonb;
    END IF;
    
    -- Check if booking is already assigned to someone else
    SELECT EXISTS(
        SELECT 1 FROM active_rides WHERE booking_id = p_booking_id
    ) INTO active_ride_exists;
    
    IF active_ride_exists THEN
        RETURN '{"success": false, "message": "This ride has already been assigned to another driver"}'::jsonb;
    END IF;
    
    -- Generate OTP
    otp_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    
    -- Start transaction to ensure atomicity
    BEGIN
        -- Create ride history record
        INSERT INTO ride_history (
            booking_id, user_id, driver_id, driver_user_id,
            pickup_location, drop_location, pickup_address, drop_address,
            distance, bid_amount, otp
        )
        SELECT 
            p_booking_id, p_user_id, p_driver_id, p_driver_user_id,
            pickup_location, drop_location, pickup_address, drop_address,
            distance, p_bid_amount, otp_code
        FROM bookings WHERE id = p_booking_id
        RETURNING id INTO ride_history_id;
        
        -- Create active ride record (this will fail if duplicate due to unique constraint)
        INSERT INTO active_rides (driver_id, driver_user_id, booking_id, ride_history_id)
        VALUES (p_driver_id, p_driver_user_id, p_booking_id, ride_history_id);
        
        -- Update booking status
        UPDATE bookings SET 
            status = 'confirmed', 
            driver_id = p_driver_id,
            updated_at = NOW()
        WHERE id = p_booking_id;
        
        -- Cancel any pending bid timers for this booking
        UPDATE bid_timers 
        SET status = 'cancelled', last_updated = NOW()
        WHERE booking_id = p_booking_id AND status = 'active';
        
        result := jsonb_build_object(
            'success', true,
            'message', 'Ride assigned successfully',
            'ride_history_id', ride_history_id,
            'otp', otp_code
        );
        
        RETURN result;
        
    EXCEPTION
        WHEN unique_violation THEN
            -- This happens if there's a duplicate active ride
            RETURN '{"success": false, "message": "Driver already has an active ride or ride already assigned"}'::jsonb;
        WHEN OTHERS THEN
            -- Any other error
            RETURN jsonb_build_object(
                'success', false,
                'message', 'Failed to assign ride: ' || SQLERRM
            );
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Create a function to check for duplicate active rides
CREATE OR REPLACE FUNCTION check_driver_active_rides(p_driver_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    active_count INTEGER;
    ride_details JSONB;
BEGIN
    -- Count active rides for this driver
    SELECT COUNT(*) INTO active_count
    FROM active_rides
    WHERE driver_user_id = p_driver_user_id;
    
    IF active_count = 0 THEN
        RETURN '{"hasActiveRide": false, "count": 0}'::jsonb;
    ELSIF active_count = 1 THEN
        -- Get the ride details
        SELECT jsonb_build_object(
            'hasActiveRide', true,
            'count', 1,
            'rideHistoryId', ride_history_id,
            'bookingId', booking_id,
            'currentStatus', current_status,
            'otpVerified', otp_verified
        ) INTO ride_details
        FROM active_rides
        WHERE driver_user_id = p_driver_user_id;
        
        RETURN ride_details;
    ELSE
        -- Multiple active rides (should not happen, but handle it)
        RETURN jsonb_build_object(
            'hasActiveRide', true,
            'count', active_count,
            'error', 'Multiple active rides detected - this should not happen'
        );
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Create a cleanup function to remove stale active rides
CREATE OR REPLACE FUNCTION cleanup_stale_active_rides()
RETURNS INTEGER AS $$
DECLARE
    cleaned_count INTEGER := 0;
BEGIN
    -- Remove active rides where the corresponding ride_history is completed
    DELETE FROM active_rides
    WHERE ride_history_id IN (
        SELECT id FROM ride_history WHERE status = 'completed'
    );
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    
    RETURN cleaned_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Add some helpful views
CREATE OR REPLACE VIEW driver_active_rides_view AS
SELECT 
    ar.id as active_ride_id,
    ar.driver_id,
    ar.driver_user_id,
    ar.booking_id,
    ar.current_status,
    ar.otp_verified,
    rh.otp,
    rh.pickup_address,
    rh.drop_address,
    rh.pickup_location,
    rh.drop_location,
    rh.bid_amount,
    rh.status as ride_status,
    b.customer_name,
    b.customer_phone,
    b.distance,
    ar.created_at as assigned_at
FROM active_rides ar
LEFT JOIN ride_history rh ON ar.ride_history_id = rh.id
LEFT JOIN bookings b ON ar.booking_id = b.id;

-- Grant permissions
GRANT SELECT ON driver_active_rides_view TO authenticated, anon;
GRANT EXECUTE ON FUNCTION check_driver_active_rides(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION cleanup_stale_active_rides() TO authenticated;

-- Run cleanup once
SELECT cleanup_stale_active_rides() as cleaned_rides;

DO $$
BEGIN
    RAISE NOTICE '✅ Duplicate ride prevention system updated!';
    RAISE NOTICE '📋 Changes made:';
    RAISE NOTICE '   • Added unique constraints to prevent duplicate active rides';
    RAISE NOTICE '   • Enhanced assign_ride_to_driver function with better error handling';
    RAISE NOTICE '   • Added check_driver_active_rides function for validation';
    RAISE NOTICE '   • Added cleanup function for stale rides';
    RAISE NOTICE '   • Created helpful view for driver active rides';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 Next steps:';
    RAISE NOTICE '   • Test ride acceptance from dashboard';
    RAISE NOTICE '   • Verify only one ride appears in active rides';
    RAISE NOTICE '   • Check that OTP verification is skipped when coming from dashboard';
END $$;
