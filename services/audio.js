import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Haptics from 'expo-haptics';

class AudioService {
  constructor() {
    this.sounds = {};
    this.isInitialized = false;
    this.soundEnabled = true;
    this.hapticEnabled = false;  // Disabled by default
    this.audioContext = null;
    this.tickSound = null;
    this.soundObject = null;  // Store the preloaded sound
  }

  async initialize() {
    try {
      // Load sound preference
      const savedSoundSetting = await AsyncStorage.getItem('soundEnabled');
      this.soundEnabled = savedSoundSetting !== 'false';
      
      const savedHapticSetting = await AsyncStorage.getItem('hapticEnabled');
      this.hapticEnabled = savedHapticSetting === 'true'; // false by default

      // Initialize Web Audio API for web platform
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) {
          this.audioContext = new AudioContext();
        }
      }
      
      // Pre-load the tick sound for native platforms
      if (Platform.OS !== 'web') {
        try {
          // Set audio mode for iOS
          await Audio.setAudioModeAsync({
            playsInSilentModeIOS: true,
            staysActiveInBackground: false,
            shouldDuckAndroid: true,
          });
          
          // Preload the metronome sound
          const { sound } = await Audio.Sound.createAsync(
            require('../assets/sound/metronome-85688.mp3'),
            { shouldPlay: false }
          );
          this.soundObject = sound;
          console.log('Metronome sound preloaded successfully');
        } catch (err) {
          console.log('Could not preload sound:', err);
        }
      }
      
      this.isInitialized = true;
      console.log('Audio service initialized');
    } catch (error) {
      console.error('Error initializing audio:', error);
    }
  }

  // Create a simple click sound
  createClickSound() {
    if (!this.audioContext) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);
    
    // Click sound parameters
    oscillator.frequency.value = 1000; // 1000 Hz
    oscillator.type = 'sine';
    
    // Quick envelope for click
    const now = this.audioContext.currentTime;
    gainNode.gain.setValueAtTime(0.3, now);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    
    oscillator.start(now);
    oscillator.stop(now + 0.1);
  }

  // Create a tick sound using Audio API
  async playTick() {
    if (!this.soundEnabled) return;
    
    try {
      console.log('🔊 TICK');
      
      // Optional haptic feedback (disabled by default)
      if (this.hapticEnabled && (Platform.OS === 'ios' || Platform.OS === 'android')) {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
      
      // Use Web Audio API for web platform
      if (Platform.OS === 'web' && this.audioContext) {
        this.createClickSound();
        return;
      }
      
      // For native platforms, play the preloaded sound
      if (Platform.OS !== 'web') {
        try {
          if (this.soundObject) {
            // Use preloaded sound for better performance
            await this.soundObject.replayAsync();
          } else {
            // Fallback: create and play the metronome sound
            const { sound } = await Audio.Sound.createAsync(
              require('../assets/sound/metronome-85688.mp3'),
              { shouldPlay: true, volume: 0.5 }
            );
            
            // Clean up after playing
            setTimeout(async () => {
              await sound.unloadAsync();
            }, 300);
          }
        } catch (soundError) {
          console.log('Sound playback failed:', soundError);
        }
      }
    } catch (error) {
      console.log('Error playing tick:', error);
    }
  }

  // Play success sound
  async playSuccess() {
    if (!this.soundEnabled) return;
    
    try {
      console.log('🎯 SUCCESS SOUND');
      
      // Optional haptic feedback (disabled by default)
      if (this.hapticEnabled && (Platform.OS === 'ios' || Platform.OS === 'android')) {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success
        );
      }
    } catch (error) {
      console.error('Error playing success sound:', error);
    }
  }

  // Play error/miss sound  
  async playMiss() {
    if (!this.soundEnabled) return;
    
    try {
      console.log('❌ MISS SOUND');
      
      // Optional haptic feedback (disabled by default)
      if (this.hapticEnabled && (Platform.OS === 'ios' || Platform.OS === 'android')) {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Warning
        );
      }
    } catch (error) {
      console.error('Error playing miss sound:', error);
    }
  }

  // Toggle sound on/off
  async toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    await AsyncStorage.setItem('soundEnabled', String(this.soundEnabled));
    return this.soundEnabled;
  }

  // Clean up
  async cleanup() {
    // Unload preloaded sound
    if (this.soundObject) {
      await this.soundObject.unloadAsync();
      this.soundObject = null;
    }
    
    // Unload all other sounds
    for (const key in this.sounds) {
      if (this.sounds[key]) {
        await this.sounds[key].unloadAsync();
      }
    }
    this.sounds = {};
  }
}

export default new AudioService();