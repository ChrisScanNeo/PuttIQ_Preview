import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  onSnapshot 
} from 'firebase/firestore';
import { db } from '../firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * FirebaseProfileService - Manages sound profiles in Firebase Firestore
 * Handles CRUD operations and synchronization for user profiles
 */
class FirebaseProfileService {
  constructor() {
    this.profilesCache = new Map();
    this.listeners = new Map();
    this.CACHE_KEY = '@PuttIQ:profiles:';
  }

  /**
   * Generate a unique profile ID
   * @returns {string} UUID
   */
  generateProfileId() {
    return 'prof_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Save a profile to Firebase
   * @param {string} userId - User ID
   * @param {Object} profile - Profile data
   * @returns {Promise<string>} Profile ID
   */
  async saveProfile(userId, profile) {
    try {
      const profileId = profile.id || this.generateProfileId();
      
      // Prepare profile document
      const profileDoc = {
        ...profile,
        id: profileId,
        userId,
        updatedAt: serverTimestamp(),
        createdAt: profile.createdAt || serverTimestamp()
      };

      // Save to Firestore
      const profileRef = doc(db, 'users', userId, 'profiles', profileId);
      await setDoc(profileRef, profileDoc);

      // Update cache
      this.profilesCache.set(profileId, profileDoc);
      await this.cacheProfile(userId, profileId, profileDoc);

      console.log('Profile saved:', profileId);
      return profileId;
    } catch (error) {
      console.error('Error saving profile:', error);
      throw error;
    }
  }

  /**
   * Load all profiles for a user
   * @param {string} userId - User ID
   * @param {boolean} useCache - Whether to use cached data
   * @returns {Promise<Array>} Array of profiles
   */
  async loadUserProfiles(userId, useCache = true) {
    try {
      // Try cache first if requested
      if (useCache) {
        const cached = await this.getCachedProfiles(userId);
        if (cached && cached.length > 0) {
          console.log('Loaded profiles from cache:', cached.length);
          return cached;
        }
      }

      // Load from Firestore
      const profilesRef = collection(db, 'users', userId, 'profiles');
      const q = query(profilesRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      const profiles = [];
      snapshot.forEach((doc) => {
        const profile = doc.data();
        profiles.push(profile);
        this.profilesCache.set(profile.id, profile);
      });

      // Cache the profiles
      await this.cacheAllProfiles(userId, profiles);

      console.log('Loaded profiles from Firebase:', profiles.length);
      return profiles;
    } catch (error) {
      console.error('Error loading profiles:', error);
      
      // Fall back to cache on error
      const cached = await this.getCachedProfiles(userId);
      if (cached && cached.length > 0) {
        console.log('Using cached profiles due to error');
        return cached;
      }
      
      return [];
    }
  }

  /**
   * Get a single profile
   * @param {string} userId - User ID
   * @param {string} profileId - Profile ID
   * @returns {Promise<Object|null>} Profile or null
   */
  async getProfile(userId, profileId) {
    try {
      // Check cache first
      if (this.profilesCache.has(profileId)) {
        return this.profilesCache.get(profileId);
      }

      // Load from Firestore
      const profileRef = doc(db, 'users', userId, 'profiles', profileId);
      const profileDoc = await getDoc(profileRef);

      if (profileDoc.exists()) {
        const profile = profileDoc.data();
        this.profilesCache.set(profileId, profile);
        return profile;
      }

      return null;
    } catch (error) {
      console.error('Error getting profile:', error);
      
      // Try cache
      const cached = await this.getCachedProfile(userId, profileId);
      return cached;
    }
  }

  /**
   * Update a profile
   * @param {string} userId - User ID
   * @param {string} profileId - Profile ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<void>}
   */
  async updateProfile(userId, profileId, updates) {
    try {
      const profileRef = doc(db, 'users', userId, 'profiles', profileId);
      
      const updateData = {
        ...updates,
        updatedAt: serverTimestamp()
      };

      await setDoc(profileRef, updateData, { merge: true });

      // Update cache
      const cached = this.profilesCache.get(profileId);
      if (cached) {
        const updated = { ...cached, ...updateData };
        this.profilesCache.set(profileId, updated);
        await this.cacheProfile(userId, profileId, updated);
      }

      console.log('Profile updated:', profileId);
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  }

  /**
   * Delete a profile
   * @param {string} userId - User ID
   * @param {string} profileId - Profile ID
   * @returns {Promise<void>}
   */
  async deleteProfile(userId, profileId) {
    try {
      // Don't allow deletion of default profiles
      const profile = await this.getProfile(userId, profileId);
      if (profile && profile.isDefault) {
        throw new Error('Cannot delete default profiles');
      }

      // Delete from Firestore
      const profileRef = doc(db, 'users', userId, 'profiles', profileId);
      await deleteDoc(profileRef);

      // Remove from cache
      this.profilesCache.delete(profileId);
      await this.removeCachedProfile(userId, profileId);

      console.log('Profile deleted:', profileId);
    } catch (error) {
      console.error('Error deleting profile:', error);
      throw error;
    }
  }

  /**
   * Get profiles by type
   * @param {string} userId - User ID
   * @param {string} kind - 'target' or 'ignore'
   * @returns {Promise<Array>} Filtered profiles
   */
  async getProfilesByKind(userId, kind) {
    try {
      const profiles = await this.loadUserProfiles(userId);
      return profiles.filter(p => p.kind === kind && p.enabled);
    } catch (error) {
      console.error('Error getting profiles by kind:', error);
      return [];
    }
  }

  /**
   * Listen to profile changes
   * @param {string} userId - User ID
   * @param {Function} callback - Callback for changes
   * @returns {Function} Unsubscribe function
   */
  subscribeToProfiles(userId, callback) {
    const profilesRef = collection(db, 'users', userId, 'profiles');
    const q = query(profilesRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const profiles = [];
      snapshot.forEach((doc) => {
        profiles.push(doc.data());
      });
      
      // Update cache
      profiles.forEach(p => this.profilesCache.set(p.id, p));
      this.cacheAllProfiles(userId, profiles);
      
      callback(profiles);
    }, (error) => {
      console.error('Profile subscription error:', error);
    });

    // Store listener reference
    this.listeners.set(userId, unsubscribe);
    
    return unsubscribe;
  }

  /**
   * Unsubscribe from profile changes
   * @param {string} userId - User ID
   */
  unsubscribeFromProfiles(userId) {
    const unsubscribe = this.listeners.get(userId);
    if (unsubscribe) {
      unsubscribe();
      this.listeners.delete(userId);
    }
  }

  /**
   * Initialize default profiles for a new user
   * @param {string} userId - User ID
   * @returns {Promise<void>}
   */
  async initializeDefaultProfiles(userId) {
    try {
      // Load default metronome profiles from bundled assets
      const defaultProfiles = await this.loadDefaultProfiles();
      
      // Save each default profile for the user
      for (const profile of defaultProfiles) {
        const userProfile = {
          ...profile,
          userId,
          isDefault: true,
          enabled: true
        };
        
        await this.saveProfile(userId, userProfile);
      }
      
      console.log('Default profiles initialized for user:', userId);
    } catch (error) {
      console.error('Error initializing default profiles:', error);
    }
  }

  /**
   * Load default profiles from bundled assets
   * @returns {Promise<Array>} Default profiles
   */
  async loadDefaultProfiles() {
    try {
      // This will be replaced with actual metronome templates
      // For now, return empty array
      const defaults = [
        // {
        //   name: 'Default Metronome',
        //   kind: 'ignore',
        //   template: '', // Will be generated from metronome sound
        //   threshold: 0.88,
        //   sampleRate: 16000,
        //   frameSize: 256
        // }
      ];
      
      return defaults;
    } catch (error) {
      console.error('Error loading default profiles:', error);
      return [];
    }
  }

  // Cache Management Methods

  /**
   * Cache a profile locally
   */
  async cacheProfile(userId, profileId, profile) {
    try {
      const key = `${this.CACHE_KEY}${userId}:${profileId}`;
      await AsyncStorage.setItem(key, JSON.stringify(profile));
    } catch (error) {
      console.error('Error caching profile:', error);
    }
  }

  /**
   * Cache all profiles for a user
   */
  async cacheAllProfiles(userId, profiles) {
    try {
      const key = `${this.CACHE_KEY}${userId}:all`;
      await AsyncStorage.setItem(key, JSON.stringify(profiles));
    } catch (error) {
      console.error('Error caching all profiles:', error);
    }
  }

  /**
   * Get cached profiles
   */
  async getCachedProfiles(userId) {
    try {
      const key = `${this.CACHE_KEY}${userId}:all`;
      const cached = await AsyncStorage.getItem(key);
      return cached ? JSON.parse(cached) : [];
    } catch (error) {
      console.error('Error getting cached profiles:', error);
      return [];
    }
  }

  /**
   * Get a single cached profile
   */
  async getCachedProfile(userId, profileId) {
    try {
      const key = `${this.CACHE_KEY}${userId}:${profileId}`;
      const cached = await AsyncStorage.getItem(key);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Error getting cached profile:', error);
      return null;
    }
  }

  /**
   * Remove cached profile
   */
  async removeCachedProfile(userId, profileId) {
    try {
      const key = `${this.CACHE_KEY}${userId}:${profileId}`;
      await AsyncStorage.removeItem(key);
      
      // Update all profiles cache
      const profiles = await this.getCachedProfiles(userId);
      const filtered = profiles.filter(p => p.id !== profileId);
      await this.cacheAllProfiles(userId, filtered);
    } catch (error) {
      console.error('Error removing cached profile:', error);
    }
  }

  /**
   * Clear all cached profiles for a user
   */
  async clearProfileCache(userId) {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const profileKeys = keys.filter(k => k.startsWith(`${this.CACHE_KEY}${userId}:`));
      await AsyncStorage.multiRemove(profileKeys);
      this.profilesCache.clear();
    } catch (error) {
      console.error('Error clearing profile cache:', error);
    }
  }

  /**
   * Get profile statistics
   */
  async getProfileStats(userId) {
    try {
      const profiles = await this.loadUserProfiles(userId);
      
      return {
        total: profiles.length,
        target: profiles.filter(p => p.kind === 'target').length,
        ignore: profiles.filter(p => p.kind === 'ignore').length,
        enabled: profiles.filter(p => p.enabled).length,
        custom: profiles.filter(p => !p.isDefault).length,
        default: profiles.filter(p => p.isDefault).length
      };
    } catch (error) {
      console.error('Error getting profile stats:', error);
      return null;
    }
  }
}

// Export singleton instance
export const firebaseProfileService = new FirebaseProfileService();
export default firebaseProfileService;