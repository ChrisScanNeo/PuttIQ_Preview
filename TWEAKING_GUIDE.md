# PuttIQ Tweaking & Optimization Guide

## 🎛️ Quick Tweaks

### Sensitivity Adjustment

#### Too Sensitive (Too Many Detections)
```javascript
// In /hooks/usePuttIQDetector.js
// INCREASE these values:
energyThresh: 8,    // Was 6, now stricter
zcrThresh: 0.25,    // Was 0.22, now stricter

// In Settings screen
// DECREASE sensitivity slider to 0.3
```

#### Not Sensitive Enough (Missing Hits)
```javascript
// In /hooks/usePuttIQDetector.js  
// DECREASE these values:
energyThresh: 4,    // Was 6, now more sensitive
zcrThresh: 0.18,    // Was 0.22, now more sensitive

// In Settings screen
// INCREASE sensitivity slider to 0.7
```

### Metronome Filtering

#### Metronome Still Triggering Detection
```javascript
// In /services/profiles/MetronomeTemplateGenerator.js
// INCREASE threshold for metronome profiles:
{
  name: 'Metronome: Click/Tick',
  threshold: 0.92,  // Was 0.88, now stricter
  ...
}

// Or in ProfileManager screen:
// Toggle metronome profiles OFF then ON to refresh
```

#### Putter Being Filtered Out
```javascript
// In /services/profiles/ProfileBuilder.js
// DECREASE target threshold:
const threshold = kind === 'target' ? 0.70 : 0.88;  // Was 0.80

// Or re-record putter with more distinct impacts
```

## 🔧 Parameter Reference

### Detection Parameters

```javascript
// /hooks/usePuttIQDetector.js - lines 62-70
const detectorOptions = {
  sampleRate: 16000,     // Don't change
  frameLength: 256,      // Don't change
  
  // MAIN TWEAKING PARAMETERS:
  refractoryMs: 250,     // Min ms between detections (200-400)
  energyThresh: 6,       // Energy multiplier (3=sensitive, 10=strict)
  zcrThresh: 0.22,       // Zero-crossing rate (0.15-0.30)
  tickGuardMs: 30,       // Window around metronome (20-50)
}
```

### Energy Threshold Guide
- **3-4:** Very sensitive, picks up light taps
- **5-6:** Default, balanced detection
- **7-8:** Less sensitive, strong hits only
- **9-10:** Very strict, only loud impacts

### ZCR Threshold Guide
- **0.15-0.18:** Accept low-frequency sounds
- **0.20-0.22:** Default, balanced
- **0.24-0.28:** Reject low-frequency sounds
- **0.30+:** Very strict, high-frequency only

## 📊 Profile Tweaking

### Modify Profile Thresholds

```javascript
// /services/profiles/ProfileManager.js
// Find checkSpectrum() method around line 190

// Make ALL ignore profiles stricter:
if (p.kind === 'ignore' && sim >= (p.threshold + 0.05))

// Make ALL target profiles looser:
if (p.kind === 'target' && sim >= (p.threshold - 0.05))
```

### Adjust Individual Profiles

1. Go to **Profiles** tab
2. Note the profile name
3. Edit `/services/profiles/MetronomeTemplateGenerator.js`
4. Find the specific profile
5. Adjust its threshold:

```javascript
templates.push({
  name: 'Metronome: Wood Block',
  threshold: 0.90,  // Increase to be stricter
  ...
});
```

## 🎯 Environment-Specific Tweaks

### Quiet Room Setup
```javascript
// More sensitive settings
{
  energyThresh: 4,
  zcrThresh: 0.20,
  refractoryMs: 200,
  // Lower baseline decay for stability
  baselineDecay: 0.998  // in detector
}
```

### Noisy Environment Setup
```javascript
// Less sensitive settings
{
  energyThresh: 8,
  zcrThresh: 0.24,
  refractoryMs: 300,
  // Faster baseline adaptation
  baselineDecay: 0.990  // in detector
}
```

### Outdoor Setup
```javascript
// Wind and ambient noise resistant
{
  energyThresh: 7,
  zcrThresh: 0.26,    // Higher to reject wind
  tickGuardMs: 40,     // Wider guard window
  // Add high-pass filter adjustment if needed
  hpfCutoff: 1200      // Higher cutoff for wind
}
```

## 🔊 Audio-Specific Adjustments

### For Different Putters

#### Metal Putter (High-Frequency Ring)
```javascript
// Emphasize high frequencies
zcrThresh: 0.25,  // Higher ZCR expected
// When recording profile, tap firmly for clear ring
```

#### Soft Insert Putter (Dull Thud)
```javascript
// Accept lower frequencies
zcrThresh: 0.18,  // Lower ZCR expected
energyThresh: 5,   // May need more sensitivity
```

