# Firebase Setup Instructions

This project now uses Firebase Firestore as its database instead of localStorage. Follow these steps to set up Firebase for your project.

## Prerequisites
- A Google account
- Node.js and npm installed

## Step 1: Create a Firebase Project

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project"
3. Enter your project name (e.g., "cab-bidding-system")
4. Follow the setup wizard to create your project

## Step 2: Enable Firestore Database

1. In your Firebase project dashboard, go to "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" for development (you can change security rules later)
4. Select a location for your database

## Step 3: Get Firebase Configuration

1. In your Firebase project dashboard, click the gear icon ⚙️ and select "Project settings"
2. Scroll down to "Your apps" section
3. Click "Add app" and select the web icon (`</>`)
4. Register your app with a nickname (e.g., "Cab Bidding Web App")
5. Copy the configuration object that appears

## Step 4: Configure Environment Variables

1. Create a `.env` file in your project root (copy from `.env.example`)
2. Replace the placeholder values with your Firebase configuration:

```env
REACT_APP_FIREBASE_API_KEY=your-actual-api-key
REACT_APP_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your-actual-project-id
REACT_APP_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your-actual-sender-id
REACT_APP_FIREBASE_APP_ID=your-actual-app-id
REACT_APP_FIREBASE_MEASUREMENT_ID=your-actual-measurement-id
```

## Step 5: Security Rules (Optional)

For development, you can use these basic Firestore security rules. Go to "Firestore Database" > "Rules":

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to all documents for development
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**Important**: Change these rules for production to implement proper security!

## Step 6: Test the Setup

1. Start your development server: `npm start`
2. The app should automatically create sample drivers in your Firestore database
3. Try creating a booking - it should save to Firebase instead of localStorage
4. Check your Firebase Console to see the data

## Database Collections

The app uses these Firestore collections:

- **bookings**: Stores all ride bookings
- **drivers**: Stores driver information and availability
- **users**: Reserved for future user management features

## Migration from localStorage

If you have existing data in localStorage that you want to migrate:

1. Open your browser's developer tools
2. Go to Application > Local Storage
3. Export any important data before switching to Firebase
4. The app will automatically initialize with sample drivers on first run

## Troubleshooting

### Common Issues:

1. **"Firebase configuration object is invalid"**
   - Check that all environment variables are set correctly
   - Ensure `.env` file is in the project root
   - Restart the development server after adding environment variables

2. **"Missing or insufficient permissions"**
   - Check your Firestore security rules
   - Make sure you're in test mode or have appropriate rules set

3. **"Firebase app already initialized"**
   - This is usually harmless and can be ignored
   - Make sure you're not importing Firebase config multiple times

### Getting Help:

- Check the [Firebase Documentation](https://firebase.google.com/docs)
- Review the browser console for specific error messages
- Make sure your Firebase project has Firestore enabled

## Production Considerations

Before deploying to production:

1. **Update Firestore Security Rules** to restrict access appropriately
2. **Set up Firebase Authentication** if you want user accounts
3. **Configure proper error handling** and retry logic
4. **Set up monitoring** using Firebase Analytics
5. **Review your Firebase usage** to optimize costs

## Next Steps

With Firebase set up, you can now:
- Add user authentication
- Implement real-time updates
- Add push notifications
- Scale your app with Firebase hosting
- Use Firebase Cloud Functions for server-side logic
