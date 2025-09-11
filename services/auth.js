import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from './firebase';
import * as Device from 'expo-device';
import * as Application from 'expo-application';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Get unique device/app identifier
export const getDeviceId = async () => {
  try {
    let deviceId;

    if (Platform.OS === 'ios') {
      deviceId = await Application.getIosIdForVendorAsync();
    } else if (Platform.OS === 'android') {
      deviceId = Application.androidId;
    } else {
      // For web, try to get a stored ID first
      deviceId = await AsyncStorage.getItem('webDeviceId');
      if (!deviceId) {
        deviceId = 'web_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
        await AsyncStorage.setItem('webDeviceId', deviceId);
      }
    }

    // If the native ID is still null (e.g., on an emulator), use a stored fallback
    if (!deviceId) {
      deviceId = await AsyncStorage.getItem('fallbackDeviceId');
      if (!deviceId) {
        console.warn('Device ID was null, generating and saving a random fallback ID.');
        deviceId = 'fallback_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
        await AsyncStorage.setItem('fallbackDeviceId', deviceId);
      }
    }
    return deviceId;

  } catch (error) {
    console.error('Error getting device ID:', error);
    // Final fallback in case of errors
    let deviceId = await AsyncStorage.getItem('fallbackDeviceId');
    if (!deviceId) {
        deviceId = 'error_fallback_' + Math.random().toString(36).substring(2) + Date.now().toString(36);
        await AsyncStorage.setItem('fallbackDeviceId', deviceId);
    }
    return deviceId;
  }
};

// Get or create user based on device
export const authenticateUser = async () => {
  try {
    const deviceId = await getDeviceId();
    const deviceInfo = {
      brand: Device.brand,
      modelName: Device.modelName,
      osName: Device.osName,
      osVersion: Device.osVersion,
      deviceType: Device.deviceType,
    };

    // Use device ID as the user ID
    const userId = deviceId;
    
    // Try to get cached user data first
    const cachedUser = await AsyncStorage.getItem('cachedUserData');
    
    let userData;
    
    try {
      // Try to connect to Firebase
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        // Create new user profile
        userData = {
          uid: userId,
          deviceId: deviceId,
          deviceInfo: deviceInfo,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          isPremium: false, // Will be updated by IAP
          hasCompletedOnboarding: false,
          settings: {
            defaultBPM: 30,
            soundEnabled: true,
            hapticEnabled: false,  // Disabled by default
          },
          stats: {
            totalSessions: 0,
            perfectHits: 0,
            totalHits: 0,
            bestStreak: 0,
            practiceTime: 0, // in seconds
          },
          purchases: {
            // Store receipt info will be added here by IAP
          }
        };
        
        await setDoc(userRef, userData);
      } else {
        // Update last login
        userData = userSnap.data();
        await setDoc(userRef, {
          lastLoginAt: new Date().toISOString(),
          deviceInfo: deviceInfo, // Update device info in case it changed
        }, { merge: true });
      }
      
      // Cache the user data for offline use
      await AsyncStorage.setItem('cachedUserData', JSON.stringify(userData));
      
    } catch (firebaseError) {
      console.log('Firebase offline, using cached/default data');
      
      // If Firebase is offline, use cached data or create default
      if (cachedUser) {
        userData = JSON.parse(cachedUser);
      } else {
        // Create default offline user data
        userData = {
          uid: userId,
          deviceId: deviceId,
          deviceInfo: deviceInfo,
          createdAt: new Date().toISOString(),
          lastLoginAt: new Date().toISOString(),
          isPremium: false,
          hasCompletedOnboarding: false,
          settings: {
            defaultBPM: 30,
            soundEnabled: true,
            hapticEnabled: false,  // Disabled by default
          },
          stats: {
            totalSessions: 0,
            perfectHits: 0,
            totalHits: 0,
            bestStreak: 0,
            practiceTime: 0,
          },
          purchases: {},
          isOffline: true, // Flag to indicate offline mode
        };
        
        // Save to cache
        await AsyncStorage.setItem('cachedUserData', JSON.stringify(userData));
      }
    }

    // Store user ID locally for quick access
    await AsyncStorage.setItem('userId', userId);
    
    return {
      ...userData,
      uid: userId,
    };
  } catch (error) {
    console.error('Error authenticating user:', error);
    throw error;
  }
};

// Get current user from local storage
export const getCurrentUser = async () => {
  try {
    const userId = await AsyncStorage.getItem('userId');
    if (!userId) return null;
    
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      return {
        ...userSnap.data(),
        uid: userId,
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting current user:', error);
    return null;
  }
};

// Update user premium status after IAP
export const updatePremiumStatus = async (purchaseInfo) => {
  try {
    const userId = await AsyncStorage.getItem('userId');
    if (!userId) throw new Error('No user ID found');
    
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      isPremium: true,
      purchases: purchaseInfo,
      premiumActivatedAt: new Date().toISOString(),
    }, { merge: true });
    
    return true;
  } catch (error) {
    console.error('Error updating premium status:', error);
    return false;
  }
};

// Update user stats
export const updateUserStats = async (stats) => {
  try {
    const userId = await AsyncStorage.getItem('userId');
    if (!userId) return;
    
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      stats: stats,
      lastActivityAt: new Date().toISOString(),
    }, { merge: true });
  } catch (error) {
    console.error('Error updating user stats:', error);
  }
};

// Update user settings
export const updateUserSettings = async (settings) => {
  try {
    const userId = await AsyncStorage.getItem('userId');
    if (!userId) return;
    
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      settings: settings,
    }, { merge: true });
    
    // Also store locally for quick access
    await AsyncStorage.setItem('userSettings', JSON.stringify(settings));
  } catch (error) {
    console.error('Error updating user settings:', error);
  }
};