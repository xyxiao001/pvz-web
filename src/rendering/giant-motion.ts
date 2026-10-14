import { Assets, Container, Rectangle, Sprite, Texture } from 'pixi.js';
import { applyPose, type Pose } from './plant-motion';

export const GIANT_CLIPS = ['gargantuar-walk', 'gargantuar-smash', 'gargantuar-throw', 'gargantuar-die', 'gargantuar-bare-walk', 'gargantuar-bare-smash', 'gargantuar-bare-die'] as const;
export type GiantClip = typeof GIANT_CLIPS[number];
export const hasGiantMotion = (name: string): name is GiantClip => (GIANT_CLIPS as readonly string[]).includes(name);
type Action = 'walk' | 'smash' | 'throw' | 'die';
type Clip = { duration: number; length: number; tracks: { name: string; poses: Pose[] }[] };
export type GiantDefinition = { origin: [number, number]; clips: Record<Action, Clip>; frames: Record<string, [number, number, number, number]> };
type Loaded = { definition: GiantDefinition; textures: Record<string, Texture> };
const action = (name: GiantClip) => name.slice(name.lastIndexOf('-') + 1) as Action;

// Keep the old 10-tick keyframe timestamps, including the last held pose of a one-shot.
export function giantFrame(ticks: number, duration: number, length: number, loop: boolean) {
  const position = loop ? ((ticks % duration + duration) % duration) / (duration / length) : Math.min(Math.max(ticks, 0) / (duration / length), length - 1);
  const frame = Math.floor(position);
  return { frame, next: loop ? (frame + 1) % length : Math.min(frame + 1, length - 1), fraction: position - frame };
}

export class GiantRig {
  readonly root = new Container();
  private parts: Sprite[];
  constructor(private loaded: Loaded) {
    this.root.position.set(...loaded.definition.origin);
    this.parts = Array.from({ length: Math.max(...Object.values(loaded.definition.clips).map(clip => clip.tracks.length)) }, () => {
      const part = new Sprite(); this.root.addChild(part); return part;
    });
  }
  render(name: GiantClip, ticks: number, loop: boolean) {
    const clip = this.loaded.definition.clips[action(name)], bare = name.includes('-bare-');
    const { frame, next, fraction } = giantFrame(ticks, clip.duration, clip.length, loop);
    for (let i = 0; i < this.parts.length; i++) {
      const sprite = this.parts[i];
      if (i >= clip.tracks.length) { sprite.visible = false; continue; }
      const track = clip.tracks[i], a = track.poses[frame], b = track.poses[next];
      sprite.visible = !!a[8] && a[6] >= 0 && a[7] > 0 && !(bare && (track.name.startsWith('Zombie_imp') || track.name.startsWith('Zombie_gargantuar_whiterope')));
      if (!sprite.visible) continue;
      sprite.texture = this.loaded.textures[a[8]];
      sprite.alpha = a[7] + (b[7] - a[7]) * fraction;
      applyPose(sprite, a, b, fraction);
    }
  }
}

export class GiantMotion {
  private loaded?: Loaded;
  private base = `${import.meta.env.BASE_URL}assets/runtime/giant-motion/gargantuar`;
  async prepare(needed: boolean, upload: (texture: Texture) => Promise<void>) {
    if (!needed) { await this.destroy(); return; }
    if (this.loaded) return;
    const [definition, atlas] = await Promise.all([
      fetch(`${this.base}.json`).then(r => r.json()) as Promise<GiantDefinition>,
      Assets.load<Texture>({ src: `${this.base}.webp`, data: { resolution: 2 } }),
    ]);
    await upload(atlas);
    const textures = Object.fromEntries(Object.entries(definition.frames).map(([key, rect]) => [key, new Texture({ source: atlas.source, frame: new Rectangle(...rect) })]));
    this.loaded = { definition, textures };
  }
  create() { return new GiantRig(this.loaded!); }
  duration(name: GiantClip) { return this.loaded!.definition.clips[action(name)].duration; }
  async destroy() {
    if (!this.loaded) return;
    for (const texture of Object.values(this.loaded.textures)) texture.destroy();
    await Assets.unload(`${this.base}.webp`); this.loaded = undefined;
  }
}
