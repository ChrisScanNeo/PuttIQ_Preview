import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

/**
 * TimingZoneBar - Visual feedback for putt timing with listening zone display
 * Shows a moving ball across the beat period with the detection zone highlighted
 */
export default function TimingZoneBar({ 
  isPlaying = false,
  bpm = 40,
  currentPosition = 0,  // 0.0 to 1.0 position in beat
  listeningZone = { start: 0.3, end: 0.7 },
  lastHitPosition = null,
  hitHistory = [],
  style
}) {
  const animatedPosition = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const hitMarkerAnim = useRef(new Animated.Value(0)).current;

  // Constants for layout
  const barHeight = 60;
  const barPadding = 20;
  const barWidth = screenWidth - (barPadding * 2);
  const ballSize = 20;

  // Update ball position smoothly
  useEffect(() => {
    if (isPlaying) {
      Animated.timing(animatedPosition, {
        toValue: currentPosition,
        duration: 16, // ~60fps updates
        useNativeDriver: true,
      }).start();
    } else {
      animatedPosition.setValue(0);
    }
  }, [currentPosition, isPlaying]);

  // Pulse animation when hit is detected
  useEffect(() => {
    if (lastHitPosition !== null) {
      // Trigger hit marker animation
      Animated.sequence([
        Animated.timing(hitMarkerAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(hitMarkerAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [lastHitPosition]);

  // Calculate zone positions
  const zoneStartX = barWidth * listeningZone.start;
  const zoneEndX = barWidth * listeningZone.end;
  const zoneWidth = zoneEndX - zoneStartX;
  const centerX = barWidth * 0.5;

  // Determine hit accuracy color
  const getHitColor = (position) => {
    const centerDiff = Math.abs(position - 0.5);
    if (centerDiff < 0.05) return '#4CAF50'; // Green - Perfect
    if (centerDiff < 0.1) return '#FFC107';  // Yellow - Good
    if (centerDiff < 0.15) return '#FF9800'; // Orange - OK
    return '#F44336'; // Red - Poor
  };

  // Get timing text
  const getTimingText = () => {
    if (!lastHitPosition) return '';
    const diff = lastHitPosition - 0.5;
    if (Math.abs(diff) < 0.05) return 'PERFECT!';
    if (diff < 0) return `EARLY ${Math.abs(diff * 100).toFixed(0)}%`;
    return `LATE ${Math.abs(diff * 100).toFixed(0)}%`;
  };

  return (
    <View style={[styles.container, style]}>
      {/* Title and BPM */}
      <View style={styles.header}>
        <Text style={styles.title}>Timing Zone</Text>
        <Text style={styles.bpm}>{bpm} BPM</Text>
      </View>

      {/* Main timing bar */}
      <View style={styles.barContainer}>
        {/* Background track */}
        <View style={[styles.track, { width: barWidth }]}>
          {/* Listening zone highlight */}
          <View 
            style={[
              styles.listeningZone, 
              {
                left: zoneStartX,
                width: zoneWidth,
              }
            ]}
          />

          {/* Center line (perfect timing) */}
          <View style={[styles.centerLine, { left: centerX }]} />

          {/* Zone boundary markers */}
          <View style={[styles.zoneBoundary, { left: zoneStartX }]} />
          <View style={[styles.zoneBoundary, { left: zoneEndX }]} />

          {/* Zone labels */}
          <Text style={[styles.zoneLabel, { left: zoneStartX - 20 }]}>
            {(listeningZone.start * 100).toFixed(0)}%
          </Text>
          <Text style={[styles.zoneLabel, { left: zoneEndX - 20 }]}>
            {(listeningZone.end * 100).toFixed(0)}%
          </Text>
          <Text style={[styles.centerLabel, { left: centerX - 25 }]}>
            CENTER
          </Text>

          {/* Recent hit markers */}
          {hitHistory.slice(-5).map((hit, index) => (
            <View
              key={index}
              style={[
                styles.hitMarker,
                {
                  left: barWidth * hit.position - 4,
                  backgroundColor: getHitColor(hit.position),
                  opacity: 0.3 + (index * 0.15), // Fade older hits
                }
              ]}
            />
          ))}

          {/* Last hit marker (animated) */}
          {lastHitPosition && (
            <Animated.View
              style={[
                styles.lastHitMarker,
                {
                  left: barWidth * lastHitPosition - 6,
                  backgroundColor: getHitColor(lastHitPosition),
                  opacity: hitMarkerAnim,
                  transform: [{
                    scale: hitMarkerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [1, 1.5],
                    })
                  }]
                }
              ]}
            />
          )}

          {/* Moving ball */}
          <Animated.View
            style={[
              styles.ball,
              {
                transform: [{
                  translateX: animatedPosition.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, barWidth - ballSize],
                  }),
                }],
              }
            ]}
          />
        </View>
      </View>

      {/* Timing feedback text */}
      {lastHitPosition && (
        <Animated.View style={[styles.feedbackContainer, { opacity: hitMarkerAnim }]}>
          <Text style={[
            styles.feedbackText,
            { color: getHitColor(lastHitPosition) }
          ]}>
            {getTimingText()}
          </Text>
        </Animated.View>
      )}

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#90EE90' }]} />
          <Text style={styles.legendText}>Detection Zone</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#4CAF50' }]} />
          <Text style={styles.legendText}>Perfect Timing</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 15,
    marginVertical: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  bpm: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  barContainer: {
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  track: {
    height: 40,
    backgroundColor: '#e0e0e0',
    borderRadius: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  listeningZone: {
    position: 'absolute',
    height: '100%',
    backgroundColor: '#90EE90',
    opacity: 0.3,
  },
  centerLine: {
    position: 'absolute',
    width: 2,
    height: '100%',
    backgroundColor: '#4CAF50',
    opacity: 0.8,
  },
  zoneBoundary: {
    position: 'absolute',
    width: 1,
    height: '100%',
    backgroundColor: '#666',
    opacity: 0.5,
  },
  zoneLabel: {
    position: 'absolute',
    top: -20,
    fontSize: 10,
    color: '#666',
    width: 40,
    textAlign: 'center',
  },
  centerLabel: {
    position: 'absolute',
    bottom: -20,
    fontSize: 10,
    color: '#4CAF50',
    fontWeight: '600',
    width: 50,
    textAlign: 'center',
  },
  ball: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#2196F3',
    top: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  hitMarker: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    top: 16,
  },
  lastHitMarker: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    top: 14,
    elevation: 2,
  },
  feedbackContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  feedbackText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 15,
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 5,
  },
  legendText: {
    fontSize: 11,
    color: '#666',
  },
});