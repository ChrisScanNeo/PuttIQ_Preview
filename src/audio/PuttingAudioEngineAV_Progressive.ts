// Progressive scheduling version - only schedules sounds within a rolling window
// This prevents huge queue buildup and GC spikes

import { Audio, InterruptionModeIOS, InterruptionModeAndroid } from 'expo-av';
import { Platform } from 'react-native';

export type AudioMode = 'metronome' | 'tones' | 'wind';

interface QueuedSound {
  id: string;
  time: number; // absolute time in ms
  soundType: 'ready' | 'back' | 'swing' | 'click';
  mode: AudioMode;
}

interface SoundPlayer {
  sound: Audio.Sound;
  inUse: boolean;
  soundType: string;
}

export class PuttingAudioEngineProgressive {
  private soundPools: Map<string, SoundPlayer[]> = new Map();
  private poolSize = 5; // Increased from 3 for better availability
  private queue: QueuedSound[] = [];
  private running = false;
  private tickInterval: NodeJS.Timeout | null = null;
  private debug = true;
  private initComplete = false;

  // Progressive scheduling state
  private startTime: number = 0;
  private bpm: number = 80;
  private mode: AudioMode = 'metronome';
  private nextBeatToSchedule: number = 0;
  private scheduleAheadMs = 150; // Only schedule 150ms ahead
  private maxBars = 100; // Maximum bars to play

  private log(...args: any[]) {
    if (this.debug) console.log('[PuttingAudioProgressive]', ...args);
  }

