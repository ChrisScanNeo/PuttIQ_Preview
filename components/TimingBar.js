import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

export default function TimingBar({ isPlaying, position = 0, direction = 'forward', beatCount = 0 }) {
  const animatedPosition = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  
  // Update position smoothly
  useEffect(() => {
    if (isPlaying) {
      // Use native driver for smooth animation
      Animated.timing(animatedPosition, {
        toValue: position,
        duration: 16, // Update every frame (roughly 60fps)
        useNativeDriver: true,
      }).start();
    } else {
      // Reset when stopped
      animatedPosition.setValue(0);
    }
  }, [position, isPlaying, animatedPosition]);

  // Pulse animation on beat
  useEffect(() => {
    if (isPlaying && (position < 0.05 || position > 0.95)) {
      // Trigger pulse animation near endpoints
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 50,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 50,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [beatCount, isPlaying, position, pulseAnim]);

  // Calculate the actual travel distance
  // We want the marker to travel the full width minus its own width
  const markerWidth = 24;
  const trackPadding = 12; // Space for endpoints
  const availableWidth = screenWidth - (trackPadding * 2);
  const travelDistance = availableWidth - markerWidth;

  const markerTranslateX = animatedPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [0, travelDistance],
  });

  // Endpoint scales based on direction and position
  const leftEndpointScale = direction === 'forward' && position < 0.1 
    ? pulseAnim 
    : new Animated.Value(1);
    
  const rightEndpointScale = direction === 'backward' && position > 0.9 
    ? pulseAnim 
    : new Animated.Value(1);

  return (
    <View style={styles.container}>
      <View style={styles.trackContainer}>
        {/* Background track */}
        <View style={styles.track} />
        
        {/* Left endpoint */}
        <Animated.View 
          style={[
            styles.endpoint,
            styles.leftEndpoint,
            {
              transform: [{ scale: leftEndpointScale }]
            }
          ]} 
        />
        
        {/* Right endpoint */}
        <Animated.View 
          style={[
            styles.endpoint,
            styles.rightEndpoint,
            {
              transform: [{ scale: rightEndpointScale }]
            }
          ]} 
        />
        
        {/* Moving marker */}
        <Animated.View
          style={[
            styles.marker,
            {
              transform: [
                { translateX: markerTranslateX }
              ],
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 20,
  },
  trackContainer: {
    width: screenWidth - 24, // Full width minus small padding
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
  },
  endpoint: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#2E7D32',
    top: '50%',
    marginTop: -7,
    zIndex: 2,
    elevation: 2,
  },
  leftEndpoint: {
    left: 6,
  },
  rightEndpoint: {
    right: 6,
  },
  marker: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF6B6B',
    top: '50%',
    marginTop: -12,
    left: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 3,
  },
});