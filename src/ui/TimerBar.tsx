import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
  bpm: number;
  isRunning: boolean;
  startTime?: number | null;
  sweep?: 'pingpong' | 'loop';
};

const { width: screenWidth } = Dimensions.get('window');

export default function TimerBar({ bpm, isRunning, startTime, sweep = 'pingpong' }: Props) {
  const animValue = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Clean up any existing animation
    if (animationRef.current) {
      animationRef.current.stop();
      animationRef.current = null;
      setIsAnimating(false);
    }

    if (!isRunning) {
      // Reset to start position when stopped
      animValue.setValue(0);
      return;
    }

    const spb = 60000 / bpm; // ms per beat

    // Calculate initial position if startTime is provided
    let initialValue = 0;
    if (startTime) {
      const elapsed = Date.now() - startTime;
      const cycles = elapsed / (spb * 2); // Each cycle is 2 beats (back and forth)
      const fractionalCycle = cycles % 1;

      // Set initial position based on elapsed time
      if (sweep === 'pingpong') {
        if (fractionalCycle <= 0.5) {
          initialValue = fractionalCycle * 2;
        } else {
          initialValue = 2 - fractionalCycle * 2;
        }
      } else {
        initialValue = fractionalCycle;
      }
    }

    // Set initial value
    animValue.setValue(initialValue);

    // Create stable animation
    const createAnimation = () => {
      if (sweep === 'pingpong') {
        // Back and forth animation
        return Animated.sequence([
          Animated.timing(animValue, {
            toValue: 1,
            duration: spb * (1 - initialValue), // Adjust for starting position
            useNativeDriver: true,
          }),
          Animated.timing(animValue, {
            toValue: 0,
            duration: spb,
            useNativeDriver: true,
          }),
        ]);
      } else {
        // Loop animation (0 to 1, then jump back to 0)
        return Animated.timing(animValue, {
          toValue: 1,
          duration: spb * 2 * (1 - initialValue), // Adjust for starting position
          useNativeDriver: true,
        });
      }
    };

    // Start the initial animation
    const firstAnimation = createAnimation();

    // Then create the repeating animation
    const repeatingAnimation = () => {
      if (sweep === 'pingpong') {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(animValue, {
              toValue: 1,
              duration: spb,
              useNativeDriver: true,
            }),
            Animated.timing(animValue, {
              toValue: 0,
              duration: spb,
              useNativeDriver: true,
            }),
          ])
        );
      } else {
        return Animated.loop(
          Animated.sequence([
            Animated.timing(animValue, {
              toValue: 1,
              duration: spb * 2,
              useNativeDriver: true,
            }),
            Animated.timing(animValue, {
              toValue: 0,
              duration: 0,
              useNativeDriver: true,
            }),
          ])
        );
      }
    };

    // Run first animation, then start looping
    setIsAnimating(true);
    firstAnimation.start(({ finished }) => {
      if (finished && isRunning) {
        animationRef.current = repeatingAnimation();
        animationRef.current.start();
      }
    });

    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
        animationRef.current = null;
      }
      setIsAnimating(false);
    };
  }, [bpm, isRunning, startTime, sweep]);

  // Calculate marker position
  const markerTranslateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, screenWidth * 0.8 - 20], // Adjust for marker width
  });

  // Calculate color based on position (red → orange → green → orange → red)
  const markerColor = animValue.interpolate({
    inputRange: [0, 0.2, 0.4, 0.6, 0.8, 1],
    outputRange: ['#FF4444', '#FF8844', '#44FF44', '#44FF44', '#FF8844', '#FF4444'],
  });

  return (
    <View style={styles.container}>
      {/* Background gradient bar */}
      <LinearGradient
        colors={['#FF4444', '#FF8844', '#44FF44', '#44FF44', '#FF8844', '#FF4444']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradientBar}
      />

      {/* Moving marker */}
      <Animated.View
        style={[
          styles.marker,
          {
            transform: [{ translateX: markerTranslateX }],
            backgroundColor: markerColor,
          },
        ]}
      />

      {/* Center zone indicator */}
      <View style={styles.centerZone} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: screenWidth * 0.8,
    height: 40,
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 20,
  },
  gradientBar: {
    position: 'absolute',
    width: '100%',
    height: 12,
    borderRadius: 6,
    opacity: 0.3,
  },
  marker: {
    position: 'absolute',
    width: 20,
    height: 30,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  centerZone: {
    position: 'absolute',
    left: '40%',
    width: '20%',
    height: 12,
    borderRadius: 6,
    backgroundColor: '#44FF44',
    opacity: 0.2,
  },
});