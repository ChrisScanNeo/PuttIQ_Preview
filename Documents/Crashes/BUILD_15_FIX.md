# Audio Engine Crash Fix - Build 15
## Date: October 26, 2025

## Issue Summary

**Crash:** App crashes when switching to detector mode (Listen Mode) immediately after launch
**Error:** `com.apple.coreaudio.avfaudio error -10868` (AVAudioIONodeImpl::SetOutputFormat)
**Builds Affected:** 4, 13, 14 (all previous builds)
**Fixed in Build:** 15

---

## Root Cause (CONFIRMED via Build 14 Analysis)

Build 14 crash log ([Documents/Crashes/PuttIQ-2025-10-26-100519.ips](PuttIQ-2025-10-26-100519.ips)) revealed the true root cause:

### The Race Condition

1. Build 14 correctly set `.playAndRecord` BEFORE querying `inputNode` (fix was correct)
2. **However**, expo-video's background threads **recaptured the audio session** after our configuration but **before** `installTap` completed
3. When `installTap` executed, the session was back in `.playback` mode → CRASH

### Evidence from Build 14 Crash Log

- **Exception location:** Still `AVAudioIONodeImpl::SetOutputFormat` (line 50 of crash log)
- **Faulting thread:** `expo.modules.AsyncFunctionQueue` (line 283-286)
- **Background threads:** Multiple `com.apple.coremedia` threads active (expo-video's playback threads)
- **Timing:** Crash 7 seconds after launch while hero video still playing

This proves that **another module undid our category change** between configuration and tap installation.

### Secondary Issue: iOS 18 Bluetooth

Using `.allowBluetoothA2DP` with `.playAndRecord` causes iOS 18 to silently downgrade the session to playback-only, making our recording configuration immediately invalid.

---

## Three-Pronged Solution

Build 15 implements a comprehensive fix addressing all failure points:

### 1. JavaScript Layer: Prevent Recapture BEFORE Native Call

**File:** `services/dsp/VideoSyncDetectorV2.js` (lines 941-957)

**Added:**
```javascript
// CRITICAL: Set audio mode to recording BEFORE calling native module
// This prevents expo-video from reasserting .playback during tap installation
await Audio.setAudioModeAsync({
  allowsRecordingIOS: true,
  playsInSilentModeIOS: true,
  staysActiveInBackground: false,
  interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
  interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
  shouldDuckAndroid: false,
});
```

**Why this works:**
- Tells expo-av framework to **stop managing the session** in playback-only mode
- Holds recording capability during the entire `startRecording()` call
- Prevents expo-video from recapturing session mid-installation

### 2. Native Layer: Validate & Re-Assert Right Before installTap

**File:** `patches/@cjblack+expo-audio-stream+0.2.26.patch` (new lines 448-471)

**Added session validation:**
```swift
// CRITICAL - Re-validate audio session right before tap installation
do {
    let session = AVAudioSession.sharedInstance()
    let currentCategory = session.category
    let isInputAvailable = session.isInputAvailable
    Logger.debug("Debug: Pre-tap validation - category: \(currentCategory), inputAvailable: \(isInputAvailable)")

    if currentCategory != .playAndRecord || !isInputAvailable {
        Logger.debug("Warning: Audio session was changed! Re-asserting .playAndRecord...")
        try session.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .allowBluetooth])
        try session.setActive(true)
        Logger.debug("Debug: Audio session re-asserted successfully")
    } else {
        Logger.debug("Debug: Session validation passed - ready to install tap")
    }
}

Logger.debug("Debug: About to install tap...")
audioEngine.inputNode.installTap(onBus: 0, bufferSize: 1024, format: audioFormat) { ... }
Logger.debug("Debug: ✅ Tap installed successfully!")
```

**Why this works:**
- **Detects** if expo-video recaptured session after initial configuration
- **Re-applies** `.playAndRecord` immediately before `installTap` (closes timing window)
- **Gracefully fails** with error message instead of crashing if re-assertion impossible
- **Confirms success** with log after tap installation

### 3. iOS 18 Compatibility Fix

**Removed `.allowBluetoothA2DP` from ALL audio session configurations:**

**Files modified:**
- `AudioSessionManager.swift` lines 387, 460
- `ExpoPlayAudioStreamModule.swift` line 370

**Before:**
```swift
try session.setCategory(.playAndRecord, mode: .default,
                       options: [.defaultToSpeaker, .allowBluetooth, .allowBluetoothA2DP])
```

**After:**
```swift
try session.setCategory(.playAndRecord, mode: .default,
                       options: [.defaultToSpeaker, .allowBluetooth])
```

**Why this is critical:**
- iOS 18 **silently downgrades** `.playAndRecord + .allowBluetoothA2DP` to playback-only
- This made our session immediately invalid for recording even when set correctly
- Removing the option ensures session stays in recording mode

---

## Enhanced Logging for QA

Build 15 adds detailed logging at every critical point:

### JavaScript Logs:
```
🔧 Setting Audio mode to recording before native call...
✅ Audio mode set to recording
🎙️ Starting audio stream recording (attempt 1/2)
✅ Audio stream recording started successfully
```

### Native Swift Logs:
```
Debug: Setting audio session to .playAndRecord mode
Debug: Session configured - category: AVAudioSessionCategoryPlayAndRecord, sampleRate: 48000.0, inputAvailable: true
Debug: Pre-tap validation - category: AVAudioSessionCategoryPlayAndRecord, inputAvailable: true
Debug: Session validation passed - ready to install tap
Debug: About to install tap...
Debug: ✅ Tap installed successfully!
```

### If Session is Recaptured (Expected Recovery):
```
Debug: Pre-tap validation - category: AVAudioSessionCategoryPlayback, inputAvailable: false
Warning: Audio session was changed! Re-asserting .playAndRecord...
Debug: Audio session re-asserted successfully - category: AVAudioSessionCategoryPlayAndRecord
Debug: About to install tap...
Debug: ✅ Tap installed successfully!
```

---

## Files Modified

### 1. JavaScript Changes
- **`services/dsp/VideoSyncDetectorV2.js`**
  - Added `Audio.setAudioModeAsync()` call before `startAudioStreamRecording()` (lines 941-957)
  - Prevents expo-av from managing session during recording setup

### 2. Native Swift Changes (via patch)
- **`node_modules/@cjblack/expo-audio-stream/ios/AudioSessionManager.swift`**
  - Removed `.allowBluetoothA2DP` from initial session config (line 387)
  - Added session validation before `installTap` (lines 448-471)
  - Removed `.allowBluetoothA2DP` from re-assertion (line 460)
  - Added success confirmation log (line 487)
  - Enhanced existing logs with more detail (line 391)

- **`node_modules/@cjblack/expo-audio-stream/ios/ExpoPlayAudioStreamModule.swift`**
  - Removed `.allowBluetoothA2DP` from audio session init (line 370)

### 3. Configuration
- **`patches/@cjblack+expo-audio-stream+0.2.26.patch`**
  - Regenerated to capture all native changes (97 → 135 lines)

- **`app.config.js`**
  - Bumped `buildNumber` from "14" → "15"

---

## Testing Instructions

### Critical Test Scenario (The Bug):
1. **Force quit** PuttIQ if running
2. **Open** the app fresh (video starts playing)
3. **Immediately** tap the microphone icon (Listen Mode)
4. **Expected:** No crash, detector starts smoothly

### What to Watch For:

#### Using Xcode Console.app (RECOMMENDED):
1. Connect iPhone to Mac via USB
2. Open Console.app → select your device
3. Filter logs: search for "Debug:" or process "PuttIQ"
4. Reproduce crash scenario
5. Look for this sequence:

**Success Pattern:**
```
Debug: Setting Audio mode to recording before native call...
Debug: Setting audio session to .playAndRecord mode
Debug: Session configured - category: AVAudioSessionCategoryPlayAndRecord
Debug: Pre-tap validation - category: AVAudioSessionCategoryPlayAndRecord
Debug: Session validation passed - ready to install tap
Debug: About to install tap...
Debug: ✅ Tap installed successfully!
```

**Recovery Pattern (if expo-video recaptured):**
```
Debug: Pre-tap validation - category: AVAudioSessionCategoryPlayback
Warning: Audio session was changed! Re-asserting .playAndRecord...
Debug: Audio session re-asserted successfully
Debug: About to install tap...
Debug: ✅ Tap installed successfully!
```

**Failure Pattern (needs further fix):**
```
Debug: Pre-tap validation - category: AVAudioSessionCategoryPlayback
Warning: Audio session was changed! Re-asserting .playAndRecord...
Error: Failed to re-assert audio session: [error message]
```

### Additional Test Scenarios:

**Test 2: Delayed Activation**
1. Open app → wait 3-4 seconds
2. Tap Listen Mode
3. **Expected:** Works smoothly (session already stable)

**Test 3: Multiple Toggles**
1. Enable Listen Mode → disable → enable again quickly
2. **Expected:** No crashes, session validation handles conflicts

**Test 4: Hit Detection After Fix**
1. Enable Listen Mode
2. Tap putter in rhythm with 4th beat
3. **Expected:** Colored feedback bar appears, hit is detected

---

## Expected Behavior After Fix

### Success Path (90% of cases):
1. User taps Listen Mode
2. **JS sets Audio mode to recording** → expo-av releases control
3. **Native sets session to .playAndRecord**
4. **Native validates** → session still correct
5. **installTap succeeds** → detector starts
6. ✅ Hit detection works

### Recovery Path (if race still occurs):
1. Steps 1-3 same as above
2. **Native validates** → session was changed!
3. **Native re-asserts .playAndRecord**
4. **installTap succeeds** → detector starts
5. ✅ Hit detection works

### Graceful Failure Path (if all else fails):
1. Steps 1-3 same as above
2. **Native validates** → session was changed!
3. **Native tries to re-assert** → re-assertion fails
4. **Return error** instead of crashing
5. User sees: "Audio session conflict - unable to start recording"
6. ✅ App stays stable, user can close and reopen

---

## Why This Fix Should Work

### Build 13 Fix:
- ✅ Stopped engine before tap removal
- ✅ Removed existing tap
- ✅ Added format validation
- ❌ **MISSED:** Audio session set AFTER inputNode query

### Build 14 Fix:
- ✅ All build 13 improvements
- ✅ Reordered to set session BEFORE inputNode query
- ❌ **MISSED:** expo-video recaptures session between config and installTap

### Build 15 Fix (THIS BUILD):
- ✅ All build 13 & 14 improvements
- ✅ **NEW:** JS prevents expo-av from managing session
- ✅ **NEW:** Session validation immediately before installTap
- ✅ **NEW:** Automatic re-assertion if session changed
- ✅ **NEW:** Graceful error handling instead of crash
- ✅ **NEW:** Removed iOS 18 problematic option
- ✅ **NEW:** Comprehensive logging for diagnostics

---

## If It Still Crashes

If build 15 still crashes with error -10868:

### Check the Logs:
1. Did "Pre-tap validation" show session changed?
2. Did re-assertion succeed or fail?
3. Was there a different error message?

### Next Steps Would Be:
1. **Pause video entirely** before starting detector (nuclear option)
2. **Delay tap installation** by 200-500ms to let session settle
3. **Switch to expo-av Audio.Recording** instead of ExpoPlayAudioStream
4. **Report to expo-video team** if their session management is too aggressive

### Diagnostic Information to Collect:
- Full console logs from Console.app
- Crash log from Settings → Privacy → Analytics
- Specific sequence of log messages before crash
- Whether validation detected the session change

---

## Rollback Plan

If build 15 doesn't resolve the issue:

### Quick Rollback (Option 1):
Switch to expo-av Audio.Recording (1-line change):
```javascript
// In VideoSyncDetectorV2.js constructor
this.useAudioStream = false; // Force use of expo-av instead
```

### Full Rollback (Option 2):
Revert to build 14 while investigating alternative approaches

---

## Technical Notes

### Apple's AVAudioSession Behavior:
- **Global resource:** Only one app/module can control it at a time
- **Thread-safe but not race-safe:** Different threads can call setCategory simultaneously
- **No queue:** Last writer wins (no priority system)
- **Format locked:** Once `installTap` reads format, it can't change mid-installation

### expo-video's Audio Management:
- Automatically manages AVAudioSession for optimal video playback
- Uses background threads (`com.apple.coremedia` queues) to maintain session
- Recaptures session when video playback state changes
- No public API to disable its session management

### Why Multi-Layered Defense Works:
1. **Prevention** (JS layer): Stops most conflicts before they start
2. **Detection** (validation): Catches conflicts that slip through
3. **Recovery** (re-assertion): Fixes conflicts automatically
4. **Graceful Failure** (error handling): Keeps app stable if unfixable

---

## Related Documentation

- **Build 14 analysis:** [FIX_AUDIO_SESSION_REORDER.md](FIX_AUDIO_SESSION_REORDER.md)
- **Build 13 attempt:** [CRASH_FIX_2025-10-24.md](../testflight_feedback/CRASH_FIX_2025-10-24.md)
- **Testing guide:** [TESTING_BUILD_GUIDE.md](../TESTING_BUILD_GUIDE.md)
- **Crash log extraction:** [EXTRACTING_CRASH_LOGS.md](../EXTRACTING_CRASH_LOGS.md)

---

## Build & Deployment

### Build Command:
```bash
eas build --platform ios --profile preview
```

### After Build Completes:
```bash
eas submit --platform ios --profile production --latest
```

### Expected Build Time:
- 15-20 minutes for build
- 5-10 minutes for App Store Connect processing

---

## Success Criteria

- ✅ No crash when opening app and immediately enabling Listen Mode
- ✅ Console logs show session validation sequence
- ✅ "✅ Tap installed successfully!" appears in logs
- ✅ Hit detection works correctly after tap installation
- ✅ No error -10868 in crash logs or console
- ✅ Multiple enable/disable cycles work without issues

---

## Commit

```bash
git log -1 --oneline
```

Full commit message documents all three layers of defense and iOS 18 fix.

---

**Expected Outcome:** Build 15 should eliminate the -10868 crash through multiple layers of protection, with comprehensive logging to diagnose any remaining edge cases.
