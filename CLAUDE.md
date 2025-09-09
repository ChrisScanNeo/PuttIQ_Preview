# PuttIQ2 - Putting Rhythm Trainer Development Guide

## 🚀 Current Progress Summary
**Last Updated:** December 3, 2024

### ✅ Completed Features:
- **Project Setup** - Expo SDK 53 with React Native configured for Codespaces
- **Device Authentication** - Automatic login using device IDs (iOS vendor ID, Android ID) - NO Google Sign-In
- **Firebase Integration** - Firestore database with offline support and real configuration values
- **Enhanced Audio System** - Simultaneous speaker playback + microphone recording via Expo Dev Client
- **Microphone Hit Detection** - Real-time hit detection with timing accuracy (using @cjblack/expo-audio-stream)
- **Core UI Components** - Home screen with tempo slider (60-100 BPM)
- **Visual Feedback** - Beat indicator dots that alternate with tempo
- **Landscape Orientation** - App locked to landscape mode for golf stance
- **Metronome Controls** - Start/Stop button with visual state changes
- **Offline Support** - AsyncStorage cached user data with Firebase fallback
- **Haptic Support** - Optional haptic feedback (disabled by default)
- **Timing Bar Animation** - Horizontal bar with moving marker (back-and-forth motion)
- **Responsive Layout** - ScrollView to prevent overflow in landscape mode
- **EAS Build Configuration** - Custom dev client builds for iOS/Android
- **iOS Audio Session** - Custom plugin for AVAudioSessionCategoryPlayAndRecord with speaker output
- **Hit Accuracy Display** - Shows timing accuracy percentage and feedback messages

### 🔧 In Progress:
- **iPhone Testing** - Testing hit detection on real device (build completed, ready for testing)
- **Threshold Tuning** - Fine-tuning microphone sensitivity for optimal hit detection

### ❌ Not Yet Implemented:
- **Golf Ball Graphics** - No visual golf ball component
- **In-App Purchase** - react-native-iap NOT installed (needs to be added)
- **Settings Screen** - No UI for preferences (backend ready)
- **Practice Statistics** - No session tracking or progress display beyond current session

### ⚠️ Known Issues:
- **Expo Go Limitation** - Hit detection ONLY works in custom dev client, not Expo Go
- **Animation library** - react-native-reanimated installed but may have Codespaces issues
- **Duplicate directories** - /assets/sounds/ empty (can be removed)

### 📅 Priority Next Steps:
1. Test hit detection on iPhone device
2. Tune microphone sensitivity thresholds
3. Create settings screen UI
4. Implement in-app purchase flow
5. Add practice statistics/history

---

## 🔧 Technical Configuration

### Orientation Settings
- **Mode:** Landscape only
- **Files Modified:**
  - `app.json` - orientation: "landscape"
  - `App.js` - ScreenOrientation.lockAsync(LANDSCAPE)
- **Platforms:** iOS and Android

### Audio Configuration
- **Metronome Sound:** `/assets/sound/metronome-85688.mp3`
- **Audio Library:** @cjblack/expo-audio-stream for simultaneous playback/recording
- **iOS Session:** AVAudioSessionCategoryPlayAndRecord with DefaultToSpeaker
- **Hit Detection:** Real-time amplitude monitoring with -15 dB threshold
- **Preloaded:** Yes (for instant playback)
- **Volume:** 70%
- **Works in Silent Mode:** Yes (iOS)

### Firebase Setup
- **Authentication:** Device-based (automatic)
- **Database:** Firestore
- **Offline Support:** Enabled with caching
- **User Data:** Stored by device ID

### Development Environment
- **Platform:** GitHub Codespaces
- **Testing:** Custom Dev Client via EAS Build (Expo Go for basic features only)
- **Port:** 8081
- **Framework:** React Native with Expo SDK 53
- **Node Version:** Compatible with React 19.0.0
- **Build System:** EAS Build with custom dev client
- **Config:** app.config.js (no app.json)

---

