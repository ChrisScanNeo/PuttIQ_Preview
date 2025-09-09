import AsyncStorage from '@react-native-async-storage/async-storage';
import { firebaseProfileService } from './FirebaseProfileService';
import { spectralAnalysis } from '../dsp/SpectralAnalysis';

/**
 * ProfileManager - Central profile management with Firebase integration
 * Coordinates between local cache, Firebase, and detection system
 */
class ProfileManager {
  constructor() {
    this.userId = null;
    this.profiles = new Map();
    this.enabledProfiles = {
      target: [],
      ignore: []
    };
    this.defaultProfiles = [];
    this.initialized = false;
    this.unsubscribe = null;
  }

  /**
   * Initialize profile manager for a user
   * @param {string} userId - Firebase user ID
   * @returns {Promise<void>}
   */
  async initialize(userId) {
    try {
      this.userId = userId;
      
      // Load default metronome profiles
      await this.loadDefaultProfiles();
      
      // Load user profiles from Firebase
      const userProfiles = await firebaseProfileService.loadUserProfiles(userId);
      
      // Check if user has any profiles, if not initialize defaults
      if (userProfiles.length === 0) {
        console.log('No user profiles found, initializing defaults');
        await firebaseProfileService.initializeDefaultProfiles(userId);
        // Reload after initialization
        const profiles = await firebaseProfileService.loadUserProfiles(userId);
        this.processProfiles(profiles);
      } else {
        this.processProfiles(userProfiles);
      }
      
      // Subscribe to profile updates
      this.subscribeToUpdates();
      
      this.initialized = true;
      console.log('ProfileManager initialized with', this.profiles.size, 'profiles');
    } catch (error) {
      console.error('Error initializing ProfileManager:', error);
      throw error;
    }
  }

  /**
   * Process and categorize profiles
   * @param {Array} profiles - Array of profile objects
   */
  processProfiles(profiles) {
    // Clear existing
    this.profiles.clear();
    this.enabledProfiles.target = [];
    this.enabledProfiles.ignore = [];
    
    // Process each profile
    profiles.forEach(profile => {
      // Convert base64 template to Float32Array if needed
      if (typeof profile.template === 'string') {
        profile.template = spectralAnalysis.base64ToFloat32(profile.template);
      }
      
      // Store in map
      this.profiles.set(profile.id, profile);
      
      // Add to enabled lists
      if (profile.enabled) {
        if (profile.kind === 'target') {
          this.enabledProfiles.target.push(profile);
        } else if (profile.kind === 'ignore') {
          this.enabledProfiles.ignore.push(profile);
        }
      }
    });
    
    // Add default profiles to ignore list if not already present
    this.defaultProfiles.forEach(defaultProfile => {
      if (!this.profiles.has(defaultProfile.id)) {
        this.profiles.set(defaultProfile.id, defaultProfile);
        if (defaultProfile.enabled) {
          this.enabledProfiles.ignore.push(defaultProfile);
        }
      }
    });
  }

  /**
   * Load default metronome profiles from bundled assets
   * @returns {Promise<void>}
   */
  async loadDefaultProfiles() {
    try {
      // Try to load from bundled assets
      const metronomeProfiles = await this.loadMetronomeTemplates();
      this.defaultProfiles = metronomeProfiles;
      console.log('Loaded', this.defaultProfiles.length, 'default profiles');
    } catch (error) {
      console.error('Error loading default profiles:', error);
      // Continue without defaults
      this.defaultProfiles = [];
    }
  }

  /**
   * Load metronome templates from assets or generate them
   * @returns {Promise<Array>} Array of default profiles
   */
  async loadMetronomeTemplates() {
    try {
      // Use the MetronomeTemplateGenerator to get default templates
      const { metronomeTemplateGenerator } = require('./MetronomeTemplateGenerator');
      const templates = await metronomeTemplateGenerator.initializeDefaults();
      
      // Add unique IDs for default templates
      return templates.map(t => ({
        ...t,
        id: `default_${t.name.replace(/[:\s]+/g, '_').toLowerCase()}`,
        isDefault: true,
        enabled: true
      }));
    } catch (error) {
      console.error('Error loading metronome templates:', error);
      return [];
    }
  }

