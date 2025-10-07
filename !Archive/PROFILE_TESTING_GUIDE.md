# PuttIQ Profile System Testing Guide

## 🚀 Quick Start Testing

### Step 1: Launch the App
```bash
# In Codespaces terminal
npx expo start --tunnel --clear

# Scan QR code with Expo Go app on your phone
```

### Step 2: Navigate to Profiles Tab
- The app now has 3 tabs at the bottom:
  - 🏌️ **Practice** - Main detection screen
  - 🎯 **Profiles** - Sound profile management
  - ⚙️ **Settings** - App settings

### Step 3: Initial Profile Setup
1. Go to **Profiles** tab
2. You'll see default metronome profiles automatically loaded:
   - Metronome: Wood Block
   - Metronome: Electronic Beep
   - Metronome: Click/Tick
   - Metronome: Rimshot
3. These are **Ignore** profiles (sounds to filter out)

### Step 4: Record Your Putter Profile
1. Tap **🎯 Record Putter** button
2. Follow the on-screen instructions:
   - Place phone 0.5-1.5m from ball
   - Find quiet environment
   - Make practice putts for 30 seconds
   - Try for 10-15 impacts minimum
3. The app will:
   - Show a countdown timer
   - Display impact detection count
   - Show visual feedback when impacts detected
4. After recording, your putter profile is saved

### Step 5: Test Profile Filtering
1. Enable **Test Mode** toggle in Profiles tab
2. Go back to **Practice** tab
3. Press **START** to begin detection
4. The metronome will play
5. Make putting motions:
   - ✅ Your putter hits should be detected
   - ❌ Metronome ticks should be filtered out
6. Watch the debug info:
   - Shows which profile matched (if any)
   - Displays similarity scores in test mode

## 🧪 Testing Scenarios

### Test 1: Metronome Filtering
**Goal:** Verify metronome sounds are ignored

1. Go to Settings, ensure "Metronome Sound" is ON
2. Go to Profiles, ensure metronome profiles are enabled
3. Start practice session
4. Let metronome play without hitting
5. **Expected:** No detections from metronome alone

### Test 2: Putter Detection
**Goal:** Verify your putter is detected

1. Record your putter profile (if not done)
2. Enable your putter profile in Profiles tab
3. Start practice session
4. Make putter impacts
5. **Expected:** Each impact shows detection with timing

### Test 3: Profile Toggle
**Goal:** Test enabling/disabling profiles

1. Go to Profiles tab
2. Disable all metronome profiles
3. Start practice with metronome
4. **Expected:** Metronome now triggers detections
5. Re-enable metronome profiles
6. **Expected:** Metronome filtered again

### Test 4: Sensitivity Adjustment
**Goal:** Fine-tune detection sensitivity

1. Go to Settings tab
2. Adjust "Detection Sensitivity" slider
3. Lower = fewer detections, Higher = more sensitive
4. Test with different settings
5. Find optimal balance for your environment

## 📊 Debug Information

### When Test Mode is ON:
- Real-time similarity scores shown
- Profile match indicators displayed
- Detection confidence values visible
- Frame processing stats updated

### Understanding the Display:
```
Impact Detected!
├── Quality: STRONG/MEDIUM/WEAK
├── Timing: Early/Perfect/Late
├── Accuracy: XX%
├── Energy: 0.XXXX
├── Confidence: XX%
└── ZCR: 0.XXX
```

### Profile Indicators:
- 🎯 **Target** (green) - Sounds to detect
- 🔇 **Ignore** (orange) - Sounds to filter out
- ✅ **Enabled** - Profile is active
- ❌ **Disabled** - Profile is inactive

## 🔧 Troubleshooting

### Issue: Metronome Not Being Filtered
**Solutions:**
1. Check metronome profiles are enabled
2. Increase metronome profile thresholds (lower = stricter)
3. Enable Test Mode to see similarity scores
4. Try recording custom metronome profile

### Issue: Putter Not Detected
**Solutions:**
1. Record new putter profile with more impacts
2. Increase detection sensitivity in Settings
3. Lower putter profile threshold
4. Ensure quiet recording environment

### Issue: Too Many False Detections
**Solutions:**
1. Lower detection sensitivity
2. Increase profile thresholds
3. Record ignore profile for background noise
4. Enable auto-calibrate in Settings

### Issue: App Crashes/Slow
**Solutions:**
1. Clear cache in Settings
2. Disable unused profiles
3. Restart the app
4. Check Expo logs for errors

## 📱 Platform-Specific Notes

### iOS (Expo Go)
- Microphone permission required
- Works with silent mode ON
- AEC (echo cancellation) may be limited

### Android (Expo Go)
- Grant microphone permission when prompted
- Check app permissions in system settings
- Some devices may have audio latency

### Web (Browser)
- Limited audio capabilities
- Profile system works but no real detection
- Good for UI testing only

## 🎯 Success Criteria

Your profile system is working correctly when:

✅ Default metronome profiles load automatically
✅ You can record your putter profile
✅ Metronome sounds are filtered out
✅ Your putter impacts are detected
✅ Test mode shows real-time feedback
✅ Profiles sync across app restarts
✅ Settings persist between sessions

## 📈 Advanced Testing

### Creating Custom Ignore Profiles:
1. Tap "🔇 Add Ignore" (coming soon)
2. Record any background noise
3. Save as ignore profile
4. Test filtering effectiveness

### Profile Quality Metrics:
- **Consistency:** How similar recorded impacts were
- **Confidence:** Profile reliability score
- **Sample Count:** Number of impacts used

### Performance Monitoring:
- Check "Session Stats" during practice
- Monitor frame processing rate
- Watch baseline adaptation
- Track detection accuracy

## 💡 Tips for Best Results

1. **Recording Tips:**
   - Use consistent putting force
   - Maintain natural rhythm
   - Avoid background noise
   - Record in practice environment

2. **Profile Management:**
   - Keep only needed profiles enabled
   - Update profiles if environment changes
   - Use test mode for troubleshooting
   - Check similarity scores for tuning

3. **Optimization:**
   - Start with default settings
   - Adjust one parameter at a time
   - Test after each change
   - Document what works best

## 🐛 Reporting Issues

If you encounter problems:
1. Note the exact steps to reproduce
2. Check browser/app console for errors
3. Take screenshots of debug info
4. Include device type and OS version
5. Report in GitHub issues

## 🎉 Testing Complete!

Once all tests pass, your profile system is ready for practice sessions. The metronome will be filtered out while your putter impacts are accurately detected!

---

**Need Help?** Check Settings > Help & Support for quick guides and troubleshooting tips.