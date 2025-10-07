# PuttIQ Tempo Trainer - Technical Stack Documentation

## 📱 Platform & Framework

### Core Framework
- **React Native**: 0.81.4
- **Expo SDK**: 54.0.5
- **React**: 19.1.0
- **Expo Dev Client**: 6.0.12 (custom builds required)

### Why These Versions?
- React Native 0.81.4 is the latest stable version compatible with Expo SDK 54
- React 19.x brings improved performance and modern features
- Custom dev client required for platform-specific features (audio, video)

---

## 🎥 Video & Media

### Video Playback
- **Library**: `expo-video` v3.0.11
- **Player**: `useVideoPlayer` hook with manual loop control
- **Formats**:
  - **iOS**: `.mov` (QuickTime format, H.264 or ProRes 4444 with alpha channel)
  - **Android**: `.webm` (VP8/VP9 codec)

### Video Features
- Platform detection via `Platform.OS`
- Manual looping with 2-second gap between cycles
- Alpha transparency support (iOS only)
- Embedded audio synchronization
- Frame-perfect restart from position 0

### Audio
- **iOS Audio Session**: Custom plugin (`withIOSAudioSession`)
- **Audio Category**: `AVAudioSessionCategoryPlayAndRecord`
- **Output**: Speaker (not earpiece)
- **Background Audio**: Supported via `UIBackgroundModes: ["audio"]`

---

## 🎨 UI & Graphics

### UI Components
- **React Native Core**: View, Text, TouchableOpacity, Image, ImageBackground
- **Safe Areas**: `react-native-safe-area-context` v5.6.1
- **Screen Orientation**: `expo-screen-orientation` v9.0.0 (locked to landscape)

### Graphics
- **Vector Graphics**: `react-native-svg` v15.12.1
- **Icons**: Custom PNG assets (19.2×19.2px for controls)
- **Images**: JPG/PNG for backgrounds and logo

### Layout
- **Orientation**: Landscape only (forced on app launch)
- **Design**: Responsive sizing based on screen dimensions
- **Golf Ball**: Dynamically sized to 80% of available vertical space
- **Control Bars**: 20% smaller than original design (38.4px height)

---

## 🔥 Backend & Data

### Firebase
- **SDK**: `firebase` v12.2.1
- **Services**:
  - Firestore (user data, settings)
  - Anonymous authentication via device ID
  - Offline persistence enabled

### Local Storage
- **Library**: `@react-native-async-storage/async-storage` v2.2.0
- **Purpose**: User settings cache, offline fallback
- **Data Stored**: BPM preferences, sound type, device ID

### Authentication
- **Method**: Device-based (no login required)
- **iOS**: Vendor ID via `expo-application`
- **Android**: Android ID via `expo-application`
- **Libraries**: `expo-application` v7.0.0, `expo-device` v8.0.7

---

## 🛠 Build & Development

### Build System
- **EAS Build**: Expo Application Services
- **Dev Client**: Custom native build (NOT Expo Go)
- **Build Properties**: `expo-build-properties` v1.0.8
- **iOS Min Version**: 16.0
- **iOS Frameworks**: Static frameworks

### Configuration
- **Config File**: `app.config.js` (JavaScript, not JSON)
- **Bundle ID (iOS)**: `com.puttiq.app`
- **Package Name (Android)**: `com.puttiq.app`

### Platform-Specific
**iOS:**
- Custom audio session plugin
- Microphone permissions: `NSMicrophoneUsageDescription`
- Background audio support
- `.mov` video optimization

**Android:**
- Edge-to-edge display
- Audio recording permissions: `RECORD_AUDIO`
- `.webm` video optimization
- Adaptive icon with black background

---

## 📦 Key Dependencies

### Core
```json
{
  "expo": "~54.0.5",
  "react": "19.1.0",
  "react-native": "0.81.4"
}
```

### Media
```json
{
  "expo-video": "^3.0.11",
  "expo-av": "^16.0.7",
  "expo-audio": "~1.0.11"
}
```

### Navigation & UI
```json
{
  "react-native-safe-area-context": "^5.6.1",
  "react-native-screens": "^4.16.0",
  "expo-screen-orientation": "^9.0.0"
}
```

