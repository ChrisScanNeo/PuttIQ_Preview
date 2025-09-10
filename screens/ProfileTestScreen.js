import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert
} from 'react-native';
import { profileManager } from '../services/profiles/ProfileManager';
import { DetectorFactory } from '../services/dsp/DetectorFactory';
import { spectralAnalysis } from '../services/dsp/SpectralAnalysis';

export default function ProfileTestScreen({ navigation }) {
  const [isListening, setIsListening] = useState(false);
  const [detections, setDetections] = useState([]);
  const [profiles, setProfiles] = useState({ target: [], ignore: [] });
  const detectorRef = useRef(null);
  
  useEffect(() => {
    loadProfiles();
    return () => {
      stopListening();
    };
  }, []);
  
  const loadProfiles = () => {
    const enabled = profileManager.getEnabledProfiles();
    setProfiles(enabled);
    console.log('Loaded profiles for testing:', {
      targets: enabled.target.map(p => p.name),
      ignores: enabled.ignore.map(p => p.name)
    });
  };
  
  const startListening = async () => {
    try {
      console.log('Starting profile-based detection test...');
      setDetections([]);
      
      const detector = await DetectorFactory.createDetector({
        sampleRate: 16000,
        frameLength: 256,
        energyThresh: 2,  // Normal sensitivity
        zcrThresh: 0.15,
        refractoryMs: 500,
        onStrike: (strike) => {
          console.log('Strike detected, checking against profiles...');
          handleDetection(strike);
        },
        onFrame: (frame) => {
          // Could analyze frames here if needed
        }
      });
      
      detectorRef.current = detector;
      await detector.start();
      setIsListening(true);
      
    } catch (error) {
      console.error('Failed to start detector:', error);
      Alert.alert('Error', 'Failed to start detection. Using simulation mode.');
      simulateDetections();
    }
  };
  
  const handleDetection = (strike) => {
    // In real implementation, we'd extract spectrum from the audio
    // For now, simulate with random spectrum
    const testSpectrum = new Float32Array(128);
    for (let i = 0; i < 128; i++) {
      testSpectrum[i] = Math.random();
    }
    
    // Check against profiles
    const result = profileManager.checkSpectrum(testSpectrum);
    
    const detection = {
      timestamp: Date.now(),
      energy: strike.energy,
      result: result,
      type: result.type,
      profile: result.profile || 'Unknown',
      similarity: result.similarity || 0
    };
    
    console.log('Profile check result:', result);
    
    setDetections(prev => [...prev, detection].slice(-10)); // Keep last 10
  };
  
  const simulateDetections = () => {
    setIsListening(true);
    
    // Simulate some detections
    const interval = setInterval(() => {
      if (Math.random() > 0.3) {
        const simulatedStrike = {
          energy: Math.random() * 0.01,
          timestamp: Date.now()
        };
        handleDetection(simulatedStrike);
      }
    }, 2000);
    
    setTimeout(() => {
      clearInterval(interval);
      setIsListening(false);
    }, 20000); // Stop after 20 seconds
  };
  
  const stopListening = async () => {
    if (detectorRef.current) {
      await detectorRef.current.stop();
      detectorRef.current = null;
    }
    setIsListening(false);
  };
  
  const getDetectionColor = (type) => {
    switch (type) {
      case 'target': return '#4CAF50';  // Green for target (putt detected)
      case 'ignore': return '#FF9800';   // Orange for ignored (filtered)
      case 'no_match': return '#9E9E9E'; // Gray for no match
      case 'pass': return '#2196F3';     // Blue for pass-through
      default: return '#666';
    }
  };
  
  const getDetectionIcon = (type) => {
    switch (type) {
      case 'target': return '🎯';
      case 'ignore': return '🔇';
      case 'no_match': return '❌';
      case 'pass': return '✅';
      default: return '❓';
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Profile Detection Test</Text>
        
        <View style={styles.profileInfo}>
          <Text style={styles.sectionTitle}>Active Profiles:</Text>
          <View style={styles.profileList}>
            <Text style={styles.profileCategory}>
              🎯 Targets ({profiles.target.length}):
            </Text>
            {profiles.target.map((p, i) => (
              <Text key={i} style={styles.profileItem}>
                • {p.name} (threshold: {(p.threshold * 100).toFixed(0)}%)
              </Text>
            ))}
            
            <Text style={[styles.profileCategory, { marginTop: 10 }]}>
              🔇 Ignores ({profiles.ignore.length}):
            </Text>
            {profiles.ignore.map((p, i) => (
              <Text key={i} style={styles.profileItem}>
                • {p.name} (threshold: {(p.threshold * 100).toFixed(0)}%)
              </Text>
            ))}
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.button, isListening && styles.buttonActive]}
          onPress={isListening ? stopListening : startListening}
        >
          <Text style={styles.buttonText}>
            {isListening ? 'Stop Testing' : 'Start Testing'}
          </Text>
        </TouchableOpacity>
        
        {isListening && (
          <Text style={styles.listeningText}>
            🎤 Listening for sounds...
          </Text>
        )}
        
        <View style={styles.detections}>
          <Text style={styles.sectionTitle}>Recent Detections:</Text>
          {detections.length === 0 ? (
            <Text style={styles.noDetections}>No detections yet</Text>
          ) : (
            detections.map((d, i) => (
              <View 
                key={i} 
                style={[
                  styles.detectionCard,
                  { borderLeftColor: getDetectionColor(d.type) }
                ]}
              >
                <Text style={styles.detectionIcon}>
                  {getDetectionIcon(d.type)}
                </Text>
                <View style={styles.detectionInfo}>
                  <Text style={styles.detectionType}>
                    {d.type.toUpperCase()}
                  </Text>
                  <Text style={styles.detectionProfile}>
                    {d.profile}
                  </Text>
                  {d.similarity > 0 && (
                    <Text style={styles.detectionSimilarity}>
                      Similarity: {(d.similarity * 100).toFixed(1)}%
                    </Text>
                  )}
                </View>
                <Text style={styles.detectionTime}>
                  {new Date(d.timestamp).toLocaleTimeString()}
                </Text>
              </View>
            ))
          )}
        </View>
        
        <View style={styles.legend}>
          <Text style={styles.legendTitle}>Legend:</Text>
          <Text style={styles.legendItem}>🎯 Target - Putt detected!</Text>
          <Text style={styles.legendItem}>🔇 Ignore - Sound filtered out</Text>
          <Text style={styles.legendItem}>❌ No Match - Unknown sound</Text>
          <Text style={styles.legendItem}>✅ Pass - No profiles configured</Text>
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
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  profileInfo: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  profileList: {
    marginLeft: 10,
  },
  profileCategory: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 5,
  },
  profileItem: {
    fontSize: 14,
    color: '#666',
    marginLeft: 15,
    marginBottom: 3,
  },
  button: {
    backgroundColor: '#4CAF50',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonActive: {
    backgroundColor: '#f44336',
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  listeningText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#4CAF50',
    marginBottom: 20,
  },
  detections: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    minHeight: 200,
  },
  noDetections: {
    textAlign: 'center',
    color: '#999',
    marginTop: 20,
  },
  detectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderLeftWidth: 4,
    backgroundColor: '#fafafa',
    marginBottom: 8,
    borderRadius: 5,
  },
  detectionIcon: {
    fontSize: 24,
    marginRight: 10,
  },
  detectionInfo: {
    flex: 1,
  },
  detectionType: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  detectionProfile: {
    fontSize: 12,
    color: '#666',
  },
  detectionSimilarity: {
    fontSize: 11,
    color: '#999',
  },
  detectionTime: {
    fontSize: 11,
    color: '#999',
  },
  legend: {
    backgroundColor: '#E8F5E9',
    padding: 15,
    borderRadius: 10,
  },
  legendTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  legendItem: {
    fontSize: 12,
    marginBottom: 4,
  },
});