#### Mallet Putter (Mixed Frequencies)
```javascript
// Balanced settings
zcrThresh: 0.22,  // Default
energyThresh: 6,   // Default
// Record profile with various impact strengths
```

### For Different Balls

#### Range Balls (Harder)
- Increase energy threshold by 1-2
- Higher frequency content expected

#### Premium Balls (Softer)  
- Decrease energy threshold by 1
- Lower frequency content expected

## 💻 Performance Optimization

### Reduce CPU Usage

```javascript
// Process every other frame
// In detector's onFrame method:
if (frameCount++ % 2 === 0) return;  // Skip alternate frames

// Reduce profile checks
// Disable unused profiles in Profiles tab

// Simplify FFT
// In SpectralAnalysis.js, use smaller FFT:
this.fft = new FFT(128);  // Was 256
```

### Improve Responsiveness

```javascript
// Reduce refractory period
refractoryMs: 150,  // Was 250

// Decrease frame size (requires rebuild)
frameLength: 128,   // Was 256

// Process in parallel
// Enable concurrent profile checking
```

### Battery Optimization

```javascript
// Reduce sample rate (impacts quality)
sampleRate: 8000,   // Was 16000

// Increase frame hop
// Process every 3rd frame instead of all

// Auto-stop after idle
// Add timeout to stop detector after 5 min idle
```

## 🧪 Testing Your Tweaks

### Quick Test Protocol

1. **Baseline Test**
   - Record current settings
   - Count detections in 1 minute
   - Note false positives/negatives

2. **Make ONE Change**
   - Adjust single parameter
   - Document the change

3. **Test Again**
   - Same conditions as baseline
   - Compare detection counts
   - Check accuracy

4. **Iterate**
   - If better, keep change
   - If worse, revert
   - Try next parameter

### Debug Output

Add console logs to track changes:

```javascript
// In usePuttIQDetector.js
console.log('Detection params:', {
  energyThresh,
  zcrThresh,
  sensitivity: settings.sensitivity
});

// In ProfileManager.js
console.log('Profile match:', {
  profile: match.profile,
  similarity: match.similarity,
  threshold: profile.threshold
});
```

## 📱 Device-Specific Tweaks

### iOS Devices
```javascript
// Generally more consistent
// Use default settings
// May need to increase energy threshold on newer models
```

### Android Devices
```javascript
// More variation between manufacturers
// Start with less sensitive settings:
energyThresh: 7,
// Some devices need higher ZCR:
zcrThresh: 0.24,
```

### Older Devices
```javascript
// Reduce processing load
frameLength: 128,     // Smaller frames
// Skip spectral analysis on weak signals
if (energy < threshold * 0.5) return;
```

## 🚀 Advanced Tweaks

### Custom Filter Frequencies

```javascript
// In detector's high-pass filter
// Adjust cutoff for your environment
const HPF_CUTOFF = 1200;  // Was 1000 Hz
// Higher = more low-freq rejection
// Lower = accept more bass frequencies
```

### Profile Weight System

```javascript
// Give certain profiles more importance
// In ProfileManager.checkSpectrum():
if (profile.name === 'My Main Putter') {
  similarity *= 1.1;  // Boost similarity
}
```

### Adaptive Thresholds

```javascript
// Auto-adjust based on success rate
let successRate = hits / attempts;
if (successRate < 0.8) {
  energyThresh *= 0.95;  // Make more sensitive
} else if (successRate > 0.95) {
  energyThresh *= 1.05;  // Make less sensitive
}
```

## 📝 Tweaking Checklist

Before tweaking:
- [ ] Test current settings thoroughly
- [ ] Document baseline performance
- [ ] Identify specific problem
- [ ] Have rollback plan

While tweaking:
- [ ] Change ONE parameter at a time
- [ ] Test after each change
- [ ] Keep notes of what works
- [ ] Use Test Mode for visibility

After tweaking:
- [ ] Verify improvements
- [ ] Test in different conditions
- [ ] Document final settings
- [ ] Share what worked!

## 🆘 Emergency Reset

If tweaks break detection:

1. **Reset to Defaults**
   - Settings → Reset to Defaults
   - Clears all custom settings

2. **Clear Profiles**
   - Settings → Clear Cache
   - Regenerates default profiles

3. **Full Reset**
   ```javascript
   // Replace detector options with:
   {
     sampleRate: 16000,
     frameLength: 256,
     refractoryMs: 250,
     energyThresh: 6,
     zcrThresh: 0.22,
     tickGuardMs: 30,
   }
   ```

---

**Remember:** Small changes can have big effects. Always test thoroughly after tweaking!