# PuttIQ UI Design Pack

## Overview
This design pack contains all UI specifications, components, and assets for the PuttIQ golf putting rhythm trainer app. The app helps golfers perfect their putting rhythm using audio detection and visual feedback.

## App Concept
- **Purpose**: Train consistent putting rhythm with metronome
- **Platform**: iOS and Android (React Native)
- **Orientation**: Landscape only (for golf stance)
- **Core Feature**: Detects putter hits via microphone and provides timing feedback

## Design Philosophy
- **Minimal & Clean**: Focus on the golf ball and essential information
- **Natural Feel**: Grass background, photorealistic golf ball
- **Clear Feedback**: Color-coded hit quality (green/yellow/orange)
- **Non-Intrusive**: Subtle animations that don't distract from practice

## Folder Structure

```
/UI-Design-Pack
├── /assets              # Image and graphic files
│   ├── golf-ball.svg    # Photorealistic golf ball
│   ├── grass-background.jpeg
│   └── puttiq-logo.jpg
├── /components          # Individual UI components
│   ├── golf-ball-states.md
│   ├── status-bar.md
│   ├── bpm-slider.md
│   └── feedback-text.md
├── /screens             # Screen layouts and flows
│   ├── home-screen-layout.md
│   └── user-flow.md
├── /specifications      # Design system specs
│   ├── color-scheme.md
│   ├── typography.md
│   └── animations.md
└── README.md           # This file
```

## Key Design Elements

### 1. Golf Ball (Central Element)
- Photorealistic white golf ball (120px)
- Tap to start/stop metronome
- Shows colored rings for hit feedback
- Subtle green glow during "listening zone"

### 2. Status Bar
- Fixed at bottom of screen
- Shows current BPM or "TAP BALL TO START"
- Animated beat position marker
- Zone indicator dot

### 3. Feedback System
- **Strong Hit**: Green ring + "STRONG" text
- **Medium Hit**: Yellow ring + "MEDIUM" text  
- **Weak Hit**: Orange ring + "WEAK" text
- Animations last 500-700ms

### 4. Listening Zone
- Active during 20-80% of each beat
- Subtle green glow on ball
- Only time when putts are detected
- Prevents false detections from metronome

## Technical Constraints

### React Native Limitations
- Animations must be performant (60fps target)
- SVG support via react-native-svg
- Touch targets minimum 44x44px
- Landscape orientation locked

### Audio System
- Metronome ticks at 0% and 100% of beat
- Detection window at 20-80% of beat
- Visual feedback must be <100ms from detection
- BPM range: 30-100

## Color Palette

### Primary
- Green (Success): `#4CAF50`
- Dark Green: `#2E7D32`

### Feedback
- Strong: `#4CAF50` (Green)
- Medium: `#FFC107` (Amber)
- Weak: `#FF9800` (Orange)

### UI
- Background: Grass texture
- Overlay: `rgba(0, 0, 0, 0.6)`
- Text: `#FFFFFF`
- Inactive: `#666666`

## Typography
- System fonts (San Francisco/Roboto)
- Main text: 18px, 600 weight
- Feedback: 28px, 700 weight, UPPERCASE
- All text white on dark backgrounds

## Animation Guidelines
- Pulse animation: 300ms (scale 1.0 → 1.15 → 1.0)
- Ring expansion: 500ms with fade
- Text feedback: 700ms total (fade in/hold/fade out)
- Beat marker: Linear movement synced to BPM

## Responsive Design

### Phone Landscape (568-812px)
- Golf ball: 100px
- Compact status bar
- Slider: 50% width

### Tablet Landscape (>812px)
- Golf ball: 150px
- Expanded status bar
- Slider: 40% width

## Implementation Notes

1. **Golf Ball Asset**: Use provided SVG, do NOT alter the ball itself
2. **Feedback Overlays**: Use colored rings/glows, keep ball photorealistic
3. **Performance**: Prioritize smooth animations over complex effects
4. **Accessibility**: Ensure feedback isn't solely color-based

## Design Deliverables Needed

1. **High-Fidelity Mockups**
   - Home screen (idle state)
   - Home screen (running with feedback)
   - All animation states

2. **Asset Optimization**
   - Compress images for mobile
   - Create @2x and @3x versions
   - Optimize SVGs

3. **Interaction Prototypes**
   - Tap to start/stop flow
   - Hit detection feedback
   - BPM adjustment

4. **Edge Cases**
   - No microphone permission
   - Rapid successive hits
   - Screen size variations

## Contact
For technical questions about implementation constraints or React Native capabilities, please refer to the development team.

## Version
Design Pack v1.0 - December 2024