Here’s a battle-tested stack that’s React-Native/Expo-friendly and geared for accurate on-device detection of a ball-strike while rejecting your own metronome audio:

Capture + low-latency playback

expo-audio (new Expo audio lib): use this for metronome playback and optional recording in managed/bare apps; it replaces expo-av in SDK 53+. Gives you a clean API and better timing than expo-av. 
Expo Documentation
+1
Expo

Software Mansion’s react-native-audio-api (WebAudio-style JSI): if you want precision timing and real-time DSP nodes (AnalyserNode, BiquadFilterNode, etc.) to build your strike detector fully on-device. It’s C++ under the hood, supports RN 0.79, and has an Expo plugin. Great for band-pass/notch filters and spectral features. 
Software Mansion
+1

Get raw mic frames (for your detector)

@picovoice/react-native-voice-processor: simplest way to stream PCM frames from the mic to JS for real-time processing (FFT, spectral flux, transient detection). Works nicely alongside your own DSP/classifier. 
GitHub
picovoice.ai

Kill the metronome from the mic (echo rejection)

react-native-webrtc (or @stream-io/react-native-webrtc) with Acoustic Echo Cancellation (AEC) and Noise Suppression (NS) enabled. Route the metronome through the device output while capturing mic; AEC removes that playback “echo” from the recording so your detector doesn’t see your own ticks. This is the most robust way to “filter out the metronome.” 
webrtc.github.io
Stream

Why AEC instead of just filtering? Your metronome tick shares broadband content with the ball-strike. AEC subtracts the exact playback reference before it ever reaches your detector—far more reliable than frequency notches alone. 
webrtc.github.io

Optional DSP helpers (if you’re rolling your own detector)

react-native-audio-api nodes: use BiquadFilterNode for a band-pass (≈1–6 kHz), then AnalyserNode for FFT/time-domain features (RMS rise time, spectral flux, peak bandwidth). This is ideal for a sharp impact detector and runs in native code. 
Software Mansion
+1

react-native-live-audio-fft: a lightweight bridge that delivers live FFT bins if you want something simpler; useful for quick prototyping/visualizing spectra. 
GitHub

Noise suppression (optional layer)

If you need extra suppression in noisy ranges, you can rely on WebRTC NS (part of the webrtc stack above). RNNoise (WASM) exists, but it’s browser-oriented; for RN apps the native WebRTC NS/AEC path is more practical and performant. 
Stack Overflow
GitHub
+1

Recommended setup (what I’d ship)

Playback: Metronome via expo-audio (or through react-native-audio-api if you want sample-accurate scheduling). 
Expo Documentation
Software Mansion

Echo rejection: Capture mic with react-native-webrtc constraints echoCancellation: true, noiseSuppression: true. This neutralizes your own ticks before they hit the detector. 
Stream
webrtc.github.io

Frames + DSP:

Either read mic frames with @picovoice/react-native-voice-processor and run your detector in JS/JSI, or build the graph in react-native-audio-api: AudioRecorder → BiquadFilterNode (band-pass) → AnalyserNode → threshold/transient logic. 
picovoice.ai
Software Mansion

Strike detector features (simple & fast): short window (e.g., 10–20 ms hop), detect sudden RMS rise + broadband spectral spike not coincident with AEC reference frames. (Because the metronome is removed, true impacts stand out cleanly.)

Why this combo works for your app

Accuracy: AEC removes metronome leakage entirely; band-pass + transient features nail the short, broadband putter-ball impact. 
webrtc.github.io

RN-friendly: All pieces have current RN/Expo support (SDK 53, RN 0.79). 
Expo Documentation
Software Mansion

Low latency: JSI/native paths (webrtc & C++ audio nodes) keep end-to-end latency low—crucial for syncing feedback with your visual bar.

If you want, I can drop in a minimal code scaffold that wires:

expo-audio for ticks,

@stream-io/react-native-webrtc mic with AEC,

an AnalyserNode pipeline (via react-native-audio-api)

and a tiny strike detector (spectral flux + peak envelope)

…so you can paste it into your project and test on-device.

You said:
Yes please
ChatGPT said:
Thought for 28s

Awesome — here’s a minimal-but-solid scaffold you can paste into your RN/Expo app. It wires up:

Metronome playback (Expo)

AEC/NS mic capture (keep a WebRTC stream open with echoCancellation)

Low-latency PCM frames (Picovoice Voice Processor)

On-device strike detector (fast biquad + transient logic, ignores your own metronome ticks)

No native editing required beyond standard installs.

1) Install
# Expo SDK 53 / RN 0.79.x
expo install expo-av               # ticks playback (works great in SDK 53)
npm i @picovoice/react-native-voice-processor
npm i @stream-io/react-native-webrtc  # or: npm i react-native-webrtc
npm i react-native-permissions


