-- Fix Row Level Security policies for drivers table
-- This should be run in the Supabase SQL Editor

-- First, check current RLS status
SELECT schemaname, tablename, rowsecurity, enablerls 
FROM pg_tables 
WHERE tablename = 'drivers';

-- Disable RLS temporarily to allow driver registration
ALTER TABLE drivers DISABLE ROW LEVEL SECURITY;

-- Or better yet, create proper RLS policies for driver registration
-- Re-enable RLS first
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Drivers can insert their own profile" ON drivers;
DROP POLICY IF EXISTS "Drivers can view their own profile" ON drivers;
DROP POLICY IF EXISTS "Drivers can update their own profile" ON drivers;
DROP POLICY IF EXISTS "Public can view available drivers" ON drivers;
DROP POLICY IF EXISTS "Allow driver registration" ON drivers;

-- Create new policies that allow driver registration
-- Policy 1: Allow any authenticated user to insert their driver profile
CREATE POLICY "Allow driver registration" ON drivers
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Policy 2: Allow drivers to view their own profile
CREATE POLICY "Drivers can view their own profile" ON drivers
  FOR SELECT 
  TO authenticated 
  USING (email = auth.jwt() ->> 'email');

-- Policy 3: Allow drivers to update their own profile  
CREATE POLICY "Drivers can update their own profile" ON drivers
  FOR UPDATE 
  TO authenticated 
  USING (email = auth.jwt() ->> 'email');

-- Policy 4: Allow public/customers to view available drivers
CREATE POLICY "Public can view available drivers" ON drivers
  FOR SELECT 
  TO anon, authenticated
  USING (available = true);

-- Policy 5: Allow service role to manage all drivers (for admin operations)
CREATE POLICY "Service role can manage drivers" ON drivers
  FOR ALL 
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Check the new policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'drivers';

SELECT 'RLS policies for drivers table have been updated! ✅' as message;
