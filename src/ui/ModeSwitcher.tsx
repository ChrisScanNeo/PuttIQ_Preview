import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { AudioMode } from '../audio/audioEngine';

type Props = {
  currentMode: AudioMode;
  onModeChange: (mode: AudioMode) => void;
  disabled?: boolean;
};

const modes: { value: AudioMode; label: string; description: string }[] = [
  {
    value: 'metronome',
    label: 'Simple',
    description: 'Classic metronome',
  },
  {
    value: 'tones',
    label: 'Musical',
    description: 'Melodic tones',
  },
  {
    value: 'wind',
    label: 'Wind',
    description: 'Ambient wind',
  },
];

export default function ModeSwitcher({ currentMode, onModeChange, disabled = false }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sound Mode</Text>
      <View style={styles.buttonRow}>
        {modes.map((mode) => (
          <TouchableOpacity
            key={mode.value}
            style={[
              styles.modeButton,
              currentMode === mode.value && styles.modeButtonActive,
              disabled && styles.modeButtonDisabled,
            ]}
            onPress={() => !disabled && onModeChange(mode.value)}
            disabled={disabled}
          >
            <Text
              style={[
                styles.modeLabel,
                currentMode === mode.value && styles.modeLabelActive,
                disabled && styles.modeLabelDisabled,
              ]}
            >
              {mode.label}
            </Text>
            <Text
              style={[
                styles.modeDescription,
                currentMode === mode.value && styles.modeDescriptionActive,
                disabled && styles.modeDescriptionDisabled,
              ]}
            >
              {mode.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginHorizontal: 5,
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#e8f5e9',
    borderColor: '#4CAF50',
  },
  modeButtonDisabled: {
    opacity: 0.5,
  },
  modeLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginBottom: 2,
  },
  modeLabelActive: {
    color: '#4CAF50',
  },
  modeLabelDisabled: {
    color: '#999',
  },
  modeDescription: {
    fontSize: 11,
    color: '#999',
  },
  modeDescriptionActive: {
    color: '#66BB6A',
  },
  modeDescriptionDisabled: {
    color: '#ccc',
  },
});