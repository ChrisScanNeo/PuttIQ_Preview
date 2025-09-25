import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
  bpm: number;
  isRunning: boolean;
  startTime?: number | null;
  sweep?: 'pingpong' | 'loop';
  mode?: 'metronome' | 'tones' | 'wind';
};

const { width: screenWidth } = Dimensions.get('window');
const BAR_PADDING = 40; // Padding from screen edges

export default function TimerBar({ bpm, isRunning, startTime, sweep = 'pingpong', mode = 'metronome' }: Props) {
  const [progress, setProgress] = useState(0); // 0..1 logical position
  const rafIdRef = useRef<number | null>(null);

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
    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    if (!isRunning || !startTime) {
      setProgress(0);
      return;
    }

    const spb = 60000 / bpm; // ms per beat
    const cycleTime = spb * 4; // 4 beats per full cycle

    // Use requestAnimationFrame for continuous clock-based animation
    const tick = () => {
      const elapsed = Date.now() - startTime;

      if (elapsed < 0) {
        // Still waiting for start time
        setProgress(0);
        console.log('[TimerBar] Waiting for start time, staying at LEFT');
      } else {
        // Calculate position based on elapsed time
        if (mode === 'tones' || mode === 'wind') {
          // 4-beat cycle: LEFT -> RIGHT (2 beats) -> LEFT (2 beats)
          const cycleProgress = (elapsed % cycleTime) / cycleTime;

          // Ping-pong: 0-0.5 forward, 0.5-1.0 backward
          if (cycleProgress < 0.5) {
            setProgress(cycleProgress * 2); // 0 to 1
          } else {
            setProgress(2 - cycleProgress * 2); // 1 to 0
          }
        } else {
          // Standard metronome mode
          const cycleProgress = (elapsed % (spb * 2)) / (spb * 2);

          if (sweep === 'pingpong') {
            if (cycleProgress < 0.5) {
              setProgress(cycleProgress * 2);
            } else {
              setProgress(2 - cycleProgress * 2);
            }
          } else {
            setProgress(cycleProgress);
          }
        }
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };

    // Start the animation loop
    rafIdRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafIdRef.current) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [bpm, isRunning, startTime, sweep, mode]);

  // Calculate marker position directly from progress
  const markerTranslateX = progress * (screenWidth - BAR_PADDING - 20);

  // Calculate color based on progress
  const getMarkerColor = () => {
    if (progress < 0.2) return '#FF4444';
    if (progress < 0.4) return '#FF8844';
    if (progress < 0.6) return '#44FF44';
    if (progress < 0.8) return '#FF8844';
    return '#FF4444';
  };
  const markerColor = getMarkerColor();

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
      <View
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