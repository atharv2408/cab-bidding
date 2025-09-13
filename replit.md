# BidCab - Secure Cab Bidding System

## Overview

BidCab is a comprehensive two-sided marketplace cab booking system that connects customers with drivers through a competitive bidding platform. The system features secure phone number authentication with OTP verification, real-time bidding, driver matching, and complete ride lifecycle management. Built with React and Supabase, it provides separate portals for customers and drivers with real-time synchronization and location tracking capabilities.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Multi-Portal Design**: Separate customer (`/`) and driver (`/driver`) applications
- **React-based**: Built with React 19.1.0 using react-scripts for the main customer portal
- **Responsive UI**: Mobile-first design with dark/light theme support
- **Real-time Updates**: Live synchronization using Supabase real-time subscriptions
- **Routing**: React Router DOM for navigation between different app sections

### Authentication System
- **Dual Authentication Methods**: 
  - Customer: Email/password authentication via Supabase Auth
  - Driver: Phone number + OTP verification with JWT tokens
- **Secure Session Management**: JWT-based sessions with token persistence
- **User Data Storage**: Customer data in Supabase auth metadata, driver profiles in custom tables
- **Fallback Mechanisms**: LocalStorage backup for offline scenarios

### Backend Architecture
- **Node.js + Express**: RESTful API server running on port 5000
- **Authentication Middleware**: JWT verification for protected routes
- **Input Validation**: Comprehensive validation using Joi library
- **OTP System**: 6-digit OTP generation and verification for driver authentication
- **CORS Configuration**: Cross-origin support for frontend-backend communication

### Data Management
- **Primary Database**: Supabase PostgreSQL with real-time capabilities
- **Database Schema**: Structured tables for users, drivers, bookings, bids, and ride history
- **Row Level Security**: Implemented RLS policies for data protection
- **Fallback Storage**: LocalStorage for offline operation and data persistence
- **Data Synchronization**: Real-time updates across customer and driver portals

### Core Features Implementation

#### Bidding System
- **60-second bidding window**: Automated lifecycle management for ride requests
- **15-second acceptance window**: Time-limited driver selection for customers
- **Real-time bid updates**: Live synchronization of new bids across all drivers
- **Automatic cleanup**: Expired bids removed every 5 seconds
- **Bid deduplication**: Smart filtering to prevent duplicate notifications

#### OTP Security Flow
- **4-digit customer OTP**: Generated during ride confirmation for driver verification
- **Driver verification**: OTP input required before ride start
- **Single-use system**: OTP validation prevents unauthorized ride access
- **History integration**: Completed rides automatically saved to both customer and driver history

#### Location Services
- **Leaflet Maps Integration**: Interactive mapping with route visualization
- **GPS Tracking**: Real-time location updates for active drivers
- **Geocoding**: Address-to-coordinate conversion using Leaflet Control Geocoder
- **Distance Calculation**: Automatic distance and fare estimation
- **Routing**: Visual route display using Leaflet Routing Machine

#### Real-time Notifications
- **Enhanced OTP Notifications**: Smart deduplication prevents repeated popups
- **Driver Bid Alerts**: Instant notifications when new rides become available
- **Status Updates**: Real-time ride status changes across all connected clients
- **Cleanup Automation**: Automatic removal of expired notifications and data

### State Management
- **React Hooks**: useState and useEffect for component state
- **Context API**: User authentication context across components
- **LocalStorage Persistence**: Critical data backup and session management
- **Real-time Subscriptions**: Supabase subscriptions for live data updates

### Error Handling & Resilience
- **Multi-level Fallbacks**: Database → API → LocalStorage → Demo mode
- **Graceful Degradation**: System continues operating when services are unavailable
- **Comprehensive Validation**: Input sanitization and type checking throughout
- **Error Boundaries**: Proper error catching and user-friendly messages

## External Dependencies

### Database & Backend Services
- **Supabase**: Primary database, authentication, and real-time subscriptions
- **PostgreSQL**: Relational database with ACID compliance via Supabase
- **Express.js**: Web framework for RESTful API development

### Authentication & Security
- **Supabase Auth**: Email/password authentication for customers
- **JWT (jsonwebtoken)**: Token-based session management for drivers
- **bcryptjs**: Password hashing for enhanced security
- **Joi**: Input validation and sanitization

### Frontend Libraries
- **React Router DOM**: Client-side routing and navigation
- **Axios**: HTTP client for API communication
- **React Leaflet**: Interactive maps and location services
- **Leaflet**: Core mapping library with plugins for geocoding and routing

### Internationalization
- **i18next**: Core internationalization framework
- **react-i18next**: React integration for i18n
- **i18next-browser-languagedetector**: Automatic language detection

### Development & Testing
- **React Testing Library**: Component testing framework
- **Jest**: JavaScript testing framework (via react-scripts)
- **Web Vitals**: Performance monitoring and optimization
- **gh-pages**: Deployment automation for GitHub Pages

### Utility Libraries
- **TypeScript**: Type safety and enhanced development experience
- **CORS**: Cross-origin resource sharing middleware
- **dotenv**: Environment variable management for configuration