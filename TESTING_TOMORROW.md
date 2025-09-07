 # PuttIQ Testing Guide - Ready for iPhone Testing

## 🎯 What's Ready to Test
- ✅ iOS Dev Client built and installed on your iPhone
- ✅ Enhanced audio system with simultaneous speaker + microphone
- ✅ Hit detection algorithm implemented
- ✅ Timing accuracy calculation
- ✅ Visual feedback UI

## 📱 Quick Start Testing (Tomorrow)

### Step 1: Start Dev Server
```bash
# In Codespaces terminal
npx expo start --dev-client --tunnel
```

### Step 2: Connect iPhone
1. Open **PuttIQ** app on your iPhone
2. It should auto-connect to dev server
3. If not, scan QR code or enter URL

### Step 3: Test Checklist

#### Basic Features:
- [ ] Metronome plays through speaker (not earpiece!)
- [ ] Can adjust BPM while playing
- [ ] Visual timing bar syncs with audio
- [ ] Start/Stop works reliably

#### Hit Detection:
- [ ] Enable "Hit Detection" toggle
- [ ] Grant microphone permission
- [ ] Metronome STILL plays through speaker
- [ ] Make putting stroke - does it detect?
- [ ] Check accuracy percentage
- [ ] Try different distances from phone

## 🔧 If Hit Detection Doesn't Work

### Option 1: Adjust Sensitivity
Edit `/services/audioEnhanced.js` line 19:
```javascript
this.hitThreshold = -20; // More sensitive (was -15)
// or
this.hitThreshold = -10; // Less sensitive
```

### Option 2: Check Console
```bash
# Watch for "Hit detected" messages
npx expo start --dev-client
```

### Option 3: Test in Quiet Room
Background noise can affect detection

## 📊 Data to Collect
1. What threshold works best?
2. Detection range from microphone?
3. False positive rate?
4. Battery drain over 10 minutes?
5. Any audio glitches?

## 🐛 Known Issues to Watch For
- First launch may need trust certificate (Settings > General > VPN & Device Management)
- If no sound, check iPhone isn't in silent mode
- If app crashes, note what you were doing

## 💡 Quick Fixes

### No Connection to Dev Server?
```bash
# Use tunnel mode
npx expo start --dev-client --tunnel
```

### Need to Rebuild?
```bash
eas build --platform ios --profile development --clear-cache
```

### View All Logs?
```bash
# In Codespaces
npx expo start --dev-client
# Logs appear in terminal
```

## 📝 Notes Section
Use this space to record observations:

**Working Well:**
- 

**Issues Found:**
- 

**Threshold Testing:**
- -15 dB: 
- -20 dB: 
- -10 dB: 

**Feature Ideas:**
- 

## Next Session Plans
Based on testing results, we'll:
1. Fine-tune detection parameters
2. Add visual hit confirmation
3. Implement settings screen
4. Begin in-app purchase integration

---
Good luck with testing! The audio implementation is complete and ready for real-world validation.