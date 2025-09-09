/**
 * Simple fallback detector that doesn't require audio streaming
 * This is a placeholder that allows the app to run without crashing
 */
export class PutterDetectorSimple {
  constructor(options = {}) {
    this.opts = {
      onStrike: () => {},
      getUpcomingTicks: () => [],
      ...options
    };
    
    this.isRunning = false;
    this.frameCount = 0;
    this.detectionCount = 0;
    this.baseline = 1e-6;
    
    console.log('Using PutterDetectorSimple (fallback mode - no real detection)');
  }

  async start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('PutterDetectorSimple started (simulation mode)');
    
    // Simulate some hits for testing UI
    this.simulationInterval = setInterval(() => {
      if (!this.isRunning) return;
      
      this.frameCount += 16; // Simulate processing frames
      
      // Randomly generate a hit every 3-5 seconds
      if (Math.random() < 0.05) {
        this.detectionCount++;
        const now = performance.now();
        
        // Check if not near a metronome tick
        const ticks = this.opts.getUpcomingTicks();
        let nearTick = false;
        for (const tick of ticks) {
          if (Math.abs(now - tick) <= 50) {
            nearTick = true;
            break;
          }
        }
        
        if (!nearTick) {
          // Simulate a hit
          this.opts.onStrike({
            timestamp: now,
            energy: 0.001 + Math.random() * 0.01,
            latencyMs: 16,
            zcr: 0.2 + Math.random() * 0.2,
            confidence: 0.5 + Math.random() * 0.5,
            quality: Math.random() > 0.5 ? 'strong' : 'medium'
          });
        }
      }
    }, 100);
  }

  async stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
    
    console.log('PutterDetectorSimple stopped');
  }

  updateParams(params) {
    this.opts = { ...this.opts, ...params };
  }

  getStats() {
    return {
      isRunning: this.isRunning,
      framesProcessed: this.frameCount,
      detectionsFound: this.detectionCount,
      currentBaseline: this.baseline,
      detectionRate: this.frameCount > 0 ? this.detectionCount / this.frameCount : 0
    };
  }

  reset() {
    this.frameCount = 0;
    this.detectionCount = 0;
    this.baseline = 1e-6;
  }
}

export default PutterDetectorSimple;