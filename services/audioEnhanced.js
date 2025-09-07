import { Audio } from 'expo-av';
import AudioStream from '@cjblack/expo-audio-stream';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

class EnhancedAudioService {
  constructor() {
    this.metronomeSound = null;
    this.isRecording = false;
    this.soundEnabled = true;
    this.hapticEnabled = false;
    this.hitDetectionEnabled = false;
    this.hitDetectionCallback = null;
    this.lastHitTime = 0;
    this.hitThreshold = -15; // dB threshold for hit detection
    this.beatTimes = []; // Store beat times for accuracy calculation
    this.isInitialized = false;
    this.audioStreamStarted = false;
  }

  async initialize() {
    try {
      // Load preferences
      const savedSoundSetting = await AsyncStorage.getItem('soundEnabled');
      this.soundEnabled = savedSoundSetting !== 'false';
      
      const savedHapticSetting = await AsyncStorage.getItem('hapticEnabled');
      this.hapticEnabled = savedHapticSetting === 'true';

      // Configure audio mode for simultaneous playback and recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
        // These options help with speaker output during recording
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      });

      // Preload metronome sound
      if (Platform.OS !== 'web') {
        const { sound } = await Audio.Sound.createAsync(
          require('../assets/sound/metronome-85688.mp3'),
          { 
            shouldPlay: false,
            volume: 0.7 // Increase volume for better audibility
          }
        );
        this.metronomeSound = sound;
        console.log('Enhanced audio service: Metronome sound preloaded');
      }

      // Initialize AudioStream for microphone monitoring
      try {
        await AudioStream.initRecording({
          sampleRate: 44100,
          channels: 1,
          bitsPerSample: 16,
          audioSource: 6, // MIC source
          wavFile: false, // We don't need to save files
        });
        console.log('AudioStream initialized for microphone monitoring');
      } catch (streamError) {
        console.log('AudioStream initialization failed (normal in Expo Go):', streamError);
      }

