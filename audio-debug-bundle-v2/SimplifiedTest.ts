// SIMPLIFIED TEST VERSION - Minimal code to test audio playback
// This removes all complexity to isolate the issue

import { Audio } from 'expo-av';

export class SimplifiedAudioTest {
  private testSound: Audio.Sound | null = null;
  private clickCount = 0;

  async init() {
    console.log('[SimpleTest] Initializing...');

    // Set audio mode
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: false,
      playThroughEarpieceAndroid: false,
    });

    // Load one sound
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/Metronome/ToneClick.mp3'),
        {
          shouldPlay: false,
          volume: 1.0,
        }
      );
      this.testSound = sound;
      console.log('[SimpleTest] Sound loaded successfully');
    } catch (error) {
      console.error('[SimpleTest] Failed to load sound:', error);
    }
  }

  async playClick() {
    if (!this.testSound) {
      console.error('[SimpleTest] No sound loaded');
      return;
    }

    try {
      this.clickCount++;
      console.log(`[SimpleTest] Playing click #${this.clickCount}`);

      // Reset position
      await this.testSound.setPositionAsync(0);

      // Play
      const result = await this.testSound.playAsync();
      console.log('[SimpleTest] Play result:', result);

    } catch (error) {
      console.error('[SimpleTest] Play failed:', error);
    }
  }

  // Simple metronome - plays every 750ms (80 BPM)
  startSimpleMetronome() {
    console.log('[SimpleTest] Starting simple metronome at 80 BPM');

    const interval = setInterval(async () => {
      await this.playClick();

      // Stop after 10 clicks
      if (this.clickCount >= 10) {
        clearInterval(interval);
        console.log('[SimpleTest] Stopped after 10 clicks');
      }
    }, 750);
  }

  async destroy() {
    if (this.testSound) {
      await this.testSound.unloadAsync();
    }
  }
}

// Usage in HomeScreenMinimal.js:
/*
import { SimplifiedAudioTest } from './SimplifiedTest';

// In component:
const simpleTestRef = useRef(null);

useEffect(() => {
  const initSimple = async () => {
    simpleTestRef.current = new SimplifiedAudioTest();
    await simpleTestRef.current.init();
  };
  initSimple();

  return () => {
    if (simpleTestRef.current) {
      simpleTestRef.current.destroy();
    }
  };
}, []);

// In handlePlayPause:
if (simpleTestRef.current) {
  simpleTestRef.current.startSimpleMetronome();
}
*/