## 🎯 Project Overview
A React Native mobile app that helps golfers perfect their putting rhythm using:
- Smooth, animated metronome bar and golf ball
- Audio feedback from microphone to detect putter hits
- Simple timing accuracy feedback
- One-time unlock via in-app purchase (iOS & Android)

## 🛠 Tech Stack
| Layer       | Tool / Framework                   | Purpose                                 |
|------------|-------------------------------------|------------------------------------------|
| UI          | React Native with Expo SDK 53      | Cross-platform framework                 |
| Animations  | react-native-reanimated            | Complex animations (installed)           |
| Graphics    | react-native-svg                   | Custom vector shapes, animations         |
| Audio       | @cjblack/expo-audio-stream         | Simultaneous playback + recording        |
| Audio Session | Custom Expo Config Plugin        | iOS AVAudioSession configuration         |
| Build       | EAS Build with Dev Client          | Custom native builds                     |
| Payments    | react-native-iap (not yet installed) | App Store and Play Store IAP          |

---

## 📋 Development Phases

### Phase 1: Project Setup & Foundation ✅ COMPLETED
**Objective:** Initialize React Native project with required dependencies

#### Completed:
- ✅ Initialized React Native project with Expo
- ✅ Installed core dependencies:
  - ✅ `expo-av` for audio playback
  - ✅ `@react-native-community/slider` for BPM control
  - ✅ `expo-haptics` for tactile feedback (optional)
  - ✅ `react-native-svg` for graphics
  - ✅ `react-native-iap` (ready for implementation)
- ✅ Set up project structure:
  ```
  /PuttIQ2
  ├── /assets
  │   ├── /sound
  │   │   └── metronome-85688.mp3
  │   ├── /sounds (empty - can be removed)
  │   └── [app icons and splash images]
  ├── /hooks
  │   └── useMetronome.js
  ├── /screens
  │   └── HomeScreen.js (only screen)
  ├── /services
  │   ├── auth.js (device-based auth)
  │   ├── audio.js (metronome sound)
  │   └── firebase.js (Firestore config)
  ├── App.js (entry point)
  ├── app.json (Expo config)
  ├── CLAUDE.md (this file)
  └── FIREBASE_SETUP.md (setup docs)
  ```
- ✅ Configured for Codespaces development
- ✅ Set up Expo tunnel for mobile testing

---

### Phase 2: UI & Core Animation ⚠️ PARTIALLY COMPLETE
**Objective:** Build the main metronome view with smooth animations

#### Completed:
- ✅ Created main screen layout (HomeScreen.js)
- ✅ Implemented tempo slider (60-100 BPM range)
- ✅ Added visual beat indicators (dots that alternate)
- ✅ Created START/STOP button with color states
- ✅ Added feedback text display
- ✅ Implemented useMetronome hook for timing logic
- ✅ Created TimingBar component with animated marker
- ✅ Implemented back-and-forth motion animation
- ✅ Fixed layout overflow issues with ScrollView

#### In Progress:
- 🔧 Fine-tuning timing synchronization (marker should hit endpoints on beat)

#### Not Implemented:
- ❌ Golf ball image component
- ❌ Hit detection feedback animations
- ❌ Visual path indicator for putting stroke

#### Animation Implementation Example:
```tsx
const progress = useSharedValue(0);

useEffect(() => {
  progress.value = withRepeat(
    withTiming(1, { duration: 60000 / bpm }),
    -1,
    true // reverse direction
  );
}, [bpm]);

const animatedStyle = useAnimatedStyle(() => ({
  transform: [{ translateX: interpolate(progress.value, [0, 1], [-100, 100]) }],
}));
```

---

### Phase 3: Audio & Sound Implementation ✅ COMPLETED
**Objective:** Implement metronome sound and audio playback

#### Completed:
- ✅ Set up audio service (audio.js)
- ✅ Implemented metronome tick sound playback
- ✅ Added local MP3 file support (metronome-85688.mp3)
- ✅ Preloaded sounds for better performance
- ✅ Configured audio for iOS silent mode
- ✅ Added optional haptic feedback
- ✅ Sound enable/disable functionality

