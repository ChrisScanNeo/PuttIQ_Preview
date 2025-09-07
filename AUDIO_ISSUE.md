# React Native/Expo Audio Issue - Speaker Playback While Recording

## Problem Description
We're building a React Native app using Expo that needs to:
1. Play metronome sounds through the device speaker
2. Simultaneously listen to the microphone for audio input (to detect putting hits)
3. Keep everything in React Native/Expo (no native iOS/Android specific code)

## Current Setup
- **Framework:** React Native with Expo SDK 53
- **Audio Library:** expo-av (deprecated in SDK 54 but currently working)
- **Platform:** Cross-platform (iOS and Android)
- **Development Environment:** GitHub Codespaces

## The Issue
When trying to use both audio playback (metronome sound) and microphone recording simultaneously in React Native/Expo:
- iOS doesn't allow playing audio through the main speaker while the microphone is active
- The audio gets routed to the earpiece instead of the speaker
- This makes the metronome too quiet for the golf putting practice use case

## Current Audio Configuration
```javascript
// From services/audio.js
await Audio.setAudioModeAsync({
  allowsRecordingIOS: false,  // Currently false since we're not recording yet
  playsInSilentModeIOS: true,
  staysActiveInBackground: false,
  shouldDuckAndroid: false,
});
```

## What We Need
1. Play metronome tick sounds at regular intervals (60-100 BPM) through the main speaker
2. Monitor microphone input to detect volume spikes (putter hitting ball)
3. Calculate timing accuracy between metronome beat and detected hit
4. All within React Native/Expo ecosystem (no ejecting or native modules)

## Constraints
- Must work in Expo Go for development/testing
- Prefer not to eject to bare React Native
- Need cross-platform solution (iOS and Android)
- App is used in landscape mode for golf stance

## Questions for Solution
1. Is there a way to configure expo-av or another Expo-compatible library to allow speaker playback while recording?
2. Are there alternative approaches to detect putting hits without continuous microphone recording?
3. Could we use intermittent recording (brief recording windows) around expected hit times?
4. Is there a different audio library that handles this use case better while staying in Expo?

## Code Context
The app is a putting rhythm trainer that:
- Shows a visual metronome bar moving back and forth
- Plays audio ticks at the endpoints
- Needs to detect when the user hits the ball
- Provides timing accuracy feedback

## What We've Tried
- Using expo-av for audio playback (works fine alone)
- Haven't implemented microphone detection yet due to this known limitation
- Considering alternatives but want to stay in React Native/Expo ecosystem

## Ideal Solution Requirements
- Works in Expo managed workflow
- Allows simultaneous speaker output and microphone input
- Cross-platform (iOS and Android)
- Good performance for real-time audio detection
- Minimal battery drain

Please provide guidance on the best approach to handle this audio routing issue while keeping the solution within React Native/Expo.