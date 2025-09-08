# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

A secure cab bidding system that allows customers to request rides and receive bids from multiple drivers. The system features phone number authentication with OTP verification, real-time bidding, and both customer and driver portals.

## Quick Start Commands

### Backend Development
```bash
# Start backend server
cd backend && node index.js
# Server runs on http://localhost:5000
```

### Frontend Development
```bash
# Main React app (customer portal)
npm start  # Uses react-scripts, runs on http://localhost:3000

# Vite-based React app (alternative frontend)
cd my-react-app && npm run dev  # Runs on http://localhost:5173

# Driver app
cd driver-app && npm start
```

### Testing & Quality
```bash
# Run tests for main app
npm test

# Run tests for Vite app
cd my-react-app && npm test  # If configured

# Linting (Vite app)
cd my-react-app && npm run lint

# Build for production
npm run build  # Main app
cd my-react-app && npm run build  # Vite app
```

### Database Operations
```bash
# Test Supabase connection
node test_supabase_connection.js

# Test authentication
node test_supabase_auth.js

# Debug user registration
node debug_full_registration.js
```

## Architecture Overview

### Multi-Frontend Architecture
The project has three separate React applications:
- **Root level** (`src/`): Main customer app with React Router, uses react-scripts
- **my-react-app/**: Alternative Vite-based customer app 
- **driver-app/**: Dedicated driver portal with internationalization

### Authentication System
- **Primary**: Supabase Auth for secure password handling
- **Fallback**: Custom phone number + OTP system via backend API
- **JWT**: Backend generates JWT tokens for session management
- Authentication flows are in `src/utils/customAuth.js` and `src/utils/supabaseService.js`

### Database Integration
- **Primary**: Supabase PostgreSQL with real-time capabilities
- **Fallback**: In-memory storage in backend for demo mode
- **Tables**: users, drivers, bookings, bids, notifications, ratings
- **Schema**: Defined in `supabase_database_setup.sql` and `supabase-schema.sql`

### Backend API Structure
Node.js/Express server (`backend/index.js`) with:
- Phone authentication endpoints (`/auth/*`)
- Bidding system (`/bid`)
- JWT middleware for protected routes
- Joi validation for inputs
- CORS enabled for frontend communication

### Key Components Architecture
- **App.js**: Main router with authentication state management
- **CustomerAuth.js**: Handles customer signup/login flows
- **DriverLogin.js**: Driver-specific authentication
- **PreciseLocationMap.js**: Map integration with Leaflet
- **Bidding Pages**: Bid.js, Confirm.js, Success.js for ride booking flow

## Development Patterns

### State Management
- localStorage for authentication tokens (`customerToken`, `customerData`)
- React hooks for local state management
- No global state management library (Redux/Context API not used)

### API Communication
- Axios for HTTP requests
- Environment variables for service URLs
- Error boundaries and consistent error handling patterns

### Styling Approach
- CSS modules with component-specific stylesheets
- `DriverStyles.css` for driver portal theming
- Responsive design patterns throughout

### Authentication Flow
1. User registration via Supabase Auth (preferred) or phone OTP
2. JWT token storage in localStorage
3. Protected routes check for valid tokens
4. Session management across page reloads

## Environment Setup

### Required Environment Variables
```bash
# Supabase (Primary Database)
REACT_APP_SUPABASE_URL=https://gxnolhrjdkfyyrtkcjhm.supabase.co
REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd4bm9saHJqZGtmeXlydGtjamhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ5MDg5NTksImV4cCI6MjA3MDQ4NDk1OX0.YdHAqb5W02sprZSC-h8L4KduWTgzfPcXG6I5-HEWWVw

# Backend Configuration
JWT_SECRET=your-jwt-secret
TWILIO_ACCOUNT_SID=your-twilio-sid
TWILIO_AUTH_TOKEN=your-twilio-token
TWILIO_PHONE_NUMBER=your-twilio-number
MONGODB_URI=mongodb://localhost:27017/cab-bidding
```

### Database Setup
1. Run `supabase_database_setup.sql` in Supabase SQL Editor
2. Alternatively, use `supabase-schema.sql` for complete schema
3. Enable Row Level Security policies as needed
4. Sample data included in schema files

### SMS Integration
- Demo mode: OTP logged to console
- Production: Uncomment Twilio code in `backend/index.js`
- Phone numbers must be in E.164 format

## Testing Strategy

### Customer Authentication Testing
- Use test phone numbers: `+1234567890`, `+919876543210`, `+447123456789`
- Check server console for OTP in development
- Test scenarios documented in `TESTING_GUIDE.md`

### Registration Flow Testing
- Email formats: Use real domains (gmail.com, outlook.com)
- Password requirements: Minimum 6 characters
- Phone validation: E.164 format required

### Driver Portal Testing
- Separate authentication system
- Multi-language support (i18n configured)
- Test with sample drivers from database

## Common Development Tasks

### Adding New Authentication Method
1. Update `src/utils/customAuth.js` for new Supabase auth methods
2. Add corresponding UI components
3. Update protected routes logic

### Database Schema Changes
1. Update SQL files (`supabase_database_setup.sql`)
2. Update service methods in `src/utils/supabaseService.js`
3. Test with `test_supabase_connection.js`

### Adding New Pages/Routes
1. Create component in `src/pages/` or `src/components/`
2. Add route in `App.js` Router configuration
3. Update navigation in NavigationBar component

### Real-time Features
- Use `supabaseService.js` real-time subscription methods
- Subscribe to table changes for live updates
- Implement proper cleanup in useEffect

## Troubleshooting

### Common Issues
- **"hashPassword undefined"**: Use Supabase Auth instead of custom hashing
- **CORS errors**: Ensure backend CORS is properly configured
- **Database connection**: Verify environment variables and Supabase setup
- **Phone OTP not working**: Check Twilio configuration or use console logs

### Authentication Debugging
- Check `debug_auth.js` and `debug_registration.js` scripts
- Console logs are extensively used for debugging auth flows
- Use browser DevTools to inspect localStorage tokens

### Database Debugging
- Use `test_supabase_connection.js` for connection testing
- Check Supabase dashboard for real-time logs
- Verify RLS policies if queries fail

### Build Issues
- Clear `node_modules` and reinstall if dependency issues
- Check Node.js version compatibility
- Use correct package manager (npm vs yarn) consistently

## Key Files for Understanding

### Essential Configuration
- `package.json` - Dependencies and scripts
- `.env.example` - Required environment variables
- `backend/package.json` - Backend dependencies

### Core Authentication
- `src/utils/customAuth.js` - Supabase authentication service
- `src/utils/supabaseService.js` - Database operations
- `backend/index.js` - API endpoints and validation

### Main UI Components
- `src/App.js` - Main application router and state
- `src/components/CustomerAuth.js` - Customer authentication UI
- `src/DriverApp.js` - Driver application entry point

### Database & Setup
- `supabase_database_setup.sql` - Complete database schema
- `SUPABASE_SETUP.md` - Step-by-step setup guide
- `SUPABASE_AUTH_FIX.md` - Authentication implementation details
