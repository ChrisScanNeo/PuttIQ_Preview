import { useState, useCallback, useEffect, useRef } from 'react';
import SoundDetectionService from '../services/soundDetection';

export const useSoundDetection = (isMetronomePlaying, bpm, metronomeStartTime) => {
  const [isListening, setIsListening] = useState(false);
  const [currentVolume, setCurrentVolume] = useState(-60);
  const [lastHit, setLastHit] = useState(null);
  const [hitAccuracy, setHitAccuracy] = useState(null);
  const [threshold, setThreshold] = useState(-25);
  const [hits, setHits] = useState([]);
  
  // Track metronome timing for accuracy calculation
  const beatIntervalRef = useRef(60000 / bpm);
  const lastBeatTimeRef = useRef(Date.now());
  const metronomeStartTimeRef = useRef(metronomeStartTime);
  
  useEffect(() => {
    beatIntervalRef.current = 60000 / bpm;
  }, [bpm]);
  
  useEffect(() => {
    metronomeStartTimeRef.current = metronomeStartTime;
    if (metronomeStartTime) {
      lastBeatTimeRef.current = metronomeStartTime;
    }
  }, [metronomeStartTime]);

  // Calculate hit accuracy relative to the beat
  const calculateAccuracy = useCallback((hitTimestamp) => {
    const beatInterval = beatIntervalRef.current;
    const timeSinceLastBeat = hitTimestamp - lastBeatTimeRef.current;
    const expectedNextBeat = lastBeatTimeRef.current + beatInterval;
    
    // Calculate how far off from the nearest beat
    const distanceToNextBeat = Math.abs(hitTimestamp - expectedNextBeat);
    const distanceToPrevBeat = timeSinceLastBeat;
    
    // Find the closest beat
    const distanceToNearestBeat = Math.min(distanceToNextBeat, distanceToPrevBeat);
    
    // Calculate accuracy as a percentage (perfect = 100%, off by half a beat = 0%)
    const maxAllowedDeviation = beatInterval / 2;
    const accuracy = Math.max(0, 100 - (distanceToNearestBeat / maxAllowedDeviation * 100));
    
    // Determine if early or late
    let timing = 'perfect';
    const toleranceMs = beatInterval * 0.1; // 10% tolerance for "perfect"
    
    if (distanceToNearestBeat < toleranceMs) {
      timing = 'perfect';
    } else if (distanceToNextBeat < distanceToPrevBeat) {
      timing = 'early';
    } else {
      timing = 'late';
    }
    
    return {
      accuracy: Math.round(accuracy),
      timing,
      deviation: Math.round(distanceToNearestBeat),
    };
  }, []);

  // Handle hit detection
  const handleHitDetected = useCallback((hitData) => {
    const accuracy = calculateAccuracy(hitData.timestamp);
    
    const hitInfo = {
      ...hitData,
      ...accuracy,
    };
    
    setLastHit(hitInfo);
    setHitAccuracy(accuracy);
    setHits(prev => [...prev.slice(-9), hitInfo]); // Keep last 10 hits
    
    // Update last beat time for next calculation
    if (accuracy.timing === 'perfect' || accuracy.accuracy > 80) {
      lastBeatTimeRef.current = hitData.timestamp;
    }
  }, [calculateAccuracy]);

  // Handle volume updates
  const handleVolumeUpdate = useCallback((volume) => {
    setCurrentVolume(volume);
  }, []);

  // Start listening
  const startListening = useCallback(async () => {
    try {
      // Set threshold before starting
      SoundDetectionService.setThreshold(threshold);
      
      // Pass metronome timing info for filtering
      if (metronomeStartTime && bpm) {
        SoundDetectionService.setMetronomeInfo(bpm, metronomeStartTime);
      }
      
      const success = await SoundDetectionService.startListening(
        handleHitDetected,
        handleVolumeUpdate
      );
      
      if (success) {
        setIsListening(true);
        lastBeatTimeRef.current = Date.now();
      }
      
      return success;
    } catch (error) {
      console.error('Failed to start sound detection:', error);
      return false;
    }
  }, [threshold, handleHitDetected, handleVolumeUpdate, bpm, metronomeStartTime]);

  // Stop listening
  const stopListening = useCallback(async () => {
    try {
      await SoundDetectionService.stopListening();
      setIsListening(false);
      setCurrentVolume(-60);
      setHits([]);
      return true;
    } catch (error) {
      console.error('Failed to stop sound detection:', error);
      return false;
    }
  }, []);

  // Auto start/stop with metronome
  useEffect(() => {
    if (isMetronomePlaying && !isListening) {
      startListening();
    } else if (!isMetronomePlaying && isListening) {
      stopListening();
    }
  }, [isMetronomePlaying, isListening, startListening, stopListening]);

  // Update metronome info when BPM changes
  useEffect(() => {
    if (isListening && metronomeStartTime && bpm) {
      SoundDetectionService.setMetronomeInfo(bpm, metronomeStartTime);
    }
  }, [bpm, metronomeStartTime, isListening]);

  // Update threshold
  const updateThreshold = useCallback((newThreshold) => {
    setThreshold(newThreshold);
    SoundDetectionService.setThreshold(newThreshold);
  }, []);

  // Calculate average accuracy
  const getAverageAccuracy = useCallback(() => {
    if (hits.length === 0) return null;
    const sum = hits.reduce((acc, hit) => acc + hit.accuracy, 0);
    return Math.round(sum / hits.length);
  }, [hits]);

  return {
    isListening,
    currentVolume,
    lastHit,
    hitAccuracy,
    hits,
    threshold,
    startListening,
    stopListening,
    updateThreshold,
    getAverageAccuracy,
  };
};