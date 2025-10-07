# PuttIQ2 - Putting Rhythm Trainer Development Guide

## 🚀 Current Progress Summary
**Last Updated:** October 1, 2025

### ✅ Completed Features:
- **Project Setup** - Expo SDK 54 with React Native 0.81.4 configured for Codespaces
- **Device Authentication** - Automatic login using device IDs (iOS vendor ID, Android ID) - NO Google Sign-In
- **Firebase Integration** - Firestore database with offline support and real configuration values
- **Landscape Orientation** - App locked to landscape mode for golf stance
- **Offline Support** - AsyncStorage cached user data with Firebase fallback
- **EAS Build Configuration** - Custom dev client builds for iOS/Android
- **Platform-Specific Video System** - .mov for iOS, .webm for Android (optimized per platform)
- **Video-Based Timing System** - Transparent timing bar with 2-second gap between loops
- **2-Second Gap Feature** - Professional pause between video cycles (client requirement)
- **BPM Locked at 70** - Testing mode with locked BPM (controls disabled)
- **Sound Type Selection** - Three sound types: Tone, Beat, Wind with custom icons
- **Interactive Golf Ball** - Clickable golf ball with "START/STOP" text overlay
- **Dynamic Video Loading** - Automatically loads correct video based on platform and sound type
- **Stop-on-Click Controls** - Clicking any control during playback stops video immediately
- **Custom Icon System** - PNG icons for all UI controls (plus, minus, musical-note, metronome, wind)
- **Responsive Golf Ball** - PNG golf ball that scales dynamically to available screen space (80% of height)
- **Professional Loading Screen** - Black screen with PuttIQ logo, 2.5s minimum load time with asset preloading
- **Custom App Icon & Splash** - Branded icon and splash screen (Icon_nobackground.jpg, Logo_NoBackground.jpg)
- **Grass Background** - Full-screen cover mode background image

### 🔧 In Progress:
- **Complete Video Library** - Adding remaining BPM variations (71-80) for all sound types

### ❌ Not Yet Implemented:
- **Microphone Hit Detection** - Real-time putter hit detection (old system needs updating)
- **Hit Accuracy Display** - Timing accuracy feedback and scoring
- **In-App Purchase** - react-native-iap NOT installed (needs to be added)
- **Settings Screen** - No UI for preferences (backend ready)
- **Practice Statistics** - No session tracking or progress display

### ⚠️ Current Video Library Status:
- ✅ **iOS (Tones_70BPM.mov)** - Available (QuickTime format with alpha transparency)
- ✅ **iOS (Beats_70BPM.mov)** - Placeholder (copy of Tones)
- ✅ **iOS (Wind_70BPM.mov)** - Placeholder (copy of Tones)
- ⏳ **Android .webm files** - Empty placeholders created, need actual video files
- ⏳ **71-80 BPM variations** - Need to be created for all three types (30 .mov + 30 .webm = 60 files total)

### 📅 Priority Next Steps:
1. Upload remaining video files (71-80 BPM for Tone, Beat, Wind)
2. Test all video transitions work correctly
3. Re-implement microphone hit detection with new UI
4. Add timing accuracy feedback system
5. Implement in-app purchase flow

---

## 🔧 Technical Configuration

### Orientation Settings
- **Mode:** Landscape only
- **Files Modified:**
  - `app.json` - orientation: "landscape"
  - `App.js` - ScreenOrientation.lockAsync(LANDSCAPE)
- **Platforms:** iOS and Android

### Video & Audio Configuration
- **Video System:** Platform-specific video files with embedded audio for timing bars
- **iOS Video Format:** .mov (QuickTime with H.264/ProRes 4444 + alpha transparency)
- **Android Video Format:** .webm (VP8/VP9 codec)
- **Video Location:**
  - iOS: `/assets/swingBars/ios/{soundType}/{SoundType}_{BPM}BPM.mov`
  - Android: `/assets/swingBars/android/{soundType}/{SoundType}_{BPM}BPM.webm`
- **Video Player:** expo-video with manual looping (2-second gap between cycles)
- **Looping Behavior:** Video plays once, pauses 2 seconds, then restarts from frame 0
- **BPM Range:** Currently locked at 70 BPM for testing (71-80 to be added)
- **Platform Detection:** Automatically selects correct video format based on `Platform.OS`
- **Video Container:** 40px height, white border, transparent background, 12px border radius
- **Dynamic Loading:** Videos load based on platform, sound type, and BPM

