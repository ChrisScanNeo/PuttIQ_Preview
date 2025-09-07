import { useState, useEffect, useCallback, useRef } from 'react';
import PuttIQAudio from '../services/puttiqAudio';

export const usePuttIQAudio = (initialBpm = 80) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [bpm, setBpm] = useState(initialBpm);
  const [nativeAudio, setNativeAudio] = useState(false);

  // Metronome state
  const [beatCount, setBeatCount] = useState(0);
  const [startTime, setStartTime] = useState(null);

  // Sound detection state
  const [currentVolume, setCurrentVolume] = useState(-60);
  const [lastHit, setLastHit] = useState(null);
  const [hits, setHits] = useState([]);
  const [threshold, setThreshold] = useState(-25);

  // Ensure we only initialize once
  const isInitializingRef = useRef(false);

  // Initialize the service
  useEffect(() => {
    const initialize = async () => {
      if (isInitialized || isInitializingRef.current) return;
      isInitializingRef.current = true;

      try {
        await PuttIQAudio.initialize();
        setNativeAudio(PuttIQAudio.isNativeAvailable());
        setIsInitialized(true);
        console.log('PuttIQ Audio Service Initialized.');
      } catch (error) {
        console.error('Failed to initialize PuttIQ Audio Service:', error);
      } finally {
        isInitializingRef.current = false;
      }
    };

    initialize();

    // Setup event listeners
    const unsubBeat = PuttIQAudio.onBeat(data => {
      setBeatCount(data.beatCount);
    });

    const unsubHit = PuttIQAudio.onHitDetected(data => {
      setLastHit(data);
      setHits(prev => [...prev.slice(-9), data]); // Keep last 10 hits
    });

    const unsubVolume = PuttIQAudio.onVolumeUpdate(data => {
      setCurrentVolume(data.volume);
    });

    // Cleanup on unmount
    return () => {
      unsubBeat();
      unsubHit();
      unsubVolume();
      PuttIQAudio.cleanup();
    };
  }, [isInitialized]);

  // --- Metronome Controls ---
  const start = useCallback(async () => {
    if (!isInitialized || isPlaying) return;
    const result = await PuttIQAudio.startMetronome(bpm);
    if (result.success) {
      setIsPlaying(true);
      setStartTime(result.startTime);
      setBeatCount(0);
      setHits([]);
    }
  }, [isInitialized, isPlaying, bpm]);

  const stop = useCallback(async () => {
    if (!isPlaying) return;
    const result = await PuttIQAudio.stopMetronome();
    if (result.success) {
      setIsPlaying(false);
      setStartTime(null);
      setBeatCount(0);
    }
  }, [isPlaying]);

  const toggle = useCallback(() => {
    if (isPlaying) {
      stop();
    } else {
      start();
    }
  }, [isPlaying, start, stop]);

  const updateBpm = useCallback(async (newBpm) => {
    setBpm(newBpm);
    if (isInitialized) {
      await PuttIQAudio.setBPM(newBpm);
    }
  }, [isInitialized]);

  // --- Sound Detection Controls ---
  const startDetector = useCallback(async () => {
    if (!isInitialized || isListening) return;
    const result = await PuttIQAudio.startListening();
    if (result.success) {
      setIsListening(true);
    }
  }, [isInitialized, isListening]);

  const stopDetector = useCallback(async () => {
    if (!isListening) return;
    const result = await PuttIQAudio.stopListening();
    if (result.success) {
      setIsListening(false);
    }
  }, [isListening]);

  const updateThreshold = useCallback(async (newThreshold) => {
    setThreshold(newThreshold);
    if (isInitialized) {
      await PuttIQAudio.setThreshold(newThreshold);
    }
  }, [isInitialized]);
  
  // Auto-start/stop detector with metronome
  useEffect(() => {
    if (isPlaying && !isListening) {
      startDetector();
    } else if (!isPlaying && isListening) {
      stopDetector();
    }
  }, [isPlaying, isListening, startDetector, stopDetector]);


  return {
    // Status
    isInitialized,
    isPlaying,
    isListening,
    nativeAudio,

    // Metronome
    bpm,
    beatCount,
    startTime,
    updateBpm,
    toggle,
    start,
    stop,

    // Sound Detection
    currentVolume,
    lastHit,
    hits,
    threshold,
    updateThreshold,
  };
};
