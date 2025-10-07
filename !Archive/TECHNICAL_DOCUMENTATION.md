# PuttIQ Technical Documentation

## 🏗️ System Architecture

### Overview
PuttIQ uses a multi-layered architecture for real-time audio processing and profile management:

```
┌─────────────────────────────────────────────┐
│            User Interface Layer             │
│  (React Native Components + Navigation)     │
└─────────────────────────────────────────────┘
                      ↕
┌─────────────────────────────────────────────┐
│           Application Logic Layer           │
│     (Hooks, State Management, Events)       │
└─────────────────────────────────────────────┘
                      ↕
┌─────────────────────────────────────────────┐
│            Service Layer                    │
│  ┌──────────┬───────────┬──────────────┐  │
│  │   DSP    │  Profile   │    Audio     │  │
│  │ Services │  Manager   │   Services   │  │
│  └──────────┴───────────┴──────────────┘  │
└─────────────────────────────────────────────┘
                      ↕
┌─────────────────────────────────────────────┐
│            Data Layer                       │
│  ┌──────────────┬─────────────────────┐   │
│  │   Firebase   │   AsyncStorage       │   │
│  │  (Profiles)  │   (Local Cache)      │   │
│  └──────────────┴─────────────────────┘   │
└─────────────────────────────────────────────┘
```

## 🎯 Core Components

### 1. Detection Pipeline

```javascript
Audio Input (16kHz)
    ↓
Frame Buffer (256 samples)
    ↓
Pre-processing
├── High-pass Filter (1kHz)
├── Energy Calculation
└── Zero-Crossing Rate
    ↓
Transient Detection
    ↓
Spectral Analysis (FFT)
    ↓
Profile Matching
├── Check Ignore Profiles
└── Check Target Profiles
    ↓
Tick Guard (±30ms)
    ↓
Refractory Period (250ms)
    ↓
Strike Event
```

### 2. Profile System

#### Profile Data Structure
```javascript
{
  id: string,              // Unique identifier
  userId: string,          // Device/User ID
  name: string,            // Display name
  kind: 'target'|'ignore', // Profile type
  template: Float32Array,  // 128-bin spectral template
  threshold: number,       // Similarity threshold (0.0-1.0)
  enabled: boolean,        // Active status
  isDefault: boolean,      // System-provided
  metadata: {
    sampleRate: 16000,
    frameSize: 256,
    transientFramesUsed: number,
    createdAt: timestamp,
    quality: object
  }
}
```

#### Spectral Template Generation
1. **Recording Phase** (30 seconds)
   - Capture audio frames at 16kHz
   - Buffer 256-sample frames

2. **Transient Extraction**
   - Identify impact frames (energy > threshold)
   - Apply refractory period
   - Collect 30-200 transient frames

3. **Spectral Analysis**
   - Apply Hann window
   - Compute 256-point FFT
   - Extract magnitude spectrum
   - Convert to log scale
   - Keep first 128 bins

4. **Template Creation**
   - Average all spectral frames
   - L2 normalize
   - Store as Float32Array

### 3. Similarity Matching

#### Cosine Similarity Algorithm
```javascript
function cosineSimilarity(template1, template2) {
  // Both templates are L2-normalized
  let dotProduct = 0;
  for (let i = 0; i < 128; i++) {
    dotProduct += template1[i] * template2[i];
  }
  return Math.max(0, Math.min(1, dotProduct));
}
```

#### Threshold Guidelines
- **Target Profiles:** 0.75-0.85
  - Lower = stricter matching
  - Reduces false positives
  
- **Ignore Profiles:** 0.85-0.95
  - Higher = looser matching
  - Better filtering coverage

## 🔧 Configuration Parameters

### Audio Processing
```javascript
const AUDIO_CONFIG = {
  sampleRate: 16000,        // Hz
  frameSize: 256,           // samples
  frameHop: 128,            // 50% overlap
  windowType: 'hann',       // Window function
  fftSize: 256,             // FFT points
  spectrumBins: 128,        // Output bins
};
```

### Detection Parameters
```javascript
const DETECTION_CONFIG = {
  // Energy Detection
  energyMultiplier: 6,      // Baseline multiplier (4-10)
  baselineDecay: 0.995,     // Baseline adaptation rate
  
  // Zero-Crossing Rate
  zcrThreshold: 0.22,       // Broadband indicator (0.15-0.30)
  
  // Timing
  refractoryMs: 250,        // Min time between hits
  tickGuardMs: 30,          // Window around metronome
  
  // High-Pass Filter
  hpfCutoff: 1000,          // Hz (800-1500)
  hpfQ: 0.707,              // Butterworth response
};
```

### Profile Parameters
```javascript
const PROFILE_CONFIG = {
  // Recording
  recordingDuration: 30000,  // ms
  minTransientFrames: 30,    // Minimum for valid profile
  maxTransientFrames: 200,   // Maximum to use
  
  // Quality Thresholds
  minConsistency: 0.75,      // Profile quality metric
  minConfidence: 0.70,       // Detection confidence
  
  // Storage
  maxProfilesInMemory: 10,   // Cache limit
  profileCacheTTL: 86400000, // 24 hours
};
```

## 📊 Performance Optimization

