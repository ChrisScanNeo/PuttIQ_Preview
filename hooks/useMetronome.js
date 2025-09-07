import { useState, useEffect, useCallback } from 'react';
import AudioService from '../services/audio';
import TimingEngine from '../services/timingEngine';

export const useMetronome = (initialBpm = 80) => {
  const [bpm, setBpm] = useState(initialBpm);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [position, setPosition] = useState(0);
  const [direction, setDirection] = useState('forward');
  const [beatCount, setBeatCount] = useState(0);
  const [startTime, setStartTime] = useState(null);

  // Initialize audio service and timing engine
  useEffect(() => {
    // Set audio callback for timing engine
    TimingEngine.setAudioCallback(() => {
      AudioService.playTick();
    });

    // Initialize audio service
    AudioService.initialize();
  }, []);

  // Subscribe to timing updates
  useEffect(() => {
    // Subscribe to beat events
    const unsubscribeBeat = TimingEngine.onBeat((beatData) => {
      setCurrentBeat(beatData.beatCount % 2);
      setBeatCount(beatData.beatCount);
    });

    // Subscribe to position updates (60fps)
    const unsubscribePosition = TimingEngine.onPositionUpdate((positionData) => {
      setPosition(positionData.position);
      setDirection(positionData.direction);
    });

    return () => {
      unsubscribeBeat();
      unsubscribePosition();
    };
  }, []);

  // Start metronome
  const start = useCallback(async () => {
    if (isPlaying) return;
    
    // Initialize audio if not already done
    if (!AudioService.isInitialized) {
      await AudioService.initialize();
    }

    // Start timing engine
    TimingEngine.start(bpm);
    
    const now = Date.now();
    setStartTime(now);
    setIsPlaying(true);
    setBeatCount(0);
    setCurrentBeat(0);
  }, [isPlaying, bpm]);

  // Stop metronome
  const stop = useCallback(() => {
    TimingEngine.stop();
    setIsPlaying(false);
    setCurrentBeat(0);
    setBeatCount(0);
    setPosition(0);
    setDirection('forward');
    setStartTime(null);
  }, []);

  // Toggle play/pause
  const toggle = useCallback(() => {
    if (isPlaying) {
      stop();
    } else {
      start();
    }
  }, [isPlaying, start, stop]);

  // Update BPM
  const updateBpm = useCallback((newBpm) => {
    setBpm(newBpm);
    
    // Update timing engine BPM
    TimingEngine.updateBPM(newBpm);
  }, []);

  // Get current timing info
  const getTimingInfo = useCallback(() => {
    return TimingEngine.getTimingInfo();
  }, []);

  return {
    bpm,
    setBpm: updateBpm,
    isPlaying,
    start,
    stop,
    toggle,
    currentBeat,
    position,
    direction,
    beatCount,
    startTime,
    getTimingInfo,
  };
};