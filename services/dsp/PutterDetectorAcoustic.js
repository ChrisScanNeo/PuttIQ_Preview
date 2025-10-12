/**
 * Professional Putter Strike Detector
 * Multi-band acoustic analysis with adaptive thresholds
 *
 * Designed to detect putter impacts (insert milled, face insert, steel/aluminum)
 * while rejecting wind, voice, footsteps, and metronome ticks.
 *
 * Acoustic Profile of Putter Strike:
 * - Sharp onset: 3-10ms rise time
 * - Dominant frequency: 2-8kHz (click/ting)
 * - Low frequency: 120-300Hz (thump from head/ball coupling)
 * - Decay: <150ms for high band
 */

import { BiquadFilter, FilterChain } from './BiquadFilter';
import { MultiBandThreshold } from './AdaptiveThreshold';

// Import ExpoPlayAudioStream for microphone access
let ExpoPlayAudioStream = null;

try {
  const audioStreamModule = require('@cjblack/expo-audio-stream');
  ExpoPlayAudioStream = audioStreamModule.ExpoPlayAudioStream;

  if (!ExpoPlayAudioStream) {
    console.warn('ExpoPlayAudioStream not found, acoustic detector requires native build');
  }
} catch (e) {
  console.error('Failed to load expo-audio-stream:', e);
}

export class PutterDetectorAcoustic {
  constructor(options = {}) {
    // Configuration
    this.opts = {
      sampleRate: 44100,
      frameLength: 256,

      // Detection parameters
      onsetTimeMs: 20,          // Maximum rise time for onset (ms)
      maxDurationMs: 150,       // Maximum event duration (ms)
      debounceMs: 150,          // Minimum time between detections (ms)

      // Adaptive threshold settings
      baselineWindow: 100,      // Frames to track for baseline (~1 second)
      highBandMultiplier: 4.0,  // Sensitivity for high-band (2.5-8kHz)
      lowBandMultiplier: 3.5,   // Sensitivity for low-band (120-300Hz)

      // Corroboration settings
      requireLowBand: true,     // Require low-band confirmation
      lowBandDelayMs: 10,       // Max delay for low-band correlation (ms)

      // Metronome rejection
      tickGuardMs: 50,          // Time window around metronome ticks to ignore (ms)
      getUpcomingTicks: () => [], // Function to get metronome tick times
      getBpm: () => 30,         // Current metronome tempo (BPM)
      getBeatCount: () => 0,    // Current beat count
      minBeatCount: 0,          // Minimum beat count before arming detector
      useListeningZone: false,  // Restrict detection to a portion of the beat
      listeningZonePercent: 0.4,
      listeningZoneOffset: 0.3,
      baselineSettleMs: 100,    // Settling window after reset/start

      // Callbacks
      onStrike: () => {},       // Called when putter strike detected

      // Debug
      debugMode: false,

      ...options
    };

    // Initialize filter chains
    this.initFilters();

    // Initialize adaptive thresholds
    this.threshold = new MultiBandThreshold({
      windowSize: this.opts.baselineWindow,
      highBandMultiplier: this.opts.highBandMultiplier,
      lowBandMultiplier: this.opts.lowBandMultiplier
    });

    // State tracking
    this.isRunning = false;
    this.lastStrikeAt = 0;
    this.strikeCount = 0;

    // Onset detection state
    this.highBandEnvelope = 0;
    this.lowBandEnvelope = 0;
    this.prevHighEnvelope = 0;
    this.prevLowEnvelope = 0;

    // Event tracking
    this.eventStartTime = null;
    this.eventPeakHigh = 0;
    this.eventPeakLow = 0;
    this.inEvent = false;

    // Performance tracking
    this.frameCount = 0;
    this.processingTimeTotal = 0;

    // Audio stream subscription
    this.subscription = null;
    this.wasInZone = false;
    this.detectingDisabledUntil = 0;
    this.lastBaselineResetAt = 0;
    this.lastGateReason = '';
  }

