import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ImageBackground,
  SafeAreaView,
  Animated,
  Dimensions,
  Text,
  Image,
} from 'react-native';

// Components
import ColoredDotsIndicator from '../components/ColoredDotsIndicator';
import ControlBars from '../components/ControlBars';
import SteppedGolfBall from '../components/SteppedGolfBall';

// Hooks
import { usePuttIQDetector } from '../hooks/usePuttIQDetector';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function HomeScreenMinimal({ user }) {
  // State
  const [bpm, setBpm] = useState(user?.settings?.defaultBPM || 30);
  const [showHitFeedback, setShowHitFeedback] = useState(false);
  const [hitFeedbackOpacity] = useState(new Animated.Value(0));
  const [currentHitQuality, setCurrentHitQuality] = useState(null);
  const [triggerPulse, setTriggerPulse] = useState(false);

  // Detection hook
  const detector = usePuttIQDetector(bpm);
  const {
    isInitialized,
    isRunning,
    beatPosition,
    lastHit,
    start,
    stop,
  } = detector || {};

  // Calculate if in listening zone
  const inListeningZone = isRunning && beatPosition >= 0.2 && beatPosition <= 0.8;

  // Handle play/pause
  const handlePlayPause = () => {
    if (isRunning) {
      stop();
    } else {
      start();
    }
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
    if (detector?.setBpm) {
      detector.setBpm(bpm);
    }
  }, [bpm]);

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
          {/* Colored dots indicator at top */}
          <ColoredDotsIndicator
            periodMs={60000 / bpm}
            running={isRunning}
            beatPosition={beatPosition || 0}
          />

          {/* Golf ball between slider and control bars */}
          <View style={styles.golfBallSection}>
            <TouchableOpacity
              onPress={handlePlayPause}
              activeOpacity={0.95}
              style={styles.golfBallTouch}
            >
              <SteppedGolfBall
                size={450}
                beatPosition={beatPosition}
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
            onMetronome={() => console.log('Metronome toggled')}
            onMusic={() => console.log('Music toggled')}
            onWind={() => console.log('Wind toggled')}
          />

          {/* Corner indicators */}
          {/* Metronome icon - bottom left */}
          {isRunning && (
            <View style={styles.metronomeIndicator}>
              <Image 
                source={require('../screens/icons/metronome.png')}
                style={styles.cornerIcon}
                resizeMode="contain"
              />
            </View>
          )}

          {/* Wind icon - bottom right */}
          {false && ( // Set to true when wind feature is active
            <View style={styles.windIndicator}>
              <Image 
                source={require('../screens/icons/wind.png')}
                style={styles.cornerIcon}
                resizeMode="contain"
              />
            </View>
          )}
        </SafeAreaView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  background: {
    flex: 1,
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  golfBallTouch: {
    padding: 10,
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
  metronomeIndicator: {
    position: 'absolute',
    bottom: 30,
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
    shadowColor: '#FFD93D',
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 10,
    shadowOpacity: 0.5,
  },
});