#### Still Pending (Microphone Detection):
- [ ] Request microphone permissions
- [ ] Volume spike detection for putter hits
- [ ] Timing accuracy calculation
- [ ] Hit feedback system

#### Audio Detection Example:
```tsx
SoundLevel.onNewFrame = (data) => {
  if (data.value > threshold) {
    const now = Date.now();
    // Compare to swing timing here
  }
};
```

---

### Phase 4: Authentication & Data Storage ✅ COMPLETED
**Objective:** Set up user authentication and data persistence

#### Completed:
- ✅ Firebase project configured with real values
- ✅ Firestore database initialized
- ✅ Device-based authentication using device IDs (NOT Google Sign-In)
- ✅ Automatic user profile creation on first launch
- ✅ Offline support with AsyncStorage caching
- ✅ User settings and stats data structure
- ✅ Fallback for offline-only usage

### Phase 5: In-App Purchase Integration ❌ NOT STARTED
**Objective:** Implement one-time unlock purchase flow

**Note:** react-native-iap is installed but not implemented

#### TODO List:

##### Store Configuration:
- [ ] **Apple App Store Setup:**
  - [ ] Create non-consumable product in App Store Connect
  - [ ] Product ID: `putting_metronome_unlock`
  - [ ] Set price tier (£3.99 or equivalent)
  - [ ] Add product descriptions and screenshots

- [ ] **Google Play Store Setup:**
  - [ ] Add Managed Product in Google Play Console
  - [ ] Use same Product ID: `putting_metronome_unlock`
  - [ ] Configure as one-time purchase
  - [ ] Set pricing

##### Implementation:
- [ ] Create IAP service (iap.ts)
- [ ] Initialize IAP connection on app start
- [ ] Fetch available products
- [ ] Implement purchase flow:
  ```tsx
  const buy = async () => {
    try {
      const purchase = await RNIap.requestPurchase(itemSkus[0]);
      // Unlock app here — store in AsyncStorage
    } catch (err) {
      Alert.alert('Purchase failed');
    }
  };
  ```
- [ ] Store unlock status (AsyncStorage or cloud)
- [ ] Create locked/unlocked UI states
- [ ] Add "Buy Unlock" button and flow
- [ ] Implement restore purchases functionality
- [ ] Handle edge cases (network errors, cancelled purchases)

---

### Phase 5: Polish & User Experience
**Objective:** Enhance app quality and user experience

#### TODO List:
- [ ] Add app icon and splash screen
- [ ] Implement onboarding/tutorial screens (optional)
- [ ] Create settings screen:
  - [ ] Audio sensitivity adjustment
  - [ ] Visual theme options
  - [ ] Restore purchases button
- [ ] Add haptic feedback (iOS)
- [ ] Optimize animation performance
- [ ] Implement proper error handling
- [ ] Add analytics tracking (optional)

---

### Phase 6: Testing & Quality Assurance
**Objective:** Ensure app works flawlessly on both platforms

#### Testing Checklist:
- [ ] **Animation Testing:**
  - [ ] Smooth metronome at all BPM ranges (60-100)
  - [ ] No frame drops or stuttering
  - [ ] Correct timing calculations

- [ ] **Audio Testing:**
  - [ ] Microphone permissions work correctly
  - [ ] Hit detection accuracy
  - [ ] Background noise handling
  - [ ] Different device microphones

- [ ] **IAP Testing:**
  - [ ] Purchase flow with test accounts
  - [ ] Restore purchases functionality
  - [ ] Network error handling
  - [ ] Fresh install unlock status

- [ ] **Cross-Platform Testing:**
  - [ ] iOS devices (iPhone 12+)
  - [ ] Android devices (various manufacturers)
  - [ ] Different screen sizes
  - [ ] Dark/light mode support

- [ ] **Performance Testing:**
  - [ ] Battery usage optimization
  - [ ] Memory management
  - [ ] App size optimization

