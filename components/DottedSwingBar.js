import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Animated, Easing, LayoutChangeEvent } from 'react-native';

/**
 * Top dotted timer bar that sweeps back and forth with animated dots
 * Dots "light up" as the marker passes over them
 */
export default function DottedSwingBar({ periodMs, running }) {
  const anim = useRef(new Animated.Value(0)).current; // 0..1 along the bar
  const widthRef = useRef(0);
  const dots = 36; // Number of dots for the "dotted" appearance
  const dotArray = useMemo(() => Array.from({ length: dots }), [dots]);

  useEffect(() => {
    if (!running) {
      anim.stopAnimation();
      return;
    }

    let dir = 1; // 1 for left→right, -1 for right→left
    const half = periodMs; // One period for each direction
    let cancelled = false;

    const tick = () => {
      Animated.timing(anim, {
        toValue: dir === 1 ? 1 : 0,
        duration: half,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (!finished || cancelled) return;
        dir = dir === 1 ? -1 : 1;
        tick();
      });
    };

    tick();
    return () => {
      cancelled = true;
      anim.stopAnimation();
    };
  }, [periodMs, running, anim]);

  const onLayout = (e) => {
    widthRef.current = e.nativeEvent.layout.width;
  };

  return (
    <View onLayout={onLayout} style={styles.container}>
      {/* Render dots that light up as marker passes */}
      {dotArray.map((_, i) => {
        const t = i / (dots - 1);
        // Each dot "lights" when the marker is near
        const opacity = anim.interpolate({
          inputRange: [Math.max(0, t - 0.05), t, Math.min(1, t + 0.05)],
          outputRange: [0.25, 1, 0.25],
          extrapolate: 'clamp',
        });
        return (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                left: `${t * 100}%`,
                opacity,
              },
            ]}
          />
        );
      })}

      {/* Moving head marker */}
      <Animated.View
        style={[
          styles.head,
          {
            transform: [
              {
                translateX: anim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, -12],
                }),
              },
            ],
            left: anim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    marginTop: 10,
    marginBottom: 20,
    width: '92%',
    alignSelf: 'center',
    position: 'relative',
  },
  dot: {
    position: 'absolute',
    top: 7,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#f0fff0',
  },
  head: {
    position: 'absolute',
    top: 2,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#4CAF50',
    shadowColor: '#4CAF50',
    shadowOpacity: 0.8,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
});