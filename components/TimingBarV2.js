import React, { useEffect, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
  useDerivedValue,
  useFrameCallback,
  runOnJS,
} from 'react-native-reanimated';

const { width: screenWidth } = Dimensions.get('window');

export default function TimingBarV2({ isPlaying, bpm = 80, audioTime = 0, onBeat }) {
  const [containerWidth, setContainerWidth] = useState(screenWidth - 40);
  
  // Shared values for animation
  const audioTimeSV = useSharedValue(0);
  const bpmSV = useSharedValue(bpm);
  const lastFrameTime = useSharedValue(Date.now());
  const beatPulse = useSharedValue(1);
  const isPlayingSV = useSharedValue(false);
  
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
    // Sync with audio time when we get updates
    if (audioTime !== undefined && audioTime >= 0) {
      audioTimeSV.value = audioTime;
    }
  }, [audioTime]);
  
  // Frame callback to update position between audio updates
  useFrameCallback(() => {
    'worklet';
    if (!isPlayingSV.value) return;
    
    const now = Date.now();
    const deltaTime = (now - lastFrameTime.value) / 1000; // Convert to seconds
    lastFrameTime.value = now;
    
    // Increment audio time estimate between updates
    audioTimeSV.value += deltaTime;
  }, true); // true = auto start
  
  // Calculate phase from audio time
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
  
  // Determine current direction
  const direction = useDerivedValue(() => {
    const period = 60 / bpmSV.value;
    const cycleTime = audioTimeSV.value % (period * 2);
    return cycleTime < period ? 'forward' : 'backward';
  });
  
  // Check if we're at a beat
  const isAtBeat = useDerivedValue(() => {
    return phase.value < 0.05 || phase.value > 0.95;
  });
  
  // Pulse animation on beat (every beat, not every 2 beats)
  useEffect(() => {
    if (isPlaying) {
      const beatInterval = 60000 / bpm; // One beat interval
      
      // Initial pulse
      beatPulse.value = withSequence(
        withTiming(1.3, { duration: 50 }),
        withTiming(1, { duration: 50 })
      );
      
      const interval = setInterval(() => {
        beatPulse.value = withSequence(
          withTiming(1.3, { duration: 50 }),
          withTiming(1, { duration: 50 })
        );
      }, beatInterval);
      
      return () => clearInterval(interval);
    }
  }, [isPlaying, bpm]);
  
  // Marker style - position based on phase
  const markerStyle = useAnimatedStyle(() => {
    const markerWidth = 28;
    const trackPadding = 14;
    const availableWidth = containerWidth - (trackPadding * 2) - markerWidth;
    
    return {
      transform: [
        { translateX: phase.value * availableWidth }
      ],
    };
  });
  
  // Left endpoint pulse (when marker reaches left side)
  const leftEndpointStyle = useAnimatedStyle(() => {
    // Pulse when we're at the left and going forward (start of cycle)
    const shouldPulse = phase.value < 0.05 && direction.value === 'forward';
    return {
      transform: [
        { scale: shouldPulse ? beatPulse.value : 1 }
      ],
    };
  });
  
  // Right endpoint pulse (when marker reaches right side)
  const rightEndpointStyle = useAnimatedStyle(() => {
    // Pulse when we're at the right and going backward (middle of cycle)
    const shouldPulse = phase.value > 0.95 && direction.value === 'forward';
    return {
      transform: [
        { scale: shouldPulse ? beatPulse.value : 1 }
      ],
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