iOS: add mic permission to app.json

{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSMicrophoneUsageDescription": "Detects putter-ball impact timing."
      }
    }
  }
}


Android: ensure these exist in AndroidManifest.xml (Expo prebuild adds them, but double-check):

<uses-permission android:name="android.permission.RECORD_AUDIO" />

2) Metronome service (ticks you can schedule precisely)

Create src/audio/Metronome.ts

import { Audio, AVPlaybackStatus } from 'expo-av';

// Simple sample player. Use very short "tick" sample (5–20 ms) for crisp timing.
export class Metronome {
  private sound: Audio.Sound | null = null;
  private bpm = 80;
  private isRunning = false;
  private nextTickAt = 0; // ms (Date.now based)
  private timer: any = null;
  private tickUri: string;

  constructor(tickUri: string) {
    this.tickUri = tickUri;
  }

  async load() {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      interruptionModeIOS: 1,
      shouldDuckAndroid: true,
      staysActiveInBackground: false,
      allowsRecordingIOS: false, // playback-only here
    });
    const { sound } = await Audio.Sound.createAsync({ uri: this.tickUri }, { volume: 1.0 });
    this.sound = sound;
  }

  setBpm(bpm: number) {
    this.bpm = Math.max(40, Math.min(200, bpm));
  }

  // Schedule next tick a tiny bit ahead using JS timer (good enough once AEC removes echo)
  start() {
    if (this.isRunning || !this.sound) return;
    this.isRunning = true;
    const period = 60000 / this.bpm;
    this.nextTickAt = performance.now() + 200; // start in ~200ms
    const loop = async () => {
      if (!this.isRunning || !this.sound) return;
      const now = performance.now();
      if (now >= this.nextTickAt - 5) {
        // fire
        try { await this.sound.replayAsync(); } catch {}
        this.nextTickAt += period;
      }
      this.timer = requestAnimationFrame(loop);
    };
    this.timer = requestAnimationFrame(loop);
  }

  stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.timer) cancelAnimationFrame(this.timer);
  }

  getNextTicks(times = 8): number[] {
    // Return absolute times (performance.now ms) for the next N ticks (for leak-guard)
    const out: number[] = [];
    const period = 60000 / this.bpm;
    let t = this.nextTickAt;
    for (let i = 0; i < times; i++) {
      out.push(t);
      t += period;
    }
    return out;
  }

  dispose() {
    this.stop();
    this.sound?.unloadAsync();
    this.sound = null;
  }
}


You’ll load a tiny tick.wav from your assets (very short sample). We’ll use these scheduled times to ignore any detector hits within ±30 ms of ticks (belt-and-braces on top of AEC).

3) Keep WebRTC AEC/NS active

Create src/audio/enableAEC.ts

import { mediaDevices } from '@stream-io/react-native-webrtc';

// Keeping a getUserMedia stream alive with echoCancellation=true engages native AEC/NS.
export async function enableAEC(): Promise<MediaStream | null> {
  try {
    const stream = await mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false, // we want consistent amplitude
      },
      video: false,
    } as any);
    // We don't need to render or send this stream anywhere; just keep it alive.
    return stream;
  } catch (e) {
    console.warn('AEC enable failed', e);
    return null;
  }
}


Keep the returned MediaStream in state while the detector runs.

4) PCM frames + strike detector

Create src/dsp/PutterDetector.ts

import VoiceProcessor from '@picovoice/react-native-voice-processor';

// Lightweight biquad band-pass for impact emphasis (~1–6 kHz)
class Biquad {
  private a0=1; private a1=0; private a2=0; private b1=0; private b2=0;
  private z1=0; private z2=0;

  // Designing a wide band-pass by cascade of HPF (~1 kHz) then LPF (~6 kHz) is simple.
  // To keep it tiny, we approximate with a single high-pass + soft clamp envelope later.
  static highpass(sampleRate: number, cutoffHz: number, q = 0.707): Biquad {
    const bi = new Biquad();
    const w0 = 2 * Math.PI * cutoffHz / sampleRate;
    const alpha = Math.sin(w0) / (2*q);
    const cosw0 = Math.cos(w0);
    const b0 = (1 + cosw0) / 2;
    const b1 = -(1 + cosw0);
    const b2 = (1 + cosw0) / 2;
    const a0 = 1 + alpha;
    const a1 = -2 * cosw0;
    const a2 = 1 - alpha;
    // normalize
    bi.a0 = b0 / a0; bi.a1 = b1 / a0; bi.a2 = b2 / a0;
    bi.b1 = a1 / a0; bi.b2 = a2 / a0;
    return bi;
  }