### Backend
```json
{
  "firebase": "^12.2.1",
  "@react-native-async-storage/async-storage": "2.2.0"
}
```

### Utilities
```json
{
  "expo-asset": "^10.x.x",
  "expo-application": "^7.0.0",
  "expo-device": "~8.0.7",
  "expo-constants": "~18.0.0"
}
```

---

## 🎯 Platform Detection System

### Video Loading
```javascript
// Platform-specific video maps
const videoMapIOS = {
  'tone-70': require('../assets/swingBars/ios/tones/Tones_70BPM.mov'),
  // ... more videos
};

const videoMapAndroid = {
  'tone-70': require('../assets/swingBars/android/tones/Tones_70BPM.webm'),
  // ... more videos
};

// Select based on platform
const videoMap = Platform.OS === 'ios' ? videoMapIOS : videoMapAndroid;
```

### Why Platform-Specific Videos?
1. **App Size**: Each platform only bundles its optimized format
2. **Performance**: Native codec support for each platform
3. **Quality**: Best compression for each platform
4. **Compatibility**: iOS doesn't support .webm, Android prefers it

---

## 🚀 Asset Pipeline

### Loading Screen
- **Duration**: Minimum 2.5 seconds
- **Asset Preloading**: All critical assets load before app starts
- **Background**: Black (#000000)
- **Logo**: `assets/Logo_NoBackground.jpg`

### App Icon & Splash
- **App Icon**: `assets/Icon_nobackground.jpg` (green flag logo)
- **Splash Screen**: `assets/Logo_NoBackground.jpg` on black background
- **Note**: Only visible in custom builds (NOT Expo Go)

### Preloaded Assets
- Grass background (1.1MB JPEG)
- Golf ball PNG
- All 3 video files (70 BPM)
- All control icons (5 PNGs)
- Logo

---

## 🔧 Future Integrations (Not Yet Implemented)

### Planned
- **react-native-iap**: In-app purchases
- **@cjblack/expo-audio-stream**: Microphone hit detection
- **Expo Haptics**: Tactile feedback (already installed, not used)

### Architecture Ready For
- Settings screen UI
- Practice statistics tracking
- Hit accuracy feedback system
- Multi-BPM support (71-80)

---

## 📊 Performance Characteristics

### App Size
- **iOS**: ~30-40MB (with .mov videos)
- **Android**: ~20-30MB (with .webm videos, smaller codec)

### Memory Usage
- **Video Player**: ~50-100MB during playback
- **Assets**: Pre-loaded in memory for instant access

### Network
- **Firebase**: Async, non-blocking
- **Offline Mode**: Full functionality without internet
- **First Launch**: Requires internet for Firebase setup

---

## 🎮 Control Flow

### Video Playback Cycle
1. User clicks golf ball → `player.play()`
2. Video plays to end → `playingChange` event fires
3. Wait 2 seconds → `setTimeout(2000)`
4. Restart from frame 0 → `player.replay()`
5. Repeat

### Control Interaction
- **When stopped**: Controls change settings (sound type only, BPM locked)
- **When playing**: Any control click → stops playback immediately
- **Golf ball**: Always toggles play/stop

---

## 📝 Code Architecture

### Main Files
- **App.js**: Entry point, loading screen, asset preloading
- **MinimalNavigator.js**: Simple navigation wrapper
- **screens/HomeScreen.js**: Main UI and video playback logic
- **services/auth.js**: Device-based authentication
- **services/firebase.js**: Firebase configuration
- **app.config.js**: Expo configuration

### State Management
- Local React state (useState)
- No Redux/MobX (simple app, doesn't need it)
- Firebase for persistent data
- AsyncStorage for offline cache

---

## 🔍 Development Workflow

### Testing
```bash
# Start dev server
npx expo start --tunnel

# Build custom dev client (iOS)
eas build --profile development --platform ios

# Build custom dev client (Android)
eas build --profile development --platform android
```

### Asset Updates
1. Add video to `/assets/swingBars/ios/` or `/android/`
2. Update video map in `HomeScreen.js`
3. Restart Metro bundler
4. Test on device

### Debugging
- Console logs with emojis (🎬, 🔄, ⚽, etc.)
- React Native Debugger
- Expo Dev Tools
