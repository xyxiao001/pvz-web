import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import original from '../public/assets/original/animations.json';
import hd from '../public/assets/hd/original/animations.json';
import manifest from '../public/assets/hd/manifest.json';

const pngSize = (path: string) => {
  const data = readFileSync(new URL(`../public/assets/${path}`, import.meta.url));
  assert.equal(data.toString('hex', 0, 8), '89504e470d0a1a0a');
  return [data.readUInt32BE(16), data.readUInt32BE(20)];
};

test('2x art retains every animation frame, duration, anchor and logical crop offset', () => {
  assert.deepEqual(Object.keys(hd.animations), Object.keys(original.animations));
  let frames = 0;
  for (const name of Object.keys(original.animations) as (keyof typeof original.animations)[]) {
    const before = original.animations[name], after = hd.animations[name];
    assert.deepEqual(after.durations, before.durations, name);
    assert.deepEqual(after.anchor, before.anchor, name);
    assert.deepEqual(after.frames.map(frame => frame.slice(3)), before.frames.map(frame => frame.slice(3)), name);
    frames += after.frames.length;
  }
  assert.equal(frames, 2425); assert.equal(manifest.frames, frames);
});

test('all static art is exactly 2x with unchanged aspect ratio', () => {
  for (const [path, source] of Object.entries(manifest.staticSources)) {
    assert.deepEqual(pngSize(`hd/${path}`), source.size.map(n => n * 2), path);
  }
  assert.equal(Object.keys(manifest.staticSources).length, 73);
});

test('logical frame rectangles fit 2x atlas pixels without overlapping distinct poses', () => {
  const pages = Array.from({ length: hd.pages }, (_, i) => pngSize(`hd/original/actors-${i}.png`));
  const unique = new Map<string, number[]>();
  for (const clip of Object.values(hd.animations)) for (const frame of clip.frames) {
    const [page, x, y, width, height] = frame;
    assert.ok(x >= 0 && y >= 0 && width > 0 && height > 0);
    assert.ok((x + width) * 2 <= pages[page][0] && (y + height) * 2 <= pages[page][1]);
    unique.set(frame.slice(0, 5).join(','), frame);
  }
  const frames = [...unique.values()];
  for (let i = 0; i < frames.length; i++) for (let j = i + 1; j < frames.length; j++) {
    const [p, x, y, w, h] = frames[i], [q, a, b, c, d] = frames[j];
    assert.ok(p !== q || x + w <= a || a + c <= x || y + h <= b || b + d <= y);
  }
  assert.equal(unique.size, manifest.uniqueFrames);
});

test('HD manifest identifies the exact original animation source used for generation', () => {
  const hash = (path: string) => createHash('sha256').update(readFileSync(new URL(`../public/assets/${path}`, import.meta.url))).digest('hex');
  assert.equal(hash('original/animations.json'), manifest.sourceAnimationSha256);
  for (let i = 0; i < original.pages; i++) assert.equal(hash(`original/actors-${i}.png`), manifest.sourceAtlasSha256[i]);
  assert.equal(manifest.scale, 2); assert.equal(manifest.model, 'realesr-animevideov3-x2');
});
