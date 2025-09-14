import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Platform } from 'react-native';

/**
 * Control bars with correct icon layout:
 * Top: Plus | BPM | Minus
 * Bottom: Metronome | Music | Wind
 */
export default function ControlBars({ bpm, onBpmIncrease, onBpmDecrease, onMetronome, onMusic, onWind }) {
  return (
    <View style={styles.container}>
      {/* Top control bar - BPM controls */}
      <View style={styles.controlBar}>
        <TouchableOpacity 
          style={styles.section}
          onPress={onBpmDecrease}
        >
          <Image
            source={require('../screens/icons/minus.png')}
            style={styles.iconImage}
            tintColor="#333"
            resizeMode="contain"
          />
        </TouchableOpacity>
        
        <View style={styles.divider} />
        
        <View style={styles.section}>
          <Text style={styles.bpmText}>{bpm}</Text>
        </View>
        
        <View style={styles.divider} />
        
        <TouchableOpacity 
          style={styles.section}
          onPress={onBpmIncrease}
        >
          <Image
            source={require('../screens/icons/plus-symbol-button.png')}
            style={styles.iconImage}
            tintColor="#333"
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>

      {/* Bottom control bar - Feature controls */}
      <View style={[styles.controlBar, styles.bottomBar]}>
        <TouchableOpacity 
          style={styles.section}
          onPress={onMetronome}
        >
          <Image
            source={require('../screens/icons/metronome.png')}
            style={styles.iconImageLarge}
            tintColor="#333"
            resizeMode="contain"
          />
        </TouchableOpacity>
        
        <View style={styles.divider} />
        
        <TouchableOpacity 
          style={styles.section}
          onPress={onMusic}
        >
          <Image
            source={require('../screens/icons/musical-note.png')}
            style={styles.iconImageLarge}
            tintColor="#333"
            resizeMode="contain"
          />
        </TouchableOpacity>
        
        <View style={styles.divider} />
        
        <TouchableOpacity 
          style={styles.section}
          onPress={onWind}
        >
          <Image
            source={require('../screens/icons/wind.png')}
            style={styles.iconImageLarge}
            tintColor="#333"
            resizeMode="contain"
          />
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
    ...Platform.select({
      web: {
        boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.1)',
      },
      default: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
      }
    }),
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
  iconImage: {
    width: 20,
    height: 20,
  },
  iconImageLarge: {
    width: 24,
    height: 24,
  },
  bpmText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
});