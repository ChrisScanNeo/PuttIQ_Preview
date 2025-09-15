import { Audio, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Platform } from 'react-native';
import { nowMs } from './scheduler';
import { loadSprite } from './spriteLoader';

type ScheduledNote = {
  id: string;
  clip: string;         // key in sprite JSON
  tStartMs: number;     // absolute clock time to start
  gainDb?: number;
};

export type AudioMode = 'metronome' | 'tones' | 'wind';

export class AudioEngine {
  private sprites: Map<string, any> = new Map();
  private activePlayers: Map<string, any> = new Map();
  private scheduleAheadMs = Platform.OS === 'ios' ? 120 : 200;
  private running = false;
  private queue: ScheduledNote[] = [];
  private gain = 1.0;
  private tickTimer: NodeJS.Timeout | null = null;
  private currentMode: AudioMode = 'metronome';
  private windPlayer: any = null;
  private isInitialized = false;

  async init() {
    // Configure audio mode for iOS/Android
    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
      interruptionMode: Platform.OS === 'ios' ? 'doNotMix' : 'mixWithOthers',
      shouldPlayInBackground: false,
    });

    // Load all sprites
    const metronomeSprite = await loadSprite('metronome');
    const tonesSprite = await loadSprite('tones');
    const windSprite = await loadSprite('wind');

    this.sprites.set('metronome', metronomeSprite);
    this.sprites.set('tones', tonesSprite);
    this.sprites.set('wind', windSprite);

    this.isInitialized = true;
    console.log('AudioEngine initialized with all sprites');
  }

  setMode(mode: AudioMode) {
    this.currentMode = mode;
    console.log('AudioEngine mode set to:', mode);
  }

  getMode(): AudioMode {
    return this.currentMode;
  }

  setMasterGain(g: number) {
    this.gain = Math.max(0, Math.min(1, g));
  }

  enqueue(n: ScheduledNote) {
    this.queue.push(n);
  }

  clearQueue() {
    this.queue = [];
  }

  async start() {
    if (!this.isInitialized) {
      console.warn('AudioEngine not initialized');
      return;
    }

    this.running = true;

    // Start wind background if in wind mode
    if (this.currentMode === 'wind') {
      await this.startWindBackground();
    }

    this.tick();
    console.log('AudioEngine started in', this.currentMode, 'mode');
  }

  async stop() {
    this.running = false;
    this.queue = [];

    if (this.tickTimer) {
      clearTimeout(this.tickTimer);
      this.tickTimer = null;
    }

    // Stop wind background
    if (this.windPlayer) {
      try {
        await this.windPlayer.stopAsync();
        await this.windPlayer.unloadAsync();
      } catch (error) {
        console.warn('Error stopping wind player:', error);
      }
      this.windPlayer = null;
    }

    // Stop all active players
    for (const [id, player] of this.activePlayers) {
      try {
        await player.stopAsync();
        await player.unloadAsync();
      } catch (error) {
        console.warn(`Error stopping player ${id}:`, error);
      }
    }
    this.activePlayers.clear();

    console.log('AudioEngine stopped');
  }

  private async startWindBackground() {
    if (this.currentMode !== 'wind') return;

    try {
      const windSprite = this.sprites.get('wind');
      if (!windSprite) return;

      // Create looping wind player
      this.windPlayer = createAudioPlayer(windSprite.uri);
      await this.windPlayer.setVolumeAsync(this.gain * 0.3); // Wind at 30% volume
      await this.windPlayer.setIsLoopingAsync(true);
      await this.windPlayer.playAsync();
    } catch (error) {
      console.error('Failed to start wind background:', error);
    }
  }

  private tick = async () => {
    if (!this.running) return;

    const tNow = nowMs();

    // Find events inside look-ahead window
    const due = this.queue.filter(n => n.tStartMs <= tNow + this.scheduleAheadMs);

    for (const n of due) {
      await this.playScheduledNote(n);
    }

    // Remove enqueued
    this.queue = this.queue.filter(n => !due.includes(n));

    // Schedule next tick
    if (this.running) {
      this.tickTimer = setTimeout(this.tick, 20); // Check every 20ms
    }
  };

  private async playScheduledNote(note: ScheduledNote) {
    try {
      // Determine which sprite to use based on clip name
      let sprite: any;
      if (note.clip.startsWith('tone')) {
        sprite = this.sprites.get('tones');
      } else if (note.clip === 'click' || note.clip.startsWith('wind')) {
        sprite = this.sprites.get('wind');
      } else {
        sprite = this.sprites.get('metronome');
      }

      if (!sprite) {
        console.warn('No sprite found for clip:', note.clip);
        return;
      }

      const clipInfo = sprite.map[note.clip];
      if (!clipInfo) {
        console.warn('Clip not found in sprite:', note.clip);
        return;
      }

      // Calculate delay
      const now = nowMs();
      const delayMs = Math.max(0, note.tStartMs - now);

      // Schedule playback
      setTimeout(async () => {
        await this.playClip(sprite, clipInfo, note.gainDb || 0);
      }, delayMs);

    } catch (error) {
      console.error('Failed to play scheduled note:', error);
    }
  }

  private async playClip(sprite: any, clipInfo: any, gainDb: number) {
    try {
      // Create a new player for this clip
      const player = createAudioPlayer(sprite.uri);
      const playerId = `${Date.now()}_${Math.random()}`;
      this.activePlayers.set(playerId, player);

      // Set volume
      const linearGain = this.dbToLin(gainDb) * this.gain;
      await player.setVolumeAsync(linearGain);

      // Seek to clip start and play
      await player.setPositionAsync(clipInfo.start * 1000);
      await player.playAsync();

      // Schedule stop at clip end
      setTimeout(async () => {
        try {
          await player.stopAsync();
          await player.unloadAsync();
          this.activePlayers.delete(playerId);
        } catch (error) {
          console.warn('Error stopping clip:', error);
        }
      }, clipInfo.duration * 1000);

    } catch (error) {
      console.error('Failed to play clip:', error);
    }
  }

  private dbToLin(db: number): number {
    return Math.pow(10, db / 20);
  }

  isRunning(): boolean {
    return this.running;
  }

  getQueueLength(): number {
    return this.queue.length;
  }
}

export default AudioEngine;