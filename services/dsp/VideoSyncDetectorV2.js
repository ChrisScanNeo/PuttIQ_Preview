/**
 * Video-Synchronized Sound Detector V2
 *
 * Improved putter strike detection with beat-based timing and pause/resume support.
 *
 * Key Improvements over V1:
 * - Beat-based listening (after 3rd beat only)
 * - Pause/resume instead of stop/start (fixes recording corruption)
 * - Per-loop baseline reset (prevents video audio pollution)
 * - Target at 4th beat (100% of video)
 * - Millisecond-based accuracy calculation
 */

import { Audio } from 'expo-av';
import { Platform } from 'react-native';

export class VideoSyncDetectorV2 {
  constructor(options = {}) {
    // Configuration
    this.opts = {
      bpm: 70,                          // Beats per minute
      videoPlayer: null,                // Video player reference
      sampleRate: 44100,                // Audio sample rate
      beatsInVideo: 4,                  // Number of beats in video (default 4)

      // Detection parameters
      energyThreshold: 1.5,             // Multiplier above baseline for detection (lowered for weak putter hits)
      baselineWindow: 50,               // Frames to average for baseline
      debounceMs: 200,                  // Minimum time between detections

      // Timing parameters
      targetPosition: null,             // Target position for perfect hit (null = auto-calculate as 87.5%)
      audioLatencyMs: 0,                // Audio processing latency compensation (disabled by default)
      listenDelayMs: 500,               // Delay after Beat 3 before listening starts (to avoid detecting Beat 3 tone)
      hitProcessingDelayMs: 50,         // Delay before processing hit (allows for accurate capture without affecting timing)

      // Callbacks
      onHitDetected: () => {},          // Called when hit detected
      onAudioLevel: () => {},           // Called every 100ms with current audio level

      // Debug
      debugMode: false,

      ...options
    };

    // State
    this.isRunning = false;
    this.isPaused = false;              // NEW: Pause state (keeps recording alive)
    this.isListening = false;
    this.recording = null;

    // Detection state
    this.baselineEnergy = 0.005;      // Start with minimum baseline (prevents false detections in silent rooms)
    this.baselineFrames = [];
    this.lastHitAt = 0;
    this.hitCount = 0;
    this.spikeCount = 0;              // Track ALL spikes over 4x (for debugging)
    this.lastSpikeAt = 0;             // Debounce spikes

    // Performance tracking
    this.frameCount = 0;
    this.startTime = 0;

    // Loop detection
    this.lastVideoPosition = 0;         // Track position to detect loop restart

    // Video state tracking for baseline building
    this.videoWasPlaying = false;       // Track if video was playing last frame
    this.isInGap = false;               // True during 2-second gap between loops
    this.isFirstLoop = true;            // True until first gap - allows baseline building during initial loop
    this.videoListener = null;          // Store video event listener subscription
    this.hitDetectedThisLoop = false;   // Track if hit detected in current loop (prevents multiple detections)

    // Hit timestamp buffer (for accurate position reconstruction)
    this.pendingHits = [];              // Array of {timestamp, videoPosition, audioLevel, etc.}

    // Audio monitoring
    this.monitoringInterval = null;
  }

