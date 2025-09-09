/**
 * SpectralAnalysis - FFT and spectral template matching for sound profiles
 * Used for creating and comparing audio fingerprints
 */

/**
 * Fast Fourier Transform implementation
 * Based on Cooley-Tukey radix-2 algorithm
 */
export class FFT {
  constructor(size) {
    this.size = size;
    this.halfSize = size / 2;
    
    // Precompute twiddle factors
    this.cosTable = new Float32Array(this.halfSize);
    this.sinTable = new Float32Array(this.halfSize);
    
    for (let i = 0; i < this.halfSize; i++) {
      const angle = -2 * Math.PI * i / size;
      this.cosTable[i] = Math.cos(angle);
      this.sinTable[i] = Math.sin(angle);
    }
    
    // Bit reversal lookup
    this.reverseBits = new Uint32Array(size);
    let bits = Math.log2(size);
    for (let i = 0; i < size; i++) {
      this.reverseBits[i] = this.reverseBit(i, bits);
    }
  }

  /**
   * Reverse bits for FFT butterfly operations
   */
  reverseBit(n, bits) {
    let reversed = 0;
    for (let i = 0; i < bits; i++) {
      reversed = (reversed << 1) | (n & 1);
      n >>= 1;
    }
    return reversed;
  }

  /**
   * Forward FFT
   * @param {Float32Array} real - Real part of input
   * @param {Float32Array} imag - Imaginary part of input (usually zeros)
   */
  forward(real, imag) {
    const n = this.size;
    
    // Bit reversal
    for (let i = 0; i < n; i++) {
      const j = this.reverseBits[i];
      if (i < j) {
        [real[i], real[j]] = [real[j], real[i]];
        [imag[i], imag[j]] = [imag[j], imag[i]];
      }
    }
    
    // Cooley-Tukey FFT
    for (let size = 2; size <= n; size *= 2) {
      const halfSize = size / 2;
      const tableStep = n / size;
      
      for (let i = 0; i < n; i += size) {
        for (let j = i, k = 0; j < i + halfSize; j++, k += tableStep) {
          const l = j + halfSize;
          const cos = this.cosTable[k];
          const sin = this.sinTable[k];
          
          const tReal = real[l] * cos - imag[l] * sin;
          const tImag = real[l] * sin + imag[l] * cos;
          
          real[l] = real[j] - tReal;
          imag[l] = imag[j] - tImag;
          real[j] = real[j] + tReal;
          imag[j] = imag[j] + tImag;
        }
      }
    }
  }

  /**
   * Compute magnitude spectrum
   * @param {Float32Array} real - Real part after FFT
   * @param {Float32Array} imag - Imaginary part after FFT
   * @returns {Float32Array} Magnitude spectrum
   */
  getMagnitude(real, imag) {
    const mag = new Float32Array(this.halfSize);
    for (let i = 0; i < this.halfSize; i++) {
      mag[i] = Math.sqrt(real[i] * real[i] + imag[i] * imag[i]);
    }
    return mag;
  }
}

/**
 * SpectralAnalysis class for audio fingerprinting
 */
