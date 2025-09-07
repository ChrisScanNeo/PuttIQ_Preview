import { useState, useEffect, useCallback, useRef } from 'react';
import PuttIQAudio from '../services/puttiqAudio';

export function useMetronomeNative(initialBpm = 80) {
  const [bpm, setBpmState] = useState(initialBpm);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioTime, setAudioTime] = useState(0);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [startTime, setStartTime] = useState(null);
  const [isNative, setIsNative] = useState(false);
  
  const unsubscribeRef = useRef(null);

  useEffect(() => {
    // Initialize and check if native module is available
    PuttIQAudio.initialize().then(() => {
      setIsNative(PuttIQAudio.isNativeAvailable());
      console.log('Audio initialized, native:', PuttIQAudio.isNativeAvailable());
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      PuttIQAudio.cleanup();
    };
  }, []);

  useEffect(() => {
    // Subscribe to beat events
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    unsubscribeRef.current = PuttIQAudio.onBeat((data) => {
      setCurrentBeat(data.beatCount % 2);
      setAudioTime((data.timestamp - (startTime || data.timestamp)) / 1000);
    });

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, [startTime]);

  const start = useCallback(async () => {
    try {
      const result = await PuttIQAudio.startMetronome(bpm);
      if (result.success) {
        setIsPlaying(true);
        setStartTime(result.startTime);
        setAudioTime(0);
        setCurrentBeat(0);
      }
    } catch (error) {
      console.error('Failed to start metronome:', error);
    }
  }, [bpm]);

  const stop = useCallback(async () => {
    try {
      await PuttIQAudio.stopMetronome();
      setIsPlaying(false);
      setAudioTime(0);
      setCurrentBeat(0);
      setStartTime(null);
    } catch (error) {
      console.error('Failed to stop metronome:', error);
    }
  }, []);

  const toggle = useCallback(async () => {
    if (isPlaying) {
      await stop();
    } else {
      await start();
    }
  }, [isPlaying, start, stop]);

  const setBpm = useCallback(async (newBpm) => {
    setBpmState(newBpm);
    if (isPlaying) {
      await PuttIQAudio.setBPM(newBpm);
    }
  }, [isPlaying]);

  return {
    bpm,
    setBpm,
    isPlaying,
    start,
    stop,
    toggle,
    audioTime,
    currentBeat,
    startTime,
    isNative // Indicates if using native module or fallback
  };
}