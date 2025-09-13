import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, SafeAreaView, ImageBackground, Image, Dimensions } from 'react-native';
import Slider from '@react-native-community/slider';
import { usePuttIQDetector } from '../hooks/usePuttIQDetector'; // Using the new detector hook
import TimingZoneBar from '../components/TimingZoneBar';
import SteppedGolfBall from '../components/SteppedGolfBall';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function HomeScreen({ user }) {
  const [isPremium, setIsPremium] = useState(user?.isPremium || false);
  const [sensitivity, setSensitivity] = useState(0.5);
  
  const {
    isInitialized,
    isRunning,
    permissionGranted,
    aecActive,
    bpm,
    lastHit,
    detectorStats,
    beatPosition,
    hitHistory,
    debugMode,
    updateBpm,
    updateSensitivity,
    getTimingAccuracy,
    resetCalibration,
    toggleDebugMode,
    start,
    stop,
  } = usePuttIQDetector(user?.settings?.defaultBPM || 30) || {};

  // Update sensitivity when slider changes
  useEffect(() => {
    if (updateSensitivity) {
      updateSensitivity(sensitivity);
    }
  }, [sensitivity, updateSensitivity]);

  const toggle = () => {
    if (isRunning) {
      stop();
    } else {
      start();
    }
  };

  // Calculate timing accuracy
  const timingInfo = getTimingAccuracy ? getTimingAccuracy() : null;

  // Get quality color based on hit quality
  const getQualityColor = (quality) => {
    switch (quality) {
      case 'strong': return '#2E7D32';
      case 'medium': return '#FFA726';
      case 'weak': return '#EF5350';
      default: return '#888';
    }
  };

  // Get timing color based on accuracy
  const getTimingColor = (accuracy) => {
    if (!accuracy) return '#888';
    if (accuracy > 0.8) return '#2E7D32'; // Great
    if (accuracy > 0.5) return '#FFA726'; // Good
    return '#EF5350'; // Needs work
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

        {/* Golf ball in center with color transitions */}
        <View style={styles.golfBallContainer}>
          <SteppedGolfBall
            size={96}
            beatPosition={beatPosition}
            isHit={lastHit !== null && Date.now() - lastHit.timestamp < 500}
            hitQuality={lastHit?.quality}
          />
        </View>

        {/* BPM Controls on left side */}
        <View style={styles.bpmControlsContainer}>
          <TouchableOpacity 
            style={styles.bpmButton} 
            onPress={() => updateBpm(Math.max(30, bpm - 1))}
            disabled={isRunning}
          >
            <Text style={styles.bpmButtonText}>-</Text>
          </TouchableOpacity>
          <View style={styles.bpmDisplay}>
            <Text style={styles.bpmValue}>{bpm}</Text>
            <Text style={styles.bpmLabel}>BPM</Text>
          </View>
          <TouchableOpacity 
            style={styles.bpmButton} 
            onPress={() => updateBpm(Math.min(60, bpm + 1))}
            disabled={isRunning}
          >
            <Text style={styles.bpmButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metronomeArea}>
          <View style={styles.sliderContainer}>
            <Text style={styles.sliderLabel}>30</Text>
            <Slider
              style={styles.slider}
              minimumValue={30}
              maximumValue={60}
              value={bpm}
              onValueChange={updateBpm}
              step={1}
              minimumTrackTintColor="#2E7D32"
              maximumTrackTintColor="#ccc"
              disabled={isRunning}
            />
            <Text style={styles.sliderLabel}>60</Text>
          </View>

          {!isRunning && (
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

        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.playButton, isRunning && styles.stopButton, !isInitialized && styles.disabledButton]}
            onPress={toggle}
            disabled={!isInitialized}
          >
            <Text style={styles.playButtonText}>
              {isRunning ? "⏹ STOP" : "▶️ START"}
            </Text>
          </TouchableOpacity>

          {!isRunning && isInitialized && (
            <>
              <TouchableOpacity
                style={styles.calibrateButton}
                onPress={resetCalibration}
              >
                <Text style={styles.calibrateButtonText}>🎯 Calibrate</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.calibrateButton, debugMode && styles.debugActive]}
                onPress={toggleDebugMode}
              >
                <Text style={styles.calibrateButtonText}>
                  {debugMode ? '🔍 Debug ON' : '🔍 Debug OFF'}
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Visual timing bar with listening zone */}
        {isRunning && (
          <TimingZoneBar
            isPlaying={isRunning}
            bpm={bpm}
            currentPosition={beatPosition}
            listeningZone={{ start: 0.2, end: 0.8 }}
            lastHitPosition={lastHit?.positionInBeat}
            hitHistory={hitHistory}
            style={styles.timingBar}
          />
        )}

        <View style={styles.feedbackContainer}>
          <View style={styles.statusRow}>
            <Text style={[styles.statusText, !isInitialized && styles.statusWarning]}>
              {!isInitialized ? "⏳ Initializing..." : 
               !permissionGranted ? "🎤 Microphone permission needed" : 
               isRunning ? "🎯 Listening for impacts..." : "✅ Ready"}
            </Text>
            {isRunning && aecActive && (
              <Text style={styles.aecIndicator}>🔊 AEC</Text>
            )}
          </View>

          {lastHit && isRunning && (
            <View style={[styles.hitFeedback, { borderColor: getQualityColor(lastHit.quality) }]}>
              <View style={styles.hitHeader}>
                <Text style={[styles.hitTiming, { color: getQualityColor(lastHit.quality) }]}>
                  Impact Detected!
                </Text>
                <Text style={[styles.qualityBadge, { backgroundColor: getQualityColor(lastHit.quality) }]}>
                  {lastHit.quality?.toUpperCase()}
                </Text>
              </View>

              {timingInfo && (
                <View style={styles.timingRow}>
                  <Text style={[styles.timingText, { color: getTimingColor(timingInfo.accuracy) }]}>
                    {timingInfo.isEarly ? '⏪ Early' : timingInfo.isLate ? 'Late ⏩' : 'Perfect!'} 
                  </Text>
                  <Text style={styles.timingValue}>
                    {Math.abs(timingInfo.timingDiff).toFixed(0)}ms
                  </Text>
                  <Text style={[styles.accuracyText, { color: getTimingColor(timingInfo.accuracy) }]}>
                    {(timingInfo.accuracy * 100).toFixed(0)}%
                  </Text>
                </View>
              )}

              <View style={styles.hitDetails}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Energy</Text>
                  <Text style={styles.detailValue}>{lastHit.energy.toFixed(4)}</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Confidence</Text>
                  <Text style={styles.detailValue}>{(lastHit.confidence * 100).toFixed(0)}%</Text>
                </View>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>ZCR</Text>
                  <Text style={styles.detailValue}>{lastHit.zcr.toFixed(3)}</Text>
                </View>
              </View>
            </View>
          )}

          {detectorStats && isRunning && (
            <View style={styles.statsContainer}>
              <Text style={styles.statsTitle}>Session Stats</Text>
              <View style={styles.statsRow}>
                <Text style={styles.statsLabel}>Hits: {detectorStats.detectionsFound}</Text>
                <Text style={styles.statsLabel}>Frames: {detectorStats.framesProcessed}</Text>
                <Text style={styles.statsLabel}>Baseline: {detectorStats.currentBaseline.toFixed(6)}</Text>
              </View>
            </View>
          )}
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
  disabledButton: {
    backgroundColor: '#ccc',
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
  statusWarning: {
    color: '#FF9800',
  },
  aecIndicator: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  hitFeedback: {
    marginTop: 15,
    width: '100%',
    backgroundColor: '#F5F5F5',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#2E7D32',
  },
  hitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  hitTiming: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  qualityBadge: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  timingRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
    marginBottom: 10,
  },
  timingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  timingValue: {
    fontSize: 14,
    color: '#666',
  },
  accuracyText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  hitDetails: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  detailItem: {
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 11,
    color: '#888',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    color: '#333',
    fontWeight: '500',
  },
  statsContainer: {
    marginTop: 15,
    padding: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    width: '100%',
  },
  statsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 5,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statsLabel: {
    fontSize: 11,
    color: '#888',
  },
  timingBar: {
    marginVertical: 10,
    marginHorizontal: 5,
  },
  debugActive: {
    backgroundColor: '#FF9800',
  },
});
