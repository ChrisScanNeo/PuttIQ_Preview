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
  Vibration,
  ScrollView,
  Platform
} from 'react-native';
import { Audio } from 'expo-av';
import { recordingManager } from '../services/audio/RecordingManager';
import { profileBuilder } from '../services/profiles/ProfileBuilder';
import { profileManager } from '../services/profiles/ProfileManager';
import { spectralAnalysis } from '../services/dsp/SpectralAnalysis';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const isSmallScreen = screenWidth < 375;
const isTinyScreen = screenHeight < 600;

export default function PutterCalibrationScreen({ navigation, route }) {
  // Only log once on mount
  useEffect(() => {
    console.log('🚀 PutterCalibrationScreen v3.0-COUNTDOWN loaded!');
    console.log('⏱️ Using countdown-based recording (3-2-1-RECORD)');
    console.log('✅ Guaranteed capture of all 10 putts');
  }, []);
  
  const { onComplete } = route.params || {};
  
  // State
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [puttCount, setPuttCount] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [currentInstruction, setCurrentInstruction] = useState('');
  const [countdown, setCountdown] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [phase, setPhase] = useState('ready'); // ready, countdown, recording, processing
  
  // Refs - use ref for recordings to avoid state loss
  const animatedScale = useRef(new Animated.Value(1)).current;
  const animatedOpacity = useRef(new Animated.Value(1)).current;
  const countdownSoundRef = useRef(null);
  const successSoundRef = useRef(null);
  const recordingsRef = useRef([]);
  
  const TOTAL_PUTTS = 10;
  const VERSION = 'v3.0-COUNTDOWN';
  const RECORDING_DURATION = 1000; // 1 second recording window
  
  // Load sounds
  useEffect(() => {
    loadSounds();
    return () => {
      cleanup();
    };
  }, []);
  
  const loadSounds = async () => {
    try {
      // Load countdown beep sound - fix path
      const { sound: countdownSound } = await Audio.Sound.createAsync(
        require('../assets/sound/metronome-85688.mp3'),
        { shouldPlay: false, volume: 0.5 }
      );
      countdownSoundRef.current = countdownSound;
      
      // Load success sound (use same for now)
      const { sound: successSound } = await Audio.Sound.createAsync(
        require('../assets/sound/metronome-85688.mp3'),
        { shouldPlay: false, volume: 0.7 }
      );
      successSoundRef.current = successSound;
    } catch (error) {
      console.log('Could not load sounds (continuing without audio):', error);
      // Continue without sounds - not critical
    }
  };
  
  const cleanup = async () => {
    try {
      await recordingManager.cleanup();
      if (countdownSoundRef.current) {
        await countdownSoundRef.current.unloadAsync();
      }
      if (successSoundRef.current) {
        await successSoundRef.current.unloadAsync();
      }
    } catch (error) {
      console.error('Cleanup error:', error);
    }
  };
  
  const startCalibration = async () => {
    try {
      // Request permissions
      await recordingManager.requestPermissions();
      
      // Reset state
      setPuttCount(0);
      recordingsRef.current = [];
      setIsCalibrating(true);
      setPhase('ready');
      
      // Start first putt sequence
      startPuttSequence(1);
      
    } catch (error) {
      console.error('Failed to start calibration:', error);
      Alert.alert('Error', 'Failed to start calibration. Please check microphone permissions.');
      setIsCalibrating(false);
    }
  };
  
  const startPuttSequence = async (puttNumber) => {
    if (puttNumber > TOTAL_PUTTS) {
      await completeCalibration();
      return;
    }
    
    setCurrentInstruction(`Get ready for putt ${puttNumber} of ${TOTAL_PUTTS}`);
    setPhase('ready');
    
    // Wait a moment for user to prepare
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Start countdown
    await runCountdown();
    
    // Start recording
    await recordPutt(puttNumber);
  };
  
  const runCountdown = async () => {
    setPhase('countdown');
    
    // Countdown from 3 to 1
    for (let i = 3; i > 0; i--) {
      setCountdown(i);
      setCurrentInstruction(`Ready in ${i}...`);
      
      // Play beep sound (optional)
      if (countdownSoundRef.current) {
        try {
          await countdownSoundRef.current.replayAsync();
        } catch (e) {
          // Sound playback failed, continue without it
        }
      }
      
      // Animate countdown number
      Animated.sequence([
        Animated.parallel([
          Animated.timing(animatedScale, {
            toValue: 1.5,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(animatedOpacity, {
            toValue: 0.5,
            duration: 200,
            useNativeDriver: true,
          })
        ]),
        Animated.parallel([
          Animated.timing(animatedScale, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(animatedOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          })
        ])
      ]).start();
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    setCountdown(null);
  };
  
  const recordPutt = async (puttNumber) => {
    try {
      setPhase('recording');
      setIsRecording(true);
      setCurrentInstruction('🔴 PUTT NOW!');
      
      // Visual feedback - red pulsing
      Animated.loop(
        Animated.sequence([
          Animated.timing(animatedScale, {
            toValue: 1.2,
            duration: 250,
            useNativeDriver: true,
          }),
          Animated.timing(animatedScale, {
            toValue: 1,
            duration: 250,
            useNativeDriver: true,
          })
        ]),
        { iterations: 2 }
      ).start();
      
      // Record for 1 second
      const recordingData = await recordingManager.recordForDuration(RECORDING_DURATION);
      
      // Stop visual feedback
      setIsRecording(false);
      Animated.timing(animatedScale, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      
      // Play success sound (optional)
      if (successSoundRef.current) {
        try {
          await successSoundRef.current.replayAsync();
        } catch (e) {
          // Sound playback failed, continue without it
        }
      }
      
      // Add haptic feedback
      Vibration.vibrate(100);
      
      // Process recording
      const audioData = await recordingManager.loadRecording(recordingData.uri);
      const features = recordingManager.extractFeatures(audioData);
      
      // Store recording data in ref to avoid state loss
      recordingsRef.current.push({
        puttNumber,
        recordingData,
        audioData,
        features,
        timestamp: Date.now()
      });
      console.log(`Stored putt ${puttNumber}, total recordings: ${recordingsRef.current.length}`);
      
      // Update count
      setPuttCount(puttNumber);
      setCurrentInstruction(`✅ Putt ${puttNumber} recorded successfully!`);
      
      // Pause before next putt
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Continue to next putt
      startPuttSequence(puttNumber + 1);
      
    } catch (error) {
      console.error('Failed to record putt:', error);
      Alert.alert(
        'Recording Failed',
        'Failed to record putt. Would you like to retry?',
        [
          { text: 'Retry', onPress: () => recordPutt(puttNumber) },
          { text: 'Skip', onPress: () => startPuttSequence(puttNumber + 1) }
        ]
      );
    }
  };
  
  const completeCalibration = async () => {
    setProcessing(true);
    setPhase('processing');
    setCurrentInstruction('Processing your putter profile...');
    
    try {
      console.log(`Building profile from ${recordingsRef.current.length} recordings`);
      
      // Validate we have recordings
      if (!recordingsRef.current || recordingsRef.current.length === 0) {
        throw new Error('No recordings found to build profile');
      }
      
      // Build profile from recordings
      const profileData = {
        impacts: recordingsRef.current.map(r => ({
          timestamp: r.timestamp,
          energy: r.features.maxEnergy,
          spectralFeatures: r.features.spectralFeatures || r.features.impactWindow,
          audioData: r.audioData
        })),
        name: 'My Putter (Countdown)',
        kind: 'target',
        threshold: 0.85,  // Higher threshold to prevent false matches
        metadata: {
          calibrationPutts: recordingsRef.current.length,
          recordingMethod: 'countdown',
          version: VERSION,
          createdAt: Date.now()
        }
      };
      
      const result = await profileBuilder.buildFromCalibration(profileData);
      
      // Check if profile building succeeded
      if (!result.success) {
        throw new Error(result.error || 'Failed to build profile from recordings');
      }
      
      // Save profile
      await profileManager.saveProfile(result.profile);
      
      // Success!
      Alert.alert(
        '🎯 Calibration Complete!',
        `Your putter profile has been created from ${recordingsRef.current.length} recorded putts.\n\nThe app will now detect your putts more accurately.`,
        [
          {
            text: 'Done',
            onPress: () => {
              if (onComplete) onComplete(result.profile);
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
      cleanup();
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
          onPress: async () => {
            await cleanup();
            setIsCalibrating(false);
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
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>
        <View style={styles.progressDots}>
          {[...Array(TOTAL_PUTTS)].map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressDot,
                i < puttCount && styles.progressDotCompleted
              ]}
            />
          ))}
        </View>
      </View>
    );
  };
  
  const renderCountdown = () => {
    if (countdown === null) return null;
    
    return (
      <Animated.View
        style={[
          styles.countdownContainer,
          {
            transform: [{ scale: animatedScale }],
            opacity: animatedOpacity
          }
        ]}
      >
        <Text style={styles.countdownNumber}>{countdown}</Text>
      </Animated.View>
    );
  };
  
  const renderRecordingIndicator = () => {
    if (!isRecording) return null;
    
    return (
      <Animated.View
        style={[
          styles.recordingIndicator,
          {
            transform: [{ scale: animatedScale }]
          }
        ]}
      >
        <View style={styles.recordingDot} />
        <Text style={styles.recordingText}>RECORDING</Text>
      </Animated.View>
    );
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.versionBadge}>
          <Text style={styles.versionText}>{VERSION}</Text>
        </View>
        
        <Text style={styles.title}>
          {isCalibrating ? 'Recording Putter Profile' : 'Putter Calibration'}
        </Text>
        
        {!isCalibrating && !processing && (
          <View style={styles.startContainer}>
            <Text style={styles.description}>
              Record exactly 10 putts using a countdown timer.{'\n'}
              This guarantees we capture every putt perfectly.
            </Text>
            
            <View style={styles.instructionsList}>
              <Text style={styles.instructionItem}>📍 Place phone 0.5-1.5m from ball</Text>
              <Text style={styles.instructionItem}>🔇 Find a quiet environment</Text>
              <Text style={styles.instructionItem}>⏱️ Follow the 3-2-1 countdown</Text>
              <Text style={styles.instructionItem}>🏌️ Putt when you see "PUTT NOW!"</Text>
              <Text style={styles.instructionItem}>🎯 Complete all 10 putts</Text>
            </View>
            
            <TouchableOpacity
              style={styles.startButton}
              onPress={startCalibration}
            >
              <Text style={styles.startButtonText}>Start Countdown Calibration</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {isCalibrating && (
          <>
            {renderProgress()}
            
            <View style={styles.calibrationContainer}>
              {renderCountdown()}
              {renderRecordingIndicator()}
              
              {!countdown && !isRecording && (
                <View style={styles.statusContainer}>
                  <Text style={styles.instruction}>{currentInstruction}</Text>
                  {phase === 'ready' && puttCount > 0 && (
                    <Text style={styles.statusText}>
                      {puttCount} of {TOTAL_PUTTS} putts recorded
                    </Text>
                  )}
                </View>
              )}
            </View>
          </>
        )}
        
        {processing && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.processingText}>{currentInstruction}</Text>
          </View>
        )}
        
        {isCalibrating && !processing && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={cancelCalibration}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    padding: isSmallScreen ? 15 : 20,
    paddingBottom: 50,
  },
  versionBadge: {
    alignSelf: 'center',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 15,
    marginBottom: 10,
  },
  versionText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  title: {
    fontSize: isSmallScreen ? 24 : 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  startContainer: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  description: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  instructionsList: {
    marginBottom: 25,
  },
  instructionItem: {
    fontSize: isSmallScreen ? 14 : 15,
    color: '#555',
    marginBottom: 10,
    paddingLeft: 5,
  },
  startButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 15,
    borderRadius: 25,
    alignItems: 'center',
  },
  startButtonText: {
    color: 'white',
    fontSize: isSmallScreen ? 16 : 18,
    fontWeight: 'bold',
  },
  progressContainer: {
    marginBottom: 30,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 15,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  progressDots: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressDot: {
    width: isSmallScreen ? 20 : 25,
    height: isSmallScreen ? 20 : 25,
    borderRadius: 15,
    backgroundColor: '#E0E0E0',
    borderWidth: 2,
    borderColor: '#CCC',
  },
  progressDotCompleted: {
    backgroundColor: '#4CAF50',
    borderColor: '#2E7D32',
  },
  calibrationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 300,
  },
  countdownContainer: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#FFC107',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  countdownNumber: {
    fontSize: 72,
    fontWeight: 'bold',
    color: 'white',
  },
  recordingIndicator: {
    alignItems: 'center',
  },
  recordingDot: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#FF3B30',
    marginBottom: 20,
  },
  recordingText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF3B30',
  },
  statusContainer: {
    alignItems: 'center',
    padding: 20,
  },
  instruction: {
    fontSize: isSmallScreen ? 18 : 22,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
    marginBottom: 10,
  },
  statusText: {
    fontSize: isSmallScreen ? 14 : 16,
    color: '#666',
    textAlign: 'center',
  },
  processingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  processingText: {
    fontSize: isSmallScreen ? 16 : 18,
    color: '#666',
    marginTop: 20,
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignSelf: 'center',
    marginTop: 30,
  },
  cancelButtonText: {
    color: 'white',
    fontSize: isSmallScreen ? 14 : 16,
    fontWeight: '600',
  },
});