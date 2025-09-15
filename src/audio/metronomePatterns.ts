export type PatternEvent = {
  clip: string;
  beat: number;
  gainDb?: number;
};

/**
 * Simple accent pattern for metronome mode
 * Uses Low-Low-High accent scheme
 * Beat 1: low1 (downbeat)
 * Middle beats: ticks
 * Last beat: high (accent)
 */
export function simpleAccent(nBeats: number): PatternEvent[] {
  if (nBeats < 2) {
    // For single beat, just use low1
    return [{ clip: 'low1', beat: 0, gainDb: 0 }];
  }

  const pattern: PatternEvent[] = [];

  // First beat - low1 (downbeat)
  pattern.push({ clip: 'low1', beat: 0, gainDb: 0 });

  // Middle beats - alternating ticks
  const tickClips = ['tick1', 'tick2', 'tick3'];
  for (let i = 1; i < nBeats - 1; i++) {
    const tickIndex = (i - 1) % tickClips.length;
    pattern.push({ clip: tickClips[tickIndex], beat: i, gainDb: -3 }); // Slightly quieter
  }

  // Last beat - high (accent)
  pattern.push({ clip: 'high', beat: nBeats - 1, gainDb: 0 });

  return pattern;
}

/**
 * Musical sequence pattern for tones mode
 * Maps beats to a sequence of tone clips
 */
export function musicalSequence(seq: string[], beatsPerBar: number): PatternEvent[] {
  const pattern: PatternEvent[] = [];

  for (let i = 0; i < beatsPerBar; i++) {
    const clip = seq[i % seq.length];

    // Optional: make the center beat slightly louder
    const isCenter = i === Math.floor(beatsPerBar / 2);
    const gainDb = isCenter ? 2 : 0;

    pattern.push({ clip, beat: i, gainDb });
  }

  return pattern;
}

/**
 * Wind mode pattern
 * Plays clicks on every beat over continuous wind background
 */
export function windMode(nBeats: number): PatternEvent[] {
  const pattern: PatternEvent[] = [];

  for (let i = 0; i < nBeats; i++) {
    // Use 'click' from wind sprite for beat markers
    // First beat slightly louder
    const gainDb = i === 0 ? -3 : -6;
    pattern.push({ clip: 'click', beat: i, gainDb });
  }

  return pattern;
}

/**
 * Get a random tone sequence for variety
 */
export function getRandomToneSequence(): string[] {
  const sequences = [
    // Ascending patterns
    ['tone1', 'tone3', 'tone5', 'tone8'],
    ['tone2', 'tone4', 'tone6', 'tone9'],
    ['tone1', 'tone4', 'tone7', 'tone10'],

    // Descending patterns
    ['tone8', 'tone5', 'tone3', 'tone1'],
    ['tone10', 'tone7', 'tone4', 'tone1'],
    ['tone13', 'tone9', 'tone5', 'tone1'],

    // Mixed patterns
    ['tone1', 'tone5', 'tone3', 'tone8'],
    ['tone2', 'tone8', 'tone4', 'tone10'],
    ['tone3', 'tone6', 'tone9', 'tone12'],

    // Rhythmic patterns using shorter tones
    ['tone2', 'tone5', 'tone6', 'tone9'],
    ['tone5', 'tone6', 'tone5', 'tone6'],
  ];

  const randomIndex = Math.floor(Math.random() * sequences.length);
  return sequences[randomIndex];
}

/**
 * Create a custom pattern from user preferences
 */
export function customPattern(
  beatsPerBar: number,
  accentBeats: number[] = [0], // Which beats to accent
  clipMap: { normal: string; accent: string }
): PatternEvent[] {
  const pattern: PatternEvent[] = [];

  for (let i = 0; i < beatsPerBar; i++) {
    const isAccent = accentBeats.includes(i);
    pattern.push({
      clip: isAccent ? clipMap.accent : clipMap.normal,
      beat: i,
      gainDb: isAccent ? 0 : -3,
    });
  }

  return pattern;
}

/**
 * Golf-specific pattern: 4 beats with back-and-forth emphasis
 * Beat 1: Start of backswing (low)
 * Beat 2: Top of backswing (tick)
 * Beat 3: Impact (high/accent)
 * Beat 4: Follow-through (tick)
 */
export function golfSwingPattern(): PatternEvent[] {
  return [
    { clip: 'low1', beat: 0, gainDb: 0 },   // Start
    { clip: 'tick1', beat: 1, gainDb: -3 }, // Top
    { clip: 'high', beat: 2, gainDb: 2 },   // Impact (louder)
    { clip: 'tick2', beat: 3, gainDb: -3 }, // Follow-through
  ];
}

export default {
  simpleAccent,
  musicalSequence,
  windMode,
  getRandomToneSequence,
  customPattern,
  golfSwingPattern,
};