  async init() {
    this.log('Initializing Progressive PuttingAudioEngine...');

    // Configure audio mode for iOS and Android
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: InterruptionModeIOS.DuckOthers,
        interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      });
      this.log('Audio mode configured successfully');
    } catch (error) {
      console.error('[PuttingAudioProgressive] Failed to set audio mode:', error);
    }

    // Define all sound files
    const soundFiles = {
      // Metronome mode
      'metronome-click': require('../../assets/sounds/Metronome/ToneClick.mp3'),

      // Tones mode
      'tones-ready': require('../../assets/sounds/tones/ToneReady.mp3'),
      'tones-back': require('../../assets/sounds/tones/ToneBack.mp3'),
      'tones-swing': require('../../assets/sounds/tones/ToneSwing.mp3'),

      // Wind mode
      'wind-ready': require('../../assets/sounds/wind/WindReady.mp3'),
      'wind-back': require('../../assets/sounds/wind/WindBack.mp3'),
      'wind-swing': require('../../assets/sounds/wind/WindSSwing.mp3'),
      'wind-click': require('../../assets/sounds/wind/WindClick.mp3'),
    };

    // Create player pools for each sound
    for (const [soundKey, source] of Object.entries(soundFiles)) {
      const pool: SoundPlayer[] = [];

      for (let i = 0; i < this.poolSize; i++) {
        try {
          const { sound, status } = await Audio.Sound.createAsync(
            source,
            {
              shouldPlay: false,
              volume: 1.0,
              isLooping: false,
            }
          );

          if (status && 'isLoaded' in status && status.isLoaded) {
            pool.push({
              sound,
              inUse: false,
              soundType: soundKey
            });
          }
        } catch (error) {
          console.error(`Failed to create sound for ${soundKey}:`, error);
        }
      }

      this.soundPools.set(soundKey, pool);
    }

    this.initComplete = true;
    this.log('Progressive engine initialized successfully');
  }

  private getSoundKey(mode: AudioMode, soundType: string): string {
    if (mode === 'metronome' && soundType === 'click') {
      return 'metronome-click';
    }

    if (soundType === 'ready' || soundType === 'back' || soundType === 'swing') {
      return `${mode}-${soundType}`;
    }

    if (mode === 'wind' && soundType === 'click') {
      return 'wind-click';
    }

    return `${mode}-${soundType}`;
  }

  private getAvailablePlayer(soundKey: string): SoundPlayer | null {
    const pool = this.soundPools.get(soundKey);
    if (!pool) return null;

    const player = pool.find(p => !p.inUse);
    if (player) {
      player.inUse = true;

      // Match actual clip durations
      let duration = 200; // Default for clicks
      if (soundKey.includes('ready')) duration = 550;
      else if (soundKey.includes('back')) duration = 800;
      else if (soundKey.includes('swing')) duration = 950;
      else if (!soundKey.includes('click')) duration = 900;

      setTimeout(() => {
        player.inUse = false;
      }, duration);
    }
    return player || null;
  }

  // Progressive scheduling - only schedule sounds within window
  private scheduleNextSounds() {
    if (!this.running) return;

    const now = Date.now();
    const scheduleUntil = now + this.scheduleAheadMs;
    const msPerBeat = 60000 / this.bpm;
    const maxBeats = this.maxBars * 4;

    // Schedule beats that fall within our window
    while (this.nextBeatToSchedule < maxBeats) {
      const beatTime = this.startTime + (this.nextBeatToSchedule * msPerBeat);

      // Stop if this beat is beyond our scheduling window
      if (beatTime > scheduleUntil) break;

      // Skip beats that are already past
      if (beatTime < now - 50) {
        this.nextBeatToSchedule++;
        continue;
      }

      // Calculate position in 4-beat cycle
      const cyclePosition = this.nextBeatToSchedule % 4;

      // Always add click
      this.queue.push({
        id: `beat-${this.nextBeatToSchedule}-click`,
        time: beatTime,
        soundType: 'click',
        mode: this.mode === 'tones' ? 'metronome' : this.mode
      });

      // Add tone sound for non-metronome modes
      if (this.mode !== 'metronome') {
        let soundType: string | null = null;

        switch(cyclePosition) {
          case 0:
            // Beat 0: LEFT - Just click, no tone
            soundType = null;
            break;
          case 1:
            // Beat 1: 1/3 position - Ready tone
            soundType = 'ready';
            break;
          case 2:
            // Beat 2: 2/3 position - Backswing tone
            soundType = 'back';
            break;
          case 3:
            // Beat 3: RIGHT - Downswing/Impact tone
            soundType = 'swing';
            break;
        }

        if (soundType) {
          this.queue.push({
            id: `beat-${this.nextBeatToSchedule}-${soundType}`,
            time: beatTime + 20, // Small delay after click
            soundType: soundType as any,
            mode: this.mode
          });
        }
      }

      this.nextBeatToSchedule++;
    }
  }

  startSequence(bpm: number, mode: AudioMode, startTimeMs?: number) {
    this.stop(); // Clear any existing sequence

    this.bpm = bpm;
    this.mode = mode;
    this.startTime = startTimeMs || Date.now() + 500;
    this.nextBeatToSchedule = 0;

    this.log(`Starting progressive sequence: ${bpm} BPM, ${mode} mode`);

    // Schedule initial batch
    this.scheduleNextSounds();

    // Start the engine
    this.start();
  }

  private start() {
    if (this.running) return;
    this.log('Starting engine');
    this.log(`Initial queue: ${this.queue.length} sounds`);
    this.running = true;
    this.startTicking();
  }

  stop() {
    this.log('Stopping engine');
    this.running = false;
    this.queue = [];
    this.nextBeatToSchedule = 0;

    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }

    // Stop all sounds
    for (const pool of this.soundPools.values()) {
      for (const { sound } of pool) {
        try {
          sound.stopAsync();
        } catch (e) {
          // Ignore
        }
      }
    }
  }

  private startTicking() {
    this.log('Starting tick interval...');

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

      // Schedule more sounds if needed
      this.scheduleNextSounds();

      // Find sounds that should play now
      const dueSounds = this.queue.filter(sound => {
        const diff = sound.time - now;
        return diff <= 10 && diff > -30;
      });

      // Remove and play due sounds
      for (const sound of dueSounds) {
        this.queue = this.queue.filter(s => s.id !== sound.id);
        this.playSound(sound);
      }

      // Clean up old sounds
      const cleanupTime = now - 100;
      this.queue = this.queue.filter(s => s.time > cleanupTime);
    }, 10);
  }

  private async playSound(queuedSound: QueuedSound) {
    if (!this.initComplete) return;

    const soundKey = this.getSoundKey(queuedSound.mode, queuedSound.soundType);
    const player = this.getAvailablePlayer(soundKey);

    if (!player) {
      console.error(`No available player for ${soundKey}`);
      return;
    }

    try {
      const status = await player.sound.getStatusAsync();

      if (!status || !status.isLoaded) {
        console.error(`Sound ${soundKey} not loaded`);
        player.inUse = false;
        return;
      }

      if (status.isPlaying) {
        await player.sound.stopAsync();
      }

      await player.sound.setPositionAsync(0);
      await player.sound.playAsync();

    } catch (error) {
      console.error(`Failed to play ${soundKey}:`, error);
      player.inUse = false;
    }
  }

  async destroy() {
    this.stop();

    for (const pool of this.soundPools.values()) {
      for (const { sound } of pool) {
        try {
          await sound.unloadAsync();
        } catch (e) {
          // Ignore
        }
      }
    }

    this.soundPools.clear();
  }
}

// Export helper functions for compatibility
export function schedulePuttingSequence(
  engine: PuttingAudioEngineProgressive,
  bpm: number,
  mode: AudioMode,
  bars: number = 25,
  startTime?: number
) {
  engine.startSequence(bpm, mode, startTime);
}

export function stopPuttingSequence(engine: PuttingAudioEngineProgressive) {
  engine.stop();
}