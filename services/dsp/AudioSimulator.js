/**
 * AudioSimulator - Generate synthetic audio signals for testing
 * Allows testing detector logic without real audio input
 */
export class AudioSimulator {
  constructor(sampleRate = 16000) {
    this.sampleRate = sampleRate;
    this.time = 0;
  }

  /**
   * Generate a sine wave
   * @param {number} frequency - Frequency in Hz
   * @param {number} duration - Duration in seconds
   * @param {number} amplitude - Amplitude (0-1)
   * @returns {Float32Array} Audio samples
   */
  generateSineWave(frequency, duration, amplitude = 0.5) {
    const numSamples = Math.floor(this.sampleRate * duration);
    const samples = new Float32Array(numSamples);
    
    for (let i = 0; i < numSamples; i++) {
      const t = i / this.sampleRate;
      samples[i] = amplitude * Math.sin(2 * Math.PI * frequency * t);
    }
    
    return samples;
  }

  /**
   * Generate white noise
   * @param {number} duration - Duration in seconds
   * @param {number} amplitude - Amplitude (0-1)
   * @returns {Float32Array} Audio samples
   */
  generateWhiteNoise(duration, amplitude = 0.1) {
    const numSamples = Math.floor(this.sampleRate * duration);
    const samples = new Float32Array(numSamples);
    
    for (let i = 0; i < numSamples; i++) {
      samples[i] = amplitude * (Math.random() * 2 - 1);
    }
    
    return samples;
  }

  /**
   * Generate a simulated putter impact sound
   * Characteristics: Short burst, broadband energy, quick decay
   * @param {Object} params - Impact parameters
   * @returns {Float32Array} Audio samples
   */
  generatePutterImpact(params = {}) {
    const {
      duration = 0.05,        // 50ms impact
      frequency = 3000,       // Center frequency
      bandwidth = 2000,       // Frequency spread
      amplitude = 0.8,        // Peak amplitude
      decay = 0.95,          // Exponential decay rate
      noiseAmount = 0.3,     // Amount of noise in impact
    } = params;

    const numSamples = Math.floor(this.sampleRate * duration);
    const samples = new Float32Array(numSamples);
    
    // Generate impact as mix of:
    // 1. Decaying sine burst at center frequency
    // 2. Band-limited noise
    // 3. Harmonics
    
    for (let i = 0; i < numSamples; i++) {
      const t = i / this.sampleRate;
      
      // Exponential envelope
      const envelope = amplitude * Math.exp(-t * 20); // Fast decay
      
      // Main tone
      const tone = Math.sin(2 * Math.PI * frequency * t);
      
      // Add some harmonics for metallic sound
      const harmonic2 = 0.3 * Math.sin(2 * Math.PI * frequency * 2 * t);
      const harmonic3 = 0.1 * Math.sin(2 * Math.PI * frequency * 3 * t);
      
      // Band-limited noise
      const noise = (Math.random() * 2 - 1) * noiseAmount;
      
      // Combine components
      samples[i] = envelope * (
        tone + 
        harmonic2 + 
        harmonic3 + 
        noise
      );
      
      // Add initial transient (click)
      if (i < 10) {
        samples[i] += (10 - i) / 10 * amplitude * (Math.random() * 2 - 1);
      }
    }
    
    return samples;
  }

  /**
   * Generate a metronome tick sound
   * @param {Object} params - Tick parameters
   * @returns {Float32Array} Audio samples
   */
  generateMetronomeTick(params = {}) {
    const {
      duration = 0.01,       // 10ms tick
      frequency = 1000,      // Tick frequency
      amplitude = 0.5,       // Volume
    } = params;

    const numSamples = Math.floor(this.sampleRate * duration);
    const samples = new Float32Array(numSamples);
    
    for (let i = 0; i < numSamples; i++) {
      const t = i / this.sampleRate;
      
      // Simple envelope (quick attack, quick decay)
      const envelope = Math.exp(-t * 100);
      
      // Pure tone
      samples[i] = amplitude * envelope * Math.sin(2 * Math.PI * frequency * t);
    }
    
    return samples;
  }

  /**
   * Add samples to an existing audio buffer at a specific time
   * @param {Float32Array} buffer - Target buffer
   * @param {Float32Array} samples - Samples to add
   * @param {number} timeMs - Time in milliseconds
   */
  addSamplesToBuffer(buffer, samples, timeMs) {
    const startSample = Math.floor((timeMs / 1000) * this.sampleRate);
    
    for (let i = 0; i < samples.length; i++) {
      const idx = startSample + i;
      if (idx < buffer.length) {
        buffer[idx] += samples[i];
      }
    }
    
    return buffer;
  }

