# Path B Implementation Plan: Expo Dev Client with Native Audio Shim

## Overview
Implement simultaneous speaker playback and microphone recording using Expo Dev Client with a minimal native module for proper iOS/Android audio routing. This keeps a single codebase while enabling production-ready audio capabilities.

## Key Benefits
✅ **Single Codebase**: JavaScript/React Native code remains identical across platforms  
✅ **Production Ready**: True simultaneous speaker + mic on both iOS and Android  
✅ **Echo Cancellation**: Optional AEC/NR for robustness  
✅ **Minimal Native Code**: Just audio session configuration, no app logic  

## Implementation Steps

### Step 1: Migrate from expo-av to expo-audio
```bash
# Remove deprecated expo-av
npm uninstall expo-av

# Install expo-audio (newer, better API)
npx expo install expo-audio
```

**Why expo-audio?**
- Modern replacement for expo-av
- Better recording API
- Works with custom dev clients
- Maintained by Expo team

### Step 2: Set up EAS Build and Dev Client
```bash
# Install expo-dev-client
npx expo install expo-dev-client

# Install EAS CLI globally
npm install -g eas-cli

# Initialize EAS in project
eas init

# Configure build profiles
eas build:configure
```

### Step 3: Create iOS Audio Session Config Plugin

Create `plugins/withIOSAudioSession.js`:
```javascript
const { withInfoPlist, withAppDelegate } = require('@expo/config-plugins');

module.exports = function withIOSAudioSession(config) {
  // Add background audio capability
  config = withInfoPlist(config, (config) => {
    config.modResults.UIBackgroundModes = [
      ...(config.modResults.UIBackgroundModes || []),
      'audio'
    ];
    return config;
  });

  // Configure audio session in AppDelegate
  config = withAppDelegate(config, (config) => {
    const contents = config.modResults.contents;
    
    // Add import
    if (!contents.includes('#import <AVFoundation/AVFoundation.h>')) {
      config.modResults.contents = contents.replace(
        '#import "AppDelegate.h"',
        '#import "AppDelegate.h"\n#import <AVFoundation/AVFoundation.h>'
      );
    }
    
    // Add audio session configuration
    const audioSessionCode = `
  // Configure audio session for simultaneous playback and recording
  AVAudioSession *audioSession = [AVAudioSession sharedInstance];
  NSError *error = nil;
  
  [audioSession setCategory:AVAudioSessionCategoryPlayAndRecord
                withOptions:AVAudioSessionCategoryOptionDefaultToSpeaker |
                           AVAudioSessionCategoryOptionAllowBluetooth
                      error:&error];
  
  [audioSession setMode:AVAudioSessionModeDefault error:&error];
  [audioSession setActive:YES error:&error];
  
  if (error) {
    NSLog(@"Audio Session Error: %@", error.localizedDescription);
  }
`;
    
    // Insert before return YES in didFinishLaunchingWithOptions
    if (!contents.includes('Configure audio session')) {
      config.modResults.contents = contents.replace(
        'return YES;',
        audioSessionCode + '\n  return YES;'
      );
    }
    
    return config;
  });
  
  return config;
};
```

Update `app.json`:
```json
{
  "expo": {
    "plugins": [
      "./plugins/withIOSAudioSession"
    ]
  }
}
```

### Step 4: Option A - Use @cjblack/expo-audio-stream (Recommended)

```bash
npm install @cjblack/expo-audio-stream
```

This package provides:
- Simultaneous playback and recording
- Voice processing capabilities
- Echo cancellation
- Works with Expo Dev Client

### Step 4: Option B - Create Custom Expo Module (More Control)

```bash
# Create a new local Expo module
npx create-expo-module audio-session-manager --local
```

In `modules/audio-session-manager/ios/AudioSessionManager.swift`:
```swift
import ExpoModulesCore
import AVFoundation

public class AudioSessionManager: Module {
  public func definition() -> ModuleDefinition {
    Name("AudioSessionManager")
    
    Function("configureForSimultaneous") { () -> Bool in
      do {
        let session = AVAudioSession.sharedInstance()
        
        try session.setCategory(
          .playAndRecord,
          options: [.defaultToSpeaker, .allowBluetooth]
        )
        
        // Optional: Enable echo cancellation
        try session.setMode(.voiceChat)
        
        try session.setActive(true)
        return true
      } catch {
        print("Failed to configure audio session: \(error)")
        return false
      }
    }
  }
}
```

Android equivalent in `modules/audio-session-manager/android/AudioSessionManager.kt`:
```kotlin
package expo.modules.audiosessionmanager

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import android.media.AudioManager
import android.content.Context

class AudioSessionManager : Module() {
  override fun definition() = ModuleDefinition {
    Name("AudioSessionManager")
    
    Function("configureForSimultaneous") {
      val context = appContext.reactContext ?: return@Function false
      val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
      
      // Enable speaker and mic simultaneously
      audioManager.mode = AudioManager.MODE_NORMAL
      audioManager.isSpeakerphoneOn = true
      
      return@Function true
    }
  }
}
```

