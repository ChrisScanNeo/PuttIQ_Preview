import { Platform } from 'react-native';

// Dynamic import for WebRTC to avoid issues on web platform
let mediaDevices = null;

if (Platform.OS === 'ios' || Platform.OS === 'android') {
  try {
    // Try to load @stream-io/react-native-webrtc first (preferred)
    const streamIO = require('@stream-io/react-native-webrtc');
    mediaDevices = streamIO.mediaDevices;
  } catch (e) {
    try {
      // Fallback to standard react-native-webrtc
      const standardWebRTC = require('react-native-webrtc');
      mediaDevices = standardWebRTC.mediaDevices;
    } catch (err) {
      console.warn('WebRTC not available:', err);
    }
  }
}

/**
 * Enable Acoustic Echo Cancellation (AEC) and Noise Suppression (NS)
 * by keeping a WebRTC audio stream active.
 * 
 * This removes the metronome playback from the microphone input,
 * preventing false positives in hit detection.
 * 
 * @returns {Promise<MediaStream|null>} The media stream if successful, null otherwise
 */
export async function enableAEC() {
  if (!mediaDevices) {
    console.warn('WebRTC mediaDevices not available on this platform');
    return null;
  }

  try {
    // Request audio stream with echo cancellation and noise suppression
    const stream = await mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,        // Remove speaker output from mic input
        noiseSuppression: true,        // Reduce background noise
        autoGainControl: false,        // Keep consistent amplitude levels
        googEchoCancellation: true,    // Google's enhanced AEC (if available)
        googNoiseSuppression: true,    // Google's enhanced NS (if available)
        googAutoGainControl: false,    // Disable automatic gain
        googHighpassFilter: true,      // Built-in high-pass filter
      },
      video: false,
    });

    console.log('AEC enabled successfully with stream ID:', stream.id);
    
    // Log the actual constraints that were applied
    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      const settings = audioTrack.getSettings ? audioTrack.getSettings() : {};
      console.log('Audio track settings:', settings);
    }

    return stream;
  } catch (error) {
    console.error('Failed to enable AEC:', error);
    return null;
  }
}

/**
 * Disable AEC by stopping and releasing the media stream
 * @param {MediaStream} stream - The stream to stop
 */
export function disableAEC(stream) {
  if (!stream) return;

  try {
    // Stop all tracks in the stream
    stream.getTracks().forEach(track => {
      track.stop();
      console.log('Stopped track:', track.kind, track.id);
    });
    
    console.log('AEC disabled, stream stopped');
  } catch (error) {
    console.error('Error disabling AEC:', error);
  }
}

/**
 * Check if AEC is supported on the current platform
 * @returns {boolean}
 */
export function isAECSupported() {
  return !!mediaDevices && (Platform.OS === 'ios' || Platform.OS === 'android');
}

/**
 * Get information about AEC capabilities
 * @returns {Promise<Object>}
 */
export async function getAECCapabilities() {
  if (!mediaDevices || !mediaDevices.getSupportedConstraints) {
    return {
      supported: false,
      capabilities: {}
    };
  }

  try {
    const constraints = mediaDevices.getSupportedConstraints();
    return {
      supported: true,
      capabilities: {
        echoCancellation: constraints.echoCancellation || false,
        noiseSuppression: constraints.noiseSuppression || false,
        autoGainControl: constraints.autoGainControl || false,
      }
    };
  } catch (error) {
    console.error('Failed to get AEC capabilities:', error);
    return {
      supported: false,
      capabilities: {},
      error: error.message
    };
  }
}

export default {
  enableAEC,
  disableAEC,
  isAECSupported,
  getAECCapabilities
};