# Windows Testing Guide for PuttIQ

## ✅ Current Status
- **Git:** Up to date with remote (commit: 341ca71)
- **Navigation:** Temporarily disabled for compatibility
- **App:** Ready for Windows testing with Expo Go

## 🪟 Windows Setup Steps

### 1. Pull Latest Code
```cmd
cd path\to\PuttIQ
git pull origin main
```

### 2. Install Dependencies
```cmd
:: Clean install (PowerShell)
rmdir node_modules /s /q
del package-lock.json

:: Install packages
npm install --legacy-peer-deps

:: If errors occur, try:
npm install --force
```

### 3. Start Expo
```cmd
:: Clear cache and start
npx expo start --clear

:: Or with tunnel for phone testing
npx expo start --tunnel --clear
```

## 📱 Testing on Your Device

### Using Expo Go App:
1. Install **Expo Go** from App Store/Play Store
2. Connect phone to same WiFi as computer
3. Scan QR code from terminal
4. App should open in landscape mode

### Expected Behavior (Without Navigation):
- ✅ App loads in landscape orientation
- ✅ Shows PuttIQ home screen with BPM slider
- ✅ START/STOP button for detection
- ✅ Metronome plays sound
- ✅ Microphone detection works
- ❌ No bottom tabs (temporarily disabled)
- ❌ No Profiles/Settings screens (need navigation fix)

## 🔧 Common Windows Issues & Fixes

### Issue: "Unable to resolve module"
```cmd
:: Solution 1: Clear Metro cache
npx expo start --clear

:: Solution 2: Reset everything
rmdir node_modules /s /q
rmdir .expo /s /q
npm cache clean --force
npm install --legacy-peer-deps
```

### Issue: "Network timeout"
```cmd
:: Use tunnel mode
npx expo start --tunnel
```

### Issue: "Permission denied"
- Run Command Prompt/PowerShell as Administrator
- Check Windows Defender/Firewall settings

### Issue: "Cannot find module"
```cmd
:: Install specific missing module
npm install [module-name] --legacy-peer-deps
```

## 🧪 Testing Profile System (Backend)

Even without navigation UI, the profile system is working in the background:

### What's Active:
- ✅ Default metronome templates loaded
- ✅ Firebase profile service initialized
- ✅ Spectral analysis ready
- ✅ Profile manager configured

### Test Detection:
1. Press **START** on home screen
2. Play metronome sound
3. Make putting motions
4. Check console logs for profile matching

### Debug Mode:
Look for these console messages:
```
ProfileManager initialized with X profiles
Loaded X default profiles
Strike detected: {profile match info}
```

## 📦 Package Versions to Verify

Run this to check installed packages:
```cmd
npm list @react-navigation/native firebase expo-av
```

Expected output should show:
- @react-navigation/native@7.1.17 (if navigation installed)
- firebase@12.2.1
- expo-av@15.1.7

## 🚀 Quick Test Checklist

- [ ] Git pull successful
- [ ] npm install completed
- [ ] expo start runs without errors
- [ ] App loads on device via Expo Go
- [ ] Landscape orientation works
- [ ] Metronome sound plays
- [ ] START/STOP button functions
- [ ] Microphone permission granted
- [ ] Detection shows impact feedback

## 🔄 To Re-enable Navigation Later

Once navigation packages are properly installed:

1. Edit `App.js`:
```javascript
// Change line 6-7 from:
// import AppNavigator from './navigation/AppNavigator';
import HomeScreen from './screens/HomeScreen';

// To:
import AppNavigator from './navigation/AppNavigator';
// import HomeScreen from './screens/HomeScreen';

// And change line 60-61 from:
<HomeScreen user={user} />
{/* <AppNavigator user={user} /> */}

// To:
{/* <HomeScreen user={user} /> */}
<AppNavigator user={user} />
```

2. Install navigation packages:
```cmd
npm install --legacy-peer-deps @react-navigation/native @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context
```

3. Clear and restart:
```cmd
npx expo start --clear
```

## 💡 Tips for Windows Users

1. **Use PowerShell** instead of CMD when possible
2. **Run as Administrator** if permission issues occur
3. **Disable Windows Defender** temporarily if it blocks node_modules
4. **Use --legacy-peer-deps** flag for all npm installs
5. **Clear cache frequently** with --clear flag

## 📝 Current Limitations

Without navigation, you cannot access:
- Profiles management screen
- Settings screen
- Putter recording interface

But the core detection with profile filtering IS working in the background!

## ✨ Success Indicators

Your setup is working if:
- App loads without red error screens
- Console shows "ProfileManager initialized"
- Metronome plays when START pressed
- Detection triggers on microphone input

---

**Need help?** Check the console logs (shake device in Expo Go → Show Dev Menu → Open JS Debugger)