import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Platform } from 'react-native';

/**
 * Enhanced Metronome class with precise timing and local audio support
 * Uses performance.now() for accurate scheduling and tick prediction
 */
export class Metronome {
  constructor() {
    this.sound = null;
    this.bpm = 80;
    this.isRunning = false;
    this.nextTickAt = 0; // performance.now() based timing
    this.timer = null;
    this.isLoaded = false;
    this.currentBeat = 0; // Track beat count for detection timing
  }

  /**
   * Load the metronome sound from local assets
   * @returns {Promise<void>}
   */
  async load() {
    try {
      // Configure audio mode with platform-specific settings
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: Platform.OS === 'ios' ? false : true, // iOS: false to use main speaker
        interruptionMode: 'mixWithOthers',
        shouldPlayInBackground: false,
      });

      // Load the local metronome sound using the new API
      this.sound = createAudioPlayer(require('../../assets/sounds/Metronome/ToneClick.mp3'));
      this.sound.volume = 0.7;

      this.isLoaded = true;

      console.log('Metronome loaded successfully');
    } catch (error) {
      console.error('Failed to load metronome sound:', error);
      throw error;
    }
  }

  /**
   * Set the BPM (beats per minute)
   * @param {number} bpm - Target BPM (30-200)
   */
  setBpm(bpm) {
    this.bpm = Math.max(30, Math.min(200, bpm));
  }

  /**
   * Get the current BPM
   * @returns {number}
   */
  getBpm() {
    return this.bpm;
  }

  /**
   * Start the metronome with precise timing
   */
  async start() {
    if (this.isRunning || !this.sound || !this.isLoaded) {
      console.warn('Cannot start metronome:', {
        isRunning: this.isRunning,
        hasSound: !!this.sound,
        isLoaded: this.isLoaded
      });
      return;
    }

    this.isRunning = true;
    this.currentBeat = 0; // Reset beat counter on start
    const period = 60000 / this.bpm; // milliseconds between beats

    // Start first tick after a short delay
    this.nextTickAt = performance.now() + 200;

    // Main timing loop using setInterval for better consistency
    const loop = () => {
      if (!this.isRunning || !this.sound) {
        if (this.timer) {
          clearInterval(this.timer);
          this.timer = null;
        }
        return;
      }

      const now = performance.now();

      // Check if it's time for the next tick
      if (now >= this.nextTickAt) {
        try {
          // Play the tick sound - reset to start and play
          this.sound.seekTo(0);
          this.sound.play();

          // Increment beat counter
          this.currentBeat++;
        } catch (error) {
          console.warn('Failed to play tick:', error);
        }

        // Schedule next tick
        while (this.nextTickAt <= now) {
          this.nextTickAt += period;
        }
      }
    };

    // Use setInterval with a fast check rate
    this.timer = setInterval(loop, 10); // Check every 10ms
    console.log('Metronome started at', this.bpm, 'BPM');
  }

  /**
   * Stop the metronome
   */
  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;

    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    console.log('Metronome stopped');
  }

  /**
   * Get predicted tick times for the next N beats
   * Used for tick guard in hit detection
   * @param {number} count - Number of future ticks to predict
   * @returns {number[]} Array of performance.now() timestamps
   */
  getNextTicks(count = 8) {
    const ticks = [];
    const period = 60000 / this.bpm;
    
    // Start from the next scheduled tick or current time
    let nextTick = this.nextTickAt || performance.now();
    
    for (let i = 0; i < count; i++) {
      ticks.push(nextTick);
      nextTick += period;
    }
    
    return ticks;
  }

  /**
   * Check if a given timestamp is near a metronome tick
   * @param {number} timestamp - performance.now() timestamp to check
   * @param {number} tolerance - Tolerance in milliseconds (default 30ms)
   * @returns {boolean} True if near a tick
   */
  isNearTick(timestamp, tolerance = 30) {
    const ticks = this.getNextTicks(10);
    return ticks.some(tick => Math.abs(timestamp - tick) <= tolerance);
  }

  /**
   * Set the volume of the metronome
   * @param {number} volume - Volume level (0.0 to 1.0)
   */
  async setVolume(volume) {
    if (!this.sound) return;

    try {
      this.sound.volume = Math.max(0, Math.min(1, volume));
    } catch (error) {
      console.warn('Failed to set volume:', error);
    }
  }

  /**
   * Clean up and release resources
   */
  async dispose() {
    this.stop();
    
    if (this.sound) {
      try {
        this.sound.release();
      } catch (error) {
        console.warn('Failed to release sound:', error);
      }
      this.sound = null;
    }
    
    this.isLoaded = false;
    console.log('Metronome disposed');
  }

  /**
   * Get the period between beats in milliseconds
   * @returns {number}
   */
  getPeriod() {
    return 60000 / this.bpm;
  }

  /**
   * Check if metronome is currently running
   * @returns {boolean}
   */
  getIsRunning() {
    return this.isRunning;
  }

  /**
   * Get the current beat count
   * Returns 0 if metronome not running
   * @returns {number}
   */
  getBeatCount() {
    return this.currentBeat;
  }
}

export default Metronome;