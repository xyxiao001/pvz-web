import test from 'node:test';
import assert from 'node:assert/strict';
import { Texture, TextureSource, Rectangle } from 'pixi.js';
import { readTextureQuality, saveTextureQuality, texturePath, textureResolution } from '../src/assets/quality';
import manifest from '../src/assets/quality-manifest.json';

test('new profiles keep the existing art and a chosen pack persists across reads', () => {
  const values = new Map<string, string>();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
  assert.equal(readTextureQuality(storage), 'light');
  assert.equal(values.size, 0);
  for (const quality of ['original', 'enhanced', 'light'] as const) {
    saveTextureQuality(storage, quality);
    assert.equal(readTextureQuality(storage), quality);
  }
});

test('each pack uses distinct texture URLs while animation, sound and UI stay shared', () => {
  for (const path of ['actors/peashooter/texture.webp', 'actors/sunflower/texture.webp', 'eighties/rigs/560fd5a4-3031-4953-86f4-1b961d1c0f6b/texture.webp', 'egypt/lawn.webp']) {
    const urls = new Set(['light', 'original', 'enhanced'].map(quality => texturePath(path, quality as 'light' | 'original' | 'enhanced')));
    assert.equal(urls.size, 3, path);
    assert.equal(texturePath(path, 'light'), path);
  }
  for (const path of ['actors/peashooter/atlas.json', 'actors/peashooter/skeleton.json', 'shell/map-font.woff2', 'shell/cursor.png', 'levels/properties.json', 'music.ogg']) {
    for (const quality of ['light', 'original', 'enhanced'] as const) assert.equal(texturePath(path, quality), path);
  }
  assert.throws(() => texturePath('new-world/texture.webp', 'enhanced'), 'an unexported alternate must not silently load the light texture');
});

test('two-times textures retain DragonBones atlas coordinates and sprite dimensions', () => {
  const frame = new Rectangle(76, 253, 85, 77);
  const original = new Texture({ source: new TextureSource({ resource: { width: 512, height: 512 }, resolution: 1 }), frame });
  const enhanced = new Texture({ source: new TextureSource({ resource: { width: 1024, height: 1024 }, resolution: 2 }), frame });
  assert.equal(enhanced.width, original.width);
  assert.equal(enhanced.height, original.height);
  assert.equal(enhanced.source.width, original.source.width);
  assert.equal(enhanced.source.pixelWidth, original.source.pixelWidth * 2);
  assert.deepEqual(enhanced.uvs, original.uvs);
  original.destroy(true); enhanced.destroy(true);
});

test('the selected texture URL supplies the corresponding pixel density', () => {
  for (const [light, variants] of Object.entries(manifest)) {
    assert.equal(textureResolution('/pvz2/assets/' + light), 1);
    assert.equal(textureResolution('/pvz2/assets/' + variants.original), 1);
    assert.equal(textureResolution('/pvz2/assets/' + variants.enhanced), 2);
  }
});
