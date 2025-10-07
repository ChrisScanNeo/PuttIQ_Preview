const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

/**
 * Expo config plugin to fix @cjblack/expo-audio-stream missing Accelerate framework
 * Adds 'import Accelerate' to AudioUtils.swift
 */
module.exports = function withExpoAudioStreamFix(config) {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const audioUtilsPath = path.join(
        config.modRequest.platformProjectRoot,
        '..',
        'node_modules',
        '@cjblack',
        'expo-audio-stream',
        'ios',
        'AudioUtils.swift'
      );

      if (fs.existsSync(audioUtilsPath)) {
        let content = fs.readFileSync(audioUtilsPath, 'utf8');

        // Check if already patched
        if (!content.includes('import Accelerate')) {
          // Add import at the top after Foundation import
          content = content.replace(
            /(import Foundation)/,
            '$1\nimport Accelerate'
          );

          fs.writeFileSync(audioUtilsPath, content, 'utf8');
          console.log('✅ Patched AudioUtils.swift with Accelerate import');
        } else {
          console.log('✅ AudioUtils.swift already patched');
        }
      } else {
        console.warn('⚠️  AudioUtils.swift not found, skipping patch');
      }

      return config;
    },
  ]);
};
