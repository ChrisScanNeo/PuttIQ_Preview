import { useState, useEffect, useRef } from 'react';
import PuttIQAudio from '../services/puttiqAudio';

export function useSoundDetectionNative(isMetronomePlaying, bpm, startTime) {
  const [isListening, setIsListening] = useState(false);
  const [lastHit, setLastHit] = useState(null);
  const [currentVolume, setCurrentVolume] = useState(-60);
  const [hitHistory, setHitHistory] = useState([]);
  
  const unsubscribersRef = useRef([]);

  useEffect(() => {
    let mounted = true;

    const startDetection = async () => {
      if (isMetronomePlaying && mounted) {
        try {
          const result = await PuttIQAudio.startListening();
          if (result.success && mounted) {
            setIsListening(true);
          }
        } catch (error) {
          console.error('Failed to start sound detection:', error);
        }
      }
    };

    const stopDetection = async () => {
      try {
        await PuttIQAudio.stopListening();
        if (mounted) {
          setIsListening(false);
          setCurrentVolume(-60);
        }
      } catch (error) {
        console.error('Failed to stop sound detection:', error);
      }
    };

    if (isMetronomePlaying) {
      startDetection();
    } else {
      stopDetection();
    }

    return () => {
      mounted = false;
      stopDetection();
    };
  }, [isMetronomePlaying]);

  useEffect(() => {
    // Clear previous subscriptions
    unsubscribersRef.current.forEach(unsub => unsub());
    unsubscribersRef.current = [];

    // Subscribe to hit detection events
    const unsubHit = PuttIQAudio.onHitDetected((hit) => {
      setLastHit({
        timestamp: hit.timestamp,
        volume: hit.volume,
        accuracy: Math.round(hit.accuracy),
        timing: hit.timing,
        offset: hit.offset
      });

      setHitHistory(prev => [...prev.slice(-9), {
        timestamp: hit.timestamp,
        accuracy: Math.round(hit.accuracy),
        timing: hit.timing
      }]);
    });

    // Subscribe to volume updates
    const unsubVolume = PuttIQAudio.onVolumeUpdate((data) => {
      setCurrentVolume(data.volume);
    });

    unsubscribersRef.current = [unsubHit, unsubVolume];

    return () => {
      unsubscribersRef.current.forEach(unsub => unsub());
    };
  }, []);

  const getAverageAccuracy = () => {
    if (hitHistory.length === 0) return 0;
    const sum = hitHistory.reduce((acc, hit) => acc + hit.accuracy, 0);
    return Math.round(sum / hitHistory.length);
  };

  const getTimingDistribution = () => {
    const distribution = { early: 0, perfect: 0, late: 0 };
    hitHistory.forEach(hit => {
      distribution[hit.timing]++;
    });
    return distribution;
  };

  const resetHistory = () => {
    setHitHistory([]);
    setLastHit(null);
  };

  return {
    isListening,
    lastHit,
    currentVolume,
    hitHistory,
    getAverageAccuracy,
    getTimingDistribution,
    resetHistory,
    hitAccuracy: lastHit?.accuracy || 0
  };
}