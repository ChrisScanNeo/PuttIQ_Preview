import VoiceProcessor from '@picovoice/react-native-voice-processor';
import { FilterCascade } from './Biquad';

/**
 * Strike event data structure
 * @typedef {Object} StrikeEvent
 * @property {number} timestamp - performance.now() when detected
 * @property {number} energy - Peak envelope energy
 * @property {number} latencyMs - Estimated latency from frame arrival
 * @property {number} zcr - Zero-crossing rate at impact
 * @property {number} confidence - Detection confidence (0-1)
 * @property {string} quality - Hit quality assessment
 */

/**
 * Detector configuration options
 * @typedef {Object} DetectorOptions
 * @property {number} sampleRate - Audio sample rate (default 16000)
 * @property {number} frameLength - Frame size in samples (default 256)
 * @property {number} refractoryMs - Ignore hits for N ms after detection (default 250)
 * @property {number} energyThresh - Dynamic baseline multiplier (default 6)
 * @property {number} zcrThresh - Zero-crossing rate threshold (default 0.22)
 * @property {number} tickGuardMs - Ignore detections near metronome ticks (default 30)
 * @property {Function} getUpcomingTicks - Function returning array of tick timestamps
 * @property {Function} onStrike - Callback for strike events
 */

/**
 * Advanced putter impact detector with DSP filtering and transient detection
 */
export class PutterDetector {
  constructor(options = {}) {
    // Configuration with defaults
    this.opts = {
      sampleRate: 16000,
      frameLength: 256,
      refractoryMs: 250,
      energyThresh: 6,
      zcrThresh: 0.22,
      tickGuardMs: 30,
      getUpcomingTicks: () => [],
      onStrike: () => {},
      ...options
    };

    // DSP components
    this.bandpassFilter = null;
    this.initializeFilters();

    // Detection state
    this.baseline = 1e-6;        // Running noise floor
    this.alphaBase = 0.995;      // Baseline smoothing factor
    this.lastHitAt = 0;          // Last detection timestamp
    this.isRunning = false;
    
    // Performance metrics
    this.frameCount = 0;
    this.detectionCount = 0;
    
    // Circular buffer for spectral flux calculation
    this.energyHistory = new Array(10).fill(0);
    this.historyIndex = 0;

    // Bind methods
    this.handleFrame = this.handleFrame.bind(this);
  }

  /**
   * Initialize DSP filters
   */
  initializeFilters() {
    // Create band-pass filter cascade (1-6 kHz for impact emphasis)
    this.bandpassFilter = FilterCascade.createBandpass(
      this.opts.sampleRate,
      1000,  // Low cutoff: 1 kHz
      6000   // High cutoff: 6 kHz
    );
  }

  /**
   * Start the detector
   */
  async start() {
    if (this.isRunning) {
      console.warn('PutterDetector already running');
      return;
    }

    this.isRunning = true;
    this.frameCount = 0;
    this.detectionCount = 0;

    try {
      // Add frame listener
      VoiceProcessor.addFrameListener(this.handleFrame);
      
      // Start voice processor with configured parameters
      await VoiceProcessor.start(this.opts.frameLength, this.opts.sampleRate);
      
      console.log('PutterDetector started with config:', {
        sampleRate: this.opts.sampleRate,
        frameLength: this.opts.frameLength,
        refractoryMs: this.opts.refractoryMs
      });
    } catch (error) {
      console.error('Failed to start PutterDetector:', error);
      this.isRunning = false;
      throw error;
    }
  }

  /**
   * Stop the detector
   */
  async stop() {
    if (!this.isRunning) return;

    this.isRunning = false;

    try {
      VoiceProcessor.removeFrameListener(this.handleFrame);
      await VoiceProcessor.stop();
      
      console.log('PutterDetector stopped. Stats:', {
        framesProcessed: this.frameCount,
        detectionsFound: this.detectionCount
      });
    } catch (error) {
      console.error('Error stopping PutterDetector:', error);
    }
  }

  /**
   * Process incoming audio frame
   * @param {number[]} frame - Int16 audio samples
   */
  handleFrame(frame) {
    if (!this.isRunning) return;

    const now = performance.now();
    this.frameCount++;

    // Convert Int16 to normalized float and apply band-pass filter
    const filtered = new Array(frame.length);
    for (let i = 0; i < frame.length; i++) {
      const normalized = frame[i] / 32768.0; // Int16 to [-1, 1]
      filtered[i] = this.bandpassFilter.process(normalized);
    }

    // Calculate features
    const features = this.extractFeatures(filtered);
    
    // Update baseline (adaptive noise floor)
    this.updateBaseline(features.energy);

    // Calculate dynamic threshold
    const threshold = Math.max(0.0015, this.baseline * this.opts.energyThresh);

    // Detect impact
    const isHit = this.detectImpact(features, threshold);

    if (isHit) {
      // Check refractory period
      const timeSinceLastHit = now - this.lastHitAt;
      if (timeSinceLastHit < this.opts.refractoryMs) {
        return; // Too soon after last hit
      }

      // Check metronome tick guard
      if (this.isNearMetronomeTick(now)) {
        return; // Too close to a metronome tick
      }

      // Valid hit detected!
      this.lastHitAt = now;
      this.detectionCount++;

      // Calculate confidence and quality
      const confidence = this.calculateConfidence(features, threshold);
      const quality = this.assessHitQuality(features);

      // Create strike event
      const strikeEvent = {
        timestamp: now,
        energy: features.energy,
        latencyMs: (this.opts.frameLength / this.opts.sampleRate) * 1000,
        zcr: features.zcr,
        confidence,
        quality
      };

      // Notify callback
      this.opts.onStrike(strikeEvent);
    }
  }

