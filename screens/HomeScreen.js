import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Button, TouchableOpacity, ScrollView, SafeAreaView } from 'react-native';
import Slider from '@react-native-community/slider';
import { usePuttIQAudio } from '../hooks/usePuttIQAudio';
import TimingBar from '../components/TimingBar';

export default function HomeScreen({ user }) {
  const [isPremium, setIsPremium] = useState(user?.isPremium || false);
  const { 
    bpm, 
    updateBpm, 
    isPlaying, 
    toggle, 
    beatCount, 
    isListening, 
    lastHit, 
    currentVolume 
  } = usePuttIQAudio(user?.settings?.defaultBPM || 80);

  useEffect(() => {
    // Update premium status when user changes
    setIsPremium(user?.isPremium || false);
  }, [user]);

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
      
      {/* Timing Bar - moves with BPM */}
      <TimingBar isPlaying={isPlaying} beatCount={beatCount} position={0} direction="forward" />
      
      <View style={styles.metronomeArea}>
        {/* Visual beat indicator */}
        <View style={styles.beatIndicator}>
          <View style={[
            styles.beatDot,
            { backgroundColor: beatCount % 2 === 0 ? '#2E7D32' : '#ccc' }
          ]} />
          <View style={[
            styles.beatDot,
            { backgroundColor: beatCount % 2 === 1 ? '#2E7D32' : '#ccc' }
          ]} />
        </View>
        
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
            disabled={isPlaying}
          />
          <Text>100</Text>
        </View>
      </View>

      <TouchableOpacity 
        style={[styles.playButton, isPlaying && styles.stopButton]}
        onPress={toggle}
      >
        <Text style={styles.playButtonText}>
          {isPlaying ? "⏹ STOP" : "▶️ START"}
        </Text>
      </TouchableOpacity>
      
        <View style={styles.feedbackContainer}>
          <Text style={styles.feedbackText}>
            {!isPlaying ? "Ready to start..." : 
             isListening ? "Listening for hits..." : 
             "Setting up microphone..."}
          </Text>
          
          {lastHit && isPlaying && (
            <View style={styles.hitFeedback}>
              <Text style={[
                styles.hitTiming,
                lastHit.timing === 'perfect' && styles.perfectTiming,
                lastHit.timing === 'early' && styles.earlyTiming,
                lastHit.timing === 'late' && styles.lateTiming,
              ]}>
                {lastHit.timing === 'perfect' ? '✓ PERFECT!' : 
                 lastHit.timing === 'early' ? '← EARLY' : 
                 '→ LATE'}
              </Text>
              <Text style={styles.hitAccuracy}>
                {lastHit.accuracy}% accurate
              </Text>
            </View>
          )}
          
          {isListening && (
            <>
              <View style={styles.volumeMeter}>
                <View style={styles.volumeBar}>
                  <View 
                    style={[
                      styles.volumeLevel,
                      { width: `${Math.max(0, (currentVolume + 60) / 60 * 100)}%` }
                    ]}
                  />
                </View>
                <Text style={styles.volumeText}>Volume Level</Text>
              </View>
              <Text style={styles.filterInfo}>
                🎧 Filtering metronome sounds • Hit between beats
              </Text>
            </>
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
    marginTop: 10,
    marginBottom: 10,
  },
  feedbackText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  hitFeedback: {
    marginTop: 15,
    alignItems: 'center',
  },
  hitTiming: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  perfectTiming: {
    color: '#2E7D32',
  },
  earlyTiming: {
    color: '#FF9800',
  },
  lateTiming: {
    color: '#F44336',
  },
  hitAccuracy: {
    fontSize: 14,
    color: '#666',
  },
  volumeMeter: {
    marginTop: 15,
    width: '80%',
    alignItems: 'center',
  },
  volumeBar: {
    width: '100%',
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  volumeLevel: {
    height: '100%',
    backgroundColor: '#4CAF50',
  },
  volumeText: {
    fontSize: 12,
    color: '#999',
    marginTop: 4,
  },
  filterInfo: {
    fontSize: 11,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  beatIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 10,
    gap: 20,
  },
  beatDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ccc',
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
  playButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});