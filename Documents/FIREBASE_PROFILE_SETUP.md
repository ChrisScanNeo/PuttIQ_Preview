# Firebase Profile System Setup

## Current Firebase Services Status

### ✅ Active Services:
1. **Firestore Database** - Storing user data and profiles
2. **Firebase Analytics** - Optional tracking
3. **Device-based Authentication** - Using device IDs (not Firebase Auth)

### ❌ NOT Using:
1. **Firebase Authentication** - We use device IDs directly
2. **Google Sign-In** - Not implemented
3. **Cloud Storage** - Not needed (profiles stored in Firestore)
4. **Cloud Functions** - Not required yet

## Profile Storage Architecture

### Firestore Structure:
```
/users/{deviceId}/
  ├── User document (existing)
  │   ├── uid: string (device ID)
  │   ├── deviceInfo: object
  │   ├── settings: object
  │   ├── stats: object
  │   └── isPremium: boolean
  │
  └── profiles/ (subcollection)
      ├── {profileId}
      │   ├── id: string
      │   ├── userId: string
      │   ├── name: string
      │   ├── kind: 'target' | 'ignore'
      │   ├── template: string (base64)
      │   ├── threshold: number
      │   ├── enabled: boolean
      │   ├── isDefault: boolean
      │   ├── createdAt: timestamp
      │   └── updatedAt: timestamp
      └── ...more profiles
```

### Optional: Shared Default Profiles
```
/defaultProfiles/ (root collection)
  ├── metronome_wood
  ├── metronome_beep
  ├── metronome_click
  └── metronome_rimshot
```

## What's Already Implemented

### ✅ Backend Services:
1. **FirebaseProfileService.js** - CRUD operations for profiles
2. **ProfileManager.js** - Central management with caching
3. **MetronomeTemplateGenerator.js** - Creates default templates
4. **ProfileBuilder.js** - Converts recordings to profiles

### ✅ Features:
- Save/load profiles per user
- Offline caching with AsyncStorage
- Real-time sync across devices
- Default profile initialization
- Profile validation

## Security Considerations

### Current Approach (Device ID Auth):
- **Pros:**
  - No login required
  - Simple user experience
  - Works offline
  - Automatic per-device profiles

- **Cons:**
  - Less secure than Firebase Auth
  - Device ID can potentially be spoofed
  - No account recovery if device lost
  - No cross-device sync without manual linking

### Firestore Rules:
Since we're not using Firebase Authentication, our rules are currently permissive:
```javascript
// Current: Allow all read/write to user's own data
allow read, write: if true;
```

**For Production**, consider:
1. Adding Firebase App Check
2. Implementing custom tokens
3. Rate limiting via Cloud Functions
4. Adding request validation

## Testing Profile System

### 1. Check Firestore Connection:
```javascript
// In your app
import { firebaseProfileService } from './services/profiles/FirebaseProfileService';

const testFirebase = async () => {
  const userId = await getDeviceId();
  console.log('User ID:', userId);
  
  // Try to save a test profile
  const testProfile = {
    name: 'Test Profile',
    kind: 'target',
    template: new Float32Array(128),
    threshold: 0.8,
    enabled: true
  };
  
  const profileId = await firebaseProfileService.saveProfile(userId, testProfile);
  console.log('Saved profile:', profileId);
  
  // Load profiles
  const profiles = await firebaseProfileService.loadUserProfiles(userId);
  console.log('Loaded profiles:', profiles);
};
```

### 2. Test Offline Support:
1. Create profiles while online
2. Turn off network
3. App should still work with cached profiles
4. Turn network back on - should sync

### 3. Test Real-time Sync:
1. Open app on two devices/simulators
2. Create profile on one device
3. Should appear on other device automatically

## Deployment Checklist

### Before Production:
- [ ] Update Firestore security rules for production
- [ ] Enable Firebase App Check (anti-abuse)
- [ ] Set up Firestore indexes if needed
- [ ] Configure Firestore backup policy
- [ ] Set up monitoring/alerts
- [ ] Test with production Firebase project

### Performance Optimization:
- [ ] Enable Firestore offline persistence
- [ ] Implement pagination for large profile lists
- [ ] Use Firestore bundles for default profiles
- [ ] Consider using Firestore cache settings

## Migration Path (If Adding Firebase Auth Later)

If you decide to add proper authentication later:

1. **Add Firebase Auth:**
   ```javascript
   import { getAuth, signInAnonymously } from 'firebase/auth';
   const auth = getAuth();
   await signInAnonymously(auth);
   ```

2. **Link Device ID to Auth UID:**
   - Create mapping: deviceId → authUid
   - Migrate existing profiles

3. **Update Security Rules:**
   ```javascript
   allow read, write: if request.auth != null && 
     request.auth.uid == userId;
   ```

4. **Benefits:**
   - Better security
   - Account recovery options
   - Easier cross-device sync
   - Premium subscription management

## Next Steps

1. **Test Current Implementation:**
   - Verify profile save/load works
   - Check offline functionality
   - Test sync between devices

2. **Complete UI:**
   - PutterOnboarding screen
   - ProfileManager screen
   - Settings integration

3. **Production Prep:**
   - Update security rules
   - Add error handling
   - Implement analytics events

## Common Issues & Solutions

### "Permission Denied" Error:
- Check Firestore rules in Firebase Console
- Verify device ID is being passed correctly
- Ensure Firestore is enabled in Firebase Console

### Profiles Not Syncing:
- Check network connectivity
- Verify Firebase configuration
- Look for errors in console logs

### Offline Mode Not Working:
- Ensure AsyncStorage is properly configured
- Check if profiles are being cached
- Verify offline detection logic

### Template Storage Too Large:
- Consider compressing templates before storage
- Use Cloud Storage for larger data
- Implement template versioning

## Resources

- [Firestore Documentation](https://firebase.google.com/docs/firestore)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firestore Offline Data](https://firebase.google.com/docs/firestore/manage-data/enable-offline)
- [Firebase App Check](https://firebase.google.com/docs/app-check)