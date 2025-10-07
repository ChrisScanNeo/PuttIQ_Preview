# Profile System Documentation

## Overview
The profile system uses spectral templates to identify and filter sounds. Each profile contains a 128-bin FFT spectrum that acts as a "fingerprint" for a specific sound.

## Profile Structure
```javascript
{
  id: "prof_1234567890_abc",
  name: "My Putter",
  kind: "target" | "ignore",
  template: Float32Array(128),  // Normalized spectral template
  threshold: 0.85,               // Similarity threshold (0-1)
  enabled: true,
  sampleRate: 16000,
  frameSize: 256,
  metadata: {
    createdAt: 1234567890,
    quality: { score: 0.92, confidence: "high" }
  }
}
```

## Template Generation

### 1. Recording Phase
- Record multiple instances of the sound (e.g., 10 putts)
- Extract frames containing transients (impacts)
- Apply Hann window to reduce spectral leakage

### 2. FFT Analysis
```javascript
// 256-point FFT
const real = new Float32Array(windowed);
const imag = new Float32Array(frameSize);
fft.forward(real, imag);

// Magnitude spectrum
for (let i = 0; i < halfSize; i++) {
  magnitude[i] = Math.sqrt(real[i]² + imag[i]²);
}
```

### 3. Template Creation
```javascript
// Log scale and normalize
for (let i = 0; i < 128; i++) {
  template[i] = Math.log10(magnitude[i] + 1e-10);
}

// L2 normalization
const norm = Math.sqrt(sum(template[i]²));
for (let i = 0; i < 128; i++) {
  template[i] /= norm;
}
```

## Matching Algorithm

### Cosine Similarity
```javascript
function cosineSimilarity(template1, template2) {
  let dotProduct = 0;
  for (let i = 0; i < 128; i++) {
    dotProduct += template1[i] * template2[i];
  }
  // Both templates are normalized, so dot product = cosine
  return Math.max(0, Math.min(1, dotProduct));
}
```

### Decision Logic
1. Check ignore profiles first (higher priority)
2. If similarity >= threshold, filter out
3. Check target profiles
4. If similarity >= threshold, detect
5. Otherwise, use basic detection

## Default Metronome Templates

### Wood Block
- Emphasis on mid frequencies (1.2-3 kHz)
- Threshold: 0.95

### Electronic Beep
- Narrow peak at 1 kHz
- Very pure tone
- Threshold: 0.96

### Click/Tick (Most Important)
- Sharp transient
- Energy from 2.5-5 kHz
- Threshold: 0.97 (ultra-strict)

### Rimshot
- Dual characteristic: low thump + high crack
- Threshold: 0.72

## Quality Assessment
```javascript
assessQuality(spectra) {
  // Calculate consistency across recordings
  const avgSpectrum = average(spectra);
  const similarities = spectra.map(s => 
    cosineSimilarity(s, avgSpectrum)
  );
  
  const consistency = mean(similarities);
  const variability = 1 - stdDev(similarities);
  const score = (consistency + variability) / 2;
  
  return {
    score,
    confidence: score > 0.85 ? "high" : 
                score > 0.75 ? "medium" : "low"
  };
}
```

## Current Issues

### 1. Similarity Too High
All sounds matching at 90%+ similarity suggests:
- Templates too generic
- Normalization washing out distinctive features
- FFT resolution too low (256 points)

### 2. Metronome Not Filtered
Despite 0.97 threshold, metronome matching at 0.91:
- Template not capturing metronome characteristics
- Audio preprocessing altering spectrum
- Gain amplification affecting spectral shape

### 3. Putter Not Detected
- Template built from low-energy recordings
- Profile threshold too high (0.85)
- Spectral features not distinctive enough