### Step 5: Update Audio Service

`services/audioEnhanced.js`:
```javascript
import { Audio } from 'expo-audio';
// Or if using @cjblack/expo-audio-stream:
// import AudioStream from '@cjblack/expo-audio-stream';

// If using custom module:
import AudioSessionManager from '../modules/audio-session-manager';

class EnhancedAudioService {
  constructor() {
    this.metronomeSound = null;
    this.recording = null;
    this.isRecording = false;
  }

  async initialize() {
    // Configure audio session for simultaneous playback/recording
    if (AudioSessionManager) {
      await AudioSessionManager.configureForSimultaneous();
    }
    
    // Load metronome sound
    const { sound } = await Audio.Sound.createAsync(
      require('../assets/sound/metronome-85688.mp3'),
      { shouldPlay: false, volume: 0.5 }
    );
    this.metronomeSound = sound;
  }

  async startRecording() {
    const { granted } = await Audio.requestPermissionsAsync();
    if (!granted) {
      throw new Error('Microphone permission not granted');
    }

    const recording = new Audio.Recording();
    await recording.prepareToRecordAsync({
      android: {
        extension: '.m4a',
        outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_MPEG_4,
        audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_AAC,
        sampleRate: 44100,
        numberOfChannels: 1,
        bitRate: 128000,
      },
      ios: {
        extension: '.m4a',
        outputFormat: Audio.RECORDING_OPTION_IOS_OUTPUT_FORMAT_MPEG4AAC,
        audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
        sampleRate: 44100,
        numberOfChannels: 1,
        bitRate: 128000,
      },
    });

    await recording.startAsync();
    this.recording = recording;
    this.isRecording = true;

    // Start monitoring for hits
    this.startHitDetection();
  }

  async startHitDetection() {
    // Poll recording status for volume levels
    const interval = setInterval(async () => {
      if (!this.isRecording) {
        clearInterval(interval);
        return;
      }

      const status = await this.recording.getStatusAsync();
      if (status.isRecording && status.metering) {
        // Detect volume spike (hit)
        if (status.metering > -10) { // Threshold in dB
          this.onHitDetected(Date.now());
        }
      }
    }, 50); // Check every 50ms
  }

  onHitDetected(timestamp) {
    // Calculate timing accuracy vs metronome
    // This will be called from the main app
  }

  async playMetronomeTick() {
    if (this.metronomeSound) {
      await this.metronomeSound.replayAsync();
    }
  }
}

export default new EnhancedAudioService();
```

### Step 6: Build Configuration

`eas.json`:
```json
{
  "cli": {
    "version": ">= 3.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal"
    },
    "production": {}
  },
  "submit": {
    "production": {}
  }
}
```

### Step 7: Build and Test

```bash
# Build development client for iOS
eas build --platform ios --profile development

# Build development client for Android  
eas build --platform android --profile development

# After build completes, install on device/simulator
# Then run your dev server
npx expo start --dev-client
```

## Timeline Estimate

1. **Day 1-2**: Set up expo-audio, EAS, and dev client
2. **Day 3-4**: Implement config plugin and native module/package
3. **Day 5-6**: Update audio service and integrate hit detection
4. **Day 7**: Test on real devices and fine-tune thresholds

## Testing Checklist

- [ ] iOS: Metronome plays through speaker while recording
- [ ] Android: Metronome plays through speaker while recording  
- [ ] Hit detection responds to putter strikes
- [ ] No echo/feedback loops
- [ ] Bluetooth headphones work (optional)
- [ ] Background audio continues (if needed)
- [ ] Battery usage is reasonable
- [ ] Latency is acceptable (<50ms)

## Fallback Options

If hit detection via continuous recording proves problematic:
1. **Triggered Recording**: Start recording briefly around expected hit time
2. **Amplitude Monitoring**: Use AudioStream's real-time amplitude API
3. **Frequency Analysis**: Detect hit signature via FFT (more complex)

## Resources

- [Expo Audio Documentation](https://docs.expo.dev/versions/latest/sdk/audio/)
- [expo-audio-stream Package](https://www.npmjs.com/package/@cjblack/expo-audio-stream)
- [Creating Expo Modules](https://docs.expo.dev/modules/get-started/)
- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [iOS Audio Session Guide](https://developer.apple.com/library/archive/documentation/Audio/Conceptual/AudioSessionProgrammingGuide/)

## Next Steps

1. Review this plan
2. Choose between @cjblack/expo-audio-stream (easier) or custom module (more control)
3. Begin implementation starting with expo-audio migration
4. Set up EAS and create first development build