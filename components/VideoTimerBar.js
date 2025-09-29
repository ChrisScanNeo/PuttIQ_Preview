import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import { Video } from 'expo-av';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function VideoTimerBar({
  isPlaying = false,
  mode = 'tones',
  bpm = 70,
  style
}) {
  const videoRef = useRef(null);

  // Construct video path based on mode and BPM
  const getVideoSource = () => {
    // Map mode and BPM to the correct video file
    const videoPath = `../assets/swingBars/${mode}/${mode}_${bpm}.mp4`;

    // Dynamic require based on mode and BPM
    try {
      switch(mode) {
        case 'tones':
          switch(bpm) {
            case 70: return require('../assets/swingBars/tones/tones_70.mp4');
            case 71: return require('../assets/swingBars/tones/tones_71.mp4');
            case 72: return require('../assets/swingBars/tones/tones_72.mp4');
            case 73: return require('../assets/swingBars/tones/tones_73.mp4');
            case 74: return require('../assets/swingBars/tones/tones_74.mp4');
            case 75: return require('../assets/swingBars/tones/tones_75.mp4');
            case 76: return require('../assets/swingBars/tones/tones_76.mp4');
            case 77: return require('../assets/swingBars/tones/tones_77.mp4');
            case 78: return require('../assets/swingBars/tones/tones_78.mp4');
            case 79: return require('../assets/swingBars/tones/tones_79.mp4');
            case 80: return require('../assets/swingBars/tones/tones_80.mp4');
            default: return require('../assets/swingBars/tones/tones_70.mp4');
          }
        case 'beats':
          switch(bpm) {
            case 70: return require('../assets/swingBars/beats/beats_70.mp4');
            case 71: return require('../assets/swingBars/beats/beats_71.mp4');
            case 72: return require('../assets/swingBars/beats/beats_72.mp4');
            case 73: return require('../assets/swingBars/beats/beats_73.mp4');
            case 74: return require('../assets/swingBars/beats/beats_74.mp4');
            case 75: return require('../assets/swingBars/beats/beats_75.mp4');
            case 76: return require('../assets/swingBars/beats/beats_76.mp4');
            case 77: return require('../assets/swingBars/beats/beats_77.mp4');
            case 78: return require('../assets/swingBars/beats/beats_78.mp4');
            case 79: return require('../assets/swingBars/beats/beats_79.mp4');
            case 80: return require('../assets/swingBars/beats/beats_80.mp4');
            default: return require('../assets/swingBars/beats/beats_70.mp4');
          }
        case 'wind':
          switch(bpm) {
            case 70: return require('../assets/swingBars/wind/wind_70.mp4');
            case 71: return require('../assets/swingBars/wind/wind_71.mp4');
            case 72: return require('../assets/swingBars/wind/wind_72.mp4');
            case 73: return require('../assets/swingBars/wind/wind_73.mp4');
            case 74: return require('../assets/swingBars/wind/wind_74.mp4');
            case 75: return require('../assets/swingBars/wind/wind_75.mp4');
            case 76: return require('../assets/swingBars/wind/wind_76.mp4');
            case 77: return require('../assets/swingBars/wind/wind_77.mp4');
            case 78: return require('../assets/swingBars/wind/wind_78.mp4');
            case 79: return require('../assets/swingBars/wind/wind_79.mp4');
            case 80: return require('../assets/swingBars/wind/wind_80.mp4');
            default: return require('../assets/swingBars/wind/wind_70.mp4');
          }
        default:
          return require('../assets/swingBars/tones/tones_70.mp4');
      }
    } catch (error) {
      console.warn(`Video not found for ${mode}_${bpm}, using default`);
      return require('../assets/swingBars/tones/tones_70.mp4');
    }
  };

  // Control playback based on isPlaying prop
  useEffect(() => {
    const controlPlayback = async () => {
      if (videoRef.current) {
        try {
          if (isPlaying) {
            await videoRef.current.playAsync();
          } else {
            await videoRef.current.pauseAsync();
            await videoRef.current.setPositionAsync(0);
          }
        } catch (error) {
          console.error('Error controlling video playback:', error);
        }
      }
    };

    controlPlayback();
  }, [isPlaying]);

  return (
    <View style={[styles.container, style]}>
      <Video
        ref={videoRef}
        style={styles.video}
        source={getVideoSource()}
        resizeMode="contain"
        isLooping={true}
        shouldPlay={false}
        isMuted={false}
        volume={0.7}
        progressUpdateIntervalMillis={50}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: screenWidth,
    height: screenHeight * 0.4,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: '30%',
    left: 0,
    zIndex: 10,
  },
  video: {
    width: '100%',
    height: '100%',
  },
});