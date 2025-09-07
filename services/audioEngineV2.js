import { Audio } from 'expo-av';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';

class AudioEngineV2 {
  constructor() {
    this.player = null;
    this.isInitialized = false;
    this.bpm = 80;
    this.baselineBpm = 80; // The BPM of our audio file
    this.statusCallbacks = [];
    this.isPlaying = false;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Configure audio mode for iOS
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
      });

      console.log('AudioEngineV2 initialized');
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize AudioEngineV2:', error);
    }
  }

  // Load the metronome sound
  async loadSound(soundFile) {
    try {
      const { sound } = await Audio.Sound.createAsync(
        soundFile,
        {
          isLooping: false, // We'll loop manually for single tick
          volume: 0.5,
          shouldPlay: false,
        }
      );
      
      this.player = sound;
      
      // Set up status update callback for timing
      this.player.setOnPlaybackStatusUpdate((status) => {
        this.onStatusUpdate(status);
        
        // If the sound finished playing, replay it (manual loop for single tick)
        if (status.didJustFinish && this.isPlaying) {
          this.player.replayAsync();
        }
      });
      
      console.log('Metronome sound loaded');
      return true;
    } catch (error) {
      console.error('Failed to load sound:', error);
      return false;
    }
  }

  // Start playback
  async start() {
    if (!this.player) {
      console.warn('No audio loaded');
      return;
    }

    try {
      // Set the playback rate based on BPM
      const rate = this.bpm / this.baselineBpm;
      await this.player.setRateAsync(rate, true); // true = pitch correction
      
      // Start playing
      await this.player.playAsync();
      this.isPlaying = true;
      
      console.log(`Started playback at ${this.bpm} BPM (rate: ${rate})`);
    } catch (error) {
      console.error('Failed to start playback:', error);
    }
  }

  // Stop playback
  async stop() {
    if (!this.player) return;

    try {
      await this.player.stopAsync();
      await this.player.setPositionAsync(0); // Reset to beginning
      this.isPlaying = false;
      
      console.log('Stopped playback');
    } catch (error) {
      console.error('Failed to stop playback:', error);
    }
  }

  // Update BPM (changes playback rate)
  async setBPM(newBpm) {
    this.bpm = newBpm;
    
    if (this.player && this.isPlaying) {
      try {
        const rate = this.bpm / this.baselineBpm;
        await this.player.setRateAsync(rate, true);
        console.log(`Updated BPM to ${newBpm} (rate: ${rate})`);
      } catch (error) {
        console.error('Failed to update playback rate:', error);
      }
    }
  }

  // Get current playback position (0-1)
  async getPosition() {
    if (!this.player) return 0;

    try {
      const status = await this.player.getStatusAsync();
      if (status.isLoaded && status.durationMillis > 0) {
        return status.positionMillis / status.durationMillis;
      }
    } catch (error) {
      console.error('Failed to get position:', error);
    }
    
    return 0;
  }

  // Register a callback for status updates
  onStatusChange(callback) {
    this.statusCallbacks.push(callback);
    return () => {
      this.statusCallbacks = this.statusCallbacks.filter(cb => cb !== callback);
    };
  }

  // Internal status update handler
  onStatusUpdate(status) {
    if (status.isLoaded) {
      // Calculate phase based on loop duration
      const loopDuration = status.durationMillis;
      const currentTime = status.positionMillis;
      const phase = currentTime / loopDuration;
      
      // Notify all callbacks
      this.statusCallbacks.forEach(cb => {
        cb({
          isPlaying: status.isPlaying,
          currentTime: currentTime / 1000, // Convert to seconds
          duration: loopDuration / 1000,
          phase: phase,
          rate: status.rate || 1,
          bpm: this.bpm,
        });
      });
    }
  }

  // Cleanup
  async unload() {
    if (this.player) {
      try {
        await this.player.stopAsync();
        await this.player.unloadAsync();
        this.player = null;
        this.isPlaying = false;
      } catch (error) {
        console.error('Failed to unload audio:', error);
      }
    }
  }
}

export default new AudioEngineV2();