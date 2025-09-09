import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import Slider from '@react-native-community/slider';
import { usePuttIQDetector } from '../hooks/usePuttIQDetector'; // Using the new detector hook

export default function HomeScreen({ user }) {
  const [isPremium, setIsPremium] = useState(user?.isPremium || false);
  const {
    isInitialized,
    isRunning,
    permissionGranted,
    aecActive,
    bpm,
    lastHit,
    updateBpm,
    start,
    stop,
  } = usePuttIQDetector(user?.settings?.defaultBPM || 80) || {};

  const toggle = () => {
    if (isRunning) {
      stop();
    } else {
      start();
    }
  };

  return (
    <SafeAreaView style={styles.safeContainer}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>PuttIQ</Text>
          {!isPremium && (
            <TouchableOpacity style={styles.premiumBadge}>
              <Text style={styles.premiumText}>🔒 Free Version</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.metronomeArea}>
          <Text style={styles.bpmText}>Tempo: {bpm} BPM</Text>
          <View style={styles.sliderContainer}>
            <Text>60</Text>
            <Slider
              style={styles.slider}
              minimumValue={60}
              maximumValue={100}
              value={bpm}
              onValueChange={updateBpm}
              step={1}
              minimumTrackTintColor="#2E7D32"
              maximumTrackTintColor="#ccc"
              disabled={isRunning}
            />
            <Text>100</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.playButton, isRunning && styles.stopButton, !isInitialized && styles.disabledButton]}
          onPress={toggle}
          disabled={!isInitialized}
        >
          <Text style={styles.playButtonText}>
            {isRunning ? "⏹ STOP" : "▶️ START"}
          </Text>
        </TouchableOpacity>

        <View style={styles.feedbackContainer}>
          <Text style={styles.statusText}>
            {!isInitialized ? "Initializing..." : 
             !permissionGranted ? "Microphone permission needed" : 
             aecActive ? "AEC Active" : "Ready"}
          </Text>

          {lastHit && isRunning && (
            <View style={styles.hitFeedback}>
              <Text style={styles.hitTiming}>Impact Detected!</Text>
              <Text style={styles.hitAccuracy}>
                Energy: {lastHit.energy.toFixed(4)}
              </Text>
              <Text style={styles.hitAccuracy}>
                Latency: {lastHit.latencyMs.toFixed(2)}ms
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 15,
    paddingTop: 5,
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
    marginBottom: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  premiumBadge: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  premiumText: {
    fontSize: 12,
    color: '#E65100',
    fontWeight: '600',
  },
  metronomeArea: {
    width: '100%',
    padding: 10,
    alignItems: 'center',
  },
  bpmText: {
    fontSize: 16,
    marginBottom: 10,
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 15,
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 10,
  },
  feedbackContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    minHeight: 100, // Ensure space for feedback
  },
  statusText: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
  },
  hitFeedback: {
    marginTop: 15,
    alignItems: 'center',
    backgroundColor: '#E8F5E9', // Light green background for hit
    padding: 10,
    borderRadius: 8,
  },
  hitTiming: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  hitAccuracy: {
    fontSize: 14,
    color: '#555',
    marginTop: 4,
  },
  playButton: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 35,
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 10,
    alignSelf: 'center',
  },
  stopButton: {
    backgroundColor: '#FF6B6B',
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  playButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
