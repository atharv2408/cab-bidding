-- Enhanced Ride System Database Schema
-- Run this in Supabase SQL Editor to enhance the existing system

-- 1. Add ride history and earnings tracking tables
CREATE TABLE IF NOT EXISTS ride_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    driver_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Ride details
    pickup_location JSONB NOT NULL,
    drop_location JSONB NOT NULL,
    pickup_address TEXT NOT NULL,
    drop_address TEXT NOT NULL,
    distance DECIMAL(10,2),
    
    -- Financial details
    bid_amount DECIMAL(10,2) NOT NULL,
    final_amount DECIMAL(10,2),
    driver_earnings DECIMAL(10,2),
    platform_fee DECIMAL(10,2) DEFAULT 0,
    
    -- Status and timestamps
    status VARCHAR(20) DEFAULT 'assigned' CHECK (status IN ('assigned', 'started', 'completed', 'cancelled')),
    otp VARCHAR(6),
    assigned_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    
    -- Rating and feedback
    customer_rating DECIMAL(3,2) CHECK (customer_rating >= 0 AND customer_rating <= 5),
    driver_rating DECIMAL(3,2) CHECK (driver_rating >= 0 AND driver_rating <= 5),
    customer_feedback TEXT,
    driver_feedback TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add driver earnings summary table
CREATE TABLE IF NOT EXISTS driver_earnings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
    driver_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Earnings breakdown
    total_earnings DECIMAL(10,2) DEFAULT 0,
    today_earnings DECIMAL(10,2) DEFAULT 0,
    this_week_earnings DECIMAL(10,2) DEFAULT 0,
    this_month_earnings DECIMAL(10,2) DEFAULT 0,
    
    -- Ride statistics
    total_rides INTEGER DEFAULT 0,
    completed_rides INTEGER DEFAULT 0,
    cancelled_rides INTEGER DEFAULT 0,
    average_rating DECIMAL(3,2) DEFAULT 5.0,
    
    -- Time tracking
    last_ride_date DATE,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(driver_id)
);

