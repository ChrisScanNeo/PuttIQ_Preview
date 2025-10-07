# Home Screen Layout

## Screen Configuration
- **Orientation**: Landscape only
- **Background**: Grass texture (full bleed)
- **Aspect Ratio**: 16:9 standard

## Layout Grid

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│                    PuttIQ Logo                       │ 10%
│                                                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│                                                      │
│                                                      │
│                  Golf Ball (120px)                  │ 60%
│                   Tap to Start                      │
│                                                      │
│                                                      │
├──────────────────────────────────────────────────────┤
│                                                      │
│              [Status Bar Component]                 │ 20%
│                                                      │
├──────────────────────────────────────────────────────┤
│                  BPM Slider                         │ 10%
└──────────────────────────────────────────────────────┘
```

## Component Positioning

### Logo
- **Position**: Top center
- **Size**: 150x50px
- **Margin Top**: 20px

### Golf Ball
- **Position**: Center of screen
- **Size**: 120x120px (base)
- **Interactive Area**: 150x150px
- **Z-Index**: 10 (above background)

### Status Bar
- **Position**: Fixed bottom - 50px
- **Width**: Adaptive (180-250px)
- **Height**: 50px
- **Centered horizontally**

### BPM Slider
- **Position**: Bottom of screen
- **Width**: 60% of screen width
- **Height**: 40px
- **Margin Bottom**: 20px

## Responsive Breakpoints

### Phone Landscape (568px - 812px width)
- Golf ball: 100px
- Status bar: 180px width
- Slider: 50% screen width

### Tablet Landscape (>812px width)
- Golf ball: 150px
- Status bar: 250px width
- Slider: 40% screen width

## Touch Targets
- Minimum: 44x44px (iOS/Android guideline)
- Golf ball tap area: 150x150px
- Slider thumb: 40x40px