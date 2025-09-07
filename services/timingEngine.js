class TimingEngine {
  constructor() {
    this.isRunning = false;
    this.bpm = 80;
    this.startTime = null;
    this.beatCallbacks = [];
    this.positionCallbacks = [];
    this.animationFrameId = null;
    this.lastBeatTime = null;
    this.beatCount = 0;
    this.nextBeatTime = null;
    this.audioCallback = null;
  }

  // Register callbacks
  onBeat(callback) {
    this.beatCallbacks.push(callback);
    return () => {
      this.beatCallbacks = this.beatCallbacks.filter(cb => cb !== callback);
    };
  }

  onPositionUpdate(callback) {
    this.positionCallbacks.push(callback);
    return () => {
      this.positionCallbacks = this.positionCallbacks.filter(cb => cb !== callback);
    };
  }

  setAudioCallback(callback) {
    this.audioCallback = callback;
  }

  // Start the timing engine
  start(bpm = this.bpm) {
    if (this.isRunning) return;

    this.bpm = bpm;
    this.isRunning = true;
    this.startTime = Date.now();
    this.lastBeatTime = this.startTime;
    this.beatCount = 0;
    this.nextBeatTime = this.startTime;

    // Play first beat immediately
    this.triggerBeat();

    // Schedule next beat
    this.scheduleNextBeat();

    // Start animation loop for smooth position updates
    this.startAnimationLoop();
  }

  // Stop the timing engine
  stop() {
    this.isRunning = false;
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.startTime = null;
    this.lastBeatTime = null;
    this.beatCount = 0;
    this.nextBeatTime = null;

    // Notify position callbacks with reset
    this.positionCallbacks.forEach(cb => cb({
      position: 0,
      direction: 'forward',
      beatProgress: 0,
      totalBeats: 0
    }));
  }

  // Update BPM while running
  updateBPM(newBpm) {
    const wasRunning = this.isRunning;
    
    if (wasRunning) {
      // Store current beat position
      const currentPosition = this.getCurrentPosition();
      
      // Update BPM
      this.bpm = newBpm;
      
      // Recalculate next beat time based on new BPM
      const beatInterval = 60000 / this.bpm;
      const timeSinceLastBeat = Date.now() - this.lastBeatTime;
      
      if (timeSinceLastBeat < beatInterval) {
        // Adjust next beat time with new interval
        this.nextBeatTime = this.lastBeatTime + beatInterval;
      } else {
        // We've passed where the beat should be, trigger immediately
        this.nextBeatTime = Date.now();
      }
    } else {
      this.bpm = newBpm;
    }
  }

  // Schedule the next beat with drift compensation
  scheduleNextBeat() {
    if (!this.isRunning) return;

    const beatInterval = 60000 / this.bpm;
    const now = Date.now();

    // Calculate when next beat should occur
    this.nextBeatTime = this.lastBeatTime + beatInterval;

    // If we're behind schedule, trigger immediately
    if (this.nextBeatTime <= now) {
      this.triggerBeat();
      this.scheduleNextBeat();
      return;
    }

    // Schedule next beat check
    const timeUntilNextBeat = this.nextBeatTime - now;
    
    // Use setTimeout for beat scheduling (more accurate than setInterval)
    setTimeout(() => {
      if (this.isRunning) {
        this.triggerBeat();
        this.scheduleNextBeat();
      }
    }, Math.max(0, timeUntilNextBeat));
  }

  // Trigger a beat
  triggerBeat() {
    const now = Date.now();
    
    // Update beat tracking
    this.lastBeatTime = now;
    this.beatCount++;

    // Trigger audio callback
    if (this.audioCallback) {
      this.audioCallback();
    }

    // Notify all beat callbacks
    this.beatCallbacks.forEach(cb => cb({
      beatCount: this.beatCount,
      timestamp: now,
      bpm: this.bpm
    }));
  }

  // Animation loop for smooth position updates
  startAnimationLoop() {
    const animate = () => {
      if (!this.isRunning) return;

      const positionData = this.getCurrentPosition();
      
      // Notify all position callbacks
      this.positionCallbacks.forEach(cb => cb(positionData));

      // Continue animation loop
      this.animationFrameId = requestAnimationFrame(animate);
    };

    animate();
  }

  // Get current position data
  getCurrentPosition() {
    if (!this.isRunning || !this.startTime) {
      return {
        position: 0,
        direction: 'forward',
        beatProgress: 0,
        totalBeats: 0,
        isAtBeat: false
      };
    }

    const now = Date.now();
    const elapsed = now - this.startTime;
    const beatInterval = 60000 / this.bpm;
    
    // Calculate total beats elapsed
    const totalBeats = Math.floor(elapsed / beatInterval);
    
    // Calculate progress within current beat (0 to 1)
    const beatProgress = (elapsed % beatInterval) / beatInterval;
    
    // Determine direction (even beats = forward, odd = backward)
    const isForward = totalBeats % 2 === 0;
    
    // Calculate bidirectional position (0→1→0→1...)
    let position;
    if (isForward) {
      position = beatProgress;
    } else {
      position = 1 - beatProgress;
    }

    // Check if we're at a beat endpoint (within 2% of beat)
    const isAtBeat = beatProgress < 0.02 || beatProgress > 0.98;

    return {
      position, // 0 to 1, represents position on the bar
      direction: isForward ? 'forward' : 'backward',
      beatProgress, // 0 to 1 within current beat
      totalBeats,
      isAtBeat,
      elapsed,
      bpm: this.bpm
    };
  }

  // Get timing info for external use
  getTimingInfo() {
    return {
      isRunning: this.isRunning,
      bpm: this.bpm,
      startTime: this.startTime,
      beatCount: this.beatCount,
      ...this.getCurrentPosition()
    };
  }
}

// Export singleton instance
export default new TimingEngine();