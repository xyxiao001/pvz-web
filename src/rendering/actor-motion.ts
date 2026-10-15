import { Assets, Container, Matrix, Rectangle, Sprite, Texture } from 'pixi.js';
import { loadInBatches } from '../platform/load-queue';
import { applyPose, poseMatrix, type Pose } from './plant-motion';
import { giantFrame } from './giant-motion';
import index from './actor-motion-index.json';

export const ACTOR_MOTION = index as Record<string, string>;
export const hasActorMotion = (clip: string) => Object.hasOwn(ACTOR_MOTION, clip);
type Group = { length: number; tracks: { name: string; poses: Pose[] }[]; attachment?: Pose[] };
export type ActorMotionClip = { duration: number; origin: [number, number]; scale: number; healthTop: number; groups: Group[] };
export type ActorDefinition = { clips: Record<string, ActorMotionClip>; frames: Record<string, [number, number, number, number]> };
type Loaded = { definition: ActorDefinition; textures: Record<string, Texture> };

// One sprite per source image track; never cross-fade entire silhouettes.
// Parts are allocated once per actor, including slots needed by later damage/death states.
export class ActorRig {
  readonly root = new Container();
  private matrix = new Matrix();
  private groups: { root: Container; parts: Sprite[] }[];
  private bound = new Map<Group, Matrix>();
  constructor(readonly family: string, private loaded: Loaded) {
    const clips = Object.values(loaded.definition.clips);
    this.groups = Array.from({ length: Math.max(...clips.map(c => c.groups.length)) }, (_, i) => {
      const root = new Container(); this.root.addChild(root);
      const parts = Array.from({ length: Math.max(...clips.map(c => c.groups[i]?.tracks.length ?? 0)) }, () => {
        const sprite = new Sprite(); root.addChild(sprite); return sprite;
      });
      return { root, parts };
    });
    for (const clip of clips) for (const group of clip.groups) if (group.attachment) {
      this.bound.set(group, poseMatrix(new Matrix(), group.attachment[0], group.attachment[0], 0).invert());
    }
  }
  healthTop(clip: string) { return this.loaded.definition.clips[clip].healthTop; }
  render(name: string, ticks: number, loop: boolean) {
    const clip = this.loaded.definition.clips[name];
    this.root.position.set(...clip.origin); this.root.scale.set(clip.scale);
    for (let g = 0; g < this.groups.length; g++) {
      const { root, parts } = this.groups[g], group = clip.groups[g];
      root.visible = g < clip.groups.length;
      if (!root.visible) continue;
      const { frame, next, fraction } = giantFrame(ticks, clip.duration, group.length, loop);
      if (group.attachment) {
        const a = giantFrame(ticks, clip.duration, group.attachment.length, loop);
        root.setFromMatrix(poseMatrix(this.matrix, group.attachment[a.frame], group.attachment[a.next], a.fraction).append(this.bound.get(group)!));
      } else { root.position.set(0); root.scale.set(1); root.skew.set(0); root.rotation = 0; }
      for (let i = 0; i < parts.length; i++) {
        const sprite = parts[i];
        if (i >= group.tracks.length) { sprite.visible = false; continue; }
        const poses = group.tracks[i].poses, a = poses[frame], b = poses[next];
        sprite.visible = !!a[8] && a[6] >= 0 && a[7] > 0;
        if (!sprite.visible) continue;
        sprite.texture = this.loaded.textures[a[8]];
        sprite.alpha = a[7] + (b[7] - a[7]) * fraction;
        applyPose(sprite, a, b, fraction);
      }
    }
  }
}

export class ActorMotion {
  private loaded = new Map<string, Loaded>();
  private base = `${import.meta.env.BASE_URL}assets/runtime/actor-motion/`;
  async prepare(clips: string[], progress: (done: number, total: number) => void, upload: (texture: Texture) => Promise<void>) {
    const families = new Set(clips.filter(hasActorMotion).map(clip => ACTOR_MOTION[clip]));
    for (const family of this.loaded.keys()) if (!families.has(family)) await this.unload(family);
    const pending = [...families].filter(family => !this.loaded.has(family)); let done = 0;
    progress(done, pending.length);
    await loadInBatches(pending, 3, async family => {
      const [definition, atlas] = await Promise.all([
        fetch(`${this.base}${family}.json`).then(r => r.json()) as Promise<ActorDefinition>,
        Assets.load<Texture>({ src: `${this.base}${family}.webp`, data: { resolution: 2 } }),
      ]);
      await upload(atlas);
      const textures = Object.fromEntries(Object.entries(definition.frames).map(([key, rect]) =>
        [key, new Texture({ source: atlas.source, frame: new Rectangle(...rect) })]));
      this.loaded.set(family, { definition, textures }); progress(++done, pending.length);
    });
  }
  create(clip: string) { const family = ACTOR_MOTION[clip]; return new ActorRig(family, this.loaded.get(family)!); }
  duration(clip: string) { return this.loaded.get(ACTOR_MOTION[clip])!.definition.clips[clip].duration; }
  private async unload(family: string) {
    for (const texture of Object.values(this.loaded.get(family)!.textures)) texture.destroy();
    await Assets.unload(`${this.base}${family}.webp`); this.loaded.delete(family);
  }
  async destroy() { for (const family of this.loaded.keys()) await this.unload(family); }
}
