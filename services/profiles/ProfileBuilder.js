import { spectralAnalysis } from '../dsp/SpectralAnalysis';

/**
 * ProfileBuilder - Convert audio recordings to spectral profiles
 * Used during onboarding to create user's putter profile
 */
class ProfileBuilder {
  constructor() {
    this.frameSize = 256;
    this.sampleRate = 16000;
    this.minTransientFrames = 30; // Minimum frames needed for reliable profile
    this.maxTransientFrames = 200; // Maximum frames to use
  }

  /**
   * Build a profile from recorded audio frames
   * @param {Array<Int16Array>} audioFrames - Array of audio frame buffers
   * @param {string} name - Profile name
   * @param {string} kind - 'target' or 'ignore'
   * @returns {Object} Profile object or null if insufficient data
   */
  buildProfile(audioFrames, name, kind = 'target') {
    console.log(`Building ${kind} profile from ${audioFrames.length} frames`);
    
    // Extract transient frames (likely impacts)
    const transientFrames = this.extractTransientFrames(audioFrames);
    
    if (transientFrames.length < this.minTransientFrames) {
      console.warn(`Insufficient transient frames: ${transientFrames.length} < ${this.minTransientFrames}`);
      return {
        success: false,
        error: 'Not enough impact sounds detected. Please try again with more hits.',
        transientCount: transientFrames.length,
        requiredCount: this.minTransientFrames
      };
    }
    
    // Compute spectral templates for each transient
    const spectra = transientFrames.map(frame => 
      spectralAnalysis.computeSpectrum(frame)
    );
    
    // Average the spectra to create template
    const template = spectralAnalysis.averageSpectra(spectra);
    
    if (!template) {
      return {
        success: false,
        error: 'Failed to compute spectral template'
      };
    }
    
    // Determine appropriate threshold based on profile type
    const threshold = kind === 'target' ? 0.80 : 0.88;
    
    // Create profile object
    const profile = {
      name,
      kind,
      template,
      threshold,
      enabled: true,
      sampleRate: this.sampleRate,
      frameSize: this.frameSize,
      metadata: {
        transientFramesUsed: spectra.length,
        totalFramesProcessed: audioFrames.length,
        createdAt: Date.now(),
        quality: this.assessQuality(spectra)
      }
    };
    
    return {
      success: true,
      profile,
      stats: {
        transientFrames: transientFrames.length,
        totalFrames: audioFrames.length,
        quality: profile.metadata.quality
      }
    };
  }

  /**
   * Extract frames containing transients (impacts)
   * @param {Array<Int16Array>} audioFrames - Raw audio frames
   * @returns {Array<Int16Array>} Frames containing transients
   */
  extractTransientFrames(audioFrames) {
    const transientFrames = [];
    const recentTransients = [];
    const refractoryFrames = 10; // Skip ~160ms after each transient
    let framesSinceLastTransient = refractoryFrames;
    
    for (let i = 0; i < audioFrames.length; i++) {
      const frame = audioFrames[i];
      
      // Check if enough time has passed since last transient
      if (framesSinceLastTransient < refractoryFrames) {
        framesSinceLastTransient++;
        continue;
      }
      
      // Detect transient in this frame
      const transientInfo = spectralAnalysis.detectTransient(frame);
      
      if (transientInfo.isTransient) {
        transientFrames.push(frame);
        framesSinceLastTransient = 0;
        
        // Track recent transients for quality assessment
        recentTransients.push({
          index: i,
          energy: transientInfo.energy,
          zcr: transientInfo.zcr
        });
        
        // Limit number of frames used
        if (transientFrames.length >= this.maxTransientFrames) {
          break;
        }
      } else {
        framesSinceLastTransient++;
      }
    }
    
    console.log(`Extracted ${transientFrames.length} transient frames from ${audioFrames.length} total frames`);
    return transientFrames;
  }

  /**
   * Assess the quality of a profile based on spectral consistency
   * @param {Array<Float32Array>} spectra - Array of spectral templates
   * @returns {Object} Quality metrics
   */
  assessQuality(spectra) {
    if (spectra.length === 0) {
      return { score: 0, consistency: 0, confidence: 'low' };
    }
    
    // Calculate average spectrum
    const avgSpectrum = spectralAnalysis.averageSpectra(spectra);
    
    // Calculate similarity of each spectrum to the average
    const similarities = spectra.map(spectrum => 
      spectralAnalysis.cosineSimilarity(spectrum, avgSpectrum)
    );
    
    // Calculate statistics
    const meanSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
    const variance = similarities.reduce((sum, sim) => 
      sum + Math.pow(sim - meanSimilarity, 2), 0) / similarities.length;
    const stdDev = Math.sqrt(variance);
    
    // Quality score based on consistency
    const consistency = meanSimilarity;
    const variability = 1 - stdDev;
    const score = (consistency + variability) / 2;
    
    // Determine confidence level
    let confidence;
    if (score > 0.85 && spectra.length >= 50) {
      confidence = 'high';
    } else if (score > 0.75 || spectra.length >= 30) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }
    
