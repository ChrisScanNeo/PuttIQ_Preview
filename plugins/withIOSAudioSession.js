const { withInfoPlist, withAppDelegate, IOSConfig } = require('@expo/config-plugins');

function withIOSAudioSession(config) {
  // Add background audio capability (already in app.json but ensuring it's there)
  config = withInfoPlist(config, (config) => {
    const backgroundModes = config.modResults.UIBackgroundModes || [];
    if (!backgroundModes.includes('audio')) {
      backgroundModes.push('audio');
    }
    config.modResults.UIBackgroundModes = backgroundModes;
    
    // Add microphone usage description
    config.modResults.NSMicrophoneUsageDescription = 
      config.modResults.NSMicrophoneUsageDescription || 
      'This app needs microphone access to detect putting timing.';
    
    return config;
  });

  // Configure audio session in AppDelegate
  config = withAppDelegate(config, (config) => {
    const contents = config.modResults.contents;
    
    // Add AVFoundation import if not present
    if (!contents.includes('#import <AVFoundation/AVFoundation.h>')) {
      config.modResults.contents = contents.replace(
        '#import "AppDelegate.h"',
        '#import "AppDelegate.h"\n#import <AVFoundation/AVFoundation.h>'
      );
    }
    
    // Audio session configuration code
    const audioSessionCode = `
  // Configure audio session for simultaneous playback and recording with speaker output
  AVAudioSession *audioSession = [AVAudioSession sharedInstance];
  NSError *error = nil;
  
  // Set category to PlayAndRecord with DefaultToSpeaker to force loudspeaker output
  [audioSession setCategory:AVAudioSessionCategoryPlayAndRecord
                withOptions:AVAudioSessionCategoryOptionDefaultToSpeaker |
                           AVAudioSessionCategoryOptionAllowBluetooth |
                           AVAudioSessionCategoryOptionMixWithOthers
                      error:&error];
  
  // Set mode to Default (or VoiceChat for echo cancellation if needed)
  [audioSession setMode:AVAudioSessionModeDefault error:&error];
  
  // Activate the audio session
  [audioSession setActive:YES error:&error];
  
  if (error) {
    NSLog(@"PuttIQ Audio Session Configuration Error: %@", error.localizedDescription);
  } else {
    NSLog(@"PuttIQ Audio Session configured successfully for simultaneous playback and recording");
  }`;
    
    // Find the didFinishLaunchingWithOptions method and insert our code
    const didFinishPattern = /application didFinishLaunchingWithOptions[\s\S]*?\{([\s\S]*?)return YES/;
    const match = contents.match(didFinishPattern);
    
    if (match && !contents.includes('PuttIQ Audio Session')) {
      // Insert our audio configuration before "return YES"
      config.modResults.contents = contents.replace(
        match[0],
        match[0].replace('return YES', audioSessionCode + '\n\n  return YES')
      );
    }
    
    return config;
  });
  
  return config;
}

module.exports = withIOSAudioSession;