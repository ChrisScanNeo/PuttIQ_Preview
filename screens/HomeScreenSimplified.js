import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, 
  View, 
  TouchableOpacity, 
  ImageBackground, 
  Dimensions,
  Text,
  Animated
} from 'react-native';
import { usePuttIQDetector } from '../hooks/usePuttIQDetector';
import RealisticGolfBall from '../components/RealisticGolfBall';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function HomeScreenSimplified({ user }) {
  const {
    isInitialized,
    isRunning,
    bpm,
    lastHit,
    beatPosition,
    start,
    stop,
  } = usePuttIQDetector(user?.settings?.defaultBPM || 30) || {};

  const [showHitFeedback, setShowHitFeedback] = useState(false);
  const [hitFeedbackOpacity] = useState(new Animated.Value(0));

  // Track if we're in listening zone
  const inListeningZone = isRunning && beatPosition >= 0.2 && beatPosition <= 0.8;

  // Handle hit feedback
  useEffect(() => {
    if (lastHit) {
      setShowHitFeedback(true);
      
      // Fade in and out hit text
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

  const toggle = () => {
    if (isRunning) {
      stop();
    } else {
      start();
    }
  };

  // Get status text
  const getStatusText = () => {
    if (!isInitialized) return 'INITIALIZING...';
    if (!isRunning) return 'TAP BALL TO START';
    return `${bpm} BPM`;
  };

  // Get hit quality color
  const getHitColor = () => {
    if (!lastHit) return '#4CAF50';
    switch(lastHit.quality) {
      case 'strong': return '#4CAF50';
      case 'medium': return '#FFC107';
      case 'weak': return '#FF9800';
      default: return '#4CAF50';
    }
  };

  return (
    <ImageBackground 
      source={require('../assets/grass-background.jpeg')} 
      style={styles.container}
      resizeMode="cover"
    >
      {/* Golf ball in center */}
      <TouchableOpacity 
        style={styles.golfBallContainer}
        onPress={toggle}
        activeOpacity={0.95}
      >
        <RealisticGolfBall
          size={120}
          isHit={!!lastHit}
          hitQuality={lastHit?.quality}
          inListeningZone={inListeningZone}
        />
      </TouchableOpacity>

      {/* Hit feedback text */}
      {showHitFeedback && (
        <Animated.View 
          style={[
            styles.hitFeedback,
            { opacity: hitFeedbackOpacity }
          ]}
        >
          <Text style={[
            styles.hitFeedbackText,
            { color: getHitColor() }
          ]}>
            {lastHit?.quality?.toUpperCase() || 'HIT'}
          </Text>
        </Animated.View>
      )}

      {/* Minimal status bar */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {getStatusText()}
        </Text>
        {isRunning && (
          <View style={styles.indicators}>
            {/* Listening zone indicator */}
            <View 
              style={[
                styles.indicator,
                { backgroundColor: inListeningZone ? '#4CAF50' : '#666' }
              ]} 
            />
            {/* Beat position indicator (optional) */}
            <View style={styles.beatBar}>
              <View 
                style={[
                  styles.beatMarker,
                  { left: `${(beatPosition || 0) * 100}%` }
                ]}
              />
            </View>
          </View>
        )}
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  golfBallContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  hitFeedback: {
    position: 'absolute',
    top: '30%',
  },
  hitFeedbackText: {
    fontSize: 28,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  statusBar: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 25,
    minWidth: 180,
  },
  statusText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 8,
  },
  indicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  beatBar: {
    width: 100,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 1,
    position: 'relative',
  },
  beatMarker: {
    position: 'absolute',
    width: 4,
    height: 8,
    backgroundColor: 'white',
    borderRadius: 2,
    top: -3,
  },
});