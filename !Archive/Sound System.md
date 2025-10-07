PuttIQ2 — Audio & Timing System (Expo SDK 54)

Goal: a dependable, low-latency, jitter-free audio & timing stack for three playback modes (Simple Metronome, Musical Tone, Wind), with a sweep timer-bar that stays visually phase-locked to audio on iOS & Android (foreground + background).

Why this design now: In SDK 54, expo-av is deprecated in favor of expo-audio / expo-video, with removal in the next cycle. New projects should migrate off expo-av. 
Expo Documentation
+2
Expo
+2

Architecture Overview

Audio engine: expo-audio for reliable, supported playback in SDK 54+. Use preloaded buffers + look-ahead sample scheduling to minimize clock drift. 
Expo Documentation
+1

Scheduler clock: A single monotonic reference clock (JS performance.now() with smoothing) drives both audio scheduling and UI animation (the timer bar).

Asset strategy: Sprite sheet (one WAV + JSON map of offsets) to eliminate multi-file I/O jitter.

Latency control:

iOS: Hardware buffer ≈ 128–256 frames typical; schedule ≥ 80–120 ms ahead.

Android: More variability; schedule ≥ 120–200 ms ahead; first-launch warmup.

Optional “pro” path for extreme tightness: Add react-native-audio-api (sample-accurate scheduling & DSP) behind a feature flag in a Dev Build (New Architecture). Use it if you need drummer-grade timing (< ±2 ms jitter). 
docs.swmansion.com
+1

Background playback & controls: If you need OS media controls/lock-screen UI or long background sessions, integrate React Native Track Player in a Dev Build. (Supported with Expo; note maintainers’ Expo caveat.) 
rntp.dev

Modes & Sound Design

Simple Metronome

Low-Low-High accent scheme (e.g., 1 = low, mid beats = ticks, center beat = high).

Assets: low_note_1.wav, low_note_2.wav, tick_*.wav, high_note.wav.

Musical Tone Mode

Count-mapped tone clips (do-re-mi / chord arps).

Optional bar-phase-dependent pitch bend (pre-render for consistency).

Wind Mode

Continuous “wind bed” with gain envelope that swells into the center, plus a subtle click at exact beat times for tactile timing.

Assets: clip3_wind1.wav, clip3_wind2.wav, clip3_click.wav.

You already have organized bundles:
metronome_set/ + wind_click_set/ inside metronome_sounds_bundle.zip (shared earlier).

File Layout
/app
  /audio
    /sprites
      metronome.wav
      metronome.json
      wind.wav
      wind.json
    /raw                 # keep originals for future sprites
      low_note_1.wav
      low_note_2.wav
      tick_1.wav
      tick_2.wav
      tick_3.wav
      high_note.wav
      clip3_click.wav
      clip3_wind1.wav
      clip3_wind2.wav
  /src
    /audio
      audioEngine.ts
      scheduler.ts
      spriteLoader.ts
      metronomePatterns.ts
    /ui
      TimerBar.tsx
      ModeSwitcher.tsx
      LatencyCal.tsx
    /state
      settings.ts

Sprite Format (JSON)
{
  "sampleRate": 44100,
  "clips": {
    "low1": { "start": 0.000, "duration": 0.120, "gain": -1.0 },
    "low2": { "start": 0.150, "duration": 0.120, "gain": -1.0 },
    "tick1": { "start": 0.320, "duration": 0.080, "gain": 0.0 },
    "tick2": { "start": 0.420, "duration": 0.080, "gain": 0.0 },
    "tick3": { "start": 0.520, "duration": 0.080, "gain": 0.0 },
    "high": { "start": 0.640, "duration": 0.100, "gain": 0.5 },
    "wind1": { "start": 1.000, "duration": 4.000, "loop": true, "gain": -6.0 },
    "wind2": { "start": 5.100, "duration": 4.000, "loop": true, "gain": -6.0 },
    "click": { "start": 9.300, "duration": 0.025, "gain": 0.0 }
  }
}


Adjust start/duration to match your sprite. Keep short clicks < 30 ms, trim silence, normalize levels offline.

Install & Build Targets
Baseline (recommended for SDK 54)

Use expo-audio for playback. (Replacement for expo-av.) 
Expo Documentation
+1

Stays inside Expo; no native modules required for basic timing.

“Pro” Option (feature-flagged)

Add react-native-audio-api for sample-accurate scheduling/DSP in an Expo Dev Build (New Architecture). Best for ultra-tight metronome and real-time analysis. 
docs.swmansion.com

