import { Audio } from 'expo-av';

class AudioEngineV3 {
  constructor() {
    this.sound = null;
    this.isInitialized = false;
    this.isPlaying = false;
    this.bpm = 80;
    this.beatInterval = null;
    this.startTime = null;
    this.beatCount = 0;
    this.statusCallbacks = [];
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

      // Load the metronome sound
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/sound/metronome-85688.mp3'),
        {
          volume: 0.5,
          shouldPlay: false,
        }
      );
      
      this.sound = sound;
      this.isInitialized = true;
      
      console.log('AudioEngineV3 initialized');
    } catch (error) {
      console.error('Failed to initialize AudioEngineV3:', error);
    }
  }

  // Play a single tick
  async playTick() {
    if (!this.sound) return;
    
    try {
      // Stop and reset if currently playing
      await this.sound.stopAsync();
      await this.sound.setPositionAsync(0);
      // Play the tick
      await this.sound.playAsync();
    } catch (error) {
      console.error('Failed to play tick:', error);
    }
  }

  // Start the metronome
  async start() {
    if (this.isPlaying) return;
    
    this.isPlaying = true;
    this.startTime = Date.now();
    this.beatCount = 0;
    
    // Play first tick immediately
    this.playTick();
    this.notifyCallbacks();
    
    // Schedule subsequent ticks
    const intervalMs = 60000 / this.bpm;
    
    this.beatInterval = setInterval(() => {
      if (this.isPlaying) {
        this.beatCount++;
        this.playTick();
        this.notifyCallbacks();
      }
    }, intervalMs);
    
    console.log(`Started metronome at ${this.bpm} BPM`);
  }

  // Stop the metronome
  async stop() {
    this.isPlaying = false;
    
    if (this.beatInterval) {
      clearInterval(this.beatInterval);
      this.beatInterval = null;
    }
    
    if (this.sound) {
      await this.sound.stopAsync();
    }
    
    this.startTime = null;
    this.beatCount = 0;
    
    console.log('Stopped metronome');
  }

  // Update BPM
  async setBPM(newBpm) {
    this.bpm = newBpm;
    
    // If playing, restart with new BPM
    if (this.isPlaying) {
      await this.stop();
      await this.start();
    }
  }

  // Get current audio time in seconds
  getAudioTime() {
    if (!this.isPlaying || !this.startTime) return 0;
    return (Date.now() - this.startTime) / 1000;
  }

  // Register a callback for status updates
  onStatusChange(callback) {
    this.statusCallbacks.push(callback);
    return () => {
      this.statusCallbacks = this.statusCallbacks.filter(cb => cb !== callback);
    };
  }

  // Notify all callbacks
  notifyCallbacks() {
    const audioTime = this.getAudioTime();
    
    this.statusCallbacks.forEach(cb => {
      cb({
        isPlaying: this.isPlaying,
        audioTime,
        beatCount: this.beatCount,
        bpm: this.bpm,
      });
    });
  }

  // Cleanup
  async unload() {
    await this.stop();
    
    if (this.sound) {
      await this.sound.unloadAsync();
      this.sound = null;
    }
    
    this.isInitialized = false;
  }
}

export default new AudioEngineV3();