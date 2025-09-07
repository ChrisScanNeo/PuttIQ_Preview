# PuttIQ2 - Putting Rhythm Trainer

A professional-grade React Native app that helps golfers perfect their putting rhythm through visual and audio feedback.

## ✨ Features

- **Visual Metronome Bar** - Animated timing bar with synchronized movement
- **Audio Metronome** - Precise BPM control (60-100 BPM)
- **Hit Detection** - Real-time microphone analysis for putter impact timing
- **Timing Feedback** - Early/Late/Perfect hit accuracy display
- **Native Audio Module** - Guaranteed speaker output (no earpiece routing)
- **Landscape Mode** - Optimized for golf stance positioning

## 🚀 Quick Start

### Development (Expo Go)
```bash
# Install dependencies
npm install --legacy-peer-deps

# Start development server
npx expo start --tunnel

# Scan QR code with Expo Go app
```

### Production Build (With Native Modules)

#### Prerequisites
- Node.js 18+
- EAS CLI: `npm install -g eas-cli`
- Expo account (free at expo.dev)

#### Build for iOS
```bash
# Login to Expo
eas login

# Build for simulator (no Apple Developer account needed)
eas build --platform ios --profile development --simulator

# Build for device (requires Apple Developer account)
eas build --platform ios --profile development
```

#### Build for Android
```bash
# Build APK
eas build --platform android --profile development

# Or build locally
cd android && ./gradlew assembleDebug
```

## 🏗 Architecture

### Native Audio Module
- **iOS**: AVAudioEngine with speaker routing
- **Android**: AudioTrack/AudioRecord implementation
- **Fallback**: expo-av for development in Expo Go

### Tech Stack
- React Native 0.79.6
- Expo SDK 53
- Firebase (Firestore + Auth)
- React Native Reanimated 3
- Custom native modules (iOS/Android)

## 📁 Project Structure

```
PuttIQ2/
├── screens/           # App screens
│   └── HomeScreenV2.js
├── components/        # UI components
│   └── TimingBarV3.js
├── hooks/            # Custom React hooks
│   ├── useMetronomeNative.js
│   └── useSoundDetectionNative.js
├── services/         # Business logic
│   ├── puttiqAudio.js    # Unified audio service
│   ├── audioEngineV4.js  # Metronome engine
│   └── soundDetection.js # Hit detection
├── ios/PuttIQAudio/  # iOS native module
├── android/.../      # Android native module
└── modules/          # JavaScript interfaces
```

## 🧪 Testing

### Check Native Module Status
The app displays a status indicator:
- ✅ "Native Audio (Speaker Guaranteed)" - Native module active
- ⚡ "Expo Audio (Fallback Mode)" - Using expo-av

### Audio Routing Test
1. Start metronome
2. Hold phone to ear
3. Sound should come from main speaker, NOT earpiece

## 📱 EAS Project Info

- **Account:** @chrisscanneo
- **Project ID:** dcfe898b-0b08-41b9-9fc6-0f035884bd61
- **Dashboard:** https://expo.dev/accounts/chrisscanneo/projects/PuttIQ2

## 📚 Documentation

- [BUILD_GUIDE.md](./BUILD_GUIDE.md) - Detailed build instructions
- [PROJECT_STATUS.md](./PROJECT_STATUS.md) - Current development status
- [TESTING_GUIDE.md](./TESTING_GUIDE.md) - Testing procedures
- [CLAUDE.md](./CLAUDE.md) - Development roadmap

## 🔧 Development Commands

```bash
# Install dependencies
npm install --legacy-peer-deps

# Start with Expo Go (fallback mode)
npx expo start --tunnel

# Build iOS (cloud)
eas build --platform ios --profile development

# Build Android (local)
cd android && ./gradlew assembleDebug

# Check build status
eas build:list
```

## 🐛 Known Issues

- Native modules don't work in Expo Go (uses fallback)
- iOS builds require EAS or macOS
- expo-av deprecated in SDK 54 (mitigated with native module)

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push to branch
5. Open pull request

## 📄 License

MIT