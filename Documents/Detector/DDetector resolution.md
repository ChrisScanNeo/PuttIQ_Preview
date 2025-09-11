Here’s a crisp, do-this-now summary to get the app listening for your putt reliably.

Goal

Detect your putts on a green, ignore ticks/other golfers, and give instant feedback.

1) Widen the sound you capture (thump + crack)

Change: Band-pass from 200–8000 Hz (was 1–6 kHz).
Where: PutterDetectorExpo.initializeFilters() → FilterCascade.createBandpass(...).

// PutterDetectorExpo.js
this.bandpassFilter = FilterCascade.createBandpass(
  this.opts.sampleRate,
  200,   // was 1000
  8000   // was 6000
);


This keeps the low “thump” (<1 kHz) and the high “crack” (>6 kHz) that differentiate nearby vs far impacts.

2) Make the detector sensitive enough (then gate it)

Change: Lower energy threshold; boost gain.
Where: PutterDetectorExpo defaults.

// Lower bar & boost input (tune if clipping)
energyThresh: 2,     // was 6
audioGain: 120.0,    // was 50.0


The current defaults are too conservative for quiet outdoor input. We’ll rely on timing + profile checks to keep false hits down.

3) Always listen inside a timing window

You already support a listening zone. Keep it ON by default in the hook and pass through to the detector. Suggested: start at 20% of the beat, listen for 60% (i.e., 20–80%). This crushes off-window noise and other golfers’ hits. Verify these options are set when creating the detector (they already are in your hook):

useListeningZone: true,
listeningZoneOffset: 0.20,
listeningZonePercent: 0.60,
tickGuardMs: 50


4) Tighten spectral matching (profiles)

Now: FFT size 256 → 128 bins; similarities skew high.
Action (Phase 1 – minimal code):

Keep 256 for now but raise thresholds:

User putter (“target”): 0.88–0.92 after calibration.

Metronome (“ignore”): ≥ 0.97 (be strict since templates are partly synthetic).

Ensure profile checks run after an energy gate (e.g., energy > baseline × 2), which your detector already does.

Phase 2 (when ready):

Bump SpectralAnalysis to frameSize 512 and store 256-bin templates for clearer separation (update builder + manager accordingly). Current 128-bin setup is coarse.

5) Strengthen the calibration flow

In PutterCalibrationScreen you already record 10 putts and build a profile. Add two guards before saving:

Signal-quality check: reject if average impact energy < target (e.g., avgEnergy < 0.005) and tell user to move the phone closer (0.5–1.5 m).

Consistency check: use your builder’s quality metrics; require confidence ≥ “medium” before saving (or prompt to retry). (Your builder already computes quality/consistency—enforce it here.)

6) AEC + “ignore” profiles for metronome

Keep AEC on while the metronome plays (unchanged if already enabled in your audio session).

Keep metronome ignore profiles enabled and strict (≥ 0.97) to filter any residual tick energy.

7) Telemetry to prove it works (and tune on-course)

Add lightweight logs so we can quickly verify in the field:

Every 50 frames: Energy, Baseline, Threshold, ZCR, Crest. (You already log most of this—keep it.)

Add a periodic raw max amplitude log in extractFeatures to confirm mic scaling:

if (this.frameCount % 50 === 0) {
  console.log(`RAW maxAbs=${maxAbs.toFixed(4)}`);
}


8) Optional but powerful: Motion-arming

Use accelerometer to “arm” a 400–600 ms window; only allow audio hits while armed. This turns rare synchronized outside putts into non-events. (Integrate in your hook where you already pass timing/ticks. The detector supports gating; just AND the motion flag with useListeningZone pass-through.)

9) Quick field-test protocol (acceptance)

Place phone ~1 m from ball on turf.

Calibrate 10 putts; ensure calibration quality ≥ medium.

BPM 40–60, window 20–80%.

30 solo putts → expect ≥ 90–95% hit rate.

Two golfers nearby, unsynchronized → ≤ 1/30 false.

If synchronized drill → enable motion-arming; repeat.

Touchpoints recap (files to edit)

PutterDetectorExpo.js

Band-pass 200–8000 Hz; energyThresh=2; audioGain≈120; add raw amplitude log.

usePuttIQDetector.js

Keep useListeningZone=true, offset=0.20, percent=0.60, tickGuardMs=50.

MetronomeTemplateGenerator.js

Set ignore threshold ≥ 0.97 for defaults.

PutterCalibrationScreen.js

Enforce energy floor and quality≥medium before saving.

(Later) SpectralAnalysis.js

Consider frameSize 512 and 256-bin templates for tighter profiles.

What this buys you

Sensitivity (gain + lower threshold) only inside a tight timing window.

Metronome eliminated via AEC + strict ignore.

Your putter favored via high-quality calibration and higher target threshold.

Clean logs to tune on-course in minutes.

That’s the whole plan—implement the 5 core tweaks (band-pass, thresholds/gain, timing gate, calibration guards, strict ignore) and you’ll have robust on-green detection that counts your putts and ignores almost everything else.