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
} from 'react-native';

// Components
import ColoredDotsIndicator from '../components/ColoredDotsIndicator';
import ControlBars from '../components/ControlBars';
import RealisticGolfBall from '../components/RealisticGolfBall';

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
  const {
    isInitialized,
    isRunning,
    beatPosition,
    lastHit,
    start,
    stop,
  } = usePuttIQDetector(bpm) || {};

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

          {/* Golf ball in center */}
          <View style={styles.centerContent}>
            <TouchableOpacity
              onPress={handlePlayPause}
              activeOpacity={0.95}
              style={styles.golfBallTouch}
            >
              <RealisticGolfBall
                size={150}
                isHit={triggerPulse}
                hitQuality={currentHitQuality}
                inListeningZone={inListeningZone}
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

          {/* Lightning bolt indicator */}
          {showLightning && (
            <View style={styles.lightningContainer}>
              <Text style={styles.lightning}>⚡</Text>
            </View>
          )}

          {/* Control bars */}
          <ControlBars
            isPlaying={isRunning}
            onPlayPause={handlePlayPause}
            bpm={bpm}
            onSettings={() => console.log('Settings')}
            onMetronome={() => console.log('Metronome')}
          />
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
  golfBallTouch: {
    padding: 20,
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
  lightningContainer: {
    position: 'absolute',
    bottom: 140,
    left: 30,
  },
  lightning: {
    fontSize: 36,
    color: '#FFD93D',
    textShadowColor: '#FFD93D',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
});