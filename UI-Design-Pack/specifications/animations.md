# Animation Specifications

## Golf Ball Animations

### Hit Detection Pulse
- **Trigger**: When putt is detected
- **Scale**: 1.0 → 1.15 → 1.0
- **Duration**: 300ms total (150ms up, 150ms down)
- **Easing**: ease-in-out
- **Purpose**: Immediate tactile feedback

### Colored Ring Expansion
- **Trigger**: Simultaneous with hit detection
- **Scale**: 0.8 → 1.5
- **Opacity**: 0 → 0.8 → 0
- **Duration**: 500ms
- **Color**: Based on hit quality (Green/Yellow/Orange)
- **Purpose**: Visual quality indicator

### Listening Zone Glow
- **Trigger**: Entering listening zone (20-80% of beat)
- **Opacity**: 0 → 0.15
- **Duration**: 300ms fade in/out
- **Color**: `#4CAF50` (green)
- **Size**: 130% of ball size
- **Purpose**: Indicate detection window

## Status Bar Animations

### Beat Position Marker
- **Type**: Linear position update
- **Range**: 0-100% of bar width
- **Update Rate**: 60fps
- **Reset**: Jumps to 0 at beat end
- **Purpose**: Visual metronome

### Zone Indicator Dot
- **Color Change**: `#666` → `#4CAF50`
- **Duration**: Instant
- **Trigger**: Zone entry/exit
- **Purpose**: Binary state indicator

## Text Animations

### Hit Quality Text
- **Appear**: Fade in 200ms
- **Display**: Hold 300ms
- **Disappear**: Fade out 200ms
- **Position**: 30% from top
- **Movement**: None (static position)

### Status Text Changes
- **Type**: Instant replacement
- **No transition animations
- **Purpose**: Clear state changes

## Interaction Animations

### Ball Tap
- **Active Opacity**: 0.95
- **Response**: Immediate
- **No delay or debounce
- **Visual**: Slight opacity change

### Start/Stop Transition
- **Metronome Start**: Immediate
- **Metronome Stop**: Immediate
- **No fade transitions

## Performance Guidelines

### Frame Rates
- **Target**: 60fps for all animations
- **Minimum**: 30fps acceptable
- **Critical**: Beat marker must stay synchronized

### Animation Priorities
1. **High**: Hit detection feedback (must be instant)
2. **Medium**: Visual indicators (zone glow, rings)
3. **Low**: Decorative elements

### Optimization Rules
- Use native driver where possible
- No animations during audio processing
- Batch animations together
- Avoid layout recalculations

## Timing Diagram

```
Hit Detected (T=0)
├─ Ball Pulse (0-300ms)
├─ Ring Expansion (0-500ms)
├─ Text Fade In (0-200ms)
├─ Text Hold (200-500ms)
└─ Text Fade Out (500-700ms)
```

## Accessibility Considerations
- Provide non-animated alternatives
- Respect reduced motion settings
- Ensure feedback isn't solely animation-based
- Keep animations subtle to avoid distraction