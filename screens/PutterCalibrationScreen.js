import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Animated,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { Audio } from 'expo-av';
import { DetectorFactory } from '../services/dsp/DetectorFactory';
import { profileBuilder } from '../services/profiles/ProfileBuilder';
import { profileManager } from '../services/profiles/ProfileManager';
import { spectralAnalysis } from '../services/dsp/SpectralAnalysis';

const { width: screenWidth } = Dimensions.get('window');

export default function PutterCalibrationScreen({ navigation, route }) {
  const { onComplete } = route.params || {};
  
  // State
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [puttCount, setPuttCount] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [calibrationData, setCalibrationData] = useState([]);
  const [currentInstruction, setCurrentInstruction] = useState('');
  const [confidenceScore, setConfidenceScore] = useState(0);
  
  // Refs
  const detectorRef = useRef(null);
  const animatedScale = useRef(new Animated.Value(1)).current;
  const animatedOpacity = useRef(new Animated.Value(1)).current;
  const impactBufferRef = useRef([]);
  const listeningTimeoutRef = useRef(null);
  
  // Constants
  const TOTAL_PUTTS = 10;
  const LISTENING_WINDOW = 5000; // 5 seconds to detect each putt
  const PRE_IMPACT_SAMPLES = 512;  // Capture before impact
  const POST_IMPACT_SAMPLES = 512; // Capture after impact
  
  useEffect(() => {
    return () => {
      // Cleanup
      if (detectorRef.current) {
        detectorRef.current.stop();
      }
      if (listeningTimeoutRef.current) {
        clearTimeout(listeningTimeoutRef.current);
      }
    };
  }, []);
  
  const startCalibration = async () => {
    try {
      // Request permission
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Microphone access is needed for calibration');
        return;
      }
      
      // Reset state
      setPuttCount(0);
      setCalibrationData([]);
      impactBufferRef.current = [];
      setIsCalibrating(true);
      
      // Initialize detector with very sensitive settings
      const detector = await DetectorFactory.createDetector({
        sampleRate: 16000,
        frameLength: 256,
        energyThresh: 1.5,     // Ultra-sensitive for calibration
        zcrThresh: 0.12,       // Lower threshold
        refractoryMs: 500,     // Longer refractory to avoid double-counts
        bufferSize: PRE_IMPACT_SAMPLES + POST_IMPACT_SAMPLES,
        onStrike: handlePuttDetected,
        onFrame: handleAudioFrame
      });
      
      detectorRef.current = detector;
      await detector.start();
      
      // Start first putt listening
      startListeningForPutt();
      
    } catch (error) {
      console.error('Failed to start calibration:', error);
      Alert.alert('Error', 'Failed to start calibration. Please try again.');
      setIsCalibrating(false);
    }
  };
  
  const handleAudioFrame = (frame) => {
    // Keep a rolling buffer of recent frames
    if (!impactBufferRef.current) {
      impactBufferRef.current = [];
    }
    
    impactBufferRef.current.push(frame);
    
    // Keep only the last PRE_IMPACT_SAMPLES frames
    if (impactBufferRef.current.length > PRE_IMPACT_SAMPLES / 256) {
      impactBufferRef.current.shift();
    }
  };
  
  const handlePuttDetected = async (strike) => {
    if (!isListening) return;
    
    console.log('Putt detected:', strike);
    
    // Stop listening
    setIsListening(false);
    if (listeningTimeoutRef.current) {
      clearTimeout(listeningTimeoutRef.current);
    }
    
    // Visual feedback
    Animated.sequence([
      Animated.parallel([
        Animated.timing(animatedScale, {
          toValue: 1.3,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(animatedOpacity, {
          toValue: 0.3,
          duration: 200,
          useNativeDriver: true,
        })
      ]),
      Animated.parallel([
        Animated.timing(animatedScale, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(animatedOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      ])
    ]).start();
    
    // Capture impact data
    const impactData = {
      timestamp: strike.timestamp,
      energy: strike.energy,
      frames: [...impactBufferRef.current], // Snapshot of buffer
      confidence: strike.confidence || 0.8,
      spectralFeatures: null // Will be computed later
    };
    
    // Compute spectral features
    if (impactBufferRef.current.length > 0) {
      try {
        // Concatenate frames into single array
        const concatenated = new Float32Array(impactBufferRef.current.length * 256);
        let offset = 0;
        for (const frame of impactBufferRef.current) {
          concatenated.set(frame, offset);
          offset += frame.length;
        }
        
        // Compute spectral template
        const spectrum = spectralAnalysis.computeSpectrum(concatenated);
        impactData.spectralFeatures = spectrum;
      } catch (error) {
        console.error('Failed to compute spectrum:', error);
      }
    }
    
    // Store calibration data
    const newCalibrationData = [...calibrationData, impactData];
    setCalibrationData(newCalibrationData);
    
    // Update count
    const newCount = puttCount + 1;
    setPuttCount(newCount);
    
    // Calculate confidence
    updateConfidenceScore(newCalibrationData);
    
    // Check if done
    if (newCount >= TOTAL_PUTTS) {
      await completeCalibration(newCalibrationData);
    } else {
      // Wait a moment then listen for next putt
      setTimeout(() => {
        startListeningForPutt();
      }, 1500);
    }
  };
  
  const startListeningForPutt = () => {
    setIsListening(true);
    setCurrentInstruction(`Make putt ${puttCount + 1} of ${TOTAL_PUTTS}`);
    
    // Set timeout for this putt
    listeningTimeoutRef.current = setTimeout(() => {
      if (isListening) {
        setIsListening(false);
        Alert.alert(
          'No Putt Detected',
          'Please try again with a firmer strike.',
          [
            { text: 'Retry', onPress: startListeningForPutt },
            { text: 'Cancel', onPress: cancelCalibration, style: 'cancel' }
          ]
        );
      }
    }, LISTENING_WINDOW);
  };
  
  const updateConfidenceScore = (data) => {
    if (data.length < 2) {
      setConfidenceScore(0);
      return;
    }
    
    // Calculate consistency between samples
    let totalSimilarity = 0;
    let comparisons = 0;
    
    for (let i = 0; i < data.length - 1; i++) {
      for (let j = i + 1; j < data.length; j++) {
        if (data[i].spectralFeatures && data[j].spectralFeatures) {
          const similarity = spectralAnalysis.cosineSimilarity(
            data[i].spectralFeatures,
            data[j].spectralFeatures
          );
          totalSimilarity += similarity;
          comparisons++;
        }
      }
    }
    
    const avgSimilarity = comparisons > 0 ? totalSimilarity / comparisons : 0;
    setConfidenceScore(Math.round(avgSimilarity * 100));
  };
  
  const completeCalibration = async (data) => {
    setProcessing(true);
    setCurrentInstruction('Processing your putter profile...');
    
    try {
      // Build profile from calibration data
      const profile = await profileBuilder.buildFromCalibration({
        impacts: data,
        name: 'My Putter (Calibrated)',
        kind: 'target',
        threshold: 0.75,
        metadata: {
          calibrationPutts: TOTAL_PUTTS,
          confidenceScore: confidenceScore / 100,
          createdAt: Date.now()
        }
      });
      
      // Save profile
      await profileManager.addProfile(profile);
      
      // Success feedback
      Alert.alert(
        'Calibration Complete!',
        `Your putter profile has been created with ${confidenceScore}% consistency.\n\nThe app will now better detect your putts and filter out noise.`,
        [
          {
            text: 'Done',
            onPress: () => {
              if (onComplete) onComplete(profile);
              navigation.goBack();
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('Failed to complete calibration:', error);
      Alert.alert('Error', 'Failed to save calibration. Please try again.');
    } finally {
      setProcessing(false);
      setIsCalibrating(false);
      if (detectorRef.current) {
        detectorRef.current.stop();
      }
    }
  };
  
  const cancelCalibration = () => {
    Alert.alert(
      'Cancel Calibration?',
      'Your progress will be lost.',
      [
        { text: 'Continue', style: 'cancel' },
        {
          text: 'Cancel',
          style: 'destructive',
          onPress: () => {
            setIsCalibrating(false);
            if (detectorRef.current) {
              detectorRef.current.stop();
            }
            navigation.goBack();
          }
        }
      ]
    );
  };
  
  const renderProgress = () => {
    const progress = puttCount / TOTAL_PUTTS;
    
    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { width: `${progress * 100}%` }
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {puttCount} / {TOTAL_PUTTS} putts recorded
        </Text>
      </View>
    );
  };
  
  const renderDetectionIndicator = () => {
    return (
      <Animated.View
        style={[
          styles.detectionIndicator,
          {
            transform: [{ scale: animatedScale }],
            opacity: animatedOpacity
          }
        ]}
      >
        <View style={[
          styles.detectionCircle,
          isListening && styles.detectionCircleActive
        ]}>
          {isListening ? (
            <Text style={styles.listeningText}>LISTENING</Text>
          ) : (
            <Text style={styles.readyText}>READY</Text>
          )}
        </View>
      </Animated.View>
    );
  };
  
  if (!isCalibrating) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.title}>Putter Calibration</Text>
          <Text style={styles.description}>
            This calibration will record 10 putts to create a unique sound profile for your putter.
            {'\n\n'}
            This helps the app accurately detect your putts while filtering out background noise.
          </Text>
          
          <View style={styles.instructions}>
            <Text style={styles.instructionTitle}>Instructions:</Text>
            <Text style={styles.instructionText}>
              1. Place your device 1-3 feet from the ball{'\n'}
              2. Use your normal putting stroke{'\n'}
              3. Make 10 putts when prompted{'\n'}
              4. Wait for confirmation after each putt
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.startButton}
            onPress={startCalibration}
          >
            <Text style={styles.startButtonText}>Start Calibration</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Recording Putter Profile</Text>
        
        {renderProgress()}
        
        {renderDetectionIndicator()}
        
        <Text style={styles.instruction}>{currentInstruction}</Text>
        
        {confidenceScore > 0 && (
          <Text style={styles.confidence}>
            Profile Consistency: {confidenceScore}%
          </Text>
        )}
        
        {processing && (
          <ActivityIndicator size="large" color="#4CAF50" style={styles.loader} />
        )}
        
        {!processing && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={cancelCalibration}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  instructions: {
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    padding: 20,
    marginBottom: 30,
    width: '100%',
    maxWidth: 400,
  },
  instructionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 10,
  },
  instructionText: {
    fontSize: 14,
    color: '#ccc',
    lineHeight: 22,
  },
  progressContainer: {
    width: '100%',
    maxWidth: 400,
    marginBottom: 40,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#333',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressText: {
    color: '#ccc',
    fontSize: 14,
    textAlign: 'center',
  },
  detectionIndicator: {
    marginBottom: 40,
  },
  detectionCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#555',
  },
  detectionCircleActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#1a3a1a',
  },
  listeningText: {
    color: '#4CAF50',
    fontSize: 18,
    fontWeight: 'bold',
  },
  readyText: {
    color: '#888',
    fontSize: 18,
  },
  instruction: {
    fontSize: 20,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  confidence: {
    fontSize: 16,
    color: '#4CAF50',
    marginBottom: 20,
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 20,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  cancelButton: {
    paddingHorizontal: 30,
    paddingVertical: 10,
  },
  cancelButtonText: {
    color: '#888',
    fontSize: 16,
  },
  loader: {
    marginTop: 20,
  },
});