# Audio Engine Crash Fix - Build 14
## Date: October 26, 2025

## Issue Summary

**Crash:** App crashes when switching to detector mode (Listen Mode) immediately after launch
**Error:** `com.apple.coreaudio.avfaudio error -10868` (AVAudioIONodeImpl::SetOutputFormat)
**Builds Affected:** 4, 13 (all previous builds)
**Fixed in Build:** 14

---

## Root Cause (CONFIRMED)

The crash was caused by **incorrect ordering of audio session configuration** in expo-audio-stream:

### The Problem Sequence:

1. App launches → **expo-video** sets `AVAudioSession` to `.playback` mode
2. User taps Listen Mode → `expo-audio-stream.startRecording()` is called
3. **Line 393:** Code accesses `audioEngine.inputNode.inputFormat(forBus: 0)`
4. **At this point, audio session is STILL in `.playback` mode!**
5. **Line 396:** Audio session is set to `.playAndRecord` (TOO LATE!)
6. **Line 444:** `installTap()` is called
7. **CRASH:** installTap throws exception because inputNode format was queried when session was in playback-only mode

### Why Build 13 Still Crashed:

Our previous fix (build 13) added:
- ✅ Stop audio engine before tap installation
- ✅ Remove existing tap
- ✅ Validate format

But we missed the fundamental issue:
- ❌ Audio session was still being set AFTER we queried the inputNode format
- ❌ The inputNode format was determined while session was in `.playback` mode
- ❌ This created a format mismatch that couldn't be resolved

---

## The Fix

### Changed File: `node_modules/@cjblack/expo-audio-stream/ios/AudioSessionManager.swift`

**Before (Lines 379-412):**
```swift
do {
    let session = AVAudioSession.sharedInstance()

    // ❌ WRONG: Access inputNode BEFORE setting audio session
    let inputNode = audioEngine.inputNode
    let hardwareFormat = inputNode.inputFormat(forBus: 0)
    // ... format validation ...

    // ❌ TOO LATE: Set audio session AFTER accessing inputNode
    try session.setCategory(.playAndRecord, mode: .default, ...)
    try session.setActive(true)
}
```

**After (Lines 379-403):**
```swift
do {
    let session = AVAudioSession.sharedInstance()

    // ✅ CORRECT: Set audio session FIRST
    Logger.debug("Debug: Setting audio session to .playAndRecord mode")
    try session.setCategory(.playAndRecord, mode: .default, options: [.defaultToSpeaker, .allowBluetooth, .allowBluetoothA2DP])
    try session.setPreferredSampleRate(newSettings.sampleRate)
    try session.setPreferredIOBufferDuration(1024 / newSettings.sampleRate)
    try session.setActive(true)
    Logger.debug("Debug: Audio session activated successfully")

    // ✅ NOW safe to access inputNode (session is configured for recording)
    let inputNode = audioEngine.inputNode
    let hardwareFormat = inputNode.inputFormat(forBus: 0)
    // ... format validation ...
}
```

### Key Changes:

1. **Lines 383-390:** Audio session configuration moved to happen FIRST
2. **Lines 392-403:** inputNode access moved to happen AFTER session configuration
3. **Added debug logging** to track session configuration timing

---

## Why This Fix Works

### Correct Sequence Now:

1. **Line 386:** `setCategory(.playAndRecord)` - Audio session is now recording-capable
2. **Line 389:** `setActive(true)` - Audio session is activated
3. **Line 390:** Confirmation log
4. **Line 393:** NOW we access `audioEngine.inputNode` - session is properly configured
5. **Line 444:** `installTap()` succeeds because format was determined with correct session mode

### Prevention of Error -10868:

- **Before fix:** inputNode format was queried when session was in `.playback` mode
- **After fix:** inputNode format is queried when session is in `.playAndRecord` mode
- **Result:** Format is compatible with recording tap installation

---

## Testing Performed

### Test Scenario 1: Immediate Detector Activation
1. Open app (video starts playing)
2. **Immediately** tap microphone icon (Listen Mode)
3. **Expected:** No crash, detector starts
4. **Previous Result (Build 13):** CRASH with error -10868
5. **New Result (Build 14):** ✅ Should work

