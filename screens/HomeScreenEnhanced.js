import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ImageBackground,
  SafeAreaView,
  Image,
  Text,
  Animated,
  Dimensions,
} from 'react-native';

// Components
import DottedSwingBar from '../components/DottedSwingBar';
import StatusBar from '../components/StatusBar';
import BpmSlider from '../components/BpmSlider';
import RealisticGolfBall from '../components/RealisticGolfBall';

// Hooks
import { usePuttIQDetector } from '../hooks/usePuttIQDetector';
import { useMetronomeEngine } from '../hooks/useMetronomeEngine';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function HomeScreenEnhanced({ user }) {
  // State
  const [bpm, setBpm] = useState(user?.settings?.defaultBPM || 30);
  const [isRunning, setIsRunning] = useState(false);
  const [showHitFeedback, setShowHitFeedback] = useState(false);
  const [hitFeedbackOpacity] = useState(new Animated.Value(0));
  const [currentHitQuality, setCurrentHitQuality] = useState(null);
  const [triggerPulse, setTriggerPulse] = useState(false);

  // Detection hook
  const detector = usePuttIQDetector(bpm);
  
  // Metronome engine for precise timing
  const { period, inZone, getBeatPosition } = useMetronomeEngine(bpm, isRunning);

  // Handle starting/stopping
  const handleToggle = () => {
    if (isRunning) {
      detector?.stop();
      setIsRunning(false);
    } else {
      detector?.start();
      setIsRunning(true);
    }
  };

  // Handle BPM changes
  useEffect(() => {
    if (detector?.setBpm) {
      detector.setBpm(bpm);
    }
  }, [bpm, detector]);

  // Handle hit feedback from detector
  useEffect(() => {
    if (detector?.lastHit) {
      setCurrentHitQuality(detector.lastHit.quality);
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
  }, [detector?.lastHit]);

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

  return (
    <ImageBackground
      source={require('../assets/grass-background.jpeg')}
      style={styles.bg}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.container}>
        {/* Logo */}
        <Image
          source={require('../assets/puttiq-logo.jpg')}
          style={styles.logo}
          resizeMode="contain"
        />

        {/* Dotted swing bar */}
        <DottedSwingBar periodMs={period} running={isRunning} />

        {/* Golf ball in center */}
        <View style={styles.centerContent}>
          <TouchableOpacity
            onPress={handleToggle}
            activeOpacity={0.95}
            style={styles.golfBallTouch}
          >
            <RealisticGolfBall
              size={120}
              isHit={triggerPulse}
              hitQuality={currentHitQuality}
              inListeningZone={inZone()}
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

        {/* Status bar */}
        <StatusBar
          bpm={bpm}
          running={isRunning}
          periodMs={period}
          inZone={inZone()}
        />

        {/* BPM slider */}
        <View style={styles.sliderContainer}>
          <BpmSlider value={bpm} onChange={setBpm} />
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  logo: {
    width: 180,
    height: 60,
    marginTop: 12,
    alignSelf: 'center',
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
    top: '30%',
  },
  hitFeedbackText: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  sliderContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
});