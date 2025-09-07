// Unified audio service that uses native module when available, falls back to expo-av
import PuttIQAudioNative from '../modules/puttiq-audio';
import AudioEngineV4 from './audioEngineV4';
import soundDetection from './soundDetection';

class PuttIQAudioService {
  constructor() {
    this.useNative = false;
    this.isInitialized = false;
    this.callbacks = {
      onBeat: [],
      onHitDetected: [],
      onVolumeUpdate: []
    };
    this.unsubscribers = [];
  }

  async initialize() {
    if (this.isInitialized) return;

    // Check if native module is available
    if (PuttIQAudioNative.isAvailable()) {
      try {
        await PuttIQAudioNative.initialize();
        this.useNative = true;
        console.log('Using native PuttIQ Audio module - speaker routing guaranteed');
        
        // Set up native event listeners
        this.unsubscribers.push(
          PuttIQAudioNative.onBeat(data => this.emit('onBeat', data)),
          PuttIQAudioNative.onHitDetected(data => this.emit('onHitDetected', data)),
          PuttIQAudioNative.onVolumeUpdate(data => this.emit('onVolumeUpdate', data))
        );
      } catch (error) {
        console.warn('Failed to initialize native module, falling back to expo-av:', error);
        this.useNative = false;
      }
    }

    if (!this.useNative) {
      // Initialize fallback expo-av implementation
      await AudioEngineV4.initialize();
      console.log('Using expo-av fallback - may have speaker routing issues');
      
      // Set up expo-av event forwarding
      AudioEngineV4.onStatusChange((status) => {
        if (status.isPlaying) {
          this.emit('onBeat', {
            beatCount: status.beatCount,
            timestamp: status.beatTimestamp,
            bpm: status.bpm
          });
        }
      });
    }

    this.isInitialized = true;
  }

  async startMetronome(bpm) {
    await this.initialize();

    if (this.useNative) {
      return await PuttIQAudioNative.startMetronome(bpm);
    } else {
      await AudioEngineV4.setBPM(bpm);
      await AudioEngineV4.start();
      return { 
        success: true, 
        startTime: AudioEngineV4.startTime,
        bpm: AudioEngineV4.bpm 
      };
    }
  }

  async stopMetronome() {
    if (this.useNative) {
      return await PuttIQAudioNative.stopMetronome();
    } else {
      await AudioEngineV4.stop();
      return { success: true };
    }
  }

  async startListening() {
    await this.initialize();

    if (this.useNative) {
      return await PuttIQAudioNative.startListening();
    } else {
      // Use existing sound detection with metronome info
      const success = await soundDetection.startListening(
        (hit) => this.emit('onHitDetected', hit),
        (volume) => this.emit('onVolumeUpdate', { volume })
      );
      
      // Pass metronome timing to filter out metronome sounds
      if (AudioEngineV4.isPlaying) {
        soundDetection.setMetronomeInfo(AudioEngineV4.bpm, AudioEngineV4.startTime);
      }
      
      return { success };
    }
  }

  async stopListening() {
    if (this.useNative) {
      return await PuttIQAudioNative.stopListening();
    } else {
      await soundDetection.stopListening();
      return { success: true };
    }
  }

  async setBPM(bpm) {
    if (this.useNative) {
      return await PuttIQAudioNative.setBPM(bpm);
    } else {
      await AudioEngineV4.setBPM(bpm);
      return { success: true, bpm };
    }
  }

  async setThreshold(threshold) {
    if (this.useNative) {
      return await PuttIQAudioNative.setThreshold(threshold);
    } else {
      soundDetection.setThreshold(threshold);
      return { success: true, threshold };
    }
  }

  // Event emitter methods
  on(event, callback) {
    if (!this.callbacks[event]) {
      console.warn(`Unknown event: ${event}`);
      return () => {};
    }

    this.callbacks[event].push(callback);
    
    return () => {
      const index = this.callbacks[event].indexOf(callback);
      if (index > -1) {
        this.callbacks[event].splice(index, 1);
      }
    };
  }

  emit(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(callback => callback(data));
    }
  }

  // Convenience methods matching native API
  onBeat(callback) {
    return this.on('onBeat', callback);
  }

  onHitDetected(callback) {
    return this.on('onHitDetected', callback);
  }

  onVolumeUpdate(callback) {
    return this.on('onVolumeUpdate', callback);
  }

  isNativeAvailable() {
    return this.useNative;
  }

  async cleanup() {
    if (this.useNative) {
      await this.stopMetronome();
      await this.stopListening();
      this.unsubscribers.forEach(unsub => unsub());
      PuttIQAudioNative.removeAllListeners();
    } else {
      await AudioEngineV4.unload();
      await soundDetection.stopListening();
    }
    
    this.callbacks = {
      onBeat: [],
      onHitDetected: [],
      onVolumeUpdate: []
    };
    this.isInitialized = false;
  }
}

export default new PuttIQAudioService();