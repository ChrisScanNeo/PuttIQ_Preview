# BPM Slider Component

## Overview
Horizontal slider for adjusting metronome tempo between 30-100 BPM.

## Visual Design

```
30 ━━━━━━━●━━━━━━━━━━━━━━━━━━━━━━━━━━━ 100
         BPM: 45
```

## Specifications

### Track
- **Width**: 60% of screen width (min 200px)
- **Height**: 4px
- **Color**: `rgba(255, 255, 255, 0.3)`
- **Border Radius**: 2px
- **Active Color**: `#4CAF50` (left of thumb)

### Thumb
- **Size**: 28x28px
- **Shape**: Circle
- **Color**: White
- **Shadow**: `0 2px 4px rgba(0,0,0,0.3)`
- **Active Scale**: 1.2x when dragging
- **Border**: 2px solid `#4CAF50`

### Labels
- **Min Label**: "30" (left)
- **Max Label**: "100" (right)
- **Current Value**: Below slider center
- **Font Size**: 14px
- **Color**: White
- **Font Weight**: 600

## Interaction States

### Default
- Thumb at current BPM position
- Track shows progress fill

### Hover (Desktop)
- Thumb scales to 1.1x
- Cursor: pointer

### Active (Dragging)
- Thumb scales to 1.2x
- Track highlight intensifies
- Value updates in real-time

### Disabled
- Opacity: 0.5
- No interaction possible

## Behavior

### Value Changes
- **Range**: 30-100 BPM
- **Step**: 1 BPM increments
- **Default**: 30 BPM
- **Update**: Real-time while dragging

### Feedback
- Haptic tick on value change (iOS)
- Visual highlight on track
- Number updates immediately

## Responsive Sizing

### Mobile (< 768px)
- Width: 80% of screen
- Thumb: 24x24px
- Font: 12px

### Tablet (≥ 768px)
- Width: 60% of screen
- Thumb: 28x28px
- Font: 14px

### Desktop (≥ 1024px)
- Width: 400px fixed
- Thumb: 32x32px
- Font: 16px

## Accessibility

- Keyboard navigable (arrow keys)
- ARIA labels for screen readers
- Minimum touch target 44x44px
- High contrast mode support