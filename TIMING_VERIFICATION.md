# Timing Verification for BPMs 70-80

This document verifies that the proportional timing calculations are correct across all supported BPMs.

## Formula

```javascript
beatDurationMs = (60 / BPM) * 1000
videoDuration = beatDurationMs * 4
listenDelayMs = beatDurationMs * 0.583
listenDelayPercent = listenDelayMs / videoDuration
listenStartPercent = 0.50 + listenDelayPercent  // Beat 3 (50%) + delay
```

## Expected Values

| BPM | Beat Duration | Video Duration | Listen Delay | Delay % | Listen Start % |
|-----|---------------|----------------|--------------|---------|----------------|
| 70  | 857ms         | 3,428ms        | 500ms        | 14.6%   | 64.6%          |
| 71  | 845ms         | 3,380ms        | 493ms        | 14.6%   | 64.6%          |
| 72  | 833ms         | 3,332ms        | 486ms        | 14.6%   | 64.6%          |
| 73  | 822ms         | 3,288ms        | 479ms        | 14.6%   | 64.6%          |
| 74  | 811ms         | 3,244ms        | 473ms        | 14.6%   | 64.6%          |
| 75  | 800ms         | 3,200ms        | 466ms        | 14.6%   | 64.6%          |
| 76  | 789ms         | 3,156ms        | 460ms        | 14.6%   | 64.6%          |
| 77  | 779ms         | 3,116ms        | 454ms        | 14.6%   | 64.6%          |
| 78  | 769ms         | 3,076ms        | 449ms        | 14.6%   | 64.6%          |
| 79  | 759ms         | 3,036ms        | 443ms        | 14.6%   | 64.6%          |
| 80  | 750ms         | 3,000ms        | 437ms        | 14.6%   | 64.6%          |

## Key Observations

1. **Listen Start Position**: Consistent at 64.6% across all BPMs ✓
2. **Beat 4 Target**: Always at 75% (constant across all BPMs) ✓
3. **Listen Window**: Always from 64.6% to 100% (35.4% of video) ✓
4. **Proportional Scaling**: Listen delay scales with tempo to maintain relative position ✓

## Detection Window Duration

| BPM | Listen Window Duration | In Milliseconds |
|-----|------------------------|-----------------|
| 70  | 35.4%                  | ~1,214ms        |
| 71  | 35.4%                  | ~1,197ms        |
| 72  | 35.4%                  | ~1,180ms        |
| 73  | 35.4%                  | ~1,164ms        |
| 74  | 35.4%                  | ~1,148ms        |
| 75  | 35.4%                  | ~1,133ms        |
| 76  | 35.4%                  | ~1,117ms        |
| 77  | 35.4%                  | ~1,103ms        |
| 78  | 35.4%                  | ~1,089ms        |
| 79  | 35.4%                  | ~1,075ms        |
| 80  | 35.4%                  | ~1,062ms        |

## Verification Steps

1. ✅ Updated `VideoSyncDetectorV2.js` `getBeatTiming()` to calculate proportional delay
2. ✅ Added detect videos for BPMs 71-80 to HomeScreen.js videoMap
3. ✅ Verified timing calculations maintain consistent relative positions

## Testing Checklist

- [ ] Test detection at 70 BPM (baseline - should work as before)
- [ ] Test detection at 75 BPM (mid-range)
- [ ] Test detection at 80 BPM (fastest tempo)
- [ ] Verify listen window starts at 64.6% for each BPM
- [ ] Confirm no false detections from Beat 3 tone
- [ ] Verify hits at Beat 4 (75%) show as PERFECT (green)

## Notes

- The 0.583 multiplier (58.3% of beat duration) was derived from the working 70 BPM configuration
- At 70 BPM: 500ms delay / 857ms beat = 0.583
- This ratio is now applied to all BPMs to maintain consistent detection behavior
