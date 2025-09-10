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
  ActivityIndicator,
  Vibration
} from 'react-native';
import { Audio } from 'expo-av';
import { DetectorFactory } from '../services/dsp/DetectorFactory';
import { profileBuilder } from '../services/profiles/ProfileBuilder';
import { profileManager } from '../services/profiles/ProfileManager';
import { spectralAnalysis } from '../services/dsp/SpectralAnalysis';

const { width: screenWidth } = Dimensions.get('window');

export default function PutterCalibrationScreen({ navigation, route }) {
  console.log('🚀 PutterCalibrationScreen v2.1-ULTRA loaded! Build: 2024-12-10 15:00');
  console.log('⚡ Ultra-sensitive detection enabled with NO time limits');
  
  const { onComplete } = route.params || {};
  
  // State
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [puttCount, setPuttCount] = useState(0);
  const [isListening, setIsListening] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [calibrationData, setCalibrationData] = useState([]);
  const [currentInstruction, setCurrentInstruction] = useState('');
  const [confidenceScore, setConfidenceScore] = useState(0);
  const [isWarmingUp, setIsWarmingUp] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  
  // Refs
  const detectorRef = useRef(null);
  const animatedScale = useRef(new Animated.Value(1)).current;
  const animatedOpacity = useRef(new Animated.Value(1)).current;
  const impactBufferRef = useRef([]);
  const listeningTimeoutRef = useRef(null);
  const confirmationSoundRef = useRef(null);
  
  // Constants
  const TOTAL_PUTTS = 10;
  const VERSION = 'v2.1-ULTRA'; // Version indicator
  const BUILD_DATE = '2024-12-10 15:00'; // Build timestamp
  const PRE_IMPACT_SAMPLES = 512;  // Capture before impact
  const POST_IMPACT_SAMPLES = 512; // Capture after impact
  
  useEffect(() => {
    // Load confirmation sound
    loadConfirmationSound();
    
    return () => {
      // Cleanup
      if (detectorRef.current) {
        detectorRef.current.stop();
      }
      if (listeningTimeoutRef.current) {
        clearTimeout(listeningTimeoutRef.current);
      }
      if (confirmationSoundRef.current) {
        confirmationSoundRef.current.unloadAsync();
      }
    };
  }, []);
  
  const loadConfirmationSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../assets/sound/metronome-85688.mp3'),
        { volume: 0.8 }
      );
      confirmationSoundRef.current = sound;
    } catch (error) {
      console.log('Could not load confirmation sound:', error);
    }
  };
  
  const playConfirmationSound = async () => {
    try {
      if (confirmationSoundRef.current) {
        await confirmationSoundRef.current.replayAsync();
      }
      // Also add haptic feedback
      Vibration.vibrate(100);
    } catch (error) {
      console.log('Could not play confirmation sound:', error);
    }
  };
  
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
      setDebugInfo('Initializing detector...');
      
      try {
        // Initialize detector with EXTREMELY sensitive settings
        const detector = await DetectorFactory.createDetector({
          sampleRate: 16000,
          frameLength: 256,
          energyThresh: 0.3,     // ULTRA sensitive for calibration
          zcrThresh: 0.05,       // Very low threshold
          refractoryMs: 1000,    // 1 second to avoid ball bounce detection
          calibrationMode: true, // Enable special calibration mode
          tickGuardMs: 0,        // Disable metronome guard
          getUpcomingTicks: () => [], // No metronome ticks to check
          bufferSize: PRE_IMPACT_SAMPLES + POST_IMPACT_SAMPLES,
          onStrike: handlePuttDetected,
          onFrame: handleAudioFrame
        });
        
        detectorRef.current = detector;
        await detector.start();
        
        // Warm-up period to let baseline stabilize
        setIsWarmingUp(true);
        setCurrentInstruction('🔥 WARMING UP ULTRA-SENSITIVE DETECTOR (2 seconds)...');
        setDebugInfo(`Detector initialized with energyThresh: 0.3`);
        setTimeout(() => {
          setIsWarmingUp(false);
          setDebugInfo('✅ Ready for detection - NO TIME LIMIT!');
          startListeningForPutt();
        }, 2000);
        
      } catch (error) {
        console.log('Detector failed, using simulation:', error.message);
        setDebugInfo('Using simulated detection');
        // Fall back to simulation
        simulateCalibration();
      }
      
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
    if (!isListening || isWarmingUp) return;
    
    console.log('Putt detected:', strike);
    setDebugInfo(`Detected! Energy: ${strike.energy?.toFixed(4) || 'N/A'}`);
    
    // Stop listening
    setIsListening(false);
    if (listeningTimeoutRef.current) {
      clearTimeout(listeningTimeoutRef.current);
    }
    
    // Play confirmation sound and haptic
    await playConfirmationSound();
    
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
    setCurrentInstruction(`Ready for putt ${puttCount + 1} of ${TOTAL_PUTTS} - Take your time`);
    setDebugInfo('Listening for impact...');
    
    // No timeout - user can take as long as needed
    // Removed timeout completely for unlimited time
  };
  
  // Add simulation function for fallback
  const simulateCalibration = () => {
    console.log('Starting simulated calibration');
    setIsCalibrating(true);
    setIsWarmingUp(false);
    
    // Simulate detection every 3 seconds
    let count = 0;
    const simulationInterval = setInterval(() => {
      if (count >= TOTAL_PUTTS) {
        clearInterval(simulationInterval);
        return;
      }
      
      if (count === 0) {
        setCurrentInstruction('Simulation Mode - Tap screen to simulate putts');
      }
      
      // Auto-detect after delay
      setTimeout(() => {
        if (count < TOTAL_PUTTS) {
          const simulatedStrike = {
            timestamp: Date.now(),
            energy: 0.002 + Math.random() * 0.003,
            confidence: 0.8 + Math.random() * 0.2,
            zcr: 0.15 + Math.random() * 0.1
          };
          handlePuttDetected(simulatedStrike);
          count++;
        }
      }, 2000 + Math.random() * 1000);
    }, 4000);
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
          <View style={styles.versionBadge}>
            <Text style={styles.versionText}>VERSION: {VERSION}</Text>
            <Text style={styles.buildText}>BUILD: {BUILD_DATE}</Text>
          </View>
          <Text style={styles.title}>Putter Calibration</Text>
          <Text style={styles.description}>
            This calibration will record 10 putts to create a unique sound profile for your putter.
            {'\n\n'}
            ⚡ ULTRA-SENSITIVE MODE ENABLED ⚡
            {'\n'}
            NO TIME LIMITS - Take as long as you need!
            {'\n\n'}
            This helps the app accurately detect your putts while filtering out background noise.
          </Text>
          
          <View style={styles.instructions}>
            <Text style={styles.instructionTitle}>Instructions:</Text>
            <Text style={styles.instructionText}>
              1. Have 10 golf balls ready{'\n'}
              2. Place device 1-2 feet from the ball{'\n'}
              3. Use your normal putting stroke{'\n'}
              4. Wait for the "ding" after each putt{'\n'}
              5. Take your time - no rush!
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
        <View style={styles.versionBadge}>
          <Text style={styles.versionText}>{VERSION} - CALIBRATING</Text>
        </View>
        <Text style={styles.title}>Recording Putter Profile</Text>
        
        {renderProgress()}
        
        {renderDetectionIndicator()}
        
        <Text style={styles.instruction}>{currentInstruction}</Text>
        
        {confidenceScore > 0 && (
          <Text style={styles.confidence}>
            Profile Consistency: {confidenceScore}%
          </Text>
        )}
        
        <Text style={styles.detectionNote}>
          Detection: Ultra Sensitive Mode
        </Text>
        
        {debugInfo !== '' && (
          <Text style={styles.debugText}>
            {debugInfo}
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
  detectionNote: {
    fontSize: 12,
    color: '#888',
    marginTop: 10,
    fontStyle: 'italic',
  },
  debugText: {
    fontSize: 11,
    color: '#4CAF50',
    marginTop: 5,
    fontFamily: 'monospace',
  },
  versionBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: '#FF6B6B',
    padding: 8,
    borderRadius: 5,
    zIndex: 1000,
  },
  versionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  buildText: {
    color: 'white',
    fontSize: 10,
    marginTop: 2,
  },
});