  /**
   * Extract audio features from filtered frame
   * @param {number[]} filtered - Filtered audio samples
   * @returns {Object} Extracted features
   */
  extractFeatures(filtered) {
    let sumAbs = 0;
    let sumSquared = 0;
    let zeroCrossings = 0;
    let lastSample = 0;
    let maxAbs = 0;

    for (let i = 0; i < filtered.length; i++) {
      const sample = filtered[i];
      const absSample = Math.abs(sample);
      
      sumAbs += absSample;
      sumSquared += sample * sample;
      
      if (absSample > maxAbs) {
        maxAbs = absSample;
      }

      // Count zero crossings
      if (i > 0) {
        if ((sample > 0 && lastSample <= 0) || (sample < 0 && lastSample >= 0)) {
          zeroCrossings++;
        }
      }
      
      lastSample = sample;
    }

    const energy = sumAbs / filtered.length;
    const rms = Math.sqrt(sumSquared / filtered.length);
    const zcr = zeroCrossings / filtered.length;
    const crestFactor = maxAbs / (rms + 1e-10);

    // Calculate spectral flux (change in energy)
    const prevEnergy = this.energyHistory[this.historyIndex];
    const flux = Math.max(0, energy - prevEnergy);
    
    // Update history
    this.energyHistory[this.historyIndex] = energy;
    this.historyIndex = (this.historyIndex + 1) % this.energyHistory.length;

    return {
      energy,
      rms,
      zcr,
      crestFactor,
      flux,
      maxAmplitude: maxAbs
    };
  }

  /**
   * Update adaptive baseline (noise floor)
   * @param {number} energy - Current frame energy
   */
  updateBaseline(energy) {
    // Only update baseline with low-energy frames to avoid learning from impacts
    const clampedEnergy = Math.min(energy, this.baseline * 2);
    this.baseline = this.alphaBase * this.baseline + (1 - this.alphaBase) * clampedEnergy;
  }

  /**
   * Detect if current features indicate an impact
   * @param {Object} features - Extracted features
   * @param {number} threshold - Energy threshold
   * @returns {boolean} True if impact detected
   */
  detectImpact(features, threshold) {
    // Multi-criteria detection
    const energyCheck = features.energy > threshold;
    const zcrCheck = features.zcr > this.opts.zcrThresh;
    const fluxCheck = features.flux > threshold * 0.5; // Spectral flux threshold
    const crestCheck = features.crestFactor > 2.0; // Impulsive signal check

    // Require multiple criteria for robust detection
    const criteriaCount = energyCheck + zcrCheck + fluxCheck + crestCheck;
    
    return criteriaCount >= 3;
  }

  /**
   * Check if timestamp is near a metronome tick
   * @param {number} timestamp - Timestamp to check
   * @returns {boolean} True if near a tick
   */
  isNearMetronomeTick(timestamp) {
    const ticks = this.opts.getUpcomingTicks();
    const guardMs = this.opts.tickGuardMs;

    for (const tick of ticks) {
      if (Math.abs(timestamp - tick) <= guardMs) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate detection confidence
   * @param {Object} features - Extracted features
   * @param {number} threshold - Energy threshold
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(features, threshold) {
    // Normalize features to [0, 1] range
    const energyScore = Math.min(1, (features.energy - threshold) / threshold);
    const zcrScore = Math.min(1, (features.zcr - this.opts.zcrThresh) / this.opts.zcrThresh);
    const fluxScore = Math.min(1, features.flux / threshold);
    const crestScore = Math.min(1, features.crestFactor / 5);

    // Weighted average
    const confidence = (
      energyScore * 0.3 +
      zcrScore * 0.2 +
      fluxScore * 0.3 +
      crestScore * 0.2
    );

    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Assess the quality of the detected hit
   * @param {Object} features - Extracted features
   * @returns {string} Quality assessment
   */
  assessHitQuality(features) {
    // Based on crest factor and energy characteristics
    if (features.crestFactor > 4 && features.energy > this.baseline * 10) {
      return 'strong';
    } else if (features.crestFactor > 2.5 && features.energy > this.baseline * 7) {
      return 'medium';
    } else {
      return 'weak';
    }
  }

  /**
   * Update detection parameters
   * @param {Object} params - Parameters to update
   */
  updateParams(params) {
    this.opts = { ...this.opts, ...params };
    
    // Reinitialize filters if sample rate changed
    if (params.sampleRate) {
      this.initializeFilters();
    }
  }

  /**
   * Get current detector statistics
   * @returns {Object} Statistics
   */
  getStats() {
    return {
      isRunning: this.isRunning,
      framesProcessed: this.frameCount,
      detectionsFound: this.detectionCount,
      currentBaseline: this.baseline,
      detectionRate: this.frameCount > 0 ? this.detectionCount / this.frameCount : 0
    };
  }

  /**
   * Reset detector state
   */
  reset() {
    this.baseline = 1e-6;
    this.lastHitAt = 0;
    this.frameCount = 0;
    this.detectionCount = 0;
    this.energyHistory.fill(0);
    this.historyIndex = 0;
    this.bandpassFilter.reset();
  }
}

export default PutterDetector;