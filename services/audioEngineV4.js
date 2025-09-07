import { Audio } from 'expo-av';

class AudioEngineV4 {
  constructor() {
    this.soundPool = [];
    this.currentSoundIndex = 0;
    this.isInitialized = false;
    this.isPlaying = false;
    this.bpm = 80;
    this.startTime = null;
    this.beatCount = 0;
    this.nextBeatTimeout = null;
    this.statusCallbacks = [];
    this.poolSize = 3; // Use 3 sound instances for rotation
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

      // Create a pool of sound instances to avoid async delays
      for (let i = 0; i < this.poolSize; i++) {
        const { sound } = await Audio.Sound.createAsync(
          require('../assets/sound/metronome-85688.mp3'),
          {
            volume: 0.5,
            shouldPlay: false,
          }
        );
        this.soundPool.push(sound);
      }
      
      this.isInitialized = true;
      console.log('AudioEngineV4 initialized with sound pool');
    } catch (error) {
      console.error('Failed to initialize AudioEngineV4:', error);
    }
  }

  // Play next tick from the pool
  async playTick() {
    if (this.soundPool.length === 0) return;
    
    try {
      // Get the next sound in rotation
      const sound = this.soundPool[this.currentSoundIndex];
      
      // Play from the beginning (replay is faster than stop+setPosition+play)
      await sound.replayAsync();
      
      // Move to next sound in pool
      this.currentSoundIndex = (this.currentSoundIndex + 1) % this.poolSize;
    } catch (error) {
      console.error('Failed to play tick:', error);
    }
  }

  // Schedule next beat with drift compensation
  scheduleNextBeat() {
    if (!this.isPlaying) return;

    const beatInterval = 60000 / this.bpm;
    
    // Calculate when the next beat should occur (drift-compensated)
    const nextBeatTime = this.startTime + ((this.beatCount + 1) * beatInterval);
    const now = Date.now();
    const delay = nextBeatTime - now;

    // If we're running behind, play immediately
    if (delay <= 0) {
      this.playBeat();
    } else {
      // Schedule the next beat precisely
      this.nextBeatTimeout = setTimeout(() => {
        this.playBeat();
      }, delay);
    }
  }

  // Play a beat and schedule the next one
  playBeat() {
    if (!this.isPlaying) return;

    // Play the tick sound
    this.playTick();
    
    // Update beat count
    this.beatCount++;
    
    // Notify callbacks with precise timing info
    this.notifyCallbacks();
    
    // Schedule the next beat
    this.scheduleNextBeat();
  }

  // Start the metronome
  async start() {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    this.startTime = Date.now();
    this.beatCount = 0;
    
    // Play first beat immediately
    this.playBeat();
    
    console.log(`Started metronome at ${this.bpm} BPM with drift compensation`);
  }

  // Stop the metronome
  async stop() {
    this.isPlaying = false;
    
    // Clear any pending beat
    if (this.nextBeatTimeout) {
      clearTimeout(this.nextBeatTimeout);
      this.nextBeatTimeout = null;
    }
    
    // Stop all sounds in the pool
    for (const sound of this.soundPool) {
      try {
        await sound.stopAsync();
      } catch (error) {
        // Ignore errors when stopping
      }
    }
    
    this.startTime = null;
    this.beatCount = 0;
    
    // Notify callbacks that we've stopped
    this.notifyCallbacks();
    
    console.log('Stopped metronome');
  }

  // Update BPM
  async setBPM(newBpm) {
    this.bpm = newBpm;
    
    // If playing, restart with new BPM to avoid complex recalculation
    if (this.isPlaying) {
      await this.stop();
      await this.start();
    }
  }

  // Get precise audio time
  getAudioTime() {
    if (!this.isPlaying || !this.startTime) return 0;
    return (Date.now() - this.startTime) / 1000;
  }

  // Get the exact timestamp of a specific beat
  getBeatTimestamp(beatNumber) {
    if (!this.startTime) return 0;
    const beatInterval = 60000 / this.bpm;
    return this.startTime + (beatNumber * beatInterval);
  }

  // Register a callback for status updates
  onStatusChange(callback) {
    this.statusCallbacks.push(callback);
    return () => {
      this.statusCallbacks = this.statusCallbacks.filter(cb => cb !== callback);
    };
  }

  // Notify all callbacks with precise timing
  notifyCallbacks() {
    const audioTime = this.getAudioTime();
    const beatInterval = 60 / this.bpm; // in seconds
    const nextBeatTime = this.beatCount * beatInterval;
    
    this.statusCallbacks.forEach(cb => {
      cb({
        isPlaying: this.isPlaying,
        audioTime,
        beatCount: this.beatCount,
        bpm: this.bpm,
        startTime: this.startTime,
        nextBeatTime,
        beatTimestamp: this.getBeatTimestamp(this.beatCount),
      });
    });
  }

  // Cleanup
  async unload() {
    await this.stop();
    
    // Unload all sounds in the pool
    for (const sound of this.soundPool) {
      try {
        await sound.unloadAsync();
      } catch (error) {
        // Ignore errors when unloading
      }
    }
    
    this.soundPool = [];
    this.isInitialized = false;
  }
}

export default new AudioEngineV4();