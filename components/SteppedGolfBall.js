import React, { useEffect, useRef, useMemo } from 'react';
import { View, Animated, StyleSheet, Image } from 'react-native';

const SteppedGolfBall = ({ 
  size = 80, 
  isHit = false, 
  hitQuality = null,
  beatPosition = 0 
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.8)).current;

  // Preload all ball images
  const ballImages = useMemo(() => ({
    1: require('../assets/ball/golf-ball-step-1.png'),
    2: require('../assets/ball/golf-ball-step-2.png'),
    3: require('../assets/ball/golf-ball-step-3.png'),
    4: require('../assets/ball/golf-ball-step-4.png'),
    5: require('../assets/ball/golf-ball-step-5.png'),
    6: require('../assets/ball/golf-ball-step-6.png'),
    7: require('../assets/ball/golf-ball-step-7.png'),
    8: require('../assets/ball/golf-ball-step-8.png'),
    9: require('../assets/ball/golf-ball-step-9.png'),
    10: require('../assets/ball/golf-ball-step-10.png'),
  }), []);

  // Calculate which step image to show based on beat position
  const calculateStep = (position) => {
    // Outside detection zone (0-20% and 80-100%): show step 1
    if (position < 0.2 || position > 0.8) {
      return 1;
    }
    
    // Inside detection zone (20-80%)
    if (position <= 0.5) {
      // Rising phase: 0.2 to 0.5 maps to steps 1 to 10
      const progress = (position - 0.2) / 0.3; // 0 to 1
      const step = Math.floor(progress * 9) + 1; // 1 to 10
      return Math.min(10, Math.max(1, step));
    } else {
      // Falling phase: 0.5 to 0.8 maps to steps 10 to 1
      const progress = (position - 0.5) / 0.3; // 0 to 1
      const step = Math.floor((1 - progress) * 9) + 1; // 10 to 1
      return Math.min(10, Math.max(1, step));
    }
  };

  // Get current step based on beat position
  const currentStep = calculateStep(beatPosition);

  // Get color for hit quality feedback
  const getHitColor = () => {
    switch(hitQuality) {
      case 'strong': return '#4CAF50';
      case 'medium': return '#FFC107';
      case 'weak': return '#FF9800';
      default: return '#4CAF50';
    }
  };

  // Pulse animation when hit (300ms total)
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

      // Ring expansion animation (500ms)
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

  return (
    <View style={styles.container}>
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

      {/* The golf ball with step-based color */}
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
          source={ballImages[currentStep]}
          style={{ width: size, height: size }}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Drop shadow for depth */}
      <View 
        style={[
          styles.shadow,
          {
            width: size * 0.8,
            height: size * 0.15,
            borderRadius: size * 0.4,
            top: size - 10,
          }
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
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
  ring: {
    position: 'absolute',
    borderWidth: 3,
    backgroundColor: 'transparent',
    zIndex: 10,
  },
  shadow: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    transform: [{ scaleX: 1.2 }],
  },
});

export default SteppedGolfBall;