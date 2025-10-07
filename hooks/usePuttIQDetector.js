import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform, Alert } from 'react-native';
import { Audio } from 'expo-av';
import { Metronome } from '../services/audio/Metronome';
import { DetectorFactory } from '../services/dsp/DetectorFactory';

// Conditionally import AEC modules for Expo Go compatibility
let enableAEC, disableAEC, isAECSupported;

try {
  const aec = require('../services/audio/enableAEC');
  enableAEC = aec.enableAEC;
  disableAEC = aec.disableAEC;
  isAECSupported = aec.isAECSupported;
} catch (e) {
  console.log('AEC module not available, using fallback');
  // Fallback for Expo Go
  enableAEC = async () => null;
  disableAEC = () => {};
  isAECSupported = () => false;
}

/**
 * Enhanced PuttIQ detector hook using improved DSP services
 * @param {number} defaultBpm - Default BPM setting
 * @returns {Object} Hook state and methods
 */
export function usePuttIQDetector(defaultBpm = 30) {
  // State management
  const [isInitialized, setInitialized] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [aecActive, setAecActive] = useState(false);
  const [isRunning, setRunning] = useState(false);
  const [bpm, setBpm] = useState(defaultBpm);
  const [lastHit, setLastHit] = useState(null);
  const [detectorStats, setDetectorStats] = useState(null);
  const [beatPosition, setBeatPosition] = useState(0);
  const [hitHistory, setHitHistory] = useState([]);
  const [debugMode, setDebugMode] = useState(false); // Debug mode off by default

  // Visual compensation in milliseconds for UI alignment (default +20ms)
  const [visualCompMs, setVisualCompMs] = useState(20);
  const visualCompMsRef = useRef(20);
  useEffect(() => { visualCompMsRef.current = visualCompMs; }, [visualCompMs]);

  // Optional external clock: provide current video time in ms for perfect sync
  const videoTimeProviderRef = useRef(null);
  const setVideoTimeProvider = useCallback((providerFn) => {
    // providerFn should be a sync function returning current time in milliseconds
    // e.g., () => Math.round(player.currentTime * 1000)
    videoTimeProviderRef.current = typeof providerFn === 'function' ? providerFn : null;
  }, []);

  // Service references
  const metronomeRef = useRef(null);
  const aecStreamRef = useRef(null);
  const detectorRef = useRef(null);
  const statsIntervalRef = useRef(null);
  const positionIntervalRef = useRef(null);

  // Initialize services on mount
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      try {
        console.log('Initializing PuttIQ detector...');

        // Initialize metronome (before permission request)
        try {
          metronomeRef.current = new Metronome();
          await metronomeRef.current.load();
          metronomeRef.current.setBpm(bpm);
          console.log('Metronome initialized successfully');
        } catch (metronomeError) {
          console.error('Failed to initialize metronome:', metronomeError);
          // Continue without metronome if it fails
        }

        // Don't request microphone permission on initialization
        // It will be requested when start() is called
        if (mounted) {
          setPermissionGranted(false); // Default to false
        }

        // Initialize detector using factory
        try {
          const detectorOptions = {
            sampleRate: 44100,  // 44.1kHz for professional acoustic analysis
            frameLength: 256,
            refractoryMs: 100,     // Very fast response for putts
            energyThresh: 3,       // Reduced sensitivity by 30% for fewer false positives
            zcrThresh: 0.10,       // Very low threshold for putter detection
            tickGuardMs: 50,       // Smaller guard since we have listening zone
            debugMode: true,       // Debug logging enabled for troubleshooting
            calibrationMode: false, // Calibration mode off by default
            audioGain: 85,         // Reduced by 30% from 120 for optimal detection

            // Listening zone configuration - only detect in middle portion of beat
            useListeningZone: true,      // Enable listening zone feature
            listeningZonePercent: 0.60,  // Listen for 60% of beat period (expanded by 50%)
            listeningZoneOffset: 0.20,   // Start at 20% into beat (20%-80%)

            getUpcomingTicks: () => {
              return metronomeRef.current ? metronomeRef.current.getNextTicks(8) : [];
            },
            getBpm: () => {
              return metronomeRef.current ? metronomeRef.current.getBpm() : 40;
            },
            getBeatCount: () => {
              return metronomeRef.current ? metronomeRef.current.getBeatCount() : 0;
            },
            minBeatCount: 2,  // Only start detecting after 2nd metronome beat
            onStrike: (strikeEvent) => {
              console.log('⚡ Strike detected in hook:', {
                energy: strikeEvent.energy.toFixed(6),
                quality: strikeEvent.quality
              });
              if (mounted) {
                // Calculate position relative to NEAREST beat, center at beats
                const period = 60000 / bpm;
                const ticks = metronomeRef.current ? metronomeRef.current.getNextTicks(2) : [];
                let positionInBeat = 0.5; // Default to center
                const timestampAdj = strikeEvent.timestamp + (visualCompMsRef.current || 0);

                if (videoTimeProviderRef.current) {
                  // Use video time as the clock for perfect alignment
                  const videoNow = Number(videoTimeProviderRef.current()); // ms
                  if (Number.isFinite(videoNow)) {
                    const t = videoNow + (visualCompMsRef.current || 0);
                    const r = ((t % period) + period) % period; // 0..period
                    const half = period / 2;
                    const delta = r <= half ? r : (r - period); // signed distance to nearest beat
                    const clamped = Math.max(-half, Math.min(half, delta));
                    // Right=early, Left=late with center at beat
                    positionInBeat = 0.5 - (clamped / half) * 0.5;
                  }
                } else if (ticks.length > 0) {
                  // Fallback to metronome ticks if no video clock provided
                  const nextTickCandidate = ticks[0] >= timestampAdj ? ticks[0] : (ticks[0] + period);
                  const prevTickCandidate = nextTickCandidate - period;
                  const distPrev = Math.abs(timestampAdj - prevTickCandidate);
                  const distNext = Math.abs(timestampAdj - nextTickCandidate);
                  const nearestTick = distPrev <= distNext ? prevTickCandidate : nextTickCandidate;
                  const delta = timestampAdj - nearestTick; // negative = early, positive = late
                  const half = period / 2;
                  const clamped = Math.max(-half, Math.min(half, delta));
                  positionInBeat = 0.5 - (clamped / half) * 0.5;
                }

                // Add position to strike event (include adjusted timestamp used for UI)
                const hitWithPosition = {
                  ...strikeEvent,
                  adjustedTimestamp: timestampAdj,
                  positionInBeat
                };

                setLastHit(hitWithPosition);

                // Add to history
                setHitHistory(prev => [...prev.slice(-9), {
                  position: positionInBeat,
                  timestamp: strikeEvent.timestamp,
                  quality: strikeEvent.quality
                }]);

                // Auto-clear hit display after 2 seconds
                setTimeout(() => {
                  if (mounted) setLastHit(null);
                }, 2000);
              }
            }
          };

          detectorRef.current = await DetectorFactory.createDetector(detectorOptions);

          // Log detector capabilities
          const capabilities = await DetectorFactory.getCapabilities();
          console.log('Detector capabilities:', capabilities);
        } catch (detectorError) {
          console.error('Failed to create detector:', detectorError);
          // Continue without detector if it fails
        }

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
   * Request microphone permission using expo-av
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
   * Start detection and metronome
   */
  const start = useCallback(async () => {
    if (isRunning || !isInitialized) {
      console.warn('Cannot start:', { isRunning, isInitialized });
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

      // Start position tracking for visual feedback
      positionIntervalRef.current = setInterval(() => {
        const period = metronomeRef.current ? metronomeRef.current.getPeriod() : (60000 / bpm);

        if (videoTimeProviderRef.current) {
          const videoNow = Number(videoTimeProviderRef.current()); // ms
          if (Number.isFinite(videoNow)) {
            const r = ((videoNow % period) + period) % period; // 0..period
            const half = period / 2;
            const delta = r <= half ? r : (r - period);
            const clamped = Math.max(-half, Math.min(half, delta));
            const position = 0.5 - (clamped / half) * 0.5; // Right=early, Left=late
            setBeatPosition(position);
          }
        } else if (metronomeRef.current && metronomeRef.current.getIsRunning()) {
          const now = performance.now();
          const ticks = metronomeRef.current.getNextTicks(2);
          if (ticks.length > 0) {
            const nextTickCandidate = ticks[0] >= now ? ticks[0] : (ticks[0] + period);
            const prevTickCandidate = nextTickCandidate - period;
            const distPrev = Math.abs(now - prevTickCandidate);
            const distNext = Math.abs(now - nextTickCandidate);
            const nearestTick = distPrev <= distNext ? prevTickCandidate : nextTickCandidate;
            const delta = now - nearestTick;
            const half = period / 2;
            const clamped = Math.max(-half, Math.min(half, delta));
            const position = 0.5 - (clamped / half) * 0.5;
            setBeatPosition(position);
          }
        }
      }, 16); // ~60fps update rate

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

      // Clear position tracking interval
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current);
        positionIntervalRef.current = null;
      }

      setRunning(false);
      setLastHit(null);
      setBeatPosition(0);
      setHitHistory([]);

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
    const clampedBpm = Math.max(30, Math.min(60, Math.round(newBpm)));
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

    // Map sensitivity (0-1) to energy threshold (8-2) - MORE SENSITIVE RANGE
    const energyThresh = 8 - (sensitivity * 6);

    // Map sensitivity to audio gain (10-100x amplification)
    const audioGain = 10 + (sensitivity * 90);

    detectorRef.current.updateParams({
      energyThresh,
      zcrThresh: 0.12 + (sensitivity * 0.13), // 0.12-0.25 range (lower floor)
      audioGain
    });

    console.log('Updated sensitivity:', { sensitivity, energyThresh, audioGain });
  }, []);

  // Visual compensation controls
  const updateVisualCompMs = useCallback((ms) => {
    const clamped = Math.max(-200, Math.min(200, Math.round(ms || 0)));
    setVisualCompMs(clamped);
    console.log('Visual compensation (ms):', clamped);
  }, []);

  const getVisualCompMs = useCallback(() => visualCompMsRef.current, []);

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
   * Toggle debug/calibration mode
   */
  const toggleDebugMode = useCallback(() => {
    setDebugMode(prev => {
      const newMode = !prev;
      console.log(`Debug mode: ${newMode ? 'ON' : 'OFF'}`);
      if (detectorRef.current) {
        detectorRef.current.updateParams({
          debugMode: newMode,
          calibrationMode: newMode
        });
      }
      return newMode;
    });
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
    const baseTs = lastHit.adjustedTimestamp ?? lastHit.timestamp;
    const timingDiff = baseTs - nearestTick;
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
    beatPosition,
    hitHistory,
    debugMode,
    visualCompMs,

    // Methods
    start,
    stop,
    updateBpm,
    updateSensitivity,
    resetCalibration,
    toggleDebugMode,
    getTimingAccuracy,
    updateVisualCompMs,
    getVisualCompMs,

    // External video clock binding for perfect sync
    setVideoTimeProvider
  };
}

export default usePuttIQDetector;