# Golf Ball Implementation Guide

## Current Issue
The golf ball is not displaying in the app because:
- The SVG file (`Ball-cropped.svg`) contains embedded image data which React Native's Image component doesn't handle correctly
- React Native has limited SVG support without additional libraries
- The current implementation tries to load an SVG as a regular image

## Solution: PNG with Color Overlay System

### Golf Ball PNG Requirements

#### Image Specifications
- **Format**: PNG with transparent background
- **Color**: White or very light gray (for best tinting)
- **Resolution**: Minimum 500x500px (provide @1x, @2x, @3x versions)
- **Details**: Clear dimple texture visible
- **Shadow**: Optional subtle drop shadow at bottom

#### Where to Source
1. **Free Options**:
   - Unsplash/Pexels (search "golf ball PNG transparent")
   - PNGTree, FreePNG (with attribution)
   - OpenGameArt (game assets)

2. **Create Your Own**:
   - Photograph golf ball on green screen
   - Remove background in Photoshop/GIMP
   - Export as PNG with transparency

3. **Purchase**: Shutterstock, Getty Images, GraphicRiver

### Implementation Plan

#### 1. File Structure
```
/assets/
  golf-ball.png       (@1x - 150x150)
  golf-ball@2x.png    (@2x - 300x300)
  golf-ball@3x.png    (@3x - 450x450)
```

#### 2. Color System Design

**Two-Factor Coloring**:

**Factor 1 - Timer Position (Listening Zone)**:
- 20-80% of beat cycle: Green tint (#4CAF50, opacity 0.15)
- Outside zone: No tint (transparent)

**Factor 2 - Hit Detection (Priority)**:
- Strong hit: Green pulse (#4CAF50)
- Medium hit: Yellow pulse (#FFC107)
- Weak hit: Orange pulse (#FF9800)

#### 3. Component Update

Replace current `RealisticGolfBall.js` implementation:

```javascript
import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Image } from 'react-native';

const RealisticGolfBall = ({ 
  size = 100, 
  isHit = false, 
  hitQuality = null,
  inListeningZone = false 
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.8)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Determine current color
  const getCurrentColor = () => {
    // Hit feedback takes priority
    if (isHit && hitQuality) {
      switch(hitQuality) {
        case 'strong': return '#4CAF50';
        case 'medium': return '#FFC107';
        case 'weak': return '#FF9800';
        default: return '#4CAF50';
      }
    }
    // Listening zone color
    if (inListeningZone) {
      return '#4CAF50';
    }
    return 'transparent';
  };

  // Zone glow animation
  useEffect(() => {
    Animated.timing(overlayOpacity, {
      toValue: inListeningZone ? 0.15 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [inListeningZone]);

  // Hit pulse animation
  useEffect(() => {
    if (isHit) {
      // Ball pulse
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();

      // Ring animation
      Animated.parallel([
        Animated.sequence([
          Animated.timing(ringOpacity, {
            toValue: 0.8,
            duration: 100,
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
        Animated.timing(ringScale, {
          toValue: 1.5,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start(() => {
        ringScale.setValue(0.8);
      });
    }
  }, [isHit]);

  return (
    <View style={styles.container}>
      {/* Golf ball with pulse animation */}
      <Animated.View 
        style={[
          styles.ballContainer,
          {
            transform: [{ scale: pulseAnim }],
            width: size,
            height: size,
          }
        ]}
      >
        {/* Base golf ball image */}
        <Image
          source={require('../assets/golf-ball.png')}
          style={{ width: size, height: size }}
          resizeMode="contain"
        />
        
        {/* Color overlay */}
        <Animated.View 
          style={[
            styles.overlay,
            {
              backgroundColor: getCurrentColor(),
              opacity: overlayOpacity,
              width: size,
              height: size,
              borderRadius: size / 2,
            }
          ]}
        />
      </Animated.View>

      {/* Expanding ring for hit feedback */}
      {isHit && (
        <Animated.View 
          style={[
            styles.ring,
            {
              opacity: ringOpacity,
              transform: [{ scale: ringScale }],
              width: size * 1.2,
              height: size * 1.2,
              borderRadius: size * 0.6,
              borderColor: getCurrentColor(),
            }
          ]}
        />
      )}

      {/* Drop shadow */}
      <View 
        style={[
          styles.shadow,
          {
            width: size * 0.8,
            height: size * 0.15,
            borderRadius: size * 0.4,
            top: size - 10,
          }
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  ballContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  ring: {
    position: 'absolute',
    borderWidth: 3,
    backgroundColor: 'transparent',
  },
  shadow: {
    position: 'absolute',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    transform: [{ scaleX: 1.2 }],
  },
});

export default RealisticGolfBall;
```

### Testing Checklist

- [ ] Golf ball PNG displays correctly
- [ ] Transparent background works
- [ ] Green tint appears in listening zone (20-80% of beat)
- [ ] Hit detection shows correct colors:
  - [ ] Strong = Green
  - [ ] Medium = Yellow
  - [ ] Weak = Orange
- [ ] Pulse animation works (300ms total)
- [ ] Ring expansion animation works (500ms)
- [ ] Shadow appears below ball
- [ ] Colors transition smoothly

### Color Reference

| State | Color | Hex | Usage |
|-------|-------|-----|-------|
| Strong Hit | Green | #4CAF50 | Hit feedback, good timing |
| Medium Hit | Yellow | #FFC107 | Hit feedback, okay timing |
| Weak Hit | Orange | #FF9800 | Hit feedback, poor timing |
| Listening Zone | Light Green | #4CAF50 @ 15% | Zone indicator |
| Default | White | #FFFFFF | No effects |

### Animation Timings

| Animation | Duration | Easing |
|-----------|----------|--------|
| Ball Pulse | 300ms (150ms up, 150ms down) | ease-in-out |
| Ring Expansion | 500ms | linear |
| Ring Fade | 500ms (100ms in, 400ms out) | ease-out |
| Zone Glow | 300ms | ease-in-out |
| Color Transition | 300ms | ease-in-out |

### Next Steps

1. **Create/obtain golf ball PNG** with transparent background
2. **Save as `golf-ball.png`** in `/assets/` folder
3. **Update `RealisticGolfBall.js`** with the code above
4. **Test on device** to ensure:
   - Image loads correctly
   - Colors change as expected
   - Animations are smooth
5. **Fine-tune** colors and opacity values as needed

### Alternative Approaches (if PNG doesn't work)

1. **Multiple colored PNGs**: Pre-create white, green, yellow, orange versions
2. **React Native SVG library**: Draw simple circle with programmatic dimples
3. **Canvas approach**: Use react-native-canvas for dynamic drawing
4. **WebView with HTML5**: Render golf ball in WebView (last resort)

### Notes

- The PNG approach is most reliable across all devices
- Color overlays preserve the photorealistic appearance
- Hit feedback always takes priority over zone coloring
- Consider preloading images for better performance
- Test on both iOS and Android devices

---

**Document created**: December 11, 2024
**Last updated**: December 11, 2024
**Status**: Ready for implementation once golf ball PNG is available