-- 3. Add bid timer table for real-time synchronization
CREATE TABLE IF NOT EXISTS bid_timers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE UNIQUE,
    
    -- Timer details
    timer_duration INTEGER NOT NULL DEFAULT 300, -- 5 minutes in seconds
    started_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    remaining_seconds INTEGER,
    
    -- Status
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Add active rides table (only one active ride per driver)
CREATE TABLE IF NOT EXISTS active_rides (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE UNIQUE,
    driver_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    ride_history_id UUID NOT NULL REFERENCES ride_history(id) ON DELETE CASCADE,
    
    -- Current status
    current_status VARCHAR(20) DEFAULT 'assigned' CHECK (current_status IN ('assigned', 'started', 'completing')),
    otp_verified BOOLEAN DEFAULT false,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ride_history_user_id ON ride_history(user_id);
CREATE INDEX IF NOT EXISTS idx_ride_history_driver_user_id ON ride_history(driver_user_id);
CREATE INDEX IF NOT EXISTS idx_ride_history_status ON ride_history(status);
CREATE INDEX IF NOT EXISTS idx_ride_history_completed_at ON ride_history(completed_at);
CREATE INDEX IF NOT EXISTS idx_driver_earnings_driver_id ON driver_earnings(driver_id);
CREATE INDEX IF NOT EXISTS idx_bid_timers_booking_id ON bid_timers(booking_id);
CREATE INDEX IF NOT EXISTS idx_active_rides_driver_id ON active_rides(driver_id);

-- 6. Create RLS policies for data isolation
ALTER TABLE ride_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE driver_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bid_timers ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_rides ENABLE ROW LEVEL SECURITY;

-- Users can only see their own ride history
CREATE POLICY "Users can view own ride history" ON ride_history
    FOR SELECT TO authenticated
    USING (auth.uid() = user_id);

-- Drivers can only see their own ride history
CREATE POLICY "Drivers can view own ride history" ON ride_history
    FOR SELECT TO authenticated
    USING (auth.uid() = driver_user_id);

-- Drivers can only see their own earnings
CREATE POLICY "Drivers can view own earnings" ON driver_earnings
    FOR SELECT TO authenticated
    USING (auth.uid() = driver_user_id);

CREATE POLICY "Drivers can update own earnings" ON driver_earnings
    FOR UPDATE TO authenticated
    USING (auth.uid() = driver_user_id);

-- Drivers can only see their own active rides
CREATE POLICY "Drivers can view own active rides" ON active_rides
    FOR SELECT TO authenticated
    USING (auth.uid() = driver_user_id);

-- Anyone can view active bid timers (for real-time updates)
CREATE POLICY "Anyone can view bid timers" ON bid_timers
    FOR SELECT TO authenticated, anon
    USING (true);

-- 7. Create functions for ride management

-- Function to start a ride (after OTP verification)
CREATE OR REPLACE FUNCTION start_ride(
    p_ride_history_id UUID,
    p_driver_user_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
    ride_exists BOOLEAN;
BEGIN
    -- Check if ride exists and belongs to driver
    SELECT EXISTS(
        SELECT 1 FROM ride_history 
        WHERE id = p_ride_history_id 
        AND driver_user_id = p_driver_user_id 
        AND status = 'assigned'
    ) INTO ride_exists;
    
    IF NOT ride_exists THEN
        RETURN false;
    END IF;
    
    -- Update ride status
    UPDATE ride_history 
    SET status = 'started', started_at = NOW(), updated_at = NOW()
    WHERE id = p_ride_history_id;
    
    -- Update active ride
    UPDATE active_rides 
    SET current_status = 'started', otp_verified = true, updated_at = NOW()
    WHERE ride_history_id = p_ride_history_id;
    
    RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete a ride
CREATE OR REPLACE FUNCTION complete_ride(
    p_ride_history_id UUID,
    p_driver_user_id UUID,
    p_final_amount DECIMAL DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    ride_record RECORD;
    earnings_amount DECIMAL;
    platform_fee_amount DECIMAL;
    result JSONB;
BEGIN
    -- Get ride details
    SELECT * INTO ride_record
    FROM ride_history 
    WHERE id = p_ride_history_id 
    AND driver_user_id = p_driver_user_id 
    AND status IN ('assigned', 'started');
    
    IF NOT FOUND THEN
        RETURN '{"success": false, "message": "Ride not found or already completed"}'::jsonb;
    END IF;
    
    -- Calculate earnings (90% to driver, 10% platform fee)
    earnings_amount := COALESCE(p_final_amount, ride_record.bid_amount) * 0.90;
    platform_fee_amount := COALESCE(p_final_amount, ride_record.bid_amount) * 0.10;
    
    -- Update ride as completed
    UPDATE ride_history 
    SET 
        status = 'completed',
        completed_at = NOW(),
        updated_at = NOW(),
        final_amount = COALESCE(p_final_amount, bid_amount),
        driver_earnings = earnings_amount,
        platform_fee = platform_fee_amount
    WHERE id = p_ride_history_id;
    
    -- Remove from active rides
    DELETE FROM active_rides WHERE ride_history_id = p_ride_history_id;
    
    -- Update driver earnings
    INSERT INTO driver_earnings (driver_id, driver_user_id, total_earnings, today_earnings, total_rides, completed_rides)
    SELECT 
        ride_record.driver_id,
        ride_record.driver_user_id,
        earnings_amount,
        earnings_amount,
        1,
        1
    ON CONFLICT (driver_id) DO UPDATE SET
        total_earnings = driver_earnings.total_earnings + earnings_amount,
        today_earnings = CASE 
            WHEN DATE(driver_earnings.last_updated) = CURRENT_DATE 
            THEN driver_earnings.today_earnings + earnings_amount 
            ELSE earnings_amount 
        END,
        total_rides = driver_earnings.total_rides + 1,
        completed_rides = driver_earnings.completed_rides + 1,
        last_ride_date = CURRENT_DATE,
        last_updated = NOW(),
        updated_at = NOW();
    
    -- Update driver total earnings and rides
    UPDATE drivers 
    SET 
        earnings = earnings + earnings_amount,
        total_rides = total_rides + 1,
        updated_at = NOW()
    WHERE id = ride_record.driver_id;
    
    -- Return success with earnings info
    result := jsonb_build_object(
        'success', true,
        'message', 'Ride completed successfully',
        'earnings', earnings_amount,
        'platform_fee', platform_fee_amount,
        'total_amount', COALESCE(p_final_amount, ride_record.bid_amount),
        'ride_id', p_ride_history_id
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to assign ride to driver (ensures only one active ride)
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
BEGIN
    -- Check if driver already has an active ride
    SELECT EXISTS(SELECT 1 FROM active_rides WHERE driver_id = p_driver_id) INTO active_ride_exists;
    
    IF active_ride_exists THEN
        RETURN '{"success": false, "message": "Driver already has an active ride"}'::jsonb;
    END IF;
    
    -- Generate OTP
    otp_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    
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
    
    -- Create active ride record
    INSERT INTO active_rides (driver_id, driver_user_id, booking_id, ride_history_id)
    VALUES (p_driver_id, p_driver_user_id, p_booking_id, ride_history_id);
    
    -- Update booking status
    UPDATE bookings SET status = 'confirmed', driver_id = p_driver_id WHERE id = p_booking_id;
    
    result := jsonb_build_object(
        'success', true,
        'message', 'Ride assigned successfully',
        'ride_history_id', ride_history_id,
        'otp', otp_code
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update bid timer
CREATE OR REPLACE FUNCTION update_bid_timer(p_booking_id UUID)
RETURNS JSONB AS $$
DECLARE
    timer_record RECORD;
    remaining INTEGER;
    result JSONB;
BEGIN
    SELECT * INTO timer_record FROM bid_timers WHERE booking_id = p_booking_id;
    
    IF NOT FOUND THEN
        RETURN '{"success": false, "message": "Timer not found"}'::jsonb;
    END IF;
    
    -- Calculate remaining seconds
    remaining := EXTRACT(EPOCH FROM (timer_record.expires_at - NOW()))::INTEGER;
    
    IF remaining <= 0 THEN
        -- Timer expired
        UPDATE bid_timers 
        SET status = 'expired', remaining_seconds = 0, last_updated = NOW()
        WHERE booking_id = p_booking_id;
        
        result := jsonb_build_object(
            'success', true,
            'status', 'expired',
            'remaining_seconds', 0
        );
    ELSE
        -- Update remaining time
        UPDATE bid_timers 
        SET remaining_seconds = remaining, last_updated = NOW()
        WHERE booking_id = p_booking_id;
        
        result := jsonb_build_object(
            'success', true,
            'status', 'active',
            'remaining_seconds', remaining
        );
    END IF;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create triggers for automatic timestamp updates
CREATE TRIGGER update_ride_history_updated_at 
    BEFORE UPDATE ON ride_history 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_driver_earnings_updated_at 
    BEFORE UPDATE ON driver_earnings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_active_rides_updated_at 
    BEFORE UPDATE ON active_rides 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON public.ride_history TO authenticated;
GRANT ALL ON public.driver_earnings TO authenticated;
GRANT ALL ON public.bid_timers TO authenticated;
GRANT ALL ON public.active_rides TO authenticated;
GRANT SELECT ON public.bid_timers TO anon;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Enhanced ride system created successfully!';
    RAISE NOTICE '📋 New features:';
    RAISE NOTICE '   • Isolated ride history per user/driver';
    RAISE NOTICE '   • Single active ride per driver enforcement';
    RAISE NOTICE '   • Real-time bid timer synchronization';
    RAISE NOTICE '   • Automatic earnings calculation';
    RAISE NOTICE '   • OTP-based ride verification';
    RAISE NOTICE '   • Complete ride management functions';
END $$;
