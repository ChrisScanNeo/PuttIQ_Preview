import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Image } from 'react-native';

const RealisticGolfBall = ({ 
  size = 100, 
  isHit = false, 
  hitQuality = null,
  inListeningZone = false 
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.8)).current;
  const glowOpacity = useRef(new Animated.Value(0)).current;

  // Get color based on hit quality
  const getHitColor = () => {
    switch(hitQuality) {
      case 'strong': return '#4CAF50';
      case 'medium': return '#FFC107';
      case 'weak': return '#FF9800';
      default: return '#4CAF50';
    }
  };

  // Pulse animation when hit (300ms total as per spec)
  useEffect(() => {
    if (isHit) {
      // Ball pulse
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      // Ring expansion animation (500ms as per spec)
      Animated.parallel([
        Animated.sequence([
          Animated.timing(ringOpacity, {
            toValue: 0.8,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(ringScale, {
          toValue: 1.5,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Reset after animation
        ringScale.setValue(0.8);
      });
    }
  }, [isHit]);

  // Subtle glow during listening zone
  useEffect(() => {
    Animated.timing(glowOpacity, {
      toValue: inListeningZone ? 0.15 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [inListeningZone]);

  return (
    <View style={styles.container}>
      {/* Subtle glow for listening zone */}
      <Animated.View 
        style={[
          styles.glow,
          {
            opacity: glowOpacity,
            width: size * 1.3,
            height: size * 1.3,
            borderRadius: size * 0.65,
          }
        ]}
      />

      {/* Expanding ring for hit feedback */}
      {isHit && (
        <Animated.View 
          style={[
            styles.ring,
            {
              opacity: ringOpacity,
              transform: [{ scale: ringScale }],
              width: size * 1.2,
              height: size * 1.2,
              borderRadius: size * 0.6,
              borderColor: getHitColor(),
            }
          ]}
        />
      )}

      {/* The actual golf ball - using Image for SVG */}
      <Animated.View 
        style={[
          styles.ballContainer,
          {
            transform: [{ scale: pulseAnim }],
            width: size,
            height: size,
          }
        ]}
      >
        <Image
          source={require('../assets/Ball-cropped.svg')}
          style={{ width: size, height: size }}
          resizeMode="contain"
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ballContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    // Add shadow for depth
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  glow: {
    position: 'absolute',
    backgroundColor: '#4CAF50',
  },
  ring: {
    position: 'absolute',
    borderWidth: 3,
    backgroundColor: 'transparent',
  },
});

export default RealisticGolfBall;