  /**
   * Initialize filter chains for multi-band analysis
   */
  initFilters() {
    const sr = this.opts.sampleRate;

    // High-pass filter @ 300Hz to remove rumble/wind
    const hpf = new BiquadFilter();
    hpf.setHighPass(sr, 300, 0.707);

    // High-band filter: 2.5-8kHz (putter click/ting)
    const highBand1 = new BiquadFilter();
    const highBand2 = new BiquadFilter();
    highBand1.setBandPass(sr, 5000, 1.5);  // Center at 5kHz, Q=1.5 for ~3.3kHz bandwidth
    highBand2.setBandPass(sr, 5000, 1.5);  // Second stage for steeper rolloff

    // Low-band filter: 120-300Hz (thump/coupling)
    const lowBand1 = new BiquadFilter();
    const lowBand2 = new BiquadFilter();
    lowBand1.setBandPass(sr, 200, 1.2);   // Center at 200Hz, Q=1.2 for ~167Hz bandwidth
    lowBand2.setBandPass(sr, 200, 1.2);   // Second stage

    // Build filter chains
    this.highChain = new FilterChain()
      .addFilter(hpf)
      .addFilter(highBand1)
      .addFilter(highBand2);

    this.lowChain = new FilterChain()
      .addFilter(lowBand1)
      .addFilter(lowBand2);
  }

  /**
   * Calculate RMS (Root Mean Square) of a signal buffer
   * @param {Float32Array} buffer - Signal buffer
   * @returns {number} RMS value
   */
  calculateRMS(buffer) {
    let sum = 0;
    for (let i = 0; i < buffer.length; i++) {
      sum += buffer[i] * buffer[i];
    }
    return Math.sqrt(sum / buffer.length);
  }

