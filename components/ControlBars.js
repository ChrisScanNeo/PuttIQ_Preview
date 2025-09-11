import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

/**
 * Simplified control bars for play/pause, BPM, and settings
 */
export default function ControlBars({ isPlaying, onPlayPause, bpm, onSettings, onMetronome }) {
  return (
    <View style={styles.container}>
      {/* Top control bar */}
      <View style={styles.controlBar}>
        <TouchableOpacity 
          style={styles.section}
          onPress={onPlayPause}
        >
          <Text style={styles.icon}>{isPlaying ? '⏸' : '▶'}</Text>
        </TouchableOpacity>
        
        <View style={styles.divider} />
        
        <View style={styles.section}>
          <Text style={styles.bpmText}>{bpm}</Text>
        </View>
        
        <View style={styles.divider} />
        
        <TouchableOpacity 
          style={styles.section}
          onPress={onSettings}
        >
          <Text style={styles.icon}>⚙</Text>
        </TouchableOpacity>
      </View>

      {/* Bottom control bar */}
      <View style={[styles.controlBar, styles.bottomBar]}>
        <TouchableOpacity 
          style={styles.section}
          onPress={onMetronome}
        >
          <Text style={styles.icon}>🔊</Text>
        </TouchableOpacity>
        
        <View style={styles.divider} />
        
        <TouchableOpacity style={styles.section}>
          <Text style={styles.icon}>🎵</Text>
        </TouchableOpacity>
        
        <View style={styles.divider} />
        
        <TouchableOpacity style={styles.section}>
          <Text style={styles.icon}>📊</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 40,
    width: '80%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  controlBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 25,
    height: 50,
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  bottomBar: {
    marginTop: 10,
  },
  section: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  divider: {
    width: 1,
    height: '60%',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
  },
  icon: {
    fontSize: 24,
  },
  bpmText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
});