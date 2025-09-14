export default {
  expo: {
    name: "PuttIQ",
    slug: "PuttIQ2",
    version: "1.0.0",
    orientation: "landscape",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      requireFullScreen: false,
      orientation: "landscape",
      bundleIdentifier: "com.puttiq.app",
      infoPlist: {
        UIBackgroundModes: ["audio"],
        NSMicrophoneUsageDescription: "PuttIQ needs microphone access to detect the timing of your putting strokes.",
        ITSAppUsesNonExemptEncryption: false
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.puttiq.app",
      edgeToEdgeEnabled: true,
      orientation: "landscape",
      permissions: ["RECORD_AUDIO"]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      [
        "expo-build-properties",
        {
          ios: {
            useFrameworks: "static",
            deploymentTarget: "16.0"
          }
        }
      ]
      // Commented out for Expo Go compatibility:
      // "./plugins/withIOSAudioSession",
      // "expo-dev-client"
    ],
    extra: {
      eas: {
        projectId: "dcfe898b-0b08-41b9-9fc6-0f035884bd61"
      }
    }
  }
};