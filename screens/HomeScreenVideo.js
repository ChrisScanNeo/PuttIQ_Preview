import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, ImageBackground, Image, Dimensions } from 'react-native';
import Slider from '@react-native-community/slider';
import SteppedGolfBall from '../components/SteppedGolfBall';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function HomeScreenVideo({ user }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(70);
  const [mode, setMode] = useState('tones'); // tones, beats, or wind
  const [sensitivity, setSensitivity] = useState(0.5);

  const toggle = () => {
    setIsPlaying(!isPlaying);
  };

  const selectMode = (newMode) => {
    setMode(newMode);
    setIsPlaying(false); // Stop playback when changing modes
  };

  return (
    <ImageBackground
      source={require('../assets/grass-background.jpeg')}
      style={styles.backgroundImage}
      resizeMode="cover"
    >
      <SafeAreaView style={styles.safeContainer}>
        <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
          {/* Logo in top-right corner */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image
                source={require('../assets/puttiq-logo.jpg')}
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* Placeholder for timer bar - will add video/animation component here */}
          <View style={styles.timerBarPlaceholder}>
            {/* Timer bar will be added here */}
          </View>

          {/* Golf ball in center */}
          <View style={styles.golfBallContainer}>
            <SteppedGolfBall
              size={96}
              beatPosition={0}
              isHit={false}
              hitQuality={null}
            />
          </View>

          {/* BPM Controls on left side - Original style */}
          <View style={styles.bpmControlsContainer}>
            <TouchableOpacity
              style={styles.bpmButton}
              onPress={() => setBpm(Math.max(70, bpm - 1))}
              disabled={isPlaying}
            >
              <Text style={styles.bpmButtonText}>-</Text>
            </TouchableOpacity>
            <View style={styles.bpmDisplay}>
              <Text style={styles.bpmValue}>{bpm}</Text>
              <Text style={styles.bpmLabel}>BPM</Text>
            </View>
            <TouchableOpacity
              style={styles.bpmButton}
              onPress={() => setBpm(Math.min(80, bpm + 1))}
              disabled={isPlaying}
            >
              <Text style={styles.bpmButtonText}>+</Text>
            </TouchableOpacity>
          </View>

          {/* Main controls area */}
          <View style={styles.metronomeArea}>
            {/* Mode Selector Buttons */}
            <View style={styles.modeContainer}>
              <TouchableOpacity
                style={[styles.modeButton, mode === 'tones' && styles.modeButtonActive]}
                onPress={() => selectMode('tones')}
              >
                <Text style={[styles.modeButtonText, mode === 'tones' && styles.modeButtonTextActive]}>
                  🎵 Tones
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeButton, mode === 'beats' && styles.modeButtonActive]}
                onPress={() => selectMode('beats')}
              >
                <Text style={[styles.modeButtonText, mode === 'beats' && styles.modeButtonTextActive]}>
                  🥁 Beats
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeButton, mode === 'wind' && styles.modeButtonActive]}
                onPress={() => selectMode('wind')}
              >
                <Text style={[styles.modeButtonText, mode === 'wind' && styles.modeButtonTextActive]}>
                  🍃 Wind
                </Text>
              </TouchableOpacity>
            </View>

            {/* BPM Slider */}
            <View style={styles.sliderContainer}>
              <Text style={styles.sliderLabel}>70</Text>
              <Slider
                style={styles.slider}
                minimumValue={70}
                maximumValue={80}
                value={bpm}
                onValueChange={(value) => setBpm(Math.round(value))}
                step={1}
                minimumTrackTintColor="#2E7D32"
                maximumTrackTintColor="#ccc"
                disabled={isPlaying}
              />
              <Text style={styles.sliderLabel}>80</Text>
            </View>

            {/* Sensitivity Slider (not wired, just for UI) */}
            {!isPlaying && (
              <View style={styles.sensitivityContainer}>
                <Text style={styles.sensitivityLabel}>Detection Sensitivity</Text>
                <View style={styles.sliderContainer}>
                  <Text style={styles.sliderLabel}>Low</Text>
                  <Slider
                    style={styles.slider}
                    minimumValue={0}
                    maximumValue={1}
                    value={sensitivity}
                    onValueChange={setSensitivity}
                    step={0.1}
                    minimumTrackTintColor="#FF9800"
                    maximumTrackTintColor="#ccc"
                  />
                  <Text style={styles.sliderLabel}>High</Text>
                </View>
              </View>
            )}
          </View>

          {/* Control buttons row */}
          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={[styles.playButton, isPlaying && styles.stopButton]}
              onPress={toggle}
            >
              <Text style={styles.playButtonText}>
                {isPlaying ? "⏹ STOP" : "▶️ START"}
              </Text>
            </TouchableOpacity>

            {!isPlaying && (
              <>
                <TouchableOpacity
                  style={styles.calibrateButton}
                  onPress={() => {/* Not wired */}}
                >
                  <Text style={styles.calibrateButtonText}>🎯 Calibrate</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.calibrateButton}
                  onPress={() => {/* Not wired */}}
                >
                  <Text style={styles.calibrateButtonText}>🔍 Debug OFF</Text>
                </TouchableOpacity>
              </>
            )}
          </View>

          {/* Feedback container */}
          <View style={styles.feedbackContainer}>
            <View style={styles.statusRow}>
              <Text style={styles.statusText}>
                {isPlaying ? "🎯 Playing..." : "✅ Ready"}
              </Text>
            </View>

            <View style={styles.modeInfoContainer}>
              <Text style={styles.modeInfoText}>
                {mode === 'tones' && '🎵 Musical tones for rhythm training'}
                {mode === 'beats' && '🥁 Traditional metronome beats'}
                {mode === 'wind' && '🍃 Nature sounds for relaxation'}
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  safeContainer: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 15,
    paddingTop: 5,
  },
  header: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
  },
  logoContainer: {
    width: 150,
    height: 60,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  golfBallContainer: {
    position: 'absolute',
    top: screenHeight * 0.15,
    left: screenWidth * 0.5 - 48,
    width: 96,
    height: 96,
    zIndex: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bpmControlsContainer: {
    position: 'absolute',
    left: 20,
    top: screenHeight * 0.35,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    zIndex: 10,
  },
  bpmButton: {
    width: 40,
    height: 40,
    backgroundColor: '#2E7D32',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 5,
  },
  bpmButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  bpmDisplay: {
    alignItems: 'center',
    marginVertical: 10,
  },
  bpmValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  bpmLabel: {
    fontSize: 14,
    color: '#666',
  },
  metronomeArea: {
    marginTop: screenHeight * 0.1,
    width: '100%',
    padding: 10,
    alignItems: 'center',
  },
  modeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 15,
    borderRadius: 15,
  },
  modeButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeButtonActive: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  modeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  modeButtonTextActive: {
    color: 'white',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 10,
    borderRadius: 10,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#666',
    minWidth: 25,
  },
  slider: {
    flex: 1,
    height: 40,
    marginHorizontal: 10,
  },
  sensitivityContainer: {
    width: '100%',
    marginTop: 15,
  },
  sensitivityLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
    textAlign: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 15,
    marginTop: 10,
  },
  playButton: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 35,
    paddingVertical: 12,
    borderRadius: 25,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
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
  calibrateButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
  },
  calibrateButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  feedbackContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
    minHeight: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 15,
    padding: 15,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  statusText: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
  },
  modeInfoContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    width: '100%',
  },
  modeInfoText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
  timerBarPlaceholder: {
    position: 'absolute',
    top: screenHeight * 0.05,
    left: 0,
    right: 0,
    height: 80,
    zIndex: 15,
    // Uncomment below to see the placeholder area during development
    // backgroundColor: 'rgba(255, 255, 255, 0.1)',
    // borderWidth: 1,
    // borderColor: 'rgba(255, 255, 255, 0.3)',
    // borderStyle: 'dashed',
  },
});