---

### Phase 7: Deployment & Release
**Objective:** Prepare and release app to stores

#### TODO List:
- [ ] **Pre-Release:**
  - [ ] Generate production builds
  - [ ] Create app store listings
  - [ ] Prepare marketing materials
  - [ ] Write privacy policy
  - [ ] Create support documentation

- [ ] **iOS Release:**
  - [ ] Submit to App Store Review
  - [ ] Respond to any review feedback
  - [ ] Schedule release date

- [ ] **Android Release:**
  - [ ] Upload to Google Play Console
  - [ ] Complete store listing
  - [ ] Submit for review

- [ ] **Post-Release:**
  - [ ] Monitor crash reports
  - [ ] Respond to user reviews
  - [ ] Plan future updates

---

## 🚀 Future Enhancements (Post-MVP)
- [ ] Different stroke profiles (putter, iron, driver)
- [ ] Score history and progress tracking
- [ ] Partner code system for revenue share
- [ ] Online leaderboard (Firebase/Supabase)
- [ ] Advanced timing analytics
- [ ] Social sharing features
- [ ] Multiple practice modes

---

## 📚 Key Libraries & Resources

### Currently Installed:
- **expo-av** - Audio playback (deprecated in SDK 54 but working)
- **@react-native-community/slider** - BPM tempo control
- **expo-screen-orientation** - Landscape lock
- **expo-haptics** - Tactile feedback
- **firebase** - Backend and data storage
- **@react-native-async-storage/async-storage** - Local data caching
- **react-native-svg** - Vector graphics (installed, not yet used)
- **react-native-iap** - In-app purchases (NOT FOUND - needs installation)

### Removed/Not Working:
- ~~react-native-reanimated~~ - Removed due to Codespaces compatibility issues

### To Be Added:
- Microphone detection library (TBD)
- Alternative animation solution (TBD)

---

## 🚀 Quick Start Guide

### For Codespaces Development:
```bash
# Start Expo with tunnel (for mobile testing)
npx expo start --tunnel

# Clear cache and restart
npx expo start --tunnel --clear

# Web development (if needed)
npm run web
```

### Testing on Mobile:
1. Install **Expo Go** app on your phone
2. Start the server with tunnel: `npx expo start --tunnel`
3. Scan QR code or enter URL in Expo Go
4. App will auto-reload on file changes

### Key Files to Edit:
- **UI:** `/screens/HomeScreen.js`
- **Audio:** `/services/audio.js`
- **Metronome Logic:** `/hooks/useMetronome.js`
- **Firebase Config:** `/services/firebase.js`
- **App Entry:** `/App.js`

## 🧑‍💻 Development Commands
```bash
# Install dependencies
npm install --legacy-peer-deps

# Start development server
npx expo start --tunnel

# Clear Metro cache
npx expo start -c

# Build for production (later)
eas build --platform ios
eas build --platform android
```

---

## 📱 Current App Status

### What's Working Now:
- ✅ App launches in landscape mode
- ✅ Metronome plays tick sound at selected BPM
- ✅ Start/Stop button controls playback
- ✅ BPM slider adjusts tempo (60-100)
- ✅ Visual dots indicate beat
- ✅ Firebase stores user data (when online)
- ✅ Works offline with cached data
- ✅ No login required (device-based auth)

### What's Not Yet Implemented:
- ❌ Visual metronome bar animation
- ❌ Golf ball graphic
- ❌ Microphone hit detection
- ❌ Timing accuracy feedback
- ❌ In-app purchase unlock
- ❌ Settings screen
- ❌ Practice history/stats
- ❌ Different sound options

## 📝 Notes
- Always test IAP with sandbox/test accounts first
- Ensure microphone permissions are clearly explained to users
- Keep animations at 60 FPS for best user experience
- Consider offline functionality for core features
- Landscape orientation optimized for golf stance
- when we make a change, andd it is readdy to test, commit it to git and push with notes, so I can sync my local device and test