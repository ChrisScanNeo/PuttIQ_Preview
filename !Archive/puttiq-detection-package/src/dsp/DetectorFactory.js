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
      case 'expo':
        return this.createExpoDetector(options);
      
      case 'picovoice':
        return this.createPicovoiceDetector(options);
      
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
        return 'expo';
      }
    } catch (e) {
      console.log('ExpoPlayAudioStream not available:', e.message);
    }

    // Try to load Picovoice (requires native linking)
    try {
      const VoiceProcessor = require('@picovoice/react-native-voice-processor').default;
      if (VoiceProcessor && typeof VoiceProcessor.start === 'function') {
        return 'picovoice';
      }
    } catch (e) {
      console.log('Picovoice not available:', e.message);
    }

    // Fallback to simple detector for basic functionality
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      return 'simple';
    }

    // Use debug detector for web/development
    return 'debug';
  }

  /**
   * Create an Expo audio stream based detector
   */
  static createExpoDetector(options) {
    const { PutterDetectorExpo } = require('./PutterDetectorExpo');
    return new PutterDetectorExpo(options);
  }

  /**
   * Create a Picovoice based detector
   */
  static createPicovoiceDetector(options) {
    const { PutterDetector } = require('./PutterDetector');
    return new PutterDetector(options);
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
      expo: false,
      picovoice: false,
      simple: true,
      debug: __DEV__,
      platform: Platform.OS,
      isDevelopment: __DEV__,
    };

    // Check Expo capability
    try {
      const { ExpoPlayAudioStream } = require('@cjblack/expo-audio-stream');
      capabilities.expo = !!ExpoPlayAudioStream;
    } catch (e) {
      // Not available
    }

    // Check Picovoice capability
    try {
      const VoiceProcessor = require('@picovoice/react-native-voice-processor').default;
      capabilities.picovoice = !!VoiceProcessor;
    } catch (e) {
      // Not available
    }

    const activeType = await this.getAvailableDetectorType();
    capabilities.activeDetector = activeType;

    return capabilities;
  }
}

export default DetectorFactory;