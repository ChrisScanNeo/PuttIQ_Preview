import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';

/**
 * Bottom status bar with BPM display, zone indicator, and beat position marker
 */
export default function StatusBar({ bpm, running, periodMs, inZone }) {
  const prog = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!running) {
      prog.stopAnimation();
      prog.setValue(0);
      return;
    }

    let cancelled = false;
    const loop = () => {
      prog.setValue(0);
      Animated.timing(prog, {
        toValue: 1,
        duration: periodMs,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (!finished || cancelled) return;
        loop();
      });
    };

    loop();
    return () => {
      cancelled = true;
      prog.stopAnimation();
    };
  }, [running, periodMs, prog]);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>
        {running ? `${bpm} BPM` : 'TAP BALL TO START'}
      </Text>
      {running && (
        <View style={styles.barRow}>
          {/* Zone indicator dot */}
          <View
            style={[
              styles.zoneDot,
              { backgroundColor: inZone ? '#4CAF50' : '#666666' },
            ]}
          />
          {/* Beat position track and marker */}
          <View style={styles.track}>
            <Animated.View
              style={[
                styles.marker,
                {
                  left: prog.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 96], // 100 - 4 (marker width)
                  }),
                },
              ]}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    minWidth: 180,
    maxWidth: 250,
    minHeight: 50,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 1,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  zoneDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  track: {
    width: 100,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 1,
    position: 'relative',
  },
  marker: {
    position: 'absolute',
    top: -3,
    width: 4,
    height: 8,
    borderRadius: 2,
    backgroundColor: '#fff',
  },
});