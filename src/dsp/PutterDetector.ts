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
