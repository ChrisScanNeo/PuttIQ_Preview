# Building PuttIQ with EAS for Enhanced Audio

## ⚠️ IMPORTANT: Lessons Learned (Dec 3, 2024)

### Build Configuration Issues Fixed:
1. **Use app.config.js ONLY** - Remove app.json to avoid conflicts
2. **Match slug with project ID** - Slug must be "PuttIQ2" to match EAS project
3. **Fix package versions** - Run `npx expo install --fix` for SDK compatibility
4. **Firebase pods need static frameworks** - Add useFrameworks: "static" in expo-build-properties
5. **Register iOS device first** - Use `eas device:create` before building for physical device

### Required Files:
- ✅ `assets/splash.png` (NOT splash-icon.png)
- ✅ Bundle identifier: com.puttiq.app
- ✅ Custom audio plugin in `/plugins/withIOSAudioSession.js`

## Overview
This app now uses a custom Expo Dev Client to enable simultaneous speaker playback and microphone recording on iOS and Android. The enhanced audio features will NOT work in Expo Go - you must build a custom dev client.

## Prerequisites
1. EAS CLI installed: `npm install -g eas-cli`
2. Expo account (free): https://expo.dev/
3. Apple Developer account (for iOS builds): $99/year
4. Google Play Console account (for Android production): $25 one-time

## Build Steps

### 1. Login to EAS
```bash
eas login
# Enter your Expo account credentials
```

### 2. Build Development Client

#### For iOS Simulator (Mac only)
```bash
eas build --platform ios --profile development
```
- Wait for build to complete (10-20 minutes)
- Download the .app file
- Drag to iOS Simulator to install

#### For iOS Device
```bash
eas build --platform ios --profile development
```
- Requires Apple Developer account
- Will create an ad-hoc provisioning profile
- Install via TestFlight or direct install

#### For Android
```bash
eas build --platform android --profile development
```
- Wait for build to complete (10-20 minutes)
- Download the .apk file
- Install on device/emulator: `adb install <filename>.apk`

### 3. Run the Development Server
```bash
# After installing the dev client on your device/simulator
npx expo start --dev-client

# Or for tunnel (if on different network)
npx expo start --dev-client --tunnel
```

### 4. Connect to Dev Client
- Open the installed PuttIQ app on your device
- It will show a QR code scanner or URL input
- Scan the QR code from terminal or enter the URL

## What's Different in Dev Client vs Expo Go

### Dev Client (Custom Build) ✅
- **Speaker + Mic**: Simultaneous playback and recording works
- **Audio Session**: Properly configured for iOS/Android
- **Hit Detection**: Microphone monitoring is functional
- **Echo Cancellation**: Optional AEC available
- **Production Ready**: Same code runs in production

### Expo Go ❌
- Falls back to regular HomeScreenV2
- No microphone access while playing audio
- Hit detection disabled
- Good for basic development only

## Features by Platform

### iOS-Specific
- AVAudioSessionCategoryPlayAndRecord enabled
- DefaultToSpeaker forces loudspeaker output
- Bluetooth headphone support
- Background audio capability

### Android-Specific
- AudioManager configured for simultaneous I/O
- Speaker forced on during recording
- Low-latency audio path

## Troubleshooting

### Build Fails
```bash
# Clear cache and rebuild
eas build --clear-cache --platform ios --profile development
```

### Audio Not Working
1. Check device permissions (Settings > PuttIQ > Microphone)
2. Ensure volume is up
3. Try restarting the app
4. Check console logs: `npx expo start --dev-client`

### Hit Detection Not Responding
1. Verify microphone permission granted
2. Check threshold in audioEnhanced.js (default: -15 dB)
3. Test in quiet environment first
4. Adjust sensitivity if needed

### Can't Connect to Dev Server
```bash
# Use tunnel for remote development
npx expo start --dev-client --tunnel

# Or use LAN with correct IP
npx expo start --dev-client --lan
```

## Production Builds

### iOS Production
```bash
eas build --platform ios --profile production
```
- Requires App Store Connect setup
- Will create .ipa for App Store submission

### Android Production
```bash
eas build --platform android --profile production
```
- Creates .aab for Google Play Store
- Or .apk for direct distribution

## Testing Checklist

Before releasing, test these features:
- [ ] Metronome plays through speaker
- [ ] Microphone detects hits while metronome plays
- [ ] Hit accuracy calculation is reasonable
- [ ] No echo/feedback loops
- [ ] Works with Bluetooth headphones
- [ ] Battery usage is acceptable
- [ ] App doesn't crash on permission denial

## Configuration Files

### Key Files Modified
- `/plugins/withIOSAudioSession.js` - iOS audio session config
- `/services/audioEnhanced.js` - Enhanced audio service
- `/hooks/useEnhancedMetronome.js` - Hit detection logic
- `/screens/HomeScreenEnhanced.js` - Enhanced UI
- `app.json` - Plugin configuration
- `eas.json` - Build profiles

## Next Steps

1. Build dev client for your platform
2. Test hit detection in real environment
3. Fine-tune detection threshold
4. Consider adding visual feedback for hits
5. Implement practice statistics
6. Add in-app purchase for full unlock

## Support

For issues or questions:
- EAS Build docs: https://docs.expo.dev/build/
- Audio issues: Check AUDIO_IMPLEMENTATION_PLAN.md
- Original issue: See AUDIO_ISSUE.md