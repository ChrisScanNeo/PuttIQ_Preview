import { Platform } from 'react-native';

/**
 * Factory class for creating the appropriate detector based on the environment
 * Automatically selects the best available detector implementation
 */
export class DetectorFactory {
  /**
   * Create a detector instance based on available capabilities
   * @param {Object} options - Detector configuration options
   * @returns {Object} Detector instance
   */
  static async createDetector(options = {}) {
    const detectorType = await this.getAvailableDetectorType();
    
    console.log(`DetectorFactory: Creating ${detectorType} detector`);
    
    switch (detectorType) {
      case 'acoustic':
        return this.createAcousticDetector(options);

      case 'expo':
        return this.createExpoDetector(options);

      case 'simple':
        return this.createSimpleDetector(options);

      case 'debug':
        return this.createDebugDetector(options);

      default:
        throw new Error(`Unknown detector type: ${detectorType}`);
    }
  }

  /**
   * Determine which detector type is available
   * @returns {Promise<string>} Detector type identifier
   */
  static async getAvailableDetectorType() {
    // Check if we're in development/debug mode
    if (__DEV__ && Platform.OS === 'web') {
      return 'debug';
    }

    // Try to load ExpoPlayAudioStream (requires custom build)
    try {
      const { ExpoPlayAudioStream } = require('@cjblack/expo-audio-stream');
      if (ExpoPlayAudioStream && typeof ExpoPlayAudioStream.startRecording === 'function') {
        return 'acoustic'; // Use acoustic detector with expo-audio-stream
      }
    } catch (e) {
      console.log('ExpoPlayAudioStream not available (expected in Expo Go)');
    }

    // Fallback to simple detector for basic functionality
    // This will work in Expo Go
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      console.log('Using simple detector for Expo Go compatibility');
      return 'simple';
    }

    // Use debug detector for web/development
    return 'debug';
  }

  /**
   * Create professional acoustic detector with multi-band analysis
   */
  static createAcousticDetector(options) {
    const { PutterDetectorAcoustic } = require('./PutterDetectorAcoustic');
    return new PutterDetectorAcoustic(options);
  }

  /**
   * Create an Expo audio stream based detector (legacy)
   */
  static createExpoDetector(options) {
    const { PutterDetectorExpo } = require('./PutterDetectorExpo');
    return new PutterDetectorExpo(options);
  }

  /**
   * Create a simple fallback detector
   */
  static createSimpleDetector(options) {
    const { PutterDetectorSimple } = require('./PutterDetectorSimple');
    return new PutterDetectorSimple(options);
  }

  /**
   * Create a debug detector with visualization
   */
  static createDebugDetector(options) {
    // Try to use the debug detector if available
    try {
      const { PutterDetectorDebug } = require('./PutterDetectorDebug');
      return new PutterDetectorDebug(options);
    } catch (e) {
      // Fall back to simple if debug not available
      console.log('Debug detector not available, using simple');
      return this.createSimpleDetector(options);
    }
  }

  /**
   * Get information about available detector capabilities
   * @returns {Promise<Object>} Capability information
   */
  static async getCapabilities() {
    const capabilities = {
      acoustic: false,
      expo: false,
      simple: true,
      debug: __DEV__,
      platform: Platform.OS,
      isDevelopment: __DEV__,
    };

    // Check Expo/Acoustic capability
    try {
      const { ExpoPlayAudioStream } = require('@cjblack/expo-audio-stream');
      const available = !!ExpoPlayAudioStream;
      capabilities.expo = available;
      capabilities.acoustic = available; // Acoustic detector uses expo-audio-stream
    } catch (e) {
      // Not available
    }

    const activeType = await this.getAvailableDetectorType();
    capabilities.activeDetector = activeType;

    return capabilities;
  }
}

export default DetectorFactory;