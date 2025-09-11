import React, { useMemo, useRef, useState } from 'react';
import { View, Text, PanResponder, StyleSheet, LayoutChangeEvent } from 'react-native';

/**
 * Clean BPM slider component with active fill and labels
 */
export default function BpmSlider({ value, onChange, min = 30, max = 100 }) {
  const [width, setWidth] = useState(0);
  const percent = useMemo(() => (value - min) / (max - min), [value, min, max]);

  const onLayout = (e) => {
    setWidth(e.nativeEvent.layout.width);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        // Handle initial touch
        const x = evt.nativeEvent.locationX;
        const newValue = Math.round(min + (x / width) * (max - min));
        const clampedValue = Math.min(Math.max(min, newValue), max);
        onChange(clampedValue);
      },
      onPanResponderMove: (evt) => {
        // Handle drag
        const x = evt.nativeEvent.locationX;
        const newValue = Math.round(min + (x / width) * (max - min));
        const clampedValue = Math.min(Math.max(min, newValue), max);
        onChange(clampedValue);
      },
    })
  ).current;

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{min}</Text>
        <Text style={styles.value}>BPM: {value}</Text>
        <Text style={styles.label}>{max}</Text>
      </View>
      <View
        style={styles.slider}
        onLayout={onLayout}
        {...panResponder.panHandlers}
      >
        {/* Active fill */}
        <View
          style={[
            styles.fill,
            { width: width > 0 ? Math.max(0, width * percent) : 0 },
          ]}
        />
        {/* Thumb */}
        <View
          style={[
            styles.thumb,
            { left: width > 0 ? Math.max(0, width * percent - 14) : 0 },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '60%',
    alignItems: 'center',
    marginBottom: 20,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 8,
  },
  slider: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    width: '100%',
    position: 'relative',
  },
  fill: {
    position: 'absolute',
    height: 4,
    backgroundColor: '#4CAF50',
    borderRadius: 2,
    left: 0,
    top: 0,
  },
  thumb: {
    position: 'absolute',
    top: -12,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  value: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
});