/**
 * Biquad filter implementation for audio DSP
 * Used for band-pass filtering to emphasize putter impact frequencies (1-6 kHz)
 */
export class Biquad {
  constructor() {
    // Filter coefficients
    this.a0 = 1;
    this.a1 = 0;
    this.a2 = 0;
    this.b1 = 0;
    this.b2 = 0;
    
    // State variables (z-transform delay elements)
    this.z1 = 0;
    this.z2 = 0;
  }

  /**
   * Create a high-pass filter
   * @param {number} sampleRate - Sample rate in Hz
   * @param {number} cutoffHz - Cutoff frequency in Hz
   * @param {number} q - Q factor (default 0.707 for Butterworth response)
   * @returns {Biquad} Configured high-pass filter
   */
  static highpass(sampleRate, cutoffHz, q = 0.707) {
    const filter = new Biquad();
    
    const w0 = 2 * Math.PI * cutoffHz / sampleRate;
    const cosw0 = Math.cos(w0);
    const sinw0 = Math.sin(w0);
    const alpha = sinw0 / (2 * q);
    
    // High-pass coefficients
    const b0 = (1 + cosw0) / 2;
    const b1 = -(1 + cosw0);
    const b2 = (1 + cosw0) / 2;
    const a0 = 1 + alpha;
    const a1 = -2 * cosw0;
    const a2 = 1 - alpha;
    
    // Normalize coefficients
    filter.a0 = b0 / a0;
    filter.a1 = b1 / a0;
    filter.a2 = b2 / a0;
    filter.b1 = a1 / a0;
    filter.b2 = a2 / a0;
    
    return filter;
  }

  /**
   * Create a low-pass filter
   * @param {number} sampleRate - Sample rate in Hz
   * @param {number} cutoffHz - Cutoff frequency in Hz
   * @param {number} q - Q factor (default 0.707 for Butterworth response)
   * @returns {Biquad} Configured low-pass filter
   */
  static lowpass(sampleRate, cutoffHz, q = 0.707) {
    const filter = new Biquad();
    
    const w0 = 2 * Math.PI * cutoffHz / sampleRate;
    const cosw0 = Math.cos(w0);
    const sinw0 = Math.sin(w0);
    const alpha = sinw0 / (2 * q);
    
    // Low-pass coefficients
    const b0 = (1 - cosw0) / 2;
    const b1 = 1 - cosw0;
    const b2 = (1 - cosw0) / 2;
    const a0 = 1 + alpha;
    const a1 = -2 * cosw0;
    const a2 = 1 - alpha;
    
    // Normalize coefficients
    filter.a0 = b0 / a0;
    filter.a1 = b1 / a0;
    filter.a2 = b2 / a0;
    filter.b1 = a1 / a0;
    filter.b2 = a2 / a0;
    
    return filter;
  }

  /**
   * Create a band-pass filter
   * @param {number} sampleRate - Sample rate in Hz
   * @param {number} centerHz - Center frequency in Hz
   * @param {number} bandwidth - Bandwidth in Hz
   * @returns {Biquad} Configured band-pass filter
   */
  static bandpass(sampleRate, centerHz, bandwidth) {
    const filter = new Biquad();
    
    const w0 = 2 * Math.PI * centerHz / sampleRate;
    const cosw0 = Math.cos(w0);
    const sinw0 = Math.sin(w0);
    const alpha = sinw0 * Math.sinh(Math.log(2) / 2 * bandwidth * w0 / sinw0);
    
    // Band-pass coefficients
    const b0 = alpha;
    const b1 = 0;
    const b2 = -alpha;
    const a0 = 1 + alpha;
    const a1 = -2 * cosw0;
    const a2 = 1 - alpha;
    
    // Normalize coefficients
    filter.a0 = b0 / a0;
    filter.a1 = b1 / a0;
    filter.a2 = b2 / a0;
    filter.b1 = a1 / a0;
    filter.b2 = a2 / a0;
    
    return filter;
  }

