/**
 * Video-Synchronized Sound Detector
 *
 * Simple energy-based putter strike detection synchronized to video playback.
 * Uses expo-av's Audio.Recording API to listen for audio spikes during specific
 * time windows in the video playback.
 *
 * Key Features:
 * - Records audio only during listening windows (saves battery/CPU)
 * - Syncs detection to video position for accurate timing
 * - Simple RMS energy threshold (no complex DSP)
 * - Works with standard Expo (no custom native modules)
 * - BPM-aware timing calculations
 */

import { Audio } from 'expo-av';
import { Platform } from 'react-native';

export class VideoSyncDetector {
  constructor(options = {}) {
    // Configuration
    this.opts = {
      bpm: 70,                          // Beats per minute
      videoPlayer: null,                // Video player reference
      sampleRate: 44100,                // Audio sample rate

      // Detection parameters
      energyThreshold: 2.5,             // Multiplier above baseline for detection
      baselineWindow: 50,               // Frames to average for baseline
      debounceMs: 200,                  // Minimum time between detections

      // Listening window (relative to video duration) - CENTERED ON TARGET (50%)
      listenStartPercent: 0.30,         // Start listening at 30% through video
      listenEndPercent: 0.70,           // Stop at 70% through video (40% total window)

      // Callbacks
      onHitDetected: () => {},          // Called when hit detected

      // Debug
      debugMode: false,

      ...options
    };

    // State
    this.isRunning = false;
    this.isListening = false;
    this.recording = null;
    this.recordingUri = null;

    // Detection state
    this.baselineEnergy = 0;
    this.baselineFrames = [];
    this.lastHitAt = 0;
    this.hitCount = 0;

    // Performance tracking
    this.frameCount = 0;
    this.startTime = 0;

    // Audio monitoring
    this.monitoringInterval = null;
  }

