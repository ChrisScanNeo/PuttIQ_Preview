import { Audio } from 'expo-av';
import { spectralAnalysis } from '../dsp/SpectralAnalysis';
import * as FileSystem from 'expo-file-system';

/**
 * MetronomeTemplateGenerator - Generate spectral templates from metronome sounds
 * Used to create default ignore profiles for metronome filtering
 */
class MetronomeTemplateGenerator {
  constructor() {
    this.sampleRate = 16000;
    this.frameSize = 256;
  }

  /**
   * Generate template from a sound file
   * @param {string} soundUri - URI to the sound file
   * @returns {Promise<Object>} Profile template object
   */
  async generateFromSoundFile(soundUri, name = 'Metronome') {
    try {
      console.log('Generating template from:', soundUri);
      
      // Load the sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: soundUri },
        { shouldPlay: false }
      );
      
      // Get sound status
      const status = await sound.getStatusAsync();
      console.log('Sound duration:', status.durationMillis, 'ms');
      
      // For React Native, we can't directly access raw audio data from expo-av
      // We need to use a different approach or simulate the template
      
      // Since we can't extract raw audio in React Native easily,
      // we'll create a simulated template for the metronome
      const template = this.createMetronomeTemplate();
      
      // Clean up
      await sound.unloadAsync();
      
      return {
        name,
        kind: 'ignore',
        template,
        threshold: 0.97,  // Ultra-strict to prevent false matches
        sampleRate: this.sampleRate,
        frameSize: this.frameSize,
        isDefault: true,
        enabled: true
      };
    } catch (error) {
      console.error('Error generating template from sound file:', error);
      throw error;
    }
  }

  /**
   * Create a synthetic metronome template
   * Based on typical metronome spectral characteristics
   * @returns {Float32Array} Spectral template
   */
  createMetronomeTemplate() {
    const template = new Float32Array(128);
    
    // Metronome characteristics:
    // - Sharp transient (click/tick)
    // - Energy concentrated in 1-4 kHz range
    // - Quick decay
    // - Relatively flat spectrum in active range
    
    // Frequency bin calculation: bin_freq = (bin_index * sample_rate) / (2 * num_bins)
    // For 16kHz sample rate and 128 bins: bin_freq = bin_index * 62.5 Hz
    
    for (let i = 0; i < 128; i++) {
      const freq = i * 62.5; // Hz
      
      if (freq < 500) {
        // Low frequency roll-off
        template[i] = 0.1 * (freq / 500);
      } else if (freq >= 500 && freq <= 4000) {
        // Main energy band for metronome click
        template[i] = 0.8 + 0.2 * Math.random();
      } else if (freq > 4000 && freq <= 6000) {
        // High frequency presence
        template[i] = 0.4 * (1 - (freq - 4000) / 2000);
      } else {
        // High frequency roll-off
        template[i] = 0.05 * Math.random();
      }
    }
    
    // Apply log scale and normalize
    for (let i = 0; i < 128; i++) {
      template[i] = Math.log10(template[i] + 1e-10);
    }
    
    return spectralAnalysis.normalize(template);
  }

  /**
   * Generate templates for different metronome types
   * @returns {Array<Object>} Array of metronome profiles
   */
  generateDefaultTemplates() {
    const templates = [];
    
    // Wood block metronome
    const woodTemplate = this.createMetronomeTemplate();
    // Emphasize mid frequencies for wood
    for (let i = 20; i < 50; i++) {
      woodTemplate[i] *= 1.2;
    }
    templates.push({
      name: 'Metronome: Wood Block',
      kind: 'ignore',
      template: spectralAnalysis.normalize(woodTemplate),
      threshold: 0.97,  // Ultra-strict threshold to prevent false matches
      sampleRate: this.sampleRate,
      frameSize: this.frameSize,
      isDefault: true,
      enabled: true
    });
    
    // Electronic beep metronome
    const beepTemplate = new Float32Array(128);
    // Electronic beep - concentrated energy at specific frequency
    const beepFreq = 1000; // 1kHz beep
    const beepBin = Math.floor(beepFreq / 62.5);
    for (let i = 0; i < 128; i++) {
      if (Math.abs(i - beepBin) < 3) {
        beepTemplate[i] = 1.0;
      } else {
        beepTemplate[i] = 0.1 * Math.exp(-Math.abs(i - beepBin) / 10);
      }
    }
    // Apply log scale
    for (let i = 0; i < 128; i++) {
      beepTemplate[i] = Math.log10(beepTemplate[i] + 1e-10);
    }
    templates.push({
      name: 'Metronome: Electronic Beep',
      kind: 'ignore',
      template: spectralAnalysis.normalize(beepTemplate),
      threshold: 0.97,  // Ultra-strict for electronic beeps
      sampleRate: this.sampleRate,
      frameSize: this.frameSize,
      isDefault: true,
      enabled: true
    });
    
    // Click/tick metronome (like our default sound) - MOST IMPORTANT
    const clickTemplate = this.createMetronomeTemplate();
    // Emphasize high frequencies for sharp click
    for (let i = 40; i < 80; i++) {
      clickTemplate[i] *= 1.1;
    }
    templates.push({
      name: 'Metronome: Click/Tick',
      kind: 'ignore',
      template: spectralAnalysis.normalize(clickTemplate),
      threshold: 0.97,  // Ultra strict - this is our main metronome sound
      sampleRate: this.sampleRate,
      frameSize: this.frameSize,
      isDefault: true,
      enabled: true
    });
    
    // Rimshot metronome
    const rimshotTemplate = this.createMetronomeTemplate();
    // Rimshot has both low thump and high crack
    for (let i = 5; i < 15; i++) {
      rimshotTemplate[i] *= 1.3; // Low thump
    }
    for (let i = 60; i < 90; i++) {
      rimshotTemplate[i] *= 1.2; // High crack
    }
    templates.push({
      name: 'Metronome: Rimshot',
      kind: 'ignore',
      template: spectralAnalysis.normalize(rimshotTemplate),
      threshold: 0.97,  // Ultra-strict filtering
      sampleRate: this.sampleRate,
      frameSize: this.frameSize,
      isDefault: true,
      enabled: true
    });
    
    return templates;
  }

  /**
   * Export templates to JSON format for bundling
   * @param {Array<Object>} templates - Array of template objects
   * @returns {string} JSON string
   */
  exportToJSON(templates) {
    // Convert Float32Arrays to regular arrays for JSON serialization
    const exportData = templates.map(t => ({
      ...t,
      template: Array.from(t.template)
    }));
    
    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Save templates to AsyncStorage for testing
   * @param {Array<Object>} templates - Templates to save
   */
  async saveTemplatesToStorage(templates) {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const json = this.exportToJSON(templates);
      await AsyncStorage.setItem('@PuttIQ:defaultMetronomeTemplates', json);
      console.log('Saved', templates.length, 'templates to storage');
    } catch (error) {
      console.error('Error saving templates:', error);
    }
  }

  /**
   * Load templates from AsyncStorage
   * @returns {Promise<Array>} Templates array
   */
  async loadTemplatesFromStorage() {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const json = await AsyncStorage.getItem('@PuttIQ:defaultMetronomeTemplates');
      
      if (!json) {
        return [];
      }
      
      const templates = JSON.parse(json);
      
      // Convert arrays back to Float32Arrays
      return templates.map(t => ({
        ...t,
        template: new Float32Array(t.template)
      }));
    } catch (error) {
      console.error('Error loading templates:', error);
      return [];
    }
  }

  /**
   * Initialize default templates
   * Generates and saves if not already present
   */
  async initializeDefaults() {
    try {
      // Check if templates already exist
      const existing = await this.loadTemplatesFromStorage();
      
      if (existing.length > 0) {
        console.log('Using existing', existing.length, 'default templates');
        return existing;
      }
      
      // Generate new templates
      console.log('Generating default metronome templates...');
      const templates = this.generateDefaultTemplates();
      
      // Save for future use
      await this.saveTemplatesToStorage(templates);
      
      console.log('Generated and saved', templates.length, 'default templates');
      return templates;
    } catch (error) {
      console.error('Error initializing default templates:', error);
      return [];
    }
  }
}

// Export singleton instance
export const metronomeTemplateGenerator = new MetronomeTemplateGenerator();
export default metronomeTemplateGenerator;