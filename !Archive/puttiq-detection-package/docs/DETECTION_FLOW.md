# Detection Flow - Step by Step

## 1. Audio Input
```javascript
// From expo-audio-stream
ExpoPlayAudioStream.startRecording({
  sampleRate: 16000,
  channels: 1,
  bitsPerChannel: 16,
  interval: 100  // Callback every 100ms
})
```

## 2. Frame Processing (PutterDetectorExpo.handleFrame)
```javascript
// Convert Int16 to float with gain
const audioGain = 50.0;
for (let i = 0; i < frame.length; i++) {
  const normalized = (frame[i] / 32768.0) * audioGain;
  filtered[i] = this.bandpassFilter.process(normalized);
}
```

## 3. Feature Extraction
```javascript
// Calculate energy (average absolute value)
energy = sumAbs / filtered.length;

// Zero-crossing rate
zcr = zeroCrossings / filtered.length;

// Crest factor (peak to RMS ratio)
crestFactor = maxAbs / (rms + 1e-10);

// Spectral flux (energy change)
flux = Math.max(0, energy - prevEnergy);
```

## 4. Listening Zone Check
```javascript
// Only detect during middle of beat period
const period = 60000 / bpm;
const positionInBeat = ((timestamp - lastTick) % period) / period;

if (positionInBeat < 0.20 || positionInBeat > 0.80) {
  return; // Outside listening zone
}
```

## 5. Profile Matching
```javascript
// Compute FFT spectrum
const spectrum = spectralAnalysis.computeSpectrum(concatenatedFrames);

// Check against profiles
for (const profile of ignoreProfiles) {
  const similarity = cosineSimilarity(spectrum, profile.template);
  if (similarity >= profile.threshold) {
    // Filter out (e.g., metronome)
    return;
  }
}

for (const profile of targetProfiles) {
  const similarity = cosineSimilarity(spectrum, profile.template);
  if (similarity >= profile.threshold) {
    // Detect (e.g., putter)
    isHit = true;
  }
}
```

## 6. Multi-Criteria Detection
```javascript
// Require multiple criteria to pass
const energyCheck = features.energy > threshold;
const zcrCheck = features.zcr > 0.10;
const fluxCheck = features.flux > threshold * 0.3;
const crestCheck = features.crestFactor > 1.5;

const criteriaCount = energyCheck + zcrCheck + fluxCheck + crestCheck;
if (criteriaCount >= 2) {
  // Trigger detection
}
```

## 7. Detection Output
```javascript
const strikeEvent = {
  timestamp: performance.now(),
  energy: features.energy,
  zcr: features.zcr,
  confidence: calculateConfidence(),
  quality: assessHitQuality(),
  profileMatch: matchedProfile
};

onStrike(strikeEvent);
```