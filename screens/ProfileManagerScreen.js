import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Modal
} from 'react-native';
import { profileManager } from '../services/profiles/ProfileManager';
import { getDeviceId } from '../services/auth';
import PutterOnboardingScreen from './PutterOnboardingScreen';

export default function ProfileManagerScreen({ route, navigation }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [testMode, setTestMode] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [stats, setStats] = useState(null);
  const [userId, setUserId] = useState(null);

  // Initialize profile manager
  useEffect(() => {
    initializeProfiles();
  }, []);

  const initializeProfiles = async () => {
    try {
      setLoading(true);
      
      // Get user ID
      const deviceId = await getDeviceId();
      setUserId(deviceId);
      
      // Initialize profile manager
      await profileManager.initialize(deviceId);
      
      // Load profiles
      const allProfiles = profileManager.getAllProfiles();
      setProfiles(allProfiles);
      
      // Get stats
      const profileStats = await profileManager.getStats();
      setStats(profileStats);
      
      // Check if user has a target profile
      const hasTargetProfile = allProfiles.some(p => p.kind === 'target' && !p.isDefault);
      if (!hasTargetProfile && allProfiles.length > 0) {
        // Suggest creating a putter profile
        setTimeout(() => {
          Alert.alert(
            'Create Your Putter Profile',
            'Record your putter sound to improve detection accuracy',
            [
              { text: 'Later', style: 'cancel' },
              { text: 'Record Now', onPress: () => setShowOnboarding(true) }
            ]
          );
        }, 1000);
      }
    } catch (error) {
      console.error('Error initializing profiles:', error);
      Alert.alert('Error', 'Failed to load profiles');
    } finally {
      setLoading(false);
    }
  };

  const toggleProfile = async (profileId) => {
    try {
      await profileManager.toggleProfile(profileId);
      const updatedProfiles = profileManager.getAllProfiles();
      setProfiles(updatedProfiles);
    } catch (error) {
      console.error('Error toggling profile:', error);
      Alert.alert('Error', 'Failed to update profile');
    }
  };

  const deleteProfile = async (profileId) => {
    const profile = profiles.find(p => p.id === profileId);
    
    if (profile?.isDefault) {
      Alert.alert('Cannot Delete', 'Default profiles cannot be deleted');
      return;
    }

    Alert.alert(
      'Delete Profile',
      `Are you sure you want to delete "${profile?.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await profileManager.deleteProfile(profileId);
              const updatedProfiles = profileManager.getAllProfiles();
              setProfiles(updatedProfiles);
            } catch (error) {
              console.error('Error deleting profile:', error);
              Alert.alert('Error', 'Failed to delete profile');
            }
          }
        }
      ]
    );
  };

  const handleOnboardingComplete = async (profile) => {
    setShowOnboarding(false);
    if (profile) {
      // Save the new profile
      try {
        await profileManager.saveProfile(profile);
        await initializeProfiles(); // Reload profiles
        Alert.alert('Success', 'Your putter profile has been created!');
      } catch (error) {
        console.error('Error saving profile:', error);
        Alert.alert('Error', 'Failed to save profile');
      }
    }
  };

  const renderProfile = (profile) => {
    const isTarget = profile.kind === 'target';
    const iconColor = isTarget ? '#2E7D32' : '#FF9800';
    const icon = isTarget ? '🎯' : '🔇';
    
    return (
      <View key={profile.id} style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <Text style={[styles.profileIcon, { color: iconColor }]}>{icon}</Text>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profile.name}</Text>
            <Text style={styles.profileType}>
              {isTarget ? 'Target Sound' : 'Ignore Sound'}
              {profile.isDefault && ' (Default)'}
            </Text>
            <Text style={styles.profileThreshold}>
              Threshold: {(profile.threshold * 100).toFixed(0)}%
            </Text>
          </View>
        </View>
        
        <View style={styles.profileActions}>
          <Switch
            value={profile.enabled}
            onValueChange={() => toggleProfile(profile.id)}
            trackColor={{ false: '#ccc', true: iconColor }}
            thumbColor={profile.enabled ? '#fff' : '#f4f3f4'}
          />
          
          {!profile.isDefault && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteProfile(profile.id)}
            >
              <Text style={styles.deleteButtonText}>🗑️</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text style={styles.loadingText}>Loading profiles...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Stats Section */}
        {stats && (
          <View style={styles.statsCard}>
            <Text style={styles.statsTitle}>Profile Statistics</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.total}</Text>
                <Text style={styles.statLabel}>Total</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.target}</Text>
                <Text style={styles.statLabel}>Targets</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.ignore}</Text>
                <Text style={styles.statLabel}>Ignores</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats.enabled}</Text>
                <Text style={styles.statLabel}>Active</Text>
              </View>
            </View>
          </View>
        )}

        {/* Test Mode Toggle */}
        <View style={styles.testModeCard}>
          <View style={styles.testModeHeader}>
            <Text style={styles.testModeTitle}>🧪 Test Mode</Text>
            <Switch
              value={testMode}
              onValueChange={setTestMode}
              trackColor={{ false: '#ccc', true: '#4CAF50' }}
            />
          </View>
          {testMode && (
            <Text style={styles.testModeDesc}>
              Real-time similarity scores will be shown during detection
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => setShowOnboarding(true)}
          >
            <Text style={styles.actionButtonText}>🎯 Record Putter</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, styles.secondaryButton]}
            onPress={() => {
              Alert.alert(
                'Add Ignore Sound',
                'Record a sound you want to filter out (like background noise)',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Record', onPress: () => {
                    // TODO: Implement ignore sound recording
                    Alert.alert('Coming Soon', 'This feature will be available soon');
                  }}
                ]
              );
            }}
          >
            <Text style={styles.actionButtonText}>🔇 Add Ignore</Text>
          </TouchableOpacity>
        </View>

        {/* Profiles List */}
        <View style={styles.profilesSection}>
          <Text style={styles.sectionTitle}>Sound Profiles</Text>
          
          {profiles.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No profiles yet</Text>
              <Text style={styles.emptySubtext}>
                Tap "Record Putter" to create your first profile
              </Text>
            </View>
          ) : (
            <View>
              {/* Target Profiles */}
              {profiles.filter(p => p.kind === 'target').length > 0 && (
                <View style={styles.profileGroup}>
                  <Text style={styles.groupTitle}>Target Sounds (Detect)</Text>
                  {profiles.filter(p => p.kind === 'target').map(renderProfile)}
                </View>
              )}
              
              {/* Ignore Profiles */}
              {profiles.filter(p => p.kind === 'ignore').length > 0 && (
                <View style={styles.profileGroup}>
                  <Text style={styles.groupTitle}>Ignore Sounds (Filter Out)</Text>
                  {profiles.filter(p => p.kind === 'ignore').map(renderProfile)}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Instructions */}
        <View style={styles.instructionsCard}>
          <Text style={styles.instructionsTitle}>ℹ️ How It Works</Text>
          <Text style={styles.instructionsText}>
            • <Text style={styles.bold}>Target profiles</Text> - Sounds to detect (your putter){'\n'}
            • <Text style={styles.bold}>Ignore profiles</Text> - Sounds to filter out (metronome){'\n'}
            • <Text style={styles.bold}>Test Mode</Text> - See real-time matching scores{'\n'}
            • Toggle profiles on/off as needed
          </Text>
        </View>
      </ScrollView>

      {/* Onboarding Modal */}
      <Modal
        visible={showOnboarding}
        animationType="slide"
        presentationStyle="fullScreen"
      >
        <PutterOnboardingScreen
          onComplete={handleOnboardingComplete}
          onCancel={() => setShowOnboarding(false)}
        />
      </Modal>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  statsCard: {
    backgroundColor: 'white',
    margin: 15,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  testModeCard: {
    backgroundColor: 'white',
    marginHorizontal: 15,
    marginBottom: 10,
    padding: 15,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  testModeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  testModeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  testModeDesc: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 15,
    marginBottom: 15,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#2E7D32',
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#FF9800',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  profilesSection: {
    paddingHorizontal: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  profileGroup: {
    marginBottom: 20,
  },
  groupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
    marginLeft: 5,
  },
  profileCard: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  profileType: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  profileThreshold: {
    fontSize: 11,
    color: '#999',
    marginTop: 2,
  },
  profileActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deleteButton: {
    padding: 5,
  },
  deleteButtonText: {
    fontSize: 20,
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  instructionsCard: {
    backgroundColor: '#E8F5E9',
    marginHorizontal: 15,
    marginTop: 20,
    padding: 15,
    borderRadius: 10,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    color: '#2E7D32',
  },
  instructionsText: {
    fontSize: 12,
    color: '#555',
    lineHeight: 18,
  },
  bold: {
    fontWeight: '600',
  },
});