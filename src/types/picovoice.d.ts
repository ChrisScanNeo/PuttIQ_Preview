declare module '@picovoice/react-native-voice-processor' {
  type VoiceProcessor = {
    start: (frameLength: number, sampleRate: number) => Promise<void>;
    stop: () => Promise<void>;
    addFrameListener: (listener: (frame: number[]) => void) => void;
    removeFrameListener: (listener: (frame: number[]) => void) => void;
  };

  const instance: VoiceProcessor;
  export default instance;
}
