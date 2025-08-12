# Supabase Setup Instructions

This guide will help you integrate Supabase with your cab-bidding-system project. Supabase provides a PostgreSQL database with real-time capabilities, authentication, and more.

## Prerequisites
- A Supabase account (free tier available)
- Node.js and npm installed
- Your project should be in development mode

## Step 1: Create a Supabase Project

1. Go to [Supabase](https://supabase.com/) and sign up/sign in
2. Click "New Project"
3. Choose your organization (or create one)
4. Fill in project details:
   - **Name**: `cab-bidding-system` (or your preferred name)
   - **Database Password**: Create a strong password (save it!)
   - **Region**: Choose closest to your location
5. Click "Create new project"
6. Wait for the project to be set up (2-3 minutes)

## Step 2: Get Your Project Credentials

1. In your Supabase dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (something like `https://xxxxx.supabase.co`)
   - **anon public key** (starts with `eyJhbGciOiJIUzI1NiIsInR5cCI6...`)

## Step 3: Configure Environment Variables

1. Create a `.env` file in your project root (or update existing one):

```env
# Supabase Configuration
REACT_APP_SUPABASE_URL=your-project-url-here
REACT_APP_SUPABASE_ANON_KEY=your-anon-key-here

# Keep existing Firebase config if you want to use both
REACT_APP_FIREBASE_API_KEY=your-api-key-here
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
REACT_APP_FIREBASE_APP_ID=your-app-id
REACT_APP_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

2. Restart your development server: `npm start`

## Step 4: Create Database Tables

In your Supabase dashboard, go to **SQL Editor** and run these queries to create the necessary tables:

### Drivers Table
```sql
-- Create drivers table
CREATE TABLE drivers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  email VARCHAR(100),
  vehicle_type VARCHAR(50),
  vehicle_number VARCHAR(20),
  rating DECIMAL(3,2) DEFAULT 5.0,
  available BOOLEAN DEFAULT true,
  location JSONB,
  earnings DECIMAL(10,2) DEFAULT 0.00,
  total_rides INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX idx_drivers_available ON drivers(available);
CREATE INDEX idx_drivers_location ON drivers USING GIN(location);
```

### Bookings Table
```sql
-- Create bookings table
CREATE TABLE bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name VARCHAR(100),
  customer_phone VARCHAR(20),
  pickup_location JSONB NOT NULL,
  drop_location JSONB NOT NULL,
  pickup_address TEXT,
  drop_address TEXT,
  distance DECIMAL(10,2),
  estimated_fare DECIMAL(10,2),
  actual_fare DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'pending',
  selected_driver_id UUID REFERENCES drivers(id),
  payment_method VARCHAR(50),
  special_requests TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_driver ON bookings(selected_driver_id);
CREATE INDEX idx_bookings_created_at ON bookings(created_at DESC);
```

### Bids Table
```sql
-- Create bids table
CREATE TABLE bids (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  estimated_time INTEGER, -- in minutes
  message TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one bid per driver per booking
  UNIQUE(booking_id, driver_id)
);

-- Create indexes
CREATE INDEX idx_bids_booking ON bids(booking_id);
CREATE INDEX idx_bids_driver ON bids(driver_id);
CREATE INDEX idx_bids_amount ON bids(amount);
```

### Trigger for updated_at timestamps
```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers
CREATE TRIGGER update_drivers_updated_at BEFORE UPDATE ON drivers 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## Step 5: Set Up Row Level Security (Optional but Recommended)

```sql
-- Enable RLS on all tables
ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;

-- Basic policies (adjust based on your auth needs)
-- Allow read access to all
CREATE POLICY "Allow read access for all users" ON drivers FOR SELECT USING (true);
CREATE POLICY "Allow read access for all users" ON bookings FOR SELECT USING (true);
CREATE POLICY "Allow read access for all users" ON bids FOR SELECT USING (true);

-- Allow insert/update for authenticated users (if using auth)
-- CREATE POLICY "Allow insert for authenticated users" ON drivers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
```

## Step 6: Insert Sample Data (Optional)

```sql
-- Insert sample drivers
INSERT INTO drivers (name, phone, email, vehicle_type, vehicle_number, rating, location) VALUES
('John Smith', '+1234567890', 'john@example.com', 'Sedan', 'ABC123', 4.8, '{"lat": 40.7128, "lng": -74.0060}'),
('Sarah Johnson', '+1234567891', 'sarah@example.com', 'SUV', 'XYZ789', 4.9, '{"lat": 40.7589, "lng": -73.9851}'),
('Mike Wilson', '+1234567892', 'mike@example.com', 'Compact', 'DEF456', 4.7, '{"lat": 40.7505, "lng": -73.9934}'),
('Emily Davis', '+1234567893', 'emily@example.com', 'Luxury', 'GHI789', 5.0, '{"lat": 40.7282, "lng": -73.7949}');
```

## Step 7: Test the Integration

1. Start your development server: `npm start`
2. Check the browser console for "Supabase initialized successfully"
3. Test database operations using the provided service functions

## Step 8: Using Supabase in Your Components

### Basic Usage Example:
```javascript
import { supabaseDB } from '../utils/supabaseService';

// In your component
const fetchDrivers = async () => {
  const { data, error } = await supabaseDB.drivers.getAll();
  if (error) {
    console.error('Error fetching drivers:', error);
  } else {
    setDrivers(data);
  }
};

// Real-time subscription
useEffect(() => {
  const subscription = supabaseDB.realtime.subscribeToBookings((payload) => {
    console.log('Booking updated:', payload);
    // Handle real-time updates
  });

  return () => {
    supabaseDB.realtime.unsubscribe(subscription);
  };
}, []);
```

## Features Available

### ✅ Database Operations
- **Drivers**: CRUD operations, availability status
- **Bookings**: Create, update, track status
- **Bids**: Driver bidding system

### ✅ Real-time Features
- Live updates for new bookings
- Real-time bid notifications
- Driver availability changes

### ✅ Authentication (Ready)
- User signup/signin
- Protected routes
- Session management

### ✅ Advanced Features
- Complex queries with joins
- Full-text search capabilities
- Geographic queries for location-based features
- File storage (for driver photos, documents)

## Migration from Firebase

If you're currently using Firebase, you can:

1. **Keep both systems** during transition
2. **Migrate gradually** by switching one feature at a time
3. **Use Supabase for new features** while maintaining Firebase for existing ones

## Production Considerations

### Database Optimization
- Add appropriate indexes
- Set up database backups
- Monitor query performance

### Security
- Implement proper RLS policies
- Use API keys securely
- Set up authentication

### Performance
- Enable connection pooling
- Use database functions for complex operations
- Implement caching where appropriate

## Troubleshooting

### Common Issues:

1. **"Invalid API key" error**
   - Check that REACT_APP_SUPABASE_ANON_KEY is correct
   - Ensure .env file is in project root

2. **"relation does not exist" error**
   - Make sure you've run all SQL commands to create tables
   - Check table names match exactly

3. **RLS policy errors**
   - Temporarily disable RLS for testing: `ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;`
   - Add appropriate policies based on your needs

### Getting Help:
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord Community](https://discord.supabase.com/)
- Check browser console for detailed error messages

## Next Steps

With Supabase integrated, you can now:
- Implement user authentication
- Add real-time features
- Scale your database as needed
- Use advanced PostgreSQL features
- Add file storage for driver documents

Your cab-bidding system now has a powerful, scalable backend! 🚀