      this.isInitialized = true;
      console.log('Enhanced audio service initialized');
    } catch (error) {
      console.error('Error initializing enhanced audio service:', error);
    }
  }

  // Start microphone monitoring for hit detection
  async startHitDetection(callback) {
    if (!this.isInitialized) {
      console.warn('Audio service not initialized');
      return false;
    }

    try {
      // Request microphone permissions
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        console.error('Microphone permission not granted');
        return false;
      }

      this.hitDetectionCallback = callback;
      this.hitDetectionEnabled = true;

      // Start audio stream for real-time monitoring
      await AudioStream.startRecording();
      this.audioStreamStarted = true;
      
      // Set up listener for audio data
      AudioStream.on('data', (data) => {
        if (!this.hitDetectionEnabled) return;
        
        // Parse audio data for volume/amplitude
        const amplitude = this.calculateAmplitude(data);
        const dB = this.amplitudeToDecibels(amplitude);
        
        // Detect hit if above threshold
        if (dB > this.hitThreshold) {
          const now = Date.now();
          // Debounce - ignore hits within 200ms of each other
          if (now - this.lastHitTime > 200) {
            this.lastHitTime = now;
            this.onHitDetected(now);
          }
        }
      });

      console.log('Hit detection started');
      return true;
    } catch (error) {
      console.error('Error starting hit detection:', error);
      return false;
    }
  }

  // Stop microphone monitoring
  async stopHitDetection() {
    this.hitDetectionEnabled = false;
    
    if (this.audioStreamStarted) {
      try {
        await AudioStream.stopRecording();
        this.audioStreamStarted = false;
        console.log('Hit detection stopped');
      } catch (error) {
        console.error('Error stopping hit detection:', error);
      }
    }
  }

  // Calculate amplitude from audio data
  calculateAmplitude(audioData) {
    if (!audioData || audioData.length === 0) return 0;
    
    // Convert base64 to byte array if needed
    let samples = audioData;
    if (typeof audioData === 'string') {
      // Base64 decode
      const binaryString = atob(audioData);
      samples = new Int16Array(binaryString.length / 2);
      for (let i = 0; i < binaryString.length; i += 2) {
        samples[i / 2] = (binaryString.charCodeAt(i + 1) << 8) | binaryString.charCodeAt(i);
      }
    }
    
    // Calculate RMS (Root Mean Square) amplitude
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    const rms = Math.sqrt(sum / samples.length);
    
    // Normalize to 0-1 range
    return rms / 32768.0;
  }

  // Convert amplitude to decibels
  amplitudeToDecibels(amplitude) {
    if (amplitude === 0) return -100;
    return 20 * Math.log10(amplitude);
  }

  // Called when a hit is detected
  onHitDetected(timestamp) {
    console.log('🎯 Hit detected at:', timestamp);
    
    // Calculate timing accuracy if we have beat times
    let accuracy = null;
    if (this.beatTimes.length > 0) {
      // Find closest beat time
      let closestBeat = this.beatTimes[0];
      let minDiff = Math.abs(timestamp - closestBeat);
      
      for (const beatTime of this.beatTimes) {
        const diff = Math.abs(timestamp - beatTime);
        if (diff < minDiff) {
          minDiff = diff;
          closestBeat = beatTime;
        }
      }
      
      // Calculate accuracy percentage (perfect = 100%, off by 500ms = 0%)
      accuracy = Math.max(0, 100 - (minDiff / 5));
      
      // Remove old beat times (older than 2 seconds)
      this.beatTimes = this.beatTimes.filter(t => timestamp - t < 2000);
    }
    
    // Trigger callback with hit data
    if (this.hitDetectionCallback) {
      this.hitDetectionCallback({
        timestamp,
        accuracy,
        timingDiff: accuracy !== null ? minDiff : null
      });
    }
    
    // Optional haptic feedback for hit
    if (this.hapticEnabled && Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  }

  // Record beat time for accuracy calculation
  recordBeatTime(timestamp) {
    this.beatTimes.push(timestamp);
    // Keep only recent beat times (last 10 beats)
    if (this.beatTimes.length > 10) {
      this.beatTimes.shift();
    }
  }

  // Play metronome tick
  async playTick() {
    if (!this.soundEnabled) return;
    
    try {
      const now = Date.now();
      this.recordBeatTime(now);
      
      console.log('🔊 TICK');
      
      // Haptic feedback
      if (this.hapticEnabled && Platform.OS !== 'web') {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      // Play sound
      if (this.metronomeSound && Platform.OS !== 'web') {
        await this.metronomeSound.replayAsync();
      }
    } catch (error) {
      console.error('Error playing tick:', error);
    }
  }

  // Play success sound
  async playSuccess() {
    if (!this.soundEnabled) return;
    
    console.log('🎯 SUCCESS');
    
    if (this.hapticEnabled && Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }

  // Play miss sound
  async playMiss() {
    if (!this.soundEnabled) return;
    
    console.log('❌ MISS');
    
    if (this.hapticEnabled && Platform.OS !== 'web') {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
  }

  // Toggle sound
  async toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    await AsyncStorage.setItem('soundEnabled', String(this.soundEnabled));
    return this.soundEnabled;
  }

  // Toggle haptic
  async toggleHaptic() {
    this.hapticEnabled = !this.hapticEnabled;
    await AsyncStorage.setItem('hapticEnabled', String(this.hapticEnabled));
    return this.hapticEnabled;
  }

  // Set hit detection threshold
  setHitThreshold(threshold) {
    this.hitThreshold = threshold;
  }

  // Cleanup
  async cleanup() {
    // Stop hit detection
    await this.stopHitDetection();
    
    // Unload sounds
    if (this.metronomeSound) {
      await this.metronomeSound.unloadAsync();
      this.metronomeSound = null;
    }
    
    this.isInitialized = false;
  }
}

export default new EnhancedAudioService();