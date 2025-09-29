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
    // For now, only tones_70.mp4 exists, so we'll use it for all modes/BPMs
    // Add more videos to the folders to enable full functionality
    return require('../assets/swingBars/tones/tones_70.mp4');

    // Future implementation when all videos are added:
    // const videoPath = `../assets/swingBars/${mode}/${mode}_${bpm}.mp4`;
    // return require(videoPath);
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
    backgroundColor: 'transparent',
  },
  video: {
    width: '100%',
    height: '100%',
    backgroundColor: 'transparent',
  },
});