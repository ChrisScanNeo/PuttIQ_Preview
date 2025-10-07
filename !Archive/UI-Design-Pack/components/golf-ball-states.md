# Golf Ball Component States

## Visual States

### 1. Idle State (Not Running)
```
- Ball: Natural white, photorealistic
- Size: 120px
- Shadow: Standard drop shadow
- Overlay: None
- Text: "TAP BALL TO START" below
```

### 2. Active State (Running, Outside Zone)
```
- Ball: Natural white
- Size: 120px
- Shadow: Standard
- Overlay: None
- Indicators: Beat position marker active
```

### 3. Listening Zone State (20-80% of beat)
```
- Ball: Natural white
- Size: 120px
- Shadow: Standard
- Overlay: Subtle green glow (15% opacity)
- Glow Size: 130% of ball
- Purpose: Shows detection window
```

### 4. Hit States

#### Strong Hit
```
- Ball: Scales to 115% (pulse)
- Ring: Green (#4CAF50) expanding ring
- Text: "STRONG" in green above ball
- Duration: 500ms total animation
```

#### Medium Hit
```
- Ball: Scales to 115% (pulse)
- Ring: Yellow (#FFC107) expanding ring
- Text: "MEDIUM" in yellow above ball
- Duration: 500ms total animation
```

#### Weak Hit
```
- Ball: Scales to 115% (pulse)
- Ring: Orange (#FF9800) expanding ring
- Text: "WEAK" in orange above ball
- Duration: 500ms total animation
```

## Interactive States

### Touch States
```
- Default: 100% opacity
- Pressed: 95% opacity
- Disabled: 60% opacity with grayscale
```

## Component Structure

```
Container (150x150px area)
├── Glow Layer (background)
│   └── Green circular gradient
├── Ring Layer (middle)
│   └── Colored stroke ring
├── Ball Layer (foreground)
│   └── Realistic golf ball image
└── Shadow Layer (bottom)
    └── Elliptical shadow
```

## Size Variations

### Mobile Portrait (if needed)
- Ball: 80px
- Container: 100x100px

### Mobile Landscape (current)
- Ball: 120px
- Container: 150x150px

### Tablet
- Ball: 150px
- Container: 180x180px

## Asset Requirements

### Golf Ball Image
- Format: SVG preferred, PNG fallback
- Resolution: 240x240px minimum
- Background: Transparent
- Style: Photorealistic with visible dimples

### Shadow
- Type: Elliptical gradient
- Color: Black to transparent
- Opacity: 30%
- Offset: 4px vertical

## Accessibility Notes
- Minimum tap target: 44x44px
- Must have non-color indicators (text, animation)
- Support for screen readers with state announcements