# BidCab Driver App

A comprehensive driver-side application for the BidCab ride-hailing platform. This app allows drivers to receive ride requests, place competitive bids, manage active rides, and track their earnings.

## Features

### 🏠 Dashboard
- Real-time stats (today's rides, earnings, rating, pending bids)
- Online/offline status toggle with location detection
- Recent rides overview
- Available ride requests preview

### 🔍 Available Rides
- Browse ride requests in your area
- View customer information and ratings
- Real-time competitive bidding system
- Bidding timer and status tracking
- Smart bid suggestions
- Current bids leaderboard

### 🚗 Active Rides
- Manage ongoing trips with status updates
- Direct customer communication (call/text)
- GPS navigation integration
- Trip progress tracking with timer
- OTP verification system
- Emergency and support options

### 💰 Earnings
- Comprehensive earnings analytics
- Daily, weekly, and monthly breakdowns
- Visual charts and progress tracking
- Payment method summaries
- Goal setting and progress monitoring
- Detailed ride history with customer feedback

### 👤 Profile & History
- Driver profile management
- Vehicle information
- Complete ride history
- Customer ratings and feedback

## Key Features

### Smart Bidding System
- Competitive real-time bidding on ride requests
- Intelligent bid suggestions based on distance and demand
- Live bid tracking and leaderboard
- Time-limited bidding windows

### Driver Status Management
- Online/offline toggle with location services
- Automatic location detection and updates
- Real-time availability broadcasting

### Comprehensive Trip Management
- Step-by-step trip status tracking
- Customer communication tools
- Navigation integration
- OTP verification for security

### Earnings Analytics
- Detailed financial tracking and reporting
- Goal setting and achievement tracking
- Payment method breakdown
- Performance analytics

## Technology Stack

- **Frontend**: React 19.1.0
- **Routing**: React Router DOM 7.7.1
- **Maps**: Leaflet with React Leaflet
- **Real-time Communication**: Socket.IO Client
- **HTTP Client**: Axios
- **Internationalization**: React i18next
- **Styling**: CSS3 with CSS Variables

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
cd cab-bidding-system/driver-app
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) to view the app in the browser.

### Demo Mode
The app includes a demo mode with sample data for testing and development purposes. Click "Try Demo Mode" on the login screen to explore all features without backend setup.

## Available Scripts

- `npm start` - Runs the app in development mode
- `npm run build` - Builds the app for production
- `npm test` - Launches the test runner
- `npm run eject` - Ejects from Create React App (irreversible)

## Integration with Backend

The driver app is designed to integrate seamlessly with a Socket.IO backend server. Key integration points include:

- **Authentication**: Driver login/registration
- **Real-time Updates**: Ride requests, bid updates, customer interactions
- **Location Services**: Driver location broadcasting
- **Trip Management**: Status updates, completion notifications
- **Earnings Tracking**: Payment processing and reporting

## UI/UX Design

The app features a clean, intuitive design optimized for mobile and desktop use:

- **Driver-specific color scheme**: Orange/amber gradient theme
- **Dark mode support**: System-aware theme switching
- **Mobile-responsive**: Touch-friendly interface for in-car use
- **Accessibility**: Screen reader support and keyboard navigation
- **Performance**: Optimized for real-time updates and smooth animations

## Key Driver Workflows

### 1. Going Online
1. Driver opens app and logs in
2. Location permission requested and granted
3. Driver toggles online status
4. App broadcasts availability to backend

### 2. Receiving and Bidding on Rides
1. Real-time ride requests appear on dashboard
2. Driver views ride details and customer information
3. Driver places competitive bid within time window
4. System shows bid status and ranking

### 3. Managing Active Rides
1. Driver accepts ride and receives customer details
2. Navigation to pickup location
3. Status updates: En route → Arrived → Passenger aboard → En route to destination
4. Trip completion with payment confirmation

### 4. Tracking Earnings
1. Real-time earnings updates after each trip
2. Detailed analytics and goal tracking
3. Payment method breakdown
4. Historical performance data

## Contributing

This driver app is designed to complement the existing BidCab user application and provides a complete ride-hailing ecosystem. The codebase follows React best practices and is designed for easy maintenance and extensibility.

## License

This project is part of the BidCab ride-hailing system and follows the same licensing as the main project.