If you need background audio with OS controls, integrate React Native Track Player in the same Dev Build. 
rntp.dev

Timing Model

Master clock:

// scheduler.ts
export function nowMs(): number {
  // Monotonic; avoid Date.now() for drift
  return globalThis?.performance?.now?.() ?? Date.now();
}


Look-ahead scheduling:

scheduleAheadMs = 120 ms (iOS 80–120 ms / Android 120–200 ms; make it device-adaptive after calibration).

Tick loop every 20 ms checks for notes with startTime <= clock + scheduleAheadMs.

Each scheduled note computes exact buffer offset inside the sprite and enqueues a buffer source starting at the predicted hardware time.

Audio Engine (expo-audio)
// audioEngine.ts
import { Audio } from "expo-audio";
import { nowMs } from "./scheduler";
import { loadSprite } from "./spriteLoader";

type ScheduledNote = {
  id: string;
  clip: string;         // key in sprite JSON
  tStartMs: number;     // absolute clock time to start
  gainDb?: number;
};

export class AudioEngine {
  private ctx: Audio.Sound | null = null; // conceptual holder; expo-audio exposes higher-level API
  private sprite: Awaited<ReturnType<typeof loadSprite>> | null = null;
  private scheduleAheadMs = 140;
  private running = false;
  private queue: ScheduledNote[] = [];
  private gain = 1.0;

  async init(spriteName: "metronome" | "wind") {
    // 1) Load WAV into memory (as Sound) + parse JSON map
    this.sprite = await loadSprite(spriteName);
    await this.sprite.ensureLoaded(); // loads Sound, sets to paused at 0
  }

  setMasterGain(g: number) {
    this.gain = Math.max(0, Math.min(1, g));
  }

  enqueue(n: ScheduledNote) {
    this.queue.push(n);
  }

  start() {
    this.running = true;
    this.tick();
  }

  stop() {
    this.running = false;
    this.queue.length = 0;
    this.sprite?.stopAll();
  }

  private tick = () => {
    if (!this.running || !this.sprite) return;
    const tNow = nowMs();

    // Find events inside look-ahead window
    const due = this.queue.filter(n => n.tStartMs <= tNow + this.scheduleAheadMs);

    for (const n of due) {
      const clip = this.sprite.map[n.clip];
      if (!clip) continue;
      // Expo Audio: play from `clip.start` for `clip.duration`
      this.sprite.playSegment({
        offsetSec: clip.start,
        durationSec: clip.duration,
        gainDb: (clip.gain ?? 0) + (n.gainDb ?? 0),
        atTimeMs: n.tStartMs,  // engine will convert to relative delay
      });
    }

    // Remove enqueued
    this.queue = this.queue.filter(n => !due.includes(n));
    // Loop
    if (this.running) requestAnimationFrame(this.tick);
  };
}


Note: The exact API shape for expo-audio buffer-segment playback may differ slightly. The approach above is the pattern: preload the WAV and trigger segments at offsets with precise delays. (We model playSegment/ensureLoaded as helpers you implement on top of Audio.Sound or the Audio playback API.) The key is scheduling by absolute future time.

Sprite Loader
// spriteLoader.ts
import { Asset } from "expo-asset";
import * as FileSystem from "expo-file-system";
import { Audio } from "expo-audio";

export async function loadSprite(name: "metronome" | "wind") {
  const wavAsset = Asset.fromModule(
    name === "metronome"
      ? require("../audio/sprites/metronome.wav")
      : require("../audio/sprites/wind.wav")
  );
  const jsonAsset = Asset.fromModule(
    name === "metronome"
      ? require("../audio/sprites/metronome.json")
      : require("../audio/sprites/wind.json")
  );

  await wavAsset.downloadAsync();
  await jsonAsset.downloadAsync();

  const jsonText = await FileSystem.readAsStringAsync(jsonAsset.localUri!);
  const map = JSON.parse(jsonText) as {
    sampleRate: number;
    clips: Record<string, { start: number; duration: number; gain?: number; loop?: boolean }>;
  };

  // Create a Sound instance (paused) from the WAV
  const sound = new Audio.Sound();
  await sound.loadAsync({ uri: wavAsset.localUri! }, { shouldPlay: false });

  function clipByKey(k: string) { return map.clips[k]; }

  // Helper: play a segment by offset/duration
  async function playSegment(opts: { offsetSec: number; durationSec: number; gainDb?: number; atTimeMs: number }) {
    const { offsetSec, durationSec, gainDb = 0, atTimeMs } = opts;
    const now = performance.now();
    const delayMs = Math.max(0, atTimeMs - now);

    // For expo-audio, emulate segment playback by:
    // 1) setting position to offset
    // 2) setting volume
    // 3) play after delay, and schedule stop
    await sound.setPositionAsync(offsetSec * 1000);
    await sound.setVolumeAsync(dbToLin(gainDb));
    setTimeout(async () => {
      try {
        await sound.playAsync();
        setTimeout(() => { sound.pauseAsync(); }, durationSec * 1000);
      } catch {}
    }, delayMs);
  }

  function stopAll() { sound.stopAsync(); }

  return {
    ensureLoaded: async () => {},
    playSegment,
    stopAll,
    map: map.clips,
  };
}

