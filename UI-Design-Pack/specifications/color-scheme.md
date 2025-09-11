# Color Scheme Specification

## Primary Colors

### Brand Colors
- **Primary Green**: `#2E7D32` - Used for success, good hits, active states
- **Light Green**: `#4CAF50` - Success feedback, strong hits
- **Accent Green**: `#f0fff0` - Subtle listening zone indication

### Feedback Colors
- **Strong Hit**: `#4CAF50` (Green) - Excellent timing
- **Medium Hit**: `#FFC107` (Amber) - Acceptable timing  
- **Weak Hit**: `#FF9800` (Orange) - Poor timing
- **Error/Miss**: `#EF5350` (Red) - Missed or very poor timing

### UI Colors
- **Background**: Grass texture (photographic)
- **Overlay Dark**: `rgba(0, 0, 0, 0.6)` - Status bar background
- **Overlay Light**: `rgba(0, 0, 0, 0.3)` - Light overlays
- **Text Primary**: `#FFFFFF` - Main text on dark backgrounds
- **Text Secondary**: `#666666` - Secondary information
- **Inactive**: `#888888` - Disabled states

## Component-Specific Colors

### Golf Ball
- **Base**: Natural white from photograph
- **Shadow**: `#e0e0e0`
- **Glow (Listening Zone)**: `#4CAF50` at 15% opacity

### Status Indicators
- **Active Zone**: `#4CAF50`
- **Inactive Zone**: `#666666`
- **Beat Marker**: `#FFFFFF`
- **Beat Track**: `rgba(255, 255, 255, 0.2)`

### Animations
- **Ring Expansion**: Matches hit quality color at 80% opacity
- **Pulse Flash**: 100% opacity to 0% over 500ms
- **Glow Fade**: 0% to 15% opacity over 300ms

## Accessibility Considerations
- All text must have contrast ratio of at least 4.5:1
- Critical feedback uses both color and animation
- Status indicators use both color and position

## Usage Guidelines
1. Green indicates positive/success/go
2. Yellow/Amber indicates caution/medium quality
3. Orange/Red indicates poor/needs improvement
4. Keep color use minimal - the ball should remain predominantly white
5. Use opacity for subtlety rather than light colors