  process(x: number): number {
    const y = this.a0 * x + this.a1 * this.z1 + this.a2 * this.z2 - this.b1 * this.z1 - this.b2 * this.z2;
    this.z2 = this.z1;
    this.z1 = y;
    return y;
  }
}

export type StrikeEvent = {
  t: number;          // performance.now ms when detected
  energy: number;     // peak envelope
  latencyMs: number;  // est. from frame arrival
};

// Parameters tuned for 16 kHz mono
type Opts = {
  sampleRate: number;       // e.g., 16000
  frameLength: number;      // e.g., 256 samples (~16 ms @16 kHz)
  refractoryMs?: number;    // ignore subsequent hits for N ms (e.g., 250)
  energyThresh?: number;    // dynamic baseline multiplier (e.g., 6x)
  zcrThresh?: number;       // zero-crossing rate threshold (e.g., 0.15..0.3)
  tickGuardMs?: number;     // ignore ± around metronome ticks (e.g., 30 ms)
  getUpcomingTicks?: () => number[]; // performance.now() ms list
};

export class PutterDetector {
  private opts: Required<Opts>;
  private hp: Biquad;
  private lastHitAt = 0;
  private baseline = 1e-6;     // running noise floor
  private alphaBase = 0.995;   // baseline smoother
  private onStrike: (e: StrikeEvent) => void;

  private isRunning = false;

  constructor(onStrike: (e: StrikeEvent) => void, opts: Opts) {
    this.onStrike = onStrike;
    this.opts = {
      refractoryMs: 250,
      energyThresh: 6,
      zcrThresh: 0.22,
      tickGuardMs: 30,
      getUpcomingTicks: () => [],
      ...opts,
    } as Required<Opts>;
    this.hp = Biquad.highpass(this.opts.sampleRate, 1000);
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    // Picovoice delivers Int16 frames. Choose 16 kHz in VoiceProcessor below.
    VoiceProcessor.addFrameListener(this.handleFrame);
    await VoiceProcessor.start(this.opts.frameLength, this.opts.sampleRate);
  }

  async stop() {
    if (!this.isRunning) return;
    this.isRunning = false;
    VoiceProcessor.removeFrameListener(this.handleFrame);
    await VoiceProcessor.stop();
  }

  private handleFrame = (frame: number[]) => {
    if (!this.isRunning) return;
    const now = performance.now();

    // 1) High-pass + rectified envelope + short smoothing
    let sumAbs = 0;
    let last = 0;
    let zc = 0;
    for (let i = 0; i < frame.length; i++) {
      const x = frame[i] / 32768;            // Int16 -> [-1,1]
      const y = this.hp.process(x);          // high-pass emphasize impact
      sumAbs += Math.abs(y);
      if ((y > 0 && last <= 0) || (y < 0 && last >= 0)) zc++;
      last = y;
    }
    const env = sumAbs / frame.length;       // mean abs amplitude (envelope)
    const zcr = zc / frame.length;           // zero-crossing ratio

    // 2) Update baseline (noise floor) cautiously (don’t learn on spikes)
    const clampedEnv = Math.min(env, this.baseline * 2);
    this.baseline = this.alphaBase * this.baseline + (1 - this.alphaBase) * clampedEnv;

    // 3) Dynamic threshold
    const threshold = Math.max(0.0015, this.baseline * this.opts.energyThresh);

    // 4) Candidate hit?
    const isHit = env > threshold && zcr > this.opts.zcrThresh;

    // 5) Refractory & metronome guard
    if (isHit) {
      const since = now - this.lastHitAt;
      if (since < this.opts.refractoryMs) return;

      const ticks = this.opts.getUpcomingTicks?.() ?? [];
      const guard = this.opts.tickGuardMs;
      for (const t of ticks) {
        if (Math.abs(now - t) <= guard) {
          return; // too close to our own tick, ignore (safety net on top of AEC)
        }
      }

      this.lastHitAt = now;
      this.onStrike({ t: now, energy: env, latencyMs: (this.opts.frameLength / this.opts.sampleRate) * 1000 });
    }
  };
}

5) Tie it together in a screen

Create App.tsx (or a dedicated screen)

import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Button, Platform } from 'react-native';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { Metronome } from './src/audio/Metronome';
import { enableAEC } from './src/audio/enableAEC';
import { PutterDetector } from './src/dsp/PutterDetector';
import { Audio } from 'expo-av';

const TICK_URI = 'https://your.cdn.example/tick.wav'; // or Asset.fromModule(require('./assets/tick.wav')).uri

