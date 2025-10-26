# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

PuttIQ is a React Native golf putting rhythm trainer that uses video-based timing bars synchronized with audio to help golfers perfect their putting tempo. The app includes a "Listen Mode" that detects putter strikes using microphone input and provides timing accuracy feedback.

**Key Technologies:**
- React Native 0.81.4 with Expo SDK 54
- expo-video for platform-specific video playback (.mov for iOS, .webm for Android)
- Firebase Firestore for user data storage
- Device-based authentication (no login required)
- @cjblack/expo-audio-stream for microphone hit detection

## Development Commands

```bash
# Install dependencies
npm install --legacy-peer-deps

# Start development server with tunnel (for testing on physical devices)
npx expo start --tunnel

# Clear cache and restart
npx expo start --clear

# Build for iOS (requires EAS CLI and Apple Developer account)
eas build --platform ios --profile development

# Build for Android
eas build --platform android --profile development

# Check build status
eas build:list

# Apply patches after install
npx patch-package
```

**Important:** The app requires a custom dev client built via EAS Build. Expo Go cannot be used because it doesn't support custom native modules and won't display custom icons/splash screens.

## Architecture

### Core Application Flow

1. **App.js** - Entry point that handles:
   - Landscape orientation lock
   - Asset preloading (video files, images, icons)
   - Device-based user authentication
   - Microphone permission requests
   - 2.5-second minimum loading screen with PuttIQ logo
   - Passes user data to HomeScreen when ready

2. **HomeScreen.js** - Main and only screen that manages:
   - Video player with platform-specific video selection
   - Golf ball START/STOP control
   - BPM adjustment (70-80 BPM range, synced across all modes)
   - Sound type switching (Tone, Beat, Wind)
   - Listen Mode toggle (microphone-based hit detection)
   - Info modal with usage instructions
   - All state management for playback and detection

### BPM Management System

**Critical Design Decision:** BPM is globally synced across all modes (Tone, Beat, Wind, Detect).

- User sets BPM once, and it applies to ALL sound types
- Implementation in `services/auth.js`:
  - `saveBpmPreference()` saves the same BPM value to all four modes simultaneously
  - `loadBpmPreferences()` loads user's saved preferences from Firebase or cache
- Storage structure in Firestore:
  ```javascript
  settings: {
    bpmPreferences: {
      tone: 76,  // All four values are always identical
      beat: 76,
      wind: 76,
      detect: 76
    }
  }
  ```
- When user changes BPM in HomeScreen, it updates all modes at once
- Migration logic handles converting old `defaultBPM` field to new structure

### Video System Architecture

**Platform-Specific Video Files:**
- iOS uses `.mov` files (H.264/ProRes 4444 with alpha transparency)
- Android uses `.webm` files (VP8/VP9 codec)
- Videos include embedded audio synchronized with visual timing bar
- Location: `/assets/swingBars/{platform}/{soundType}/{SoundType}_{BPM}BPM.{ext}`

**Video Playback Flow:**
1. HomeScreen maintains `videoMap` with all video file paths (requires static `require()`)
2. `getVideoSource()` selects correct video based on platform, sound type, BPM, and listen mode
3. expo-video player with manual looping (2-second gap between cycles)
4. Video plays → reaches end → 2-second pause → restarts from frame 0
5. Hit feedback is cleared at the start of each new loop

**Listen Mode Videos:**
- Special "detect" videos with silent audio track
- Same visual timing bar but no sound (allows microphone detection without interference)
- Files: `Tones_Detect_{BPM}BPM.mov` (70-80 BPM range)

### Authentication & Data Storage

**Device-Based Authentication (NO Google Sign-In):**
- Uses device IDs: iOS vendor ID (`Application.getIosIdForVendorAsync()`) or Android ID
- Automatic user creation on first launch
- Fallback IDs for emulators/web testing
- Implementation in `services/auth.js`:
  - `getDeviceId()` - Retrieves device ID with multiple fallbacks
  - `authenticateUser()` - Gets or creates user profile
  - All data stored in Firestore under device ID

**Offline Support:**
- AsyncStorage caches user data
- App works fully offline using cached data
- Firebase syncs when online
- User settings and BPM preferences persist locally

### Microphone Hit Detection System

