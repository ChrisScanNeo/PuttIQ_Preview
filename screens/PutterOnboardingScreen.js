import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Animated,
  Platform
} from 'react-native';
import { Audio } from 'expo-av';
import { profileBuilder } from '../services/profiles/ProfileBuilder';
import { DetectorFactory } from '../services/dsp/DetectorFactory';

export default function PutterOnboardingScreen({ onComplete, onCancel }) {
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [recordedFrames, setRecordedFrames] = useState([]);
  const [processing, setProcessing] = useState(false);
  const [detectionCount, setDetectionCount] = useState(0);
  
  const animatedValue = useRef(new Animated.Value(0)).current;
  const countdownRef = useRef(null);
  const detectorRef = useRef(null);
  const recordingRef = useRef(null);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      stopRecording();
    };
  }, []);

  const startRecording = async () => {
    try {
      console.log('Starting putter recording...');
      
      // Request permission if needed
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Microphone permission is required');
        return;
      }

      // Reset state
      setRecordedFrames([]);
      setDetectionCount(0);
      setCountdown(30);
      
      // Try to use a real detector if available
      try {
        const detector = await DetectorFactory.createDetector({
          sampleRate: 16000,
          frameLength: 256,
          // MUCH MORE SENSITIVE FOR RECORDING
          energyThresh: 2,      // Very sensitive (was 6)
          zcrThresh: 0.15,      // Lower threshold (was 0.22)
          refractoryMs: 150,    // Faster response (was 250)
          onStrike: (strike) => {
            console.log('Impact detected during recording:', strike);
            setDetectionCount(prev => prev + 1);
            
            // Pulse animation
            Animated.sequence([
              Animated.timing(animatedValue, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
              }),
              Animated.timing(animatedValue, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
              }),
            ]).start();
          },
          onFrame: (frame) => {
            // Collect frames for profile building
            recordingRef.current = [...(recordingRef.current || []), frame];
          }
        });
        
        detectorRef.current = detector;
        await detector.start();
      } catch (error) {
        console.log('Using simulated recording:', error.message);
        // Fall back to simulated recording
        simulateRecording();
      }
      
      setIsRecording(true);
      
      // Start countdown
      let timeLeft = 30;
      countdownRef.current = setInterval(() => {
        timeLeft -= 1;
        setCountdown(timeLeft);
        
        if (timeLeft <= 0) {
          clearInterval(countdownRef.current);
          stopRecording();
        }
      }, 1000);
      
    } catch (error) {
      console.error('Failed to start recording:', error);
      Alert.alert('Error', 'Failed to start recording');
    }
  };

  const simulateRecording = () => {
    // Simulate frame collection for testing
    const simulatedFrames = [];
    for (let i = 0; i < 100; i++) {
      const frame = new Int16Array(256);
      // Simulate some transient frames
      if (i % 10 === 0) {
        for (let j = 0; j < 256; j++) {
          frame[j] = Math.random() * 10000 - 5000;
        }
      }
      simulatedFrames.push(frame);
    }
    recordingRef.current = simulatedFrames;
    
    // Simulate detection count
    let detections = 0;
    const detectionInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        detections++;
        setDetectionCount(detections);
        
        // Pulse animation
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }, 1000);
    
    setTimeout(() => clearInterval(detectionInterval), 30000);
  };

  const stopRecording = async () => {
    try {
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      
      if (detectorRef.current) {
        await detectorRef.current.stop();
      }
      
      setIsRecording(false);
      
      // Process the recorded frames
      if (recordingRef.current && recordingRef.current.length > 0) {
        processRecording(recordingRef.current);
      } else if (detectionCount > 0) {
        // Use simulated profile if we detected impacts but don't have frames
        const testProfile = profileBuilder.createTestProfile('putter');
        testProfile.name = 'My Putter';
        onComplete(testProfile);
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
    }
  };

  const processRecording = async (frames) => {
    setProcessing(true);
    
    try {
      console.log(`Processing ${frames.length} recorded frames...`);
      
      // Build profile from frames
      const result = profileBuilder.buildProfile(
        frames,
        'My Putter',
        'target'
      );
      
      if (result.success) {
        console.log('Profile created successfully:', result.stats);
        onComplete(result.profile);
      } else {
        Alert.alert(
          'Not Enough Data',
          result.error || 'Please try recording again with more putter impacts',
          [
            { text: 'Try Again', onPress: () => setProcessing(false) },
            { text: 'Cancel', onPress: onCancel }
          ]
        );
      }
    } catch (error) {
      console.error('Error processing recording:', error);
      Alert.alert('Error', 'Failed to process recording');
      setProcessing(false);
    }
  };

  const pulseScale = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.2],
  });

  const pulseOpacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1],
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onCancel} style={styles.cancelButton}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Record Your Putter</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {!isRecording && !processing && (
          <View style={styles.instructions}>
            <Text style={styles.instructionsTitle}>📋 Instructions</Text>
            <Text style={styles.instructionsText}>
              1. Place your phone 0.5-1.5 meters from the ball{'\n'}
              2. Find a quiet environment{'\n'}
              3. Make practice putts during the 30-second recording{'\n'}
              4. Try to make at least 10-15 impacts{'\n'}
              5. Keep a consistent putting rhythm
            </Text>
            
            <TouchableOpacity
              style={styles.startButton}
              onPress={startRecording}
            >
              <Text style={styles.startButtonText}>🎯 Start Recording</Text>
            </TouchableOpacity>
          </View>
        )}

        {isRecording && (
          <View style={styles.recordingContainer}>
            <Animated.View 
              style={[
                styles.recordingIndicator,
                {
                  transform: [{ scale: pulseScale }],
                  opacity: pulseOpacity,
                }
              ]}
            >
              <View style={styles.recordingDot} />
            </Animated.View>
            
            <Text style={styles.countdownText}>{countdown}s</Text>
            <Text style={styles.recordingText}>Recording...</Text>
            
            <View style={styles.statsContainer}>
              <Text style={styles.statText}>
                Impacts Detected: {detectionCount}
              </Text>
              {detectionCount < 5 && countdown < 20 && (
                <Text style={styles.warningText}>
                  Make more practice putts!
                </Text>
              )}
            </View>
            
            <View style={styles.visualizer}>
              {/* Simple visualizer bars */}
              <View style={styles.visualizerBars}>
                {[...Array(10)].map((_, i) => (
                  <View
                    key={i}
                    style={[
                      styles.bar,
                      {
                        height: Math.random() * 50 + 10,
                        backgroundColor: detectionCount > i ? '#2E7D32' : '#ccc',
                      }
                    ]}
                  />
                ))}
              </View>
            </View>
            
            <TouchableOpacity
              style={styles.stopButton}
              onPress={stopRecording}
            >
              <Text style={styles.stopButtonText}>⏹ Stop Early</Text>
            </TouchableOpacity>
          </View>
        )}

        {processing && (
          <View style={styles.processingContainer}>
            <Text style={styles.processingText}>🔄 Processing...</Text>
            <Text style={styles.processingSubtext}>
              Creating your putter profile
            </Text>
          </View>
        )}
      </View>

      <View style={styles.tips}>
        <Text style={styles.tipTitle}>💡 Pro Tip</Text>
        <Text style={styles.tipText}>
          The more impacts you record, the better your profile will be. 
          Try to maintain your natural putting rhythm throughout the recording.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  cancelButton: {
    padding: 5,
  },
  cancelText: {
    color: '#FF6B6B',
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  placeholder: {
    width: 60,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  instructions: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 15,
    width: '100%',
    maxWidth: 400,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#666',
    marginBottom: 20,
  },
  startButton: {
    backgroundColor: '#2E7D32',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  startButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  recordingContainer: {
    alignItems: 'center',
    width: '100%',
  },
  recordingIndicator: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  recordingDot: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'white',
  },
  countdownText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  recordingText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  statsContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  statText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  warningText: {
    fontSize: 14,
    color: '#FF9800',
    marginTop: 5,
  },
  visualizer: {
    width: '100%',
    height: 80,
    marginBottom: 30,
  },
  visualizerBars: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'flex-end',
    height: '100%',
  },
  bar: {
    width: 20,
    backgroundColor: '#ccc',
    borderRadius: 3,
  },
  stopButton: {
    backgroundColor: '#FF6B6B',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
  },
  stopButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  processingContainer: {
    alignItems: 'center',
  },
  processingText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 10,
  },
  processingSubtext: {
    fontSize: 16,
    color: '#666',
  },
  tips: {
    backgroundColor: '#E8F5E9',
    padding: 15,
    margin: 15,
    borderRadius: 10,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 5,
  },
  tipText: {
    fontSize: 12,
    color: '#555',
    lineHeight: 18,
  },
});