export default function App() {
  const [granted, setGranted] = useState(false);
  const [bpm, setBpm] = useState(80);
  const [running, setRunning] = useState(false);
  const [lastHit, setLastHit] = useState<number | null>(null);
  const [aecActive, setAecActive] = useState(false);

  const metRef = useRef<Metronome | null>(null);
  const aecStreamRef = useRef<MediaStream | null>(null);
  const detectorRef = useRef<PutterDetector | null>(null);

  useEffect(() => {
    (async () => {
      const res = await request(
        Platform.select({
          ios: PERMISSIONS.IOS.MICROPHONE,
          android: PERMISSIONS.ANDROID.RECORD_AUDIO,
          default: PERMISSIONS.ANDROID.RECORD_AUDIO,
        })!
      );
      setGranted(res === RESULTS.GRANTED);
      // Preload metronome
      metRef.current = new Metronome(TICK_URI);
      await metRef.current.load();
      metRef.current.setBpm(bpm);
    })();

    return () => {
      metRef.current?.dispose();
    };
  }, []);

  const startAll = async () => {
    if (!granted || running) return;

    // 1) Engage AEC/NS by opening a WebRTC audio stream
    aecStreamRef.current = await enableAEC();
    setAecActive(!!aecStreamRef.current);

    // 2) Prepare detector
    detectorRef.current = new PutterDetector(
      (evt) => {
        setLastHit(evt.t);
        // TODO: send to your timing logic / accuracy UI
        console.log('Putt impact!', evt);
      },
      {
        sampleRate: 16000,
        frameLength: 256, // ~16ms
        getUpcomingTicks: () => metRef.current?.getNextTicks(8) ?? [],
      }
    );
    await detectorRef.current.start();

    // 3) Start metronome
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: true,   // keep mic active alongside playback
      interruptionModeIOS: 1,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
    metRef.current?.start();

    setRunning(true);
  };

  const stopAll = async () => {
    metRef.current?.stop();
    await detectorRef.current?.stop();
    detectorRef.current = null;

    // Stop and release AEC stream
    aecStreamRef.current?.getTracks().forEach(t => t.stop());
    aecStreamRef.current = null;
    setAecActive(false);

    setRunning(false);
  };

  return (
    <View style={{ flex: 1, padding: 18, gap: 12, justifyContent: 'center', backgroundColor: '#0b0b0f' }}>
      <Text style={{ color: 'white', fontSize: 22, fontWeight: '700' }}>PuttIQ2 — Impact Detector</Text>
      <Text style={{ color: '#bbb' }}>
        Mic: {granted ? 'granted' : 'not granted'} • AEC: {aecActive ? 'on' : 'off'} • BPM: {bpm}
      </Text>
      <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
        {!running ? (
          <Button title="Start" onPress={startAll} />
        ) : (
          <Button title="Stop" onPress={stopAll} />
        )}
        <Button title="BPM −" onPress={() => { setBpm(b => { const v = Math.max(40, b - 5); metRef.current?.setBpm(v); return v; }); }} />
        <Button title="BPM +" onPress={() => { setBpm(b => { const v = Math.min(200, b + 5); metRef.current?.setBpm(v); return v; }); }} />
      </View>
      <Text style={{ color: lastHit ? '#9efc9e' : '#bbb', marginTop: 12 }}>
        {lastHit ? `Last impact: +${(performance.now() - lastHit).toFixed(0)} ms` : 'No impact yet'}
      </Text>
      <Text style={{ color: '#888', marginTop: 16, fontSize: 12 }}>
        Tip: keep the phone ~0.5–1.5 m from the ball; case off; volume medium-high.
      </Text>
    </View>
  );
}

How this achieves high accuracy

AEC/NS active: we keep a WebRTC audio stream alive with echoCancellation:true. That engages native AEC so the metronome playback is subtracted from the mic path.

Wide-band impact emphasis: a high-pass biquad (~1 kHz) plus a short envelope makes the sharp, broadband putter-ball transient stand out.

Dual gate: we require energy jump and high ZCR, which removes many false positives (foot shuffles, voice).

Refractory period: prevents double-hits from reverberation.

Tick guard: ignores any candidate within ±30 ms of scheduled ticks — a safety net even if a bit of tick leaks in harsh acoustics.

Tuning checklist (quick wins)

Frame size: 256 @16 kHz is a good start (~16 ms). If you see latency spikes, try 128.

HPF cutoff: try 800–1500 Hz. Lower if the sound is “duller,” higher if you get low-freq bumps.

Energy multiplier: energyThresh: 4–10 depending on ambient noise.

ZCR: 0.18–0.28 tends to separate true impacts from thumps/voice.

Refractory: 200–300 ms is typical.

Where to plug into your app

Feed onStrike into your tempo accuracy logic to classify early/late/perfect relative to the nearest metronome edge.

Light up your UI bar green/orange based on delta.

Optionally log (t, bpm, delta) to your store for session analytics.Look at a