# Video Player Source Update Fix

## Issue Summary

**Problem:** Videos were loading correctly in code (logs showed ✅), but the video player wasn't displaying the new video when BPM or sound type changed.

**Logs Showed:**
```
✅ Loading video: tone-73 (Type: tone, BPM: 73)
✅ Loading video: tone-74 (Type: tone, BPM: 74)
```

**But:** Video bar was not appearing on screen, and pressing START played audio but no visual video.

## Root Cause

The `useVideoPlayer` hook creates a player instance once with the initial source. When `currentVideoSource` changes (e.g., tone-70 → tone-73), the player kept using the old source.

**Before Fix:**
```javascript
const player = useVideoPlayer(currentVideoSource, player => {
  player.loop = false;
});
// ❌ Player created once, never updates when currentVideoSource changes
```

## Solution Applied

Added a `useEffect` that watches `currentVideoSource` and updates the player using `player.replace()` or `player.replaceAsync()`.

**After Fix (HomeScreen.js:246-266):**
```javascript
useEffect(() => {
  if (player && currentVideoSource) {
    console.log('🔄 Updating player source:', {
      key: videoKey,
      isPlaying: player.playing,
      soundType,
      bpm,
      listenMode
    });

    // Replace video source (use replaceAsync on iOS for better performance)
    if (Platform.OS === 'ios') {
      player.replaceAsync(currentVideoSource).catch(err => {
        console.error('Failed to replace video source:', err);
      });
    } else {
      player.replace(currentVideoSource);
    }
  }
}, [currentVideoSource, player, videoKey]);
```

## Expected Behavior After Fix

### When Changing BPM (70 → 73):

**Console Output:**
```
⬆️ BPM increased to 73
🎵 BPM updated to 73, listening window now: 65%-100%
🎥 Video key update: { key: 'tone-73', ... }
✅ Loading video: tone-73 (Type: tone, BPM: 73)
🔄 Updating player source: { key: 'tone-73', bpm: 73, soundType: 'tone' }
```

**Visual Result:**
- ✅ Video bar appears at top of screen
- ✅ Video plays at correct tempo (73 BPM)
- ✅ Audio syncs with visual

### When Changing Sound Type (Tone → Beat):

**Console Output:**
```
🥁 Beat selected
🎥 Video key update: { key: 'beat-73', ... }
✅ Loading video: beat-73 (Type: beat, BPM: 73)
🔄 Updating player source: { key: 'beat-73', bpm: 73, soundType: 'beat' }
```

**Visual Result:**
- ✅ Video bar updates to show beat video
- ✅ Audio changes to drum beat sound
- ✅ Timing bar syncs correctly

### When Enabling Listen Mode:

**Console Output:**
```
🎥 Video key update: { key: 'detect-73', listenMode: true, ... }
✅ Loading detect video: detect-73
🔄 Updating player source: { key: 'detect-73', bpm: 73, listenMode: true }
```

**Visual Result:**
- ✅ Video bar shows silent metronome (detect video)
- ✅ No audio (silent for listening to putter hits)
- ✅ Detection timing calibrated correctly

## Platform Differences

**iOS:**
- Uses `player.replaceAsync()` (non-blocking, better performance)
- Async operation with error catching

**Android/Web:**
- Uses `player.replace()` (synchronous)
- Simpler operation

## Verification Checklist

Test on iOS device:

- [ ] Change BPM from 70 to 75
  - [ ] See "🔄 Updating player source" log
  - [ ] Video bar appears
  - [ ] Tempo sounds different (faster)

- [ ] Change sound type from Tone to Beat
  - [ ] See "🔄 Updating player source" log
  - [ ] Video updates
  - [ ] Sound changes to drum beat

- [ ] Enable listen mode
  - [ ] See "🔄 Updating player source" log
  - [ ] Video shows silent metronome
  - [ ] No audio plays

- [ ] Change BPM in listen mode (70 → 80)
  - [ ] Video updates to detect-80
  - [ ] Detection timing adjusts correctly

## Files Modified

1. **C:\PuttIQ\screens\HomeScreen.js** (lines 246-266)
   - Added useEffect to update player source when currentVideoSource changes
   - Uses platform-specific replace method (replaceAsync for iOS, replace for others)
   - Logs source updates for debugging

## Related Documentation

- **DIAGNOSTIC_VIDEO_LOADING.md** - Video loading diagnostics guide
- **VIDEO_MAP_SUMMARY.md** - Complete video map configuration
- **TIMING_VERIFICATION.md** - Detection timing calculations

## Technical Notes

### Why player.replaceAsync() on iOS?

From expo-video documentation:
> `replaceAsync` is preferred on iOS to avoid blocking the UI thread, and is equivalent to `replace` on Android and Web.

### Dependency Array

The useEffect depends on:
- `currentVideoSource` - Triggers when video source changes
- `player` - Ensures player instance exists
- `videoKey` - Additional trigger for React key changes

This ensures the player source is updated whenever the video should change.
