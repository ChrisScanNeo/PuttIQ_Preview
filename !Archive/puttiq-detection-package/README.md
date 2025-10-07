# PuttIQ Detection System - Technical Package

## Overview
This package contains all relevant code and documentation for the PuttIQ putt detection system that is experiencing detection issues.

## Current Issues Summary
1. **Extremely low audio input levels** - Energy values around 0.000052 (should be >0.01)
2. **Profile matching too lenient** - All sounds matching at 90%+ similarity
3. **No putt detection** even with maximum sensitivity
4. **Audio gain not helping** - 50x amplification still not detecting putts

## System Architecture

### Audio Processing Pipeline
```
Microphone Input (16kHz)
    ↓
Audio Gain (10-100x configurable)
    ↓
Band-pass Filter (1-6 kHz)
    ↓
Feature Extraction (Energy, ZCR, Flux, Crest Factor)
    ↓
Listening Zone Check (20-80% of beat period)
    ↓
FFT Spectral Analysis (256-point)
    ↓
Profile Matching (Cosine Similarity)
    ↓
Detection Decision
```

### Key Components

#### 1. Core Detection (`src/dsp/PutterDetectorExpo.js`)
- Main detector using expo-audio-stream for React Native
- Processes 16kHz audio in 256-sample frames
- Band-pass filter: 1-6 kHz (putter impact frequency range)
- Features extracted: energy, ZCR, flux, crest factor
- Profile matching: Computes FFT spectrum, matches against templates
- Listening zone: Only detects during 20-80% of beat period
- Audio gain: Configurable amplification (default 50x)

#### 2. Profile System (`src/profiles/`)
- **ProfileManager.js**: Manages target (putter) and ignore (metronome) profiles
- **ProfileBuilder.js**: Creates profiles from recorded audio
- **MetronomeTemplateGenerator.js**: Generates default metronome templates
- **FirebaseProfileService.js**: Cloud storage and sync for profiles

#### 3. Spectral Analysis (`src/dsp/SpectralAnalysis.js`)
- FFT implementation (256-point)
- Spectral template generation
- Cosine similarity matching
- Transient detection

#### 4. User Interface
- **HomeScreen.js**: Main detection interface
- **PutterCalibrationScreen.js**: Profile recording interface
- **usePuttIQDetector.js**: React hook managing detector state

## Detection Parameters

### Current Configuration
```javascript
{
  sampleRate: 16000,           // Audio sample rate
  frameLength: 256,            // Samples per frame
  energyThresh: 2,             // Energy threshold multiplier
  zcrThresh: 0.10,             // Zero-crossing rate threshold
  audioGain: 50,               // Audio input amplification
  listeningZonePercent: 0.60,  // 60% of beat period
  listeningZoneOffset: 0.20,   // Start at 20% into beat
  refractoryMs: 100,           // Min time between detections
  
  // Profile thresholds
  metronomeThreshold: 0.97,    // Ultra-strict for metronome
  putterThreshold: 0.85,       // Target profile threshold
  
  // Minimum thresholds
  minEnergyThreshold: 0.00001  // Absolute minimum
}
```

## Debug Output Examples

### Typical Debug Log (Showing Issues)
```
📊 Frame 50: Energy=0.000052, Baseline=0.000015, Threshold=0.000030
   ZCR=0.125, Crest=1.45, Flux=0.000012
   Zone: In zone at 45% of beat

🔊 Sound detected: Energy=0.000085 (283% of threshold)

🔇 FILTERED OUT: Metronome: Electronic Beep (similarity: 91.2%)
   Energy was: 0.000085, would have triggered: true

✅ ENTERED listening zone at 20% of beat
   Zone is 20%-80% of beat period

⏳ Waiting for zone: currently at 15% of beat

❌ EXITED listening zone at 82% of beat
```

## Profile System Details

### Metronome Profiles (Ignore)
Generated templates for filtering out metronome sounds:
- **Wood Block**: Mid-frequency emphasis
- **Electronic Beep**: Narrow frequency peak at 1kHz
- **Click/Tick**: Sharp transient, 1-4 kHz
- **Rimshot**: Low thump + high crack

All use very high thresholds (0.95-0.97) to prevent false matches.

