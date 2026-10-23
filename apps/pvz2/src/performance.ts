import type { Texture } from 'pixi.js';

// Measure rendered frames with wall-clock time, independent of game speed and ticker clamping.
export class FrameRate {
  private startedAt: number | null = null;
  private frames = 0;

  reset() { this.startedAt = null; this.frames = 0; }

  sample(now: number): number | null {
    if (this.startedAt === null) { this.startedAt = now; return null; }
    this.frames++;
    const elapsed = now - this.startedAt;
    if (elapsed < 1000) return null;
    const fps = Math.round(this.frames * 1000 / elapsed);
    this.startedAt = now; this.frames = 0;
    return fps;
  }
}

// The loaded art uses RGBA8: count physical pixels once per shared atlas source.
// This excludes CPU copies, DOM images, render targets, audio and JavaScript memory.
export function estimateTextureBytes(textures: Iterable<Texture>): number {
  const sources = new Set(Array.from(textures, texture => texture.source));
  let bytes = 0;
  for (const source of sources) bytes += source.pixelWidth * source.pixelHeight * 4;
  return bytes;
}
