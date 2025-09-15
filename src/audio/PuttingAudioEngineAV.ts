// PuttingAudioEngineAV.ts - Using expo-av for reliable audio playback
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

export class PuttingAudioEngineAV {
  private soundPools: Map<string, SoundPlayer[]> = new Map();
  private poolSize = 3; // Players per sound type
  private queue: QueuedSound[] = [];
  private running = false;
  private tickInterval: NodeJS.Timeout | null = null;
  private debug = true;
  private initComplete = false;

  private log(...args: any[]) {
    if (this.debug) console.log('[PuttingAudioAV]', ...args);
  }

  async init() {
    this.log('Initializing PuttingAudioEngineAV with expo-av...');

    // Configure audio mode for iOS and Android
    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        shouldDuckAndroid: false,
        playThroughEarpieceAndroid: false,
        interruptionModeIOS: InterruptionModeIOS.DoNotMix,
        interruptionModeAndroid: InterruptionModeAndroid.DoNotMix,
      });
      this.log('Audio mode configured successfully');
    } catch (error) {
      console.error('[PuttingAudioAV] Failed to set audio mode:', error);
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
          // Log the source being loaded
          this.log(`Loading sound ${i} for ${soundKey} from source:`, source);

          const { sound, status } = await Audio.Sound.createAsync(
            source,
            {
              shouldPlay: false,
              volume: 0.8,
              isLooping: false,
            }
          );

          // Log full status for debugging
          this.log(`Sound status for ${soundKey}:`, JSON.stringify(status));

          // Check if sound loaded successfully
          if (status && 'isLoaded' in status && status.isLoaded) {
            pool.push({
              sound,
              inUse: false,
              soundType: soundKey
            });

            this.log(`✅ Created sound ${i} for ${soundKey} - Loaded: ${status.isLoaded}, Duration: ${status.durationMillis}ms`);
          } else {
            console.error(`[PuttingAudioAV] ❌ Sound ${soundKey} failed to load properly. Status:`, status);
            // Try to load it explicitly
            if (sound) {
              try {
                await sound.loadAsync(source);
                const newStatus = await sound.getStatusAsync();
                if (newStatus.isLoaded) {
                  pool.push({
                    sound,
                    inUse: false,
                    soundType: soundKey
                  });
                  this.log(`✅ Loaded sound ${i} for ${soundKey} after explicit load`);
                }
              } catch (loadError) {
                console.error(`[PuttingAudioAV] Failed to explicitly load ${soundKey}:`, loadError);
              }
            }
          }
        } catch (error) {
          console.error(`❌ Failed to create sound for ${soundKey}:`, error);
        }
      }

      if (pool.length === 0) {
        console.error(`[PuttingAudioAV] ❌ Failed to create any sounds for ${soundKey}`);
      }

      this.soundPools.set(soundKey, pool);
    }

    // Log final pool sizes
    console.log('[PuttingAudioAV] ✅ INITIALIZATION COMPLETE:');
    for (const [key, pool] of this.soundPools.entries()) {
      console.log(`  - ${key}: ${pool.length} sounds loaded`);
    }

    this.initComplete = true;
    this.log('PuttingAudioEngineAV initialized successfully');
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
      }, 300);
    }
    return player || null;
  }

  enqueueSound(sound: QueuedSound) {
    this.queue.push(sound);
  }

  start() {
    if (this.running) return;
    this.log('Starting engine');
    // Clear any pending sounds from previous run
    this.queue = [];
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

      // Find sounds that should play now (within timing window)
      // Only play sounds that are due or slightly late (not too old)
      const dueSounds = this.queue.filter(sound => {
        const diff = sound.time - now;
        return diff <= 10 && diff > -30; // Tighter window to avoid playing old sounds
      });

      // Remove due sounds from queue first to avoid double-playing
      for (const sound of dueSounds) {
        this.queue = this.queue.filter(s => s.id !== sound.id);
      }

      // Then play them
      for (const sound of dueSounds) {
        this.playSound(sound);
      }

      // Clean up old sounds that we missed (more than 100ms late)
      const cleanupTime = now - 100;
      this.queue = this.queue.filter(s => s.time > cleanupTime);
    }, 10);
  }

  private async playSound(queuedSound: QueuedSound) {
    if (!this.initComplete) {
      console.error('[PuttingAudioAV] ❌ Engine not initialized, cannot play sound');
      return;
    }

    const soundKey = this.getSoundKey(queuedSound.mode, queuedSound.soundType);
    const player = this.getAvailablePlayer(soundKey);

    if (!player) {
      console.error(`[PuttingAudioAV] ❌ No available player for ${soundKey} (pool size: ${this.soundPools.get(soundKey)?.length || 0})`);
      return;
    }

    try {
      this.log(`Playing ${queuedSound.soundType} for ${queuedSound.mode} mode`);

      // Check if sound is loaded
      const status = await player.sound.getStatusAsync();

      // Log the status to debug
      this.log(`Status for ${soundKey}:`, JSON.stringify(status));

      if (!status || !status.isLoaded) {
        console.error(`[PuttingAudioAV] Sound ${soundKey} is not loaded, skipping playback. Status:`, status);
        player.inUse = false;
        return;
      }

      // Reset position and play
      if (status.isPlaying) {
        await player.sound.stopAsync();
      }

      await player.sound.setPositionAsync(0);
      await player.sound.playAsync();

      this.log(`✅ Successfully played ${soundKey}`);
    } catch (error) {
      console.error(`[PuttingAudioAV] ❌ Failed to play ${soundKey}:`, error);
      // Try to recover
      try {
        await player.sound.stopAsync();
        player.inUse = false;
      } catch (e) {
        // Ignore recovery errors
      }
    }
  }

  async destroy() {
    this.stop();

    // Unload all sounds
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

// Helper function to schedule putting sequence
export function schedulePuttingSequence(
  engine: PuttingAudioEngineAV,
  bpm: number,
  mode: AudioMode,
  bars: number = 100,
  startTime?: number
) {
  // Stop and clear any existing sounds first
  engine.stop();

  // Each movement takes exactly 1 beat at the BPM rate
  const msPerBeat = 60000 / bpm;
  const totalBeats = bars * 4; // 4 beats per complete stroke cycle

  // Use provided start time or create new one
  if (!startTime) {
    startTime = Date.now() + 500; // Start in 500ms
  }

  console.log('[PuttingScheduler] ⏰ TIMING DEBUG:', {
    bpm,
    msPerBeat: `${msPerBeat}ms`,
    mode,
    startTime: new Date(startTime).toISOString(),
    startTimeMs: startTime,
    currentTime: Date.now(),
    delayUntilStart: startTime - Date.now(),
    sequence: 'LEFT(click) -> 1/3(ready) -> 2/3(back) -> RIGHT(downswing) -> LEFT(repeat)'
  });

  // Schedule sounds at exact beat intervals
  // 4-beat pattern:
  // Beat 0: LEFT - Click only
  // Beat 1: 1/3 position - Ready tone + Click
  // Beat 2: 2/3 position - Backswing tone + Click
  // Beat 3: RIGHT - Downswing tone + Click
  // Beat 4: LEFT - Click only (cycle repeats)

  for (let beat = 0; beat <= Math.min(40, totalBeats); beat++) { // Limit for debugging
    const beatTime = startTime + (beat * msPerBeat);

    // Calculate position in 4-beat cycle
    const cyclePosition = beat % 4;
    let positionName = '';
    switch(cyclePosition) {
      case 0: positionName = 'LEFT'; break;
      case 1: positionName = '1/3'; break;
      case 2: positionName = '2/3'; break;
      case 3: positionName = 'RIGHT'; break;
    }

    // Debug log for first few beats
    if (beat < 8) {
      console.log(`[PuttingScheduler] Beat ${beat}: ${positionName} at ${beatTime}ms (${new Date(beatTime).toISOString()})`);
    }

    // Click at every beat - use metronome click for tones mode
    engine.enqueueSound({
      id: `beat-${beat}-click`,
      time: beatTime,
      soundType: 'click',
      mode: mode === 'tones' ? 'metronome' : mode
    });

    // Add the appropriate tone sound (except for metronome mode)
    if (mode !== 'metronome') {
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

export function stopPuttingSequence(engine: PuttingAudioEngineAV) {
  engine.stop();
}