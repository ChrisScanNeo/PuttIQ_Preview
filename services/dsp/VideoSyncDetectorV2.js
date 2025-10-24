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

import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { Platform } from 'react-native';

let ExpoPlayAudioStream = null;
try {
  const audioStreamModule = require('@cjblack/expo-audio-stream');
  ExpoPlayAudioStream = audioStreamModule?.ExpoPlayAudioStream ?? null;
} catch (error) {
  // Module not available (likely running in Expo Go); fall back to expo-av
  ExpoPlayAudioStream = null;
}

export class VideoSyncDetectorV2 {
  constructor(options = {}) {
    // Configuration
    this.opts = {
      bpm: 70,                          // Beats per minute
      videoPlayer: null,                // Video player reference
      sampleRate: 44100,                // Audio sample rate
      beatsInVideo: 4,                  // Number of beats in video (default 4)

      // Detection parameters
      energyThreshold: 1.3,             // Multiplier above baseline for detection (lowered for weak putter hits)
      baselineWindow: 80,               // Frames to average for baseline
      baselineSettleMs: 100,            // Guard period after baseline reset
      debounceMs: 200,                  // Minimum time between detections

      // Timing parameters
      targetPosition: null,             // Target position for perfect hit (null = auto-calculate as 87.5%)
      listenDelayMs: 300,               // Delay after Beat 3 before listening starts (to avoid detecting Beat 3 tone)
      hitProcessingDelayMs: 50,         // Delay before processing hit (allows for accurate capture without affecting timing)
      audioLatencyMs: 350,           // Override temporal offset (defaults to hitProcessingDelayMs)
      micGain: 3.,                     // Software gain applied to microphone input before detection
      spikeHoldFrames: 1,               // Require N consecutive frames above threshold before counting a hit
      fastStrikeRatio: 4.0,             // Bypass hold requirement for very strong impacts
      singleFrameBypassRatio: 1.0,     // Allow single-frame detections when ratio exceeds this multiplier
      listeningTailMs: 200,             // Keep window open after closure to absorb audio latency
      listeningEntryGuardMs: 0,         // Ignore detections for N ms after window opens

      // Callbacks
      onHitDetected: () => {},          // Called when hit detected
      onAudioLevel: () => {},           // Called every 100ms with current audio level

      // Debug
      debugMode: true,

      ...options
    };

    // Prefer native audio stream module when available (iOS custom build)
    this.audioStreamModule = ExpoPlayAudioStream;
    this.useAudioStream =
      Platform.OS === 'ios' &&
      !!(this.audioStreamModule && typeof this.audioStreamModule.startRecording === 'function');
    this.audioStreamSubscription = null;
    this.isAudioStreamActive = false;

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
    this.consecutiveSpikeFrames = 0;  // Track consecutive frames above threshold while listening

    // Normalize configurable thresholds
    this.opts.spikeHoldFrames = Math.max(1, Math.floor(this.opts.spikeHoldFrames || 1));
    const bypassRatioValue = Number(this.opts.singleFrameBypassRatio);
    this.opts.singleFrameBypassRatio = Number.isFinite(bypassRatioValue)
      ? Math.max(1.2, bypassRatioValue)
      : 1.9;
    const hitDelayValue = Number(this.opts.hitProcessingDelayMs);
    this.opts.hitProcessingDelayMs = Number.isFinite(hitDelayValue)
      ? Math.max(0, hitDelayValue)
      : 0;
    const audioLatencyValue = Number(this.opts.audioLatencyMs);
    this.opts.audioLatencyMs = Number.isFinite(audioLatencyValue)
      ? Math.max(0, audioLatencyValue)
      : this.opts.hitProcessingDelayMs;
    const tailValue = Number(this.opts.listeningTailMs);
    if (Number.isFinite(tailValue)) {
      this.opts.listeningTailMs = Math.max(0, tailValue);
    } else {
      const latencyFallback = this.opts.audioLatencyMs;
      this.opts.listeningTailMs = latencyFallback > 0
        ? Math.max(0, latencyFallback)
        : 0;
    }
    const entryGuardValue = Number(this.opts.listeningEntryGuardMs);
    this.opts.listeningEntryGuardMs = Number.isFinite(entryGuardValue)
      ? Math.max(0, entryGuardValue)
      : 0;

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

    // Noise-floor settling guard
    this.baselineSettleUntil = 0;
    this.listeningGraceUntil = 0;
    this.listeningStartedAt = 0;

    // Audio monitoring
    this.monitoringInterval = null;

    // Bind handlers for native audio stream callbacks
    this.handleAudioStreamData = this.handleAudioStreamData.bind(this);
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

    // Fixed delay after Beat 3 to avoid detecting the tone (configurable via listenDelayMs)
    const configuredDelayMs = typeof this.opts.listenDelayMs === 'number'
      ? this.opts.listenDelayMs
      : 540;

    // Ensure we stay before Beat 4 with a small safety buffer
    const timeBetweenBeat3And4 = (beat4Position - beat3Position) * videoDuration;
    const safetyBufferMs = 10;
    const maxDelayBeforeBeat4 = Math.max(0, timeBetweenBeat3And4 - safetyBufferMs);
    const listenDelayMs = Math.max(0, Math.min(configuredDelayMs, maxDelayBeforeBeat4));

    const listenDelayAsVideoPercent = videoDuration > 0 ? (listenDelayMs / videoDuration) : 0;
    const rawStartPercent = beat3Position + listenDelayAsVideoPercent;
    const maxStartPercent = beat4Position - (safetyBufferMs / Math.max(videoDuration, 1));
    const listenStartPercent = Math.max(
      beat3Position,
      Math.min(maxStartPercent, rawStartPercent)
    );

    return {
      beatDurationMs,
      beatsInVideo: this.opts.beatsInVideo,
      videoDuration,            // Total video duration in ms
      beat3Position,            // 0.50
      beat4Position,            // 0.75
      listenDelayMs,            // Effective delay (default 540ms) after Beat 3, clamped before Beat 4
      listenStartPercent,       // Listening window start percent (~62-63% with default delay)
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
  resetBaseline(reason = 'resetBaseline') {
    this.baselineFrames = [];
    this.baselineEnergy = 0.005;      // Reset to minimum baseline (not 0)
    this.isInGap = false;
    this.videoWasPlaying = false;
    this.hitDetectedThisLoop = false;  // Reset hit flag for new loop
    this.isFirstLoop = true;           // Allow baseline building in next loop
    this.consecutiveSpikeFrames = 0;
    this.pendingHits = [];
    this.listeningGraceUntil = 0;
    this.listeningStartedAt = 0;
    this.scheduleBaselineSettle(reason);

    if (this.opts.debugMode) {
      console.log(`🔄 Baseline reset (${reason})`);
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
    const videoDurationMs = videoDuration * 1000;
    const latencyMs = this.opts.audioLatencyMs || 0;
    const latencyFraction = videoDurationMs > 0 ? latencyMs / videoDurationMs : 0;
    const adjustedPosition = Math.max(0, Math.min(1, hitPosition - latencyFraction));
    const errorMs = (adjustedPosition - targetPosition) * videoDurationMs;

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
      if (adjustedPosition <= b4) {
        // Early region: map [listenStart..b4] -> [1.0..0.5]
        const t = Math.max(0, Math.min(1, (adjustedPosition - listenStart) / Math.max(1e-6, (b4 - listenStart))));
        displayPosition = 1.0 - 0.5 * t;
      } else {
        // Late region: map [b4..end] -> [0.5..0.0]
        const t = Math.max(0, Math.min(1, (adjustedPosition - b4) / Math.max(1e-6, (end - b4))));
        displayPosition = 0.5 * (1 - t);
      }
    } catch (e) {
      // Fallback stays at 0.5 if anything goes wrong
    }

    return {
      position: hitPosition,
      adjustedPosition,
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
      this.resetBaseline('loop-detected');
    }

    this.lastVideoPosition = currentPosition;
  }

  /**
   * Handle a metering sample (linear volume) and perform detection logic
   * @param {number} meteringLinear - Linear audio level (0-1)
   * @param {number} sampleTimestamp - Timestamp associated with the sample
   */
  handleMeteringSample(meteringLinear, sampleTimestamp = performance.now()) {
    if (!this.isRunning || this.isPaused) {
      return;
    }

    // Update baseline during 2-second gap OR during first loop (before any gap has occurred)
    // After first gap, lock to gap-only updates to prevent video audio pollution
    if (this.isInGap || this.isFirstLoop) {
      this.updateBaseline(meteringLinear);
    }

    const gainMultiplier = Math.max(0.1, this.opts.micGain ?? 1);
    const adjustedLevel = Math.min(1, meteringLinear * gainMultiplier);

    // Check for energy spike above threshold
    const baseThreshold = this.baselineEnergy * this.opts.energyThreshold;
    const threshold = Math.min(Math.max(0.01, baseThreshold), 0.5);
    const isSpike = adjustedLevel > threshold;

    // Track spikes over 4x for debugging (helps identify putter hits)
    const ratio = adjustedLevel / (this.baselineEnergy + 0.0001);
    const fastStrikeRatio = Math.max(1.5, this.opts.fastStrikeRatio || 0);
    const isFastStrike = ratio >= fastStrikeRatio;
    const is4xSpike = ratio >= 4.0;
    const timeSinceLastSpike = sampleTimestamp - this.lastSpikeAt;
    let currentSpikeNumber = null;
    const isSettling = this.isSettling(sampleTimestamp);

    if (is4xSpike && timeSinceLastSpike > 100) {  // Debounce spikes by 100ms
      this.spikeCount++;
      this.lastSpikeAt = sampleTimestamp;
      currentSpikeNumber = this.spikeCount;

      if (this.opts.debugMode) {
        console.log(`🔥 SPIKE #${this.spikeCount}: ${ratio.toFixed(1)}x at ${(this.getVideoPosition() * 100).toFixed(1)}%`);
      }
    }

    const graceActive = this.listeningGraceUntil > 0 && sampleTimestamp <= this.listeningGraceUntil;
    const listeningWindowActive = (this.isListening || graceActive) && !this.hitDetectedThisLoop;
    const entryGuardMs = Math.max(0, this.opts.listeningEntryGuardMs || 0);
    const entryGuardActive = entryGuardMs > 0 && this.listeningStartedAt > 0 && (sampleTimestamp - this.listeningStartedAt) < entryGuardMs;
    const detectionWindowActive = listeningWindowActive && !entryGuardActive;

    // Call audio level callback with current data (before any filtering)
    if (detectionWindowActive && !isSettling) {
      if (isSpike) {
        this.consecutiveSpikeFrames += 1;
        if (isFastStrike) {
          this.consecutiveSpikeFrames = Math.max(this.consecutiveSpikeFrames, this.opts.spikeHoldFrames);
        }
      } else {
        this.consecutiveSpikeFrames = 0;
      }
    } else {
      this.consecutiveSpikeFrames = 0;
    }

    const holdFramesMet = this.consecutiveSpikeFrames >= this.opts.spikeHoldFrames;
    const singleFrameBypassRatio = this.opts.singleFrameBypassRatio > 0 ? this.opts.singleFrameBypassRatio : 0;
    const singleFrameBypass = !holdFramesMet && singleFrameBypassRatio > 0 && ratio >= singleFrameBypassRatio;
    const detectionReady = detectionWindowActive && (holdFramesMet || singleFrameBypass);

    if (this.opts.onAudioLevel) {
      this.opts.onAudioLevel({
        level: adjustedLevel,
        levelRaw: meteringLinear,
        baseline: this.baselineEnergy,
        threshold,
        ratio,
        isListening: this.isListening,
        listeningWindowActive,
        entryGuardActive,
        detectionWindowActive,
        gainMultiplier,
        consecutiveSpikeFrames: this.consecutiveSpikeFrames,
        spikeHoldFrames: this.opts.spikeHoldFrames,
        videoPosition: this.getVideoPosition(),
        isAboveThreshold: isSpike,
        spikeNumber: currentSpikeNumber,
        isSettling,
        holdFramesMet,
        graceActive,
        singleFrameBypass
      });
    }

    // Debounce check
    const timeSinceLastHit = sampleTimestamp - this.lastHitAt;
    const debounceOk = timeSinceLastHit > this.opts.debounceMs;

    // Log ALL significant audio activity
    if (adjustedLevel > this.baselineEnergy * 1.5) {
      const wouldDetect = isSpike && debounceOk && detectionReady && !isSettling;
      const rejectedReason = !isSpike ? 'Too quiet' :
                             !debounceOk ? 'Debounce' :
                             isSettling ? 'Settling' :
                             !listeningWindowActive ? 'Listening window closed' :
                             entryGuardActive ? `Entry guard (${Math.max(0, Math.round(entryGuardMs - (sampleTimestamp - this.listeningStartedAt)))}ms)` :
                             !detectionWindowActive ? 'Entry guard active' :
                             !detectionReady ? `Not held (${this.consecutiveSpikeFrames}/${this.opts.spikeHoldFrames})` :
                             'None';

      console.log('🔊 AUDIO SPIKE:', {
        level: adjustedLevel.toFixed(6),
        levelRaw: meteringLinear.toFixed(6),
        baseline: this.baselineEnergy.toFixed(6),
        threshold: threshold.toFixed(6),
        ratio: ratio.toFixed(2) + 'x',
        gainMultiplier: gainMultiplier.toFixed(2) + 'x',
        listening: this.isListening,
        listeningWindowActive,
        entryGuardActive,
        detectionWindowActive,
        consecutiveSpikeFrames: this.consecutiveSpikeFrames,
        spikeHoldFrames: this.opts.spikeHoldFrames,
        holdFramesMet,
        graceActive,
        singleFrameBypass,
        videoPos: (this.getVideoPosition() * 100).toFixed(1) + '%',
        wouldDetect,
        reason: wouldDetect ? 'DETECTED ✅' : rejectedReason,
        fastStrike: isFastStrike
      });
    }

    if (isSpike && debounceOk && detectionReady && !isSettling) {
      // Capture position IMMEDIATELY (synchronously with spike detection)
      const captureTimestamp = performance.now();
      const capturedPosition = this.getVideoPosition();
      const videoTimestamp = this.opts.videoPlayer?.currentTime || 0;

      // Update state
      this.lastHitAt = sampleTimestamp;
      this.hitCount++;
      this.hitDetectedThisLoop = true;  // Mark hit detected, stop listening for rest of loop

      // Store in pending hits buffer for accurate processing
      this.pendingHits.push({
        captureTimestamp,
        videoPosition: capturedPosition,
        videoTimestamp,
        audioLevel: adjustedLevel,
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

      // Process immediately when possible to reduce UI latency
      this.processPendingHits();
    }

    // Debug logging
    if (this.opts.debugMode && this.frameCount % 10 === 0) {
      console.log(`📊 [${this.frameCount}] Audio: ${meteringLinear.toFixed(6)}, Baseline: ${this.baselineEnergy.toFixed(6)}, Threshold: ${threshold.toFixed(6)}, Listening: ${this.isListening}`);
    }

    this.frameCount++;
  }

  /**
   * Process audio recording status and detect hits
   */
  async processAudioStatus() {
    if (this.useAudioStream) {
      return; // Native audio stream provides its own callbacks
    }

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
      this.handleMeteringSample(meteringLinear, now);
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
      const audioLatencyMs = this.opts.audioLatencyMs || 0;

      const hitEvent = {
        timestamp: hit.captureTimestamp - audioLatencyMs,
        position: hit.videoPosition,
        videoTimestamp: hit.videoTimestamp,
        audioLevel: hit.audioLevel,
        baseline: hit.baseline,
        ratio: hit.ratio,
        ...timing,
        latencyAppliedMs: audioLatencyMs,
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
   * Start recording using the native Expo audio stream module
   * Includes retry logic to handle audio session conflicts (e.g., with expo-video)
   */
  async startAudioStreamRecording() {
    if (!this.audioStreamModule) {
      throw new Error('ExpoPlayAudioStream module not available');
    }

    const recordingConfig = {
      sampleRate: this.opts.sampleRate,
      channels: 1,
      bitsPerChannel: 16,
      interval: 100, // ms between callbacks (match metering interval)
      onAudioStream: this.handleAudioStreamData
    };

    // Retry logic to handle audio session conflicts
    const maxRetries = 2;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (this.opts.debugMode) {
          console.log(`🎙️ Starting audio stream recording (attempt ${attempt}/${maxRetries})`);
        }

        const result = await this.audioStreamModule.startRecording(recordingConfig);
        this.audioStreamSubscription = result?.subscription ?? null;
        this.isAudioStreamActive = true;

        if (this.opts.debugMode) {
          console.log('✅ Audio stream recording started successfully');
        }
        return; // Success!

      } catch (error) {
        lastError = error;
        const errorMsg = error?.message || String(error);

        if (this.opts.debugMode) {
          console.warn(`⚠️ Audio recording attempt ${attempt} failed:`, errorMsg);
        }

        // Check if this is the specific error we're trying to handle
        const isFormatError = errorMsg.includes('-10868') ||
                             errorMsg.includes('could not start the audio engine') ||
                             errorMsg.includes('SetOutputFormat');

        if (isFormatError && attempt < maxRetries) {
          // Wait before retrying to allow audio session to settle
          const retryDelay = 300; // ms
          if (this.opts.debugMode) {
            console.log(`⏳ Waiting ${retryDelay}ms before retry...`);
          }
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } else if (!isFormatError) {
          // Different error - don't retry
          throw error;
        }
      }
    }

    // All retries failed
    const errorMsg = lastError?.message || String(lastError);
    throw new Error(
      `Failed to start recording after ${maxRetries} attempts: ${errorMsg}. ` +
      'Please try closing and reopening the app.'
    );
  }

  /**
   * Stop the native audio stream recording and clean up subscription
   */
  async stopAudioStreamRecording() {
    if (!this.audioStreamModule || !this.isAudioStreamActive) {
      return;
    }

    try {
      await this.audioStreamModule.stopRecording();
    } catch (error) {
      if (this.opts.debugMode) {
        console.warn('Error stopping ExpoPlayAudioStream recording:', error.message);
      }
    }

    if (this.audioStreamSubscription && typeof this.audioStreamSubscription.remove === 'function') {
      try {
        this.audioStreamSubscription.remove();
      } catch (subscriptionError) {
        if (this.opts.debugMode) {
          console.warn('Error removing audio stream subscription:', subscriptionError.message);
        }
      }
    }

    this.audioStreamSubscription = null;
    this.isAudioStreamActive = false;
  }

  /**
   * Handle audio data from ExpoPlayAudioStream
   * @param {Object} audioData - Native audio stream payload
   */
  handleAudioStreamData(audioData) {
    if (!this.isRunning) {
      return;
    }

    try {
      const base64Audio = audioData?.data;
      if (!base64Audio) {
        return;
      }

      const samples = this.base64ToInt16Array(base64Audio);
      if (!samples || samples.length === 0) {
        return;
      }

      const rms = this.computeRms(samples);
      this.handleMeteringSample(rms, performance.now());
    } catch (error) {
      if (this.opts.debugMode) {
        console.warn('Error processing audio stream data:', error.message);
      }
    }
  }

  /**
   * Convert base64 encoded PCM16 audio to Int16Array
   */
  base64ToInt16Array(base64) {
    let binaryString;
    if (typeof atob === 'function') {
      binaryString = atob(base64);
    } else if (typeof globalThis !== 'undefined' && typeof globalThis.Buffer !== 'undefined') {
      binaryString = globalThis.Buffer.from(base64, 'base64').toString('binary');
    } else {
      throw new Error('No base64 decoder available');
    }
    const len = binaryString.length;
    const bytes = new Uint8Array(len);

    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    return new Int16Array(bytes.buffer);
  }

  /**
   * Compute RMS value from PCM16 samples (returns 0-1)
   */
  computeRms(samples) {
    if (!samples || samples.length === 0) {
      return 0;
    }

    let sumSquares = 0;
    for (let i = 0; i < samples.length; i++) {
      const normalized = samples[i] / 32768;
      sumSquares += normalized * normalized;
    }

    return Math.sqrt(sumSquares / samples.length);
  }

  /**
   * Start position monitoring
   */
  startPositionMonitoring() {
    this.monitoringInterval = setInterval(() => {
      if (!this.isRunning) return;

      // Process pending hits (delayed for accuracy) before any state resets
      this.processPendingHits();

      // Check for loop restart
      this.checkForLoopRestart();

      const shouldListen = this.shouldBeListening();

      // State change: start listening
      if (shouldListen && !this.isListening) {
        this.isListening = true;
        const now = typeof performance !== 'undefined' && typeof performance.now === 'function'
          ? performance.now()
          : Date.now();
        this.listeningStartedAt = now;
        this.listeningGraceUntil = now + Math.max(0, this.opts.listeningTailMs || 0);
        const beatTiming = this.getBeatTiming();
        const positionFraction = this.getVideoPosition();
        const positionPercent = (positionFraction * 100).toFixed(1);
        const videoTimeMs = positionFraction * beatTiming.videoDuration;
        const beat3TimeMs = beatTiming.beat3Position * beatTiming.videoDuration;
        const timeSinceBeat3Ms = Math.max(0, videoTimeMs - beat3TimeMs);

        console.log('🎧 LISTENING WINDOW OPEN', {
          bpm: this.opts.bpm,
          positionPercent: `${positionPercent}%`,
          delayAfterBeat3Ms: beatTiming.listenDelayMs,
          timeSinceBeat3Ms: Math.round(timeSinceBeat3Ms),
          beat3TimeMs: Math.round(beat3TimeMs),
          beat4TimeMs: Math.round(beatTiming.beat4Position * beatTiming.videoDuration),
          videoTimeMs: Math.round(videoTimeMs),
          spikeHoldFrames: this.opts.spikeHoldFrames,
        });

        if (this.opts.debugMode) {
          console.log(`🎤 LISTENING STARTED at ${positionPercent}% (${beatTiming.listenDelayMs}ms after Beat 3 at 50%)`);
        }
      }

      // State change: stop listening
      if (!shouldListen && this.isListening) {
        this.isListening = false;
        const now = typeof performance !== 'undefined' && typeof performance.now === 'function'
          ? performance.now()
          : Date.now();
        this.listeningStartedAt = 0;
        this.listeningGraceUntil = now + Math.max(0, this.opts.listeningTailMs || 0);
        const beatTiming = this.getBeatTiming();
        const positionFraction = this.getVideoPosition();
        const positionPercent = (positionFraction * 100).toFixed(1);
        const videoTimeMs = positionFraction * beatTiming.videoDuration;
        const beat3TimeMs = beatTiming.beat3Position * beatTiming.videoDuration;
        const timeSinceBeat3Ms = Math.max(0, videoTimeMs - beat3TimeMs);
        const windowStartPercent = (beatTiming.listenStartPercent * 100).toFixed(1);
        const windowDurationMs = Math.max(0, videoTimeMs - (beatTiming.listenStartPercent * beatTiming.videoDuration));

        console.log('🛑 LISTENING WINDOW CLOSED', {
          bpm: this.opts.bpm,
          positionPercent: `${positionPercent}%`,
          windowStartPercent: `${windowStartPercent}%`,
          windowDurationMs: Math.round(windowDurationMs),
          timeSinceBeat3Ms: Math.round(timeSinceBeat3Ms),
          beat4TimeMs: Math.round(beatTiming.beat4Position * beatTiming.videoDuration),
          videoTimeMs: Math.round(videoTimeMs),
          spikeHoldFrames: this.opts.spikeHoldFrames,
        });

        if (this.opts.debugMode) {
          console.log(`🔇 LISTENING ENDED at ${positionPercent}% (window start was ${windowStartPercent}%)`);
        }
      }

      // Poll audio status
      this.processAudioStatus();
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
        micGain: `${this.opts.micGain}x`,
        energyThreshold: this.opts.energyThreshold,
        baselineWindow: this.opts.baselineWindow,
        baselineSettleMs: this.opts.baselineSettleMs,
        spikeHoldFrames: this.opts.spikeHoldFrames,
        debugMode: this.opts.debugMode ? 'ON' : 'OFF'
      });

      // Request microphone permissions
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        throw new Error('Microphone permission denied');
      }

      this.recording = null;

      if (this.useAudioStream) {
        if (this.opts.debugMode) {
          console.log('🎧 Using ExpoPlayAudioStream for audio capture (defaultToSpeaker enabled)');
        }
        await this.startAudioStreamRecording();
      } else {
        // Configure audio mode for recording (required by expo-av)
        // Note: This may override native audio session settings, so we compensate
        // by setting video player volume to maximum in the hook
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          interruptionModeIOS: InterruptionModeIOS.MixWithOthers,
          interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
          shouldDuckAndroid: false,
        });

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
      }

      this.isRunning = true;
      this.isPaused = false;
      this.startTime = performance.now();
      this.frameCount = 0;
      this.hitCount = 0;
      this.spikeCount = 0;
      this.lastSpikeAt = 0;
      this.lastHitAt = 0;
      this.lastVideoPosition = 0;
      this.resetBaseline('start');

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
      if (this.useAudioStream) {
        await this.stopAudioStreamRecording();
      } else if (this.recording) {
        try {
          await this.recording.stopAndUnloadAsync();
        } catch (e) {
          // Ignore cleanup errors
        }
        this.recording = null;
      }

      // Provide user-friendly error message for common issues
      const errorMsg = error?.message || String(error);
      if (errorMsg.includes('-10868') || errorMsg.includes('could not start the audio engine')) {
        throw new Error(
          'Failed to start detector: Audio system conflict detected. ' +
          'Please close and reopen the app, then try again.'
        );
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
    this.listeningStartedAt = 0;

    if (this.useAudioStream && this.isAudioStreamActive && this.audioStreamModule?.pauseRecording) {
      try {
        this.audioStreamModule.pauseRecording();
      } catch (error) {
        if (this.opts.debugMode) {
          console.warn('Error pausing audio stream recording:', error.message);
        }
      }
    }

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
    this.resetBaseline('resume');

    if (this.useAudioStream && this.isAudioStreamActive && this.audioStreamModule?.resumeRecording) {
      try {
        this.audioStreamModule.resumeRecording();
      } catch (error) {
        if (this.opts.debugMode) {
          console.warn('Error resuming audio stream recording:', error.message);
        }
      }
    }

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
      this.listeningStartedAt = 0;
      this.consecutiveSpikeFrames = 0;
      this.baselineSettleUntil = 0;
      this.listeningGraceUntil = 0;

      // Stop monitoring
      this.stopPositionMonitoring();

      // Remove video event listener
      if (this.videoListener) {
        this.videoListener.remove();
        this.videoListener = null;
      }

      // Stop recording
      if (this.useAudioStream) {
        await this.stopAudioStreamRecording();
      } else if (this.recording) {
        try {
          await this.recording.stopAndUnloadAsync();
        } catch (error) {
          console.warn('Error unloading recording:', error.message);
        }
        this.recording = null;
      }

      // NOTE: No need to reset audio mode - native session handles this

      const duration = (performance.now() - this.startTime) / 1000;
      console.log(`🛑 Detector stopped. Duration: ${duration.toFixed(1)}s, Hits: ${this.hitCount}`);
    } catch (error) {
      console.error('Error stopping detector:', error);
      this.isRunning = false;
      this.isPaused = false;
      this.isListening = false;
      this.listeningStartedAt = 0;
      this.consecutiveSpikeFrames = 0;
      this.recording = null;
      this.baselineSettleUntil = 0;
      this.listeningGraceUntil = 0;
      if (this.useAudioStream) {
        await this.stopAudioStreamRecording();
      }
    }
  }

  /**
   * Update detector parameters at runtime
   * @param {Object} params - Partial options to merge
   */
  updateParams(params = {}) {
    Object.assign(this.opts, params);

    if (params.spikeHoldFrames !== undefined) {
      this.opts.spikeHoldFrames = Math.max(1, Math.floor(this.opts.spikeHoldFrames || 1));
    }

    if (params.audioLatencyMs !== undefined) {
      if (typeof this.opts.audioLatencyMs !== 'number' || Number.isNaN(this.opts.audioLatencyMs)) {
        this.opts.audioLatencyMs = this.opts.hitProcessingDelayMs || 0;
      }
    }

    if (params.listeningEntryGuardMs !== undefined) {
      const guardValue = Number(this.opts.listeningEntryGuardMs);
      this.opts.listeningEntryGuardMs = Number.isFinite(guardValue)
        ? Math.max(0, guardValue)
        : this.opts.listeningEntryGuardMs;
    }

    if (params.debugMode !== undefined) {
      this.opts.debugMode = !!params.debugMode;
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
      listenWindow: `${(beatTiming.listenStartPercent * 100).toFixed(0)}%-100%`,
      entryGuardMs: this.opts.listeningEntryGuardMs,
      micGain: `${this.opts.micGain}x`,
      energyThreshold: this.opts.energyThreshold,
      spikeHoldFrames: this.opts.spikeHoldFrames
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
    this.scheduleBaselineSettle('reset');

    if (this.opts.debugMode) {
      console.log('🔄 Detector reset');
    }
  }

  /**
   * Determine whether we are within the post-reset settling period
   * @param {number} timestamp - Comparison timestamp
   * @returns {boolean}
   */
  isSettling(timestamp = performance.now()) {
    return this.baselineSettleUntil > 0 && timestamp < this.baselineSettleUntil;
  }

  /**
   * Schedule a settling window after baseline reset
   * @param {string} reason - Debug identifier
   */
  scheduleBaselineSettle(reason = 'reset') {
    const settleMs = Math.max(0, this.opts.baselineSettleMs ?? 0);
    if (settleMs <= 0) {
      this.baselineSettleUntil = 0;
      return;
    }

    const now = typeof performance !== 'undefined' && typeof performance.now === 'function'
      ? performance.now()
      : Date.now();
    this.baselineSettleUntil = now + settleMs;

    if (this.opts.debugMode) {
      console.log(`⏱️ Baseline settling for ${settleMs}ms (${reason})`);
    }
  }
}

export default VideoSyncDetectorV2;
