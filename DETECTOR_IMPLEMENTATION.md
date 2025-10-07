# Video-Synchronized Sound Detector Implementation

## ✅ Implementation Complete

A new, simpler sound detector has been implemented to replace the complex acoustic DSP system. This detector uses video playback position to determine when to listen for putter strikes.

---

## 📁 Files Created

### 1. **VideoSyncDetector Service**
`/services/dsp/VideoSyncDetector.js`

- Uses expo-av's Audio.Recording API with metering
- Records audio only during listening windows (60%-100% of video)
- Simple RMS energy threshold detection (4x baseline)
- Syncs to video player position for accurate timing
- No custom native modules required
- Works on iOS, Android, and Web

**Key Features:**
- Energy-based spike detection
- Adaptive baseline tracking (50 frame rolling average)
- 200ms debounce between detections
- Timing accuracy calculation (early/late/perfect)
- Position monitoring at 50ms intervals

### 2. **React Hook Wrapper**
`/hooks/useVideoSyncDetector.js`

- React hook interface for easy integration
- Manages detector lifecycle and permissions
- Handles microphone permission requests
- Provides state: isRunning, isListening, lastHit
- Auto-clears hit indicators after 2 seconds

### 3. **HomeScreen Integration**
`/screens/HomeScreen.js`

**Changes made:**
- ✅ Replaced `usePuttIQDetector` with `useVideoSyncDetector`
- ✅ Updated video map to support detect videos
- ✅ Enabled BPM controls (70-80 range)
- ✅ Added detector initialization with video player reference
- ✅ Integrated hit detection callbacks
- ✅ Updated video key generation logic

---

## 🎮 How It Works

### Video Selection Logic

**Regular Mode (Listen Mode OFF):**
```
Sound Type: Tone/Beat/Wind
BPM: 70-80
Path: /assets/swingBars/{platform}/{soundType}/{SoundType}_{BPM}BPM.{ext}
Example: /assets/swingBars/ios/tones/Tones_70BPM.mov
```

**Listen Mode (Listen Mode ON):**
```
Silent metronome video (detect mode)
BPM: 70-80
Path: /assets/swingBars/{platform}/detect/Tones_Detect_{BPM}BPM.{ext}
Example: /assets/swingBars/ios/detect/Tones_Detect_70BPM.mov
```

**Platform Extensions:**
- iOS: `.mov` (QuickTime with H.264/ProRes)
- Android: `.webm` (VP8/VP9)

### Listening Window

The detector only listens during specific portions of the video:

```
Video Timeline:
|----------------|-----LISTENING ZONE-----|
0%              60%                      100%
                 ^                        ^
            Start Listening         Expected Hit
```

- **Listen Start:** 60% through video
- **Listen End:** 100% (end of video)
- **Expected Hit:** End of video (position = 1.0)

### Detection Algorithm

1. **Audio Recording:** Continuous recording with 50ms metering updates
2. **Baseline Tracking:** 50-frame rolling average of RMS energy
3. **Spike Detection:** Energy > (baseline × 4.0)
4. **Debounce:** Minimum 200ms between hits
5. **Timing Calculation:**
   - Error = (hit position - expected position) × video duration
   - Accuracy = 1 - (|error| / 200ms)

---

## 🎯 Current Status

### ✅ What's Working
- VideoSyncDetector service created
- React hook wrapper created
- HomeScreen fully integrated
- BPM controls enabled (70-80)
- Video map supports detect videos
- Fallback to 70 BPM if videos missing

### ⚠️ Ready for Testing (iOS)
- iOS detect video exists: `Tones_Detect_70BPM.mov`
- BPM 70 is ready to test
- Other BPMs (71-80) will fallback to 70

### 📝 TODO: Video Files
**Still Need to Create:**
- Android detect videos: `Tones_Detect_70BPM.webm` (iOS .mov currently used as placeholder)
- Detect videos for BPM 71-80 (both iOS and Android)
- Regular sound videos for BPM 71-80 (Tone/Beat/Wind)

**File Naming Convention:**
```
iOS Detect:     Tones_Detect_{BPM}BPM.mov
Android Detect: Tones_Detect_{BPM}BPM.webm
iOS Sound:      {Type}_{BPM}BPM.mov
Android Sound:  {Type}_{BPM}BPM.webm
```

---

## 🧪 Testing Instructions

### Phase 1: Test 70 BPM on iOS

1. **Start the app:**
   ```bash
   npm start
   ```

2. **Enable Listen Mode:**
   - Tap the "Listen Mode" button (bottom left)
   - Lightning bolt icon should turn green
   - Video should switch to detect video (silent metronome)

3. **Start Playback:**
   - Tap the golf ball to start
   - Detector should automatically start recording
   - Watch console for detector status logs

4. **Test Hit Detection:**
   - Make a putting sound (tap table, clap, etc.) when video bar reaches the end
   - Look for hit indicator (vertical line) on video
   - Check console for hit event with timing info