    return {
      score: Math.round(score * 100) / 100,
      consistency: Math.round(consistency * 100) / 100,
      variability: Math.round(variability * 100) / 100,
      sampleCount: spectra.length,
      confidence
    };
  }

  /**
   * Build a profile from a continuous recording buffer
   * @param {Int16Array|Float32Array} recordingBuffer - Continuous audio recording
   * @param {string} name - Profile name
   * @param {string} kind - 'target' or 'ignore'
   * @returns {Object} Profile result
   */
  buildFromRecording(recordingBuffer, name, kind = 'target') {
    // Split continuous buffer into frames
    const frames = this.splitIntoFrames(recordingBuffer);
    
    // Build profile from frames
    return this.buildProfile(frames, name, kind);
  }

  /**
   * Build a profile from discrete calibration impacts
   * @param {Object} calibrationData - Calibration data with individual impacts
   * @returns {Object} Profile result
   */
  async buildFromCalibration(calibrationData) {
    const { impacts, name, kind = 'target', threshold = 0.5, metadata = {} } = calibrationData;
    
    console.log(`Building calibrated profile from ${impacts.length} discrete impacts`);
    
    // Validate we have enough impacts
    if (impacts.length < 5) {
      return {
        success: false,
        error: 'Need at least 5 impacts for calibration',
        impactCount: impacts.length
      };
    }
    
    // Extract spectral features from each impact
    const validSpectra = [];
    const impactMetrics = [];
    
    for (const impact of impacts) {
      if (impact.spectralFeatures) {
        validSpectra.push(impact.spectralFeatures);
        impactMetrics.push({
          energy: impact.energy,
          confidence: impact.confidence
        });
      } else if (impact.frames && impact.frames.length > 0) {
        // Compute spectrum from frames if not already done
        try {
          const concatenated = this.concatenateFrames(impact.frames);
          const spectrum = spectralAnalysis.computeSpectrum(concatenated);
          if (spectrum) {
            validSpectra.push(spectrum);
            impactMetrics.push({
              energy: impact.energy,
              confidence: impact.confidence || 0.8
            });
          }
        } catch (error) {
          console.error('Failed to compute spectrum for impact:', error);
        }
      }
    }
    
    if (validSpectra.length < 5) {
      return {
        success: false,
        error: 'Could not extract enough valid spectral data',
        validCount: validSpectra.length
      };
    }
    
    // Create robust template by averaging spectra
    const template = spectralAnalysis.averageSpectra(validSpectra);
    
    if (!template) {
      return {
        success: false,
        error: 'Failed to create spectral template'
      };
    }
    
    // Calculate quality metrics
    const quality = this.assessCalibrationQuality(validSpectra, impactMetrics);
    
    // Create enhanced profile
    const profile = {
      id: `calibrated_${Date.now()}`,
      name,
      kind,
      template,
      threshold,
      enabled: true,
      sampleRate: this.sampleRate,
      frameSize: this.frameSize,
      isCalibrated: true,
      metadata: {
        ...metadata,
        calibrationImpacts: impacts.length,
        validSpectra: validSpectra.length,
        quality,
        createdAt: Date.now(),
        averageEnergy: impactMetrics.reduce((sum, m) => sum + m.energy, 0) / impactMetrics.length,
        energyRange: {
          min: Math.min(...impactMetrics.map(m => m.energy)),
          max: Math.max(...impactMetrics.map(m => m.energy))
        }
      }
    };
    
    return {
      success: true,
      profile,
      stats: {
        impactsUsed: impacts.length,
        validSpectra: validSpectra.length,
        quality,
        consistency: quality.consistency
      }
    };
  }

  /**
   * Concatenate multiple frames into a single buffer
   * @param {Array} frames - Array of audio frames
   * @returns {Float32Array} Concatenated buffer
   */
  concatenateFrames(frames) {
    const totalLength = frames.reduce((sum, frame) => sum + frame.length, 0);
    const concatenated = new Float32Array(totalLength);
    
    let offset = 0;
    for (const frame of frames) {
      if (frame instanceof Int16Array) {
        // Convert to float
        for (let i = 0; i < frame.length; i++) {
          concatenated[offset + i] = frame[i] / 32768.0;
        }
      } else {
        concatenated.set(frame, offset);
      }
      offset += frame.length;
    }
    
    return concatenated;
  }

  /**
   * Assess quality of calibration data
   * @param {Array<Float32Array>} spectra - Spectral templates from impacts
   * @param {Array} metrics - Impact metrics
   * @returns {Object} Quality assessment
   */
  assessCalibrationQuality(spectra, metrics) {
    // Calculate spectral consistency
    const avgSpectrum = spectralAnalysis.averageSpectra(spectra);
    const similarities = spectra.map(spectrum => 
      spectralAnalysis.cosineSimilarity(spectrum, avgSpectrum)
    );
    
    const meanSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;
    const minSimilarity = Math.min(...similarities);
    const maxSimilarity = Math.max(...similarities);
    
    // Calculate energy consistency
    const energies = metrics.map(m => m.energy);
    const meanEnergy = energies.reduce((a, b) => a + b, 0) / energies.length;
    const energyStdDev = Math.sqrt(
      energies.reduce((sum, e) => sum + Math.pow(e - meanEnergy, 2), 0) / energies.length
    );
    const energyCV = energyStdDev / meanEnergy; // Coefficient of variation
    
    // Overall quality score
    const spectralScore = meanSimilarity;
    const energyScore = 1 - Math.min(1, energyCV); // Lower CV is better
    const overallScore = (spectralScore * 0.7 + energyScore * 0.3);
    
    // Determine confidence level
    let confidence;
    if (overallScore > 0.85 && spectra.length >= 8) {
      confidence = 'high';
    } else if (overallScore > 0.75 && spectra.length >= 6) {
      confidence = 'medium';
    } else {
      confidence = 'low';
    }
    
    return {
      score: Math.round(overallScore * 100) / 100,
      consistency: Math.round(meanSimilarity * 100) / 100,
      spectralRange: {
        min: Math.round(minSimilarity * 100) / 100,
        max: Math.round(maxSimilarity * 100) / 100
      },
      energyConsistency: Math.round(energyScore * 100) / 100,
      sampleCount: spectra.length,
      confidence
    };
  }

  /**
   * Split continuous audio buffer into frames
   * @param {Int16Array|Float32Array} buffer - Continuous audio buffer
   * @returns {Array<Int16Array>} Array of frame buffers
   */
  splitIntoFrames(buffer) {
    const frames = [];
    const frameSize = this.frameSize;
    const hopSize = Math.floor(frameSize / 2); // 50% overlap
    
    for (let i = 0; i <= buffer.length - frameSize; i += hopSize) {
      const frame = buffer.slice(i, i + frameSize);
      
      // Convert to Int16Array if needed
      if (frame instanceof Float32Array) {
        const int16Frame = new Int16Array(frameSize);
        for (let j = 0; j < frameSize; j++) {
          int16Frame[j] = Math.max(-32768, Math.min(32767, Math.floor(frame[j] * 32768)));
        }
        frames.push(int16Frame);
      } else {
        frames.push(new Int16Array(frame));
      }
    }
    
    return frames;
  }

  /**
   * Validate a profile before saving
   * @param {Object} profile - Profile to validate
   * @returns {Object} Validation result
   */
  validateProfile(profile) {
    const errors = [];
    
    if (!profile.name || profile.name.trim().length === 0) {
      errors.push('Profile name is required');
    }
    
    if (!profile.kind || !['target', 'ignore'].includes(profile.kind)) {
      errors.push('Profile kind must be "target" or "ignore"');
    }
    
    if (!profile.template || !(profile.template instanceof Float32Array)) {
      errors.push('Profile must have a valid spectral template');
    } else if (profile.template.length !== 128) {
      errors.push('Template must have exactly 128 frequency bins');
    }
    
    if (typeof profile.threshold !== 'number' || 
        profile.threshold < 0 || profile.threshold > 1) {
      errors.push('Threshold must be between 0 and 1');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Create a test profile with synthetic data
   * @param {string} type - 'putter' or 'metronome'
   * @returns {Object} Test profile
   */
  createTestProfile(type = 'putter') {
    let template;
    let name;
    let kind;
    let threshold;
    
    if (type === 'putter') {
      // Putter impact: broader spectrum with emphasis on 2-5 kHz
      template = new Float32Array(128);
      for (let i = 0; i < 128; i++) {
        const freq = i * 62.5; // Hz
        if (freq >= 2000 && freq <= 5000) {
          template[i] = 0.7 + 0.3 * Math.random();
        } else if (freq >= 1000 && freq <= 6000) {
          template[i] = 0.4 + 0.2 * Math.random();
        } else {
          template[i] = 0.1 * Math.random();
        }
      }
      name = 'Test Putter';
      kind = 'target';
      threshold = 0.80;
    } else {
      // Metronome: sharp peak around 1-3 kHz
      template = new Float32Array(128);
      const peakBin = 24; // ~1.5 kHz
      for (let i = 0; i < 128; i++) {
        const distance = Math.abs(i - peakBin);
        template[i] = Math.exp(-distance / 8);
      }
      name = 'Test Metronome';
      kind = 'ignore';
      threshold = 0.88;
    }
    
    // Apply log scale and normalize
    for (let i = 0; i < 128; i++) {
      template[i] = Math.log10(template[i] + 1e-10);
    }
    template = spectralAnalysis.normalize(template);
    
    return {
      name,
      kind,
      template,
      threshold,
      enabled: true,
      sampleRate: this.sampleRate,
      frameSize: this.frameSize,
      metadata: {
        isTest: true,
        createdAt: Date.now()
      }
    };
  }
}

// Export singleton instance
export const profileBuilder = new ProfileBuilder();
export default profileBuilder;