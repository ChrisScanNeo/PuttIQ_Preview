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
import GolfBallSVG from '../components/GolfBallSVG';

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

  const [pulseAnim] = useState(new Animated.Value(1));
  const [ballColor, setBallColor] = useState('white');

  // Change ball color based on hit quality
  useEffect(() => {
    if (lastHit) {
      // Determine color based on hit quality
      let color = 'white';
      if (lastHit.quality === 'strong') {
        color = '#4CAF50'; // Green for good hit
      } else if (lastHit.quality === 'medium') {
        color = '#FFC107'; // Yellow for medium hit
      } else if (lastHit.quality === 'weak') {
        color = '#FF9800'; // Orange for weak hit
      }
      
      setBallColor(color);
      
      // Pulse animation
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Reset color after a moment
      setTimeout(() => {
        setBallColor('white');
      }, 500);
    }
  }, [lastHit]);

  // Change ball color based on beat position (subtle rhythm indicator)
  useEffect(() => {
    if (isRunning && beatPosition !== undefined) {
      // Subtle color shift during listening zone (20-80% of beat)
      if (beatPosition >= 0.2 && beatPosition <= 0.8) {
        // Very subtle green tint during listening zone
        if (ballColor === 'white') {
          setBallColor('#f0fff0');
        }
      } else {
        // Back to white outside listening zone
        if (ballColor === '#f0fff0') {
          setBallColor('white');
        }
      }
    }
  }, [beatPosition, isRunning]);

  const toggle = () => {
    if (isRunning) {
      stop();
      setBallColor('white');
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

  // Get shadow color based on ball color
  const getShadowColor = () => {
    switch(ballColor) {
      case '#4CAF50': return '#388E3C';
      case '#FFC107': return '#F57C00';
      case '#FF9800': return '#E65100';
      case '#f0fff0': return '#e0f0e0';
      default: return '#e0e0e0';
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
        activeOpacity={0.9}
      >
        <Animated.View 
          style={{
            transform: [{ scale: pulseAnim }]
          }}
        >
          <GolfBallSVG 
            size={100} 
            color={ballColor}
            shadowColor={getShadowColor()}
          />
        </Animated.View>
      </TouchableOpacity>

      {/* Minimal status indicator */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {getStatusText()}
        </Text>
        {isRunning && (
          <View style={styles.listeningIndicator}>
            <View 
              style={[
                styles.listeningDot,
                { backgroundColor: beatPosition >= 0.2 && beatPosition <= 0.8 ? '#4CAF50' : '#666' }
              ]} 
            />
          </View>
        )}
      </View>

      {/* Hit feedback text (appears briefly) */}
      {lastHit && (
        <Animated.View 
          style={[
            styles.hitFeedback,
            {
              opacity: pulseAnim.interpolate({
                inputRange: [1, 1.3],
                outputRange: [0, 1]
              })
            }
          ]}
        >
          <Text style={[
            styles.hitFeedbackText,
            { color: ballColor === 'white' ? '#333' : ballColor }
          ]}>
            {lastHit.quality?.toUpperCase() || 'HIT'}
          </Text>
        </Animated.View>
      )}
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
  statusBar: {
    position: 'absolute',
    bottom: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
  },
  statusText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1,
  },
  listeningIndicator: {
    marginLeft: 10,
  },
  listeningDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  hitFeedback: {
    position: 'absolute',
    top: '35%',
  },
  hitFeedbackText: {
    fontSize: 24,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});