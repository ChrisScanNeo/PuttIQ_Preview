/**
 * Biquad Filter Implementation
 * Based on RBJ Audio Cookbook formulas
 * Provides high-pass, band-pass, peaking, and high-shelf filters for putter detection
 */

export class BiquadFilter {
  constructor() {
    // Filter coefficients
    this.b0 = 1.0;
    this.b1 = 0.0;
    this.b2 = 0.0;
    this.a1 = 0.0;
    this.a2 = 0.0;

    // State variables for Direct Form II
    this.z1 = 0.0;
    this.z2 = 0.0;
  }

  /**
   * Configure as high-pass filter
   * @param {number} sampleRate - Sample rate in Hz
   * @param {number} frequency - Cutoff frequency in Hz
   * @param {number} Q - Quality factor (default 0.707 for Butterworth)
   */
  setHighPass(sampleRate, frequency, Q = 0.707) {
    const omega = 2 * Math.PI * frequency / sampleRate;
    const sn = Math.sin(omega);
    const cs = Math.cos(omega);
    const alpha = sn / (2 * Q);

    const a0 = 1 + alpha;
    this.b0 = (1 + cs) / (2 * a0);
    this.b1 = -(1 + cs) / a0;
    this.b2 = (1 + cs) / (2 * a0);
    this.a1 = (-2 * cs) / a0;
    this.a2 = (1 - alpha) / a0;

    this.reset();
  }

  /**
   * Configure as band-pass filter (constant skirt gain)
   * @param {number} sampleRate - Sample rate in Hz
   * @param {number} frequency - Center frequency in Hz
   * @param {number} Q - Quality factor (bandwidth = frequency/Q)
   */
  setBandPass(sampleRate, frequency, Q = 1.0) {
    const omega = 2 * Math.PI * frequency / sampleRate;
    const sn = Math.sin(omega);
    const cs = Math.cos(omega);
    const alpha = sn / (2 * Q);

    const a0 = 1 + alpha;
    this.b0 = alpha / a0;
    this.b1 = 0;
    this.b2 = -alpha / a0;
    this.a1 = (-2 * cs) / a0;
    this.a2 = (1 - alpha) / a0;

    this.reset();
  }

  /**
   * Configure as peaking EQ filter
   * @param {number} sampleRate - Sample rate in Hz
   * @param {number} frequency - Center frequency in Hz
   * @param {number} Q - Quality factor
   * @param {number} gainDb - Gain in decibels
   */
  setPeaking(sampleRate, frequency, Q, gainDb) {
    const A = Math.pow(10, gainDb / 40);
    const omega = 2 * Math.PI * frequency / sampleRate;
    const sn = Math.sin(omega);
    const cs = Math.cos(omega);
    const alpha = sn / (2 * Q);

    const a0 = 1 + alpha / A;
    this.b0 = (1 + alpha * A) / a0;
    this.b1 = (-2 * cs) / a0;
    this.b2 = (1 - alpha * A) / a0;
    this.a1 = (-2 * cs) / a0;
    this.a2 = (1 - alpha / A) / a0;

    this.reset();
  }

  /**
   * Configure as high-shelf filter
   * @param {number} sampleRate - Sample rate in Hz
   * @param {number} frequency - Transition frequency in Hz
   * @param {number} gainDb - Gain in decibels
   * @param {number} S - Shelf slope (default 1.0)
   */
  setHighShelf(sampleRate, frequency, gainDb, S = 1.0) {
    const A = Math.pow(10, gainDb / 40);
    const omega = 2 * Math.PI * frequency / sampleRate;
    const sn = Math.sin(omega);
    const cs = Math.cos(omega);
    const alpha = sn / 2 * Math.sqrt((A + 1/A) * (1/S - 1) + 2);

    const a0 = (A + 1) - (A - 1) * cs + 2 * Math.sqrt(A) * alpha;
    this.b0 = (A * ((A + 1) + (A - 1) * cs + 2 * Math.sqrt(A) * alpha)) / a0;
    this.b1 = (-2 * A * ((A - 1) + (A + 1) * cs)) / a0;
    this.b2 = (A * ((A + 1) + (A - 1) * cs - 2 * Math.sqrt(A) * alpha)) / a0;
    this.a1 = (2 * ((A - 1) - (A + 1) * cs)) / a0;
    this.a2 = ((A + 1) - (A - 1) * cs - 2 * Math.sqrt(A) * alpha) / a0;

    this.reset();
  }

  /**
   * Process a single sample through the filter
   * Direct Form II implementation
   * @param {number} input - Input sample
   * @returns {number} Filtered output sample
   */
  process(input) {
    const w = input - this.a1 * this.z1 - this.a2 * this.z2;
    const output = this.b0 * w + this.b1 * this.z1 + this.b2 * this.z2;

    // Update state
    this.z2 = this.z1;
    this.z1 = w;

    return output;
  }

  /**
   * Process an array of samples
   * @param {Float32Array} input - Input samples
   * @param {Float32Array} output - Output buffer (optional, will modify in-place if not provided)
   * @returns {Float32Array} Filtered samples
   */
  processBlock(input, output = null) {
    if (!output) output = input; // In-place processing

    for (let i = 0; i < input.length; i++) {
      output[i] = this.process(input[i]);
    }

    return output;
  }

  /**
   * Reset filter state (clear delay line)
   */
  reset() {
    this.z1 = 0.0;
    this.z2 = 0.0;
  }
}

/**
 * Filter chain for cascading multiple filters
 */
export class FilterChain {
  constructor() {
    this.filters = [];
  }

  /**
   * Add a filter to the chain
   * @param {BiquadFilter} filter - Filter to add
   */
  addFilter(filter) {
    this.filters.push(filter);
    return this;
  }

  /**
   * Process a sample through all filters in sequence
   * @param {number} input - Input sample
   * @returns {number} Filtered output
   */
  process(input) {
    let output = input;
    for (const filter of this.filters) {
      output = filter.process(output);
    }
    return output;
  }

  /**
   * Process a block of samples
   * @param {Float32Array} input - Input samples
   * @param {Float32Array} output - Output buffer (optional)
   * @returns {Float32Array} Filtered samples
   */
  processBlock(input, output = null) {
    if (!output) output = new Float32Array(input.length);
    output.set(input);

    for (const filter of this.filters) {
      filter.processBlock(output, output); // In-place processing
    }

    return output;
  }

  /**
   * Reset all filters in the chain
   */
  reset() {
    for (const filter of this.filters) {
      filter.reset();
    }
  }
}

export default BiquadFilter;
