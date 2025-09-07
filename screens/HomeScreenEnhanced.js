import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useEnhancedMetronome } from '../hooks/useEnhancedMetronome';
import { auth } from '../services/auth';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Timing bar component with animated marker
const TimingBar = ({ progress, isPlaying }) => {
  const markerPosition = progress * (screenWidth * 0.7); // 70% of screen width for bar
  
  return (
    <View style={styles.timingContainer}>
      <View style={styles.timingBar}>
        {/* Left endpoint */}
        <View style={[styles.endpoint, styles.leftEndpoint]} />
        
        {/* Track */}
        <View style={styles.track} />
        
        {/* Right endpoint */}
        <View style={[styles.endpoint, styles.rightEndpoint]} />
        
        {/* Moving marker */}
        {isPlaying && (
          <View 
            style={[
              styles.marker,
              { 
                left: markerPosition,
                backgroundColor: '#FF6B6B'
              }
            ]} 
          />
        )}
      </View>
    </View>
  );
};

// Hit accuracy display component
const AccuracyDisplay = ({ hitAccuracy, averageAccuracy, timingFeedback }) => {
  if (!hitAccuracy) return null;
  
  return (
    <View style={styles.accuracyContainer}>
      <Text style={styles.accuracyTitle}>Hit Accuracy</Text>
      <Text style={styles.accuracyValue}>{hitAccuracy.toFixed(1)}%</Text>
      <Text style={styles.feedbackText}>{timingFeedback}</Text>
      {averageAccuracy && (
        <Text style={styles.averageText}>
          Average: {averageAccuracy.toFixed(1)}%
        </Text>
      )}
    </View>
  );
};