  /**
   * Subscribe to real-time profile updates
   */
  subscribeToUpdates() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    
    this.unsubscribe = firebaseProfileService.subscribeToProfiles(
      this.userId,
      (profiles) => {
        console.log('Profiles updated from Firebase');
        this.processProfiles(profiles);
      }
    );
  }

  /**
   * Get enabled profiles for detection
   * @returns {Object} Enabled target and ignore profiles
   */
  getEnabledProfiles() {
    return {
      target: this.enabledProfiles.target,
      ignore: this.enabledProfiles.ignore
    };
  }

  /**
   * Check if a spectral template matches any profile
   * @param {Float32Array} spectrum - Input spectrum to check
   * @returns {Object} Match result with type and similarity
   */
  checkSpectrum(spectrum) {
    // Check ignore profiles first (higher priority)
    for (const profile of this.enabledProfiles.ignore) {
      const similarity = spectralAnalysis.cosineSimilarity(spectrum, profile.template);
      if (similarity >= profile.threshold) {
        return {
          matched: true,
          type: 'ignore',
          profile: profile.name,
          similarity
        };
      }
    }
    
    // Check target profiles
    let bestTarget = null;
    let bestSimilarity = 0;
    
    for (const profile of this.enabledProfiles.target) {
      const similarity = spectralAnalysis.cosineSimilarity(spectrum, profile.template);
      if (similarity >= profile.threshold && similarity > bestSimilarity) {
        bestTarget = profile;
        bestSimilarity = similarity;
      }
    }
    
    if (bestTarget) {
      return {
        matched: true,
        type: 'target',
        profile: bestTarget.name,
        similarity: bestSimilarity
      };
    }
    
    // No target profiles or no match
    if (this.enabledProfiles.target.length > 0) {
      return {
        matched: false,
        type: 'no_match',
        reason: 'No target profile matched'
      };
    }
    
    return {
      matched: true,
      type: 'pass',
      reason: 'No target profiles configured'
    };
  }

  /**
   * Save a new profile
   * @param {Object} profile - Profile to save
   * @returns {Promise<string>} Profile ID
   */
  async saveProfile(profile) {
    if (!this.userId) {
      throw new Error('ProfileManager not initialized');
    }
    
    // Convert template to base64 for storage
    const profileToSave = {
      ...profile,
      template: spectralAnalysis.float32ToBase64(profile.template)
    };
    
    return await firebaseProfileService.saveProfile(this.userId, profileToSave);
  }

  /**
   * Update a profile
   * @param {string} profileId - Profile ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<void>}
   */
  async updateProfile(profileId, updates) {
    if (!this.userId) {
      throw new Error('ProfileManager not initialized');
    }
    
    // If updating template, convert to base64
    if (updates.template instanceof Float32Array) {
      updates.template = spectralAnalysis.float32ToBase64(updates.template);
    }
    
    await firebaseProfileService.updateProfile(this.userId, profileId, updates);
  }

  /**
   * Delete a profile
   * @param {string} profileId - Profile ID
   * @returns {Promise<void>}
   */
  async deleteProfile(profileId) {
    if (!this.userId) {
      throw new Error('ProfileManager not initialized');
    }
    
    await firebaseProfileService.deleteProfile(this.userId, profileId);
  }

  /**
   * Toggle profile enabled state
   * @param {string} profileId - Profile ID
   * @returns {Promise<void>}
   */
  async toggleProfile(profileId) {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error('Profile not found');
    }
    
    await this.updateProfile(profileId, { enabled: !profile.enabled });
  }

  /**
   * Get all profiles
   * @returns {Array} All profiles
   */
  getAllProfiles() {
    return Array.from(this.profiles.values());
  }

  /**
   * Get profile by ID
   * @param {string} profileId - Profile ID
   * @returns {Object|null} Profile or null
   */
  getProfile(profileId) {
    return this.profiles.get(profileId) || null;
  }

  /**
   * Get profile statistics
   * @returns {Promise<Object>} Profile stats
   */
  async getStats() {
    if (!this.userId) {
      return null;
    }
    
    return await firebaseProfileService.getProfileStats(this.userId);
  }

  /**
   * Clear all cached data
   */
  async clearCache() {
    if (!this.userId) {
      return;
    }
    
    await firebaseProfileService.clearProfileCache(this.userId);
    this.profiles.clear();
    this.enabledProfiles.target = [];
    this.enabledProfiles.ignore = [];
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    
    if (this.userId) {
      firebaseProfileService.unsubscribeFromProfiles(this.userId);
    }
    
    this.profiles.clear();
    this.enabledProfiles.target = [];
    this.enabledProfiles.ignore = [];
    this.initialized = false;
    this.userId = null;
  }
}

// Export singleton instance
export const profileManager = new ProfileManager();
export default profileManager;