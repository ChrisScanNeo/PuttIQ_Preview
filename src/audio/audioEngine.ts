
// audioEngine.ts — Expo SDK 54 / expo-audio
// Cross‑platform (iOS + Android) sprite playback with player pool, warmup, and look‑ahead scheduling.

import { setAudioModeAsync, createAudioPlayer } from 'expo-audio';
import { nowMs } from './scheduler';
import { loadSprite } from './spriteLoader';

export type SpriteName = 'metronome' | 'tones' | 'wind';
export type AudioMode = SpriteName;

export type ClipEvent = {
  id: string;
  sprite: SpriteName;
  clip: string;         // key from sprite JSON
  tStartMs: number;     // absolute time to start
  gain?: number;        // 0..1 (linear), optional
};

type ClipDef = { start: number; duration: number; gain?: number; loop?: boolean };

type Sprite = {
  uri: string;
  map: Record<string, ClipDef>;
};

type PlayerWrap = {
  player: ReturnType<typeof createAudioPlayer>;
  busyUntilMs: number;
  ready: Promise<void>;
};

export class AudioEngine {
  private sprites: Record<SpriteName, Sprite> = {} as any;
  private pools: Record<SpriteName, PlayerWrap[]> = {} as any;
  private queue: ClipEvent[] = [];
  private running = false;
  private destroyed = false;
  private debug = true; // Enable debug logging
  private currentMode: SpriteName = 'metronome';

  // Tune per platform (can be made adaptive after latency calibration)
  private scheduleAheadMs = 140; // iOS 80–140; Android 140–220

  private log(...args: any[]) {
    if (this.debug) console.log('[AudioEngine]', ...args);
  }

  async init() {
    this.log('Initializing AudioEngine...');
    // Audio session
    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
      interruptionMode: 'mixWithOthers', // 'doNotMix' if you prefer
      shouldPlayInBackground: false,
    });
    this.log('Audio mode set');

    // Load sprites and build a small player pool for each
    const names: SpriteName[] = ['metronome', 'tones', 'wind'];
    for (const name of names) {
      const s = await loadSprite(name); // must return { uri, map }
      this.log(`Loaded sprite ${name}:`, s.uri, 'with', Object.keys(s.map).length, 'clips');
      this.sprites[name] = s;
      this.pools[name] = await this.makePool(s.uri, 3); // pool size 3 per sprite
      this.log(`Created pool for ${name} with 3 players`);
    }
    this.log('AudioEngine initialized successfully');
  }

  setScheduleAheadMs(ms: number) {
    // allow runtime tuning (e.g., after calibration)
    this.scheduleAheadMs = Math.max(40, Math.min(350, ms));
  }

  private async makePool(uri: string, n: number): Promise<PlayerWrap[]> {
    const arr: PlayerWrap[] = [];
    for (let i = 0; i < n; i++) {
      const player = createAudioPlayer({ uri });
      // Warmup so iOS is ready to seek immediately
      // Note: play/pause tiny blip reduces first‑seek flakiness on iOS AVPlayer
      const ready = (async () => {
        try {
          this.log(`Warming up player ${i} for sprite`);
          player.seekTo(0);
          await player.play();
          await new Promise((r) => setTimeout(r, 5));
          await player.pause();
          this.log(`Player ${i} warmed up successfully`);
        } catch (error) {
          console.error(`Warmup failed for player ${i}:`, error);
        }
      })();
      arr.push({ player, busyUntilMs: 0, ready });
    }
    return arr;
  }

  enqueue(evt: ClipEvent) {
    this.queue.push(evt);
  }

  clearQueue() {
    this.queue = [];
  }

  setMode(mode: SpriteName) {
    this.currentMode = mode;
  }

  getMode(): SpriteName {
    return this.currentMode;
  }

  start() {
    if (this.running) return;
    this.log('Starting audio engine, queue size:', this.queue.length);
    this.running = true;
    this.tick();
  }

  stop() {
    this.log('Stopping audio engine');
    this.running = false;
  }

  async destroy() {
    this.running = false;
    this.destroyed = true;
    // Proper disposal for expo-audio players
    for (const pool of Object.values(this.pools)) {
      for (const w of pool) {
        try { await w.player.pause(); } catch {}
        try { await w.player.release(); } catch {}
      }
    }
  }

  private takeFree(sprite: SpriteName, tUseMs: number): PlayerWrap | null {
    const pool = this.pools[sprite];
    if (!pool) return null;
    const w = pool.find(p => p.busyUntilMs <= tUseMs) || null;
    return w;
  }

  private tick = async () => {
    if (!this.running || this.destroyed) return;
    const tNow = nowMs();
    const due = this.queue.filter(n => n.tStartMs <= tNow + this.scheduleAheadMs);

    for (const n of due) {
      const sprite = this.sprites[n.sprite];
      const clip = sprite?.map[n.clip];
      if (!clip) continue;

      const w = this.takeFree(n.sprite, n.tStartMs);
      if (!w) continue; // if pool saturated, skip (or log)

      // mark player busy for the window of this clip
      w.busyUntilMs = n.tStartMs + clip.duration * 1000 + 20;

      const delayMs = Math.max(0, n.tStartMs - tNow);
      const offsetSec = clip.start;
      const durMs = Math.max(1, Math.floor(clip.duration * 1000));
      const linearGain = clamp01(n.gain ?? 1);

      // ensure warmed
      await w.ready;

      setTimeout(async () => {
        try {
          this.log(`Playing clip ${n.clip} from sprite ${n.sprite} at offset ${offsetSec}s, delay ${delayMs}ms`);
          w.player.seekTo(offsetSec); // REQUIRED each replay with sprite files
          // expo-audio uses property for volume (0..1)
          try {
            (w.player as any).volume = linearGain;
            this.log(`Set volume to ${linearGain}`);
          } catch (e) {
            console.error('Failed to set volume:', e);
          }
          await w.player.play();
          this.log(`Started playing ${n.clip}`);

          setTimeout(async () => {
            try {
              await w.player.pause();
              this.log(`Paused ${n.clip} after ${durMs}ms`);
            } catch (e) {
              console.error(`Failed to pause ${n.clip}:`, e);
            }
          }, durMs);
        } catch (error) {
          console.error(`Failed to play clip ${n.clip}:`, error);
        }
      }, delayMs);
    }

    // remove enqueued
    if (due.length) {
      const set = new Set(due);
      this.queue = this.queue.filter(n => !set.has(n));
    }

    // Continue loop
    if (this.running && !this.destroyed) {
      // 20ms tick balances CPU & jitter
      setTimeout(this.tick, 20);
    }
  };
}

function clamp01(x: number) {
  return Math.max(0, Math.min(1, x));
}
