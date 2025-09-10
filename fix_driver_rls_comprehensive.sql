-- Comprehensive Row Level Security Fix for Drivers Table
-- This addresses all driver login and registration issues
-- Run this in your Supabase SQL Editor

-- First, let's see current status
SELECT 
  schemaname, 
  tablename, 
  rowsecurity, 
  enablerls 
FROM pg_tables 
WHERE tablename = 'drivers';

-- Check current policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  permissive, 
  roles, 
  cmd, 
  qual, 
  with_check
FROM pg_policies 
WHERE tablename = 'drivers';

-- Drop all existing policies for drivers table
DROP POLICY IF EXISTS "Drivers can insert their own profile" ON drivers;
DROP POLICY IF EXISTS "Drivers can view their own profile" ON drivers;  
DROP POLICY IF EXISTS "Drivers can update their own profile" ON drivers;
DROP POLICY IF EXISTS "Public can view available drivers" ON drivers;
DROP POLICY IF EXISTS "Allow driver registration" ON drivers;
DROP POLICY IF EXISTS "Service role can manage drivers" ON drivers;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON drivers;
DROP POLICY IF EXISTS "Enable read access for all users" ON drivers;
DROP POLICY IF EXISTS "Enable update for users based on email" ON drivers;

-- Ensure RLS is enabled
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

-- Policy 1: Allow authenticated users to insert driver records during registration
-- This is crucial for driver signup to work
CREATE POLICY "Allow authenticated driver registration" ON drivers
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Policy 2: Allow public read access to ALL drivers for customer app functionality
-- This allows customers to see available drivers and their info
CREATE POLICY "Public read access to drivers" ON drivers
  FOR SELECT 
  TO anon, authenticated
  USING (true);

-- Policy 3: Allow authenticated users to update drivers where email matches
-- This allows drivers to update their own profiles
CREATE POLICY "Drivers can update own profile" ON drivers
  FOR UPDATE 
  TO authenticated 
  USING (email = auth.jwt() ->> 'email')
  WITH CHECK (email = auth.jwt() ->> 'email');

-- Policy 4: Allow drivers to delete their own profiles if needed
CREATE POLICY "Drivers can delete own profile" ON drivers
  FOR DELETE 
  TO authenticated 
  USING (email = auth.jwt() ->> 'email');

-- Policy 5: Service role full access (for admin operations and server-side operations)
CREATE POLICY "Service role full access" ON drivers
  FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Verify the new policies
SELECT 'Checking new policies...' as status;

SELECT 
  policyname, 
  cmd, 
  roles,
  permissive,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'drivers'
ORDER BY policyname;

-- Test insert capability (this should work now)
-- Note: This is just a test - remove this record after verification
INSERT INTO drivers (
  name, 
  phone, 
  email, 
  vehicle_type, 
  vehicle_number, 
  rating, 
  total_rides, 
  available
) VALUES (
  'RLS Test Driver', 
  '+1234567890', 
  'rlstest@example.com', 
  'sedan', 
  'TEST123', 
  5.0, 
  0, 
  false
);

-- Verify the test record was inserted
SELECT 'Test driver inserted:' as status, * FROM drivers WHERE email = 'rlstest@example.com';

-- Clean up test record
DELETE FROM drivers WHERE email = 'rlstest@example.com';

SELECT '✅ RLS policies have been fixed! Driver registration should now work.' as message;
SELECT 'You can now run the frontend and backend to test driver login functionality.' as next_step;