**Architecture:**
- `hooks/useVideoSyncDetector.js` - React hook that manages detector lifecycle
- `services/dsp/VideoSyncDetectorV2.js` - Core detection engine
- Uses @cjblack/expo-audio-stream for microphone input
- Synchronized with video playback position to determine listening windows

**Detection Flow:**
1. Video plays 4 beats (timing bar moves left-to-right)
2. Detector listens after Beat 3 (configurable delay: `listenDelayMs`)
3. Microphone captures audio, applies software gain (`micGain`)
4. DSP analyzes energy spikes relative to baseline
5. Hit registered if energy exceeds threshold for consecutive frames
6. Timing accuracy calculated relative to Beat 4 (target at 100% position)
7. Visual feedback displayed as colored vertical bar on video

**Key Detection Parameters (tunable in HomeScreen):**
- `listenDelayMs` (380ms) - Delay after Beat 3 before listening starts
- `micGain` (3.0x) - Software amplification of microphone signal
- `energyThreshold` (1.2x) - Multiplier above baseline required to trigger
- `spikeHoldFrames` (2) - Consecutive frames needed to confirm hit
- `singleFrameBypassRatio` (2.2x) - Allows single-frame hits if very loud
- `audioLatencyMs` (180ms) - Compensation for system audio latency
- `listeningEntryGuardMs` (100ms) - Guard period at start of listening window

**Color-Coded Feedback (based on millisecond error from Beat 4):**
- ≤50ms error = Green (PERFECT!)
- 51-100ms = Light Green (Great)
- 101-150ms = Yellow (Good)
- 151-200ms = Orange (OK)
- 200ms+ = Red (Too Early/Late)

### File Structure

```
/PuttIQ_Preview
├── App.js                          # Entry point, loading screen, auth
├── app.config.js                   # Expo configuration (landscape, icons, permissions)
├── eas.json                        # EAS Build profiles
├── metro.config.js                 # Metro bundler config (adds .md asset support)
├── package.json                    # Dependencies
│
├── /screens
│   └── HomeScreen.js               # Main UI (only screen in app)
│
├── /hooks
│   └── useVideoSyncDetector.js     # Hook for microphone hit detection
│
├── /services
│   ├── auth.js                     # Device auth, BPM persistence, user data
│   ├── firebase.js                 # Firebase config and initialization
│   └── /dsp
│       └── VideoSyncDetectorV2.js  # Core hit detection engine
│
├── /assets
│   ├── /swingBars/ios              # iOS video files (.mov, 70-80 BPM)
│   │   ├── /tones                  # Tone sound videos
│   │   ├── /beats                  # Beat sound videos
│   │   ├── /wind                   # Wind sound videos
│   │   └── /detect                 # Silent videos for Listen Mode
│   ├── /swingBars/android          # Android video files (.webm)
│   ├── /icons                      # PNG icons (plus, minus, musical-note, etc.)
│   ├── /ball                       # Golf ball images
│   ├── grass-background.jpeg       # Full-screen background
│   └── Logo_NoBackground.jpg       # App logo for splash screen
│
├── /src
│   ├── /audio                      # Audio engine experiments (TypeScript)
│   ├── /content                    # Info document content
│   └── /types                      # TypeScript definitions
│
└── /patches                        # patch-package modifications
    └── @cjblack+expo-audio-stream+0.2.26.patch
```

## Key Implementation Details

### Adding New Videos

When adding new video files for different BPMs or sound types:

1. Add video file to correct directory:
   - iOS: `/assets/swingBars/ios/{soundType}/{SoundType}_{BPM}BPM.mov`
   - Android: `/assets/swingBars/android/{soundType}/{SoundType}_{BPM}BPM.webm`

2. Update `videoMapIOS` and `videoMapAndroid` in `HomeScreen.js`:
   ```javascript
   const videoMapIOS = {
     'tone-75': require('../assets/swingBars/ios/tones/Tones_75BPM.mov'),
     // Add new entries here
   };
   ```

3. React Native requires static `require()` paths - cannot use dynamic string interpolation

### BPM Changes

If modifying BPM range or sync behavior:

1. Update `saveBpmPreference()` in `services/auth.js` - this controls sync logic
2. Update BPM adjustment buttons in `HomeScreen.js`
3. Update Firebase migration logic in `authenticateUser()` if changing data structure
4. Ensure all four modes (tone, beat, wind, detect) remain synchronized