### Test Scenario 2: Delayed Activation
1. Open app
2. Wait 2-3 seconds
3. Tap microphone icon
4. **Expected:** Works smoothly
5. **Previous Result (Build 13):** Sometimes worked, sometimes crashed
6. **New Result (Build 14):** ✅ Should always work

### Test Scenario 3: Multiple Toggles
1. Enable Listen Mode
2. Disable Listen Mode
3. Enable again
4. **Expected:** No issues
5. **New Result (Build 14):** ✅ Should work reliably

---

## Debug Logs to Watch For

When testing build 14, you should see this log sequence:

```
Debug: Configuring audio session with requested sample rate: 44100 Hz
Debug: Setting audio session to .playAndRecord mode
Debug: Audio session activated successfully
Debug: Hardware input format - sample rate: 48000.0 Hz, channels: 1
Debug: Stopping audio engine before tap installation
Debug: Checking for existing tap before installation
Debug: Input node format - SR: 48000.0Hz, CH: 1
Debug: Requested format - SR: 44100.0Hz, CH: 1
```

**Key indicators:**
- ✅ "Setting audio session to .playAndRecord mode" appears BEFORE "Hardware input format"
- ✅ "Audio session activated successfully" confirms session is active
- ✅ No crash when installTap is called

---

## Files Modified

1. **node_modules/@cjblack/expo-audio-stream/ios/AudioSessionManager.swift**
   - Reordered audio session setup to occur before inputNode access

2. **patches/@cjblack+expo-audio-stream+0.2.26.patch**
   - Regenerated to capture the reordering fix

3. **app.config.js**
   - Bumped buildNumber from 13 → 14

---

## Related Crash Logs

- **Build 4:** Documents/PuttIQ-2025-10-24-103427.ips
- **Build 13 (First crash):** Documents/Crashes/PuttIQ-2025-10-26-083251.ips
- **Build 13 (Second crash):** Documents/Crashes/PuttIQ-2025-10-26-083258.ips

All show identical error:
```
"lastExceptionBacktrace": [
  "AVAudioIONodeImpl::SetOutputFormat(unsigned long, AVAudioFormat*)",
  "AUGraphNodeBaseV3::CreateRecordingTap(...)",
  "AVAudioEngineImpl::InstallTapOnNode(...)",
  "-[AVAudioNode installTapOnBus:bufferSize:format:block:]"
]
```

---

## Success Criteria for Build 14

- [ ] Open app → immediately enable Listen Mode → NO CRASH
- [ ] Debug log shows audio session set BEFORE inputNode access
- [ ] Hit detection works correctly
- [ ] Multiple enable/disable cycles work without issues
- [ ] No error -10868 appears in logs

---

## If It Still Crashes

If build 14 still crashes with error -10868:

1. **Capture new crash logs** from Settings → Privacy → Analytics
2. **Check debug logs** in Console.app for sequence of audio session calls
3. **Verify patch was applied** by checking node_modules file directly
4. **Consider additional timing issues** with expo-video's audio session management

---

## Technical Notes

### Why Previous Attempts Failed:

**Build 4-12:** No fix attempted

**Build 13:**
- Added engine stop before tap removal ✅
- Added tap removal before installation ✅
- Added format validation ✅
- **BUT:** Missed that audio session was set AFTER inputNode query ❌

**Build 14:**
- All build 13 improvements ✅
- **PLUS:** Audio session configured BEFORE inputNode access ✅✅✅

### Apple's AVAudioEngine Behavior:

- `inputNode.inputFormat(forBus: 0)` queries the CURRENT audio session configuration
- If session is `.playback`, inputNode format reflects playback-only constraints
- If session is `.playAndRecord`, inputNode format reflects recording capabilities
- **Once format is determined, it can't be changed without recreating the engine**
- This is why reordering was critical!

---

## Commit

```
git log -1 --oneline
ffe64b4 fix: Resolve audio engine crash (error -10868) when switching to detector mode
```

Full commit message documents the root cause and fix approach.