  /**
   * Process a single audio frame
   * @param {Float32Array} frame - Audio samples (frameLength size)
   */
  processFrame(frame) {
    if (!this.isRunning) return;

    const frameStart = performance.now();
    const now = frameStart;

    // Apply filters
    const highFiltered = new Float32Array(frame.length);
    const lowFiltered = new Float32Array(frame.length);

    this.highChain.processBlock(frame, highFiltered);
    this.lowChain.processBlock(frame, lowFiltered);

    // Calculate RMS envelopes (energy in each band)
    const highRMS = this.calculateRMS(highFiltered);
    const lowRMS = this.calculateRMS(lowFiltered);

    // Smooth envelopes (simple 1-pole LPF with ~5ms time constant)
    const smoothing = 0.3;
    this.highBandEnvelope = smoothing * highRMS + (1 - smoothing) * this.highBandEnvelope;
    this.lowBandEnvelope = smoothing * lowRMS + (1 - smoothing) * this.lowBandEnvelope;

    // Snapshot thresholds before update for spike clamping
    const preHighThreshold = this.threshold.highBand.getThreshold();
    const preLowThreshold = this.threshold.lowBand.getThreshold();
    const preThresholdsReady = preHighThreshold !== Number.MAX_VALUE && preLowThreshold !== Number.MAX_VALUE;

    // Update adaptive thresholds (freeze while an event is active)
    if (!this.inEvent) {
      const limitedHigh = preThresholdsReady ? Math.min(this.highBandEnvelope, preHighThreshold) : this.highBandEnvelope;
      const limitedLow = preThresholdsReady ? Math.min(this.lowBandEnvelope, preLowThreshold) : this.lowBandEnvelope;
      this.threshold.update(limitedHigh, limitedLow);
    }

    const highThreshold = this.threshold.highBand.getThreshold();
    const lowThreshold = this.threshold.lowBand.getThreshold();
    const thresholdsReady = highThreshold !== Number.MAX_VALUE && lowThreshold !== Number.MAX_VALUE;

    // Listening zone gating
    const zoneStatus = this.getListeningZoneStatus(now);
    if (this.opts.useListeningZone) {
      if (zoneStatus.inZone && !this.wasInZone && this.opts.debugMode) {
        console.log(`✅ ENTERED listening zone at ${(zoneStatus.positionInBeat * 100).toFixed(0)}% of beat`);
      } else if (!zoneStatus.inZone && this.wasInZone && this.opts.debugMode) {
        console.log(`❌ EXITED listening zone at ${(zoneStatus.positionInBeat * 100).toFixed(0)}% of beat`);
      } else if (!zoneStatus.inZone && this.opts.debugMode && this.frameCount % 100 === 0) {
        console.log(`⏳ Waiting for zone: ${zoneStatus.reason}`);
      }
    }
    this.wasInZone = zoneStatus.inZone;

    const gate = this.getDetectionGate(now, zoneStatus);

    const gateReasonChanged = gate.reason !== this.lastGateReason;
    if (!gate.canDetect) {
      if (this.opts.debugMode && gate.reason && (gateReasonChanged || this.frameCount % 50 === 0)) {
        console.log(`⏳ Detection paused: ${gate.reason}`);
      }

      this.lastGateReason = gate.reason;

      if (!this.inEvent) {
        // No active event: skip detection for this frame
        this.prevHighEnvelope = this.highBandEnvelope;
        this.prevLowEnvelope = this.lowBandEnvelope;
        this.frameCount++;
        this.processingTimeTotal += performance.now() - frameStart;
        return;
      }
    } else if (this.lastGateReason && gate.canDetect) {
      if (this.opts.debugMode) {
        console.log('✅ Detection re-enabled');
      }
      this.lastGateReason = '';
    }

    // Detect onset (sharp rise in high-band energy)
    const highDelta = this.highBandEnvelope - this.prevHighEnvelope;
    const frameTimeMs = (this.opts.frameLength / this.opts.sampleRate) * 1000;
    const riseRate = highDelta / frameTimeMs; // Change per ms

    // Check for event start (onset)
    if (!this.inEvent && gate.canDetect && thresholdsReady && this.highBandEnvelope > highThreshold) {
      // Sharp onset detected
      const onsetTime = riseRate * this.opts.onsetTimeMs;

      if (onsetTime > 0 && this.highBandEnvelope > this.prevHighEnvelope * 2.0) {
        // Strong, fast rise - likely a transient event
        this.inEvent = true;
        this.eventStartTime = now;
        this.eventPeakHigh = this.highBandEnvelope;
        this.eventPeakLow = this.lowBandEnvelope;

        if (this.opts.debugMode) {
          console.log(`🔔 Event START - High: ${this.highBandEnvelope.toFixed(6)}, Rate: ${riseRate.toFixed(6)}`);
        }
      }
    }

    // Track event if in progress
    if (this.inEvent) {
      // Update peak values
      this.eventPeakHigh = Math.max(this.eventPeakHigh, this.highBandEnvelope);
      this.eventPeakLow = Math.max(this.eventPeakLow, this.lowBandEnvelope);

      const eventDuration = now - this.eventStartTime;

      // Check for event end (energy drops below threshold)
      const currentHighThreshold = this.threshold.highBand.getThreshold();
      const eventEnded = currentHighThreshold !== Number.MAX_VALUE
        ? this.highBandEnvelope < currentHighThreshold * 0.5
        : false;
      const maxDurationReached = eventDuration > this.opts.maxDurationMs;

      if (eventEnded || maxDurationReached) {
        // Event finished - evaluate if it's a putter strike
        this.evaluateEvent(now, eventDuration);

        // Reset event state
        this.inEvent = false;
        this.eventStartTime = null;
        this.eventPeakHigh = 0;
        this.eventPeakLow = 0;
      }
    }

    // Store previous envelopes for delta calculation
    this.prevHighEnvelope = this.highBandEnvelope;
    this.prevLowEnvelope = this.lowBandEnvelope;

    // Update frame count and timing
    this.frameCount++;
    this.processingTimeTotal += performance.now() - frameStart;

    // Periodic stats logging (every 2 seconds)
    if (this.opts.debugMode && (!this.lastStatsTime || now - this.lastStatsTime > 2000)) {
      const uptime = ((now - (this.lastBaselineResetAt || now)) / 1000).toFixed(1);
      const hiThreshLog = this.threshold.highBand.getThreshold();
      const lowThreshLog = this.threshold.lowBand.getThreshold();
      const hiDisplay = hiThreshLog !== Number.MAX_VALUE ? hiThreshLog.toFixed(6) : '∞';
      const lowDisplay = lowThreshLog !== Number.MAX_VALUE ? lowThreshLog.toFixed(6) : '∞';
      console.log(`📊 [${uptime}s] Frames: ${this.frameCount}, High: ${this.highBandEnvelope.toFixed(6)}, Low: ${this.lowBandEnvelope.toFixed(6)}, Thresh: ${hiDisplay}/${lowDisplay}`);
      this.lastStatsTime = now;
    }
  }