  /**
   * Generate a complete test scenario with metronome and impacts
   * @param {Object} scenario - Scenario configuration
   * @returns {Object} Audio buffer and event timings
   */
  generateTestScenario(scenario = {}) {
    const {
      duration = 10,           // 10 seconds
      bpm = 80,               // Metronome BPM
      impacts = [],           // Array of impact times in ms
      addNoise = true,        // Add background noise
      noiseLevel = 0.02,      // Background noise level
    } = scenario;

    const numSamples = Math.floor(this.sampleRate * duration);
    const buffer = new Float32Array(numSamples);
    
    // Add background noise
    if (addNoise) {
      const noise = this.generateWhiteNoise(duration, noiseLevel);
      for (let i = 0; i < numSamples; i++) {
        buffer[i] = noise[i];
      }
    }
    
    // Add metronome ticks
    const tickInterval = 60000 / bpm; // ms between ticks
    const tickTimes = [];
    for (let t = 0; t < duration * 1000; t += tickInterval) {
      const tick = this.generateMetronomeTick();
      this.addSamplesToBuffer(buffer, tick, t);
      tickTimes.push(t);
    }
    
    // Add impacts
    const impactEvents = [];
    for (const impactTime of impacts) {
      const impact = this.generatePutterImpact({
        amplitude: 0.6 + Math.random() * 0.4, // Vary strength
      });
      this.addSamplesToBuffer(buffer, impact, impactTime);
      impactEvents.push({
        time: impactTime,
        type: 'impact'
      });
    }
    
    return {
      buffer,
      sampleRate: this.sampleRate,
      duration,
      events: {
        ticks: tickTimes,
        impacts: impactEvents
      }
    };
  }

  /**
   * Convert Float32Array to Int16Array (for detectors expecting int16)
   * @param {Float32Array} float32 - Float samples (-1 to 1)
   * @returns {Int16Array} Int16 samples
   */
  float32ToInt16(float32) {
    const int16 = new Int16Array(float32.length);
    
    for (let i = 0; i < float32.length; i++) {
      // Clamp to [-1, 1] and scale to int16 range
      const clamped = Math.max(-1, Math.min(1, float32[i]));
      int16[i] = Math.floor(clamped * 32767);
    }
    
    return int16;
  }

  /**
   * Simulate streaming audio frames to a detector
   * @param {Float32Array} buffer - Audio buffer
   * @param {number} frameSize - Frame size in samples
   * @param {Function} callback - Frame callback
   */
  async streamFrames(buffer, frameSize, callback) {
    const numFrames = Math.floor(buffer.length / frameSize);
    
    for (let i = 0; i < numFrames; i++) {
      const start = i * frameSize;
      const end = start + frameSize;
      const frame = buffer.slice(start, end);
      
      // Convert to Int16 if needed
      const int16Frame = this.float32ToInt16(frame);
      
      // Call the callback
      await callback(int16Frame, i * frameSize / this.sampleRate * 1000);
      
      // Simulate real-time delay
      await new Promise(resolve => setTimeout(resolve, frameSize / this.sampleRate * 1000));
    }
  }

  /**
   * Test a detector with a scenario
   * @param {Object} detector - Detector instance
   * @param {Object} scenario - Test scenario
   * @returns {Promise<Object>} Test results
   */
  async testDetector(detector, scenario) {
    const { buffer, events } = this.generateTestScenario(scenario);
    const detectedHits = [];
    
    // Configure detector to capture hits
    const originalOnStrike = detector.opts.onStrike;
    detector.opts.onStrike = (strike) => {
      detectedHits.push(strike);
      if (originalOnStrike) originalOnStrike(strike);
    };
    
    // Stream frames to detector
    await this.streamFrames(buffer, 256, async (frame, timeMs) => {
      detector.handleFrame(frame);
    });
    
    // Calculate accuracy
    const results = {
      expectedImpacts: events.impacts.length,
      detectedImpacts: detectedHits.length,
      hits: detectedHits,
      accuracy: this.calculateAccuracy(events.impacts, detectedHits),
      falsePositives: this.findFalsePositives(events, detectedHits),
      missedHits: this.findMissedHits(events.impacts, detectedHits)
    };
    
    return results;
  }

  /**
   * Calculate detection accuracy
   */
  calculateAccuracy(expected, detected, toleranceMs = 50) {
    let correctDetections = 0;
    
    for (const expectedHit of expected) {
      const found = detected.some(d => 
        Math.abs(d.timestamp - expectedHit.time) < toleranceMs
      );
      if (found) correctDetections++;
    }
    
    return expected.length > 0 ? correctDetections / expected.length : 0;
  }

  /**
   * Find false positive detections
   */
  findFalsePositives(events, detected, toleranceMs = 50) {
    const falsePositives = [];
    
    for (const detection of detected) {
      const nearTick = events.ticks.some(t => 
        Math.abs(detection.timestamp - t) < toleranceMs
      );
      const nearImpact = events.impacts.some(i => 
        Math.abs(detection.timestamp - i.time) < toleranceMs
      );
      
      if (nearTick) {
        falsePositives.push({ ...detection, reason: 'near_tick' });
      } else if (!nearImpact) {
        falsePositives.push({ ...detection, reason: 'spurious' });
      }
    }
    
    return falsePositives;
  }

  /**
   * Find missed hits
   */
  findMissedHits(expected, detected, toleranceMs = 50) {
    const missed = [];
    
    for (const expectedHit of expected) {
      const found = detected.some(d => 
        Math.abs(d.timestamp - expectedHit.time) < toleranceMs
      );
      if (!found) {
        missed.push(expectedHit);
      }
    }
    
    return missed;
  }
}

export default AudioSimulator;