-- Fix Driver Registration Issues
-- This script updates the drivers table schema and adds missing sample data

-- First, check if additional columns need to be added to drivers table
ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS license_number VARCHAR(50),
ADD COLUMN IF NOT EXISTS vehicle_model VARCHAR(100),
ADD COLUMN IF NOT EXISTS profile_picture TEXT,
ADD COLUMN IF NOT EXISTS documents JSONB DEFAULT '{}';

-- Update existing drivers to have license numbers if they don't exist
UPDATE drivers SET license_number = 'DL' || LPAD((RANDOM() * 999999999)::INT::TEXT, 9, '0') 
WHERE license_number IS NULL;

-- Insert sample drivers for testing (only if table is empty)
INSERT INTO drivers (name, phone, email, vehicle_type, vehicle_number, license_number, rating, location, earnings, total_rides, vehicle_model)
SELECT 
  'Rajesh Kumar', '+91 98765 43210', 'rajesh@example.com', 'hatchback', 'DL 01 AB 1234', 'DL123456789', 4.5, 
  '{"lat": 28.6139, "lng": 77.2090}', 15000, 1247, 'Maruti Swift'
WHERE NOT EXISTS (SELECT 1 FROM drivers WHERE email = 'rajesh@example.com');

INSERT INTO drivers (name, phone, email, vehicle_type, vehicle_number, license_number, rating, location, earnings, total_rides, vehicle_model)
SELECT 
  'Priya Singh', '+91 87654 32109', 'priya@example.com', 'sedan', 'DL 02 CD 5678', 'DL987654321', 4.7, 
  '{"lat": 28.6219, "lng": 77.2085}', 12500, 876, 'Honda City'
WHERE NOT EXISTS (SELECT 1 FROM drivers WHERE email = 'priya@example.com');

INSERT INTO drivers (name, phone, email, vehicle_type, vehicle_number, license_number, rating, location, earnings, total_rides, vehicle_model)
SELECT 
  'Amit Sharma', '+91 76543 21098', 'amit@example.com', 'suv', 'DL 03 EF 9012', 'DL456789123', 4.2, 
  '{"lat": 28.6129, "lng": 77.2295}', 25000, 2156, 'Mahindra XUV500'
WHERE NOT EXISTS (SELECT 1 FROM drivers WHERE email = 'amit@example.com');

INSERT INTO drivers (name, phone, email, vehicle_type, vehicle_number, license_number, rating, location, earnings, total_rides, vehicle_model)
SELECT 
  'Neha Patel', '+91 65432 10987', 'neha@example.com', 'sedan', 'DL 04 GH 3456', 'DL789123456', 4.8, 
  '{"lat": 28.6289, "lng": 77.2065}', 18500, 1543, 'Hyundai Verna'
WHERE NOT EXISTS (SELECT 1 FROM drivers WHERE email = 'neha@example.com');

INSERT INTO drivers (name, phone, email, vehicle_type, vehicle_number, license_number, rating, location, earnings, total_rides, vehicle_model)
SELECT 
  'Vikash Yadav', '+91 54321 09876', 'vikash@example.com', 'sedan', 'DL 05 IJ 7890', 'DL321654987', 4.3, 
  '{"lat": 28.6199, "lng": 77.2175}', 21000, 1789, 'Toyota Etios'
WHERE NOT EXISTS (SELECT 1 FROM drivers WHERE email = 'vikash@example.com');

-- Add test driver account for testing
INSERT INTO drivers (name, phone, email, vehicle_type, vehicle_number, license_number, rating, location, earnings, total_rides, vehicle_model, available)
SELECT 
  'Test Driver', '+919876543210', 'testdriver@example.com', 'sedan', 'TEST 123', 'DLTEST123', 5.0, 
  '{"lat": 28.6139, "lng": 77.2090}', 0, 0, 'Test Vehicle', true
WHERE NOT EXISTS (SELECT 1 FROM drivers WHERE email = 'testdriver@example.com');

-- Update all drivers to be available by default for testing
UPDATE drivers SET available = true WHERE available IS NULL OR available = false;

-- Show results
SELECT 'Driver schema updated and sample data inserted' as message;
SELECT COUNT(*) as total_drivers FROM drivers;
SELECT name, email, vehicle_type, license_number FROM drivers;
