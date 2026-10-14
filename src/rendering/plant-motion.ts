import { Assets, Container, Matrix, Rectangle, Sprite, Texture } from 'pixi.js';
import { loadInBatches } from '../platform/load-queue';

export const MOTION_PLANTS = ['peashooter', 'sunflower', 'threepeater', 'gatlingpea', 'twinsunflower'] as const;
export type MotionPlant = typeof MOTION_PLANTS[number];
export const hasPlantMotion = (name: string): name is MotionPlant => (MOTION_PLANTS as readonly string[]).includes(name);
export type Pose = [number, number, number, number, number, number, number, number, string];
type Group = { length: number; attachment?: Pose[]; tracks: { name: string; poses: Pose[] }[] };
type Definition = { duration: number; origin: [number, number]; groups: Group[]; frames: Record<string, [number, number, number, number]> };
type Loaded = { definition: Definition; textures: Record<string, Texture> };

// Portable Reanimation::GetTransformAtTime interpolates transforms, not whole-frame opacity.
export function poseMatrix(out: Matrix, a: Pose, b: Pose, fraction: number) {
  const lerp = (index: number) => (a[index] as number) + ((b[index] as number) - (a[index] as number)) * fraction;
  const sx = lerp(2), sy = lerp(3), kx = lerp(4) * Math.PI / 180, ky = lerp(5) * Math.PI / 180;
  return out.set(Math.cos(kx) * sx, Math.sin(kx) * sx, -Math.sin(ky) * sy, Math.cos(ky) * sy, lerp(0), lerp(1));
}
export function motionFrame(ticks: number, duration: number, length: number) {
  const position = ((ticks % duration + duration) % duration) / duration * length;
  const frame = Math.floor(position);
  return { frame, next: (frame + 1) % length, fraction: position - frame };
}

export class PlantRig {
  readonly root = new Container();
  private matrix = new Matrix();
  private groups: { definition: Group; root: Container; parts: Sprite[]; baseInverse?: Matrix }[];
  constructor(private loaded: Loaded) {
    this.root.position.set(...loaded.definition.origin);
    this.groups = loaded.definition.groups.map(definition => {
      const root = new Container(); this.root.addChild(root);
      const parts = definition.tracks.map(() => { const sprite = new Sprite(); root.addChild(sprite); return sprite; });
      const baseInverse = definition.attachment ? poseMatrix(new Matrix(), definition.attachment[0], definition.attachment[0], 0).invert() : undefined;
      return { definition, root, parts, baseInverse };
    });
  }
  render(ticks: number) {
    for (const { definition, root, parts, baseInverse } of this.groups) {
      const { frame, next, fraction } = motionFrame(ticks, this.loaded.definition.duration, definition.length);
      if (definition.attachment) {
        // Current attachment transform × inverse bind pose, as GetAttachmentOverlayMatrix.
        const poses = definition.attachment;
        root.setFromMatrix(poseMatrix(this.matrix, poses[frame], poses[next], fraction).append(baseInverse!));
      }
      for (let i = 0; i < parts.length; i++) {
        const sprite = parts[i], poses = definition.tracks[i].poses, a = poses[frame], b = poses[next];
        sprite.visible = !!a[8] && a[6] >= 0 && a[7] > 0;
        if (!sprite.visible) continue;
        sprite.texture = this.loaded.textures[a[8]];
        sprite.alpha = a[7] + (b[7] - a[7]) * fraction;
        sprite.setFromMatrix(poseMatrix(this.matrix, a, b, fraction));
      }
    }
  }
}

export class PlantMotion {
  private loaded = new Map<MotionPlant, Loaded>();
  private base = `${import.meta.env.BASE_URL}assets/runtime/plant-motion/`;
  async prepare(names: MotionPlant[], progress: (done: number, total: number) => void, upload: (texture: Texture) => Promise<void>) {
    for (const name of this.loaded.keys()) if (!names.includes(name)) await this.unload(name);
    const pending = names.filter(name => !this.loaded.has(name)); let done = 0;
    progress(done, pending.length);
    await loadInBatches(pending, 3, async name => {
      const definition = await fetch(`${this.base}${name}.json`).then(r => r.json()) as Definition;
      const atlas = await Assets.load<Texture>({ src: `${this.base}${name}.webp`, data: { resolution: 2 } });
      await upload(atlas);
      const textures = Object.fromEntries(Object.entries(definition.frames).map(([key, rect]) => [key, new Texture({ source: atlas.source, frame: new Rectangle(...rect) })]));
      this.loaded.set(name, { definition, textures }); progress(++done, pending.length);
    });
  }
  create(name: MotionPlant) { return new PlantRig(this.loaded.get(name)!); }
  duration(name: MotionPlant) { return this.loaded.get(name)!.definition.duration; }
  private async unload(name: MotionPlant) {
    for (const texture of Object.values(this.loaded.get(name)!.textures)) texture.destroy();
    await Assets.unload(`${this.base}${name}.webp`); this.loaded.delete(name);
  }
  async destroy() { for (const name of this.loaded.keys()) await this.unload(name); }
}