### Listen Mode Detection

When tuning detection parameters:

1. Parameters are passed from HomeScreen to `useVideoSyncDetector` hook
2. Hook forwards them to `VideoSyncDetectorV2` class
3. Key parameters to tune for better accuracy:
   - Increase `micGain` if hits are not being detected (too quiet)
   - Increase `energyThreshold` if getting false positives (too sensitive)
   - Adjust `listenDelayMs` if listening window timing is off
   - Increase `spikeHoldFrames` to require more confirmation (reduce false positives)

4. Color feedback logic is in `getHitColor()` function in HomeScreen.js

### Firebase Structure

User document in Firestore (`users/{deviceId}`):
```javascript
{
  uid: "device_id_string",
  deviceId: "device_id_string",
  deviceInfo: { brand, modelName, osName, osVersion, deviceType },
  createdAt: "ISO timestamp",
  lastLoginAt: "ISO timestamp",
  isPremium: false,
  hasCompletedOnboarding: false,
  settings: {
    bpmPreferences: { tone: 76, beat: 76, wind: 76, detect: 76 },
    soundEnabled: true,
    hapticEnabled: false
  },
  stats: {
    totalSessions: 0,
    perfectHits: 0,
    totalHits: 0,
    bestStreak: 0,
    practiceTime: 0
  },
  purchases: {}
}
```

## Common Development Tasks

### Testing on Physical Device

1. Build custom dev client: `eas build --platform ios --profile development`
2. Install build on device
3. Start dev server: `npx expo start --tunnel`
4. Scan QR code with camera (iOS) or enter URL manually

### Debugging Video Issues

- Check platform-specific video map in HomeScreen.js
- Verify video file exists at expected path
- Check Metro bundler console for asset loading errors
- Video loading state visible in UI (golf ball shows "LOADING...")

### Debugging Microphone Detection

- Enable `debugMode: true` in useVideoSyncDetector options
- Check console logs for detection events
- `onAudioLevel` callback provides real-time audio data
- Detector stats available via `detector.getStats()`

### Updating App Icon or Splash

1. Replace files in `/assets/icons/` and root directory
2. Update `app.config.js` paths if needed
3. Rebuild app via EAS Build (changes require native rebuild)

## Known Constraints

- **React Native Asset System:** Video paths must use static `require()` - cannot build paths dynamically
- **Platform Differences:** iOS and Android require separate video formats (.mov vs .webm)
- **Expo Go Limitations:** Custom dev client required - Expo Go won't work for this app
- **Microphone Permissions:** iOS requires `NSMicrophoneUsageDescription` in app.config.js
- **Landscape Only:** App is locked to landscape orientation for golf stance positioning
- **BPM Range:** 70-80 BPM only (hardcoded in UI and validation logic)
- **Manual Video Looping:** 2-second gap is a client requirement, handled via event listeners

## Current Status

**Working:**
- ✅ Video playback with platform-specific files (70-80 BPM for all sound types)
- ✅ Golf ball START/STOP control
- ✅ BPM adjustment synced across all modes
- ✅ Sound type switching (Tone, Beat, Wind)
- ✅ Listen Mode with microphone hit detection
- ✅ Color-coded timing accuracy feedback
- ✅ Device-based authentication with offline support
- ✅ Firebase data persistence
- ✅ Custom app icon and splash screen
- ✅ Info modal with usage instructions

**Not Implemented:**
- ❌ In-app purchase (react-native-iap not configured)
- ❌ Settings screen (backend ready, no UI)
- ❌ Practice statistics tracking (data structure ready, no UI)
- ❌ Session history

## EAS Configuration

**Project Details:**
- Account: @chrisscanneo
- Project ID: dcfe898b-0b08-41b9-9fc6-0f035884bd61
- Dashboard: https://expo.dev/accounts/chrisscanneo/projects/PuttIQ2

**Build Profiles (eas.json):**
- `development` - Dev client for testing (internal distribution)
- `preview` - Preview builds (internal distribution)
- `production` - Production App Store/Play Store builds

**Important:** All builds require `--legacy-peer-deps` flag due to React 19.x compatibility