### 1. FFT Optimization
- **Precomputed twiddle factors** - Calculate sin/cos tables once
- **Bit-reversal lookup** - Precompute bit reversal indices
- **In-place computation** - Reuse arrays to reduce allocation

### 2. Profile Caching
```javascript
// Memory hierarchy
L1: Active profiles (Map in ProfileManager)
L2: Session cache (ProfileManager.profilesCache)
L3: Local storage (AsyncStorage)
L4: Firebase (Firestore)
```

### 3. Frame Processing
- Process every frame (16ms) for detection
- Compute spectrum only on transients
- Batch profile comparisons
- Early exit on first ignore match

## 🧪 Testing & Calibration

### Test Mode Features
When enabled, displays:
- Real-time similarity scores for all profiles
- Frame energy and ZCR values
- Profile match indicators
- Detection confidence scores
- Baseline adaptation value

### Calibration Process
1. **Baseline Calibration**
   - Monitor ambient noise for 2-3 seconds
   - Set initial baseline from quiet period
   - Continuous adaptation during use

2. **Sensitivity Tuning**
   ```javascript
   // User sensitivity (0-1) maps to energy threshold
   energyThresh = 10 - (sensitivity * 7);
   // 0.0 = threshold 10 (least sensitive)
   // 1.0 = threshold 3 (most sensitive)
   ```

3. **Profile Threshold Adjustment**
   - Monitor false positive/negative rates
   - Adjust thresholds based on environment
   - Store per-profile statistics

## 🔐 Security & Privacy

### Data Storage
- **Local:** Device ID, profiles, settings
- **Firebase:** User profiles, anonymized stats
- **No PII:** No personal information collected
- **Offline-first:** Full functionality without internet

### Permissions
- **Microphone:** Required for detection
- **Storage:** For profile caching
- **Network:** Optional for Firebase sync

## 🐛 Debugging

### Console Logs
```javascript
// Enable debug mode
console.log('ProfileManager initialized:', profileCount);
console.log('Strike detected:', { 
  timestamp, 
  energy, 
  similarity,
  matchedProfile 
});
```

### Common Issues & Solutions

#### Issue: Metronome Not Filtered
```javascript
// Check 1: Profiles enabled
profileManager.getEnabledProfiles();

// Check 2: Similarity scores
// Enable test mode to see real-time scores
// If scores < threshold, adjust threshold up

// Check 3: Template quality
// Re-record metronome profile if needed
```

#### Issue: False Detections
```javascript
// Solution 1: Increase energy threshold
detectorRef.current.updateParams({
  energyThresh: 8  // Higher = less sensitive
});

// Solution 2: Tighten profile thresholds
profile.threshold = 0.85;  // Stricter matching

// Solution 3: Add ignore profile for noise source
```

#### Issue: Missed Detections
```javascript
// Solution 1: Lower energy threshold
detectorRef.current.updateParams({
  energyThresh: 4  // Lower = more sensitive
});

// Solution 2: Relax profile thresholds
profile.threshold = 0.70;  // Looser matching

// Solution 3: Re-record profile with more samples
```

## 📈 Metrics & Analytics

### Performance Targets
- **Detection Latency:** <50ms
- **Frame Processing:** <16ms (60fps)
- **Profile Matching:** <5ms per profile
- **FFT Computation:** <2ms
- **Total CPU Usage:** <30%

### Quality Metrics
```javascript
{
  // Profile Quality
  consistency: 0.85,    // How similar training samples were
  confidence: 0.92,     // Profile reliability score
  sampleCount: 87,      // Number of impacts used
  
  // Detection Accuracy
  truePositives: 145,   // Correct detections
  falsePositives: 3,    // Incorrect detections
  falseNegatives: 8,    // Missed detections
  precision: 0.98,      // TP / (TP + FP)
  recall: 0.95,         // TP / (TP + FN)
}
```

## 🚀 Advanced Features

### Multi-Profile Support
```javascript
// Support multiple putters
const profiles = [
  { name: 'Driver', kind: 'target', ... },
  { name: 'Putter', kind: 'target', ... },
  { name: 'Iron', kind: 'target', ... }
];

// Identify which club was used
const match = profileManager.checkSpectrum(spectrum);
console.log('Detected:', match.profile); // "Driver"
```

### Adaptive Thresholds
```javascript
// Adjust thresholds based on environment
if (ambientNoise > threshold) {
  profile.threshold *= 1.1;  // Stricter in noisy environment
}

// Learn from user corrections
if (userMarkedAsFalsePositive) {
  profile.threshold += 0.05;  // Make stricter
}
```

### Profile Sharing
```javascript
// Export profile as JSON
const exportProfile = (profile) => {
  return {
    ...profile,
    template: Array.from(profile.template)
  };
};

// Import shared profile
const importProfile = (json) => {
  return {
    ...json,
    template: new Float32Array(json.template)
  };
};
```

## 📚 References

### Algorithms
- **FFT:** Cooley-Tukey radix-2 algorithm
- **Window:** Hann window for spectral analysis
- **Similarity:** Cosine similarity for template matching
- **Filtering:** Butterworth high-pass filter

### Papers & Resources
- Digital Signal Processing (Oppenheim & Schafer)
- Speech and Audio Signal Processing (Gold & Morgan)
- The Scientist and Engineer's Guide to DSP (Smith)

---

**Last Updated:** December 2024
**Version:** 1.0.0