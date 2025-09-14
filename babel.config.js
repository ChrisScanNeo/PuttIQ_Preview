module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-worklets/plugin',
      // 'react-native-reanimated/plugin', // This just redirects to worklets/plugin now
    ],
  };
};