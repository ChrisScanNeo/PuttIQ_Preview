#!/bin/bash

# Android Development Build Script
echo "🔨 Building Android development APK with native modules..."

# Build debug APK
cd android
./gradlew assembleDebug

# Copy APK to easy location
cp app/build/outputs/apk/debug/app-debug.apk ../puttiq-debug.apk

echo "✅ Build complete!"
echo "📱 Install APK with: adb install ../puttiq-debug.apk"
echo "Or transfer puttiq-debug.apk to your device"