  /**
   * Calculate beat timing from BPM
   * @returns {Object} Beat timing info
   */
  getBeatTiming() {
    const beatDurationMs = (60 / this.opts.bpm) * 1000;  // 70 BPM = 857ms per beat
    const beat3Position = 2 / this.opts.beatsInVideo;    // Beat 3 at 2/4 = 0.50
    const beat4Position = 3 / this.opts.beatsInVideo;    // Beat 4 at 3/4 = 0.75

    // Calculate video duration
    const videoDuration = beatDurationMs * this.opts.beatsInVideo;  // e.g., 3,428ms at 70 BPM

    // Fixed delay after Beat 3 to avoid detecting the tone
    // Uses fixed 500ms because audio tone duration doesn't scale with BPM
    const listenDelayMs = this.opts.listenDelayMs || 500;  // Fixed 500ms
    const listenDelayAsVideoPercent = listenDelayMs / videoDuration;
    const listenStartPercent = beat3Position + listenDelayAsVideoPercent;

    return {
      beatDurationMs,
      beatsInVideo: this.opts.beatsInVideo,
      videoDuration,            // Total video duration in ms
      beat3Position,            // 0.50
      beat4Position,            // 0.75
      listenDelayMs,            // Calculated proportionally (e.g., 500ms at 70 BPM)
      listenStartPercent,       // ~0.646 (64.6%) at all BPMs
      listenEndPercent: 1.0     // Listen until end of video (100%)
    };
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
   * Reset baseline (called at start of each loop)
   */
  resetBaseline() {
    this.baselineFrames = [];
    this.baselineEnergy = 0.005;      // Reset to minimum baseline (not 0)
    this.isInGap = false;
    this.videoWasPlaying = false;
    this.hitDetectedThisLoop = false;  // Reset hit flag for new loop
    this.isFirstLoop = true;           // Allow baseline building in next loop

    if (this.opts.debugMode) {
      console.log('🔄 Baseline reset for new loop');
    }
  }

  /**
   * Check if we should be listening based on video position
   * @returns {boolean} True if in listening window
   */
  shouldBeListening() {
    if (!this.opts.videoPlayer || this.isPaused) return false;

    // Stop listening if we already detected a hit this loop
    if (this.hitDetectedThisLoop) return false;

    const player = this.opts.videoPlayer;
    if (!player.duration || player.duration === 0) return false;

    const position = player.currentTime / player.duration;
    const beatTiming = this.getBeatTiming();

    const inWindow = position >= beatTiming.listenStartPercent &&
                     position <= beatTiming.listenEndPercent;

    return inWindow;
  }

  /**
   * Get current video position percentage (0-1)
   * @returns {number} Position in video
   */
  getVideoPosition() {
    if (!this.opts.videoPlayer) return 0;

    const player = this.opts.videoPlayer;

    // Defensive check - ensure currentTime and duration exist
    if (!player.currentTime && player.currentTime !== 0) {
      if (this.opts.debugMode) {
        console.warn('Video player missing currentTime property');
      }
      return 0;
    }

    if (!player.duration || player.duration === 0) return 0;

    return player.currentTime / player.duration;
  }

  /**
   * Calculate timing accuracy relative to target position
   * @param {number} hitPosition - Position where hit was detected (0-1)
   * @returns {Object} Timing info
   */
  calculateTiming(hitPosition) {
    // Target is between Beat 4 (75%) and END (100%)
    // Default: midpoint at 87.5% (0.75 + 0.125 = 0.875)
    const beatTiming = this.getBeatTiming();
    // Target the 4th beat exactly (center pass) by default
    const targetPosition = this.opts.targetPosition ?? beatTiming.beat4Position; // 0.75

    // Error in milliseconds (negative = early, positive = late)
    const videoDuration = this.opts.videoPlayer?.duration || 0;
    const errorMs = (hitPosition - targetPosition) * videoDuration * 1000;

    // Accuracy based on absolute error in milliseconds
    // Perfect = within 50ms, good = within 200ms
    const absErrorMs = Math.abs(errorMs);
    let accuracy;
    if (absErrorMs <= 50) {
      accuracy = 1.0;  // Perfect - Bright Green
    } else if (absErrorMs <= 200) {
      accuracy = 1.0 - ((absErrorMs - 50) / 150);  // Scale from 1.0 to 0.0
    } else {
      accuracy = 0.0;  // Poor - Red
    }

    // Map hitPosition to full-width display with center at Beat 4
    // Early (before Beat 4) should render to the RIGHT (1.0..0.5)
    // Late (after Beat 4) should render to the LEFT (0.5..0.0)
    let displayPosition = 0.5;
    try {
      const listenStart = beatTiming.listenStartPercent ?? 0.5; // ~0.529 at 70 BPM
      const b4 = beatTiming.beat4Position ?? 0.75;
      const end = 1.0;
      if (hitPosition <= b4) {
        // Early region: map [listenStart..b4] -> [1.0..0.5]
        const t = Math.max(0, Math.min(1, (hitPosition - listenStart) / Math.max(1e-6, (b4 - listenStart))));
        displayPosition = 1.0 - 0.5 * t;
      } else {
        // Late region: map [b4..end] -> [0.5..0.0]
        const t = Math.max(0, Math.min(1, (hitPosition - b4) / Math.max(1e-6, (end - b4))));
        displayPosition = 0.5 * (1 - t);
      }
    } catch (e) {
      // Fallback stays at 0.5 if anything goes wrong
    }

    return {
      position: hitPosition,
      displayPosition,
      targetPosition,
      errorMs,
      accuracy,
      isEarly: errorMs < 0,
      isLate: errorMs > 0,
      isPerfect: absErrorMs < 50
    };
  }

  /**
   * Detect loop restart and reset baseline
   */
  checkForLoopRestart() {
    const currentPosition = this.getVideoPosition();

    // Detect loop: position jumps from high (>0.9) to low (<0.2)
    if (this.lastVideoPosition > 0.9 && currentPosition < 0.2) {
      if (this.opts.debugMode) {
        console.log('🔁 Loop detected! Resetting baseline...');
      }
      this.resetBaseline();
    }

    this.lastVideoPosition = currentPosition;
  }

  /**
   * Process audio recording status and detect hits
   */
  async processAudioStatus() {
    if (!this.recording || !this.isRunning || this.isPaused) return;

    try {
      // Check if recording object is still valid
      if (!this.recording._canRecord) {
        if (this.opts.debugMode) {
          console.warn('Recording object no longer valid, skipping');
        }
        return;
      }

      const status = await this.recording.getStatusAsync();

      if (!status || !status.isRecording) {
        return;
      }

      const now = performance.now();

      // Get metering level (dB) and convert to linear scale
      let meteringLinear = 0;
      if (status.metering !== undefined && status.metering !== null) {
        const meteringDb = Math.max(-160, Math.min(0, status.metering));
        meteringLinear = Math.pow(10, meteringDb / 20);
      }

      // Update baseline during 2-second gap OR during first loop (before any gap has occurred)
      // After first gap, lock to gap-only updates to prevent video audio pollution
      if (this.isInGap || this.isFirstLoop) {
        this.updateBaseline(meteringLinear);
      }

      // Check for energy spike above threshold
      const baseThreshold = this.baselineEnergy * this.opts.energyThreshold;
      const threshold = Math.min(Math.max(0.01, baseThreshold), 0.5);
      const isSpike = meteringLinear > threshold;

      // Track spikes over 4x for debugging (helps identify putter hits)
      const ratio = meteringLinear / (this.baselineEnergy + 0.0001);
      const is4xSpike = ratio >= 4.0;
      const timeSinceLastSpike = now - this.lastSpikeAt;
      let currentSpikeNumber = null;

      if (is4xSpike && timeSinceLastSpike > 100) {  // Debounce spikes by 100ms
        this.spikeCount++;
        this.lastSpikeAt = now;
        currentSpikeNumber = this.spikeCount;

        if (this.opts.debugMode) {
          console.log(`🔥 SPIKE #${this.spikeCount}: ${ratio.toFixed(1)}x at ${(this.getVideoPosition() * 100).toFixed(1)}%`);
        }
      }

      // Call audio level callback with current data (before any filtering)
      if (this.opts.onAudioLevel) {
        this.opts.onAudioLevel({
          level: meteringLinear,
          baseline: this.baselineEnergy,
          threshold,
          ratio,
          isListening: this.isListening,
          videoPosition: this.getVideoPosition(),
          isAboveThreshold: isSpike,
          spikeNumber: currentSpikeNumber  // Show spike number when over 4x
        });
      }

      // Debounce check
      const timeSinceLastHit = now - this.lastHitAt;
      const debounceOk = timeSinceLastHit > this.opts.debounceMs;

      // Log ALL significant audio activity
      if (meteringLinear > this.baselineEnergy * 1.5) {
        const wouldDetect = isSpike && debounceOk && this.isListening;
        const rejectedReason = !isSpike ? 'Too quiet' :
                               !debounceOk ? 'Debounce' :
                               !this.isListening ? 'Not listening (before 3rd beat)' :
                               'None';

        console.log('🔊 AUDIO SPIKE:', {
          level: meteringLinear.toFixed(6),
          baseline: this.baselineEnergy.toFixed(6),
          threshold: threshold.toFixed(6),
          ratio: ratio.toFixed(2) + 'x',
          listening: this.isListening,
          videoPos: (this.getVideoPosition() * 100).toFixed(1) + '%',
          wouldDetect,
          reason: wouldDetect ? 'DETECTED ✅' : rejectedReason
        });
      }

      if (isSpike && debounceOk && this.isListening) {
        // Capture position IMMEDIATELY (synchronously with spike detection)
        const captureTimestamp = performance.now();
        const capturedPosition = this.getVideoPosition();
        const videoTimestamp = this.opts.videoPlayer?.currentTime || 0;

        // Update state
        this.lastHitAt = now;
        this.hitCount++;
        this.hitDetectedThisLoop = true;  // Mark hit detected, stop listening for rest of loop

        // Store in pending hits buffer for accurate processing
        this.pendingHits.push({
          captureTimestamp,
          videoPosition: capturedPosition,
          videoTimestamp,
          audioLevel: meteringLinear,
          baseline: this.baselineEnergy,
          ratio,
          hitNumber: this.hitCount
        });

        if (this.opts.debugMode) {
          console.log(`🎯 HIT #${this.hitCount} CAPTURED at ${(capturedPosition * 100).toFixed(1)}% (will process in ${this.opts.hitProcessingDelayMs}ms)`, {
            captureTime: captureTimestamp.toFixed(0) + 'ms',
            videoTime: videoTimestamp.toFixed(3) + 's',
            ratio: ratio.toFixed(1) + 'x'
          });
        }

        // Hit will be processed by processPendingHits() after delay
        // This ensures accurate position without affecting timing
      }

      // Debug logging
      if (this.opts.debugMode && this.frameCount % 10 === 0) {
        console.log(`📊 [${this.frameCount}] Audio: ${meteringLinear.toFixed(6)}, Baseline: ${this.baselineEnergy.toFixed(6)}, Threshold: ${threshold.toFixed(6)}, Listening: ${this.isListening}`);
      }

      this.frameCount++;
    } catch (error) {
      if (this.isRunning && this.opts.debugMode) {
        console.warn('Error processing audio:', error.message);
        console.warn('Error stack:', error.stack);
      }
    }
  }

  /**
   * Process pending hits after capture delay
   */
  processPendingHits() {
    if (this.pendingHits.length === 0) return;

    const now = performance.now();
    const processDelay = this.opts.hitProcessingDelayMs || 50;

    // Find hits that are ready to process
    const hitsToProcess = this.pendingHits.filter(
      hit => (now - hit.captureTimestamp) >= processDelay
    );

    if (hitsToProcess.length === 0) return;

    // Process each hit
    hitsToProcess.forEach(hit => {
      const beatTiming = this.getBeatTiming();
      // Default target is Beat 4 center pass (0.75)
      const targetPos = this.opts.targetPosition ?? beatTiming.beat4Position;

      // Calculate timing using CAPTURED position (not current position)
      const timing = this.calculateTiming(hit.videoPosition);

      const hitEvent = {
        timestamp: hit.captureTimestamp,
        position: hit.videoPosition,
        videoTimestamp: hit.videoTimestamp,
        audioLevel: hit.audioLevel,
        baseline: hit.baseline,
        ratio: hit.ratio,
        ...timing,
        hitNumber: hit.hitNumber
      };

      // Send to callback
      if (this.opts.onHitDetected) {
        this.opts.onHitDetected(hitEvent);
      }

      // Debug log
      if (this.opts.debugMode) {
        console.log(`✅ HIT #${hit.hitNumber} PROCESSED (${(now - hit.captureTimestamp).toFixed(0)}ms after capture)`, {
          energy: hit.audioLevel.toFixed(6),
          baseline: hit.baseline.toFixed(6),
          ratio: hit.ratio.toFixed(0) + 'x',
          position: (hit.videoPosition * 100).toFixed(1) + '%',
          target: (targetPos * 100).toFixed(1) + '%',
          beat3: (beatTiming.beat3Position * 100).toFixed(1) + '%',
          beat4: (beatTiming.beat4Position * 100).toFixed(1) + '%',
          errorMs: timing.errorMs.toFixed(0) + 'ms',
          accuracy: (timing.accuracy * 100).toFixed(0) + '%'
        });
      }
    });

    // Remove processed hits from buffer
    this.pendingHits = this.pendingHits.filter(
      hit => !hitsToProcess.includes(hit)
    );
  }

  /**
   * Start position monitoring
   */
  startPositionMonitoring() {
    this.monitoringInterval = setInterval(() => {
      if (!this.isRunning) return;

      // Check for loop restart
      this.checkForLoopRestart();

      const shouldListen = this.shouldBeListening();

      // State change: start listening
      if (shouldListen && !this.isListening) {
        this.isListening = true;
        const beatTiming = this.getBeatTiming();
        if (this.opts.debugMode) {
          console.log(`🎤 LISTENING STARTED at ${(this.getVideoPosition() * 100).toFixed(1)}% (${beatTiming.listenDelayMs}ms after Beat 3 at 50%)`);
        }
      }

      // State change: stop listening
      if (!shouldListen && this.isListening) {
        this.isListening = false;
        if (this.opts.debugMode) {
          console.log(`🔇 LISTENING ENDED at ${(this.getVideoPosition() * 100).toFixed(1)}%`);
        }
      }

      // Poll audio status
      this.processAudioStatus();

      // Process pending hits (delayed for accuracy)
      this.processPendingHits();
    }, 100);
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
   * Start the detector (call once, then use pause/resume)
   */
  async start() {
    if (this.isRunning) {
      console.warn('Detector already running');
      return;
    }

    if (!this.opts.videoPlayer) {
      throw new Error('VideoSyncDetectorV2 requires a video player reference');
    }

    try {
      const beatTiming = this.getBeatTiming();
      const targetPos = this.opts.targetPosition || (
        beatTiming.beat4Position + ((1.0 - beatTiming.beat4Position) / 2)
      );
      console.log('🎯 VideoSyncDetectorV2 starting...', {
        bpm: this.opts.bpm,
        beatsInVideo: this.opts.beatsInVideo,
        beat3: (beatTiming.beat3Position * 100).toFixed(0) + '%',
        beat4: (beatTiming.beat4Position * 100).toFixed(0) + '%',
        listenDelay: beatTiming.listenDelayMs + 'ms',
        listenWindow: `${(beatTiming.listenStartPercent * 100).toFixed(1)}%-100% (${beatTiming.listenDelayMs}ms after Beat 3)`,
        targetPosition: (targetPos * 100).toFixed(1) + '%',
        debugMode: this.opts.debugMode ? 'ON' : 'OFF'
      });

      // Request microphone permissions
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        throw new Error('Microphone permission denied');
      }

      // Configure audio mode for recording + playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      // Small delay for audio mode to stabilize
      await new Promise(resolve => setTimeout(resolve, 200));

      // Create and start recording
      this.recording = new Audio.Recording();

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
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      };

      await this.recording.prepareToRecordAsync(recordingOptions);
      await this.recording.startAsync();

      this.isRunning = true;
      this.isPaused = false;
      this.startTime = performance.now();
      this.frameCount = 0;
      this.hitCount = 0;
      this.spikeCount = 0;
      this.lastSpikeAt = 0;
      this.baselineFrames = [];
      this.baselineEnergy = 0.005;      // Start with minimum baseline (not 0)
      this.lastHitAt = 0;
      this.lastVideoPosition = 0;
      this.isFirstLoop = true;          // Allow baseline building during first loop

      // Set up video event listener to detect 2-second gap
      const player = this.opts.videoPlayer;
      this.videoListener = player.addListener('playingChange', (event) => {
        const isVideoPlaying = event.isPlaying;

        // Detect video stop (entering 2-second gap)
        if (this.videoWasPlaying && !isVideoPlaying) {
          if (this.opts.debugMode) {
            console.log('📹 Video stopped - entering 2-second gap, building baseline');
          }
          this.isInGap = true;
          this.isFirstLoop = false;  // No longer first loop - lock to gap-only baseline updates
          // Clear old baseline to start fresh
          this.baselineFrames = [];
        }

        // Detect video start (exiting gap)
        if (!this.videoWasPlaying && isVideoPlaying) {
          if (this.opts.debugMode) {
            console.log('📹 Video started - freezing baseline at ' + this.baselineEnergy.toFixed(6));
          }
          this.isInGap = false;
        }

        this.videoWasPlaying = isVideoPlaying;
      });

      // Start monitoring
      this.startPositionMonitoring();

      console.log('✅ VideoSyncDetectorV2 started and recording');
    } catch (error) {
      console.error('Failed to start VideoSyncDetectorV2:', error);
      this.isRunning = false;
      this.isPaused = false;

      // Cleanup
      if (this.recording) {
        try {
          await this.recording.stopAndUnloadAsync();
        } catch (e) {
          // Ignore cleanup errors
        }
        this.recording = null;
      }

      throw error;
    }
  }

