import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';

/**
 * Colored dots indicator that shows beat progression
 * Different colored dots light up in sequence
 */
export default function ColoredDotsIndicator({ periodMs, running, beatPosition }) {
  const dots = [
    { color: '#FF6B6B', position: 0.0 },   // Red
    { color: '#4ECDC4', position: 0.083 },  // Teal
    { color: '#FFD93D', position: 0.166 },  // Yellow
    { color: '#6BCF7F', position: 0.25 },   // Green
    { color: '#FFD93D', position: 0.333 },  // Yellow
    { color: '#95E1D3', position: 0.416 },  // Mint
    { color: '#FFD93D', position: 0.5 },    // Yellow
    { color: '#FFD93D', position: 0.583 },  // Yellow
    { color: '#6BCF7F', position: 0.666 },  // Green
    { color: '#FFD93D', position: 0.75 },   // Yellow
    { color: '#FF6B6B', position: 0.833 },  // Red
    { color: '#4ECDC4', position: 0.916 },  // Teal
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

    // Animate dots based on beat position
    const animateDots = () => {
      dots.forEach((dot, index) => {
        // Calculate distance from current beat position
        const distance = Math.abs(beatPosition - dot.position);
        const proximity = Math.max(0, 1 - distance * 10); // Light up dots near current position
        
        Animated.timing(dotAnimations[index], {
          toValue: 0.3 + (proximity * 0.7), // Range from 0.3 to 1.0
          duration: 50,
          useNativeDriver: true,
        }).start();
      });
    };

    const interval = setInterval(animateDots, 50);
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
    height: 2,
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    top: 19,
  },
  dot: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    top: 10,
    marginLeft: -10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 3,
  },
});