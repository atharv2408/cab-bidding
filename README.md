# 🚗 Cab Bidding System

A modern, real-time cab booking platform with bidding functionality built with React and Supabase.

## ✨ Features

### For Customers
- **Real-time Ride Booking**: Book rides with instant driver notifications
- **Bidding System**: Drivers bid on your ride, you choose the best offer
- **OTP Verification**: Secure ride confirmation with OTP system
- **Dark Theme**: Full dark mode support for better user experience
- **Car Loading Animation**: Smooth animations during booking process

### For Drivers
- **Driver Dashboard**: Comprehensive dashboard for managing rides
- **Real-time Notifications**: Instant notifications for new ride requests
- **Bid Management**: Place competitive bids on available rides
- **Active Ride Tracking**: Track and manage ongoing rides
- **Optimized OTP Flow**: Streamlined OTP verification process

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/atharv2408/cab-bidding.git
   cd cab-bidding
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   REACT_APP_SUPABASE_URL=your_supabase_url
   REACT_APP_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Start the development server**
   ```bash
   npm start
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

## 🏗️ Technology Stack

- **Frontend**: React.js with Hooks
- **Backend**: Supabase (Database + Authentication)
- **Styling**: CSS3 with Dark Theme Support
- **Real-time**: Supabase Realtime subscriptions
- **Routing**: React Router
- **Build Tool**: Create React App

## 📱 Application Structure

```
src/
├── components/           # Reusable UI components
│   ├── CustomerAuth.js
│   ├── DriverLogin.js
│   ├── EnhancedOTPNotification.js
│   └── CarLoadingAnimation.js
├── pages/               # Main application pages
│   ├── Home.js
│   ├── Bid.js
│   ├── Confirm.js
│   ├── DriverDashboard.js
│   └── DriverActiveRides.js
├── styles/              # CSS stylesheets
│   ├── CustomerAuth.css
│   ├── DriverStyles.css
│   └── CarLoadingAnimation.css
├── utils/               # Utility functions
│   ├── supabaseService.js
│   ├── otpManager.js
│   └── urgentNotificationManager.js
└── App.js              # Main application component
```

## 🔧 Key Features Implementation

### OTP Notification System
- Single notification per session to prevent spam
- Automatic cleanup after ride completion
- Enhanced ride status tracking
- Urgent notification support

### Dark Theme
- Complete dark mode implementation
- High contrast for accessibility
- Consistent styling across all components
- User preference persistence

### Real-time Updates
- Live ride status updates
- Instant bid notifications
- Real-time driver location tracking
- Automatic UI synchronization

## 🚀 Deployment

The application is production-ready and optimized for deployment:

- ✅ **Optimized Bundle**: ~225KB gzipped JavaScript + 35KB CSS
- ✅ **Clean Dependencies**: Removed all testing and development dependencies
- ✅ **Performance Optimized**: Efficient re-rendering and state management
- ✅ **Mobile Responsive**: Works seamlessly on all device sizes

### Deploy to Netlify/Vercel
1. Build the project: `npm run build`
2. Deploy the `build` folder to your hosting platform
3. Configure environment variables on your hosting platform

## 🎯 Usage

### Customer Flow
1. Open the application and register/login
2. Enter pickup and destination locations
3. Wait for driver bids
4. Select preferred driver and confirm booking
5. Share OTP with driver to start the ride

### Driver Flow
1. Login to driver portal
2. View available ride requests on dashboard
3. Place competitive bids on desired rides
4. Get notified when customer accepts your bid
5. Verify customer OTP and start the ride

## 🔒 Security Features

- Secure OTP verification system
- Supabase Row Level Security (RLS)
- Protected API endpoints
- Input validation and sanitization
- Session management

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support

For support or questions, please open an issue on GitHub or contact the development team.

---

**Built with ❤️ for modern transportation solutions**