import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  Switch,
  TouchableOpacity,
  Alert,
  SafeAreaView
} from 'react-native';
import Slider from '@react-native-community/slider';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateUserSettings } from '../services/auth';
import { profileManager } from '../services/profiles/ProfileManager';

export default function SettingsScreen({ route, navigation }) {
  const user = route.params?.user;
  
  const [settings, setSettings] = useState({
    defaultBPM: 80,
    soundEnabled: true,
    hapticEnabled: false,
    debugMode: false,
    showSimilarityScores: false,
    autoCalibrate: true,
    sensitivity: 0.5,
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load from user profile first
      if (user?.settings) {
        setSettings(prev => ({ ...prev, ...user.settings }));
      }
      
      // Load additional settings from AsyncStorage
      const savedSettings = await AsyncStorage.getItem('appSettings');
      if (savedSettings) {
        setSettings(prev => ({ ...prev, ...JSON.parse(savedSettings) }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const saveSettings = async (newSettings) => {
    try {
      setSettings(newSettings);
      
      // Save to AsyncStorage
      await AsyncStorage.setItem('appSettings', JSON.stringify(newSettings));
      
      // Update user settings in Firebase
      if (user) {
        await updateUserSettings(newSettings);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const updateSetting = (key, value) => {
    const newSettings = { ...settings, [key]: value };
    saveSettings(newSettings);
  };

  const clearCache = async () => {
    Alert.alert(
      'Clear Cache',
      'This will remove all cached data and profiles. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            try {
              await profileManager.clearCache();
              await AsyncStorage.multiRemove([
                'appSettings',
                'cachedUserData',
                '@PuttIQ:profiles:all',
                '@PuttIQ:defaultMetronomeTemplates'
              ]);
              Alert.alert('Success', 'Cache cleared successfully');
            } catch (error) {
              console.error('Error clearing cache:', error);
              Alert.alert('Error', 'Failed to clear cache');
            }
          }
        }
      ]
    );
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Reset Settings',
      'This will reset all settings to their default values. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            const defaultSettings = {
              defaultBPM: 80,
              soundEnabled: true,
              hapticEnabled: false,
              debugMode: false,
              showSimilarityScores: false,
              autoCalibrate: true,
              sensitivity: 0.5,
            };
            saveSettings(defaultSettings);
            Alert.alert('Success', 'Settings reset to defaults');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        
        {/* Practice Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Practice Settings</Text>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Default BPM</Text>
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderValue}>{settings.defaultBPM}</Text>
              <Slider
                style={styles.slider}
                minimumValue={60}
                maximumValue={100}
                value={settings.defaultBPM}
                onValueChange={(value) => updateSetting('defaultBPM', Math.round(value))}
                step={1}
                minimumTrackTintColor="#2E7D32"
                maximumTrackTintColor="#ccc"
              />
            </View>
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Detection Sensitivity</Text>
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderValue}>{(settings.sensitivity * 100).toFixed(0)}%</Text>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={1}
                value={settings.sensitivity}
                onValueChange={(value) => updateSetting('sensitivity', value)}
                step={0.1}
                minimumTrackTintColor="#FF9800"
                maximumTrackTintColor="#ccc"
              />
            </View>
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Metronome Sound</Text>
            <Switch
              value={settings.soundEnabled}
              onValueChange={(value) => updateSetting('soundEnabled', value)}
              trackColor={{ false: '#ccc', true: '#2E7D32' }}
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Haptic Feedback</Text>
            <Switch
              value={settings.hapticEnabled}
              onValueChange={(value) => updateSetting('hapticEnabled', value)}
              trackColor={{ false: '#ccc', true: '#2E7D32' }}
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Auto-Calibrate</Text>
            <Switch
              value={settings.autoCalibrate}
              onValueChange={(value) => updateSetting('autoCalibrate', value)}
              trackColor={{ false: '#ccc', true: '#2E7D32' }}
            />
          </View>
        </View>

        {/* Debug Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Debug Settings</Text>
          
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Debug Mode</Text>
              <Text style={styles.settingDescription}>
                Show technical details during detection
              </Text>
            </View>
            <Switch
              value={settings.debugMode}
              onValueChange={(value) => updateSetting('debugMode', value)}
              trackColor={{ false: '#ccc', true: '#4CAF50' }}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>Similarity Scores</Text>
              <Text style={styles.settingDescription}>
                Display real-time profile matching scores
              </Text>
            </View>
            <Switch
              value={settings.showSimilarityScores}
              onValueChange={(value) => updateSetting('showSimilarityScores', value)}
              trackColor={{ false: '#ccc', true: '#4CAF50' }}
            />
          </View>
        </View>

        {/* Data Management */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Management</Text>
          
          <TouchableOpacity
            style={styles.button}
            onPress={clearCache}
          >
            <Text style={styles.buttonText}>🗑️ Clear Cache</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={resetToDefaults}
          >
            <Text style={styles.buttonText}>↺ Reset to Defaults</Text>
          </TouchableOpacity>
        </View>

        {/* App Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>App Information</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Device ID</Text>
            <Text style={styles.infoValue} numberOfLines={1} ellipsizeMode="middle">
              {user?.deviceId || 'Unknown'}
            </Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Premium Status</Text>
            <Text style={[styles.infoValue, { color: user?.isPremium ? '#2E7D32' : '#FF9800' }]}>
              {user?.isPremium ? '✓ Premium' : 'Free Version'}
            </Text>
          </View>
        </View>

        {/* Help Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Help & Support</Text>
          
          <TouchableOpacity
            style={styles.helpButton}
            onPress={() => {
              Alert.alert(
                'How to Use PuttIQ',
                '1. Go to the Profiles tab\n' +
                '2. Record your putter sound (30 seconds)\n' +
                '3. Return to Practice tab\n' +
                '4. Press START to begin\n' +
                '5. Practice your putting rhythm\n\n' +
                'The app will detect your putter impacts and filter out the metronome sound.',
                [{ text: 'Got it!' }]
              );
            }}
          >
            <Text style={styles.helpButtonText}>📖 How to Use</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.helpButton}
            onPress={() => {
              Alert.alert(
                'Troubleshooting',
                '• Not detecting hits? Adjust sensitivity\n' +
                '• Too many false detections? Lower sensitivity\n' +
                '• Metronome not filtered? Check profile settings\n' +
                '• App not working? Try clearing cache\n\n' +
                'For more help, contact support.',
                [{ text: 'OK' }]
              );
            }}
          >
            <Text style={styles.helpButtonText}>🔧 Troubleshooting</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 20,
  },
  section: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginTop: 15,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingInfo: {
    flex: 1,
    marginRight: 10,
  },
  settingLabel: {
    fontSize: 14,
    color: '#333',
  },
  settingDescription: {
    fontSize: 11,
    color: '#666',
    marginTop: 2,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    maxWidth: 200,
  },
  slider: {
    flex: 1,
    height: 40,
  },
  sliderValue: {
    fontSize: 14,
    color: '#666',
    minWidth: 35,
    textAlign: 'right',
    marginRight: 10,
  },
  button: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 10,
  },
  secondaryButton: {
    backgroundColor: '#FF9800',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666',
  },
  infoValue: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    maxWidth: '60%',
  },
  helpButton: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  helpButtonText: {
    color: '#2E7D32',
    fontSize: 14,
    fontWeight: '600',
  },
});