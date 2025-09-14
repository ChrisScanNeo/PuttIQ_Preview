import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Platform } from 'react-native';

/**
 * Colored dots indicator that shows beat progression
 * Red -> Orange -> Green -> Orange -> Red color transition
 * Similar to TempoStik+ visual feedback system
 */
export default function ColoredDotsIndicator({ periodMs, running, beatPosition }) {
  // Create dots with red-orange-green gradient
  // Red at edges, orange in transition, green at center
  const dots = [
    { color: '#FF4444', position: 0.0 },    // Red (edge)
    { color: '#FF5555', position: 0.083 },  // Red
    { color: '#FF6644', position: 0.166 },  // Red-Orange
    { color: '#FF8833', position: 0.20 },   // Orange (transition start)
    { color: '#FFAA22', position: 0.25 },   // Orange
    { color: '#FFBB11', position: 0.30 },   // Orange-Yellow
    { color: '#DDCC00', position: 0.35 },   // Yellow-Green (green zone start)
    { color: '#88DD00', position: 0.40 },   // Light Green
    { color: '#44EE00', position: 0.45 },   // Green
    { color: '#00FF00', position: 0.50 },   // Bright Green (CENTER - perfect timing)
    { color: '#44EE00', position: 0.55 },   // Green
    { color: '#88DD00', position: 0.60 },   // Light Green
    { color: '#DDCC00', position: 0.65 },   // Yellow-Green (green zone end)
    { color: '#FFBB11', position: 0.70 },   // Orange-Yellow
    { color: '#FFAA22', position: 0.75 },   // Orange
    { color: '#FF8833', position: 0.80 },   // Orange (transition end)
    { color: '#FF6644', position: 0.833 },  // Red-Orange
    { color: '#FF5555', position: 0.916 },  // Red
    { color: '#FF4444', position: 1.0 },    // Red (edge)
  ];

  const dotAnimations = useRef(dots.map(() => new Animated.Value(0.3))).current;

  useEffect(() => {
    if (!running) {
      // Reset all dots to dim
      dotAnimations.forEach(anim => {
        anim.setValue(0.3);
      });
      return;
    }

    // Animate dots based on beat position - simpler smooth wave
    const animateDots = () => {
      dots.forEach((dot, index) => {
        const distance = Math.abs(beatPosition - dot.position);

        // Simple wave with smooth falloff
        let intensity;
        if (distance < 0.03) {
          // At position - brightest
          intensity = 1.0;
        } else if (distance < 0.06) {
          // Very close
          intensity = 0.85;
        } else if (distance < 0.1) {
          // Close
          intensity = 0.65;
        } else if (distance < 0.15) {
          // Medium distance
          intensity = 0.45;
        } else {
          // Far - base brightness
          intensity = 0.25;
        }

        // Smooth animation without native driver for web
        Animated.timing(dotAnimations[index], {
          toValue: intensity,
          duration: 100, // Longer duration for smoother transitions
          useNativeDriver: false, // Disable for web compatibility
        }).start();
      });
    };

    const interval = setInterval(animateDots, 50); // Balanced update rate for smooth animation
    return () => clearInterval(interval);
  }, [running, beatPosition, dots, dotAnimations]);

  return (
    <View style={styles.container}>
      <View style={styles.line} />
      {dots.map((dot, index) => (
        <Animated.View
          key={index}
          style={[
            styles.dot,
            {
              backgroundColor: dot.color,
              left: `${dot.position * 100}%`,
              opacity: dotAnimations[index],
              transform: [
                {
                  scale: dotAnimations[index].interpolate({
                    inputRange: [0.3, 1],
                    outputRange: [0.8, 1.2],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 40,
    width: '90%',
    alignSelf: 'center',
    marginTop: 20,
    marginBottom: 30,
    position: 'relative',
    justifyContent: 'center',
  },
  line: {
    position: 'absolute',
    height: 1,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    top: 19.5,
  },
  dot: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    top: 10,
    marginLeft: -10,
    // Removed shadows for cleaner appearance
  },
});