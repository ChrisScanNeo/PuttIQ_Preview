import { Audio } from 'expo-av';

// Simple sample player. Use very short "tick" sample (5–20 ms) for crisp timing.
export class Metronome {
  private sound: Audio.Sound | null = null;
  private bpm = 80;
  private isRunning = false;
  private nextTickAt = 0; // ms (Date.now based)
  private timer: any = null;
  private tickUri: any; // Can be a number (resource ID) or a string (URI)

  constructor(tickUri: any) {
    this.tickUri = tickUri;
  }

  async load() {
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        interruptionModeIOS: 1, // DoNotMix
        shouldDuckAndroid: true,
        staysActiveInBackground: false,
        allowsRecordingIOS: false, // playback-only here
      });
      console.log('[Metronome] Audio mode set.');
    } catch (error) {
      console.error('[Metronome] Error setting audio mode:', error);
      throw error; // Re-throw to propagate the error
    }

    try {
      const { sound } = await Audio.Sound.createAsync({ uri: this.tickUri }, { volume: 1.0 });
      this.sound = sound;
      console.log('[Metronome] Sound created successfully.');
    } catch (error) {
      console.error('[Metronome] Error creating sound:', error);
      throw error; // Re-throw to propagate the error
    }
  }

  setBpm(bpm: number) {
    this.bpm = Math.max(40, Math.min(200, bpm));
  }

  // Schedule next tick a tiny bit ahead using JS timer (good enough once AEC removes echo)
  start() {
    if (this.isRunning || !this.sound) return;
    this.isRunning = true;
    const period = 60000 / this.bpm;
    this.nextTickAt = performance.now() + 200; // start in ~200ms
    const loop = async () => {
      if (!this.isRunning || !this.sound) return;
      const now = performance.now();
      if (now >= this.nextTickAt - 5) {
        // fire
        try { await this.sound.replayAsync(); } catch {}
        this.nextTickAt += period;
      }
      this.timer = requestAnimationFrame(loop);
    };
    this.timer = requestAnimationFrame(loop);
  }

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.timer) cancelAnimationFrame(this.timer);
  }

  getNextTicks(times = 8): number[] {
    // Return absolute times (performance.now ms) for the next N ticks (for leak-guard)
    const out: number[] = [];
    const period = 60000 / this.bpm;
    let t = this.nextTickAt;
    for (let i = 0; i < times; i++) {
      out.push(t);
      t += period;
    }
    return out;
  }

  dispose() {
    this.stop();
    this.sound?.unloadAsync();
    this.sound = null;
  }
}
