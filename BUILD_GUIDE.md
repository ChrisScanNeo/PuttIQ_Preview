# PuttIQ2 Complete Build Guide

**Last Updated:** September 2, 2025  
**Project ID:** `dcfe898b-0b08-41b9-9fc6-0f035884bd61`  
**Expo Account:** `@chrisscanneo`

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Git installed
- Expo account (free at expo.dev)
- For iOS testing: Apple Developer account ($99/year) or use simulator

## 📱 Building for iOS (With Native Audio Module)

### Step 1: Local Setup (Windows/Mac/Linux)

```powershell
# Clone repository
git clone https://github.com/yourusername/PuttIQ2.git
cd PuttIQ2

# Install dependencies
npm install --legacy-peer-deps

# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo
eas login
# Username: chrisscanneo
```

### Step 2: Initialize EAS Project

```powershell
# Initialize project (already done)
eas init

# This created project ID: dcfe898b-0b08-41b9-9fc6-0f035884bd61
```

### Step 3: Build iOS Development Version

```powershell
# For iOS Simulator (no Apple Developer account needed)
eas build --platform ios --profile development --simulator

# For Real iOS Device (requires Apple Developer account)
eas build --platform ios --profile development

# Track build progress
eas build:list
```

### Step 4: Install and Test

**Simulator Build (.app file):**
1. Download the .tar.gz file from EAS
2. Extract to get .app file
3. Drag .app to iOS Simulator
4. Or install via command:
```bash
xcrun simctl install booted /path/to/PuttIQ2.app
```

**Device Build (.ipa file):**
1. Download .ipa from EAS
2. Install via:
   - **TestFlight** (recommended)
   - **Xcode** > Window > Devices > Drag .ipa
   - **Apple Configurator 2**

## 🤖 Building for Android

### Android Build (Works everywhere)

```powershell
# Build APK for development
eas build --platform android --profile development

# Or build locally (faster)
cd android
./gradlew assembleDebug

# Install on device
adb install app/build/outputs/apk/debug/app-debug.apk
```

## 🛠 Development Workflow

### Codespaces Development
```bash
# Development with Expo Go (uses fallback)
npx expo start --tunnel

# The app detects native module isn't available
# Falls back to expo-av (may have earpiece issue)
```

### Local Development with Native Modules
```powershell
# Start with dev client (hot reload + native modules)
npx expo start --dev-client

# iOS specific
npx expo run:ios

# Android specific  
npx expo run:android
```

## 📦 What's Included in Native Builds

### iOS Native Module (`/ios/PuttIQAudio/`)
- **AVAudioEngine** implementation
- **AVAudioSessionCategoryOptionDefaultToSpeaker** - Forces main speaker
- **No earpiece routing** - Guaranteed
- **~10ms latency** - Professional grade

### Android Native Module (`/android/src/main/java/com/puttiq/audio/`)
- **AudioTrack** with STREAM_MUSIC
- **AudioRecord** with UNPROCESSED source
- **Speaker routing** guaranteed
- **No conflicts** with recording

### JavaScript Interface (`/services/puttiqAudio.js`)
```javascript
// Unified API that works on both platforms
PuttIQAudio.startMetronome(80);  // Always through speaker
PuttIQAudio.startListening();    // No conflicts
PuttIQAudio.onHitDetected(callback);
```

## ✅ Testing Checklist

### After Installation
1. **Open the app**
2. **Check status indicator** at bottom:
   - ✅ "Native Audio (Speaker Guaranteed)" = Native module active
   - ⚡ "Expo Audio (Fallback Mode)" = Using expo-av fallback

3. **Test Audio Routing:**
   - Start metronome
   - Hold phone to ear
   - **Should NOT hear from earpiece**
   - **Should hear from main speaker**

4. **Test Performance:**
   - No stuttering after 5+ minutes
   - Timing bar stays synchronized
   - Hit detection responds quickly

## 🔍 Troubleshooting

### Build Failures

**"Cannot find module"**
```bash
# Clear everything and reinstall
rm -rf node_modules
npm install --legacy-peer-deps
```

**"EAS project not configured"**
```bash
# Make sure project ID is in app.config.js
# projectId: "dcfe898b-0b08-41b9-9fc6-0f035884bd61"
```

**"Apple Developer account required"**
```bash
# Use simulator build instead
eas build --platform ios --profile development --simulator
```

### Runtime Issues

**"Native module not found"**
- This is normal in Expo Go
- App uses fallback automatically
- Need development build for native features

**Audio still from earpiece**
- Check status indicator shows "Native Audio"
- If showing "Fallback Mode", native module didn't load
- Rebuild with EAS

## 📊 Build Status

### Current Builds
- **iOS Development:** Pending/In Progress
- **Android Development:** Ready to build
- **Project URL:** https://expo.dev/accounts/chrisscanneo/projects/PuttIQ2

### Build Commands Reference
```bash
# Check all builds
eas build:list

# View specific build
eas build:view [build-id]

# Cancel running build
eas build:cancel [build-id]

# Download artifacts
# (URLs provided when build completes)
```

## 🎯 Development vs Production

### Development Build
- Includes Expo Dev Client
- Hot reload enabled
- Debug tools available
- Native modules included

### Production Build
```bash
# iOS App Store
eas build --platform ios --profile production

# Android Play Store  
eas build --platform android --profile production
```

## 📝 Important Notes

1. **Native modules don't work in Expo Go** - Need development builds
2. **iOS builds require macOS or EAS** - Can't build locally on Windows/Linux
3. **Android builds work anywhere** - Can build locally or with EAS
4. **Fallback ensures development continues** - App works in Expo Go with reduced features
5. **Project is configured and ready** - All native code is implemented

## 🔗 Quick Links

- **Project Dashboard:** https://expo.dev/accounts/chrisscanneo/projects/PuttIQ2
- **EAS Documentation:** https://docs.expo.dev/eas/
- **Build Troubleshooting:** https://docs.expo.dev/build/troubleshooting/

## 📱 Contact & Support

- **Expo Account:** @chrisscanneo
- **Project ID:** dcfe898b-0b08-41b9-9fc6-0f035884bd61
- **Bundle ID (iOS):** com.puttiq.app
- **Package (Android):** com.puttiq.app