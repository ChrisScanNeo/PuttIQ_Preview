import { useState, useEffect, useRef, useCallback } from 'react';
import audioEnhanced from '../services/audioEnhanced';

export const useEnhancedMetronome = (initialBpm = 80) => {
  const [bpm, setBpm] = useState(initialBpm);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentBeat, setCurrentBeat] = useState(0);
  const [hitDetectionEnabled, setHitDetectionEnabled] = useState(false);
  const [lastHit, setLastHit] = useState(null);
  const [hitAccuracy, setHitAccuracy] = useState(null);
  const [hitHistory, setHitHistory] = useState([]);
  
  const intervalRef = useRef(null);
  const beatCountRef = useRef(0);
  const animationFrameRef = useRef(null);
  const progressRef = useRef(0);
  const lastTickTimeRef = useRef(0);
  const directionRef = useRef(1); // 1 for forward, -1 for backward

  // Initialize audio service
  useEffect(() => {
    audioEnhanced.initialize();
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      audioEnhanced.cleanup();
    };
  }, []);

  // Handle hit detection callback
  const handleHitDetected = useCallback((hitData) => {
    console.log('Hit detected in hook:', hitData);
    setLastHit(hitData);
    
    if (hitData.accuracy !== null) {
      setHitAccuracy(hitData.accuracy);
      
      // Add to history (keep last 10 hits)
      setHitHistory(prev => {
        const newHistory = [...prev, hitData];
        if (newHistory.length > 10) {
          newHistory.shift();
        }
        return newHistory;
      });
    }
  }, []);

  // Toggle hit detection
  const toggleHitDetection = useCallback(async () => {
    if (hitDetectionEnabled) {
      await audioEnhanced.stopHitDetection();
      setHitDetectionEnabled(false);
      setLastHit(null);
      setHitAccuracy(null);
      setHitHistory([]);
    } else {
      const success = await audioEnhanced.startHitDetection(handleHitDetected);
      if (success) {
        setHitDetectionEnabled(true);
      } else {
        console.error('Failed to start hit detection');
      }
    }
  }, [hitDetectionEnabled, handleHitDetected]);

  // Calculate average accuracy
  const getAverageAccuracy = useCallback(() => {
    if (hitHistory.length === 0) return null;
    const sum = hitHistory.reduce((acc, hit) => acc + (hit.accuracy || 0), 0);
    return sum / hitHistory.length;
  }, [hitHistory]);

  // Animation loop for smooth progress
  const animate = useCallback(() => {
    if (!isPlaying) return;
    
    const now = Date.now();
    const intervalMs = 60000 / bpm; // Time for one beat
    const elapsed = now - lastTickTimeRef.current;
    const progress = (elapsed / intervalMs) % 1;
    
    // Update progress for animation
    progressRef.current = directionRef.current === 1 ? progress : 1 - progress;
    
    // Check if we should play a tick
    if (elapsed >= intervalMs) {
      lastTickTimeRef.current = now;
      
      // Play tick sound at beat endpoints
      audioEnhanced.playTick();
      
      // Toggle direction for back-and-forth motion
      directionRef.current *= -1;
      
      // Update beat count
      beatCountRef.current = (beatCountRef.current + 1) % 4;
      setCurrentBeat(beatCountRef.current);
    }
    
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [isPlaying, bpm]);

  // Start/stop metronome
  const toggleMetronome = useCallback(() => {
    if (isPlaying) {
      // Stop
      setIsPlaying(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      beatCountRef.current = 0;
      setCurrentBeat(0);
      progressRef.current = 0;
      directionRef.current = 1;
    } else {
      // Start
      setIsPlaying(true);
      lastTickTimeRef.current = Date.now();
      beatCountRef.current = 0;
      setCurrentBeat(0);
      progressRef.current = 0;
      directionRef.current = 1;
      
      // Play initial tick
      audioEnhanced.playTick();
      
      // Start animation loop
      animate();
    }
  }, [isPlaying, animate]);

  // Update animation when playing state changes
  useEffect(() => {
    if (isPlaying) {
      animate();
    }
  }, [isPlaying, animate]);

  // Get current progress for UI
  const getProgress = useCallback(() => {
    return progressRef.current;
  }, []);

  // Adjust BPM
  const adjustBpm = useCallback((newBpm) => {
    setBpm(Math.max(60, Math.min(100, newBpm)));
  }, []);

  // Get timing feedback message
  const getTimingFeedback = useCallback(() => {
    if (!hitAccuracy) return '';
    
    if (hitAccuracy >= 90) return 'Perfect!';
    if (hitAccuracy >= 75) return 'Great!';
    if (hitAccuracy >= 60) return 'Good';
    if (hitAccuracy >= 40) return 'Keep practicing';
    return 'Try to match the beat';
  }, [hitAccuracy]);

  return {
    // State
    bpm,
    isPlaying,
    currentBeat,
    hitDetectionEnabled,
    lastHit,
    hitAccuracy,
    hitHistory,
    
    // Actions
    setBpm: adjustBpm,
    toggleMetronome,
    toggleHitDetection,
    
    // Computed values
    getProgress,
    getAverageAccuracy,
    getTimingFeedback,
    
    // Audio service reference (for advanced usage)
    audioService: audioEnhanced
  };
};