  /**
   * Create a notch filter (band-stop)
   * @param {number} sampleRate - Sample rate in Hz
   * @param {number} centerHz - Center frequency to notch out
   * @param {number} q - Q factor (higher = narrower notch)
   * @returns {Biquad} Configured notch filter
   */
  static notch(sampleRate, centerHz, q = 10) {
    const filter = new Biquad();
    
    const w0 = 2 * Math.PI * centerHz / sampleRate;
    const cosw0 = Math.cos(w0);
    const sinw0 = Math.sin(w0);
    const alpha = sinw0 / (2 * q);
    
    // Notch coefficients
    const b0 = 1;
    const b1 = -2 * cosw0;
    const b2 = 1;
    const a0 = 1 + alpha;
    const a1 = -2 * cosw0;
    const a2 = 1 - alpha;
    
    // Normalize coefficients
    filter.a0 = b0 / a0;
    filter.a1 = b1 / a0;
    filter.a2 = b2 / a0;
    filter.b1 = a1 / a0;
    filter.b2 = a2 / a0;
    
    return filter;
  }

  /**
   * Process a single sample through the filter
   * @param {number} x - Input sample
   * @returns {number} Filtered output sample
   */
  process(x) {
    // Direct Form II implementation
    const y = this.a0 * x + this.a1 * this.z1 + this.a2 * this.z2 
              - this.b1 * this.z1 - this.b2 * this.z2;
    
    // Update state variables
    this.z2 = this.z1;
    this.z1 = y;
    
    return y;
  }

  /**
   * Process an array of samples
   * @param {number[]} samples - Input samples
   * @returns {number[]} Filtered samples
   */
  processArray(samples) {
    const output = new Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      output[i] = this.process(samples[i]);
    }
    return output;
  }

  /**
   * Reset the filter state
   */
  reset() {
    this.z1 = 0;
    this.z2 = 0;
  }

  /**
   * Get the frequency response at a given frequency
   * @param {number} freq - Frequency in Hz
   * @param {number} sampleRate - Sample rate in Hz
   * @returns {Object} Magnitude and phase response
   */
  getFrequencyResponse(freq, sampleRate) {
    const w = 2 * Math.PI * freq / sampleRate;
    const z = { real: Math.cos(w), imag: Math.sin(w) };
    
    // Calculate numerator: a0 + a1*z^-1 + a2*z^-2
    const num = {
      real: this.a0 + this.a1 * z.real + this.a2 * (z.real * z.real - z.imag * z.imag),
      imag: -this.a1 * z.imag - this.a2 * (2 * z.real * z.imag)
    };
    
    // Calculate denominator: 1 + b1*z^-1 + b2*z^-2
    const den = {
      real: 1 + this.b1 * z.real + this.b2 * (z.real * z.real - z.imag * z.imag),
      imag: -this.b1 * z.imag - this.b2 * (2 * z.real * z.imag)
    };
    
    // Complex division
    const denMag = den.real * den.real + den.imag * den.imag;
    const response = {
      real: (num.real * den.real + num.imag * den.imag) / denMag,
      imag: (num.imag * den.real - num.real * den.imag) / denMag
    };
    
    return {
      magnitude: Math.sqrt(response.real * response.real + response.imag * response.imag),
      phase: Math.atan2(response.imag, response.real)
    };
  }
}

/**
 * Filter cascade for creating more complex filter responses
 */
export class FilterCascade {
  constructor() {
    this.filters = [];
  }

  /**
   * Add a filter to the cascade
   * @param {Biquad} filter - Filter to add
   */
  addFilter(filter) {
    this.filters.push(filter);
  }

  /**
   * Process a sample through all filters in sequence
   * @param {number} x - Input sample
   * @returns {number} Filtered output
   */
  process(x) {
    let y = x;
    for (const filter of this.filters) {
      y = filter.process(y);
    }
    return y;
  }

  /**
   * Process an array of samples
   * @param {number[]} samples - Input samples
   * @returns {number[]} Filtered samples
   */
  processArray(samples) {
    const output = new Array(samples.length);
    for (let i = 0; i < samples.length; i++) {
      output[i] = this.process(samples[i]);
    }
    return output;
  }

  /**
   * Reset all filters in the cascade
   */
  reset() {
    for (const filter of this.filters) {
      filter.reset();
    }
  }

  /**
   * Create a band-pass filter using cascaded high-pass and low-pass
   * @param {number} sampleRate - Sample rate in Hz
   * @param {number} lowCutoff - Low frequency cutoff in Hz
   * @param {number} highCutoff - High frequency cutoff in Hz
   * @returns {FilterCascade} Configured band-pass cascade
   */
  static createBandpass(sampleRate, lowCutoff, highCutoff) {
    const cascade = new FilterCascade();
    cascade.addFilter(Biquad.highpass(sampleRate, lowCutoff));
    cascade.addFilter(Biquad.lowpass(sampleRate, highCutoff));
    return cascade;
  }
}

export default Biquad;