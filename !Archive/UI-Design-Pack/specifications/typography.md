# Typography Specification

## Font Family
**System Default** - Uses platform native fonts for optimal readability
- iOS: San Francisco
- Android: Roboto

## Font Sizes & Weights

### Main Status Text
- **Size**: 18px
- **Weight**: 600 (Semi-bold)
- **Color**: White
- **Letter Spacing**: 1px
- **Examples**: "30 BPM", "TAP BALL TO START"

### Hit Feedback Text
- **Size**: 28px  
- **Weight**: Bold (700)
- **Color**: Varies by quality (Green/Yellow/Orange)
- **Text Shadow**: `rgba(0, 0, 0, 0.5)` offset 2px
- **Transform**: UPPERCASE
- **Examples**: "STRONG", "MEDIUM", "WEAK"

### Secondary Text
- **Size**: 14px
- **Weight**: Regular (400)
- **Color**: `#FFFFFF` with 80% opacity
- **Examples**: Timer, statistics

### Button Text
- **Size**: 16px
- **Weight**: 600 (Semi-bold)
- **Color**: White or Primary Green
- **Letter Spacing**: 0.5px

## Text Hierarchy

### Primary Level
- Status messages
- Hit quality feedback
- BPM display

### Secondary Level  
- Instructions
- Indicators
- Supplementary information

### Tertiary Level
- Timestamps
- Debug information
- Version numbers

## Alignment & Spacing

### Status Bar
- Center aligned
- 12px vertical padding
- 20px horizontal padding
- 8px margin between elements

### Feedback Text
- Center aligned
- Appears 30% from top of screen
- Fades in/out over 200ms

## Accessibility

### Minimum Sizes
- Body text: 14px minimum
- Interactive elements: 16px minimum
- Critical feedback: 24px minimum

### Contrast Requirements
- White text on dark: 4.5:1 minimum
- Colored text: Must pass WCAG AA standards

## Animation

### Text Transitions
- Fade in: 200ms ease-out
- Fade out: 200ms ease-in
- No sliding or scaling animations for text

### Number Changes
- BPM changes: Instant update
- No rolling number animations

## Special Considerations
- All text must be readable in bright outdoor conditions
- Avoid thin font weights (< 400)
- Critical information should not rely on color alone
- Keep text minimal - let visual feedback dominate