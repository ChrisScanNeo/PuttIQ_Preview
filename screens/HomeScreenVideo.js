import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, ImageBackground, Image, Dimensions } from 'react-native';
import Slider from '@react-native-community/slider';
import VideoTimerBar from '../components/VideoTimerBar';
import SteppedGolfBall from '../components/SteppedGolfBall';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function HomeScreenVideo({ user }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(70);
  const [mode, setMode] = useState('tones'); // tones, beats, or wind

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

          {/* Video Timer Bar Overlay */}
          <VideoTimerBar
            isPlaying={isPlaying}
            mode={mode}
            bpm={bpm}
          />

          {/* Golf ball in center */}
          <View style={styles.golfBallContainer}>
            <SteppedGolfBall
              size={96}
              beatPosition={0}
              isHit={false}
              hitQuality={null}
            />
          </View>

          {/* Mode Selector - Top Left */}
          <View style={styles.modeContainer}>
            <Text style={styles.modeLabel}>Sound Mode:</Text>
            <View style={styles.modeButtons}>
              <TouchableOpacity
                style={[styles.modeButton, mode === 'tones' && styles.modeButtonActive]}
                onPress={() => selectMode('tones')}
              >
                <Text style={[styles.modeButtonText, mode === 'tones' && styles.modeButtonTextActive]}>
                  Tones
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeButton, mode === 'beats' && styles.modeButtonActive]}
                onPress={() => selectMode('beats')}
              >
                <Text style={[styles.modeButtonText, mode === 'beats' && styles.modeButtonTextActive]}>
                  Beats
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeButton, mode === 'wind' && styles.modeButtonActive]}
                onPress={() => selectMode('wind')}
              >
                <Text style={[styles.modeButtonText, mode === 'wind' && styles.modeButtonTextActive]}>
                  Wind
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* BPM Controls on left side */}
          <View style={styles.bpmControlsContainer}>
            <Text style={styles.bpmText}>{bpm} BPM</Text>
            <Slider
              style={styles.slider}
              minimumValue={70}
              maximumValue={80}
              value={bpm}
              onValueChange={(value) => {
                setBpm(Math.round(value));
                setIsPlaying(false); // Stop playback when changing BPM
              }}
              minimumTrackTintColor="#2E7D32"
              maximumTrackTintColor="#888"
              thumbTintColor="#2E7D32"
              step={1}
            />
            <View style={styles.bpmLabels}>
              <Text style={styles.bpmLabel}>70</Text>
              <Text style={styles.bpmLabel}>80</Text>
            </View>
          </View>

          {/* Play/Stop button */}
          <View style={styles.controlsContainer}>
            <TouchableOpacity
              style={[styles.button, isPlaying && styles.stopButton]}
              onPress={toggle}
            >
              <Text style={styles.buttonText}>
                {isPlaying ? 'STOP' : 'START'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Info Text */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              {mode === 'tones' && 'Tones Mode: Musical tones for rhythm training'}
              {mode === 'beats' && 'Beats Mode: Traditional metronome beats'}
              {mode === 'wind' && 'Wind Mode: Nature sounds for relaxation'}
            </Text>
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
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 50,
    minHeight: screenHeight,
  },
  header: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 100,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  golfBallContainer: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -48 }, { translateY: -48 }],
    zIndex: 20,
  },
  modeContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    zIndex: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modeLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  modeButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  modeButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  modeButtonActive: {
    backgroundColor: '#2E7D32',
    borderColor: '#2E7D32',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  modeButtonTextActive: {
    color: 'white',
  },
  bpmControlsContainer: {
    position: 'absolute',
    left: 20,
    top: '50%',
    transform: [{ translateY: -50 }],
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 15,
    padding: 20,
    width: 200,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 30,
  },
  bpmText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#333',
    marginBottom: 10,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  bpmLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  bpmLabel: {
    fontSize: 12,
    color: '#666',
  },
  controlsContainer: {
    position: 'absolute',
    bottom: 40,
    alignItems: 'center',
    zIndex: 100,
  },
  button: {
    backgroundColor: '#2E7D32',
    paddingHorizontal: 50,
    paddingVertical: 20,
    borderRadius: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  stopButton: {
    backgroundColor: '#D32F2F',
  },
  buttonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  infoContainer: {
    position: 'absolute',
    bottom: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
    zIndex: 90,
  },
  infoText: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
  },
});