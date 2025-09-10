import { FilterCascade } from './Biquad';
import { Platform } from 'react-native';
import { profileManager } from '../profiles/ProfileManager';
import { spectralAnalysis } from './SpectralAnalysis';

// Import ExpoPlayAudioStream correctly as a named export
let ExpoPlayAudioStream = null;

try {
  const audioStreamModule = require('@cjblack/expo-audio-stream');
  
  // The correct export is ExpoPlayAudioStream (not ExpoAudioStream)
  ExpoPlayAudioStream = audioStreamModule.ExpoPlayAudioStream;
  
  console.log('AudioStream module loaded:', {
    hasExpoPlayAudioStream: !!audioStreamModule.ExpoPlayAudioStream,
    keys: Object.keys(audioStreamModule)
  });
  
  if (!ExpoPlayAudioStream) {
    console.warn('ExpoPlayAudioStream not found in module, package may require native build');
  }
} catch (e) {
  console.error('Failed to load expo-audio-stream:', e);
}

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
 * @property {Function} getBpm - Function returning current BPM
 * @property {Function} onStrike - Callback for strike events
 * @property {boolean} useProfiles - Enable profile-based detection (default true)
 * @property {boolean} useListeningZone - Enable listening zone feature (default false)
 * @property {number} listeningZonePercent - Percentage of beat to listen (default 0.4)
 * @property {number} listeningZoneOffset - Start offset into beat (default 0.3)
 */

/**
 * Advanced putter impact detector using expo-audio-stream
 * This version works with Expo managed workflow
 */
