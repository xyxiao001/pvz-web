import { battleEffects } from './resource-plan';
import type { BattleLevel } from '../game/levels';
import type { ResourceScope } from '../assets/resource-pool';
import { Container, Rectangle, Texture, type Application } from 'pixi.js';
import { PixiFactory, WorldClock, type PixiArmatureDisplay } from 'pixi-dragonbones-runtime';
import { assetUrl, json, loadInBatches } from '../assets/load';
import type { Level, PlantKind } from '../game/level';
import type { SpriteArt } from '../shell/types';
import {seedCardAnimation,type CameraIntro} from './presentation';
export interface Rig { rig: string; armature: string; animation: string; group?: string }
export interface NarrativeStep { Character: 'crazydave'|'winnie'|'zombossicon'; Action: string; Lines?: {zh:string;en:string}; Animation?: string; Voice?: string }
export interface BattleCatalog { intro: NarrativeStep[]; sounds: Record<string,string[]>; ui: Record<string, SpriteArt>; rigs: Record<string, Rig>; presentation: {camera:CameraIntro;seedChoosingCameraX:number;corpseFadeDuration:number;mowerDeathDuration:number;armDropHealthFraction:number;readySetPlant:number[]} }

export interface CampaignCatalog {actors:Record<string,Rig>;rigs:Record<string,Rig>;ui:Record<string,SpriteArt>;sounds:Record<string,string[]>;narratives:Record<string,NarrativeStep[]>}

export class BattleArt {
  campaign!:CampaignCatalog;
  catalog!: BattleCatalog;
  private factory = new PixiFactory(null, false);
  readonly clock = new WorldClock();
  async init(app: Application, progress: (done:number,total:number)=>void,config:BattleLevel,plants:PlantKind[],level:Level,textures:ResourceScope<Texture>) {
    this.catalog = await json<BattleCatalog>('battle/catalog.json');
    if(config.assets==='campaign'){
      this.campaign=await json<CampaignCatalog>('campaign/catalog.json');
      for(const bundle of config.bundles??[]){const extra=await json<CampaignCatalog>(`${bundle}/catalog.json`);this.campaign={actors:{...this.campaign.actors,...extra.actors},rigs:{...this.campaign.rigs,...extra.rigs},ui:{...this.campaign.ui,...extra.ui},sounds:{...this.campaign.sounds,...extra.sounds},narratives:{...this.campaign.narratives,...extra.narratives}};}
      const names=battleEffects(level,plants);
      const rigs=Object.fromEntries(names.map(name=>[name,this.campaign.rigs[name]]));
      this.catalog={...this.catalog,rigs:{...this.catalog.rigs,...rigs},ui:{...this.catalog.ui,...this.campaign.ui},sounds:{...this.catalog.sounds,...this.campaign.sounds}};
    }
    const rigs=[...new Map(Object.values(this.catalog.rigs).map(rig=>[rig.rig,rig])).values()];
    let done=0;progress(done,rigs.length);
    await loadInBatches(rigs, 2, async rig => {
      const base = `${rig.group ?? 'battle'}/rigs/${rig.rig}`;
      const [skeleton, atlas, texture] = await Promise.all([json<object>(`${base}/skeleton.json`), json<object>(`${base}/atlas.json`), textures.load(assetUrl(`${base}/texture.webp`))]);
      this.factory.parseDragonBonesData(skeleton, rig.rig);
      this.factory.parseTextureAtlasData(atlas, texture, rig.rig);
      await app.renderer.prepare.upload(texture);
      progress(++done,rigs.length);
    });
    return rigs.length;
  }
  dispose(){this.clock.clear();this.factory.clear(false);}
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
    const image = (app.renderer.extract.canvas({target:rig,resolution:2}) as HTMLCanvasElement).toDataURL('image/png');
    rig.dispose(); return image;
  }
  card(app: Application, kind: PlantKind): string {
    const container = new Container();
    const layers: PixiArmatureDisplay[] = [this.build('cards',kind==='wasabiwhip'?'epic':['missiletoe','jackolantern','applemortar','electricblueberry','pinkstarfruit','starfruit','electricpeashooter','hurrikale','hypnoshroom','electriccurrant'].includes(kind)?'prenium':['scaredyshroom','sunshroom','puffshroom','fumeshroom'].includes(kind)?'dark':['seashroom','bowlingbulb','banana','guacodile','lilypad','tanglekelp'].includes(kind)?'beach':['redstinger','stallia'].includes(kind)?'lostcity':kind==='shadowshroom'?'modern':kind==='magnetshroom'?'dark':['powerplant','holonut','powerplant_alpha','powerplant_beta','citron','empea','magnifyinggrass','laser_bean','blover'].includes(kind)?'future':['cabbagepult','bloomerang','iceburg','gravebuster','twinsunflower','bonkchoy','repeater'].includes(kind)?'egypt':['kernelpult','snapdragon','coconutcannon','cherry_bomb','spikeweed','spikerock','springbean','threepeater'].includes(kind)?'pirate':['tallnut','splitpea','chilibean','peapod','lightningreed','melonpult','wintermelon'].includes(kind)?'cowboy':'frontyard','background'),this.build('cards',seedCardAnimation(kind),'plants'),this.build('cards','dotPrice','upper_dots')];
    container.addChild(...layers);
    const image = (app.renderer.extract.canvas({target:container,resolution:2,frame:new Rectangle(-119,-75,238,150)}) as HTMLCanvasElement).toDataURL('image/png');
    layers.forEach(r=>r.dispose()); container.destroy({children:true}); return image;
  }
}