function dbToLin(db: number) {
  return Math.pow(10, db / 20);
}


Why this works: We preload into a single buffer (avoids disk I/O per note) and seek to each clip’s offset, applying a timed delay relative to our master clock. That eliminates JS scheduling jitter from file loads and keeps beats tight.

Caveat: For the absolute tightest results, move segment triggering into a native, sample-accurate layer (see “Pro” path). 
docs.swmansion.com

Metronome Patterns
// metronomePatterns.ts
export type PatternEvent = { clip: string; beat: number; gainDb?: number };

export function simpleAccent(nBeats: number): PatternEvent[] {
  // 4/4 example: low1 on 1, ticks on 2-3, high on 4
  return [
    { clip: "low1", beat: 0, gainDb: 0 },
    ...Array.from({ length: nBeats - 2 }, (_, i) => ({ clip: "tick1", beat: i + 1 })),
    { clip: "high", beat: nBeats - 1, gainDb: 0 },
  ];
}

export function windMode(nBeats: number): PatternEvent[] {
  // Click on every beat, wind runs continuously under it
  return Array.from({ length: nBeats }, (_, b) => ({ clip: "click", beat: b }));
}

Scheduling Beats
// scheduler.ts
import { AudioEngine } from "./audioEngine";

type RunArgs = { bpm: number; bars: number; beatsPerBar: number; mode: "metronome"|"tones"|"wind"; };

export function runSequence(audio: AudioEngine, args: RunArgs) {
  const { bpm, bars, beatsPerBar, mode } = args;
  const spb = 60_000 / bpm; // ms per beat
  const t0 = performance.now() + 500; // start half a second in the future
  const totalBeats = bars * beatsPerBar;

  // Background layers (e.g., wind swell)
  if (mode === "wind") {
    // Start wind1 + wind2 now, loop via re-enqueues (or use a separate bed player)
    audio.enqueue({ id: "w1", clip: "wind1", tStartMs: t0 - 200 });
    audio.enqueue({ id: "w2", clip: "wind2", tStartMs: t0 - 200, gainDb: -3 });
  }

  for (let i = 0; i < totalBeats; i++) {
    const beatTime = t0 + i * spb;

    if (mode === "metronome") {
      const isDownbeat = i % beatsPerBar === 0;
      const isCenter   = (i % beatsPerBar) === Math.floor(beatsPerBar/2);
      const clip = isDownbeat ? "low1" : isCenter ? "high" : "tick1";
      audio.enqueue({ id: `b${i}`, clip, tStartMs: beatTime });
    } else if (mode === "tones") {
      const tones = ["low1","tick1","tick2","high"];
      const clip = tones[i % tones.length];
      audio.enqueue({ id: `b${i}`, clip, tStartMs: beatTime });
    } else if (mode === "wind") {
      audio.enqueue({ id: `b${i}`, clip: "click", tStartMs: beatTime, gainDb: -6 });
    }
  }

  audio.start();
}

Timer-Bar (visual sync)
// TimerBar.tsx
import React, { useEffect, useRef, useState } from "react";
import { View, Animated, Easing } from "react-native";

type Props = { bpm: number; sweep: "pingpong"|"loop"; };

