# PuttIQ2 Native Module Testing Guide

## 🎯 Overview
Since we've implemented a native audio module, we need to test with device-specific builds rather than Expo Go.

## 📱 Testing Options

### Option 1: EAS Development Build (Recommended)
**Best for:** Quick testing without local setup

```bash
# 1. Install EAS CLI globally
npm install -g eas-cli

# 2. Login to Expo account
eas login

# 3. Configure your project
eas build:configure

# 4. Build for iOS simulator
eas build --profile development --platform ios --local

# 5. Build for Android
eas build --profile development --platform android --local

# 6. Install on device
# iOS: Drag .app to simulator or install via Xcode
# Android: adb install build-*.apk
```

### Option 2: Expo Dev Client (Best for Development)
**Best for:** Hot reload + native modules

```bash
# 1. Already installed expo-dev-client

# 2. Create development build
npx expo run:ios --device  # For iOS device
npx expo run:android       # For Android device

# 3. Start dev server
npx expo start --dev-client

# 4. Connect device and scan QR code
```

### Option 3: Local Native Builds
**Best for:** Full control over build process

#### iOS (Mac Required):
```bash
# 1. Install dependencies
cd ios
pod install

# 2. Open in Xcode
open PuttIQ2.xcworkspace

# 3. Select device/simulator
# 4. Click Run button or Cmd+R
```

#### Android:
```bash
# 1. Build debug APK
cd android
./gradlew assembleDebug

# 2. Install on device
adb install app/build/outputs/apk/debug/app-debug.apk

# OR transfer APK to device and install manually
```

## 🧪 What to Test

### 1. Audio Routing (Primary Test)
- [ ] Start metronome - sound should come from MAIN speaker
- [ ] Test with phone to ear - should NOT hear from earpiece
- [ ] Test with headphones connected - should work normally
- [ ] Test with Bluetooth speaker - should route correctly

### 2. Native Module Detection
- [ ] Check status indicator at bottom of screen
- [ ] Should show "✓ Native Audio (Speaker Guaranteed)" on device builds
- [ ] Should show "⚡ Expo Audio (Fallback Mode)" in Expo Go

### 3. Performance Tests
- [ ] Metronome should maintain steady rhythm without stuttering
- [ ] Timing bar should stay perfectly synchronized
- [ ] No drift after running for 5+ minutes
- [ ] Hit detection should respond within ~10ms

### 4. Platform-Specific Tests

#### iOS:
- [ ] Test on iPhone (various models)
- [ ] Test on iPad in landscape
- [ ] Test with Silent Mode switch ON - metronome should still play
- [ ] Test during phone call - audio should duck appropriately

#### Android:
- [ ] Test on different manufacturers (Samsung, Google, OnePlus)
- [ ] Test with Do Not Disturb mode
- [ ] Test with different Android versions (10+)
- [ ] Test audio focus handling with other apps

## 🔍 Debugging

### Check Native Module Loading:
```javascript
// In App.js or any component
import PuttIQAudio from './services/puttiqAudio';

useEffect(() => {
  console.log('Native module available:', PuttIQAudio.isNativeAvailable());
}, []);
```

### Monitor Console Logs:

#### iOS:
```bash
# View logs in Xcode console or:
npx react-native log-ios
```

#### Android:
```bash
# View logs with:
adb logcat *:S ReactNative:V ReactNativeJS:V
```

### Common Issues:

1. **"Native module not found"**
   - iOS: Run `cd ios && pod install`
   - Android: Clean and rebuild `cd android && ./gradlew clean`

2. **Audio still from earpiece**
   - Check native module is loaded (see status indicator)
   - Verify AVAudioSessionCategoryOptionDefaultToSpeaker is set (iOS)
   - Check AudioManager.STREAM_MUSIC is used (Android)

3. **Build failures**
   - Clear caches: `npx expo start --clear`
   - Reset Metro: `npx react-native start --reset-cache`
   - Clean builds: iOS (Xcode > Product > Clean), Android (`./gradlew clean`)

## 📊 Test Results Checklist

### iOS Testing
- [ ] iPhone 12+ tested
- [ ] iPad tested
- [ ] Audio routes to speaker ✅
- [ ] No earpiece audio ✅
- [ ] Metronome stays in sync ✅
- [ ] Hit detection works ✅

### Android Testing
- [ ] Pixel device tested
- [ ] Samsung device tested
- [ ] Audio routes to speaker ✅
- [ ] No earpiece audio ✅
- [ ] Metronome stays in sync ✅
- [ ] Hit detection works ✅

## 🚀 Quick Start Commands

```bash
# Development build with hot reload
npx expo run:ios    # iOS with native modules
npx expo run:android # Android with native modules

# Production-like testing
eas build --profile preview --platform ios
eas build --profile preview --platform android

# Install and test
# iOS: Install via TestFlight or Ad Hoc
# Android: adb install build.apk
```

## 📝 Notes

- Native module will NOT work in Expo Go
- Development builds required for testing native audio
- Fallback to expo-av ensures development can continue in Expo Go
- Production builds will always use native module when available