  /**
   * Pause detection (keeps recording alive, just stops listening)
   */
  pause() {
    if (!this.isRunning) return;

    this.isPaused = true;
    this.isListening = false;

    if (this.opts.debugMode) {
      console.log('⏸️ Detector paused (recording continues)');
    }
  }

  /**
   * Resume detection (re-enables listening)
   */
  resume() {
    if (!this.isRunning) return;

    this.isPaused = false;

    if (this.opts.debugMode) {
      console.log('▶️ Detector resumed');
    }
  }

  /**
   * Stop the detector (call only when completely done)
   */
  async stop() {
    if (!this.isRunning) return;

    try {
      console.log('🛑 VideoSyncDetectorV2 stopping...');

      this.isRunning = false;
      this.isPaused = false;
      this.isListening = false;

      // Stop monitoring
      this.stopPositionMonitoring();

      // Remove video event listener
      if (this.videoListener) {
        this.videoListener.remove();
        this.videoListener = null;
      }

      // Stop recording
      if (this.recording) {
        try {
          await this.recording.stopAndUnloadAsync();
        } catch (error) {
          console.warn('Error unloading recording:', error.message);
        }
        this.recording = null;
      }

      // Reset audio mode
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
        });
      } catch (error) {
        console.warn('Error resetting audio mode:', error.message);
      }

      const duration = (performance.now() - this.startTime) / 1000;
      console.log(`🛑 Detector stopped. Duration: ${duration.toFixed(1)}s, Hits: ${this.hitCount}`);
    } catch (error) {
      console.error('Error stopping detector:', error);
      this.isRunning = false;
      this.isPaused = false;
      this.isListening = false;
      this.recording = null;
    }
  }

  /**
   * Update BPM
   * @param {number} bpm - New BPM value
   */
  setBpm(bpm) {
    this.opts.bpm = bpm;

    if (this.opts.debugMode) {
      const beatTiming = this.getBeatTiming();
      console.log(`🎵 BPM updated to ${bpm}, listening window now: ${(beatTiming.listenStartPercent * 100).toFixed(0)}%-100%`);
    }
  }

  /**
   * Get detector statistics
   * @returns {Object} Statistics
   */
  getStats() {
    const uptime = this.isRunning ? (performance.now() - this.startTime) / 1000 : 0;
    const beatTiming = this.getBeatTiming();

    return {
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      isListening: this.isListening,
      hitCount: this.hitCount,
      uptime: uptime.toFixed(1) + 's',
      frameCount: this.frameCount,
      baselineEnergy: this.baselineEnergy.toFixed(6),
      videoPosition: (this.getVideoPosition() * 100).toFixed(1) + '%',
      listenWindow: `${(beatTiming.listenStartPercent * 100).toFixed(0)}%-100%`
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
    this.spikeCount = 0;
    this.lastSpikeAt = 0;
    this.frameCount = 0;
    this.lastVideoPosition = 0;

    if (this.opts.debugMode) {
      console.log('🔄 Detector reset');
    }
  }
}

export default VideoSyncDetectorV2;
