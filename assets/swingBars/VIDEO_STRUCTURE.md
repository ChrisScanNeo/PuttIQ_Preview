# PuttIQ Video File Organization

## Platform-Specific Video Formats

### iOS: QuickTime (.mov)
- **Format:** QuickTime Movie (.mov)
- **Codec:** H.264 recommended
- **Why:** Native iOS format with best performance and quality

### Android: WebM (.webm)
- **Format:** WebM container (.webm)
- **Codec:** VP8 or VP9 recommended
- **Why:** Optimized for Android with smaller file sizes

## Directory Structure

```
assets/swingBars/
├── ios/                    # iOS-specific videos (.mov)
│   ├── tones/
│   │   ├── Tones_70BPM.mov
│   │   ├── Tones_71BPM.mov
│   │   └── ... (up to 80BPM)
│   ├── beats/
│   │   ├── Beats_70BPM.mov
│   │   ├── Beats_71BPM.mov
│   │   └── ... (up to 80BPM)
│   └── wind/
│       ├── Wind_70BPM.mov
│       ├── Wind_71BPM.mov
│       └── ... (up to 80BPM)
│
└── android/                # Android-specific videos (.webm)
    ├── tones/
    │   ├── Tones_70BPM.webm
    │   ├── Tones_71BPM.webm
    │   └── ... (up to 80BPM)
    ├── beats/
    │   ├── Beats_70BPM.webm
    │   ├── Beats_71BPM.webm
    │   └── ... (up to 80BPM)
    └── wind/
        ├── Wind_70BPM.webm
        ├── Wind_71BPM.webm
        └── ... (up to 80BPM)
```

## File Naming Convention

**Pattern:** `{SoundType}_{BPM}BPM.{extension}`

- `{SoundType}`: "Tones", "Beats", or "Wind" (capitalize first letter)
- `{BPM}`: Number from 70-80
- `{extension}`: .mov for iOS, .webm for Android

**Examples:**
- iOS: `Tones_75BPM.mov`
- Android: `Beats_78BPM.webm`

## Total Files Required

- **3 sound types** × **11 BPM values** (70-80) × **2 platforms** = **66 total video files**
  - 33 .mov files for iOS
  - 33 .webm files for Android

## Build Optimization

### Why Platform-Specific Videos Matter

1. **App Size:** React Native bundles ALL required assets into the app
   - Using only MP4 = one video per BPM
   - Using .mov + .webm = platform gets only its optimized format

2. **Performance:**
   - iOS: .mov files play natively without conversion
   - Android: .webm files are smaller and more efficient

3. **Quality:**
   - Each platform gets its optimal codec
   - No quality loss from format conversions

### Build Process

When building with EAS:
- **iOS build:** Only includes files from `ios/` folders
- **Android build:** Only includes files from `android/` folders

The app automatically selects the correct video based on:
1. Platform detection (`Platform.OS`)
2. Current BPM setting (70-80)
3. Selected sound type (tone/beat/wind)

## Export Settings Guide

### From Video Editor to iOS (.mov)

**QuickTime Export Settings:**
- Container: QuickTime (.mov)
- Video Codec: H.264
- Audio Codec: AAC
- Frame Rate: Match source (typically 30 or 60 fps)
- Resolution: 1920×1080 or source resolution
- Quality: High/Best

### From Video Editor to Android (.webm)

**WebM Export Settings:**
- Container: WebM
- Video Codec: VP9 (preferred) or VP8
- Audio Codec: Opus (preferred) or Vorbis
- Frame Rate: Match source
- Resolution: 1920×1080 or source resolution
- Bitrate: 2-4 Mbps for good quality

## Implementation in Code

The app uses platform detection to load the correct videos:

```javascript
import { Platform } from 'react-native';

const videoMap = Platform.OS === 'ios' ? videoMapIOS : videoMapAndroid;
```

This ensures each platform only loads and uses its optimized video format.