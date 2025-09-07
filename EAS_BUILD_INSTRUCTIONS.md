# EAS Build Instructions for iOS Development Build

Since Codespaces doesn't support interactive prompts, you have two options to create your iOS development build:

## Option 1: Use Expo Website (Easiest)

1. **Go to**: https://expo.dev
2. **Sign in** with your account (chrisscanneo)
3. **Click "New Project"**
4. **Name it**: PuttIQ2
5. **Copy the Project ID** that's generated
6. **Update app.config.js** with the project ID:

```javascript
extra: {
  eas: {
    projectId: "YOUR-PROJECT-ID-HERE"
  }
}
```

## Option 2: Build from Local Machine

### On your local machine (Mac, Windows, or Linux):

```bash
# 1. Clone the repository
git clone https://github.com/yourusername/PuttIQ2.git
cd PuttIQ2

# 2. Install dependencies
npm install --legacy-peer-deps

# 3. Install EAS CLI
npm install -g eas-cli

# 4. Login to Expo
eas login

# 5. Initialize the project (this will work with prompts)
eas init

# 6. Build for iOS development
eas build --platform ios --profile development
```

## Option 3: Quick Local Build Command

If you want to quickly test on your local machine without EAS:

### For iOS (Mac only):
```bash
# Install Expo CLI
npm install -g expo-cli

# Create development build
npx expo run:ios
```

### For Android (works anywhere):
```bash
# Create development build
npx expo run:android
```

## What the Development Build Includes:

✅ **Native Audio Module** - Speaker routing guaranteed
✅ **Expo Dev Client** - Hot reload with native modules
✅ **Debug Tools** - React Native debugger support
✅ **All Native Features** - Microphone, audio playback, etc.

## After Building:

### iOS Installation:
1. **Simulator**: Drag .app file to simulator
2. **Device**: 
   - Use TestFlight (requires App Store Connect)
   - Or install .ipa via Xcode

### Testing the Native Module:
1. Open the app
2. Start the metronome
3. Check the status indicator: "✓ Native Audio (Speaker Guaranteed)"
4. Test with phone to ear - should NOT hear from earpiece
5. Sound should come from main speaker

## Current Project Status:

The native module is fully implemented and ready:
- ✅ iOS: AVAudioEngine with speaker routing
- ✅ Android: AudioTrack with STREAM_MUSIC
- ✅ JavaScript: Unified API with fallback
- ✅ Integration: Hooks and UI updated

## Need Help?

If you encounter issues:
1. Make sure you're logged in: `eas whoami`
2. Check build status: `eas build:list`
3. View logs: `eas build:view`

## Alternative: Continue Development

While waiting for the build, you can continue development in Expo Go:
```bash
npx expo start --tunnel
```

The app will use the expo-av fallback, but all features still work!