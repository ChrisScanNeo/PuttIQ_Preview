import { Audio } from 'expo-audio';

/**
 * RecordingManager - Handles timed audio recording for putt calibration
 * Uses expo-audio to record precise 1-second segments
 */
class RecordingManager {
  constructor() {
    this.recording = null;
    this.isRecording = false;
    this.recordingSettings = {
      android: {
        extension: '.m4a',
        outputFormat: Audio.AndroidOutputFormat.MPEG_4,
        audioEncoder: Audio.AndroidAudioEncoder.AAC,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 128000,
      },
      ios: {
        extension: '.m4a',
        outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
        audioQuality: Audio.IOSAudioQuality.HIGH,
        sampleRate: 16000,
        numberOfChannels: 1,
        bitRate: 128000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
      web: {
        mimeType: 'audio/webm',
        bitsPerSecond: 128000,
      }
    };
  }

  /**
   * Request microphone permissions
   */
  async requestPermissions() {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Microphone permission denied');
      }
      
      // Set audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        staysActiveInBackground: false,
        playThroughEarpieceAndroid: false
      });
      
      return true;
    } catch (error) {
      console.error('Failed to get permissions:', error);
      throw error;
    }
  }

  /**
   * Start recording for a specified duration
   * @param {number} durationMs - Recording duration in milliseconds
   * @returns {Promise<Object>} Recording data
   */
  async recordForDuration(durationMs = 1000) {
    try {
      // Clean up any existing recording
      if (this.recording) {
        try {
          await this.recording.stopAndUnloadAsync();
        } catch (e) {
          // Ignore cleanup errors
        }
        this.recording = null;
      }

      // Create and prepare new recording
      const { recording } = await Audio.Recording.createAsync(
        this.recordingSettings,
        (status) => {
          // Optional: Handle status updates
          if (status.isRecording) {
            this.isRecording = true;
          }
        }
      );
      
      this.recording = recording;
      console.log('Recording started for', durationMs, 'ms');
      
      // Wait for specified duration
      await new Promise(resolve => setTimeout(resolve, durationMs));
      
      // Stop recording
      await recording.stopAndUnloadAsync();
      this.isRecording = false;
      
      // Get recording URI
      const uri = recording.getURI();
      console.log('Recording saved to:', uri);
      
      // Get recording info
      const info = await recording.getStatusAsync();
      
      return {
        uri,
        duration: info.durationMillis,
        success: true,
        timestamp: Date.now()
      };
      
    } catch (error) {
      console.error('Recording failed:', error);
      this.isRecording = false;
      throw error;
    }
  }

  /**
   * Load and process audio file
   * @param {string} uri - Recording URI
   * @returns {Promise<Float32Array>} Audio samples
   */
  async loadRecording(uri) {
    try {
      // Create sound object from recording
      const { sound } = await Audio.Sound.createAsync({ uri });
      
      // Get audio status
      const status = await sound.getStatusAsync();
      
      // For now, return mock data (real implementation would need native module)
      // In production, you'd extract PCM data from the file
      const samples = new Float32Array(16000); // 1 second at 16kHz
      
      // Simulate some audio data
      for (let i = 0; i < samples.length; i++) {
        samples[i] = Math.random() * 0.1 - 0.05;
      }
      
      // Add a simulated impact spike
      const impactStart = Math.floor(samples.length * 0.3);
      for (let i = impactStart; i < impactStart + 100; i++) {
        samples[i] = Math.random() * 0.5;
      }
      
      // Unload sound
      await sound.unloadAsync();
      
      return samples;
    } catch (error) {
      console.error('Failed to load recording:', error);
      throw error;
    }
  }

  /**
   * Extract features from audio samples
   * @param {Float32Array} samples - Audio samples
   * @returns {Object} Audio features
   */
  extractFeatures(samples) {
    const { spectralAnalysis } = require('../dsp/SpectralAnalysis');
    
    let maxEnergy = 0;
    let avgEnergy = 0;
    let peakIndex = 0;
    
    // Find peak energy
    for (let i = 0; i < samples.length; i++) {
      const energy = Math.abs(samples[i]);
      avgEnergy += energy;
      if (energy > maxEnergy) {
        maxEnergy = energy;
        peakIndex = i;
      }
    }
    
    avgEnergy /= samples.length;
    
    // Extract fixed-size window around peak
    const windowSize = 512;
    const halfWindow = Math.floor(windowSize / 2);
    
    // Create fixed-size window, padding with zeros if needed
    const impactWindow = new Float32Array(windowSize);
    
    for (let i = 0; i < windowSize; i++) {
      const sampleIndex = peakIndex - halfWindow + i;
      if (sampleIndex >= 0 && sampleIndex < samples.length) {
        impactWindow[i] = samples[sampleIndex];
      } else {
        impactWindow[i] = 0; // Pad with zeros
      }
    }
    
    // Compute actual spectral features (FFT) from impact window
    let spectralFeatures = null;
    try {
      spectralFeatures = spectralAnalysis.computeSpectrum(impactWindow);
      console.log('Computed spectral features, length:', spectralFeatures?.length);
    } catch (error) {
      console.error('Failed to compute spectrum:', error);
      // Use raw window as fallback
      spectralFeatures = impactWindow;
    }
    
    return {
      maxEnergy,
      avgEnergy,
      peakIndex,
      peakTime: peakIndex / 16000, // Convert to seconds
      impactWindow,
      spectralFeatures, // Add computed spectrum
      samples
    };
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    if (this.recording) {
      try {
        if (this.isRecording) {
          await this.recording.stopAndUnloadAsync();
        }
      } catch (e) {
        // Ignore cleanup errors
      }
      this.recording = null;
      this.isRecording = false;
    }
  }
}

// Export singleton instance
export const recordingManager = new RecordingManager();
export default recordingManager;