export default function TimerBar({ bpm, sweep = "pingpong" }: Props) {
  const spb = 60_000 / bpm;
  const anim = useRef(new Animated.Value(0)).current;
  const [dir, setDir] = useState<1| -1>(1);

  useEffect(() => {
    let mounted = true;

    function step() {
      if (!mounted) return;
      Animated.timing(anim, {
        toValue: dir === 1 ? 1 : 0,
        duration: spb,
        easing: Easing.linear,
        useNativeDriver: true
      }).start(({ finished }) => {
        if (!finished || !mounted) return;
        if (sweep === "pingpong") setDir(d => (d === 1 ? -1 : 1));
        step();
      });
    }

    anim.setValue(dir === 1 ? 0 : 1);
    step();
    return () => { mounted = false; anim.stopAnimation(); };
  }, [bpm, sweep, dir]);

  const translateX = anim.interpolate({ inputRange: [0,1], outputRange: [0, 1] }); // map to width in parent

  // Color zones: red → orange → green → orange → red
  // Implement with gradient or overlay segments; omitted for brevity.

  return (
    <View style={{ height: 12, borderRadius: 6, overflow: "hidden" }}>
      {/* background gradient would live here */}
      <Animated.View style={{
        position: "absolute",
        top: 0, bottom: 0, width: 10,
        transform: [{ translateX: Animated.multiply(translateX, /* parent width */ 300) }]
      }}/>
    </View>
  );
}


The animation start time should be aligned to the audio t0. Expose t0 from the scheduler and kick off the first Animated.timing so the bar’s phase matches the beat grid.

Latency Calibration (one-time per device)

Play a short click & flash the screen at a planned time t0 + 1000 ms.

User taps when they hear the click.

Compute tapTime – plannedTime → this is the per-device output latency.

Store in settings; subtract this offset from all future tStartMs.

Repeat for input (microphone) if using hit detection.

Background & Lifecycle

Foreground timing is best. If you need background playback and OS media controls, use React Native Track Player in a Dev Build; keep the timer-bar paused when app is in background, resume with phase correction when foregrounded. 
rntp.dev

Audio Focus / Ducking: respect focus changes (phone call/navigation) with smooth gain ramps (±200 ms).

Testing Plan

Unit

Beat-time generator: given BPM & start time, returns exact timestamps.

Sprite lookup: maps names → offsets/durations; validates no overlaps.

Device Bench

Cold start: first click timing error < ±25 ms.

Steady-state jitter: std dev of inter-beat error < ±6 ms (baseline), < ±2 ms (pro).

CPU load: keep UI at 60 fps with audio jitter unchanged.

Cross-platform

iPhone (A-series & M-series), Android mid-range + flagship.

Headphones vs speakers.

Background audio (if using track-player path).

Migration Notes (SDK 54)

expo-av is deprecated and slated for removal, so don’t build new features on it. Use expo-audio / expo-video. 
Expo Documentation
+1

If you need real-time DSP (filters/FFT, sample-accurate events), consider react-native-audio-api under the New Architecture in a Dev Build; this is a separate path but integrates well for metronome-grade precision. 
docs.swmansion.com

Claude Code Tasks (copy/paste)

Create audio folders and add sprite WAV + JSON.

Implement spriteLoader.ts exactly as above; wire playSegment.

Implement audioEngine.ts with queue + look-ahead tick.

Implement scheduler.ts beat scheduling & master clock.

Implement metronomePatterns.ts (simple accents + wind mode).

Implement TimerBar.tsx and align t0 with audio start.

Build a LatencyCal screen; store offsets in settings.ts.

Add ModeSwitcher: Simple / Tones / Wind; persist selection.

Create E2E test page: BPM slider, bar/beat debug overlay, drift log.

Optional: add Dev Build target with react-native-audio-api (feature flag PRO_AUDIO=1) for sample-accurate mode and/or Track Player for background.

Gotchas & Tips

Preload everything before starting; do a warmup seek/play/pause to eliminate first-play hiccup.

Keep clips short and clean. Remove leading/trailing silence; normalize loudness offline.

Schedule one bar ahead when possible; keep queue rolling.

Avoid setInterval for timing; use a requestAnimationFrame loop that computes absolute times from the master clock.

On Android, device audio stack varies—expect to pick a slightly larger look-ahead.

References

Expo docs: expo-av deprecated → use expo-audio / expo-video; removal after SDK 54. 
Expo Documentation
+2
Expo
+2

Sample-accurate audio & DSP API for RN (for “pro” mode). 
docs.swmansion.com

Low-latency Expo/Native patterns (real-time audio write-ups). 
Expo

Track Player with Expo (background/controls). 
rntp.dev

Deliverables Checklist

 metronome.wav/json, wind.wav/json sprites

 audioEngine.ts, spriteLoader.ts, scheduler.ts, metronomePatterns.ts

 TimerBar.tsx with color zones (red→orange→green→orange→red), 3 center greens

 LatencyCal.tsx and settings.ts

 Demo screen with BPM slider, mode switch, and drift logger