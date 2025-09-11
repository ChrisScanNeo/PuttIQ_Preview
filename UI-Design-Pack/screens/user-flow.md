# User Flow & Interactions

## App Launch Flow
```
App Opens
    ↓
Landscape Lock Applied
    ↓
Home Screen Display
    ↓
"TAP BALL TO START" Message
```

## Main Interaction Flow

### Starting Practice
```
User Taps Golf Ball
    ↓
Metronome Starts at Selected BPM
    ↓
Status Bar Shows BPM
    ↓
Beat Position Marker Animates
    ↓
Listening Zone Activates (20-80% of beat)
```

### During Practice
```
Beat Cycle (Continuous Loop):
├─ 0%: Metronome Tick (Not Listening)
├─ 20%: Enter Listening Zone (Green Glow)
├─ 20-80%: Detect Putts
│   └─ Putt Detected → Show Feedback
├─ 80%: Exit Listening Zone
└─ 100%: Metronome Tick → Loop

Putt Detection:
├─ Strong Hit → Green Ring + "STRONG"
├─ Medium Hit → Yellow Ring + "MEDIUM"
└─ Weak Hit → Orange Ring + "WEAK"
```

### Stopping Practice
```
User Taps Golf Ball Again
    ↓
Metronome Stops
    ↓
Beat Marker Resets
    ↓
"TAP BALL TO START" Returns
```

## BPM Adjustment
```
User Drags Slider
    ↓
BPM Updates (30-100 range)
    ↓
If Running: Tempo Changes Immediately
If Stopped: Ready for Next Session
```

## State Diagram

```
        ┌─────────┐
        │  IDLE   │
        └────┬────┘
             │ Tap Ball
        ┌────▼────┐
        │ RUNNING │◄──┐
        └────┬────┘   │
             │        │ BPM Change
             │        │
        ┌────▼────┐   │
        │LISTENING├───┘
        │  ZONE   │
        └────┬────┘
             │ Putt Detected
        ┌────▼────┐
        │FEEDBACK │
        └─────────┘
```

## Timing Windows

### Beat Period Breakdown (at 30 BPM = 2000ms)
- 0-400ms: Dead zone (post-tick)
- 400-1600ms: Listening zone (GREEN)
- 1600-2000ms: Dead zone (pre-tick)

### Detection Response Times
- Audio detection: <50ms
- Visual feedback start: <100ms
- Full animation: 500ms

## Error States

### No Microphone Permission
- Show alert: "Microphone access required"
- Disable hit detection
- Allow practice with visual only

### Audio Playback Error
- Fallback to visual-only mode
- Show warning message
- Continue with limited functionality