export class PutterDetectorExpo {
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
      getBpm: () => 40,  // Default BPM function
      onStrike: () => {},
      useProfiles: true, // Enable profile-based detection by default
      useListeningZone: false, // Disabled by default for backwards compatibility
      listeningZonePercent: 0.4, // 40% of beat period
      listeningZoneOffset: 0.3,  // Start at 30% into beat
      ...options
    };

    // DSP components
    this.bandpassFilter = null;
    this.initializeFilters();
    
    // Listening zone tracking
    this.wasInZone = false;  // Track zone transitions
    
    // Profile-based detection
    this.useProfiles = this.opts.useProfiles !== false; // Use profiles unless explicitly disabled
    this.profileCheckEnabled = false; // Will be enabled after initialization

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
    
    // Buffer for spectrum computation
    this.frameBuffer = [];
    this.maxBufferSize = 4; // Keep last 4 frames for FFT

    // Audio stream subscription
    this.subscription = null;

    // Bind methods
    this.handleAudioData = this.handleAudioData.bind(this);
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
      console.warn('PutterDetectorExpo already running');
      return;
    }

    if (!ExpoPlayAudioStream) {
      console.error('ExpoPlayAudioStream not available. This package requires a custom dev build.');
      throw new Error('Audio streaming not available. @cjblack/expo-audio-stream requires EAS Build or ejecting from Expo Go.');
    }

    this.isRunning = true;
    this.frameCount = 0;
    this.detectionCount = 0;
    
    // Check if profiles are available
    try {
      console.log('🔍 Checking Profile System...');
      console.log('  - profileManager.initialized:', profileManager.initialized);
      console.log('  - this.useProfiles flag:', this.useProfiles);
      
      if (profileManager.initialized && this.useProfiles) {
        const profiles = profileManager.getEnabledProfiles();
        this.profileCheckEnabled = profiles.target.length > 0 || profiles.ignore.length > 0;
        
        console.log('✅ PROFILE DETECTION STATUS:', this.profileCheckEnabled ? 'ENABLED' : 'DISABLED (no profiles)');
        console.log('📋 Active profiles:', {
          targets: profiles.target.map(p => `${p.name} (threshold: ${p.threshold})`),
          ignores: profiles.ignore.map(p => `${p.name} (threshold: ${p.threshold})`)
        });
        
        if (profiles.ignore.length > 0) {
          console.log('🔇 Will FILTER OUT:', profiles.ignore.map(p => p.name).join(', '));
        }
        if (profiles.target.length > 0) {
          console.log('🎯 Will DETECT:', profiles.target.map(p => p.name).join(', '));
        }
      } else {
        console.log('⚠️ ProfileManager not initialized or profiles disabled, using BASIC detection only');
        this.profileCheckEnabled = false;
      }
    } catch (error) {
      console.log('❌ Profile check failed, using basic detection:', error.message);
      this.profileCheckEnabled = false;
    }
    
    // Log listening zone configuration
    if (this.opts.useListeningZone) {
      const bpm = this.opts.getBpm();
      const period = 60000 / bpm;
      const zoneStartMs = period * this.opts.listeningZoneOffset;
      const zoneEndMs = period * (this.opts.listeningZoneOffset + this.opts.listeningZonePercent);
      
      console.log('🎵 LISTENING ZONE ENABLED:');
      console.log(`   BPM: ${bpm}, Period: ${period.toFixed(0)}ms`);
      console.log(`   Zone: ${(this.opts.listeningZoneOffset * 100).toFixed(0)}%-${((this.opts.listeningZoneOffset + this.opts.listeningZonePercent) * 100).toFixed(0)}% of beat`);
      console.log(`   Window: ${zoneStartMs.toFixed(0)}ms-${zoneEndMs.toFixed(0)}ms after each tick`);
      console.log(`   Will ONLY detect putts during this ${(this.opts.listeningZonePercent * 100).toFixed(0)}% window`);
    } else {
      console.log('🎵 Listening zone DISABLED - detecting throughout entire beat');
    }

    try {
      // Configure recording according to ExpoPlayAudioStream API
      const recordingConfig = {
        sampleRate: this.opts.sampleRate,
        channels: 1, // Mono
        bitsPerChannel: 16,
        interval: 100, // Callback interval in ms
        onAudioStream: (audioData) => {
          // Handle incoming audio data
          this.handleAudioData(audioData);
        }
      };

      // Start recording using the correct API
      const result = await ExpoPlayAudioStream.startRecording(recordingConfig);
      this.subscription = result.subscription;
      
      console.log('PutterDetectorExpo started with config:', {
        sampleRate: this.opts.sampleRate,
        frameLength: this.opts.frameLength,
        refractoryMs: this.opts.refractoryMs
      });
    } catch (error) {
      console.error('Failed to start PutterDetectorExpo:', error);
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
      // Stop recording if available
      if (ExpoPlayAudioStream) {
        await ExpoPlayAudioStream.stopRecording();
      }
      
      // Clean up subscription
      if (this.subscription) {
        this.subscription.remove();
        this.subscription = null;
      }
      
      console.log('PutterDetectorExpo stopped. Stats:', {
        framesProcessed: this.frameCount,
        detectionsFound: this.detectionCount
      });
    } catch (error) {
      console.error('Error stopping PutterDetectorExpo:', error);
    }
  }

  /**
   * Handle incoming audio data from expo-audio-stream
   * @param {Object} audioData - Audio data object from ExpoPlayAudioStream
   */
  handleAudioData(audioData) {
    if (!this.isRunning) return;

    try {
      // ExpoPlayAudioStream provides data in the 'data' field as base64
      const base64Audio = audioData.data;
      
      if (!base64Audio) {
        console.warn('No audio data in callback');
        return;
      }
      
      // Convert base64 to Int16Array
      const samples = this.base64ToInt16Array(base64Audio);
      
      // Process the audio frame
      this.handleFrame(samples);
    } catch (error) {
      console.error('Error processing audio data:', error);
    }
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
   * Process incoming audio frame
   * @param {Int16Array} frame - Int16 audio samples
   */
  handleFrame(frame) {
    if (!this.isRunning) return;

    const now = performance.now();
    this.frameCount++;

    // Convert Int16 to normalized float and apply band-pass filter
    const filtered = new Float32Array(frame.length);
    for (let i = 0; i < frame.length; i++) {
      const normalized = frame[i] / 32768.0; // Int16 to [-1, 1]
      filtered[i] = this.bandpassFilter.process(normalized);
    }
    
    // Store frame for spectrum computation
    this.frameBuffer.push(filtered);
    if (this.frameBuffer.length > this.maxBufferSize) {
      this.frameBuffer.shift();
    }

    // Calculate features
    const features = this.extractFeatures(filtered);
    
    // Update baseline (adaptive noise floor)
    this.updateBaseline(features.energy);

    // Check if we're in the listening zone (early exit if not)
    const zoneCheck = this.isInListeningZone(now);
    
    // Track zone transitions for better debugging
    if (this.opts.useListeningZone) {
      // Detect zone entry
      if (zoneCheck.inZone && !this.wasInZone) {
        console.log(`✅ ENTERED listening zone at ${(zoneCheck.positionInBeat * 100).toFixed(0)}% of beat`);
        console.log(`   Zone is ${(zoneCheck.zoneStart * 100).toFixed(0)}%-${(zoneCheck.zoneEnd * 100).toFixed(0)}% of beat period`);
      }
      // Detect zone exit
      else if (!zoneCheck.inZone && this.wasInZone) {
        console.log(`❌ EXITED listening zone at ${(zoneCheck.positionInBeat * 100).toFixed(0)}% of beat`);
      }
      this.wasInZone = zoneCheck.inZone;
      
      // Exit early if outside zone
      if (!zoneCheck.inZone) {
        // Log position periodically while outside zone
        if (this.frameCount % 100 === 0) {
          console.log(`⏳ Waiting for zone: currently at ${(zoneCheck.positionInBeat * 100).toFixed(0)}% of beat`);
        }
        return; // Skip detection outside the listening zone
      }
    }

    // Calculate dynamic threshold with fixed minimum for calibration
    let threshold;
    if (this.opts.calibrationMode && this.opts.fixedThreshold) {
      // Use fixed threshold in calibration mode for consistency
      threshold = this.opts.fixedThreshold;
    } else {
      // Normal dynamic threshold
      threshold = Math.max(0.0015, this.baseline * this.opts.energyThresh);
    }

    // Profile-based detection (if enabled)
    let isHit = false;
    let profileMatch = null;
    
    // ALWAYS log energy periodically to debug detection issues
    if (this.frameCount % 50 === 0) {
      console.log(`📊 Frame ${this.frameCount}: Energy=${features.energy.toFixed(6)}, Baseline=${this.baseline.toFixed(6)}, Threshold=${threshold.toFixed(6)}`);
      console.log(`   ZCR=${features.zcr.toFixed(3)}, Crest=${features.crestFactor.toFixed(2)}, Flux=${features.flux.toFixed(6)}`);
      if (this.opts.useListeningZone) {
        console.log(`   Zone: ${zoneCheck.reason}`);
      }
    }
    
    // Log any sound above baseline
    if (features.energy > this.baseline * 1.5) {
      console.log(`🔊 Sound detected: Energy=${features.energy.toFixed(6)} (${(features.energy/threshold * 100).toFixed(0)}% of threshold)`);
    }
    
    // Check profiles for ANY sound above minimal threshold (not 0.5x)
    if (this.profileCheckEnabled && this.useProfiles && features.energy > this.baseline * 2) {
      // Compute spectrum from recent frames
      try {
        const spectrum = this.computeSpectrumFromBuffer();
        if (spectrum) {
          // Check against profiles
          profileMatch = profileManager.checkSpectrum(spectrum);
          
          if (profileMatch.type === 'ignore') {
            // Sound matches ignore profile (e.g., metronome) - filter it out
            console.log(`🔇 FILTERED OUT: ${profileMatch.profile} (similarity: ${(profileMatch.similarity * 100).toFixed(1)}%)`);
            console.log(`   Energy was: ${features.energy.toFixed(6)}, would have triggered: ${features.energy > threshold}`);
            return; // Skip this frame completely
          } else if (profileMatch.type === 'target') {
            // Sound matches target profile (putter) - detect it!
            isHit = true;
            console.log(`✅ PROFILE MATCH: ${profileMatch.profile} (similarity: ${(profileMatch.similarity * 100).toFixed(1)}%)`);
          } else if (profileMatch.type === 'no_match') {
            // Sound didn't match any profile
            console.log(`❓ No profile match (energy: ${features.energy.toFixed(6)})`);
          }
          // For 'no_match' or 'pass', fall through to basic detection
        }
      } catch (error) {
        console.error('❌ Profile check failed:', error);
      }
    } else if (features.energy > this.baseline * 2) {
      // Any sound above baseline but below profile check
      console.log(`📉 Low energy sound: ${features.energy.toFixed(6)} (${(features.energy/threshold * 100).toFixed(0)}% of threshold)`);
      console.log(`   Attempting basic detection anyway...`);
    }
    
    // Always try basic detection if no profile match (don't require profile match)
    if (!isHit) {
      isHit = this.detectImpact(features, threshold);
      if (isHit && !profileMatch) {
        console.log(`🎯 Basic detection triggered (no profile match)`);
      }
    }

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
        quality,
        profileMatch: profileMatch ? {
          type: profileMatch.type,
          profile: profileMatch.profile,
          similarity: profileMatch.similarity
        } : null
      };

      // Log the detection
      console.log('🎯 PUTT DETECTED!', {
        energy: features.energy.toFixed(6),
        quality: quality,
        confidence: (confidence * 100).toFixed(1) + '%',
        profileMatch: profileMatch ? `${profileMatch.profile} (${(profileMatch.similarity * 100).toFixed(1)}%)` : 'Basic detection',
        totalDetections: this.detectionCount
      });

      // Notify callback
      this.opts.onStrike(strikeEvent);
    }
  }

  /**
   * Compute spectrum from buffered frames
   * @returns {Float32Array|null} Spectral features
   */
  computeSpectrumFromBuffer() {
    if (this.frameBuffer.length === 0) return null;
    
    try {
      // Concatenate recent frames
      const totalLength = this.frameBuffer.reduce((sum, frame) => sum + frame.length, 0);
      const concatenated = new Float32Array(totalLength);
      let offset = 0;
      
      for (const frame of this.frameBuffer) {
        concatenated.set(frame, offset);
        offset += frame.length;
      }
      
      // Compute spectrum
      const spectrum = spectralAnalysis.computeSpectrum(concatenated);
      return spectrum;
    } catch (error) {
      console.error('Failed to compute spectrum:', error);
      return null;
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
    const fluxCheck = features.flux > threshold * 0.3; // Lower flux threshold
    const crestCheck = features.crestFactor > 1.5; // Lower crest requirement

    // Always log detection attempt details when energy is significant
    if (features.energy > this.baseline * 3) {
      console.log('🔍 Detection check:', {
        energy: `${features.energy.toFixed(6)} > ${threshold.toFixed(6)} = ${energyCheck}`,
        zcr: `${features.zcr.toFixed(3)} > ${this.opts.zcrThresh} = ${zcrCheck}`,
        flux: `${features.flux.toFixed(6)} > ${(threshold * 0.3).toFixed(6)} = ${fluxCheck}`,
        crest: `${features.crestFactor.toFixed(2)} > 1.5 = ${crestCheck}`,
        criteria: `${energyCheck + zcrCheck + fluxCheck + crestCheck}/4`
      });
    }

    // In calibration mode or when debugging, be MUCH more sensitive
    if (this.opts.calibrationMode || this.opts.debugMode) {
      // Only require energy check in calibration/debug mode
      if (energyCheck) {
        console.log('✅ Calibration mode: Energy check passed!');
      }
      return energyCheck;
    }

    // Normal mode: Only require 2 criteria (was 3)
    const criteriaCount = energyCheck + zcrCheck + fluxCheck + crestCheck;
    
    if (criteriaCount >= 2 && features.energy > this.baseline * 2) {
      console.log(`✅ Detection criteria met: ${criteriaCount}/4`);
      return true;
    }
    
    return false;
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
   * Check if timestamp is within the listening zone
   * Only detect hits during the middle portion of each beat period
   * @param {number} timestamp - Timestamp to check
   * @returns {Object} Zone check result with details
   */
  isInListeningZone(timestamp) {
    // If listening zone is disabled, always return true
    if (!this.opts.useListeningZone) {
      return { inZone: true, reason: 'Zone disabled' };
    }

    const bpm = this.opts.getBpm();
    const period = 60000 / bpm; // Period in milliseconds
    const ticks = this.opts.getUpcomingTicks();
    
    if (!ticks || ticks.length === 0) {
      return { inZone: true, reason: 'No ticks available' };
    }

    // Find the most recent tick (including past ticks)
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
    
    // If no past tick found, estimate from next tick
    if (lastTick === null && nextTick !== null) {
      lastTick = nextTick - period;
    }
    
    // If still no reference, can't determine zone
    if (lastTick === null) {
      return { inZone: true, reason: 'Cannot determine position' };
    }

    // Calculate position within beat (0.0 to 1.0)
    const positionInBeat = ((timestamp - lastTick) % period) / period;
    
    // Define listening zone boundaries
    const zoneStart = this.opts.listeningZoneOffset;
    const zoneEnd = zoneStart + this.opts.listeningZonePercent;
    
    // Check if we're in the listening zone
    const inZone = positionInBeat >= zoneStart && positionInBeat <= zoneEnd;
    
    return {
      inZone,
      positionInBeat,
      zoneStart,
      zoneEnd,
      reason: inZone ? 
        `In zone (${(positionInBeat * 100).toFixed(0)}% of beat)` : 
        `Outside zone (${(positionInBeat * 100).toFixed(0)}% of beat)`
    };
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
    this.frameBuffer = [];
    this.bandpassFilter.reset();
  }
}

export default PutterDetectorExpo;