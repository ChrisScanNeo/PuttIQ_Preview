import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { View, Image, Text, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as ScreenOrientation from 'expo-screen-orientation';
import { Asset } from 'expo-asset';
import { Audio } from 'expo-av';
import Constants from 'expo-constants';
import HomeScreen from './screens/HomeScreen';
import { authenticateUser } from './services/auth';

export default function App() {
  const [user, setUser] = useState(null);
  const [initComplete, setInitComplete] = useState(false);
  const [homeReady, setHomeReady] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeApp = async () => {
      const startTime = Date.now();

      try {
        // Lock orientation to landscape
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);

        // Load critical assets and authenticate user in parallel
        await Promise.all([
          // Authenticate user
          authenticateUser().then(userData => {
            setUser(userData);
          }),

          // Preload critical assets
          Asset.loadAsync([
            require('./assets/grass-background.jpeg'),
            require('./assets/ball/MainBall.png'),
            require('./assets/Logo_NoBackground.jpg'),
            require('./assets/swingBars/ios/tones/Tones_76BPM.mov'),
            require('./assets/swingBars/ios/beats/Beats_76BPM.mov'),
            require('./assets/swingBars/ios/wind/Wind_76BPM.mov'),
            require('./assets/swingBars/ios/detect/Tones_Detect_76BPM.mov'), // Silent detect video
            require('./assets/icons/minus.png'),
            require('./assets/icons/plus.png'),
            require('./assets/icons/musical-note.png'),
            require('./assets/icons/metronome.png'),
            require('./assets/icons/wind.png'),
            require('./assets/icons/lightening.png'), // Listen mode button
          ]),
        ]);

        // Request microphone permission (non-blocking for Listen Mode)
        try {
          const { granted } = await Audio.requestPermissionsAsync();
          if (granted) {
            console.log('Microphone permission granted');
          } else {
            console.log('Microphone permission denied - Listen Mode will request again when activated');
          }
        } catch (permErr) {
          console.warn('Could not request microphone permission:', permErr);
          // Non-critical - user can still use app without Listen Mode
        }

        // Ensure minimum 2.5 seconds loading time
        const elapsedTime = Date.now() - startTime;
        const remainingTime = Math.max(0, 2500 - elapsedTime);

        if (remainingTime > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingTime));
        }

      } catch (err) {
        console.error('Initialization error:', err);
        setError('Failed to initialize app. Please check your connection.');
      } finally {
        setInitComplete(true);
      }
    };

    initializeApp();
  }, []);

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  const showSplash = !initComplete || !homeReady;

  return (
    <SafeAreaProvider>
      <View style={styles.appContainer}>
        {initComplete && (
          <HomeScreen
            user={user}
            onReady={() => setHomeReady(true)}
          />
        )}
        <StatusBar style="auto" />
        {showSplash && (
          <View style={styles.loadingOverlay}>
            <Image
              source={require('./assets/Logo_NoBackground.jpg')}
              style={styles.loadingLogo}
              resizeMode="contain"
            />
            <Text style={styles.versionText}>
              v{Constants.expoConfig?.version || '1.1.1'} (Build {Constants.expoConfig?.ios?.buildNumber || '13'})
            </Text>
          </View>
        )}
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  appContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  loadingLogo: {
    width: '80%',
    height: 200,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    zIndex: 10,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#000',
  },
  errorText: {
    color: '#fff',
    textAlign: 'center',
  },
  versionText: {
    position: 'absolute',
    bottom: 30,
    color: '#666',
    fontSize: 12,
    fontWeight: '500',
  },
});
