import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ImageBackground,
  Animated,
  Dimensions,
  Text,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Components
import ColoredDotsIndicator from '../components/ColoredDotsIndicator';
import ControlBars from '../components/ControlBars';
import SteppedGolfBall from '../components/SteppedGolfBall';

// Hooks
import { usePuttIQDetector } from '../hooks/usePuttIQDetector';

// New Audio System
import { AudioEngine } from '../src/audio/audioEngine';
import { Scheduler } from '../src/audio/scheduler';
import TimerBar from '../src/ui/TimerBar';
import ModeSwitcher from '../src/ui/ModeSwitcher';
import { loadAudioSettings, saveAudioSettings } from '../src/state/audioSettings';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function HomeScreenMinimal({ user }) {
  // State
  const [bpm, setBpm] = useState(user?.settings?.defaultBPM || 80);
  const [showHitFeedback, setShowHitFeedback] = useState(false);
  const [hitFeedbackOpacity] = useState(new Animated.Value(0));
  const [currentHitQuality, setCurrentHitQuality] = useState(null);
  const [triggerPulse, setTriggerPulse] = useState(false);
  const [detectionEnabled, setDetectionEnabled] = useState(false);
  const [metronomeRunning, setMetronomeRunning] = useState(false);
  const [metronomeBeatPosition, setMetronomeBeatPosition] = useState(0);
  const [audioMode, setAudioMode] = useState('metronome');
  const [startTime, setStartTime] = useState(null);

  // Refs
  const audioEngineRef = useRef(null);
  const schedulerRef = useRef(null);
  const beatAnimationRef = useRef(null);

  // Detection hook - only initialize if detection is enabled
  const detector = detectionEnabled ? usePuttIQDetector(bpm) : null;
  const {
    isInitialized,
    isRunning,
    beatPosition: detectorBeatPosition,
    lastHit,
    start: startDetector,
    stop: stopDetector,
  } = detector || {};

  // Use detector beat position if available, otherwise use metronome position
  const beatPosition = detectionEnabled && detectorBeatPosition ? detectorBeatPosition : metronomeBeatPosition;

  // Initialize new audio engine on mount
  useEffect(() => {
    const initAudioEngine = async () => {
      try {
        // Load saved settings
        const settings = await loadAudioSettings();
        setBpm(settings.bpm);
        setAudioMode(settings.mode);

        // Initialize audio engine and scheduler
        audioEngineRef.current = new AudioEngine();
        await audioEngineRef.current.init();

        schedulerRef.current = new Scheduler(audioEngineRef.current);

        console.log('New audio engine initialized successfully');
      } catch (error) {
        console.error('Failed to initialize audio engine:', error);
      }
    };

    initAudioEngine();

    return () => {
      if (audioEngineRef.current) {
        audioEngineRef.current.stop();
      }
    };
  }, []);

  // Save settings when changed
  useEffect(() => {
    saveAudioSettings({ bpm, mode: audioMode });
  }, [bpm, audioMode]);

  // Animate beat position when metronome is running
  useEffect(() => {
    if (metronomeRunning && !detectionEnabled) {
      const period = 60000 / bpm;
      let startTime = Date.now();

      // Use interval instead of requestAnimationFrame to avoid excessive re-renders
      const intervalId = setInterval(() => {
        const elapsed = Date.now() - startTime;
        const cyclePosition = (elapsed % (period * 2)) / period; // Double period for back-and-forth

        // Create bidirectional movement: 0→1→0
        let position;
        if (cyclePosition <= 1) {
          // First half: moving right (0 to 1)
          position = cyclePosition;
        } else {
          // Second half: moving left (1 to 0)
          position = 2 - cyclePosition;
        }

        setMetronomeBeatPosition(position);
      }, 50); // Update every 50ms (20fps) instead of 60fps

      return () => {
        clearInterval(intervalId);
      };
    } else {
      setMetronomeBeatPosition(0);
    }
  }, [metronomeRunning, bpm, detectionEnabled]);

  // Calculate if in listening zone
  const inListeningZone = isRunning && beatPosition >= 0.2 && beatPosition <= 0.8;

  // Handle play/pause with new audio engine
  const handlePlayPause = async () => {
    if (detectionEnabled) {
      // If detection is on, use detector
      if (isRunning) {
        stopDetector();
      } else {
        startDetector();
      }
    } else {
      // Use new audio engine
      if (metronomeRunning) {
        if (schedulerRef.current) {
          await schedulerRef.current.stop();
        }
        setMetronomeRunning(false);
        setMetronomeBeatPosition(0);
        setStartTime(null);
      } else {
        if (schedulerRef.current) {
          const now = Date.now();
          setStartTime(now);
          await schedulerRef.current.runSequence({
            bpm,
            bars: 100,
            beatsPerBar: 4,
            mode: audioMode,
            startDelay: 500,
          });
        }
        setMetronomeRunning(true);
      }
    }
  };

  // Toggle detection on/off
  const toggleDetection = () => {
    // Stop audio engine if running
    if (metronomeRunning && schedulerRef.current) {
      schedulerRef.current.stop();
      setMetronomeRunning(false);
      setStartTime(null);
    }

    // Stop detector if running
    if (detectionEnabled && isRunning) {
      stopDetector();
    }

    setDetectionEnabled(!detectionEnabled);
  };

  // Handle BPM changes
  const handleBpmIncrease = () => {
    setBpm(prev => Math.min(100, prev + 1));
  };

  const handleBpmDecrease = () => {
    setBpm(prev => Math.max(30, prev - 1));
  };

  // Update detector BPM when it changes
  useEffect(() => {
    if (detector?.updateBpm) {
      detector.updateBpm(bpm);
    }
  }, [bpm, detector]);

  // Check if practice is active (either metronome or detector)
  const isPracticeActive = metronomeRunning || isRunning;

  // Handle hit feedback
  useEffect(() => {
    if (lastHit) {
      setCurrentHitQuality(lastHit.quality);
      setTriggerPulse(true);
      setShowHitFeedback(true);

      // Reset pulse trigger
      setTimeout(() => setTriggerPulse(false), 10);

      // Animate feedback text
      Animated.sequence([
        Animated.timing(hitFeedbackOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(300),
        Animated.timing(hitFeedbackOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setShowHitFeedback(false);
      });
    }
  }, [lastHit]);

  // Get hit color based on quality
  const getHitColor = () => {
    switch (currentHitQuality) {
      case 'strong':
        return '#4CAF50';
      case 'medium':
        return '#FFC107';
      case 'weak':
        return '#FF9800';
      default:
        return undefined;
    }
  };

  // Lightning bolt indicator (shows when powered/active)
  const showLightning = isRunning;

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../assets/grass-background.jpeg')}
        style={styles.background}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.safeArea}>
          {/* Mode switcher at top */}
          <ModeSwitcher
            currentMode={audioMode}
            onModeChange={setAudioMode}
            disabled={metronomeRunning}
          />

          {/* New Timer bar instead of dots */}
          <TimerBar
            bpm={bpm}
            isRunning={metronomeRunning}
            startTime={startTime}
            sweep="pingpong"
          />

          {/* Golf ball - centered and maximized between top bar and bottom controls */}
          <View style={styles.golfBallSection}>
            <TouchableOpacity
              onPress={handlePlayPause}
              activeOpacity={0.9}
              style={styles.golfBallTouchArea}
            >
              <SteppedGolfBall
                size={Platform.OS === 'web'
                  ? Math.min(screenWidth * 0.4, screenHeight * 0.8, 400)
                  : Math.min(screenWidth * 0.6, screenHeight * 0.7, 350)
                }
                beatPosition={beatPosition || 0}
                isHit={triggerPulse}
                hitQuality={currentHitQuality}
              />
            </TouchableOpacity>

            {/* Hit feedback text */}
            {showHitFeedback && (
              <Animated.View
                style={[
                  styles.hitFeedback,
                  { opacity: hitFeedbackOpacity },
                ]}
              >
                <Text
                  style={[
                    styles.hitFeedbackText,
                    { color: getHitColor() },
                  ]}
                >
                  {currentHitQuality?.toUpperCase() || 'HIT'}
                </Text>
              </Animated.View>
            )}
          </View>

          {/* Control bars */}
          <ControlBars
            bpm={bpm}
            onBpmIncrease={handleBpmIncrease}
            onBpmDecrease={handleBpmDecrease}
            onMetronome={() => !metronomeRunning && setAudioMode('metronome')}
            onMusic={() => !metronomeRunning && setAudioMode('tones')}
            onWind={() => !metronomeRunning && setAudioMode('wind')}
          />

          {/* Bottom left instruction text */}
          <View style={styles.instructionContainer}>
            <View style={styles.instructionBox}>
              <Text style={styles.instructionText}>
                {isPracticeActive ? 'Click ball to stop' : 'Click ball to start'}
              </Text>
            </View>
          </View>

          {/* Corner indicators */}
          {/* Metronome icon - bottom left (shows when practice is active) */}
          {isPracticeActive && (
            <View style={styles.metronomeIndicator}>
              <Image
                source={require('../screens/icons/metronome.png')}
                style={styles.cornerIcon}
                resizeMode="contain"
              />
            </View>
          )}

          {/* Detection toggle - bottom right */}
          <TouchableOpacity
            style={styles.detectionToggle}
            onPress={toggleDetection}
            activeOpacity={0.7}
          >
            <View style={[
              styles.detectionButton,
              detectionEnabled && styles.detectionButtonActive
            ]}>
              <Text style={styles.detectionIcon}>🎤</Text>
            </View>
          </TouchableOpacity>
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeArea: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  golfBallSection: {
    position: 'absolute',
    top: 90,
    bottom: 140, // Moved up to have 10px padding from control buttons
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  golfBallTouchArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  hitFeedback: {
    position: 'absolute',
    top: -60,
  },
  hitFeedbackText: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  instructionContainer: {
    position: 'absolute',
    bottom: 35,
    left: 30,
  },
  instructionBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }
    }),
  },
  instructionText: {
    color: '#333',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  metronomeIndicator: {
    position: 'absolute',
    bottom: 70,
    left: 30,
  },
  windIndicator: {
    position: 'absolute',
    bottom: 30,
    right: 30,
  },
  cornerIcon: {
    width: 36,
    height: 36,
    tintColor: '#FFD93D',
    ...Platform.select({
      web: {
        filter: 'drop-shadow(0px 0px 10px rgba(255, 217, 61, 0.5))',
      },
      default: {
        shadowColor: '#FFD93D',
        shadowOffset: { width: 0, height: 0 },
        shadowRadius: 10,
        shadowOpacity: 0.5,
      }
    }),
  },
  detectionToggle: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    zIndex: 100,
  },
  detectionButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.95)', // White background for visibility
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
      }
    }),
  },
  detectionButtonActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.8)',
    // Removed border for cleaner look
  },
  detectionIcon: {
    fontSize: 24,
  },
});