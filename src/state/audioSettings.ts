import AsyncStorage from '@react-native-async-storage/async-storage';
import { AudioMode } from '../audio/audioEngine';

const STORAGE_KEY = '@PuttIQ:audioSettings';

export interface AudioSettings {
  mode: AudioMode;
  bpm: number;
  volume: number;
  beatsPerBar: number;
  bars: number;
}

const defaultSettings: AudioSettings = {
  mode: 'metronome',
  bpm: 80,
  volume: 0.7,
  beatsPerBar: 4,
  bars: 100, // Plenty of bars for continuous practice
};

/**
 * Load audio settings from storage
 */
export async function loadAudioSettings(): Promise<AudioSettings> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...defaultSettings, ...parsed };
    }
  } catch (error) {
    console.error('Failed to load audio settings:', error);
  }
  return defaultSettings;
}

/**
 * Save audio settings to storage
 */
export async function saveAudioSettings(settings: Partial<AudioSettings>): Promise<void> {
  try {
    const current = await loadAudioSettings();
    const updated = { ...current, ...settings };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Failed to save audio settings:', error);
  }
}

/**
 * Reset to default settings
 */
export async function resetAudioSettings(): Promise<AudioSettings> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSettings));
  } catch (error) {
    console.error('Failed to reset audio settings:', error);
  }
  return defaultSettings;
}

export default {
  loadAudioSettings,
  saveAudioSettings,
  resetAudioSettings,
  defaultSettings,
};