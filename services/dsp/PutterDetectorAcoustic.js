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

    const startTime = performance.now();
    const now = performance.now();

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

    // Update adaptive thresholds
    this.threshold.update(this.highBandEnvelope, this.lowBandEnvelope);

    // Detect onset (sharp rise in high-band energy)
    const highDelta = this.highBandEnvelope - this.prevHighEnvelope;
    const frameTimeMs = (this.opts.frameLength / this.opts.sampleRate) * 1000;
    const riseRate = highDelta / frameTimeMs; // Change per ms

    // Check for event start (onset)
    if (!this.inEvent && this.threshold.highBandAboveThreshold(this.highBandEnvelope)) {
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
      const eventEnded = this.highBandEnvelope < this.threshold.highBand.getThreshold() * 0.5;
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
    this.processingTimeTotal += performance.now() - startTime;
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
      if (this.opts.debugMode) {
        console.log(`⏭️ Event REJECTED - Debounce (${timeSinceLastStrike.toFixed(0)}ms < ${this.opts.debounceMs}ms)`);
      }
      return;
    }

    // Check duration (reject long events like voice/wind)
    if (duration > this.opts.maxDurationMs) {
      if (this.opts.debugMode) {
        console.log(`⏭️ Event REJECTED - Too long (${duration.toFixed(0)}ms > ${this.opts.maxDurationMs}ms)`);
      }
      return;
    }

    // Check low-band corroboration (putter has both high click and low thump)
    if (this.opts.requireLowBand) {
      const lowBandPresent = this.threshold.lowBand.isAboveThreshold(this.eventPeakLow);

      if (!lowBandPresent) {
        if (this.opts.debugMode) {
          console.log(`⏭️ Event REJECTED - No low-band corroboration`);
        }
        return;
      }
    }

    // Check metronome tick guard (ignore events near metronome ticks)
    if (this.isNearMetronomeTick(now)) {
      if (this.opts.debugMode) {
        console.log(`⏭️ Event REJECTED - Near metronome tick`);
      }
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
   * Start the detector
   */
  async start() {
    this.isRunning = true;
    this.frameCount = 0;
    this.processingTimeTotal = 0;
    this.lastStrikeAt = 0;
    this.threshold.reset();

    console.log('🎯 Acoustic putter detector started');
  }

  /**
   * Stop the detector
   */
  async stop() {
    this.isRunning = false;
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

    console.log('🔄 Acoustic detector reset');
  }
}

export default PutterDetectorAcoustic;
