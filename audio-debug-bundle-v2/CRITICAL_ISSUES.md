# Critical Audio Timing Issues - PuttIQ

## Current Status
✅ Sounds ARE playing (logs show `shouldPlay: true`)
❌ Engine stops after ~6 beats
❌ Timing appears off/drifting
❌ First run seems to restart

## Problem Timeline (from logs)

1. **18:17:00.608** - Sequence starts
2. **18:17:00-18:17:05** - Plays 6-7 beats correctly
3. **~18:17:05** - Engine stops abruptly (no error shown)
4. Queue has 701 sounds (expected ~200 for 25 bars)

## Key Issues Identified

### Issue 1: Engine Stops After ~5 Seconds
```
LOG [PuttingAudioAV] ✅ Successfully triggered play for tones-ready
LOG [PuttingAudioAV] Stopping engine  <-- SUDDEN STOP
```
**No stack trace or error** - something is calling stop() but we don't know what.

### Issue 2: Too Many Sounds Queued
- Expected: 25 bars × 4 beats = 100 beats
- Each beat has 1-2 sounds (click + optional tone)
- Should be ~175 sounds total
- **Actually queuing: 701 sounds!**

This suggests the loop is running with `totalBeats = 100 bars × 4 = 400` beats, and with 2 sounds per beat = 800 sounds (but stops at 701).

### Issue 3: Timing Drift
The first few beats play but seem to overlap or play too quickly, suggesting:
- Pool management issues (same player grabbed while still playing)
- Timing window too loose (currently ±10ms/-30ms)

## Code Flow Analysis

### 1. Start Sequence (HomeScreenMinimal.js:155)
```javascript
schedulePuttingSequence(
  audioEngineRef.current,
  bpm,
  audioMode,
  25, // bars (but code may still use 100?)
  startTimeMs
);
```

### 2. Queue Building (PuttingAudioEngineAV.ts:379)
```typescript
for (let beat = 0; beat <= totalBeats; beat++) {
  // Queues 2 sounds per beat (click + tone)
}
engine.start(); // Should NOT clear queue (fixed)
```

### 3. Playback Loop (PuttingAudioEngineAV.ts:230)
```typescript
const dueSounds = this.queue.filter(sound => {
  const diff = sound.time - now;
  return diff <= 10 && diff > -30;
});
```

## Suspected Root Causes

### 1. **Double Triggering**
User might be accidentally double-clicking the golf ball, which would:
- First click: Start sequence
- Second click (accidental): Stop sequence
- This matches the ~5 second stop pattern

### 2. **Memory/Performance Issue**
With 701 sounds in queue and rapid playback:
- System might be overwhelmed
- JavaScript event loop blocking
- Expo Go limitations

### 3. **Pool Exhaustion**
Only 3 players per sound type:
- If sounds overlap, all 3 players get marked inUse
- Next sound can't find available player
- Could trigger error/stop

## Diagnostic Questions

1. **Is stop() being called externally?**
   - Add stack trace to stop() method ✅ (already added)
   - Check if user is double-tapping

2. **Why 701 sounds instead of ~175?**
   - Check if bars parameter is being ignored
   - Verify totalBeats calculation

3. **Are sounds actually audible?**
   - shouldPlay: true in logs
   - But user reports no audio
   - Check device volume/mute switch

## Recommended Fixes

### Immediate:
1. **Add debouncing to play button**
```javascript
const [isStarting, setIsStarting] = useState(false);
const handlePlayPause = async () => {
  if (isStarting) return; // Prevent double-tap
  setIsStarting(true);
  // ... existing code
  setTimeout(() => setIsStarting(false), 1000);
};
```

2. **Limit queue size**
```typescript
const totalBeats = Math.min(bars * 4, 100); // Cap at 100 beats
```

3. **Better pool management**
```typescript
// Increase pool size
private poolSize = 5; // Was 3

// Longer inUse window
const duration = soundKey.includes('click') ? 200 : 1200; // Was 150/1000
```

### Long-term:
1. Replace expo-av with expo-audio (SDK 54+)
2. Implement progressive queue loading (load next 10 beats as needed)
3. Add performance monitoring/metrics

## Test Scenarios

1. **Single tap test**: Tap once, don't touch screen, see if it still stops
2. **Mute switch test**: Toggle iOS mute switch while playing
3. **Volume test**: Max volume, wired headphones
4. **Reduced load**: Try with just 5 bars instead of 25

## Files in Bundle
- `PuttingAudioEngineAV.ts` - Main audio engine
- `HomeScreenMinimal.js` - UI control
- `TimerBar.tsx` - Visual timer
- `package.json` - Dependencies
- `CRITICAL_ISSUES.md` - This analysis