### Putter Profile (Target)
Built from user calibration:
- 10 recorded putts
- Spectral averaging
- Quality assessment based on consistency
- Threshold: 0.85

## Known Issues Analysis

### 1. Audio Input Levels Too Low
**Symptoms:**
- Energy values: 0.000052 (expected: >0.01)
- Even with 50x gain, still below detection threshold
- Baseline noise floor: 0.000015

**Possible Causes:**
- Microphone permissions not fully granted
- expo-audio-stream not properly accessing microphone
- Device-specific audio input issues
- iOS audio session configuration problems

### 2. Profile Matching Too Lenient
**Symptoms:**
- All sounds matching at 90%+ similarity
- Random noise matching metronome profiles
- Putter sounds being filtered as metronome

**Possible Causes:**
- FFT window size too small (256 samples)
- Normalization issues in spectral templates
- Cosine similarity not discriminative enough
- Templates too generic

### 3. Detection Logic Issues
**Symptoms:**
- No putts detected even in calibration mode
- Basic detection not triggering
- Multi-criteria checks all failing

**Possible Causes:**
- Thresholds calibrated for higher audio levels
- Feature extraction not working with low signals
- Band-pass filter removing too much signal

## Recommended Solutions

### Immediate Fixes
1. **Test Raw Audio Recording**
   - Record raw audio without processing
   - Verify actual input levels
   - Check if it's an input or processing issue

2. **Adjust Gain Strategy**
   - Add automatic gain control (AGC)
   - Increase default gain to 100x or more
   - Apply gain before band-pass filter

3. **Debug Profile Matching**
   - Log raw spectral templates
   - Visualize frequency content
   - Adjust similarity thresholds

### Long-term Solutions
1. **Alternative Audio Library**
   - Consider react-native-audio-recorder-player
   - Use native modules for better control
   - Implement custom audio processing

2. **Improved Profile System**
   - Use larger FFT size (512 or 1024)
   - Implement MFCC features
   - Add machine learning classifier

3. **Better Calibration**
   - Record at higher gain during calibration
   - Validate audio levels before building profile
   - Provide visual feedback of signal strength

## Testing Recommendations

1. **Audio Input Test**
   ```javascript
   // Test raw audio levels without processing
   const testAudioInput = async () => {
     const samples = await recordRawAudio(1000); // 1 second
     const maxAmplitude = Math.max(...samples.map(Math.abs));
     console.log('Max amplitude:', maxAmplitude);
     console.log('Should be > 1000 for Int16 audio');
   };
   ```

2. **Profile Matching Test**
   ```javascript
   // Test profile discrimination
   const testProfileMatching = () => {
     const noise = generateWhiteNoise();
     const similarity = cosineSimilarity(noise, metronomeTemplate);
     console.log('Noise similarity:', similarity);
     console.log('Should be < 0.5 for good discrimination');
   };
   ```

3. **Gain Test**
   ```javascript
   // Test different gain levels
   const testGainLevels = async () => {
     for (let gain = 10; gain <= 200; gain += 10) {
       detector.updateParams({ audioGain: gain });
       await detector.detectForDuration(1000);
       console.log(`Gain ${gain}x: ${detector.getDetectionCount()} detections`);
     }
   };
   ```

## File Structure
```
puttiq-detection-package/
├── README.md (this file)
├── docs/
│   ├── DETECTION_FLOW.md
│   ├── PROFILE_SYSTEM.md
│   └── DEBUG_LOGS.md
├── src/
│   ├── dsp/
│   │   ├── PutterDetectorExpo.js
│   │   ├── SpectralAnalysis.js
│   │   ├── Biquad.js
│   │   └── DetectorFactory.js
│   ├── profiles/
│   │   ├── ProfileManager.js
│   │   ├── ProfileBuilder.js
│   │   ├── MetronomeTemplateGenerator.js
│   │   └── FirebaseProfileService.js
│   ├── hooks/
│   │   └── usePuttIQDetector.js
│   ├── screens/
│   │   ├── HomeScreen.js
│   │   └── PutterCalibrationScreen.js
│   └── components/
│       └── TimingZoneBar.js
```

## Contact & Support
For questions about this package or the detection system, please refer to the included source code and documentation files.