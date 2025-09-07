import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  useDerivedValue,
  useFrameCallback,
  interpolate,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');

export default function TimingBarV3({ isPlaying, bpm = 80, audioTime = 0, startTime }) {
  const [containerWidth, setContainerWidth] = useState(screenWidth - 40);
  
  // Shared values for animation
  const audioTimeSV = useSharedValue(0);
  const bpmSV = useSharedValue(bpm);
  const isPlayingSV = useSharedValue(false);
  const startTimeSV = useSharedValue(0);
  const beatPulse = useSharedValue(1);
  
  // Update shared values when props change
  useEffect(() => {
    bpmSV.value = bpm;
  }, [bpm]);
  
  useEffect(() => {
    isPlayingSV.value = isPlaying;
    if (!isPlaying) {
      audioTimeSV.value = 0;
    }
  }, [isPlaying]);
  
  useEffect(() => {
    if (startTime) {
      startTimeSV.value = startTime;
    }
  }, [startTime]);
  
  // Single frame callback to interpolate position smoothly
  useFrameCallback(() => {
    'worklet';
    if (!isPlayingSV.value || !startTimeSV.value) {
      audioTimeSV.value = 0;
      return;
    }
    
    // Calculate actual elapsed time from start
    const now = Date.now();
    const elapsed = (now - startTimeSV.value) / 1000; // Convert to seconds
    audioTimeSV.value = elapsed;
  }, true);
  
  // Calculate phase from audio time (single source of truth)
  const phase = useDerivedValue(() => {
    const period = 60 / bpmSV.value; // Period in seconds for one beat
    const cycleTime = audioTimeSV.value % (period * 2); // Two beats per full cycle
    
    if (cycleTime < period) {
      // First beat: moving right (0 to 1)
      return cycleTime / period;
    } else {
      // Second beat: moving left (1 to 0)
      return 1 - ((cycleTime - period) / period);
    }
  });
  
  // Trigger pulse at endpoints
  const triggerPulse = () => {
    beatPulse.value = withSequence(
      withTiming(1.3, { duration: 50 }),
      withTiming(1, { duration: 50 })
    );
  };
  
  // Watch for beat hits
  useEffect(() => {
    if (isPlaying && audioTime > 0) {
      const beatInterval = 60 / bpm;
      const beatNumber = Math.floor(audioTime / beatInterval);
      
      // Trigger pulse on each beat
      triggerPulse();
    }
  }, [Math.floor(audioTime * bpm / 60)]); // Only trigger when beat number changes
  
  // Marker style - smooth position based on phase
  const markerStyle = useAnimatedStyle(() => {
    const markerWidth = 28;
    const trackPadding = 14;
    const availableWidth = containerWidth - (trackPadding * 2) - markerWidth;
    
    return {
      transform: [
        { translateX: interpolate(phase.value, [0, 1], [0, availableWidth]) }
      ],
    };
  });
  
  // Left endpoint pulse (at phase 0)
  const leftEndpointStyle = useAnimatedStyle(() => {
    const scale = phase.value < 0.05 ? beatPulse.value : 1;
    return {
      transform: [{ scale }],
    };
  });
  
  // Right endpoint pulse (at phase 1)
  const rightEndpointStyle = useAnimatedStyle(() => {
    const scale = phase.value > 0.95 ? beatPulse.value : 1;
    return {
      transform: [{ scale }],
    };
  });
  
  return (
    <View style={styles.container}>
      <View 
        style={styles.trackContainer}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        {/* Background track */}
        <View style={styles.track} />
        
        {/* Left endpoint */}
        <Animated.View style={[styles.endpoint, styles.leftEndpoint, leftEndpointStyle]} />
        
        {/* Right endpoint */}
        <Animated.View style={[styles.endpoint, styles.rightEndpoint, rightEndpointStyle]} />
        
        {/* Moving marker */}
        <Animated.View style={[styles.marker, markerStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    height: 80,
    justifyContent: 'center',
    paddingHorizontal: 20,
    marginVertical: 10,
  },
  trackContainer: {
    flex: 1,
    height: 40,
    justifyContent: 'center',
    position: 'relative',
  },
  track: {
    position: 'absolute',
    left: 14,
    right: 14,
    height: 6,
    backgroundColor: '#E0E0E0',
    borderRadius: 3,
  },
  endpoint: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#2E7D32',
    top: '50%',
    marginTop: -8,
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
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF6B6B',
    top: '50%',
    marginTop: -14,
    left: 14,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 3,
  },
});