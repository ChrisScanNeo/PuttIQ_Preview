import { AudioEngine, AudioMode } from './audioEngine';
import { simpleAccent, musicalSequence, windMode } from './metronomePatterns';

/**
 * Master clock using performance.now() for precise timing
 */
export function nowMs(): number {
  // Use performance.now() if available, fallback to Date.now()
  if (typeof performance !== 'undefined' && performance.now) {
    // performance.now() returns time since page load, add offset to get absolute time
    const pageLoadTime = Date.now() - performance.now();
    return pageLoadTime + performance.now();
  }
  return Date.now();
}

type RunArgs = {
  bpm: number;
  bars: number;
  beatsPerBar: number;
  mode: AudioMode;
  startDelay?: number; // Optional delay before starting (ms)
};

export class Scheduler {
  private audio: AudioEngine;
  private currentSequence: any = null;
  private startTime: number = 0;
  private bpm: number = 80;
  private beatsPerBar: number = 4;
  private isRunning: boolean = false;

  constructor(audioEngine: AudioEngine) {
    this.audio = audioEngine;
  }

  /**
   * Start a sequence with the given parameters
   */
  async runSequence(args: RunArgs) {
    const { bpm, bars, beatsPerBar, mode, startDelay = 500 } = args;

    this.bpm = bpm;
    this.beatsPerBar = beatsPerBar;
    this.isRunning = true;

    const spb = 60000 / bpm; // ms per beat
    const t0 = nowMs() + startDelay; // Start after delay
    this.startTime = t0;
    const totalBeats = bars * beatsPerBar;

    // Clear any existing queue
    this.audio.clearQueue();
    this.audio.setMode(mode);

    // Schedule beats based on mode
    if (mode === 'metronome') {
      this.scheduleMetronomeBeats(t0, totalBeats, spb, beatsPerBar);
    } else if (mode === 'tones') {
      this.scheduleTonesBeats(t0, totalBeats, spb, beatsPerBar);
    } else if (mode === 'wind') {
      this.scheduleWindBeats(t0, totalBeats, spb, beatsPerBar);
    }

    // Start the audio engine
    await this.audio.start();
  }

  private dbToGain(gainDb?: number): number | undefined {
    if (gainDb === undefined) return undefined;
    return Math.pow(10, gainDb / 20);
  }

  /**
   * Schedule metronome mode beats (Low-Low-High pattern)
   */
  private scheduleMetronomeBeats(t0: number, totalBeats: number, spb: number, beatsPerBar: number) {
    const pattern = simpleAccent(beatsPerBar);

    for (let beat = 0; beat < totalBeats; beat++) {
      const beatTime = t0 + beat * spb;
      const patternEvent = pattern[beat % pattern.length];

      this.audio.enqueue({
        id: `beat_${beat}`,
        sprite: 'metronome',
        clip: patternEvent.clip,
        tStartMs: beatTime,
        gain: this.dbToGain(patternEvent.gainDb),
      });
    }
  }

  /**
   * Schedule musical tones beats
   */
  private scheduleTonesBeats(t0: number, totalBeats: number, spb: number, beatsPerBar: number) {
    // Create a musical sequence using available tones
    const sequences = [
      ['tone1', 'tone3', 'tone5', 'tone8'],  // Ascending
      ['tone8', 'tone5', 'tone3', 'tone1'],  // Descending
      ['tone1', 'tone4', 'tone7', 'tone10'], // Major chord tones
      ['tone2', 'tone6', 'tone9', 'tone13'], // Alternative sequence
    ];

    // Pick a sequence (could be user-selectable later)
    const selectedSequence = sequences[0];
    const pattern = musicalSequence(selectedSequence, beatsPerBar);

    for (let beat = 0; beat < totalBeats; beat++) {
      const beatTime = t0 + beat * spb;
      const patternEvent = pattern[beat % pattern.length];

      this.audio.enqueue({
        id: `tone_${beat}`,
        sprite: 'tones',
        clip: patternEvent.clip,
        tStartMs: beatTime,
        gain: this.dbToGain(patternEvent.gainDb),
      });
    }
  }

  /**
   * Schedule wind mode beats (clicks over continuous wind)
   */
  private scheduleWindBeats(t0: number, totalBeats: number, spb: number, beatsPerBar: number) {
    const pattern = windMode(beatsPerBar);

    for (let beat = 0; beat < totalBeats; beat++) {
      const beatTime = t0 + beat * spb;
      const patternEvent = pattern[beat % pattern.length];

      this.audio.enqueue({
        id: `wind_${beat}`,
        sprite: 'wind',
        clip: patternEvent.clip,
        tStartMs: beatTime,
        gain: this.dbToGain(patternEvent.gainDb ?? -6),
      });
    }
  }

  /**
   * Stop the current sequence
   */
  async stop() {
    this.isRunning = false;
    await this.audio.stop();
  }

  /**
   * Get current position in beat cycle (0-1)
   */
  getBeatPosition(): number {
    if (!this.isRunning || !this.startTime) return 0;

    const now = nowMs();
    const elapsed = now - this.startTime;
    const spb = 60000 / this.bpm;
    const cycleDuration = spb * 2; // For bidirectional movement

    const cyclePosition = (elapsed % cycleDuration) / cycleDuration;

    // Create bidirectional position (0→1→0)
    if (cyclePosition <= 0.5) {
      return cyclePosition * 2; // 0 to 1
    } else {
      return 2 - cyclePosition * 2; // 1 to 0
    }
  }

  /**
   * Get the absolute start time of the sequence
   */
  getStartTime(): number {
    return this.startTime;
  }

  /**
   * Check if scheduler is running
   */
  getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get current BPM
   */
  getBpm(): number {
    return this.bpm;
  }

  /**
   * Update BPM (requires restart to take effect)
   */
  setBpm(bpm: number) {
    this.bpm = bpm;
  }
}

export default Scheduler;
