import { useState, useEffect, useCallback, useRef } from 'react';
import AudioEngineV3 from '../services/audioEngineV3';

export const useMetronomeV2 = (initialBpm = 80) => {
  const [bpm, setBpm] = useState(initialBpm);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioTime, setAudioTime] = useState(0);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const statusIntervalRef = useRef(null);

  // Initialize audio engine on mount
  useEffect(() => {
    const initAudio = async () => {
      await AudioEngineV3.initialize();
      
      // Set initial BPM
      AudioEngineV3.setBPM(bpm);
    };
    
    initAudio();
    
    // Cleanup on unmount
    return () => {
      AudioEngineV3.unload();
    };
  }, []);

  // Subscribe to audio status updates
  useEffect(() => {
    const unsubscribe = AudioEngineV3.onStatusChange((status) => {
      if (status.isPlaying) {
        setCurrentBeat(status.beatCount % 2);
      }
    });
    
    return unsubscribe;
  }, []);

  // Also use a faster interval for smoother animation updates
  useEffect(() => {
    if (isPlaying) {
      let lastTime = Date.now();
      let accumulatedTime = 0;
      
      statusIntervalRef.current = setInterval(() => {
        const now = Date.now();
        const delta = (now - lastTime) / 1000;
        lastTime = now;
        accumulatedTime += delta;
        
        setAudioTime(prev => prev + delta);
      }, 16); // ~60fps updates
      
      return () => {
        if (statusIntervalRef.current) {
          clearInterval(statusIntervalRef.current);
        }
      };
    }
  }, [isPlaying]);

  // Start metronome
  const start = useCallback(async () => {
    if (isPlaying) return;
    
    await AudioEngineV3.start();
    setIsPlaying(true);
    setStartTime(Date.now());
    setAudioTime(0);
  }, [isPlaying]);

  // Stop metronome
  const stop = useCallback(async () => {
    if (!isPlaying) return;
    
    await AudioEngineV3.stop();
    setIsPlaying(false);
    setAudioTime(0);
    setCurrentBeat(0);
    setStartTime(null);
    
    if (statusIntervalRef.current) {
      clearInterval(statusIntervalRef.current);
    }
  }, [isPlaying]);

  // Toggle play/pause
  const toggle = useCallback(() => {
    if (isPlaying) {
      stop();
    } else {
      start();
    }
  }, [isPlaying, start, stop]);

  // Update BPM
  const updateBpm = useCallback(async (newBpm) => {
    setBpm(newBpm);
    await AudioEngineV3.setBPM(newBpm);
  }, []);

  return {
    bpm,
    setBpm: updateBpm,
    isPlaying,
    start,
    stop,
    toggle,
    audioTime,
    currentBeat,
    startTime,
  };
};