export default function HomeScreenEnhanced() {
  const [user, setUser] = useState(null);
  const [animatedProgress, setAnimatedProgress] = useState(0);
  
  const {
    bpm,
    isPlaying,
    currentBeat,
    hitDetectionEnabled,
    hitAccuracy,
    setBpm,
    toggleMetronome,
    toggleHitDetection,
    getProgress,
    getAverageAccuracy,
    getTimingFeedback,
  } = useEnhancedMetronome(80);

  // Initialize user
  useEffect(() => {
    const initUser = async () => {
      const currentUser = await auth.getCurrentUser();
      setUser(currentUser);
    };
    initUser();
  }, []);

  // Update animated progress
  useEffect(() => {
    let animationFrame;
    
    const updateProgress = () => {
      if (isPlaying) {
        setAnimatedProgress(getProgress());
        animationFrame = requestAnimationFrame(updateProgress);
      }
    };
    
    if (isPlaying) {
      updateProgress();
    } else {
      setAnimatedProgress(0);
    }
    
    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [isPlaying, getProgress]);

  // Handle hit detection toggle with permission check
  const handleHitDetectionToggle = async () => {
    if (!hitDetectionEnabled) {
      Alert.alert(
        'Enable Hit Detection',
        'This will use your microphone to detect when you hit the ball. The app will play metronome sounds through your speaker while listening.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Enable', onPress: toggleHitDetection }
        ]
      );
    } else {
      toggleHitDetection();
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>PuttIQ</Text>
        <Text style={styles.subtitle}>Perfect Your Putting Rhythm</Text>
        {user && <Text style={styles.userInfo}>Device ID: {user.uid.slice(-8)}</Text>}
      </View>

      {/* Timing Bar */}
      <TimingBar progress={animatedProgress} isPlaying={isPlaying} />

      {/* Beat Indicators */}
      <View style={styles.beatIndicators}>
        {[0, 1, 2, 3].map((beat) => (
          <View
            key={beat}
            style={[
              styles.beatDot,
              currentBeat === beat && isPlaying && styles.activeBeat,
            ]}
          />
        ))}
      </View>

      {/* BPM Control */}
      <View style={styles.bpmContainer}>
        <Text style={styles.bpmLabel}>Tempo: {bpm} BPM</Text>
        <Slider
          style={styles.slider}
          minimumValue={60}
          maximumValue={100}
          value={bpm}
          onValueChange={setBpm}
          step={1}
          minimumTrackTintColor="#4ECDC4"
          maximumTrackTintColor="#95E1D3"
          thumbTintColor="#4ECDC4"
          disabled={isPlaying}
        />
        <View style={styles.bpmRange}>
          <Text style={styles.bpmRangeText}>60</Text>
          <Text style={styles.bpmRangeText}>100</Text>
        </View>
      </View>

      {/* Hit Detection Toggle */}
      <View style={styles.hitDetectionContainer}>
        <Text style={styles.hitDetectionLabel}>Hit Detection</Text>
        <Switch
          value={hitDetectionEnabled}
          onValueChange={handleHitDetectionToggle}
          trackColor={{ false: '#767577', true: '#4ECDC4' }}
          thumbColor={hitDetectionEnabled ? '#fff' : '#f4f3f4'}
          ios_backgroundColor="#3e3e3e"
        />
      </View>

      {/* Accuracy Display */}
      {hitDetectionEnabled && (
        <AccuracyDisplay
          hitAccuracy={hitAccuracy}
          averageAccuracy={getAverageAccuracy()}
          timingFeedback={getTimingFeedback()}
        />
      )}

      {/* Control Buttons */}
      <TouchableOpacity
        style={[styles.button, isPlaying && styles.buttonStop]}
        onPress={toggleMetronome}
      >
        <Text style={styles.buttonText}>
          {isPlaying ? 'STOP' : 'START'}
        </Text>
      </TouchableOpacity>

      {/* Info Text */}
      <View style={styles.infoContainer}>
        <Text style={styles.infoText}>
          {hitDetectionEnabled 
            ? '🎤 Microphone active - Make your putting stroke when you hear the beat'
            : '🔊 Press START to begin the metronome'}
        </Text>
        {hitDetectionEnabled && (
          <Text style={styles.warningText}>
            Note: Hit detection requires a custom dev build. It won't work in Expo Go.
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7FFF7',
  },
  contentContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    minHeight: screenHeight,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#2D3436',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 16,
    color: '#636E72',
    marginTop: 5,
  },
  userInfo: {
    fontSize: 12,
    color: '#B2BEC3',
    marginTop: 5,
  },
  timingContainer: {
    width: screenWidth * 0.8,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
  },
  timingBar: {
    width: screenWidth * 0.7,
    height: 4,
    backgroundColor: '#DFE6E9',
    position: 'relative',
    borderRadius: 2,
  },
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#DFE6E9',
    borderRadius: 2,
  },
  endpoint: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4ECDC4',
    top: -4,
  },
  leftEndpoint: {
    left: -6,
  },
  rightEndpoint: {
    right: -6,
  },
  marker: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FF6B6B',
    top: -8,
  },
  beatIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginVertical: 15,
  },
  beatDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#DFE6E9',
    marginHorizontal: 8,
  },
  activeBeat: {
    backgroundColor: '#4ECDC4',
    transform: [{ scale: 1.3 }],
  },
  bpmContainer: {
    width: screenWidth * 0.8,
    marginVertical: 20,
  },
  bpmLabel: {
    fontSize: 20,
    fontWeight: '600',
    color: '#2D3436',
    textAlign: 'center',
    marginBottom: 10,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  bpmRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
  },
  bpmRangeText: {
    color: '#636E72',
    fontSize: 12,
  },
  hitDetectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: screenWidth * 0.6,
    marginVertical: 15,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  hitDetectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3436',
  },
  accuracyContainer: {
    alignItems: 'center',
    marginVertical: 20,
    padding: 15,
    backgroundColor: '#fff',
    borderRadius: 10,
    width: screenWidth * 0.7,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  accuracyTitle: {
    fontSize: 14,
    color: '#636E72',
    marginBottom: 5,
  },
  accuracyValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4ECDC4',
    marginBottom: 5,
  },
  feedbackText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3436',
    marginBottom: 5,
  },
  averageText: {
    fontSize: 14,
    color: '#636E72',
    marginTop: 5,
  },
  button: {
    backgroundColor: '#4ECDC4',
    paddingHorizontal: 60,
    paddingVertical: 18,
    borderRadius: 30,
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  buttonStop: {
    backgroundColor: '#FF6B6B',
  },
  buttonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  infoContainer: {
    paddingHorizontal: 30,
    marginTop: 10,
    alignItems: 'center',
  },
  infoText: {
    fontSize: 14,
    color: '#636E72',
    textAlign: 'center',
    lineHeight: 20,
  },
  warningText: {
    fontSize: 12,
    color: '#FF6B6B',
    textAlign: 'center',
    marginTop: 10,
    fontStyle: 'italic',
  },
});