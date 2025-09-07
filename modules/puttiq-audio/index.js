import { NativeModules, NativeEventEmitter } from 'react-native';

// This proxy safely handles the native module not being available in Expo Go.
const PuttIQAudioProxy = {
  // Define all the methods that the native module should have.
  // Return promises that resolve to a default/failure state.
  initialize: () => Promise.resolve({ success: false, error: 'Native module not available' }),
  startMetronome: () => Promise.resolve({ success: false, error: 'Native module not available' }),
  stopMetronome: () => Promise.resolve({ success: false, error: 'Native module not available' }),
  startListening: () => Promise.resolve({ success: false, error: 'Native module not available' }),
  stopListening: () => Promise.resolve({ success: false, error: 'Native module not available' }),
  setBPM: () => Promise.resolve({ success: false, error: 'Native module not available' }),
  setThreshold: () => Promise.resolve({ success: false, error: 'Native module not available' }),
  // Add any other methods your native module might have.
};

// If the native module exists, use it. Otherwise, use the proxy.
const PuttIQAudio = NativeModules.PuttIQAudio ? NativeModules.PuttIQAudio : PuttIQAudioProxy;

class PuttIQAudioModule {
  constructor() {
    this.isInitialized = false;
    this.eventEmitter = NativeModules.PuttIQAudio ? new NativeEventEmitter(PuttIQAudio) : null;
    this.listeners = new Map();
  }

  // The rest of the methods call the methods on the (potentially proxied) PuttIQAudio object.
  async initialize() {
    if (this.isInitialized) {
      return { success: true, message: 'Already initialized' };
    }
    const result = await PuttIQAudio.initialize();
    if (result.success) {
        this.isInitialized = true;
    }
    return result;
  }

  async startMetronome(bpm) {
    return PuttIQAudio.startMetronome(bpm);
  }

  async stopMetronome() {
    return PuttIQAudio.stopMetronome();
  }

  async startListening() {
    return PuttIQAudio.startListening();
  }

  async stopListening() {
    return PuttIQAudio.stopListening();
  }

  async setBPM(bpm) {
    return PuttIQAudio.setBPM(bpm);
  }

  async setThreshold(threshold) {
    return PuttIQAudio.setThreshold(threshold);
  }

  // Event listeners
  onBeat(callback) {
    if (!this.eventEmitter) return () => {};
    const subscription = this.eventEmitter.addListener('onBeat', callback);
    this.listeners.set(callback, subscription);
    return () => {
      subscription.remove();
      this.listeners.delete(callback);
    };
  }

  onHitDetected(callback) {
    if (!this.eventEmitter) return () => {};
    const subscription = this.eventEmitter.addListener('onHitDetected', callback);
    this.listeners.set(callback, subscription);
    return () => {
      subscription.remove();
      this.listeners.delete(callback);
    };
  }

  onVolumeUpdate(callback) {
    if (!this.eventEmitter) return () => {};
    const subscription = this.eventEmitter.addListener('onVolumeUpdate', callback);
    this.listeners.set(callback, subscription);
    return () => {
      subscription.remove();
      this.listeners.delete(callback);
    };
  }

  removeAllListeners() {
    if (!this.eventEmitter) return;
    this.listeners.forEach(subscription => subscription.remove());
    this.listeners.clear();
  }

  isAvailable() {
    return !!NativeModules.PuttIQAudio;
  }
}

export default new PuttIQAudioModule();