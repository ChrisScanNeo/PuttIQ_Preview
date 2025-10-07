// SimpleAudioEngine.ts - A simpler approach for iOS compatibility
import { createAudioPlayer, setAudioModeAsync, useAudioPlayer } from 'expo-audio';
import { Platform } from 'react-native';

export type AudioMode = 'metronome' | 'tones' | 'wind';

interface QueuedBeat {
  id: string;
  time: number; // absolute time in ms
  mode: AudioMode;
}

export class SimpleAudioEngine {
  private players: any[] = [];
  private currentPlayerIndex = 0;
  private poolSize = 6; // More players for overlapping sounds
  private queue: QueuedBeat[] = [];
  private running = false;
  private tickInterval: NodeJS.Timeout | null = null;
  private debug = true;

  private log(...args: any[]) {
    if (this.debug) console.log('[SimpleAudio]', ...args);
  }

  async init() {
    this.log('Initializing SimpleAudioEngine...');

    // Configure audio mode
    await setAudioModeAsync({
      playsInSilentMode: true,
      allowsRecording: false,
      interruptionMode: Platform.OS === 'ios' ? 'doNotMix' : 'mixWithOthers',
      shouldPlayInBackground: false,
    });

    // Create a pool of players with the existing metronome sound
    const audioSource = require('../../assets/sounds/Metronome/ToneClick.mp3');

    for (let i = 0; i < this.poolSize; i++) {
      try {
        const player = createAudioPlayer(audioSource);
        player.volume = 0.7;
        this.players.push(player);
        this.log(`Created player ${i}`);
      } catch (error) {
        console.error(`Failed to create player ${i}:`, error);
      }
    }

    this.log(`SimpleAudioEngine initialized with ${this.players.length} players`);
  }

  enqueue(beat: QueuedBeat) {
    this.queue.push(beat);
  }

  start() {
    if (this.running) return;
    this.log('Starting engine, queue size:', this.queue.length);
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
    this.players.forEach(player => {
      try {
        player.pause();
      } catch (e) {
        // Ignore
      }
    });
  }

  private startTicking() {
    // Check every 10ms for beats to play
    this.tickInterval = setInterval(() => {
      if (!this.running) {
        if (this.tickInterval) {
          clearInterval(this.tickInterval);
          this.tickInterval = null;
        }
        return;
      }

      const now = Date.now();

      // Find beats that should play now (within 10ms window)
      const dueBeat = this.queue.find(beat => {
        const diff = beat.time - now;
        return diff <= 10 && diff > -50; // Play if within 10ms future or up to 50ms past
      });

      if (dueBeat) {
        this.playBeat(dueBeat);
        // Remove from queue
        this.queue = this.queue.filter(b => b.id !== dueBeat.id);
      }
    }, 10);
  }

  private async playBeat(beat: QueuedBeat) {
    try {
      // Get next player from pool
      const player = this.players[this.currentPlayerIndex];
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.poolSize;

      this.log(`Playing beat ${beat.id} with player ${this.currentPlayerIndex}`);

      // Reset and play
      player.seekTo(0);
      await player.play();

      // For different modes, we could adjust volume or duration
      // For now, just play the metronome sound

    } catch (error) {
      console.error('Failed to play beat:', error);
    }
  }

  async destroy() {
    this.stop();

    // Release all players
    for (const player of this.players) {
      try {
        await player.release();
      } catch (e) {
        // Ignore
      }
    }

    this.players = [];
  }
}

// Simple scheduler function
export function scheduleBeats(
  engine: SimpleAudioEngine,
  bpm: number,
  bars: number,
  beatsPerBar: number,
  mode: AudioMode
) {
  const msPerBeat = 60000 / bpm;
  const totalBeats = bars * beatsPerBar;
  const startTime = Date.now() + 500; // Start in 500ms

  console.log('[SimpleScheduler] Scheduling:', {
    bpm,
    totalBeats,
    msPerBeat,
    mode
  });

  for (let i = 0; i < totalBeats; i++) {
    engine.enqueue({
      id: `beat-${i}`,
      time: startTime + (i * msPerBeat),
      mode
    });
  }

  engine.start();
}

export function stopBeats(engine: SimpleAudioEngine) {
  engine.stop();
}