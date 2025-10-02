import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ImageBackground, Image, Dimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { VideoView, useVideoPlayer } from 'expo-video';

const { height: screenHeight } = Dimensions.get('window');

// Dynamic sizing calculations
const CONTROL_BARS_BOTTOM = 10; // Distance from screen bottom to control bars container
const ICON_BAR_HEIGHT = 48; // Icon bar height
const BAR_GAP = 6; // Gap between BPM and icon bars
const BPM_BAR_HEIGHT = 48; // BPM bar height
const VIDEO_MARGIN_TOP = 10;
const VIDEO_HEIGHT = 31;
const VIDEO_BORDER = 4; // Border thickness (2px top + 2px bottom)
const BALL_TOP_GAP = 0; // Gap between video bar and ball (ball image has built-in padding)
const BALL_BOTTOM_GAP = 35; // Gap between ball and BPM bar top



export default function HomeScreen({ user }) {
  const [soundType, setSoundType] = useState('tone'); // 'tone', 'beat', 'wind'
  // Ensure BPM is within 70-80 range
  const initialBpm = Math.max(70, Math.min(80, user?.settings?.defaultBPM || 75));
  const [bpm, setBpm] = useState(initialBpm);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoKey, setVideoKey] = useState(`tone-${initialBpm}`); // Track video key for re-rendering

  const updateBpm = (newBpm) => {
    setBpm(Math.max(70, Math.min(80, Math.round(newBpm))));
  };

  // Video map - define all available videos here
  // As new videos are added, add them to this map
  const videoMap = {
    'tone-70': require('../assets/swingBars/tones/Tones_70BPM.mp4'),
    'tone-71': require('../assets/swingBars/tones/Tones_70BPM.mp4'), // Fallback
    'tone-72': require('../assets/swingBars/tones/Tones_70BPM.mp4'), // Fallback
    'tone-73': require('../assets/swingBars/tones/Tones_70BPM.mp4'), // Fallback
    'tone-74': require('../assets/swingBars/tones/Tones_70BPM.mp4'), // Fallback
    'tone-75': require('../assets/swingBars/tones/Tones_70BPM.mp4'), // Fallback
    'tone-76': require('../assets/swingBars/tones/Tones_70BPM.mp4'), // Fallback
    'tone-77': require('../assets/swingBars/tones/Tones_70BPM.mp4'), // Fallback
    'tone-78': require('../assets/swingBars/tones/Tones_70BPM.mp4'), // Fallback
    'tone-79': require('../assets/swingBars/tones/Tones_70BPM.mp4'), // Fallback
    'tone-80': require('../assets/swingBars/tones/Tones_70BPM.mp4'), // Fallback
    // Beat videos
    'beat-70': require('../assets/swingBars/beats/Beats_70BPM.mp4'),
    'beat-71': require('../assets/swingBars/beats/Beats_70BPM.mp4'), // Fallback to 70
    'beat-72': require('../assets/swingBars/beats/Beats_70BPM.mp4'), // Fallback to 70
    'beat-73': require('../assets/swingBars/beats/Beats_70BPM.mp4'), // Fallback to 70
    'beat-74': require('../assets/swingBars/beats/Beats_70BPM.mp4'), // Fallback to 70
    'beat-75': require('../assets/swingBars/beats/Beats_70BPM.mp4'), // Fallback to 70
    'beat-76': require('../assets/swingBars/beats/Beats_70BPM.mp4'), // Fallback to 70
    'beat-77': require('../assets/swingBars/beats/Beats_70BPM.mp4'), // Fallback to 70
    'beat-78': require('../assets/swingBars/beats/Beats_70BPM.mp4'), // Fallback to 70
    'beat-79': require('../assets/swingBars/beats/Beats_70BPM.mp4'), // Fallback to 70
    'beat-80': require('../assets/swingBars/beats/Beats_70BPM.mp4'), // Fallback to 70
    // Wind videos
    'wind-70': require('../assets/swingBars/wind/Wind_70BPM.mp4'),
    'wind-71': require('../assets/swingBars/wind/Wind_70BPM.mp4'), // Fallback to 70
    'wind-72': require('../assets/swingBars/wind/Wind_70BPM.mp4'), // Fallback to 70
    'wind-73': require('../assets/swingBars/wind/Wind_70BPM.mp4'), // Fallback to 70
    'wind-74': require('../assets/swingBars/wind/Wind_70BPM.mp4'), // Fallback to 70
    'wind-75': require('../assets/swingBars/wind/Wind_70BPM.mp4'), // Fallback to 70
    'wind-76': require('../assets/swingBars/wind/Wind_70BPM.mp4'), // Fallback to 70
    'wind-77': require('../assets/swingBars/wind/Wind_70BPM.mp4'), // Fallback to 70
    'wind-78': require('../assets/swingBars/wind/Wind_70BPM.mp4'), // Fallback to 70
    'wind-79': require('../assets/swingBars/wind/Wind_70BPM.mp4'), // Fallback to 70
    'wind-80': require('../assets/swingBars/wind/Wind_70BPM.mp4'), // Fallback to 70
  };

  // Get video source based on sound type and BPM
  const getVideoSource = (type, bpmValue) => {
    const key = `${type}-${bpmValue}`;
    console.log(`🎬 Looking for video key: ${key}`);
    const source = videoMap[key] || require('../assets/swingBars/tones/Tones_70BPM.mp4');
    console.log(`🎬 Video source found:`, source);
    return source;
  };

  // Get current video source
  const currentVideoSource = getVideoSource(soundType, bpm);

  // Create video player with current source - key forces re-mount when video changes
  const player = useVideoPlayer(currentVideoSource, player => {
    player.loop = true;
  });

  // Update video key when BPM or sound type changes (only when stopped)
  useEffect(() => {
    if (!isPlaying) {
      const newKey = `${soundType}-${bpm}`;
      console.log(`🎥 Video changed to: ${newKey}`);
      setVideoKey(newKey);
    }
  }, [bpm, soundType]);

  // Toggle play/pause when ball is clicked
  const handleBallPress = () => {
    console.log(`⚽ Ball clicked! isPlaying: ${isPlaying}, soundType: ${soundType}, bpm: ${bpm}`);
    if (isPlaying) {
      console.log('⏸️ Pausing video');
      player.pause();
      setIsPlaying(false);
    } else {
      console.log('▶️ Playing video');
      player.play();
      setIsPlaying(true);
    }
  };

  const insets = useSafeAreaInsets();

  // Calculate the actual position of the BPM bar top edge from screen bottom
  const bpmBarTopFromBottom = insets.bottom + CONTROL_BARS_BOTTOM + ICON_BAR_HEIGHT + BAR_GAP;

  // Calculate the bottom of the video bar from screen top
  const videoBarBottom = VIDEO_MARGIN_TOP + VIDEO_HEIGHT + VIDEO_BORDER;

  // Available space for ball: from bottom of video bar to top of BPM bar, minus gaps
  const availableHeight = screenHeight - videoBarBottom - BALL_TOP_GAP - bpmBarTopFromBottom - BALL_BOTTOM_GAP;

  // Ball size: MainBall.jpg has no padding, use 80% of available height
  const golfBallSize = Math.min(600, Math.max(150, availableHeight * 0.80));

  // Position ball: bottom offset = distance to BPM bar top + gap
  const ballBottomOffset = bpmBarTopFromBottom + BALL_BOTTOM_GAP;

  // Debug logging
  console.log('🏌️ Golf Ball Debug:', {
    screenHeight,
    insetsBottom: insets.bottom,
    videoBarBottom,
    bpmBarTopFromBottom,
    availableHeightWithGaps: availableHeight,
    availableHeightWithoutGaps: screenHeight - videoBarBottom - bpmBarTopFromBottom,
    gaps: BALL_TOP_GAP + BALL_BOTTOM_GAP,
    finalBallSize: golfBallSize,
    ballBottomOffset,
    spaceUsagePercent: ((golfBallSize / availableHeight) * 100).toFixed(1) + '%',
  });


  return (
    <ImageBackground
      source={require('../assets/grass-background.jpeg')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      {/* Tone Bar Video - At top of screen (outside safe area to stick to physical top) */}
      <View style={styles.videoContainer}>
        <VideoView
          player={player}
          style={styles.video}
          contentFit="contain"
          nativeControls={false}
        />
      </View>
      <SafeAreaView style={styles.safeContainer} edges={['left','right','bottom']}>

        <View style={styles.container}>
          {/* Golf ball - centered in available space */}
          <TouchableOpacity
            style={[styles.golfBallContainer, { bottom: ballBottomOffset }]}
            onPress={handleBallPress}
            activeOpacity={0.8}
          >
            <Image
              source={require('../assets/ball/MainBall.png')}
              style={[styles.golfBall, { width: golfBallSize, height: golfBallSize }]}
              resizeMode="contain"
            />
            <View style={styles.ballTextContainer}>
              <Text style={styles.ballText}>
                {isPlaying ? 'CLICK TO STOP' : 'CLICK TO START'}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Control Bars - Fixed at bottom center */}
          <View style={styles.controlBarsContainer}>
            {/* BPM Bar - Top */}
            <View style={[styles.bpmBar, isPlaying && styles.disabledBar]}>
              <TouchableOpacity
                style={styles.barSection}
                onPress={() => updateBpm(bpm - 1)}
                disabled={isPlaying}
              >
                <Image
                  source={require('../assets/icons/minus.png')}
                  style={styles.iconImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>

              <View style={styles.verticalDivider} />

              <View style={styles.barSection}>
                <Text style={styles.bpmValue}>{bpm}</Text>
              </View>

              <View style={styles.verticalDivider} />

              <TouchableOpacity
                style={styles.barSection}
                onPress={() => updateBpm(bpm + 1)}
                disabled={isPlaying}
              >
                <Image
                  source={require('../assets/icons/plus.png')}
                  style={styles.iconImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

            {/* Sound Type Bar - Bottom */}
            <View style={[styles.iconBar, isPlaying && styles.disabledBar]}>
              <TouchableOpacity
                style={[styles.barSection, soundType === 'tone' && styles.selectedSection]}
                onPress={() => {
                  console.log('🎵 Tone selected');
                  setSoundType('tone');
                }}
                disabled={isPlaying}
              >
                <Image
                  source={require('../assets/icons/musical-note.png')}
                  style={styles.iconImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>

              <View style={styles.verticalDivider} />

              <TouchableOpacity
                style={[styles.barSection, soundType === 'beat' && styles.selectedSection]}
                onPress={() => {
                  console.log('🥁 Beat selected');
                  setSoundType('beat');
                }}
                disabled={isPlaying}
              >
                <Image
                  source={require('../assets/icons/metronome.png')}
                  style={styles.iconImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>

              <View style={styles.verticalDivider} />

              <TouchableOpacity
                style={[styles.barSection, soundType === 'wind' && styles.selectedSection]}
                onPress={() => {
                  console.log('💨 Wind selected');
                  setSoundType('wind');
                }}
                disabled={isPlaying}
              >
                <Image
                  source={require('../assets/icons/wind.png')}
                  style={styles.iconImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom section with logo */}
          <View style={styles.bottomSection}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../assets/puttiq-logo.jpg')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          </View>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  golfBallContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ballTextContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ballText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1,
  },
  controlBarsContainer: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  golfBall: {
    // Dynamic size set inline based on screen height
  },
  bottomSection: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  logoContainer: {
    width: 151,
    height: 59,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  bpmBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 256,
    height: 48,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  iconBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 256,
    height: 48,
    marginTop: 8,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  barSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  verticalDivider: {
    width: 1,
    height: '70%',
    backgroundColor: '#ddd',
  },
  barButtonText: {
    color: '#333',
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
    lineHeight: 26,
  },
  bpmValue: {
    fontSize: 29,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  selectedSection: {
    backgroundColor: '#e8f5e9',
    borderRadius: 10,
  },
  iconImage: {
    width: 24,
    height: 24,
  },
  disabledBar: {
    opacity: 0.5,
  },
  videoContainer: {
    marginTop: 10,
    marginHorizontal: 30,
    backgroundColor: '#000',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  video: {
    width: '100%',
    height: VIDEO_HEIGHT,
    backgroundColor: 'transparent',
  },
});
