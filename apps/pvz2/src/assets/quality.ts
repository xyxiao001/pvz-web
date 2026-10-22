import manifest from './quality-manifest.json';

export type TextureQuality = 'light' | 'original' | 'enhanced';
export const TEXTURE_QUALITY_KEY = 'pvz2:texture-quality';
const packs: Record<string, { original: string; enhanced: string }> = manifest;

export function readTextureQuality(storage: Pick<Storage, 'getItem'>): TextureQuality {
  const saved = storage.getItem(TEXTURE_QUALITY_KEY);
  return saved === null ? 'light' : saved as TextureQuality;
}

export function saveTextureQuality(storage: Pick<Storage, 'setItem'>, quality: TextureQuality) {
  storage.setItem(TEXTURE_QUALITY_KEY, quality);
}

export function texturePath(path: string, quality: TextureQuality): string {
  // Fonts, audio, JSON, menu previews and static interface art are shared.
  const alternate = path.endsWith('/texture.webp') || /\/(?:lawn(?:-night)?|night)\.webp$/.test(path);
  return quality === 'light' || !alternate ? path : packs[path][quality];
}

export function textureResolution(path: string): number {
  return path.includes('/assets/quality/enhanced/') ? 2 : 1;
}
