import { Asset } from 'expo-asset';

type ClipInfo = {
  start: number;
  duration: number;
  gain?: number;
  loop?: boolean;
};

type SpriteMap = {
  sampleRate: number;
  clips: Record<string, ClipInfo>;
};

/**
 * Load a sprite (WAV + JSON) and return metadata and URI
 */
export async function loadSprite(name: 'metronome' | 'tones' | 'wind') {
  try {
    // Import both WAV and JSON files
    let wavAsset: Asset;
    let jsonData: SpriteMap;

    switch (name) {
      case 'metronome':
        wavAsset = Asset.fromModule(require('./sprites/metronome.wav'));
        jsonData = require('./sprites/metronome.json');
        break;
      case 'tones':
        wavAsset = Asset.fromModule(require('./sprites/tones.wav'));
        jsonData = require('./sprites/tones.json');
        break;
      case 'wind':
        wavAsset = Asset.fromModule(require('./sprites/wind.wav'));
        jsonData = require('./sprites/wind.json');
        break;
      default:
        throw new Error(`Unknown sprite: ${name}`);
    }

    // Download the WAV asset to get local URI
    await wavAsset.downloadAsync();

    if (!wavAsset.localUri) {
      throw new Error(`Failed to download ${name} sprite`);
    }

    console.log(`Loaded sprite ${name}:`, {
      uri: wavAsset.localUri,
      clips: Object.keys(jsonData.clips).length,
      sampleRate: jsonData.sampleRate
    });

    return {
      uri: wavAsset.localUri,
      map: jsonData.clips,
      sampleRate: jsonData.sampleRate,
      name,
    };
  } catch (error) {
    console.error(`Failed to load sprite ${name}:`, error);
    throw error;
  }
}

/**
 * Preload all sprites for better performance
 */
export async function preloadAllSprites() {
  try {
    const sprites = await Promise.all([
      loadSprite('metronome'),
      loadSprite('tones'),
      loadSprite('wind'),
    ]);

    console.log('All sprites preloaded successfully');
    return sprites;
  } catch (error) {
    console.error('Failed to preload sprites:', error);
    throw error;
  }
}

/**
 * Get clip info from a sprite
 */
export function getClipInfo(sprite: any, clipName: string): ClipInfo | null {
  if (!sprite || !sprite.map || !sprite.map[clipName]) {
    return null;
  }
  return sprite.map[clipName];
}

/**
 * Calculate total duration of a sprite
 */
export function getSpriteDuration(sprite: any): number {
  if (!sprite || !sprite.map) return 0;

  let maxEnd = 0;
  for (const clip of Object.values(sprite.map) as ClipInfo[]) {
    const end = clip.start + clip.duration;
    if (end > maxEnd) maxEnd = end;
  }

  return maxEnd;
}

export default { loadSprite, preloadAllSprites, getClipInfo, getSpriteDuration };