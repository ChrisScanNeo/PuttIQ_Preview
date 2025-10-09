import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ImageBackground, Image, Dimensions, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useVideoSyncDetector } from '../hooks/useVideoSyncDetector';
import { loadBpmPreferences, saveBpmPreference } from '../services/auth';

// Dynamic sizing calculations
const CONTROL_BARS_BOTTOM = 10; // Distance from screen bottom to control bars container
const ICON_BAR_HEIGHT = 38.4; // Icon bar height (20% smaller)
const BAR_GAP = 6; // Gap between BPM and icon bars
const BPM_BAR_HEIGHT = 38.4; // BPM bar height (20% smaller)
const VIDEO_MARGIN_TOP = 10;
const VIDEO_HEIGHT = 46.5; // Video bar height (50% taller)
const VIDEO_BORDER = 0; // No border for transparent videos
const BALL_TOP_GAP = 0; // Gap between video bar and ball (ball image has built-in padding)
const BALL_BOTTOM_GAP = 35; // Gap between ball and BPM bar top



export default function HomeScreen({ user }) {
  const [soundType, setSoundType] = useState('tone'); // 'tone', 'beat', 'wind'
  const [bpm, setBpm] = useState(76); // BPM range: 70-80
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoKey, setVideoKey] = useState('tone-76'); // Track video key for re-rendering
  const [restartTimeout, setRestartTimeout] = useState(null); // Track restart timer
  const [bpmPreferences, setBpmPreferences] = useState({ tone: 76, beat: 76, wind: 76, detect: 76 }); // Store BPM for each type

  // Listen mode state
  const [listenMode, setListenMode] = useState(false);
  const [hitPosition, setHitPosition] = useState(null); // Position of detected hit (0-1)
  const [hitFeedback, setHitFeedback] = useState(null); // Colored feedback bar data
  const [liveAudioLevel, setLiveAudioLevel] = useState(null); // Live audio level display

  // Video loading state
  const [videoLoading, setVideoLoading] = useState(true); // True when video is loading
  const [videoReady, setVideoReady] = useState(false); // True when video is ready to play
  const [videoError, setVideoError] = useState(null); // Error message if video fails to load

  // Get hit color based on millisecond error from 4th beat (target at 100%)
  const getHitColor = (accuracy, errorMs, position) => {
    const absErrorMs = Math.abs(errorMs);

    // Map error to color zones based on milliseconds from target
    if (absErrorMs <= 50) { // Within 50ms = PERFECT
      return {
        color: '#00FF00',
        glow: 'rgba(0, 255, 0, 0.8)',
        shadowRadius: 12,
        barWidth: 10,
        label: 'PERFECT!'
      };
    } else if (absErrorMs <= 100) { // 50-100ms = Great
      return {
        color: '#4CD964',
        glow: 'rgba(76, 217, 100, 0.5)',
        shadowRadius: 8,
        barWidth: 8,
        label: 'Great'
      };
    } else if (absErrorMs <= 150) { // 100-150ms = Good
      return {
        color: '#FFCC00',
        glow: 'rgba(255, 204, 0, 0.4)',
        shadowRadius: 6,
        barWidth: 6,
        label: 'Good'
      };
    } else if (absErrorMs <= 200) { // 150-200ms = OK
      return {
        color: '#FF9500',
        glow: 'rgba(255, 149, 0, 0.3)',
        shadowRadius: 4,
        barWidth: 6,
        label: 'OK'
      };
    } else { // 200ms+ = Too early/late
      return {
        color: '#FF3B30',
        glow: 'rgba(255, 59, 48, 0.2)',
        shadowRadius: 3,
        barWidth: 4,
        label: errorMs < 0 ? 'Too Early' : 'Too Late' // Based on timing error sign
      };
    }
  };

  // Video maps for BPM 70-80
  // Regular videos: Tones/Beats/Wind with audio
  // Detect videos: Silent metronome for listen mode (iOS only for now)
  const videoMapIOS = {
    // Tone videos (70-80 BPM)
    'tone-70': require('../assets/swingBars/ios/tones/Tones_70BPM.mov'),
    'tone-71': require('../assets/swingBars/ios/tones/Tones_71BPM.mov'),
    'tone-72': require('../assets/swingBars/ios/tones/Tones_72BPM.mov'),
    'tone-73': require('../assets/swingBars/ios/tones/Tones_73BPM.mov'),
    'tone-74': require('../assets/swingBars/ios/tones/Tones_74BPM.mov'),
    'tone-75': require('../assets/swingBars/ios/tones/Tones_75BPM.mov'),
    'tone-76': require('../assets/swingBars/ios/tones/Tones_76BPM.mov'),
    'tone-77': require('../assets/swingBars/ios/tones/Tones_77BPM.mov'),
    'tone-78': require('../assets/swingBars/ios/tones/Tones_78BPM.mov'),
    'tone-79': require('../assets/swingBars/ios/tones/Tones_79BPM.mov'),
    'tone-80': require('../assets/swingBars/ios/tones/Tones_80BPM.mov'),
    // Beat videos (70-80 BPM)
    'beat-70': require('../assets/swingBars/ios/beats/Beats_70BPM.mov'),
    'beat-71': require('../assets/swingBars/ios/beats/Beats_71BPM.mov'),
    'beat-72': require('../assets/swingBars/ios/beats/Beats_72BPM.mov'),
    'beat-73': require('../assets/swingBars/ios/beats/Beats_73BPM.mov'),
    'beat-74': require('../assets/swingBars/ios/beats/Beats_74BPM.mov'),
    'beat-75': require('../assets/swingBars/ios/beats/Beats_75BPM.mov'),
    'beat-76': require('../assets/swingBars/ios/beats/Beats_76BPM.mov'),
    'beat-77': require('../assets/swingBars/ios/beats/Beats_77BPM.mov'),
    'beat-78': require('../assets/swingBars/ios/beats/Beats_78BPM.mov'),
    'beat-79': require('../assets/swingBars/ios/beats/Beats_79BPM.mov'),
    'beat-80': require('../assets/swingBars/ios/beats/Beats_80BPM.mov'),
    // Wind videos (70-80 BPM)
    'wind-70': require('../assets/swingBars/ios/wind/Wind_70BPM.mov'),
    'wind-71': require('../assets/swingBars/ios/wind/Wind_71BPM.mov'),
    'wind-72': require('../assets/swingBars/ios/wind/Wind_72BPM.mov'),
    'wind-73': require('../assets/swingBars/ios/wind/Wind_73BPM.mov'),
    'wind-74': require('../assets/swingBars/ios/wind/Wind_74BPM.mov'),
    'wind-75': require('../assets/swingBars/ios/wind/Wind_75BPM.mov'),
    'wind-76': require('../assets/swingBars/ios/wind/Wind_76BPM.mov'),
    'wind-77': require('../assets/swingBars/ios/wind/Wind_77BPM.mov'),
    'wind-78': require('../assets/swingBars/ios/wind/Wind_78BPM.mov'),
    'wind-79': require('../assets/swingBars/ios/wind/Wind_79BPM.mov'),
    'wind-80': require('../assets/swingBars/ios/wind/Wind_80BPM.mov'),
    // Detect videos for listen mode (70-80 BPM)
    'detect-70': require('../assets/swingBars/ios/detect/Tones_Detect_70BPM.mov'),
    'detect-71': require('../assets/swingBars/ios/detect/Tones_Detect_71BPM.mov'),
    'detect-72': require('../assets/swingBars/ios/detect/Tones_Detect_72BPM.mov'),
    'detect-73': require('../assets/swingBars/ios/detect/Tones_Detect_73BPM.mov'),
    'detect-74': require('../assets/swingBars/ios/detect/Tones_Detect_74BPM.mov'),
    'detect-75': require('../assets/swingBars/ios/detect/Tones_Detect_75BPM.mov'),
    'detect-76': require('../assets/swingBars/ios/detect/Tones_Detect_76BPM.mov'),
    'detect-77': require('../assets/swingBars/ios/detect/Tones_Detect_77BPM.mov'),
    'detect-78': require('../assets/swingBars/ios/detect/Tones_Detect_78BPM.mov'),
    'detect-79': require('../assets/swingBars/ios/detect/Tones_Detect_79BPM.mov'),
    'detect-80': require('../assets/swingBars/ios/detect/Tones_Detect_80BPM.mov'),
  };

  const videoMapAndroid = {
    // Tone videos (70 BPM .webm, 71-80 use iOS .mov temporarily)
    'tone-70': require('../assets/swingBars/android/tones/Tones_70BPM.webm'),
    'tone-71': require('../assets/swingBars/ios/tones/Tones_71BPM.mov'),
    'tone-72': require('../assets/swingBars/ios/tones/Tones_72BPM.mov'),
    'tone-73': require('../assets/swingBars/ios/tones/Tones_73BPM.mov'),
    'tone-74': require('../assets/swingBars/ios/tones/Tones_74BPM.mov'),
    'tone-75': require('../assets/swingBars/ios/tones/Tones_75BPM.mov'),
    'tone-76': require('../assets/swingBars/ios/tones/Tones_76BPM.mov'),
    'tone-77': require('../assets/swingBars/ios/tones/Tones_77BPM.mov'),
    'tone-78': require('../assets/swingBars/ios/tones/Tones_78BPM.mov'),
    'tone-79': require('../assets/swingBars/ios/tones/Tones_79BPM.mov'),
    'tone-80': require('../assets/swingBars/ios/tones/Tones_80BPM.mov'),
    // Beat videos (70 BPM .webm, 71-80 use iOS .mov temporarily)
    'beat-70': require('../assets/swingBars/android/beats/Beats_70BPM.webm'),
    'beat-71': require('../assets/swingBars/ios/beats/Beats_71BPM.mov'),
    'beat-72': require('../assets/swingBars/ios/beats/Beats_72BPM.mov'),
    'beat-73': require('../assets/swingBars/ios/beats/Beats_73BPM.mov'),
    'beat-74': require('../assets/swingBars/ios/beats/Beats_74BPM.mov'),
    'beat-75': require('../assets/swingBars/ios/beats/Beats_75BPM.mov'),
    'beat-76': require('../assets/swingBars/ios/beats/Beats_76BPM.mov'),
    'beat-77': require('../assets/swingBars/ios/beats/Beats_77BPM.mov'),
    'beat-78': require('../assets/swingBars/ios/beats/Beats_78BPM.mov'),
    'beat-79': require('../assets/swingBars/ios/beats/Beats_79BPM.mov'),
    'beat-80': require('../assets/swingBars/ios/beats/Beats_80BPM.mov'),
    // Wind videos (70 BPM .webm, 71-80 use iOS .mov temporarily)
    'wind-70': require('../assets/swingBars/android/wind/Wind_70BPM.webm'),
    'wind-71': require('../assets/swingBars/ios/wind/Wind_71BPM.mov'),
    'wind-72': require('../assets/swingBars/ios/wind/Wind_72BPM.mov'),
    'wind-73': require('../assets/swingBars/ios/wind/Wind_73BPM.mov'),
    'wind-74': require('../assets/swingBars/ios/wind/Wind_74BPM.mov'),
    'wind-75': require('../assets/swingBars/ios/wind/Wind_75BPM.mov'),
    'wind-76': require('../assets/swingBars/ios/wind/Wind_76BPM.mov'),
    'wind-77': require('../assets/swingBars/ios/wind/Wind_77BPM.mov'),
    'wind-78': require('../assets/swingBars/ios/wind/Wind_78BPM.mov'),
    'wind-79': require('../assets/swingBars/ios/wind/Wind_79BPM.mov'),
    'wind-80': require('../assets/swingBars/ios/wind/Wind_80BPM.mov'),
    // Detect videos (using iOS .mov temporarily until .webm created) (70-80 BPM)
    'detect-70': require('../assets/swingBars/ios/detect/Tones_Detect_70BPM.mov'),
    'detect-71': require('../assets/swingBars/ios/detect/Tones_Detect_71BPM.mov'),
    'detect-72': require('../assets/swingBars/ios/detect/Tones_Detect_72BPM.mov'),
    'detect-73': require('../assets/swingBars/ios/detect/Tones_Detect_73BPM.mov'),
    'detect-74': require('../assets/swingBars/ios/detect/Tones_Detect_74BPM.mov'),
    'detect-75': require('../assets/swingBars/ios/detect/Tones_Detect_75BPM.mov'),
    'detect-76': require('../assets/swingBars/ios/detect/Tones_Detect_76BPM.mov'),
    'detect-77': require('../assets/swingBars/ios/detect/Tones_Detect_77BPM.mov'),
    'detect-78': require('../assets/swingBars/ios/detect/Tones_Detect_78BPM.mov'),
    'detect-79': require('../assets/swingBars/ios/detect/Tones_Detect_79BPM.mov'),
    'detect-80': require('../assets/swingBars/ios/detect/Tones_Detect_80BPM.mov'),
  };

  // Select the appropriate video map based on platform
  const videoMap = Platform.OS === 'ios' ? videoMapIOS : videoMapAndroid;

  // Load BPM preferences on mount
  useEffect(() => {
    const initializeBpmPreferences = async () => {
      const preferences = await loadBpmPreferences();
      setBpmPreferences(preferences);
      // Set initial BPM to tone preference
      setBpm(preferences.tone);
    };

    initializeBpmPreferences();
  }, []);


  // Auto-restore BPM when switching sound types (tone, beat, wind)
  useEffect(() => {
    if (!listenMode) {
      const savedBpm = bpmPreferences[soundType];
      setBpm(savedBpm);
    }
  }, [soundType, bpmPreferences, listenMode]);

  // Auto-restore BPM when toggling listen mode
  useEffect(() => {
    if (listenMode) {
      const savedBpm = bpmPreferences.detect;
      setBpm(savedBpm);
    } else {
      // When turning off listen mode, restore the current sound type's BPM
      const savedBpm = bpmPreferences[soundType];
      setBpm(savedBpm);
    }
  }, [listenMode, bpmPreferences, soundType]);

  // Get video source based on sound type, BPM, and listen mode
  const getVideoSource = (type, bpmValue, listenModeActive) => {
    // In listen mode, use detect video (silent metronome)
    if (listenModeActive) {
      const detectKey = `detect-${bpmValue}`;
      const video = videoMap[detectKey];
      // Fallback to 70 BPM if video not found
      return video || videoMap['detect-70'];
    }

    // Regular mode: use sound-specific video
    const key = `${type}-${bpmValue}`;
    const video = videoMap[key];
    // Fallback to 70 BPM if video not found
    return video || videoMap[`${type}-70`];
  };

  // Get current video source (updates when soundType or listenMode changes)
  const currentVideoSource = getVideoSource(soundType, bpm, listenMode);

  // Create video player with current source - key forces re-mount when video changes
  const player = useVideoPlayer(currentVideoSource, player => {
    player.loop = false; // Manual looping with 2-second gap
  });

  // Update player source when video changes (BPM, sound type, or listen mode)
  useEffect(() => {
    if (player && currentVideoSource) {
      // Replace video source (use replaceAsync on iOS for better performance)
      if (Platform.OS === 'ios') {
        player.replaceAsync(currentVideoSource).catch(err => {
          console.error('Failed to replace video source:', err);
        });
      } else {
        player.replace(currentVideoSource);
      }
    }
  }, [currentVideoSource, player, videoKey]);

  // Track video loading status
  useEffect(() => {
    if (!player) return;

    // Check initial status immediately (in case video is already loaded from cache)
    const checkInitialStatus = () => {
      if (player.status === 'readyToPlay') {
        setVideoLoading(false);
        setVideoReady(true);
        setVideoError(null);
      } else if (player.status === 'loading') {
        setVideoLoading(true);
        setVideoReady(false);
        setVideoError(null);
      } else if (player.status === 'error') {
        setVideoLoading(false);
        setVideoReady(false);
        setVideoError('Video failed to load');
      }
    };

    // Check status immediately
    checkInitialStatus();

    // Then listen for future status changes
    const subscription = player.addListener('statusChange', ({ status, error }) => {
      switch (status) {
        case 'loading':
          setVideoLoading(true);
          setVideoReady(false);
          setVideoError(null);
          break;

        case 'readyToPlay':
          setVideoLoading(false);
          setVideoReady(true);
          setVideoError(null);
          break;

        case 'error':
          setVideoLoading(false);
          setVideoReady(false);
          setVideoError(error?.message || 'Video failed to load');
          console.error('❌ Video error:', error);
          break;

        case 'idle':
          setVideoLoading(false);
          setVideoReady(false);
          break;
      }
    });

    return () => subscription.remove();
  }, [player, videoKey]);

  // Initialize VideoSyncDetector with video player reference
  const detector = useVideoSyncDetector({
    bpm,
    videoPlayer: player,
    debugMode: false, // Set to true for debug logging
    onAudioLevel: (audioData) => {
      // Update live audio display every frame
      setLiveAudioLevel(audioData);
    },
    onHitDetected: (hitEvent) => {
      console.log('🎯 Hit detected!', {
        position: (hitEvent.position * 100).toFixed(1) + '%',
        accuracy: (hitEvent.accuracy * 100).toFixed(0) + '%',
        errorMs: hitEvent.errorMs.toFixed(0) + 'ms',
        timing: hitEvent.isEarly ? 'Early' : hitEvent.isLate ? 'Late' : 'Perfect',
        distanceFromCenter: ((hitEvent.distanceFromCenter || 0) * 100).toFixed(1) + '%'
      });

      // Calculate color based on error in milliseconds
      const colorData = getHitColor(hitEvent.accuracy, hitEvent.errorMs, hitEvent.position);

      // Set feedback data for colored vertical bar
      setHitFeedback({
        position: hitEvent.position,
        displayPosition: hitEvent.displayPosition,
        accuracy: hitEvent.accuracy,
        distanceFromCenter: hitEvent.distanceFromCenter,
        ...colorData,
        timestamp: Date.now()
      });

      // Bar will remain visible until video ends, then cleared automatically
      // (No timeout needed - cleared in video end listener)
    }
  });

  // Update video key when sound type, BPM, or listen mode changes (only when stopped)
  useEffect(() => {
    if (!isPlaying) {
      const prefix = listenMode ? 'detect' : soundType;
      const newKey = `${prefix}-${bpm}`;
      setVideoKey(newKey);
    }
  }, [soundType, bpm, listenMode, isPlaying]);

  // Handle video end and restart with 2-second gap
  useEffect(() => {
    if (!player) return;

    const subscription = player.addListener('playingChange', (event) => {
      // When video stops playing and we're at the end
      if (!event.isPlaying && isPlaying && player.currentTime >= player.duration - 0.1) {
        // Wait 2 seconds, then clear feedback and restart from beginning
        const timeout = setTimeout(() => {
          if (isPlaying) {
            // Clear hit feedback when new loop starts (after 2-second gap)
            setHitFeedback(null);
            setHitPosition(null);
            player.replay();
          }
        }, 2000);

        setRestartTimeout(timeout);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [player, isPlaying]);

  // Toggle play/pause when ball is clicked
  const handleBallPress = async () => {
    // Prevent interaction while video is loading/errored/not ready
    if (videoLoading || videoError || (!videoReady && !isPlaying)) {
      return;
    }

    if (isPlaying) {
      // Clear any pending restart timer
      if (restartTimeout) {
        clearTimeout(restartTimeout);
        setRestartTimeout(null);
      }
      player.pause();
      setIsPlaying(false);

      // Pause detector if listen mode active (keeps recording alive)
      if (listenMode && detector && detector.isRunning) {
        detector.pause();
      }
    } else {
      player.play();
      setIsPlaying(true);

      // Start or resume detector if listen mode active
      if (listenMode && detector && detector.isInitialized) {
        if (!detector.isRunning) {
          await detector.start();
        } else {
          detector.resume();
        }
      }
    }
  };

  // Hit detection is now handled in the onHitDetected callback above

  const insets = useSafeAreaInsets();

  // Get screen height dynamically (not at module level to avoid stale dimensions)
  const screenHeight = Dimensions.get('window').height;

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



  return (
    <ImageBackground
      source={require('../assets/grass-background.jpeg')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      {/* Tone Bar Video - At top of screen (outside safe area to stick to physical top) */}
      <View style={styles.videoContainer}>
        <VideoView
          key={videoKey}
          player={player}
          style={styles.video}
          contentFit="contain"
          nativeControls={false}
        />

        {/* Error Overlay */}
        {videoError && (
          <View style={styles.errorOverlay}>
            <Text style={styles.errorText}>⚠️ {videoError}</Text>
            <Text style={styles.errorSubtext}>Please try again</Text>
          </View>
        )}

        {/* Color-Coded Vertical Position Indicator - Shows where hit was detected */}
        {hitFeedback && listenMode && (
          <View
            style={[
              styles.positionIndicator,
              {
                // Use centered, full-width mapping (0..1) with center at 0.5
                left: `${(hitFeedback.displayPosition ?? hitFeedback.position) * 100}%`,
                backgroundColor: hitFeedback.color,
                shadowColor: hitFeedback.glow,
                width: hitFeedback.barWidth,
                shadowRadius: hitFeedback.shadowRadius,
                shadowOpacity: 0.8,
                shadowOffset: { width: 0, height: 0 },
              }
            ]}
          />
        )}
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
              style={[
                styles.golfBall,
                { width: golfBallSize, height: golfBallSize },
                videoLoading && { opacity: 0.5 }
              ]}
              resizeMode="contain"
            />
            <View style={styles.ballTextContainer}>
              <Text style={styles.ballText}>
                {videoLoading ? 'LOADING...' : (isPlaying ? 'STOP' : 'START')}
              </Text>
            </View>
          </TouchableOpacity>

          {/* Control Bars - Fixed at bottom center */}
          <View style={styles.controlBarsContainer}>
            {/* BPM Bar - Top (Range: 70-80 BPM) */}
            <View style={styles.bpmBar}>
              <TouchableOpacity
                style={styles.barSection}
                disabled={videoLoading || isPlaying}
                onPress={async () => {
                  if (isPlaying) {
                    handleBallPress(); // Stop playback first
                  } else {
                    const newBpm = Math.max(70, bpm - 1);
                    setBpm(newBpm);

                    // Save to Firebase/cache (saves to ALL modes)
                    const typeToSave = listenMode ? 'detect' : soundType;
                    await saveBpmPreference(typeToSave, newBpm);

                    // Update local state - sync all modes
                    setBpmPreferences({ tone: newBpm, beat: newBpm, wind: newBpm, detect: newBpm });
                  }
                }}
              >
                <Image
                  source={require('../assets/icons/minus.png')}
                  style={[styles.iconImage, { opacity: (bpm <= 70 || isPlaying || videoLoading) ? 0.3 : 1.0 }]}
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
                disabled={videoLoading || isPlaying}
                onPress={async () => {
                  if (isPlaying) {
                    handleBallPress(); // Stop playback first
                  } else {
                    const newBpm = Math.min(80, bpm + 1);
                    setBpm(newBpm);

                    // Save to Firebase/cache (saves to ALL modes)
                    const typeToSave = listenMode ? 'detect' : soundType;
                    await saveBpmPreference(typeToSave, newBpm);

                    // Update local state - sync all modes
                    setBpmPreferences({ tone: newBpm, beat: newBpm, wind: newBpm, detect: newBpm });
                  }
                }}
              >
                <Image
                  source={require('../assets/icons/plus.png')}
                  style={[styles.iconImage, { opacity: (bpm >= 80 || isPlaying || videoLoading) ? 0.3 : 1.0 }]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>

            {/* Sound Type Bar - Bottom */}
            <View style={styles.iconBar}>
              <TouchableOpacity
                style={[styles.barSection, soundType === 'tone' && styles.selectedSection]}
                onPress={() => {
                  if (listenMode) return; // Disabled in listen mode
                  if (isPlaying) {
                    handleBallPress(); // Stop playback
                  } else {
                    setSoundType('tone');
                  }
                }}
                disabled={listenMode}
              >
                <Image
                  source={require('../assets/icons/musical-note.png')}
                  style={[styles.iconImage, listenMode && { opacity: 0.5 }]}
                  resizeMode="contain"
                />
              </TouchableOpacity>

              <View style={styles.verticalDivider} />

              <TouchableOpacity
                style={[styles.barSection, soundType === 'beat' && styles.selectedSection]}
                onPress={() => {
                  if (listenMode) return; // Disabled in listen mode
                  if (isPlaying) {
                    handleBallPress(); // Stop playback
                  } else {
                    setSoundType('beat');
                  }
                }}
                disabled={listenMode}
              >
                <Image
                  source={require('../assets/icons/metronome.png')}
                  style={[styles.iconImage, listenMode && { opacity: 0.5 }]}
                  resizeMode="contain"
                />
              </TouchableOpacity>

              <View style={styles.verticalDivider} />

              <TouchableOpacity
                style={[styles.barSection, soundType === 'wind' && styles.selectedSection]}
                onPress={() => {
                  if (listenMode) return; // Disabled in listen mode
                  if (isPlaying) {
                    handleBallPress(); // Stop playback
                  } else {
                    setSoundType('wind');
                  }
                }}
                disabled={listenMode}
              >
                <Image
                  source={require('../assets/icons/wind.png')}
                  style={[styles.iconImage, listenMode && { opacity: 0.5 }]}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Listen Mode Toggle Button - Bottom Left */}
          <TouchableOpacity
            style={styles.listenModeButton}
            onPress={() => {
              if (isPlaying) {
                handleBallPress(); // Stop playback first
              }
              setListenMode(!listenMode);
              setHitPosition(null); // Clear any previous hit indicator
            }}
            activeOpacity={0.8}
          >
            <View style={[
              styles.listenModeCircle,
              listenMode && styles.listenModeActive
            ]}>
              <Image
                source={require('../assets/icons/lightening.png')}
                style={[
                  styles.listenModeIconImage,
                  listenMode && styles.listenModeIconImageActive
                ]}
                resizeMode="contain"
              />
            </View>
          </TouchableOpacity>
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
  bpmBar: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#333',
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: 204.8,
    height: 38.4,
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
    maxWidth: 204.8,
    height: 38.4,
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
    fontSize: 23.2,
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
    width: 19.2,
    height: 19.2,
  },
  disabledBar: {
    opacity: 0.5,
  },
  videoContainer: {
    marginTop: 10,
    marginHorizontal: 30,
    backgroundColor: 'transparent',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fff',
    height: 40,
    paddingHorizontal: 5,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: VIDEO_HEIGHT,
    backgroundColor: 'transparent',
  },
  listenModeButton: {
    position: 'absolute',
    left: 20,
    bottom: 20,
    zIndex: 10,
  },
  listenModeCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 2,
    borderColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  listenModeActive: {
    backgroundColor: '#333',
    borderColor: '#fff',
  },
  listenModeIconImage: {
    width: 30,
    height: 30,
    tintColor: '#333',
  },
  listenModeIconImageActive: {
    tintColor: '#fff',
  },
  positionIndicator: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    // width: set dynamically (4-10px based on accuracy)
    // backgroundColor: set dynamically (color based on distance from center)
    borderRadius: 3, // Rounded caps for professional look
    zIndex: 100,
    elevation: 8, // Android shadow
    opacity: 0.9,
  },
  errorOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    zIndex: 10,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: 'bold',
  },
  errorSubtext: {
    color: '#FF9500',
    fontSize: 12,
    marginTop: 5,
  },
});
