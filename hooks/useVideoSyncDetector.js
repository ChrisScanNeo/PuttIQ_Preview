import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { VideoSyncDetectorV2 } from '../services/dsp/VideoSyncDetectorV2';

/**
 * Video-synchronized putter detection hook
 *
 * Simpler alternative to usePuttIQDetector that uses video playback position
 * to determine when to listen for putter strikes. Works with standard Expo
 * without custom native modules.
 *
 * @param {Object} options - Configuration options
 * @param {number} options.bpm - Beats per minute (70-80)
 * @param {Object} options.videoPlayer - Video player instance from expo-video
 * @param {Function} options.onHitDetected - Callback when hit is detected
 * @returns {Object} Hook state and methods
 */
export function useVideoSyncDetector(options = {}) {
  const {
    bpm = 70,
    videoPlayer = null,
    onHitDetected = () => {},
    onAudioLevel = () => {},
    debugMode = false
  } = options;

  // State management
  const [isInitialized, setInitialized] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [isRunning, setRunning] = useState(false);
  const [isListening, setListening] = useState(false);
  const [lastHit, setLastHit] = useState(null);
  const [detectorStats, setDetectorStats] = useState(null);

  // Detector reference
  const detectorRef = useRef(null);
  const statsIntervalRef = useRef(null);

  // Initialize detector on mount
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        console.log('Initializing VideoSyncDetector...');

        // Create detector instance
        const detectorOptions = {
          bpm,
          videoPlayer,
          beatsInVideo: 4,            // 4 beats per video
          energyThreshold: 1.5,       // 1.5x baseline for detection (lowered for weak putter hits)
          baselineWindow: 50,         // 50 frames for baseline averaging
          debounceMs: 200,            // 200ms between detections

          debugMode,

          onAudioLevel: (audioData) => {
            if (mounted) {
              onAudioLevel(audioData);
            }
          },

          onHitDetected: (hitEvent) => {
            if (mounted) {
              console.log('⚡ Hit detected in hook:', {
                accuracy: (hitEvent.accuracy * 100).toFixed(0) + '%',
                errorMs: hitEvent.errorMs.toFixed(0) + 'ms',
                energy: hitEvent.ratio.toFixed(1) + 'x'
              });

              setLastHit(hitEvent);

              // Call user's callback
              onHitDetected(hitEvent);

              // Auto-clear hit display after 2 seconds
              setTimeout(() => {
                if (mounted) setLastHit(null);
              }, 2000);
            }
          }
        };

        detectorRef.current = new VideoSyncDetectorV2(detectorOptions);

        if (mounted) {
          setInitialized(true);
          console.log('VideoSyncDetector initialized successfully');
        }
      } catch (error) {
        console.error('Failed to initialize VideoSyncDetector:', error);
        if (mounted) setInitialized(false);
      }
    };

    initialize();

    // Cleanup on unmount
    return () => {
      mounted = false;

      if (detectorRef.current && detectorRef.current.isRunning) {
        detectorRef.current.stop();
      }

      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
      }
    };
  }, []); // Only run once on mount

  // Update BPM when it changes
  useEffect(() => {
    if (detectorRef.current) {
      detectorRef.current.setBpm(bpm);
    }
  }, [bpm]);

  // Update video player reference when it changes
  useEffect(() => {
    if (detectorRef.current) {
      detectorRef.current.opts.videoPlayer = videoPlayer;
    }
  }, [videoPlayer]);

  // Sync listening state with detector
  useEffect(() => {
    if (!isRunning || !detectorRef.current) return;

    // Poll detector listening state every 100ms
    const interval = setInterval(() => {
      if (detectorRef.current) {
        const isCurrentlyListening = detectorRef.current.isListening;
        setListening(isCurrentlyListening);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isRunning]);

  /**
   * Request microphone permission
   * @returns {Promise<boolean>} True if granted
   */
  const requestMicrophonePermission = async () => {
    try {
      // Skip permission request on web
      if (Platform.OS === 'web') {
        console.log('Web platform detected, skipping native permission request');
        return true;
      }

      console.log('Requesting microphone permission...');
      const { status, canAskAgain, granted } = await Audio.requestPermissionsAsync();

      console.log('Microphone permission result:', { status, granted });

      if (granted || status === 'granted') {
        return true;
      }

      // Permission denied - show helpful message
      if (!canAskAgain) {
        Alert.alert(
          'Microphone Access Required',
          'Please enable microphone access in Settings to use Listen Mode.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Permission Denied',
          'Microphone access is needed to detect your putting strokes.',
          [{ text: 'OK' }]
        );
      }

      return false;
    } catch (error) {
      console.error('Failed to request microphone permission:', error);
      Alert.alert('Error', 'Could not request microphone permission. Please try again.');
      return false;
    }
  };

  /**
   * Start detection
   */
  const start = useCallback(async () => {
    if (isRunning || !isInitialized) {
      console.warn('Cannot start:', { isRunning, isInitialized });
      return;
    }

    if (!videoPlayer) {
      console.error('Cannot start detector without video player');
      Alert.alert('Error', 'Video player not ready. Please try again.');
      return;
    }

    // Request permission if not already granted
    if (!permissionGranted) {
      const permissionStatus = await requestMicrophonePermission();
      setPermissionGranted(permissionStatus);

      if (!permissionStatus) {
        console.warn('Microphone permission denied');
        return;
      }
    }

    try {
      console.log('Starting VideoSyncDetector...');

      // Start detector
      await detectorRef.current.start();
      setRunning(true);

      // Set video player volume to maximum to compensate for iOS audio ducking
      if (videoPlayer) {
        videoPlayer.volume = 1.0;
        console.log('🔊 Video player volume set to maximum (1.0)');
      }

      // Start stats monitoring
      statsIntervalRef.current = setInterval(() => {
        if (detectorRef.current) {
          const stats = detectorRef.current.getStats();
          setDetectorStats(stats);
        }
      }, 1000);

      console.log('VideoSyncDetector started');
    } catch (error) {
      console.error('Failed to start VideoSyncDetector:', error);

      // Clean up on error
      if (detectorRef.current) {
        await detectorRef.current.stop();
      }

      setRunning(false);

      Alert.alert('Error', 'Failed to start detector: ' + error.message);
    }
  }, [isInitialized, isRunning, permissionGranted, videoPlayer]);

  /**
   * Pause detection (keeps recording alive)
   */
  const pause = useCallback(() => {
    if (!isRunning || !detectorRef.current) return;

    console.log('Pausing VideoSyncDetector...');
    detectorRef.current.pause();
    setListening(false);
    console.log('VideoSyncDetector paused');
  }, [isRunning]);

  /**
   * Resume detection
   */
  const resume = useCallback(() => {
    if (!isRunning || !detectorRef.current) return;

    console.log('Resuming VideoSyncDetector...');
    detectorRef.current.resume();
    console.log('VideoSyncDetector resumed');
  }, [isRunning]);

  /**
   * Stop detection (call when completely done)
   */
  const stop = useCallback(async () => {
    if (!isRunning) return;

    try {
      console.log('Stopping VideoSyncDetector...');

      // Stop detector
      if (detectorRef.current) {
        await detectorRef.current.stop();

        // Get final stats
        const stats = detectorRef.current.getStats();
        console.log('Final detector stats:', stats);
        setDetectorStats(stats);
      }

      // Clear stats monitoring interval
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }

      setRunning(false);
      setListening(false);
      setLastHit(null);

      console.log('VideoSyncDetector stopped');
    } catch (error) {
      console.error('Error stopping detector:', error);
      setRunning(false);
      setListening(false);
    }
  }, [isRunning]);

  /**
   * Update detector sensitivity
   * @param {number} sensitivity - Sensitivity level (0-1)
   */
  const updateSensitivity = useCallback((sensitivity) => {
    if (!detectorRef.current) return;

    // Map sensitivity (0-1) to energy threshold (6-2)
    // Higher sensitivity = lower threshold
    const energyThreshold = 6 - (sensitivity * 4);

    detectorRef.current.updateParams({
      energyThreshold
    });

    console.log('Updated sensitivity:', { sensitivity, energyThreshold });
  }, []);

  /**
   * Reset detector calibration
   */
  const resetCalibration = useCallback(() => {
    if (detectorRef.current) {
      detectorRef.current.reset();
      console.log('Detector calibration reset');
    }
  }, []);

  /**
   * Get timing accuracy for last hit
   */
  const getTimingAccuracy = useCallback(() => {
    if (!lastHit) return null;

    return {
      accuracy: lastHit.accuracy,
      errorMs: lastHit.errorMs,
      isEarly: lastHit.isEarly,
      isLate: lastHit.isLate,
      isPerfect: lastHit.isPerfect
    };
  }, [lastHit]);

  return {
    // State
    isInitialized,
    isRunning,
    isListening,
    permissionGranted,
    lastHit,
    detectorStats,

    // Methods
    start,
    pause,
    resume,
    stop,
    updateSensitivity,
    resetCalibration,
    getTimingAccuracy
  };
}

export default useVideoSyncDetector;
