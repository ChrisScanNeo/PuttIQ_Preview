# PuttIQ2 — Implementation Plan: Personalized Putter Detection & Noise Filtering

This document specifies how to implement **personalized putter detection** in a React Native (Expo) app using:
- A **30-second onboarding** to capture each golfer’s putter fingerprint,
- **Always-on filtering** of metronome and other known noises,
- A **tick-guard (±30 ms)** around scheduled beats,
- Low-latency, on-device processing (no network dependency).

> Target stack: **Expo SDK 53 / RN 0.79**, `expo-av` for playback, `@picovoice/react-native-voice-processor` for mic frames, `@stream-io/react-native-webrtc` (or `react-native-webrtc`) to engage **AEC/NS**, and a tiny DSP layer in JS/TS.

---

## 0) Goals & Non-Goals

**Goals**
- Detect **putter–ball impact** with high precision, per user.
- Filter out **metronome ticks** and other **known noises**.
- Keep latency < 50–80 ms end-to-end on modern phones.
- Work **offline** once profiles are onboarded.

**Non-Goals**
- Full speech/noise classification ML. (We use fast spectral templates; can be upgraded later.)

---

## 1) Installation & Permissions

```bash
expo install expo-av
npm i @picovoice/react-native-voice-processor
npm i @stream-io/react-native-webrtc         # or: react-native-webrtc
npm i @react-native-async-storage/async-storage
npm i react-native-permissions
iOS (app.json)

json
Copy code
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSMicrophoneUsageDescription": "Detects putter-ball impact timing."
      }
    }
  }
}
Android
Verify RECORD_AUDIO permission (Expo prebuild will add it).

2) Architecture Overview
java
Copy code
Playback (expo-av)
   └── Metronome ticks (known samples)
Mic Capture (VoiceProcessor @ 16 kHz / 256 frames)
   └── WebRTC AEC + NS enabled (keep a getUserMedia stream open)
DSP Pipeline (per frame, ~16 ms)
   ├── High-pass (≈1 kHz) + Envelope + ZCR
   ├── Profiles Gate
   │    ├── Ignore profiles (metronome variants, voice, etc.)
   │    └── Target profile (user’s putter)
   ├── Tick-guard ±30 ms around scheduled ticks
   ├── Refractory 200–300 ms
   └── Strike event → UI + analytics
Storage
   ├── AsyncStorage: user profiles (Float32Array serialized)
   └── Bundled JSON: default metronome ignore templates
3) Data Structures
3.1 Profile Types
ts
Copy code
export type SpectralTemplate = Float32Array;

export type Profile = {
  id: string;                 // uuid
  name: string;               // "Metronome: wood", "User Putter", etc.
  kind: 'ignore' | 'target';  // filter vs must-match
  template: SpectralTemplate; // 128 bins (log-mag of 256-pt FFT)
  threshold: number;          // sim gate: ignore ≥0.88, target ≥0.80
  enabled: boolean;
  sampleRate: 16000;
  frameSize: 256;
  createdAt: number;
};
3.2 Storage
AsyncStorage: user’s profiles (including “User Putter”).

Bundled assets: metronomes.json (array of Profile minus the Float32Array, stored as number arrays). Convert arrays → Float32Array at load time.

4) Onboarding Workflow (30-Second Putter Session)
Goal: Build a Target profile for the golfer’s own putter.

UX flow

Screen: “Record Your Putter (30s)”

Show a 30 s countdown, instructions: place the phone 0.5–1.5 m from the ball, quiet room.

Button: Start → begin recording frames from VoiceProcessor.

Capture ~30 s of frames at 16 kHz, 256-sample chunks (~16 ms each).

Build a spectral template:

Compute log-magnitude spectrum per frame (Hann window).

Keep only frames that pass a transient check (envelope rise + ZCR > 0.22) to bias toward impacty content.

Average ~40–120 best frames to one template; L2-normalize.

Save profile:

kind = 'target', name = 'User Putter', threshold ≈ 0.80, enabled = true.

Notes

The longer window (30 s) yields a robust, user-specific fingerprint.

If <40 valid impact frames were detected, prompt to re-record (room too quiet/noisy).

5) Metronome Noise: In-App & Background Filtering
We combine three strategies to neutralize ticks:

Acoustic Echo Cancellation (AEC)

Open a getUserMedia stream with {echoCancellation: true, noiseSuppression: true} and keep it alive while practicing.

The OS subtracts the exact playback reference from the mic path.

Ignore Profiles

Precompute templates for each metronome variant (wood click, beep, rimshot, etc.) outside the app (e.g., a small CLI or Claude workflow).

Ship as metronomes.json, load at app start, convert to Float32Array, set kind='ignore', threshold≈0.88–0.90, enabled=true.

Tick-Guard (±30 ms)

Maintain scheduled metronome tick times from the playback service.

Drop any candidate detection occurring within ±30 ms of the nearest scheduled tick.

With AEC + ignore profiles + tick-guard, metronome ticks are robustly eliminated without user effort.

6) Detector Loop (Pseudo/TS)
Called by VoiceProcessor every 256 samples (~16 ms @16 kHz).

ts
Copy code
function onAudioFrame(int16Frame: number[], nowMs = performance.now()) {
  // 1) Transient features
  const y = highPass1000Hz(int16Frame);        // fast biquad, per-sample
  const env = meanAbs(y);                      // envelope
  const zcr = zeroCrossRate(y);                // broadband check
  baseline = 0.995*baseline + 0.005*Math.min(env, baseline*2);
  const threshold = Math.max(0.0015, baseline * ENERGY_MULT); // 4..10×
  const transient = env > threshold && zcr > 0.22;
  if (!transient) return;

  // 2) Profiles gate
  const spec = logMagSpectrum256(int16Frame);  // Float32Array[128], Hann + FFT + log + L2 norm
  for (const p of enabledIgnoreProfiles) {
    if (cosineSim(spec, p.template) >= p.threshold) return;   // reject
  }
  let targetRequired = enabledTargetProfiles.length > 0;
  let targetMatched = false;
  for (const p of enabledTargetProfiles) {
    if (cosineSim(spec, p.template) >= p.threshold) {
      targetMatched = true; break;
    }
  }
  if (targetRequired && !targetMatched) return;

  // 3) Tick-guard ±30 ms
  const ticks = metronome.getNextTicks(8); // absolute times
  for (const t of ticks) {
    if (Math.abs(nowMs - t) <= 30) return;
  }

  // 4) Refractory (prevent double hits)
  if (nowMs - lastHitAtMs < 250) return;

  lastHitAtMs = nowMs;
  emitStrike({ t: nowMs, energy: env, latencyMs: 1000 * FRAME_SIZE / SAMPLE_RATE });
}
Parameters to expose for tuning

ENERGY_MULT (4–10)

HPF cutoff (800–1500 Hz)

ZCR (0.18–0.28)

Refractory (200–300 ms)

TickGuardMs (30 ms default)

7) Services & Modules
7.1 Metronome Service
expo-av sound with short tick.wav.

Maintains scheduled tick timestamps (performance.now() clock).

Public API: setBpm(bpm), start(), stop(), getNextTicks(n).

7.2 AEC Enabler
On native, create a WebRTC getUserMedia({ audio: { echoCancellation:true, noiseSuppression:true }}) stream and keep it alive while the detector runs.

Do not render it; just retain the stream to keep AEC active.

7.3 Profiles Store
loadProfiles() / saveProfiles() via AsyncStorage.

At bootstrap:

Load user profiles from storage.

Load metronomes.json (bundled defaults), map arrays → Float32Array, add into the active profile set.

7.4 Onboarding Screens
Profile Manager: list profiles, toggle enabled, delete.

Record Putter: 30-second capture, auto-build target profile, save.

(Optional) Add Ignore: record ~1 s of any new noise in the wild (e.g., a specific beep), auto-build ignore profile.

8) “Pass the Metronome Sounds into the App” (Background Provisioning)
Where the templates come from

You have the source .wav tick samples (or can render them from your DAW).

Use a tiny offline script (Node or Python) or Claude to:

Resample to 16 kHz mono,

Chop into 256-sample frames (Hann),

Average log-magnitude spectra,

Normalize (L2),

Emit JSON array of numbers (length 128).

App Bundling

Store as assets/metronomes.json:

json
Copy code
[
  { "name":"Metronome: wood", "kind":"ignore", "threshold":0.88, "template":[0.012,0.031,...] },
  { "name":"Metronome: beep", "kind":"ignore", "threshold":0.90, "template":[...] }
]
On app start: fetch JSON, map template arrays to Float32Array, add to active ignore profiles.

Remote Updates (optional)

Fetch updated metronomes.json from your CDN on app launch (with ETag). Cache to AsyncStorage. This lets you add new tick types without an app update.

9) UI Integration & Session Flow
Before first use

User walks through “Record Your Putter (30 s)”.

We save Target: User Putter profile.

Each practice session

On “Start Session”:

Ensure mic permission.

Start AEC stream (native only).

Start VoiceProcessor (16 kHz, 256).

Start metronome playback (if user enabled).

Load Ignore (metronomes) + Target (user putter) profiles.

Detector runs; strike events:

Compute delta to the nearest tick; color the timing bar (green/orange).

Log (timestamp, bpm, delta, energy) for analytics.

On “Stop Session”:

Stop detector, AEC, and playback; persist session stats.

10) Performance & QA
Performance

Keep frame size 256; avoid heavy JS allocation in callbacks.

Reuse buffers; pre-allocate Float32Arrays where possible.

If needed, throttle feature extraction to every other frame (32 ms) and interpolate envelopes (usually not necessary).

QA scenarios

Quiet room vs. noisy room (HVAC hum, chatter).

Phone positions: desk, pocket, bag—document recommended placement.

Multiple metronome sounds (ensure all default ignore profiles are enabled).

Edge cases: double strike, tapping the phone, speech near device.

Metrics to log (debug)

env, baseline, zcr, similarity scores to active profiles, refractory/tick-guard veto reasons.

11) Error Handling & Safety Nets
Always guard destructuring (hooks return objects, never arrays).

Wrap native calls (VoiceProcessor.start, getUserMedia) in try/catch.

If AEC cannot start, proceed with ignore profiles + tick-guard (still robust).

12) Future Enhancements (Optional)
Tiny classifier (TFLite/Mobile): MFCC → [putter, metronome, speech, knock] for extra confidence.

Adaptive thresholds: per-room calibration; auto-lower ignore threshold if false accepts detected.

Multi-mic fusion (iOS spatial mics): prefer the channel with highest SNR.

13) Developer Checklist
 Add modules & permissions.

 Implement Metronome service with getNextTicks(n).

 Implement AEC enabler (keep stream running).

 Implement detector loop with HPF + Envelope + ZCR + Profiles gate + Tick-guard + Refractory.

 Build Profile store (AsyncStorage).

 Ship assets/metronomes.json + loader.

 Build Record Putter (30 s) onboarding.

 Build Profile Manager (toggle enable/disable).

 Wire session UI to show timing accuracy; persist per-session metrics.

 Add debug overlay for similarity/thresholds during testing.

14) Pared-Down Code Snippets (drop-in)
Profiles Gate

ts
Copy code
function applyProfiles(spec: Float32Array, profiles: Profile[]): 'reject'|'pass'|'target' {
  let needTarget = false, gotTarget = false;
  for (const p of profiles) {
    if (!p.enabled) continue;
    const sim = cosineSim(spec, p.template);
    if (p.kind === 'ignore' && sim >= p.threshold) return 'reject';
    if (p.kind === 'target') { needTarget = true; if (sim >= p.threshold) gotTarget = true; }
  }
  return needTarget ? (gotTarget ? 'target' : 'reject') : 'pass';
}
Tick-Guard (±30 ms)

ts
Copy code
const ticks = metronome.getNextTicks(8);
for (const t of ticks) if (Math.abs(nowMs - t) <= 30) return; // veto
Refractory

ts
Copy code
if (nowMs - lastHitAtMs < 250) return;
lastHitAtMs = nowMs;
15) Summary
User-specific: 30 s onboarding builds a Target profile for their putter.

Metronome immune: AEC + default Ignore profiles + ±30 ms tick-guard.

Fast & offline: simple DSP, no cloud roundtrips.

Extensible: add new metronome variants via a JSON asset or remote config.

This plan keeps detection accurate, configurable, and low-latency—ready for production sessions.
