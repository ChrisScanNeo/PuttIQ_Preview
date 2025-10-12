const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

if (!config.resolver.assetExts.includes('md')) {
  config.resolver.assetExts.push('md');
}

config.resolver.sourceExts = config.resolver.sourceExts.filter(ext => ext !== 'md');

module.exports = config;
