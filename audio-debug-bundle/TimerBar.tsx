import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
  bpm: number;
  isRunning: boolean;
  startTime?: number | null;
  sweep?: 'pingpong' | 'loop';
  mode?: 'metronome' | 'tones' | 'wind'; // Add mode for putting-specific animation
};

const { width: screenWidth } = Dimensions.get('window');
const BAR_PADDING = 40; // Padding from screen edges

export default function TimerBar({ bpm, isRunning, startTime, sweep = 'pingpong', mode = 'metronome' }: Props) {
  const animValue = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Debug timing
  useEffect(() => {
    if (isRunning && startTime) {
      console.log('[TimerBar] ⏰ TIMING DEBUG:', {
        bpm,
        mode,
        startTime: new Date(startTime).toISOString(),
        startTimeMs: startTime,
        currentTime: Date.now(),
        timeSinceStart: Date.now() - startTime,
        isRunning,
      });
    }
  }, [isRunning, startTime]);

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
    const cycleTime = spb * 4; // 4 beats per full cycle for tones/wind modes

    // Calculate initial position
    let initialValue = 0;

    // For putting modes, 4-beat cycle: LEFT -> RIGHT (2 beats) -> LEFT (2 beats)
    if (mode === 'tones' || mode === 'wind') {
      if (!startTime) {
        // Just starting - begin at LEFT
        initialValue = 0;
      } else {
        // Calculate position based on elapsed time in 4-beat cycle
        const elapsed = Date.now() - startTime;

        if (elapsed < 0) {
          // Start time is in the future, stay at initial position (LEFT)
          initialValue = 0;
          console.log('[TimerBar] Waiting for start time, staying at LEFT');
        } else {
          // Position in the 4-beat cycle
          const cycleProgress = (elapsed % cycleTime) / cycleTime;

          // 0-0.5: Moving LEFT to RIGHT (first 2 beats)
          // 0.5-1.0: Moving RIGHT to LEFT (last 2 beats)
          if (cycleProgress < 0.5) {
            // First half: LEFT to RIGHT
            initialValue = cycleProgress * 2; // 0 to 1
          } else {
            // Second half: RIGHT to LEFT
            initialValue = 2 - (cycleProgress * 2); // 1 to 0
          }
        }
      }
    } else {
      // Standard metronome mode - simple pingpong
      if (startTime) {
        const elapsed = Date.now() - startTime;
        const cycles = elapsed / (spb * 2);
        const fractionalCycle = cycles % 1;

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
    }

    // Set initial value
    animValue.setValue(initialValue);

    // Create stable animation
    const createAnimation = () => {
      // For putting modes, 4-beat cycle animation
      if (mode === 'tones' || mode === 'wind') {
        const timeUntilStart = startTime ? Math.max(0, startTime - Date.now()) : 0;

        if (timeUntilStart > 0) {
          // Wait until start time, then begin movement from LEFT to RIGHT
          return Animated.sequence([
            Animated.delay(timeUntilStart),
            Animated.timing(animValue, {
              toValue: 1, // First move: LEFT to RIGHT
              duration: spb * 2, // 2 beats
              useNativeDriver: true,
            }),
          ]);
        } else {
          // Already started, continue from current position
          const elapsed = Date.now() - startTime;
          const cycleProgress = (elapsed % cycleTime) / cycleTime;

          if (cycleProgress < 0.5) {
            // Currently moving LEFT to RIGHT
            const remainingTime = (0.5 - cycleProgress) * cycleTime;
            return Animated.timing(animValue, {
              toValue: 1,
              duration: remainingTime,
              useNativeDriver: true,
            });
          } else {
            // Currently moving RIGHT to LEFT
            const remainingTime = (1 - cycleProgress) * cycleTime;
            return Animated.timing(animValue, {
              toValue: 0,
              duration: remainingTime,
              useNativeDriver: true,
            });
          }
        }
      }

      // Standard metronome animation
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
      // For putting modes, 4-beat cycle: LEFT->RIGHT (2 beats), RIGHT->LEFT (2 beats)
      if (mode === 'tones' || mode === 'wind') {
        return Animated.loop(
          Animated.sequence([
            // Move LEFT to RIGHT (2 beats)
            Animated.timing(animValue, {
              toValue: 1,
              duration: spb * 2,
              useNativeDriver: true,
            }),
            // Move RIGHT to LEFT (2 beats)
            Animated.timing(animValue, {
              toValue: 0,
              duration: spb * 2,
              useNativeDriver: true,
            }),
          ])
        );
      }

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
  }, [bpm, isRunning, startTime, sweep, mode]);

  // Calculate marker position - use full width minus padding
  const markerTranslateX = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0, screenWidth - BAR_PADDING - 20], // Full width minus padding and marker width
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
    width: screenWidth - BAR_PADDING, // Full width minus padding
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