  /**
   * Evaluate if detected event is a valid putter strike
   * @param {number} now - Current timestamp
   * @param {number} duration - Event duration in ms
   */
  evaluateEvent(now, duration) {
    // Check debounce (minimum time since last strike)
    const timeSinceLastStrike = now - this.lastStrikeAt;
    if (timeSinceLastStrike < this.opts.debounceMs) {
      console.log(`⏭️ Event REJECTED - Debounce (${timeSinceLastStrike.toFixed(0)}ms < ${this.opts.debounceMs}ms)`);
      return;
    }

    // Check duration (reject long events like voice/wind)
    if (duration > this.opts.maxDurationMs) {
      console.log(`⏭️ Event REJECTED - Too long (${duration.toFixed(0)}ms > ${this.opts.maxDurationMs}ms)`);
      return;
    }

    // Check low-band corroboration (putter has both high click and low thump)
    if (this.opts.requireLowBand) {
      const lowBandPresent = this.threshold.lowBand.isAboveThreshold(this.eventPeakLow);

      if (!lowBandPresent) {
        console.log(`⏭️ Event REJECTED - No low-band corroboration`);
        return;
      }
    }

    // Check metronome tick guard (ignore events near metronome ticks)
    if (this.isNearMetronomeTick(now)) {
      console.log(`⏭️ Event REJECTED - Near metronome tick`);
      return;
    }

    // Calculate quality metrics
    const quality = this.calculateQuality(duration);

    // Valid putter strike detected!
    this.lastStrikeAt = now;
    this.strikeCount++;

    const strikeEvent = {
      timestamp: now,
      energy: this.eventPeakHigh,
      lowBandEnergy: this.eventPeakLow,
      duration,
      quality,
      strikeNumber: this.strikeCount
    };

    if (this.opts.debugMode) {
      console.log(`✅ PUTTER STRIKE #${this.strikeCount}`, {
        energy: strikeEvent.energy.toFixed(6),
        lowEnergy: strikeEvent.lowBandEnergy.toFixed(6),
        duration: duration.toFixed(1) + 'ms',
        quality: quality.toFixed(2)
      });
    }

    // Notify callback
    this.opts.onStrike(strikeEvent);
  }

