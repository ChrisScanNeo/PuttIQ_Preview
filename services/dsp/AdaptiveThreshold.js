/**
 * Adaptive Threshold Calculator
 * Uses Median + MAD (Median Absolute Deviation) for robust threshold estimation
 * Resistant to outliers and adapts to changing noise floors
 */

export class AdaptiveThreshold {
  /**
   * @param {number} windowSize - Number of samples to track for baseline (e.g., 100 = ~1 second @ 100fps)
   * @param {number} multiplier - MAD multiplier (k = 3-6 typical, higher = less sensitive)
   */
  constructor(windowSize = 100, multiplier = 4.0) {
    this.windowSize = windowSize;
    this.multiplier = multiplier;
    this.baseline = new Float32Array(windowSize);
    this.writeIndex = 0;
    this.sampleCount = 0;

    // Preallocate sorting buffer to avoid repeated allocations
    this.sortBuffer = new Float32Array(windowSize);
  }

  /**
   * Update baseline with a new sample (typically RMS energy or envelope value)
   * @param {number} value - Current measurement value
   */
  update(value) {
    this.baseline[this.writeIndex] = value;
    this.writeIndex = (this.writeIndex + 1) % this.windowSize;
    if (this.sampleCount < this.windowSize) {
      this.sampleCount++;
    }
  }

  /**
   * Calculate median of the baseline window
   * @returns {number} Median value
   */
  getMedian() {
    if (this.sampleCount === 0) return 0;

    // Copy valid samples to sort buffer
    const n = this.sampleCount;
    for (let i = 0; i < n; i++) {
      this.sortBuffer[i] = this.baseline[i];
    }

    // Sort the buffer (in-place)
    this.sortBuffer.subarray(0, n).sort((a, b) => a - b);

    // Return median
    if (n % 2 === 0) {
      return (this.sortBuffer[n / 2 - 1] + this.sortBuffer[n / 2]) / 2;
    } else {
      return this.sortBuffer[Math.floor(n / 2)];
    }
  }

  /**
   * Calculate MAD (Median Absolute Deviation)
   * MAD = median(|x_i - median(x)|)
   * @returns {number} MAD value
   */
  getMAD() {
    if (this.sampleCount === 0) return 0;

    const median = this.getMedian();
    const n = this.sampleCount;

    // Calculate absolute deviations from median
    for (let i = 0; i < n; i++) {
      this.sortBuffer[i] = Math.abs(this.baseline[i] - median);
    }

    // Sort deviations
    this.sortBuffer.subarray(0, n).sort((a, b) => a - b);

    // Return median of absolute deviations
    if (n % 2 === 0) {
      return (this.sortBuffer[n / 2 - 1] + this.sortBuffer[n / 2]) / 2;
    } else {
      return this.sortBuffer[Math.floor(n / 2)];
    }
  }

  /**
   * Get current adaptive threshold
   * threshold = median(baseline) + k * MAD
   * @returns {number} Current threshold value
   */
  getThreshold() {
    if (this.sampleCount < 10) {
      // Not enough data yet - return a high threshold to avoid false positives
      return Number.MAX_VALUE;
    }

    const median = this.getMedian();
    const mad = this.getMAD();

    return median + this.multiplier * mad;
  }

  /**
   * Check if a value exceeds the current threshold
   * @param {number} value - Value to test
   * @returns {boolean} True if value exceeds threshold
   */
  isAboveThreshold(value) {
    return value > this.getThreshold();
  }

  /**
   * Update multiplier (sensitivity control)
   * Lower = more sensitive, Higher = less sensitive
   * @param {number} k - New multiplier (3-6 typical range)
   */
  setMultiplier(k) {
    this.multiplier = Math.max(1.0, Math.min(10.0, k));
  }

  /**
   * Get current statistics
   * @returns {Object} Stats object with median, MAD, and threshold
   */
  getStats() {
    return {
      median: this.getMedian(),
      mad: this.getMAD(),
      threshold: this.getThreshold(),
      multiplier: this.multiplier,
      sampleCount: this.sampleCount,
      windowSize: this.windowSize
    };
  }

  /**
   * Reset the baseline history
   */
  reset() {
    this.baseline.fill(0);
    this.writeIndex = 0;
    this.sampleCount = 0;
  }
}

/**
 * Multi-band adaptive threshold for putter detection
 * Maintains separate thresholds for high-band (click) and low-band (thump)
 */
export class MultiBandThreshold {
  /**
   * @param {Object} options - Configuration options
   * @param {number} options.windowSize - Baseline window size
   * @param {number} options.highBandMultiplier - Multiplier for high-band (2.5-8kHz click)
   * @param {number} options.lowBandMultiplier - Multiplier for low-band (120-300Hz thump)
   */
  constructor(options = {}) {
    const {
      windowSize = 100,
      highBandMultiplier = 4.0,
      lowBandMultiplier = 3.5
    } = options;

    this.highBand = new AdaptiveThreshold(windowSize, highBandMultiplier);
    this.lowBand = new AdaptiveThreshold(windowSize, lowBandMultiplier);
  }

  /**
   * Update both thresholds with new measurements
   * @param {number} highValue - High-band RMS or envelope value
   * @param {number} lowValue - Low-band RMS or envelope value
   */
  update(highValue, lowValue) {
    this.highBand.update(highValue);
    this.lowBand.update(lowValue);
  }

  /**
   * Check if both bands exceed their thresholds (for corroboration)
   * @param {number} highValue - High-band measurement
   * @param {number} lowValue - Low-band measurement
   * @returns {boolean} True if both exceed threshold
   */
  bothAboveThreshold(highValue, lowValue) {
    return this.highBand.isAboveThreshold(highValue) &&
           this.lowBand.isAboveThreshold(lowValue);
  }

  /**
   * Check if high-band exceeds threshold (primary detection)
   * @param {number} highValue - High-band measurement
   * @returns {boolean} True if exceeds threshold
   */
  highBandAboveThreshold(highValue) {
    return this.highBand.isAboveThreshold(highValue);
  }

  /**
   * Get statistics from both bands
   * @returns {Object} Combined stats object
   */
  getStats() {
    return {
      highBand: this.highBand.getStats(),
      lowBand: this.lowBand.getStats()
    };
  }

  /**
   * Reset both thresholds
   */
  reset() {
    this.highBand.reset();
    this.lowBand.reset();
  }

  /**
   * Update sensitivity for both bands
   * @param {number} sensitivity - Sensitivity level (0-1, lower = more sensitive)
   */
  setSensitivity(sensitivity) {
    // Map 0-1 to multiplier range (6-3)
    // Higher multiplier = less sensitive
    const k = 6 - (sensitivity * 3);
    this.highBand.setMultiplier(k);
    this.lowBand.setMultiplier(k * 0.875); // Low band slightly more sensitive
  }
}

export default AdaptiveThreshold;
