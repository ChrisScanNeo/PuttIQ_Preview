# Detection Tuning Playbook

Context: the first adjustment (listen window = 540 ms, energy threshold = 1.3×, spike hold = 2 frames) did not produce reliable putt detections. Use the steps below to iterate. Each builds on the previous one.

## Latest Updates
- ✅ Baseline resets now pause detection for a 100 ms settle window and only restart once the listening zone is active (implemented in `VideoSyncDetectorV2` and `PutterDetectorAcoustic`).
- ✅ Listening-zone gating is enforced everywhere so putts are only evaluated inside the 67–100 % window after Beat 3.
- ✅ Added a “fast strike” shortcut: any spike ≥4× the baseline immediately satisfies the two-frame hold, preventing true putts from being dropped by the metering cadence.
- ✅ Timing feedback compensates for audio latency; adjust `audioLatencyMs` (default = `hitProcessingDelayMs`) if the UI still grades centered hits as early/late.
- ✅ Current “no false Beat 3” baseline (May 2025):
  - `listenDelayMs = 380` (opens ~63–64 % into the loop)
  - `listeningEntryGuardMs = 100` (blanket guard right after window opens)
  - `singleFrameBypassRatio = 2.2` with `spikeHoldFrames = 2` and `energyThreshold = 1.2`
  - `micGain = 3.0`, `listeningTailMs = 240`, `audioLatencyMs = 180`, `hitProcessingDelayMs = 0`
  - Detector logs now surface `entryGuardActive` / `detectionWindowActive` to confirm which gate is suppressing spikes.

## Step 1 – Tune the Existing Window (Completed, No Gain)
- Parameters tested: `listenDelayMs = 540`, `spikeHoldFrames = 2`, `energyThreshold = 1.3`, `micGain = 2.5`.
- Outcome: putt still not detected; proceed to Step 2.

## Step 2 – Stabilize the Baseline
1. Increase `baselineWindow` (e.g., 50 → 80) to smooth residual beat energy before the window opens.
2. Force `resetBaseline()` whenever Listen Mode toggles on so the next loop starts with a fresh noise profile.
3. **Implemented:** Add a short “settle” delay (100 ms) right after the reset before resuming detection so the baseline cannot relearn the tick tail.

## Step 3 – Add Lightweight Filtering
1. High-pass filter: apply a single-pole filter ≥500 Hz (before RMS) to kill low-frequency beat remnants.
2. Notch filter: remove the exact metronome tone frequency (if known) to suppress direct bleed-through.
3. Spectral check: compute FFT/Goertzel and reject spikes dominated by the metronome frequency band.

## Step 4 – Raise the Spike Quality Bar
1. Require `ratio >= 6x` (or higher) in addition to the existing threshold. **Current:** fast-strike override fires immediately when `ratio >= 4x`, otherwise normal hold rules apply.
2. Expand `spikeHoldFrames` (e.g., 3–4) to ensure the spike persists longer than the tone tail.
3. Record `levelRaw`, `baseline`, `ratio`, and hold state for every detected spike to calibrate thresholds.

## Step 5 – Blank Out the Beat Tail
1. After the listen window opens, ignore spikes for the first 50–100 ms. **Current:** listening window opens ~540 ms after Beat 3 and the “baseline settle” gate enforces the blanking period automatically.
2. Resume normal detection only after the blanking window expires.
3. Log both the blanking start/end times for visibility.

## Step 6 – Capture Diagnostics
1. Store the timestamped log for each hit candidate (raw/adjusted levels, in-window status).
2. Optionally buffer ~250 ms of audio around each spike for offline review.
3. Tag true putts vs. false positives to build a small labeled dataset for future classifiers.

## Step 7 – Align Timing Feedback
1. Use the hit logs (`latencyAppliedMs`, `adjustedPosition`) to confirm centered putts score near zero error.
2. If the UI still reports “late” hits, lower `audioLatencyMs`; if it reports “early” hits, raise it until the visual target matches the strike you hear.
3. Keep `hitProcessingDelayMs` and `audioLatencyMs` in sync (default 50 ms) so processing latency and displayed timing stay aligned.

## Notes
- Always keep `debugMode` enabled during tuning to see the `LISTENING WINDOW` and `AUDIO SPIKE` events.
- Adjust parameters incrementally and re-test on the same putt scenario to isolate effects.
- Document outcomes after each step back in this file to avoid repeating experiments.
