# Debug Logs Analysis

## Sample Debug Output with Issues

### Low Energy Detection
```
📊 Frame 50: Energy=0.000052, Baseline=0.000015, Threshold=0.000030
   ZCR=0.125, Crest=1.45, Flux=0.000012
   Zone: In zone at 45% of beat
```
**Analysis:** Energy is extremely low (0.000052). Normal putter impacts should be >0.01.

### False Profile Match
```
🔊 Sound detected: Energy=0.000085 (283% of threshold)
🔇 FILTERED OUT: Metronome: Electronic Beep (similarity: 91.2%)
   Energy was: 0.000085, would have triggered: true
```
**Analysis:** Random noise matching metronome at 91.2% similarity (threshold is 97%).

### Listening Zone Transitions
```
✅ ENTERED listening zone at 20% of beat
   Zone is 20%-80% of beat period
⏳ Waiting for zone: currently at 15% of beat
❌ EXITED listening zone at 82% of beat
```
**Analysis:** Zone transitions working correctly.

## Expected vs Actual Values

| Metric | Expected | Actual | Status |
|--------|----------|--------|--------|
| Energy | >0.01 | 0.000052 | ❌ Too Low |
| Baseline | ~0.001 | 0.000015 | ❌ Too Low |
| ZCR | 0.15-0.30 | 0.125 | ⚠️ Low |
| Crest Factor | >2.0 | 1.45 | ❌ Too Low |
| Profile Similarity (noise) | <0.5 | 0.91 | ❌ Too High |
| Profile Similarity (putter) | >0.85 | N/A | ❌ Not Detected |

## Debug Flags to Enable

```javascript
// In usePuttIQDetector.js
const [debugMode, setDebugMode] = useState(true);

// In detector options
{
  debugMode: true,
  calibrationMode: true,
  logLevel: 'verbose'
}
```

## Test Commands

### 1. Test Raw Audio Input
```javascript
// Add to PutterDetectorExpo.js
testRawInput() {
  console.log('RAW FRAME:', this.currentFrame.slice(0, 10));
  const max = Math.max(...this.currentFrame.map(Math.abs));
  console.log('MAX AMPLITUDE:', max, '(should be >1000)');
}
```

### 2. Test Profile Matching
```javascript
// Add to ProfileManager.js
testProfileDiscrimination() {
  const noise = new Float32Array(128).fill(0).map(() => Math.random());
  const normalized = spectralAnalysis.normalize(noise);
  
  for (const profile of this.enabledProfiles.ignore) {
    const sim = spectralAnalysis.cosineSimilarity(normalized, profile.template);
    console.log(`${profile.name} vs noise: ${sim.toFixed(3)}`);
  }
}
```

### 3. Test Gain Levels
```javascript
// Add to detector
testGainLevels() {
  const gains = [1, 10, 50, 100, 200];
  gains.forEach(gain => {
    this.opts.audioGain = gain;
    // Process one frame
    console.log(`Gain ${gain}x: Energy=${this.lastEnergy}`);
  });
}
```

## Debugging Checklist

- [ ] Verify microphone permissions granted
- [ ] Check iOS audio session category (PlayAndRecord)
- [ ] Test with different devices
- [ ] Record raw audio and analyze in external tool
- [ ] Visualize spectral templates
- [ ] Compare profile similarities across different sounds
- [ ] Test without band-pass filter
- [ ] Try different FFT sizes (512, 1024)
- [ ] Check if expo-audio-stream is receiving data
- [ ] Monitor CPU usage during detection

## Common Issues and Solutions

### Issue: No audio input
```javascript
// Check if receiving frames
handleAudioData(audioData) {
  console.log('RECEIVED:', audioData.data?.length || 0, 'bytes');
  if (!audioData.data) {
    console.error('NO AUDIO DATA!');
  }
}
```

### Issue: Profile matching everything
```javascript
// Log template details
console.log('Template stats:', {
  min: Math.min(...template),
  max: Math.max(...template),
  mean: template.reduce((a,b) => a+b) / template.length,
  zeros: template.filter(x => x === 0).length
});
```

### Issue: Detection not triggering
```javascript
// Force detection for testing
if (this.opts.forceDetection) {
  console.log('FORCED DETECTION');
  return true;
}
```