export class SpectralAnalysis {
  constructor(frameSize = 256, sampleRate = 16000) {
    this.frameSize = frameSize;
    this.sampleRate = sampleRate;
    this.fft = new FFT(frameSize);
    
    // Hann window for spectral analysis
    this.window = new Float32Array(frameSize);
    for (let i = 0; i < frameSize; i++) {
      this.window[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (frameSize - 1)));
    }
  }

  /**
   * Apply Hann window to reduce spectral leakage
   * @param {Float32Array} samples - Input samples
   * @returns {Float32Array} Windowed samples
   */
  applyWindow(samples) {
    const windowed = new Float32Array(this.frameSize);
    for (let i = 0; i < this.frameSize; i++) {
      windowed[i] = samples[i] * this.window[i];
    }
    return windowed;
  }

  /**
   * Compute log-magnitude spectrum
   * @param {Float32Array|Int16Array} samples - Audio samples
   * @returns {Float32Array} Log-magnitude spectrum (128 bins)
   */
  computeSpectrum(samples) {
    // Convert to Float32 if needed
    let floatSamples;
    if (samples instanceof Int16Array) {
      floatSamples = new Float32Array(samples.length);
      for (let i = 0; i < samples.length; i++) {
        floatSamples[i] = samples[i] / 32768.0;
      }
    } else {
      floatSamples = samples;
    }
    
    // Apply window
    const windowed = this.applyWindow(floatSamples);
    
    // Prepare for FFT
    const real = new Float32Array(windowed);
    const imag = new Float32Array(this.frameSize);
    
    // Compute FFT
    this.fft.forward(real, imag);
    
    // Get magnitude spectrum
    const magnitude = this.fft.getMagnitude(real, imag);
    
    // Convert to log scale and normalize
    const logMag = new Float32Array(128); // Use 128 bins for template
    for (let i = 0; i < 128; i++) {
      logMag[i] = Math.log10(magnitude[i] + 1e-10); // Add small value to avoid log(0)
    }
    
    // L2 normalize
    return this.normalize(logMag);
  }

  /**
   * L2 normalize a vector
   * @param {Float32Array} vector - Input vector
   * @returns {Float32Array} Normalized vector
   */
  normalize(vector) {
    let sum = 0;
    for (let i = 0; i < vector.length; i++) {
      sum += vector[i] * vector[i];
    }
    
    const norm = Math.sqrt(sum);
    if (norm > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] /= norm;
      }
    }
    
    return vector;
  }

  /**
   * Compute cosine similarity between two spectral templates
   * @param {Float32Array} template1 - First template
   * @param {Float32Array} template2 - Second template
   * @returns {number} Similarity score (0-1)
   */
  cosineSimilarity(template1, template2) {
    if (template1.length !== template2.length) {
      throw new Error('Templates must have same length');
    }
    
    let dotProduct = 0;
    for (let i = 0; i < template1.length; i++) {
      dotProduct += template1[i] * template2[i];
    }
    
    // Since templates are normalized, dotProduct is the cosine similarity
    // Clamp to [0, 1] range
    return Math.max(0, Math.min(1, dotProduct));
  }

  /**
   * Create average template from multiple spectra
   * @param {Float32Array[]} spectra - Array of spectral templates
   * @returns {Float32Array} Average template
   */
  averageSpectra(spectra) {
    if (spectra.length === 0) return null;
    
    const avgTemplate = new Float32Array(128);
    
    // Sum all spectra
    for (const spectrum of spectra) {
      for (let i = 0; i < 128; i++) {
        avgTemplate[i] += spectrum[i];
      }
    }
    
    // Average
    for (let i = 0; i < 128; i++) {
      avgTemplate[i] /= spectra.length;
    }
    
    // Normalize
    return this.normalize(avgTemplate);
  }

  /**
   * Check if a frame contains a transient (impact-like sound)
   * @param {Float32Array|Int16Array} samples - Audio samples
   * @returns {Object} Transient features
   */
  detectTransient(samples) {
    // Convert to float if needed
    let floatSamples;
    if (samples instanceof Int16Array) {
      floatSamples = new Float32Array(samples.length);
      for (let i = 0; i < samples.length; i++) {
        floatSamples[i] = samples[i] / 32768.0;
      }
    } else {
      floatSamples = samples;
    }
    
    // Calculate energy and zero-crossing rate
    let energy = 0;
    let zeroCrossings = 0;
    let lastSample = 0;
    
    for (let i = 0; i < floatSamples.length; i++) {
      energy += Math.abs(floatSamples[i]);
      
      if (i > 0) {
        if ((floatSamples[i] > 0 && lastSample <= 0) || 
            (floatSamples[i] < 0 && lastSample >= 0)) {
          zeroCrossings++;
        }
      }
      lastSample = floatSamples[i];
    }
    
    energy /= floatSamples.length;
    const zcr = zeroCrossings / floatSamples.length;
    
    // Transient detection criteria
    const isTransient = energy > 0.001 && zcr > 0.2;
    
    return {
      energy,
      zcr,
      isTransient
    };
  }

  /**
   * Extract spectral centroid (brightness indicator)
   * @param {Float32Array} magnitude - Magnitude spectrum
   * @returns {number} Spectral centroid in Hz
   */
  spectralCentroid(magnitude) {
    let weightedSum = 0;
    let magnitudeSum = 0;
    
    for (let i = 0; i < magnitude.length; i++) {
      const freq = (i * this.sampleRate) / (2 * magnitude.length);
      weightedSum += freq * magnitude[i];
      magnitudeSum += magnitude[i];
    }
    
    return magnitudeSum > 0 ? weightedSum / magnitudeSum : 0;
  }

  /**
   * Extract spectral spread (bandwidth indicator)
   * @param {Float32Array} magnitude - Magnitude spectrum
   * @param {number} centroid - Spectral centroid
   * @returns {number} Spectral spread in Hz
   */
  spectralSpread(magnitude, centroid) {
    let weightedVariance = 0;
    let magnitudeSum = 0;
    
    for (let i = 0; i < magnitude.length; i++) {
      const freq = (i * this.sampleRate) / (2 * magnitude.length);
      const diff = freq - centroid;
      weightedVariance += diff * diff * magnitude[i];
      magnitudeSum += magnitude[i];
    }
    
    return magnitudeSum > 0 ? Math.sqrt(weightedVariance / magnitudeSum) : 0;
  }

  /**
   * Convert Float32Array to base64 for storage
   * @param {Float32Array} array - Input array
   * @returns {string} Base64 encoded string
   */
  float32ToBase64(array) {
    const buffer = new ArrayBuffer(array.length * 4);
    const view = new Float32Array(buffer);
    view.set(array);
    
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    
    return btoa(binary);
  }

  /**
   * Convert base64 to Float32Array
   * @param {string} base64 - Base64 encoded string
   * @returns {Float32Array} Decoded array
   */
  base64ToFloat32(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    return new Float32Array(bytes.buffer);
  }
}

// Singleton instance for convenience
export const spectralAnalysis = new SpectralAnalysis();

export default SpectralAnalysis;