  /**
   * Calculate RMS (Root Mean Square) energy of audio samples
   * @param {Float32Array} samples - Audio samples normalized to [-1, 1]
   * @returns {number} RMS energy value
   */
  calculateRMS(samples) {
    if (!samples || samples.length === 0) return 0;

    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
      sum += samples[i] * samples[i];
    }
    return Math.sqrt(sum / samples.length);
  }

  /**
   * Update baseline energy with new RMS value
   * @param {number} rms - Current RMS energy
   */
  updateBaseline(rms) {
    this.baselineFrames.push(rms);

    // Keep only the most recent frames
    if (this.baselineFrames.length > this.opts.baselineWindow) {
      this.baselineFrames.shift();
    }

    // Calculate average baseline
    const sum = this.baselineFrames.reduce((a, b) => a + b, 0);
    this.baselineEnergy = sum / this.baselineFrames.length;
  }

  /**
   * Check if we should be listening based on video position
   * @returns {boolean} True if in listening window
   */
  shouldBeListening() {
    if (!this.opts.videoPlayer) return false;

    const player = this.opts.videoPlayer;
    if (!player.duration || player.duration === 0) return false;

    const position = player.currentTime / player.duration;
    const inWindow = position >= this.opts.listenStartPercent &&
                     position <= this.opts.listenEndPercent;

    return inWindow;
  }

  /**
   * Get current video position percentage (0-1)
   * @returns {number} Position in video
   */
  getVideoPosition() {
    if (!this.opts.videoPlayer) return 0;

    const player = this.opts.videoPlayer;
    if (!player.duration || player.duration === 0) return 0;

    return player.currentTime / player.duration;
  }

  /**
   * Calculate timing accuracy relative to expected hit time
   * TARGET: Center of video bar (50%), not the end
   * Colors are symmetrical - same distance from center = same color
   * @param {number} hitPosition - Position where hit was detected (0-1)
   * @returns {Object} Timing info
   */
  calculateTiming(hitPosition) {
    // Target is CENTER of video (0.5), not end (1.0)
    const targetPosition = 0.5;

    // Calculate distance from center (absolute value for symmetry)
    const distanceFromCenter = Math.abs(hitPosition - targetPosition);

    // Error in milliseconds (negative = early, positive = late)
    const videoDuration = this.opts.videoPlayer?.duration || 0;
    const errorMs = (hitPosition - targetPosition) * videoDuration * 1000;

    // Accuracy based on distance from center (0.5 = max distance)
    // Closer to center = higher accuracy (1.0 = perfect, 0.0 = worst)
    const accuracy = Math.max(0, 1 - (distanceFromCenter / 0.5));

    return {
      position: hitPosition,
      targetPosition,
      distanceFromCenter,
      errorMs,
      accuracy,
      isEarly: errorMs < 0,  // Before center
      isLate: errorMs > 0,   // After center
      isPerfect: Math.abs(errorMs) < 50 // Within 50ms of center
    };
  }

  /**
   * Process audio recording status and detect hits
   * This is called periodically while recording is active
   */
  async processAudioStatus() {
    if (!this.recording || !this.isRunning) return;

    try {
      // Check if recording object is still valid before accessing it
      if (!this.recording._canRecord) {
        if (this.opts.debugMode) {
          console.warn('Recording object no longer valid, skipping status check');
        }
        return;
      }

      const status = await this.recording.getStatusAsync();

      if (!status || !status.isRecording) {
        if (this.opts.debugMode && this.frameCount === 0) {
          console.log('Recording not active yet, status:', status);
        }
        return;
      }

      const now = performance.now();

      // Get metering level (dB) and convert to linear scale
      // expo-av provides metering in dB, typically -160 to 0
      let meteringLinear = 0;
      if (status.metering !== undefined && status.metering !== null) {
        const meteringDb = Math.max(-160, Math.min(0, status.metering));
        meteringLinear = Math.pow(10, meteringDb / 20); // Convert dB to linear
      }

      // Update baseline with current energy ONLY when not listening
      // This prevents video audio from polluting the baseline
      if (!this.isListening) {
        this.updateBaseline(meteringLinear);
      }

      // Check for energy spike above threshold
      // Apply both floor (0.01) and ceiling (0.5) to prevent extreme thresholds
      const baseThreshold = this.baselineEnergy * this.opts.energyThreshold;
      const threshold = Math.min(Math.max(0.01, baseThreshold), 0.5);
      const isSpike = meteringLinear > threshold;

      // Debounce check
      const timeSinceLastHit = now - this.lastHitAt;
      const debounceOk = timeSinceLastHit > this.opts.debounceMs;

      // Log ALL significant audio activity (not just detections) - helps diagnose missed hits
      if (meteringLinear > this.baselineEnergy * 1.5) {
        const wouldDetect = isSpike && debounceOk && this.isListening;
        const rejectedReason = !isSpike ? 'Too quiet (below threshold)' :
                               !debounceOk ? 'Debounce (too soon after last hit)' :
                               !this.isListening ? 'Not in listening window' :
                               'None';

        console.log('🔊 AUDIO SPIKE HEARD:', {
          level: meteringLinear.toFixed(6),
          baseline: this.baselineEnergy.toFixed(6),
          threshold: threshold.toFixed(6),
          ratio: (meteringLinear / (this.baselineEnergy + 0.0001)).toFixed(2) + 'x',
          listening: this.isListening,
          videoPos: (this.getVideoPosition() * 100).toFixed(1) + '%',
          wouldDetect,
          rejectedReason: wouldDetect ? 'DETECTED ✅' : rejectedReason
        });
      }

      if (isSpike && debounceOk && this.isListening) {
        const videoPosition = this.getVideoPosition();
        const timing = this.calculateTiming(videoPosition);

        // Valid hit detected
        this.lastHitAt = now;
        this.hitCount++;

        const hitEvent = {
          timestamp: now,
          energy: meteringLinear,
          baseline: this.baselineEnergy,
          ratio: meteringLinear / (this.baselineEnergy + 0.0001),
          ...timing,
          hitNumber: this.hitCount
        };

        if (this.opts.debugMode) {
          console.log(`✅ HIT DETECTED #${this.hitCount}`, {
            energy: meteringLinear.toFixed(6),
            baseline: this.baselineEnergy.toFixed(6),
            ratio: hitEvent.ratio.toFixed(2) + 'x',
            position: (videoPosition * 100).toFixed(1) + '%',
            errorMs: timing.errorMs.toFixed(0) + 'ms',
            accuracy: (timing.accuracy * 100).toFixed(0) + '%'
          });
        }

        // Notify callback
        this.opts.onHitDetected(hitEvent);
      }

      // Debug logging
      if (this.opts.debugMode && this.frameCount % 10 === 0) {
        console.log(`📊 [${this.frameCount}] Audio: ${meteringLinear.toFixed(6)}, Baseline: ${this.baselineEnergy.toFixed(6)}, Threshold: ${threshold.toFixed(6)}, Listening: ${this.isListening}, Metering DB: ${status.metering?.toFixed(1) || 'N/A'}`);
      }

      this.frameCount++;
    } catch (error) {
      // Silently ignore errors when recording is stopped or invalid
      // This is normal during shutdown
      if (this.isRunning && this.opts.debugMode) {
        console.warn('Error processing audio status:', error.message);
      }
    }
  }

  /**
   * Start position monitoring to control listening windows
   */
  startPositionMonitoring() {
    // Check video position every 50ms
    this.monitoringInterval = setInterval(() => {
      if (!this.isRunning) return;

      const shouldListen = this.shouldBeListening();

      // State change: start listening
      if (shouldListen && !this.isListening) {
        this.isListening = true;
        if (this.opts.debugMode) {
          console.log('🎤 LISTENING WINDOW STARTED at ' + (this.getVideoPosition() * 100).toFixed(1) + '%');
        }
      }

      // State change: stop listening
      if (!shouldListen && this.isListening) {
        this.isListening = false;
        if (this.opts.debugMode) {
          console.log('🔇 LISTENING WINDOW ENDED at ' + (this.getVideoPosition() * 100).toFixed(1) + '%');
        }
      }

      // Poll audio status for metering data
      this.processAudioStatus();
    }, 100); // Check every 100ms
  }

  /**
   * Stop position monitoring
   */
  stopPositionMonitoring() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }

  /**
   * Configure audio mode for simultaneous playback and recording
   */
  async configureAudioMode() {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,           // Enable recording on iOS
        playsInSilentModeIOS: true,         // Play audio even in silent mode
        staysActiveInBackground: false,      // Don't need background mode
        shouldDuckAndroid: true,             // Lower other audio
        playThroughEarpieceAndroid: false,   // Use main speaker
      });

      if (this.opts.debugMode) {
        console.log('✅ Audio mode configured for recording + playback');
      }
    } catch (error) {
      console.error('Failed to configure audio mode:', error);
      throw error;
    }
  }

  /**
   * Start the detector
   */
  async start() {
    if (this.isRunning) {
      console.warn('Detector already running');
      return;
    }

    if (!this.opts.videoPlayer) {
      throw new Error('VideoSyncDetector requires a video player reference');
    }

    try {
      console.log('🎯 VideoSyncDetector starting...', {
        bpm: this.opts.bpm,
        listenWindow: `${this.opts.listenStartPercent * 100}%-${this.opts.listenEndPercent * 100}%`,
        debugMode: this.opts.debugMode ? 'ON' : 'OFF'
      });

      // Request microphone permissions first
      const { status, granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        throw new Error('Microphone permission denied');
      }

      // Ensure any previous recording is fully cleaned up
      if (this.recording) {
        console.warn('⚠️ Previous recording still exists, force cleaning...');
        try {
          // Try to unload without checking status (status check might fail on corrupted object)
          await this.recording.stopAndUnloadAsync();
        } catch (e) {
          // Ignore errors - recording might already be invalid
          if (this.opts.debugMode) {
            console.log('Cleanup attempt (expected if already cleaned):', e.message);
          }
        }
        this.recording = null;
      }

      // Reset audio mode first to release any locks
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
        });
      } catch (e) {
        console.warn('Error resetting audio mode:', e.message);
      }

      // Longer delay to ensure recording resources are fully released
      await new Promise(resolve => setTimeout(resolve, 500));

      // Configure audio mode for recording while video plays
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      // Wait for audio mode to stabilize
      await new Promise(resolve => setTimeout(resolve, 200));

      // Create recording with metering enabled
      this.recording = new Audio.Recording();

      // Use simpler recording options for compatibility
      const recordingOptions = {
        isMeteringEnabled: true,
        keepAudioActiveHint: true,
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      };

      // Prepare and start recording with error context
      try {
        await this.recording.prepareToRecordAsync(recordingOptions);
      } catch (prepareError) {
        console.error('Prepare failed:', prepareError);
        throw new Error(`Recording prepare failed: ${prepareError.message}`);
      }

      try {
        await this.recording.startAsync();
      } catch (startError) {
        console.error('Start failed:', startError);
        throw new Error(`Recording start failed: ${startError.message}`);
      }

      // Check if metering is working
      const initialStatus = await this.recording.getStatusAsync();
      if (this.opts.debugMode) {
        console.log('📊 Initial recording status:', {
          isRecording: initialStatus.isRecording,
          meteringAvailable: initialStatus.metering !== undefined,
          meteringValue: initialStatus.metering
        });
      }

      this.isRunning = true;
      this.startTime = performance.now();
      this.frameCount = 0;
      this.hitCount = 0;
      this.baselineFrames = [];
      this.baselineEnergy = 0;
      this.lastHitAt = 0;

      // Start monitoring video position
      this.startPositionMonitoring();

      console.log('✅ VideoSyncDetector started and recording');
    } catch (error) {
      console.error('Failed to start VideoSyncDetector:', error);
      this.isRunning = false;

      // Clean up failed recording attempt
      if (this.recording) {
        try {
          // Check if recording was prepared before trying to unload
          const status = await this.recording.getStatusAsync();
          if (status.canRecord || status.isRecording || status.isDoneRecording) {
            await this.recording.stopAndUnloadAsync();
          }
        } catch (cleanupError) {
          // Silently ignore - recording might not be prepared yet
          if (this.opts.debugMode) {
            console.log('Cleanup skipped (recording not prepared):', cleanupError.message);
          }
        }
        this.recording = null;
      }

      // Reset audio mode
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        });
      } catch (audioError) {
        console.warn('Error resetting audio mode after failure:', audioError.message);
      }

      throw error;
    }
  }

  /**
   * Stop the detector
   */
  async stop() {
    if (!this.isRunning) return;

    try {
      console.log('⏸️ VideoSyncDetector stopping...');

      // Mark as not running first to stop polling
      this.isRunning = false;
      this.isListening = false;

      // Stop position monitoring
      this.stopPositionMonitoring();

      // Stop and unload recording - always try to unload even if not recording
      if (this.recording) {
        try {
          // Try to get status first
          const status = await this.recording.getStatusAsync();

          // If it's recording or prepared, unload it
          if (status.isRecording || status.canRecord) {
            await this.recording.stopAndUnloadAsync();
          }
        } catch (error) {
          // If getting status fails, try to unload anyway
          try {
            await this.recording.stopAndUnloadAsync();
          } catch (unloadError) {
            console.warn('Error unloading recording:', unloadError.message);
          }
        }
        this.recording = null;
      }

      // Reset audio mode to release recording resources
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        });
      } catch (error) {
        console.warn('Error resetting audio mode:', error.message);
      }

      const duration = (performance.now() - this.startTime) / 1000;
      console.log(`⏸️ VideoSyncDetector stopped. Duration: ${duration.toFixed(1)}s, Hits: ${this.hitCount}`);
    } catch (error) {
      console.error('Error stopping detector:', error);
      this.isRunning = false;
      this.isListening = false;
      this.recording = null; // Force cleanup
    }
  }

  /**
   * Update detector parameters
   * @param {Object} params - Parameters to update
   */
  updateParams(params) {
    Object.assign(this.opts, params);

    if (this.opts.debugMode) {
      console.log('📝 Detector params updated:', params);
    }
  }

  /**
   * Update BPM
   * @param {number} bpm - New BPM value
   */
  setBpm(bpm) {
    this.opts.bpm = bpm;
  }

  /**
   * Get detector statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const uptime = this.isRunning ? (performance.now() - this.startTime) / 1000 : 0;

    return {
      isRunning: this.isRunning,
      isListening: this.isListening,
      hitCount: this.hitCount,
      uptime: uptime.toFixed(1) + 's',
      frameCount: this.frameCount,
      baselineEnergy: this.baselineEnergy.toFixed(6),
      videoPosition: (this.getVideoPosition() * 100).toFixed(1) + '%'
    };
  }

  /**
   * Reset detector state
   */
  reset() {
    this.baselineFrames = [];
    this.baselineEnergy = 0;
    this.lastHitAt = 0;
    this.hitCount = 0;
    this.frameCount = 0;

    console.log('🔄 VideoSyncDetector reset');
  }
}

export default VideoSyncDetector;
