export default {
  expo: {
    name: "PuttIQ",
    slug: "PuttIQ2",
    version: "1.1.0",
    orientation: "landscape",
    icon: "./assets/icons/iTunesArtwork@2x.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/Logo_NoBackground.jpg",
      resizeMode: "contain",
      backgroundColor: "#000000"
    },
    ios: {
      supportsTablet: true,
      requireFullScreen: false,
      orientation: "landscape",
      bundleIdentifier: "com.golfingiq.puttiq",
      buildNumber: "12",
      infoPlist: {
        UIBackgroundModes: ["audio"],
        NSMicrophoneUsageDescription: "PuttIQ needs microphone access to detect the timing of your putting strokes.",
        NSCameraUsageDescription: "PuttIQ does not use the camera. This permission is required by a system framework but is never accessed.",
        ITSAppUsesNonExemptEncryption: false
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/Icon_nobackground.jpg",
        backgroundColor: "#000000"
      },
      package: "com.golfingiq.puttiq",
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
      ],
      "./plugins/withIOSAudioSession",
      "expo-audio"
    ],
    extra: {
      eas: {
        projectId: "3be295d8-99c6-44b0-9ffa-c9a96e077e9b"
      }
    }
  }
};
