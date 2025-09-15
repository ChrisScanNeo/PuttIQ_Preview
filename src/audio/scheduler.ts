
// scheduler.ts — shared master clock + helpers

export function nowMs(): number {
  // Prefer monotonic clock
  if (typeof performance !== 'undefined' && performance.now) return performance.now();
  return Date.now();
}

import type { AudioEngine, SpriteName } from './audioEngine';

export type RunArgs = {
  bpm: number;
  bars: number;
  beatsPerBar: number;
  mode: 'metronome' | 'tones' | 'wind';
  // optional per-device latency offsets (ms)
  outputLatencyMs?: number;
};

function modeToSprite(mode: RunArgs['mode']): SpriteName {
  if (mode === 'wind') return 'wind';
  if (mode === 'tones') return 'tones';
  return 'metronome';
}

function pickClipFor(mode: RunArgs['mode'], beatIndex: number, beatsPerBar: number): string {
  if (mode === 'metronome') {
    const withinBar = beatIndex % beatsPerBar;
    const isDownbeat = withinBar === 0;
    const isCenter = withinBar === Math.floor(beatsPerBar / 2);
    if (isDownbeat) return 'low1';
    if (isCenter)   return 'high';
    return 'tick1';
  }
  if (mode === 'tones') {
    const seq = ['tone1','tone3','tone5','tone8']; // example tone mapping
    return seq[beatIndex % seq.length];
  }
  // wind mode uses click accents
  return 'click';
}

export function runSequence(audio: AudioEngine, args: RunArgs) {
  const { bpm, bars, beatsPerBar, mode, outputLatencyMs = 0 } = args;
  const totalBeats = Math.max(1, Math.floor(bars * beatsPerBar));
  const spb = 60_000 / bpm; // ms per beat

  console.log('[Scheduler] Starting sequence:', {
    bpm,
    bars,
    beatsPerBar,
    mode,
    totalBeats,
    spb: `${spb}ms per beat`
  });

  const t0 = nowMs() + 600; // start a bit in the future
  const sprite = modeToSprite(mode);
  console.log(`[Scheduler] Using sprite: ${sprite}, starting at t0=${t0}`);

  // Continuous bed for wind (optional: schedule loops yourself if needed)
  if (mode === 'wind') {
    // For wind beds we might separately start looping layers; omitted here for brevity.
  }

  for (let i = 0; i < totalBeats; i++) {
    const beatTime = t0 + i * spb - outputLatencyMs;
    const clip = pickClipFor(mode, i, beatsPerBar);
    if (i < 5) { // Only log first 5 beats to avoid spam
      console.log(`[Scheduler] Enqueuing beat ${i}: clip=${clip}, time=${beatTime}ms`);
    }
    audio.enqueue({
      id: `beat-${i}`,
      sprite,
      clip,
      tStartMs: beatTime,
    });
  }

  console.log('[Scheduler] All beats enqueued, starting audio engine');
  audio.start();
}

export function stopSequence(audio: AudioEngine) {
  audio.stop();
}
