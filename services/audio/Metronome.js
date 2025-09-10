import { Audio } from 'expo-av';

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
  }

  /**
   * Load the metronome sound from local assets
   * @returns {Promise<void>}
   */
  async load() {
    try {
      // Configure audio mode for simultaneous playback and recording
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        interruptionModeIOS: 1, // Use numeric value: 1 = DO_NOT_MIX
        shouldDuckAndroid: true,
        staysActiveInBackground: false,
        allowsRecordingIOS: true, // Important: allow recording while playing
        playThroughEarpieceAndroid: false,
      });

      // Load the local metronome sound
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sound/metronome-85688.mp3'),
        { 
          volume: 0.7,
          shouldPlay: false,
          isLooping: false,
        }
      );

      this.sound = sound;
      this.isLoaded = true;
      
      // Preload the sound for instant playback
      await this.sound.setStatusAsync({ shouldPlay: false });
      
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
    const period = 60000 / this.bpm; // milliseconds between beats
    
    // Start first tick after a short delay
    this.nextTickAt = performance.now() + 200;

    // Main timing loop using requestAnimationFrame for precision
    const loop = async () => {
      if (!this.isRunning || !this.sound) return;

      const now = performance.now();
      
      // Check if it's time for the next tick (with 5ms tolerance)
      if (now >= this.nextTickAt - 5) {
        try {
          // Play the tick sound
          await this.sound.replayAsync();
        } catch (error) {
          console.warn('Failed to play tick:', error);
        }
        
        // Schedule next tick
        this.nextTickAt += period;
        
        // Prevent drift by resetting if we're too far behind
        if (now > this.nextTickAt + period) {
          this.nextTickAt = now + period;
        }
      }

      // Continue the loop
      this.timer = requestAnimationFrame(loop);
    };

    // Start the loop
    this.timer = requestAnimationFrame(loop);
    console.log('Metronome started at', this.bpm, 'BPM');
  }

  /**
   * Stop the metronome
   */
  stop() {
    if (!this.isRunning) return;

    this.isRunning = false;
    
    if (this.timer) {
      cancelAnimationFrame(this.timer);
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
      await this.sound.setVolumeAsync(Math.max(0, Math.min(1, volume)));
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
        await this.sound.unloadAsync();
      } catch (error) {
        console.warn('Failed to unload sound:', error);
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
}

export default Metronome;