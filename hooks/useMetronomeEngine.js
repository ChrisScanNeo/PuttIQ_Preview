import { useEffect, useMemo, useRef, useState } from 'react';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Platform } from 'react-native';

/**
 * Drift-corrected metronome engine with zone helpers (20-80% of beat)
 * Provides precise timing for UI animations and detection zones
 */
export function useMetronomeEngine(bpm, running) {
  const [lastBeatAt, setLastBeatAt] = useState(null);
  const period = useMemo(() => 60000 / bpm, [bpm]); // ms per beat
  const nextRef = useRef(null);
  const timerRef = useRef(null);
  const soundRef = useRef(null);

  // Load metronome sound
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        if (soundRef.current) {
          soundRef.current.release();
          soundRef.current = null;
        }

        // Configure audio mode with platform-specific settings
        await setAudioModeAsync({
          playsInSilentMode: true,
          interruptionMode: 'doNotMix',
          shouldPlayInBackground: false,
          allowsRecording: Platform.OS === 'ios' ? false : true, // iOS: false to use main speaker
        });

        // Load the metronome sound using expo-audio
        const sound = createAudioPlayer(require('../assets/sound/metronome-85688.mp3'));
        sound.volume = 0.7;

        if (!alive) {
          sound.release();
          return;
        }

        soundRef.current = sound;
      } catch (error) {
        console.error('Failed to load metronome sound:', error);
      }
    })();

    return () => {
      alive = false;
      if (soundRef.current) {
        soundRef.current.release();
      }
    };
  }, []);

  // Main metronome loop with drift correction
  useEffect(() => {
    if (!running) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      nextRef.current = null;
      return;
    }

    // Start timing from a future point to avoid initial delay
    const start = Date.now() + 30;
    nextRef.current = start;

    const loop = () => {
      const now = Date.now();
      const next = nextRef.current ?? now;

      // Check if it's time for the next beat (with 4ms tolerance)
      if (now >= next - 4) {
        setLastBeatAt(now);
        
        // Play the metronome sound
        if (soundRef.current) {
          try {
            soundRef.current.seekTo(0);
            soundRef.current.play();
          } catch (error) {
            console.error('Failed to play metronome tick:', error);
          }
        }

        // Schedule next beat
        nextRef.current = next + period;
      }

      // Calculate wait time until next check (with 2ms pre-emption)
      const wait = Math.max(0, (nextRef.current ?? now) - Date.now() - 2);
      timerRef.current = setTimeout(loop, Math.min(wait, 10)); // Check at least every 10ms
    };

    loop();

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [running, period]);

  /**
   * Check if currently in the listening zone (20-80% of beat period)
   * @param {number} timestamp - Optional timestamp to check (defaults to now)
   * @returns {boolean} True if in listening zone
   */
  const inZone = (timestamp = Date.now()) => {
    if (!lastBeatAt) return false;
    const dt = timestamp - lastBeatAt;
    const phase = ((dt % period) + period) % period;
    return phase >= 0.2 * period && phase <= 0.8 * period;
  };

  /**
   * Get current position in beat cycle (0-1)
   * @param {number} timestamp - Optional timestamp to check
   * @returns {number} Position from 0 to 1
   */
  const getBeatPosition = (timestamp = Date.now()) => {
    if (!lastBeatAt) return 0;
    const dt = timestamp - lastBeatAt;
    const phase = ((dt % period) + period) % period;
    return phase / period;
  };

  return {
    lastBeatAt,
    period,
    inZone,
    getBeatPosition,
  };
}