// PuttingAudioEngine.ts - Multi-sound audio engine for putting rhythm training
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { Platform } from 'react-native';

export type AudioMode = 'metronome' | 'tones' | 'wind';

interface QueuedSound {
  id: string;
  time: number; // absolute time in ms
  soundType: 'ready' | 'back' | 'swing' | 'click';
  mode: AudioMode;
}

interface SoundPlayer {
  player: any;
  inUse: boolean;
}

export class PuttingAudioEngine {
  private soundPools: Map<string, SoundPlayer[]> = new Map();
  private poolSize = 5; // Increased players per sound type
  private queue: QueuedSound[] = [];
  private running = false;
  private tickInterval: NodeJS.Timeout | null = null;
  private debug = true;
  private soundSources: Map<string, any> = new Map();

  private log(...args: any[]) {
    if (this.debug) console.log('[PuttingAudio]', ...args);
  }

  async init() {
    this.log('Initializing PuttingAudioEngine...');

    // Configure audio mode
    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
      interruptionMode: Platform.OS === 'ios' ? 'doNotMix' : 'mixWithOthers',
      shouldPlayInBackground: false,
    });

    // Define all sound files - check if files exist first
    const soundFiles: Record<string, any> = {};

    try {
      // Metronome mode
      soundFiles['metronome-click'] = require('../../assets/sounds/Metronome/ToneClick.mp3');
    } catch (e) {
      console.error('[PuttingAudio] Failed to load Metronome/ToneClick.mp3');
    }

    try {
      // Tones mode - note the capital letters in filenames
      soundFiles['tones-ready'] = require('../../assets/sounds/tones/ToneReady.mp3');
      soundFiles['tones-back'] = require('../../assets/sounds/tones/ToneBack.mp3');
      soundFiles['tones-swing'] = require('../../assets/sounds/tones/ToneSwing.mp3');
    } catch (e) {
      console.error('[PuttingAudio] Failed to load tones sounds:', e);
    }

    try {
      // Wind mode - Note: WindSSwing has double S
      soundFiles['wind-ready'] = require('../../assets/sounds/wind/WindReady.mp3');
      soundFiles['wind-back'] = require('../../assets/sounds/wind/WindBack.mp3');
      soundFiles['wind-swing'] = require('../../assets/sounds/wind/WindSSwing.mp3'); // Double S in filename
      soundFiles['wind-click'] = require('../../assets/sounds/wind/WindClick.mp3');
    } catch (e) {
      console.error('[PuttingAudio] Failed to load wind sounds:', e);
    }

    console.log('[PuttingAudio] Loaded sound files:', Object.keys(soundFiles));

    // Store sound sources
    for (const [key, source] of Object.entries(soundFiles)) {
      this.soundSources.set(key, source);
    }

    // Create player pools for each sound
    for (const [soundKey, source] of Object.entries(soundFiles)) {
      const pool: SoundPlayer[] = [];

      for (let i = 0; i < this.poolSize; i++) {
        try {
          const player = createAudioPlayer(source) as any;

          // Debug: Check what type of player we got
          if (i === 0) {
            console.log(`[PuttingAudio] Player type for ${soundKey}:`, typeof player);
            console.log(`[PuttingAudio] Player methods:`, Object.keys(player));
          }

          // Set volume
          player.volume = 0.8;

          pool.push({ player, inUse: false });
          this.log(`Created player ${i} for ${soundKey}`);
        } catch (error) {
          console.error(`Failed to create player for ${soundKey}:`, error);
        }
      }

      if (pool.length === 0) {
        console.error(`[PuttingAudio] ❌ Failed to create any players for ${soundKey}`);
      }

      this.soundPools.set(soundKey, pool);
    }

    this.log('PuttingAudioEngine initialized successfully');
  }

  private getSoundKey(mode: AudioMode, soundType: string): string {
    if (mode === 'metronome' && soundType === 'click') {
      return 'metronome-click';
    }

    // For ready/back/swing sounds
    if (soundType === 'ready' || soundType === 'back' || soundType === 'swing') {
      return `${mode}-${soundType}`;
    }

    // For wind mode clicks
    if (mode === 'wind' && soundType === 'click') {
      return 'wind-click';
    }

    return `${mode}-${soundType}`;
  }

  private getAvailablePlayer(soundKey: string): SoundPlayer | null {
    const pool = this.soundPools.get(soundKey);
    if (!pool) {
      this.log(`No pool found for ${soundKey}`);
      return null;
    }

    // Find first available player
    const player = pool.find(p => !p.inUse);
    if (player) {
      player.inUse = true;
      // Reset after sound duration (approximate)
      setTimeout(() => {
        player.inUse = false;
      }, 300); // Reduced to 300ms for quicker reuse
    }
    return player || null;
  }

  enqueueSound(sound: QueuedSound) {
    this.queue.push(sound);
  }

  start() {
    if (this.running) return;
    this.log('Starting engine');
    this.running = true;
    this.startTicking();
  }

  stop() {
    this.log('Stopping engine');
    this.running = false;
    this.queue = [];

    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    // Stop all players
    for (const pool of this.soundPools.values()) {
      for (const { player } of pool) {
        try {
          player.pause();
        } catch (e) {
          // Ignore
        }
      }
    }
  }

  private startTicking() {
    // Check every 10ms for sounds to play
    this.tickInterval = setInterval(() => {
      if (!this.running) {
        if (this.tickInterval) {
          clearInterval(this.tickInterval);
          this.tickInterval = null;
        }
        return;
      }

      const now = Date.now();

      // Find sounds that should play now (within 20ms window)
      const dueSounds = this.queue.filter(sound => {
        const diff = sound.time - now;
        return diff <= 20 && diff > -50;
      });

      for (const sound of dueSounds) {
        this.playSound(sound);
        // Remove from queue
        this.queue = this.queue.filter(s => s.id !== sound.id);
      }
    }, 10);
  }

  private async playSound(sound: QueuedSound) {
    const soundKey = this.getSoundKey(sound.mode, sound.soundType);
    const player = this.getAvailablePlayer(soundKey);

    if (!player) {
      console.error(`[PuttingAudio] ❌ No available player for ${soundKey}`);
      return;
    }

    try {
      this.log(`Playing ${sound.soundType} for ${sound.mode} mode`);

      // Try different approach for iOS - pause first, then reset
      try {
        await player.player.pause();
      } catch (e) {
        // Ignore if already paused
      }

      // For expo-audio, seekTo and play are direct methods
      // Reset position to start
      player.player.seekTo(0);

      // Play the sound
      await player.player.play();

      this.log(`✅ Successfully played ${soundKey}`);
    } catch (error) {
      console.error(`[PuttingAudio] ❌ Failed to play ${soundKey}:`, error);
      console.error('Player state:', player.player);
      // Try to recover the player
      try {
        player.player.pause();
        player.inUse = false;
      } catch (e) {
        // Ignore recovery errors
      }
    }
  }

  async destroy() {
    this.stop();

    // Release all players
    for (const pool of this.soundPools.values()) {
      for (const { player } of pool) {
        try {
          await player.player.release();
        } catch (e) {
          // Ignore
        }
      }
    }

    this.soundPools.clear();
  }
}

