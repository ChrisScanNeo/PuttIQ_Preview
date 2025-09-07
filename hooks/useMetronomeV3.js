import { useState, useEffect, useCallback } from 'react';
import AudioEngineV4 from '../services/audioEngineV4';

export const useMetronomeV3 = (initialBpm = 80) => {
  const [bpm, setBpm] = useState(initialBpm);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioTime, setAudioTime] = useState(0);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [startTime, setStartTime] = useState(null);

  // Initialize audio engine on mount
  useEffect(() => {
    const initAudio = async () => {
      await AudioEngineV4.initialize();
      AudioEngineV4.setBPM(bpm);
    };
    
    initAudio();
    
    // Cleanup on unmount
    return () => {
      AudioEngineV4.unload();
    };
  }, []);

  // Subscribe to audio engine updates - single source of truth
  useEffect(() => {
    const unsubscribe = AudioEngineV4.onStatusChange((status) => {
      // Update all timing from the audio engine
      setAudioTime(status.audioTime);
      setCurrentBeat(status.beatCount % 2);
      
      if (status.startTime && !startTime) {
        setStartTime(status.startTime);
      }
      
      if (!status.isPlaying) {
        setStartTime(null);
      }
    });
    
    return unsubscribe;
  }, [startTime]);

  // Start metronome
  const start = useCallback(async () => {
    if (isPlaying) return;
    
    await AudioEngineV4.start();
    setIsPlaying(true);
  }, [isPlaying]);

  // Stop metronome
  const stop = useCallback(async () => {
    if (!isPlaying) return;
    
    await AudioEngineV4.stop();
    setIsPlaying(false);
    setAudioTime(0);
    setCurrentBeat(0);
    setStartTime(null);
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
    await AudioEngineV4.setBPM(newBpm);
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