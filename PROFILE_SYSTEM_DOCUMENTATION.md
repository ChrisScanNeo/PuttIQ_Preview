# PuttIQ Profile System Documentation

## Overview
The PuttIQ Profile System uses machine learning-inspired spectral analysis to create personalized sound profiles for accurate putt detection while filtering out unwanted noise like metronome ticks.

---

## 🎯 System Architecture

### Core Components

1. **ProfileManager** (`/services/profiles/ProfileManager.js`)
   - Singleton service managing all profiles
   - Integrates with Firebase for cloud storage
   - Maintains enabled/disabled states
   - Performs real-time spectrum matching

2. **ProfileBuilder** (`/services/profiles/ProfileBuilder.js`)
   - Creates profiles from audio recordings
   - Computes FFT spectral features
   - Averages multiple samples for robustness
   - Assesses profile quality metrics

3. **SpectralAnalysis** (`/services/dsp/SpectralAnalysis.js`)
   - FFT computation (128-bin spectrum)
   - Cosine similarity matching
   - Template normalization
   - Spectral feature extraction

4. **RecordingManager** (`/services/audio/RecordingManager.js`)
   - Handles expo-av audio recording
   - 1-second timed recordings
   - Feature extraction from recordings
   - Audio data processing

---

## 📱 User Workflow

### Creating a Putter Profile (Countdown Method)

1. **Start Calibration**
   - User taps "10-PUTT COUNTDOWN" button
   - App requests microphone permissions
   - Instructions displayed on screen

2. **Recording Process** (Per Putt)
   - 2-second preparation phase
   - 3-2-1 visual countdown with audio beeps
   - "PUTT NOW!" indicator appears
   - 1-second recording window captures putt sound
   - Success confirmation (sound + haptic)
   - Progress updates (1/10, 2/10, etc.)

3. **Profile Generation**
   - All 10 recordings processed
   - Spectral features extracted (FFT)
   - Templates averaged for consistency
   - Profile saved to Firebase
   - Ready for immediate use

### Profile Types

| Type | Icon | Purpose | Priority |
|------|------|---------|----------|
| **Target** | 🎯 | Sounds to detect (your putter) | Lower |
| **Ignore** | 🔇 | Sounds to filter (metronome, noise) | Higher |

**Detection Priority**: Ignore profiles are checked first. If a sound matches an ignore profile, it's filtered out immediately.

---

## 🔬 Technical Implementation

### Recording Pipeline
```
1. Audio Recording (1 second @ 16kHz)
   ↓
2. Peak Detection (find impact location)
   ↓
3. Window Extraction (512 samples around peak)
   ↓
4. FFT Computation (128-bin spectrum)
   ↓
5. Template Normalization
   ↓
6. Profile Storage (base64 encoded)
```

### Detection Pipeline
```
1. Live Audio Stream
   ↓
2. Frame Processing (256 samples/frame)
   ↓
3. Energy Threshold Check
   ↓
4. Spectrum Extraction (FFT)
   ↓
5. Profile Matching:
   - Check IGNORE profiles → Filter if match
   - Check TARGET profiles → Detect if match
   ↓
6. Action (detect putt or ignore)
```

### Spectral Matching Algorithm

```javascript
// Cosine Similarity (0-1 range)
similarity = dotProduct(spectrum1, spectrum2) / (magnitude1 * magnitude2)

// Detection Decision
if (similarity >= profile.threshold) {
  // Match found!
  if (profile.type === 'ignore') {
    // Filter out this sound
  } else if (profile.type === 'target') {
    // Valid putt detected!
  }
}
```

**Default Thresholds**:
- Target profiles: 70-75% similarity
- Ignore profiles: 75-80% similarity

---

## 📊 Profile Data Structure

```javascript
{
  id: "calibrated_1757503849525",
  name: "My Putter (Countdown)",
  kind: "target",              // or "ignore"
  template: Float32Array(128), // FFT spectrum
  threshold: 0.75,             // 75% similarity required
  enabled: true,
  metadata: {
    calibrationPutts: 10,
    recordingMethod: "countdown",
    createdAt: 1757503849525,
    confidenceScore: 0.85
  }
}
```

---

## 🎮 Profile Management UI

### ProfileManagerScreen Features
- **Version Badge**: Shows current system version
- **Profile List**: Displays all profiles with:
  - Name and type (target/ignore)
  - Enable/disable toggle
  - Threshold percentage
  - Delete button (custom only)
- **Action Buttons**:
  - 🎯 10-PUTT COUNTDOWN - Create new profile
  - 🧪 Test Detection - Verify profiles work
  - 🗑️ Clear All Profiles - Reset system