### Firebase Setup
- **Authentication:** Device-based (automatic)
- **Database:** Firestore
- **Offline Support:** Enabled with caching
- **User Data:** Stored by device ID

### Development Environment
- **Platform:** GitHub Codespaces / Windows
- **Testing:** Custom Dev Client via EAS Build (Expo Go CANNOT display custom icons/splash)
- **Port:** 8081
- **Framework:** React Native 0.81.4 with Expo SDK 54
- **React Version:** 19.1.0
- **Node Version:** Compatible with React 19.x
- **Build System:** EAS Build with expo-dev-client
- **Config:** app.config.js (JavaScript config, not JSON)
- **Asset Preloading:** expo-asset for loading screen optimization

---

## 🎯 Project Overview
A React Native mobile app that helps golfers perfect their putting rhythm using:
- Video-based timing bars with synchronized audio (70-80 BPM)
- Three sound types: Tone, Beat, Wind
- Interactive golf ball for play/pause control
- BPM adjustment with visual feedback
- Simple timing accuracy feedback (future feature)
- One-time unlock via in-app purchase (iOS & Android - future feature)

## 🛠 Tech Stack
| Layer       | Tool / Framework                   | Purpose                                 |
|------------|-------------------------------------|------------------------------------------|
| UI          | React Native with Expo SDK 53      | Cross-platform framework                 |
| Video       | expo-video                         | MP4 video playback with looping         |
| Graphics    | react-native-svg                   | Golf ball and icon rendering            |
| Icons       | Custom PNG assets                  | UI control icons (assets/icons/)        |
| Storage     | AsyncStorage                       | Local data caching                      |
| Backend     | Firebase Firestore                 | User data storage (device-based auth)   |
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
- **expo-video** - MP4 video playback with looping
- **expo-screen-orientation** - Landscape lock
- **firebase** - Backend and data storage
- **@react-native-async-storage/async-storage** - Local data caching
- **react-native-svg** - Vector graphics for golf ball
- **react-native-safe-area-context** - Safe area handling

### To Be Added:
- **react-native-iap** - In-app purchases (needs installation)
- **@cjblack/expo-audio-stream** - For microphone hit detection (future feature)

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
- **Main UI:** `/screens/HomeScreen.js` - Main app interface with video player
- **Navigator:** `/MinimalNavigator.js` - Simple navigation wrapper
- **Firebase Config:** `/services/firebase.js` - Backend configuration
- **Auth:** `/services/auth.js` - Device-based authentication
- **App Entry:** `/App.js` - Application entry point
- **Assets:**
  - `/assets/swingBars/` - Video files organized by sound type
  - `/assets/icons/` - Custom PNG icons
  - `/assets/ball/` - Golf ball images (PNG/SVG)

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

### What's Working Now (v2.0):
- ✅ App launches in landscape mode with grass background
- ✅ Video timing bars display at top of screen
- ✅ Interactive golf ball with click to start/stop text
- ✅ BPM control (70-80) with +/- buttons using custom icons
- ✅ Sound type selection (Tone/Beat/Wind) with custom icons
- ✅ Dynamic video loading based on BPM + sound type
- ✅ Controls lock during playback (dimmed at 50% opacity)
- ✅ Video loops continuously when playing
- ✅ Firebase stores user data (when online)
- ✅ Works offline with cached data
- ✅ No login required (device-based auth)
- ✅ Responsive layout with safe areas

### What's Not Yet Implemented:
- ❌ Complete video library (only 70 BPM available for each type)
- ❌ Microphone hit detection
- ❌ Timing accuracy feedback and scoring
- ❌ In-app purchase unlock
- ❌ Settings screen
- ❌ Practice history/stats tracking

## 📝 Notes & Best Practices
- **Video Files:** Use naming convention `{SoundType}_{BPM}BPM.mp4` (e.g., Tones_75BPM.mp4)
- **Git Workflow:** Commit and push changes after testing, include descriptive notes
- **Testing:** Test on actual devices via custom dev client (Expo Go has limitations)
- **Video Loading:** React Native requires static `require()` paths - update videoMap in HomeScreen.js when adding new videos
- **BPM Range:** Currently fixed at 70-80 BPM (can be expanded later)
- **Performance:** Videos should be optimized for mobile playback (H.264 codec recommended)
- **Landscape Mode:** All layouts optimized for landscape orientation for golf stance
- **Safe Areas:** UI respects device safe areas (notches, home indicators)