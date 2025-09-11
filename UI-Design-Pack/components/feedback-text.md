# Feedback Text Component

## Overview
Temporary text overlay that appears when a putt is detected, showing hit quality.

## Visual Hierarchy

```
         STRONG
      ⚪ (golf ball)
```

## Text Specifications

### Positioning
- **Location**: 30% from top of screen
- **Alignment**: Center
- **Z-Index**: 100 (above all elements)

### Typography
- **Font Size**: 28px
- **Font Weight**: 700 (Bold)
- **Letter Spacing**: 2px
- **Text Transform**: UPPERCASE
- **Text Shadow**: `0 2px 4px rgba(0, 0, 0, 0.5)`

## Quality Indicators

### Strong Hit
- **Text**: "STRONG"
- **Color**: `#4CAF50` (Green)
- **Duration**: 700ms total

### Medium Hit
- **Text**: "MEDIUM"
- **Color**: `#FFC107` (Amber)
- **Duration**: 700ms total

### Weak Hit
- **Text**: "WEAK"
- **Color**: `#FF9800` (Orange)
- **Duration**: 700ms total

## Animation Timeline

```
0ms     - Text appears (fade in)
200ms   - Fully visible
500ms   - Start fade out
700ms   - Completely gone
```

## Animation Details

### Fade In (0-200ms)
- Opacity: 0 → 1
- Scale: 0.8 → 1
- Easing: ease-out

### Hold (200-500ms)
- Static display
- Full opacity
- No movement

### Fade Out (500-700ms)
- Opacity: 1 → 0
- Scale: 1 → 0.9
- Easing: ease-in

## Responsive Sizing

### Mobile Portrait
- Font Size: 24px
- Position: 25% from top

### Mobile Landscape
- Font Size: 28px
- Position: 30% from top

### Tablet
- Font Size: 32px
- Position: 30% from top

## Edge Cases

### Rapid Hits
- Cancel previous animation
- Start new animation immediately
- No queuing of messages

### Screen Boundaries
- Always centered horizontally
- Ensure 20px padding from edges
- Scale down if needed

## Accessibility

- Announce via screen reader
- Provide haptic feedback (iOS)
- Ensure color is not sole indicator
- Include icon option for colorblind users