### Visual Indicators
- Green (🎯) = Target profiles
- Orange (🔇) = Ignore profiles
- Switch = Enable/disable
- Percentage = Detection threshold

---

## 🔧 Configuration & Tuning

### Adjustable Parameters

1. **Detection Threshold** (0.0-1.0)
   - Lower = More sensitive (more false positives)
   - Higher = Less sensitive (might miss putts)
   - Default: 0.70-0.75

2. **Refractory Period** (ms)
   - Time to ignore after detection
   - Prevents double-counting
   - Default: 500ms

3. **Energy Threshold**
   - Minimum sound level to process
   - Filters ambient noise
   - Default: Dynamic baseline × 6

### Performance Optimization

- **Spectral Resolution**: 128 bins (good balance)
- **Sample Rate**: 16kHz (adequate for impact sounds)
- **Frame Size**: 256 samples (16ms latency)
- **Window Size**: 512 samples (32ms around impact)

---

## 🐛 Troubleshooting

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| No putts detected | Profile threshold too high | Lower threshold to 60-65% |
| Too many false detections | Threshold too low | Increase to 75-80% |
| Metronome interfering | Ignore profile disabled | Enable metronome profiles |
| Profile not saving | Firebase connection | Check internet, retry save |
| Recording fails | No microphone permission | Grant permission in settings |

### Debug Mode Features
- Real-time energy display
- Similarity scores shown
- Profile match indicators
- Console logging available

---

## 🚀 Advanced Features

### Multi-Profile Support
- Create multiple putter profiles
- Different clubs/putters
- Practice vs. competition profiles
- Guest profiles for friends

### Profile Sharing (Future)
- Export profiles as JSON
- Share with other users
- Cloud backup/restore
- Profile marketplace

### Adaptive Learning (Future)
- Profile improvement over time
- Automatic threshold adjustment
- Noise profile learning
- Environmental adaptation

---

## 📈 Testing Your Profile

### With Metronome
1. Enable your putter profile (target)
2. Enable metronome profiles (ignore)
3. Start metronome at desired BPM
4. Make practice putts
5. Verify:
   - ✅ Putts are detected
   - ✅ Metronome ticks ignored
   - ✅ No false positives

### Test Metrics
- **Detection Rate**: Should be >95% for your putter
- **False Positive Rate**: Should be <5%
- **Metronome Rejection**: Should be 100%
- **Latency**: <50ms from impact to detection

---

## 🔐 Privacy & Security

- **Local First**: Profiles processed on device
- **Encrypted Storage**: Firebase security rules
- **No Audio Upload**: Recordings stay on device
- **User Control**: Delete profiles anytime
- **Anonymous IDs**: No personal data in profiles

---

## 📝 Version History

### v3.0-COUNTDOWN (Current)
- Countdown-based recording (3-2-1-RECORD)
- Guaranteed 10-putt capture
- Fixed spectral template issues
- Improved profile persistence

### v2.x-EXTREME
- Ultra-sensitive detection attempts
- Threshold experiments (0.00005)
- Detection flow fixes

### v1.x
- Initial profile system
- 30-second recording
- Basic FFT implementation

---

## 🎯 Quick Start Guide

1. **Create Your Profile**:
   ```
   Profile Manager → 10-PUTT COUNTDOWN → Follow countdown → Make 10 putts
   ```

2. **Enable Profiles**:
   ```
   ✅ Your putter (target)
   ✅ Metronome sounds (ignore)
   ```

3. **Start Practice**:
   ```
   Home Screen → Start Metronome → Practice putting
   ```

4. **Monitor Performance**:
   ```
   Profile Manager → Test Detection → See real-time results
   ```

---

## 💡 Best Practices

1. **Recording Environment**
   - Quiet room for calibration
   - Consistent putting surface
   - Phone 0.5-1.5m from ball
   - Natural putting rhythm

2. **Profile Maintenance**
   - Re-calibrate if changing putters
   - Update after major app updates
   - Test regularly with Test Detection
   - Keep 1-2 backup profiles

3. **Optimal Settings**
   - Target threshold: 70-75%
   - Ignore threshold: 75-80%
   - All metronome profiles enabled
   - Test before practice sessions

---

## 🤝 Support

For issues or questions:
1. Check Troubleshooting section above
2. Use Test Detection to diagnose
3. Clear and recreate profiles if needed
4. Report bugs via GitHub Issues

---

*Last Updated: December 2024*
*Version: 3.0-COUNTDOWN*