  /**
   * Calculate quality score for detected strike
   * @param {number} duration - Event duration in ms
   * @returns {number} Quality score (0-1)
   */
  calculateQuality(duration) {
    // Quality based on duration (shorter = better for putter)
    const durationScore = Math.max(0, 1 - (duration / this.opts.maxDurationMs));

    // Quality based on high/low band ratio (putter has strong high-band)
    const bandRatio = this.eventPeakHigh / (this.eventPeakLow + 0.0001);
    const ratioScore = Math.min(1, bandRatio / 5); // Putter typically has 3-5x ratio

    // Combined quality
    return (durationScore * 0.6 + ratioScore * 0.4);
  }
  /**
   * Convert base64 string to Int16Array
   * @param {string} base64 - Base64 encoded audio data
   * @returns {Int16Array} Audio samples
   */
  base64ToInt16Array(base64) {
    // Decode base64 to binary string
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);

    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Convert to Int16Array (assuming little-endian)
    const int16Array = new Int16Array(bytes.buffer);
    return int16Array;
  }


  /**
   * Handle incoming audio data from microphone stream
   * @param {Object} audioData - Audio data from ExpoPlayAudioStream
   */
  handleAudioData(audioData) {
    if (!this.isRunning) return;

    // Log audio data structure on first call
    if (!this.audioDataLogged) {
      console.log('🔍 Audio data structure:', {
        hasData: !!audioData.data,
        dataType: typeof audioData.data,
        dataLength: audioData.data?.length,
        isString: typeof audioData.data === 'string',
        firstChars: typeof audioData.data === 'string' ? audioData.data.substring(0, 20) : 'N/A'
      });
      this.audioDataLogged = true;
    }

    // Decode base64 audio data to Int16Array
    const base64Audio = audioData.data;
    if (!base64Audio || typeof base64Audio !== 'string') {
      console.warn('⚠️ Invalid audio data received:', typeof base64Audio);
      return;
    }

    const int16Samples = this.base64ToInt16Array(base64Audio);

    // Convert Int16Array to Float32Array and normalize to [-1.0, 1.0]
    const samples = new Float32Array(int16Samples.length);
    let peak = 0;
    for (let i = 0; i < int16Samples.length; i++) {
      samples[i] = int16Samples[i] / 32768.0;
      peak = Math.max(peak, Math.abs(samples[i]));
    }

    // Log audio stream reception (first time and periodically)
    if (this.opts.debugMode && (!this.lastAudioLogTime || performance.now() - this.lastAudioLogTime > 5000)) {
      console.log(`📊 Audio stream: ${int16Samples.length} samples, peak: ${peak.toFixed(3)}, first 3 samples: [${samples[0].toFixed(4)}, ${samples[1].toFixed(4)}, ${samples[2].toFixed(4)}]`);
      this.lastAudioLogTime = performance.now();
    }

    // Process audio in chunks of frameLength
    const frameLength = this.opts.frameLength;
    const numFrames = Math.floor(samples.length / frameLength);

    for (let i = 0; i < numFrames; i++) {
      const offset = i * frameLength;
      const frame = samples.slice(offset, offset + frameLength);
      this.processFrame(frame);
    }
  }

  /**
   * Check if timestamp is near a metronome tick
   * @param {number} timestamp - Time to check
   * @returns {boolean} True if near a tick
   */
  isNearMetronomeTick(timestamp) {
    const ticks = this.opts.getUpcomingTicks();
    const guardMs = this.opts.tickGuardMs;

    for (const tick of ticks) {
      const diff = Math.abs(timestamp - tick);
      if (diff < guardMs) {
        return true;
      }
    }

    return false;
  }

  /**
   * Determine if the current timestamp falls within the listening zone window
   * @param {number} timestamp - Timestamp to evaluate
   * @returns {Object} Zone information
   */
  getListeningZoneStatus(timestamp) {
    if (!this.opts.useListeningZone) {
      return { inZone: true, reason: 'Zone disabled' };
    }

    const bpm = typeof this.opts.getBpm === 'function' ? this.opts.getBpm() : 0;
    if (!bpm || bpm <= 0) {
      return { inZone: true, reason: 'No BPM available' };
    }

    const ticks = typeof this.opts.getUpcomingTicks === 'function'
      ? this.opts.getUpcomingTicks()
      : [];

    if (!ticks || ticks.length === 0) {
      return { inZone: true, reason: 'No ticks available' };
    }

    const period = 60000 / bpm;
    let lastTick = null;
    let nextTick = null;

    for (let i = 0; i < ticks.length; i++) {
      if (ticks[i] <= timestamp) {
        lastTick = ticks[i];
      } else {
        nextTick = ticks[i];
        break;
      }
    }

    if (lastTick === null && nextTick !== null) {
      lastTick = nextTick - period;
    }

    if (lastTick === null) {
      return { inZone: true, reason: 'Cannot determine position' };
    }

    const offset = ((timestamp - lastTick) % period + period) % period;
    const positionInBeat = offset / period;
    const zoneStart = Math.max(0, Math.min(1, this.opts.listeningZoneOffset));
    const zonePercent = Math.max(0, Math.min(1, this.opts.listeningZonePercent));
    const zoneEnd = Math.min(1, zoneStart + zonePercent);
    const inZone = positionInBeat >= zoneStart && positionInBeat <= zoneEnd;

    return {
      inZone,
      positionInBeat,
      zoneStart,
      zoneEnd,
      reason: inZone
        ? `In zone (${(positionInBeat * 100).toFixed(0)}% of beat)`
        : `Outside zone (${(positionInBeat * 100).toFixed(0)}% of beat)`
    };
  }

  /**
   * Aggregate gating conditions (baseline settle, beat count, listening zone)
   * @param {number} timestamp - Current timestamp
   * @param {Object} zoneStatus - Listening zone status
   * @returns {{canDetect: boolean, reason: string}}
   */
  getDetectionGate(timestamp, zoneStatus) {
    const reasons = [];

    if (timestamp < this.detectingDisabledUntil) {
      const remain = Math.max(0, Math.round(this.detectingDisabledUntil - timestamp));
      reasons.push(`Baseline settling (${remain}ms)`);
    }

    if (this.opts.minBeatCount > 0 && typeof this.opts.getBeatCount === 'function') {
      try {
        const beatCount = Number(this.opts.getBeatCount()) || 0;
        if (beatCount < this.opts.minBeatCount) {
          reasons.push(`Waiting for beat ${beatCount}/${this.opts.minBeatCount}`);
        }
      } catch (error) {
        if (this.opts.debugMode) {
          console.log('⚠️ Failed to read beat count:', error.message);
        }
      }
    }

    if (this.opts.useListeningZone && !zoneStatus.inZone) {
      reasons.push(zoneStatus.reason);
    }

    return {
      canDetect: reasons.length === 0,
      reason: reasons.join(' | ')
    };
  }

  /**
   * Start the detector
   */
  async start() {
    if (!ExpoPlayAudioStream) {
      console.error('ExpoPlayAudioStream not available - requires custom native build');
      throw new Error('Acoustic detector requires expo-audio-stream module');
    }

    this.isRunning = true;
    this.frameCount = 0;
    this.processingTimeTotal = 0;
    this.lastStrikeAt = 0;
    this.lastStatsTime = 0;
    this.threshold.reset();
    const now = performance.now();
    this.detectingDisabledUntil = now + (this.opts.baselineSettleMs || 0);
    this.lastBaselineResetAt = now;
    this.wasInZone = false;
    this.inEvent = false;
    this.eventStartTime = null;
    this.eventPeakHigh = 0;
    this.eventPeakLow = 0;

    console.log('🎯 Acoustic detector starting...', {
      sampleRate: this.opts.sampleRate + 'Hz',
      frameLength: this.opts.frameLength,
      debugMode: this.opts.debugMode ? 'ON' : 'OFF',
      energyThresh: this.opts.energyThresh,
      audioGain: this.opts.audioGain
    });

    try {
      // Configure audio stream
      const recordingConfig = {
        sampleRate: this.opts.sampleRate,
        channels: 1,
        bitsPerChannel: 16,
        interval: 100, // Callback every 100ms
        onAudioStream: (audioData) => {
          this.handleAudioData(audioData);
        }
      };

      // Start recording
      const result = await ExpoPlayAudioStream.startRecording(recordingConfig);
      this.subscription = result.subscription;

      console.log('✅ Acoustic detector started and listening for audio');
    } catch (error) {
      console.error('Failed to start acoustic detector:', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop the detector
   */
  async stop() {
    this.isRunning = false;

    // Stop audio stream if running
    if (this.subscription) {
      try {
        await ExpoPlayAudioStream.stopRecording();
        this.subscription = null;
      } catch (error) {
        console.error('Error stopping audio stream:', error);
      }
    }

    console.log('⏸️ Acoustic putter detector stopped');
  }

  /**
   * Update detector parameters
   * @param {Object} params - Parameters to update
   */
  updateParams(params) {
    Object.assign(this.opts, params);

    // Update threshold sensitivity if changed
    if (params.highBandMultiplier !== undefined) {
      this.threshold.highBand.setMultiplier(params.highBandMultiplier);
    }
    if (params.lowBandMultiplier !== undefined) {
      this.threshold.lowBand.setMultiplier(params.lowBandMultiplier);
    }
    if (params.baselineSettleMs !== undefined) {
      this.detectingDisabledUntil = performance.now() + (this.opts.baselineSettleMs || 0);
    }
    if (params.useListeningZone !== undefined && !params.useListeningZone) {
      this.wasInZone = false;
    }
    if (params.minBeatCount !== undefined) {
      this.lastGateReason = '';
    }
  }

  /**
   * Update sensitivity (0-1 scale)
   * @param {number} sensitivity - Sensitivity level (0 = least, 1 = most)
   */
  setSensitivity(sensitivity) {
    this.threshold.setSensitivity(sensitivity);
  }

  /**
   * Get detector statistics
   * @returns {Object} Statistics object
   */
  getStats() {
    const avgProcessingTime = this.frameCount > 0
      ? this.processingTimeTotal / this.frameCount
      : 0;

    return {
      isRunning: this.isRunning,
      strikeCount: this.strikeCount,
      frameCount: this.frameCount,
      avgProcessingTimeMs: avgProcessingTime.toFixed(3),
      currentEnvelope: {
        high: this.highBandEnvelope.toFixed(6),
        low: this.lowBandEnvelope.toFixed(6)
      },
      thresholds: this.threshold.getStats(),
      lastStrikeAt: this.lastStrikeAt
    };
  }

  /**
   * Reset detector state
   */
  reset() {
    this.threshold.reset();
    this.lastStrikeAt = 0;
    this.strikeCount = 0;
    this.highBandEnvelope = 0;
    this.lowBandEnvelope = 0;
    this.prevHighEnvelope = 0;
    this.prevLowEnvelope = 0;
    this.inEvent = false;
    this.eventStartTime = null;
    this.eventPeakHigh = 0;
    this.eventPeakLow = 0;
    this.wasInZone = false;
    this.lastGateReason = '';
    const now = performance.now();
    this.detectingDisabledUntil = now + (this.opts.baselineSettleMs || 0);
    this.lastBaselineResetAt = now;

    console.log('🔄 Acoustic detector reset');
  }
}

export default PutterDetectorAcoustic;
