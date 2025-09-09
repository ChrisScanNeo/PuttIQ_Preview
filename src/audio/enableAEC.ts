import { mediaDevices } from '@stream-io/react-native-webrtc';

// Keeping a getUserMedia stream alive with echoCancellation=true engages native AEC/NS.
export async function enableAEC(): Promise<MediaStream | null> {
  try {
    const stream = await mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: false, // we want consistent amplitude
      },
      video: false,
    } as any);
    // We don't need to render or send this stream anywhere; just keep it alive.
    return stream;
  } catch (e) {
    console.warn('AEC enable failed', e);
    return null;
  }
}