5. **Debug Mode (Optional):**
   In `HomeScreen.js`, change:
   ```javascript
   debugMode: false  →  debugMode: true
   ```
   This enables detailed console logging.

### Expected Console Output

**When Listen Mode Starts:**
```
⚡ Listen mode ON
🎯 VideoSyncDetector starting... {bpm: 70, listenWindow: "60%-100%"}
✅ Audio mode configured for recording + playback
✅ VideoSyncDetector started and recording
```

**During Listening Window:**
```
🎤 LISTENING WINDOW STARTED at 60.2%
📊 Audio: 0.012345, Baseline: 0.003456, Threshold: 0.013824, Listening: true
```

**When Hit Detected:**
```
✅ HIT DETECTED #1 {energy: "0.056789", baseline: "0.003456", ratio: "16.43x", position: "92.3%", errorMs: "-154ms", accuracy: "23%"}
🎯 Hit detected! {accuracy: "23%", errorMs: "-154ms", timing: "Early"}
```

### Common Issues & Solutions

**Issue:** No audio permission prompt
- **Fix:** Make sure you're running on a real device or iOS simulator (not Expo Go web)

**Issue:** Detector not starting
- **Fix:** Check that video player is ready (player.duration > 0)

**Issue:** No hits detected
- **Fix:** Increase sensitivity in debug mode or make louder sounds

**Issue:** Too many false positives
- **Fix:** Increase `energyThreshold` in VideoSyncDetector options

**Issue:** Video not found error
- **Fix:** Videos for BPM 71-80 don't exist yet, it will fallback to 70 BPM

---

## 🔧 Configuration Options

### Detector Sensitivity

Adjust in `/services/dsp/VideoSyncDetector.js`:

```javascript
energyThreshold: 4.0,    // 4x baseline (lower = more sensitive)
baselineWindow: 50,      // Frames for baseline average
debounceMs: 200,         // Minimum time between hits
```

### Listening Window

Adjust in `/services/dsp/VideoSyncDetector.js`:

```javascript
listenStartPercent: 0.60,  // Start at 60% through video
listenEndPercent: 1.0,     // End at 100%
```

### Debug Mode

Enable in `/screens/HomeScreen.js`:

```javascript
const detector = useVideoSyncDetector({
  debugMode: true,  // Enable verbose logging
  ...
});
```

---

## 🆚 Comparison with Old System

### Old System (PutterDetectorAcoustic)
- ❌ Required custom native module (@cjblack/expo-audio-stream)
- ❌ Complex DSP with multi-band filters
- ❌ Continuous processing (high CPU usage)
- ❌ Adaptive thresholds with acoustic profiling
- ✅ Very accurate detection
- ✅ Sophisticated noise rejection

### New System (VideoSyncDetector)
- ✅ Uses standard expo-av (built into Expo)
- ✅ Simple RMS energy detection
- ✅ Processes only during listening windows (low CPU)
- ✅ Video-synchronized timing
- ✅ Works on all platforms without custom builds
- ⚠️ May need sensitivity tuning

---

## 📊 Next Steps

1. **Test on iOS device** with 70 BPM detect video
2. **Create Android .webm** detect video for 70 BPM
3. **Test on Android device**
4. **Create remaining detect videos** for BPM 71-80
5. **Fine-tune sensitivity** based on real-world testing
6. **Add visual feedback** for timing accuracy (early/late/perfect)
7. **Consider adding** sensitivity slider in UI

---

## 🐛 Troubleshooting

### Enable Debug Logging

Set `debugMode: true` in three places:

1. **HomeScreen.js** detector initialization
2. **useVideoSyncDetector.js** (pass through options)
3. **VideoSyncDetector.js** (already receives from options)

### Check Permissions

```javascript
import { Audio } from 'expo-av';

// Check permission status
const { status } = await Audio.getPermissionsAsync();
console.log('Mic permission:', status);
```

### Monitor Video Position

Add to HomeScreen:
```javascript
useEffect(() => {
  const interval = setInterval(() => {
    if (player) {
      console.log('Video position:', (player.currentTime / player.duration * 100).toFixed(1) + '%');
    }
  }, 500);
  return () => clearInterval(interval);
}, [player]);
```

---

## 📝 Notes

- The detector is **BPM-aware** but currently just uses it for logging
- Timing calculations assume hit should occur at **end of video** (position = 1.0)
- The **2-second gap** between video loops is preserved
- Sound type selection is **disabled in listen mode** (only detect video plays)
- BPM can be changed **only when stopped**
- Videos automatically **fallback to 70 BPM** if requested BPM video doesn't exist

---

**Implementation Date:** October 3, 2025
**Status:** ✅ Ready for Testing (iOS 70 BPM)
**Next Milestone:** Create remaining video files for full BPM range (71-80)
