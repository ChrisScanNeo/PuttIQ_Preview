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

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function HomeScreenSimplified({ user }) {
  const {
    isInitialized,
    isRunning,
    bpm,
    lastHit,
    start,
    stop,
  } = usePuttIQDetector(user?.settings?.defaultBPM || 30) || {};

  const [pulseAnim] = useState(new Animated.Value(1));

  // Pulse animation when hit detected
  useEffect(() => {
    if (lastHit) {
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [lastHit]);

  const toggle = () => {
    if (isRunning) {
      stop();
    } else {
      start();
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
          style={[
            styles.golfBall,
            {
              transform: [{ scale: pulseAnim }]
            }
          ]}
        >
          {/* Simple white circle with dimples effect */}
          <View style={styles.dimple1} />
          <View style={styles.dimple2} />
          <View style={styles.dimple3} />
          <View style={styles.dimple4} />
          <View style={styles.dimple5} />
        </Animated.View>
      </TouchableOpacity>

      {/* Minimal status indicator */}
      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {isRunning ? `${bpm} BPM` : 'TAP BALL TO START'}
        </Text>
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
  golfBall: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  dimple1: {
    position: 'absolute',
    top: 15,
    left: 20,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  dimple2: {
    position: 'absolute',
    top: 15,
    right: 20,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  dimple3: {
    position: 'absolute',
    top: 35,
    left: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  dimple4: {
    position: 'absolute',
    top: 35,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  dimple5: {
    position: 'absolute',
    bottom: 20,
    left: '50%',
    marginLeft: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
  },
  statusBar: {
    position: 'absolute',
    bottom: 50,
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
});