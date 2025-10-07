# Status Bar Component

## Overview
Fixed position bar at bottom of screen showing current app state and rhythm indicators.

## Layout

```
┌─────────────────────────────────────┐
│         30 BPM                      │
│     ● ━━━━●━━━━━━━━━━━━━           │
└─────────────────────────────────────┘
```

## Specifications

### Container
- **Position**: Fixed bottom, centered
- **Width**: Min 180px, max 250px
- **Height**: 50px
- **Background**: `rgba(0, 0, 0, 0.6)`
- **Border Radius**: 25px
- **Padding**: 12px vertical, 20px horizontal
- **Margin Bottom**: 50px from screen bottom

### Content Layout
- **Alignment**: Center
- **Spacing**: 8px between elements

## Elements

### 1. BPM Display
- **Font Size**: 18px
- **Font Weight**: 600
- **Color**: White
- **Letter Spacing**: 1px
- **Format**: "{number} BPM"
- **Range**: 30-100 BPM

### 2. Status Text (when not running)
- **Text**: "TAP BALL TO START"
- **Same styling as BPM display
- **Replaces BPM when stopped

### 3. Zone Indicator Dot
- **Size**: 8x8px
- **Shape**: Circle
- **Colors**:
  - Active (in zone): `#4CAF50`
  - Inactive: `#666666`
- **Position**: Left of beat bar

### 4. Beat Position Bar
- **Width**: 100px
- **Height**: 2px
- **Background**: `rgba(255, 255, 255, 0.2)`
- **Border Radius**: 1px

### 5. Beat Marker
- **Size**: 4x8px
- **Color**: White
- **Shape**: Rounded rectangle
- **Movement**: 0-100% of bar width
- **Update**: Continuous, synced to BPM

## States

### Stopped
```
┌─────────────────────────────────────┐
│      TAP BALL TO START              │
└─────────────────────────────────────┘
```

### Running (Outside Zone)
```
┌─────────────────────────────────────┐
│         30 BPM                      │
│     ○ ━━━━━━━━━━━━━━━━━━           │
└─────────────────────────────────────┘
```

### Running (In Zone)
```
┌─────────────────────────────────────┐
│         30 BPM                      │
│     ● ━━━━━━●━━━━━━━━━━             │
└─────────────────────────────────────┘
```

## Responsive Behavior

### Small Screens (<375px width)
- Reduce to essential elements only
- Hide beat bar if necessary
- Keep BPM and zone indicator

### Large Screens (>768px width)
- Can expand width to 300px
- Add more spacing between elements

## Animation Details

### Beat Marker Movement
- **Type**: Linear interpolation
- **Reset**: Jump to 0 at beat end
- **Smoothness**: 60fps update rate

### Zone Indicator
- **Transition**: Instant color change
- **No fade animation

## Accessibility
- Ensure 4.5:1 contrast ratio for all text
- Provide screen reader announcements for state changes
- Support keyboard navigation if applicable