import { Assets, Container, Rectangle, Texture, type Application } from 'pixi.js';
import { PixiFactory, WorldClock, type PixiArmatureDisplay } from 'pixi-dragonbones-runtime';
import { assetUrl, json, loadInBatches } from '../assets/load';
import type { PlantKind } from '../game/level';
import type { SpriteArt } from '../shell/types';
import type { CameraIntro } from './presentation';
interface Rig { rig: string; armature: string; animation: string; group?: string }
export interface NarrativeStep { Character: 'crazydave'|'winnie'; Action: string; Lines?: {zh:string;en:string}; Animation?: string; Voice?: string }
export interface BattleCatalog { intro: NarrativeStep[]; sounds: Record<string,string[]>; ui: Record<string, SpriteArt>; rigs: Record<string, Rig>; presentation: {camera:CameraIntro;seedChoosingCameraX:number;corpseFadeDuration:number;mowerDeathDuration:number;armDropHealthFraction:number;readySetPlant:number[]} }

export class BattleArt {
  catalog!: BattleCatalog;
  private factory = new PixiFactory(null, false);
  readonly clock = new WorldClock();
  async init(app: Application, progress: (done:number,total:number)=>void) {
    this.catalog = await json<BattleCatalog>('battle/catalog.json');
    const rigs=[...new Map(Object.values(this.catalog.rigs).map(rig=>[rig.rig,rig])).values()];
    let done=0;progress(done,rigs.length);
    await loadInBatches(rigs, 2, async rig => {
      const base = `${rig.group ?? 'battle'}/rigs/${rig.rig}`;
      const [skeleton, atlas, texture] = await Promise.all([json<object>(`${base}/skeleton.json`), json<object>(`${base}/atlas.json`), Assets.load<Texture>(assetUrl(`${base}/texture.webp`))]);
      this.factory.parseDragonBonesData(skeleton, rig.rig);
      this.factory.parseTextureAtlasData(atlas, texture, rig.rig);
      await app.renderer.prepare.upload(texture);
      progress(++done,rigs.length);
    });
    return rigs.length;
  }
  build(name: string, animation?: string, armature?: string) {
    const spec = this.catalog.rigs[name];
    const rig = this.factory.buildArmatureDisplay(armature ?? spec.armature, spec.rig)!;
    rig.armature.clock = this.clock;
    rig.animation.play(animation ?? spec.animation, 0);
    rig.armature.advanceTime(.001);
    return rig;
  }
  image(app: Application, name: string, animation?: string, armature?: string): string {
    const rig = this.build(name, animation, armature);
    const image = (app.renderer.extract.canvas({target:rig,resolution:1}) as HTMLCanvasElement).toDataURL('image/webp');
    rig.dispose(); return image;
  }
  card(app: Application, kind: PlantKind): string {
    const container = new Container();
    const layers: PixiArmatureDisplay[] = [this.build('cards','frontyard','background'),this.build('cards',kind,'plants'),this.build('cards','dotPrice','upper_dots')];
    container.addChild(...layers);
    const image = (app.renderer.extract.canvas({target:container,resolution:1,frame:new Rectangle(-119,-75,238,150)}) as HTMLCanvasElement).toDataURL('image/webp');
    layers.forEach(r=>r.dispose()); container.destroy({children:true}); return image;
  }
}
