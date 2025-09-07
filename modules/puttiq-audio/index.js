import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { PuttIQAudio } = NativeModules;

class PuttIQAudioModule {
  constructor() {
    this.isInitialized = false;
    this.eventEmitter = null;
    this.listeners = new Map();
    
    if (PuttIQAudio) {
      this.eventEmitter = new NativeEventEmitter(PuttIQAudio);
    }
  }

  async initialize() {
    if (this.isInitialized) {
      return { success: true, message: 'Already initialized' };
    }

    try {
      const result = await PuttIQAudio.initialize();
      this.isInitialized = true;
      return result;
    } catch (error) {
      console.error('Failed to initialize PuttIQ Audio:', error);
      throw error;
    }
  }

  async startMetronome(bpm) {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      return await PuttIQAudio.startMetronome(bpm);
    } catch (error) {
      console.error('Failed to start metronome:', error);
      throw error;
    }
  }

  async stopMetronome() {
    try {
      return await PuttIQAudio.stopMetronome();
    } catch (error) {
      console.error('Failed to stop metronome:', error);
      throw error;
    }
  }

  async startListening() {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      return await PuttIQAudio.startListening();
    } catch (error) {
      console.error('Failed to start listening:', error);
      throw error;
    }
  }

  async stopListening() {
    try {
      return await PuttIQAudio.stopListening();
    } catch (error) {
      console.error('Failed to stop listening:', error);
      throw error;
    }
  }

  async setBPM(bpm) {
    try {
      return await PuttIQAudio.setBPM(bpm);
    } catch (error) {
      console.error('Failed to set BPM:', error);
      throw error;
    }
  }

  async setThreshold(threshold) {
    try {
      return await PuttIQAudio.setThreshold(threshold);
    } catch (error) {
      console.error('Failed to set threshold:', error);
      throw error;
    }
  }

  // Event listeners
  onBeat(callback) {
    if (!this.eventEmitter) {
      console.warn('PuttIQ Audio native module not available');
      return () => {};
    }

    const subscription = this.eventEmitter.addListener('onBeat', callback);
    this.listeners.set(callback, subscription);
    
    return () => {
      subscription.remove();
      this.listeners.delete(callback);
    };
  }

  onHitDetected(callback) {
    if (!this.eventEmitter) {
      console.warn('PuttIQ Audio native module not available');
      return () => {};
    }

    const subscription = this.eventEmitter.addListener('onHitDetected', callback);
    this.listeners.set(callback, subscription);
    
    return () => {
      subscription.remove();
      this.listeners.delete(callback);
    };
  }

  onVolumeUpdate(callback) {
    if (!this.eventEmitter) {
      console.warn('PuttIQ Audio native module not available');
      return () => {};
    }

    const subscription = this.eventEmitter.addListener('onVolumeUpdate', callback);
    this.listeners.set(callback, subscription);
    
    return () => {
      subscription.remove();
      this.listeners.delete(callback);
    };
  }

  removeAllListeners() {
    this.listeners.forEach(subscription => subscription.remove());
    this.listeners.clear();
  }

  // Check if native module is available
  isAvailable() {
    return !!PuttIQAudio;
  }
}

export default new PuttIQAudioModule();