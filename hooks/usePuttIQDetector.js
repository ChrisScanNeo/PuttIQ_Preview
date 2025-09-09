import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { Audio } from 'expo-av';
import VoiceProcessor from '@picovoice/react-native-voice-processor';

// Only import WebRTC on native; some bundlers choke on web imports
let mediaDevices = null;
if (Platform.OS === 'ios' || Platform.OS === 'android') {
  try {
    // prefer stream-io fork; fallback to classic if needed
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    mediaDevices = require('@stream-io/react-native-webrtc').mediaDevices ?? require('react-native-webrtc').mediaDevices;
  } catch (e) {
    console.warn('Failed to load mediaDevices', e);
    mediaDevices = null;
  }
}

// ---- Minimal metronome (object-returning, no array destructuring) ----
class Metronome {
  constructor(uri) { this.uri = uri; }
  async load() {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: true,
      shouldDuckAndroid: true,
      interruptionModeIOS: 1,
      staysActiveInBackground: false,
    });
    const created = await Audio.Sound.createAsync({ uri: this.uri }, { volume: 1.0 });
    this.sound = created.sound; // <- object property access (safe)
  }
  setBpm(bpm) { this.bpm = Math.max(40, Math.min(200, bpm)); }
  start() {
    if (!this.sound || this.raf) return;
    const period = 60000 / this.bpm;
    this.nextTickAt = performance.now() + 200;
    const loop = async () => {
      const now = performance.now();
      if (now >= this.nextTickAt - 5) {
        try { await this.sound.replayAsync(); } catch {} // eslint-disable-line no-empty
        this.nextTickAt += period;
      }
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
  stop() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = null; }
  getNextTicks(n = 8) {
    const out = [];
    const period = 60000 / this.bpm;
    let t = this.nextTickAt || performance.now();
    for (let i = 0; i < n; i++) { out.push(t); t += period; }
    return out;
  }
  async dispose() { this.stop(); await this.sound?.unloadAsync(); this.sound = null; }
}

// ---- Simple high-pass + transient detector (no array destructuring anywhere) ----
class HPF {
  constructor() { this.a0=1; this.a1=0; this.a2=0; this.b1=0; this.b2=0; this.z1=0; this.z2=0; }
  static highpass(sr, fc, q = 0.707) {
    const f = new HPF();
    const w0 = 2*Math.PI*fc/sr, alpha = Math.sin(w0)/(2*q), c = Math.cos(w0);
    const b0=(1+c)/2, b1=-(1+c), b2=(1+c)/2, a0=1+alpha, a1=-2*c, a2=1-alpha;
    f.a0=b0/a0; f.a1=b1/a0; f.a2=b2/a0; f.b1=a1/a0; f.b2=a2/a0;
    return f;
  }
  process(x) { const y=this.a0*x+this.a1*this.z1+this.a2*this.z2 - this.b1*this.z1 - this.b2*this.z2; this.z2=this.z1; this.z1=y; return y; }
}

export function usePuttIQDetector(defaultBpm = 80) {
  const [isInitialized, setInitialized] = useState(false);
  const [permissionGranted, setPerm] = useState(false);
  const [aecActive, setAec] = useState(false);
  const [isRunning, setRunning] = useState(false);
  const [bpm, setBpm] = useState(defaultBpm);
  const [lastHit, setLastHit] = useState(null);

  const metRef = useRef(null);
  const aecStreamRef = useRef(null);
  const hpRef = useRef(null);
  const baselineRef = useRef(1e-6);
  const lastHitAtRef = useRef(0);

  // Initialize once
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const tickUri = 'https://cdn.jsdelivr.net/gh/anars/blank-audio/1-second-of-silence.mp3'; // replace with short tick in real app
        metRef.current = new Metronome(tickUri);
        await metRef.current.load();
        metRef.current.setBpm(bpm);

        // Request mic permission via VoiceProcessor (Android) or react-native-permissions if you prefer
        try {
          // VoiceProcessor will request its own permission on start; we can soft-check by just setting true for now.
          setPerm(true);
        } catch (e) {
          console.warn('VoiceProcessor permission check failed', e);
          setPerm(false);
        }

        hpRef.current = HPF.highpass(16000, 1000);
        if (mounted) setInitialized(true);
      } catch (e) {
        console.warn('Detector init failed', e);
        if (mounted) setInitialized(false);
      }
    })();
    return () => { mounted = false; metRef.current?.dispose(); };
  }, []);

  const enableAEC = useCallback(async () => {
    if (!mediaDevices) return false;
    try {
      const s = await mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false },
        video: false,
      });
      aecStreamRef.current = s;
      setAec(true);
      return true;
    } catch (e) {
      console.warn('AEC enable failed', e);
      setAec(false);
      return false;
    }
  }, []);

  const start = useCallback(async () => {
    if (isRunning) return;
    // Engage AEC if possible (native only)
    if (Platform.OS === 'ios' || Platform.OS === 'android') {
      await enableAEC();
    }

    // Start mic frames
    try {
      VoiceProcessor.addFrameListener((frame) => {
        const now = performance.now();
        // HPF + envelope + ZCR
        let sum = 0, last = 0, zc = 0;
        const hp = hpRef.current;
        for (let i = 0; i < frame.length; i++) {
          const y = hp.process(frame[i] / 32768);
          sum += Math.abs(y);
          if ((y > 0 && last <= 0) || (y < 0 && last >= 0)) zc++;
          last = y;
        }
        const env = sum / frame.length;
        const zcr = zc / frame.length;

        // update baseline carefully
        const base = baselineRef.current;
        const nextBase = 0.995 * base + 0.005 * Math.min(env, base * 2);
        baselineRef.current = nextBase;

        const threshold = Math.max(0.0015, nextBase * 6);
        const isHit = env > threshold && zcr > 0.22;

        if (isHit && now - lastHitAtRef.current > 250) {
          // tick guard (belt and braces)
          const ticks = metRef.current?.getNextTicks(8) ?? [];
          for (const t of ticks) {
            if (Math.abs(now - t) <= 30) return;
          }
          lastHitAtRef.current = now;
          setLastHit({ t: now, energy: env, latencyMs: (256 / 16000) * 1000 });
        }
      });
      await VoiceProcessor.start(256, 16000); // returns void; DO NOT array-destructure
    } catch (e) {
      console.warn('VoiceProcessor start failed', e);
    }

    // Start metronome
    try { metRef.current?.start(); } catch {} // eslint-disable-line no-empty

    setRunning(true);
  }, [enableAEC, isRunning]);

  const stop = useCallback(async () => {
    try { metRef.current?.stop(); } catch {} // eslint-disable-line no-empty
    try {
      VoiceProcessor.removeFrameListener(() => {});
      await VoiceProcessor.stop();
    } catch {} // eslint-disable-line no-empty

    try {
      if (aecStreamRef.current) {
        aecStreamRef.current.getTracks().forEach((t) => t.stop());
        aecStreamRef.current = null;
      }
      setAec(false);
    } catch {} // eslint-disable-line no-empty

    setRunning(false);
  }, []);

  const updateBpm = useCallback((v) => {
    setBpm(v);
    metRef.current?.setBpm(v);
  }, []);

  return {
    isInitialized,
    isRunning,
    permissionGranted,
    aecActive,
    bpm,
    lastHit,
    updateBpm,
    start,
    stop,
  };
}