import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { Metronome } from '../services/audio/Metronome';
import { enableAEC, disableAEC, isAECSupported } from '../services/audio/enableAEC';
// Use the Expo-compatible detector instead of the Picovoice one
import { PutterDetectorExpo as PutterDetector } from '../services/dsp/PutterDetectorExpo';

/**
 * Enhanced PuttIQ detector hook using improved DSP services
 * @param {number} defaultBpm - Default BPM setting
 * @returns {Object} Hook state and methods
 */
export function usePuttIQDetector(defaultBpm = 80) {
  // State management
  const [isInitialized, setInitialized] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [aecActive, setAecActive] = useState(false);
  const [isRunning, setRunning] = useState(false);
  const [bpm, setBpm] = useState(defaultBpm);
  const [lastHit, setLastHit] = useState(null);
  const [detectorStats, setDetectorStats] = useState(null);

  // Service references
  const metronomeRef = useRef(null);
  const aecStreamRef = useRef(null);
  const detectorRef = useRef(null);
  const statsIntervalRef = useRef(null);

  // Initialize services on mount
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        console.log('Initializing PuttIQ detector...');

        // Initialize metronome first (before permission request)
        try {
          metronomeRef.current = new Metronome();
          await metronomeRef.current.load();
          metronomeRef.current.setBpm(bpm);
          console.log('Metronome initialized successfully');
        } catch (metronomeError) {
          console.error('Failed to initialize metronome:', metronomeError);
          // Continue without metronome if it fails
        }

        // Request microphone permission
        const permissionStatus = await requestMicrophonePermission();
        if (mounted) setPermissionGranted(permissionStatus);

        if (!permissionStatus) {
          console.warn('Microphone permission denied');
          // Still mark as initialized even without mic permission
          if (mounted) setInitialized(true);
          return;
        }

        // Initialize detector with configuration
        detectorRef.current = new PutterDetector({
          sampleRate: 16000,
          frameLength: 256,
          refractoryMs: 250,
          energyThresh: 6,
          zcrThresh: 0.22,
          tickGuardMs: 30,
          getUpcomingTicks: () => {
            return metronomeRef.current ? metronomeRef.current.getNextTicks(8) : [];
          },
          onStrike: (strikeEvent) => {
            console.log('Strike detected:', strikeEvent);
            if (mounted) {
              setLastHit(strikeEvent);
              // Auto-clear hit display after 2 seconds
              setTimeout(() => {
                if (mounted) setLastHit(null);
              }, 2000);
            }
          }
        });

        if (mounted) {
          setInitialized(true);
          console.log('PuttIQ detector initialized successfully');
        }
      } catch (error) {
        console.error('Failed to initialize detector:', error);
        if (mounted) setInitialized(false);
      }
    };

    initialize();

    // Cleanup on unmount
    return () => {
      mounted = false;
      
      // Clean up services
      if (metronomeRef.current) {
        metronomeRef.current.dispose();
      }
      
      if (detectorRef.current && detectorRef.current.isRunning) {
        detectorRef.current.stop();
      }
      
      if (aecStreamRef.current) {
        disableAEC(aecStreamRef.current);
      }
    };
  }, []); // Only run once on mount

  // Update BPM when it changes
  useEffect(() => {
    if (metronomeRef.current) {
      metronomeRef.current.setBpm(bpm);
    }
  }, [bpm]);

  /**
   * Request microphone permission
   * @returns {Promise<boolean>} True if granted
   */
  const requestMicrophonePermission = async () => {
    try {
      // Skip permission request on web or unsupported platforms
      if (Platform.OS === 'web') {
        console.log('Web platform detected, skipping native permission request');
        return true; // Assume granted for web
      }

      const permission = Platform.select({
        ios: PERMISSIONS.IOS.MICROPHONE,
        android: PERMISSIONS.ANDROID.RECORD_AUDIO,
      });

      if (!permission) {
        console.warn('Permission not defined for platform:', Platform.OS);
        return false;
      }

      const result = await request(permission);
      console.log('Microphone permission result:', result);
      return result === RESULTS.GRANTED || result === RESULTS.UNAVAILABLE; // UNAVAILABLE means not needed on this platform
    } catch (error) {
      console.error('Failed to request microphone permission:', error);
      // Try to continue anyway in case it's a permission library issue
      return true;
    }
  };

  /**
   * Start detection and metronome
   */
  const start = useCallback(async () => {
    if (isRunning || !isInitialized || !permissionGranted) {
      console.warn('Cannot start:', { isRunning, isInitialized, permissionGranted });
      return;
    }

    try {
      console.log('Starting PuttIQ detector...');

      // Enable AEC if supported (native platforms only)
      if (isAECSupported()) {
        const aecStream = await enableAEC();
        if (aecStream) {
          aecStreamRef.current = aecStream;
          setAecActive(true);
          console.log('AEC enabled');
        } else {
          console.warn('AEC failed to enable, continuing without it');
          setAecActive(false);
        }
      }

      // Start detector
      await detectorRef.current.start();
      console.log('Detector started');

      // Start metronome
      await metronomeRef.current.start();
      console.log('Metronome started');

      setRunning(true);
      
      // Start stats monitoring
      statsIntervalRef.current = startStatsMonitoring();
      
    } catch (error) {
      console.error('Failed to start:', error);
      
      // Clean up on error
      if (metronomeRef.current) {
        metronomeRef.current.stop();
      }
      
      if (detectorRef.current) {
        await detectorRef.current.stop();
      }
      
      if (aecStreamRef.current) {
        disableAEC(aecStreamRef.current);
        aecStreamRef.current = null;
        setAecActive(false);
      }
      
      setRunning(false);
    }
  }, [isInitialized, isRunning, permissionGranted]);

  /**
   * Stop detection and metronome
   */
  const stop = useCallback(async () => {
    if (!isRunning) return;

    try {
      console.log('Stopping PuttIQ detector...');

      // Stop metronome
      if (metronomeRef.current) {
        metronomeRef.current.stop();
      }

      // Stop detector
      if (detectorRef.current) {
        await detectorRef.current.stop();
        
        // Get final stats
        const stats = detectorRef.current.getStats();
        console.log('Final detector stats:', stats);
        setDetectorStats(stats);
      }

      // Disable AEC
      if (aecStreamRef.current) {
        disableAEC(aecStreamRef.current);
        aecStreamRef.current = null;
        setAecActive(false);
      }

      // Clear stats monitoring interval
      if (statsIntervalRef.current) {
        clearInterval(statsIntervalRef.current);
        statsIntervalRef.current = null;
      }

      setRunning(false);
      setLastHit(null);
      
      console.log('PuttIQ detector stopped');
    } catch (error) {
      console.error('Error stopping detector:', error);
      setRunning(false);
    }
  }, [isRunning]);

  /**
   * Update BPM value
   */
  const updateBpm = useCallback((newBpm) => {
    const clampedBpm = Math.max(60, Math.min(100, Math.round(newBpm)));
    setBpm(clampedBpm);
    
    if (metronomeRef.current) {
      metronomeRef.current.setBpm(clampedBpm);
    }
  }, []);

  /**
   * Update detector sensitivity
   */
  const updateSensitivity = useCallback((sensitivity) => {
    if (!detectorRef.current) return;

    // Map sensitivity (0-1) to energy threshold (10-3)
    const energyThresh = 10 - (sensitivity * 7);
    
    detectorRef.current.updateParams({
      energyThresh,
      zcrThresh: 0.15 + (sensitivity * 0.15) // 0.15-0.30 range
    });

    console.log('Updated sensitivity:', { sensitivity, energyThresh });
  }, []);

  /**
   * Start monitoring detector statistics
   */
  const startStatsMonitoring = useCallback(() => {
    if (!detectorRef.current) return;

    const intervalId = setInterval(() => {
      if (detectorRef.current) {
        const stats = detectorRef.current.getStats();
        setDetectorStats(stats);
      }
    }, 1000);

    // Store interval ID for cleanup
    return intervalId;
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
   * Get timing accuracy relative to metronome
   */
  const getTimingAccuracy = useCallback(() => {
    if (!lastHit || !metronomeRef.current) return null;

    const period = metronomeRef.current.getPeriod();
    const ticks = metronomeRef.current.getNextTicks(2);
    
    // Find nearest tick
    let nearestTick = ticks[0];
    let minDiff = Math.abs(lastHit.timestamp - ticks[0]);
    
    for (const tick of ticks) {
      const diff = Math.abs(lastHit.timestamp - tick);
      if (diff < minDiff) {
        minDiff = diff;
        nearestTick = tick;
      }
    }

    // Calculate timing
    const timingDiff = lastHit.timestamp - nearestTick;
    const accuracy = 1 - (Math.abs(timingDiff) / (period / 2));
    
    return {
      timingDiff,
      accuracy: Math.max(0, Math.min(1, accuracy)),
      isEarly: timingDiff < 0,
      isLate: timingDiff > 0
    };
  }, [lastHit]);

  return {
    // State
    isInitialized,
    isRunning,
    permissionGranted,
    aecActive,
    bpm,
    lastHit,
    detectorStats,
    
    // Methods
    start,
    stop,
    updateBpm,
    updateSensitivity,
    resetCalibration,
    getTimingAccuracy
  };
}

export default usePuttIQDetector;