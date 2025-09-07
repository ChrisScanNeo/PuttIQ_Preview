# Firebase Setup Instructions

## 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Name your project: `puttiq-app` (or similar)
4. Enable Google Analytics (optional)
5. Wait for project creation to complete

## 2. Enable Authentication

1. In Firebase Console, go to **Authentication** > **Sign-in method**
2. Enable **Google** as a sign-in provider
3. Add your project support email
4. Copy the **Web client ID** (you'll need this)
5. Click **Save**

## 3. Configure Firebase for Web

1. Go to **Project Settings** (gear icon)
2. Scroll to "Your apps" section
3. Click **Web** icon (</>) to add a web app
4. Register app with nickname: `PuttIQ Web`
5. Copy the Firebase configuration object

## 4. Configure Firebase for iOS

1. In Project Settings, click **Add app** > **iOS**
2. Enter iOS bundle ID: `com.yourcompany.puttiq`
3. Download `GoogleService-Info.plist`
4. Add to iOS project later

## 5. Configure Firebase for Android

1. In Project Settings, click **Add app** > **Android**
2. Enter Android package name: `com.yourcompany.puttiq`
3. Download `google-services.json`
4. Add to Android project later

## 6. Set up Firestore Database

1. Go to **Firestore Database**
2. Click **Create database**
3. Choose **Start in production mode**
4. Select your region (closest to your users)
5. Click **Enable**

## 7. Configure Firestore Security Rules

Go to **Firestore Database** > **Rules** and add:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Premium content check
    match /premium/{document=**} {
      allow read: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.isPremium == true;
    }
  }
}
```

## 8. Update Your Code

1. Replace the configuration in `/services/firebase.js`:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_ACTUAL_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};
```

2. Update `/services/auth.js` with your Web Client ID:

```javascript
GoogleSignin.configure({
  webClientId: 'YOUR_WEB_CLIENT_ID_FROM_GOOGLE_CONSOLE',
  offlineAccess: true,
});
```

## 9. Enable Firebase Hosting (Optional)

1. Install Firebase CLI locally:
   ```bash
   npm install -g firebase-tools
   ```

2. Login to Firebase:
   ```bash
   firebase login
   ```

3. Initialize hosting:
   ```bash
   firebase init hosting
   ```

4. Select your project
5. Set public directory: `web-build`
6. Configure as single-page app: Yes
7. Set up automatic builds: No

## 10. OAuth Consent Screen (Important!)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your Firebase project
3. Go to **APIs & Services** > **OAuth consent screen**
4. Configure the consent screen:
   - App name: PuttIQ
   - User support email: your email
   - Developer contact: your email
5. Add your app domain when you have one
6. Save and continue

## 11. Testing OAuth

### For Development:
- Add `localhost` to authorized domains in Firebase Console
- Add test users in Google Cloud Console if needed

### For Production:
- Add your production domain to authorized domains
- Verify domain ownership if required

## Security Checklist

- [ ] Never commit API keys to version control
- [ ] Use environment variables for sensitive data
- [ ] Enable App Check for production
- [ ] Set up proper Firestore security rules
- [ ] Enable 2FA on your Firebase account
- [ ] Regularly review authentication logs

## Troubleshooting

### "Web client ID not found"
- Check Firebase Console > Authentication > Sign-in method > Google
- Copy the Web Client ID (not the iOS/Android client ID)

### "Invalid API key"
- Verify the API key in Firebase Console > Project Settings
- Check for typos or extra spaces

### "Permission denied" in Firestore
- Check your security rules
- Ensure user is authenticated
- Verify the document path is correct

## Next Steps

1. Test authentication flow
2. Verify Firestore data storage
3. Set up Firebase Analytics
4. Configure Cloud Functions for backend logic
5. Set up Firebase Cloud Messaging for notifications