// Helper function to schedule putting sequence
export function schedulePuttingSequence(
  engine: PuttingAudioEngine,
  bpm: number,
  mode: AudioMode,
  bars: number = 100
) {
  // Each movement takes exactly 1 beat at the BPM rate
  const msPerBeat = 60000 / bpm;
  const totalBeats = bars * 3; // 3 beats per complete stroke cycle

  const startTime = Date.now() + 500; // Start in 500ms

  console.log('[PuttingScheduler] ⏰ TIMING DEBUG:', {
    bpm,
    msPerBeat: `${msPerBeat}ms`,
    mode,
    startTime: new Date(startTime).toISOString(),
    startTimeMs: startTime,
    currentTime: Date.now(),
    delayUntilStart: startTime - Date.now(),
    sequence: 'RIGHT(start) -> LEFT(ready) -> RIGHT(back) -> LEFT(impact) -> repeat'
  });

  // Schedule sounds at exact beat intervals
  // Pattern: Start(RIGHT) -> Ready(LEFT) -> Back(RIGHT) -> Impact(LEFT) -> repeat

  // Position alternates: Beat 0=RIGHT, 1=LEFT, 2=RIGHT, 3=LEFT, etc.
  // Sound pattern: Start, Ready, Back, Impact, Ready, Back, Impact...

  for (let beat = 0; beat <= Math.min(30, totalBeats); beat++) { // Limit for debugging
    const beatTime = startTime + (beat * msPerBeat);

    // Simple position calculation: even beats = RIGHT, odd beats = LEFT
    const isAtRight = (beat % 2) === 0;

    // Debug log for first few beats
    if (beat < 5) {
      console.log(`[PuttingScheduler] Beat ${beat}: ${isAtRight ? 'RIGHT' : 'LEFT'} at ${beatTime}ms (${new Date(beatTime).toISOString()})`);
    }

    // Click at every beat (every endpoint)
    engine.enqueueSound({
      id: `beat-${beat}-click`,
      time: beatTime,
      soundType: 'click',
      mode: mode === 'tones' ? 'wind' : mode
    });

    // Add the appropriate tone sound (except for metronome mode)
    if (mode !== 'metronome') {
      let soundType: string | null = null;

      if (beat === 0) {
        // Beat 0: Just click at RIGHT (start position)
        soundType = null;
      } else if (beat === 1) {
        // Beat 1: LEFT - Ready
        soundType = 'ready';
      } else if (beat === 2) {
        // Beat 2: RIGHT - Backswing
        soundType = 'back';
      } else if (beat === 3) {
        // Beat 3: LEFT - Impact
        soundType = 'swing';
      } else {
        // Beat 4+: Repeat pattern (ready, back, swing)
        const cyclePosition = ((beat - 1) % 3);
        soundType = ['ready', 'back', 'swing'][cyclePosition];
      }

      if (soundType) {
        engine.enqueueSound({
          id: `beat-${beat}-${soundType}`,
          time: beatTime + 20, // Small delay after click
          soundType: soundType as any,
          mode
        });
      }
    }
  }

  engine.start();
}

export function stopPuttingSequence(engine: PuttingAudioEngine) {
  engine.stop();
}
