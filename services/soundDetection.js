import { Audio } from 'expo-av';

class SoundDetectionService {
  constructor() {
    this.recording = null;
    this.isListening = false;
    this.hitCallback = null;
    this.volumeUpdateCallback = null;
    this.threshold = -25; // dB threshold for hit detection
    this.analyzerInterval = null;
    this.lastHitTime = 0;
    this.minTimeBetweenHits = 500; // Minimum 500ms between hits to avoid double detection
    this.expectedBeatTimes = []; // Array of expected metronome beat timestamps
    this.beatFilterWindow = 100; // ms window around beat to ignore (50ms before, 50ms after)
    this.bpm = 80;
    this.lastMetronomeStart = null;
  }

  async requestPermissions() {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting audio permissions:', error);
      return false;
    }
  }

  // Set metronome timing info for filtering
  setMetronomeInfo(bpm, startTime) {
    this.bpm = bpm;
    this.lastMetronomeStart = startTime;
    // Pre-calculate expected beat times for the next few seconds
    this.updateExpectedBeatTimes();
  }

  updateExpectedBeatTimes() {
    if (!this.lastMetronomeStart || !this.bpm) return;
    
    const beatInterval = 60000 / this.bpm;
    const now = Date.now();
    const futureBeats = 10; // Calculate next 10 beats
    
    this.expectedBeatTimes = [];
    
    // Calculate elapsed beats since start
    const elapsed = now - this.lastMetronomeStart;
    const elapsedBeats = Math.floor(elapsed / beatInterval);
    
    // Generate array of upcoming beat times
    for (let i = 0; i < futureBeats; i++) {
      const beatTime = this.lastMetronomeStart + ((elapsedBeats + i) * beatInterval);
      if (beatTime > now) {
        this.expectedBeatTimes.push(beatTime);
      }
    }
  }

  // Check if a timestamp is near a metronome beat
  isNearMetronomeBeat(timestamp) {
    // Update expected beats periodically
    if (this.expectedBeatTimes.length < 5) {
      this.updateExpectedBeatTimes();
    }
    
    // Check if timestamp is within filter window of any expected beat
    for (const beatTime of this.expectedBeatTimes) {
      const distance = Math.abs(timestamp - beatTime);
      if (distance < this.beatFilterWindow) {
        // Remove past beats from array
        this.expectedBeatTimes = this.expectedBeatTimes.filter(t => t > timestamp - this.beatFilterWindow);
        return true; // This is likely the metronome sound
      }
    }
    
    return false; // This is likely a real hit
  }

  // Check if timestamp is in a valid hit window (between beats, not during beats)
  isInValidHitWindow(timestamp) {
    if (!this.lastMetronomeStart || !this.bpm) return true; // Allow if no timing info
    
    const beatInterval = 60000 / this.bpm;
    const elapsed = timestamp - this.lastMetronomeStart;
    const positionInBeat = elapsed % beatInterval;
    const beatProgress = positionInBeat / beatInterval;
    
    // Valid hit windows: 20-80% of beat cycle (avoiding the metronome tick at 0% and 100%)
    // This is when the putter would naturally be in motion
    return beatProgress > 0.2 && beatProgress < 0.8;
  }

  async startListening(onHitDetected, onVolumeUpdate = null) {
    try {
      // Request permissions first
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) {
        throw new Error('Microphone permission denied');
      }

      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Store callbacks
      this.hitCallback = onHitDetected;
      this.volumeUpdateCallback = onVolumeUpdate;

      // Create and prepare recording
      const recording = new Audio.Recording();
      
      // Configure recording options for real-time analysis
      const recordingOptions = {
        isMeteringEnabled: true, // Enable metering for volume analysis
        android: {
          extension: '.m4a',
          outputFormat: Audio.AndroidOutputFormat.MPEG_4,
          audioEncoder: Audio.AndroidAudioEncoder.AAC,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        ios: {
          extension: '.m4a',
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
          linearPCMBitDepth: 16,
          linearPCMIsBigEndian: false,
          linearPCMIsFloat: false,
        },
        web: {
          mimeType: 'audio/webm',
          bitsPerSecond: 128000,
        },
      };

      await recording.prepareToRecordAsync(recordingOptions);
      await recording.startAsync();
      
      this.recording = recording;
      this.isListening = true;

      // Start analyzing audio levels
      this.startAnalyzing();

      return true;
    } catch (error) {
      console.error('Error starting sound detection:', error);
      return false;
    }
  }

  startAnalyzing() {
    // Check audio levels every 50ms
    this.analyzerInterval = setInterval(async () => {
      if (!this.recording || !this.isListening) {
        return;
      }

      try {
        const status = await this.recording.getStatusAsync();
        
        if (status.isRecording && status.metering !== undefined) {
          // Convert metering to decibels (metering is typically -160 to 0)
          const currentDb = status.metering;
          
          // Send volume update if callback exists
          if (this.volumeUpdateCallback) {
            this.volumeUpdateCallback(currentDb);
          }
          
          // Check for hit detection
          const now = Date.now();
          if (currentDb > this.threshold && 
              (now - this.lastHitTime) > this.minTimeBetweenHits) {
            
            // Filter out sounds that occur near metronome beats
            if (!this.isNearMetronomeBeat(now) && this.isInValidHitWindow(now)) {
              this.lastHitTime = now;
              
              if (this.hitCallback) {
                this.hitCallback({
                  timestamp: now,
                  volume: currentDb,
                  filtered: false,
                });
              }
            } else if (this.isNearMetronomeBeat(now)) {
              // Optional: Log filtered metronome sounds for debugging
              console.log('Filtered metronome sound at', now);
            }
          }
        }
      } catch (error) {
        console.error('Error analyzing audio:', error);
      }
    }, 50); // Check every 50ms for responsive detection
  }

  async stopListening() {
    try {
      // Clear the analyzer interval
      if (this.analyzerInterval) {
        clearInterval(this.analyzerInterval);
        this.analyzerInterval = null;
      }

      // Stop and unload recording
      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
        this.recording = null;
      }

      this.isListening = false;
      this.hitCallback = null;
      this.volumeUpdateCallback = null;

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      return true;
    } catch (error) {
      console.error('Error stopping sound detection:', error);
      return false;
    }
  }

  setThreshold(newThreshold) {
    // Threshold should be between -60 (very sensitive) and -10 (less sensitive)
    this.threshold = Math.max(-60, Math.min(-10, newThreshold));
  }

  getThreshold() {
    return this.threshold;
  }

  isActive() {
    return this.isListening;
  }
}

export default new SoundDetectionService();