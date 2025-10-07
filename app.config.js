export default {
  expo: {
    name: "PuttIQ",
    slug: "PuttIQ2",
    version: "1.0.1",
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
      bundleIdentifier: "com.puttiq.app",
      buildNumber: "4",
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
      ],
      "./plugins/withIOSAudioSession",
      "expo-audio"
    ],
    extra: {
      eas: {
        projectId: "dcfe898b-0b08-41b9-9fc6-0f035884bd61"
      }
    }
  }
};