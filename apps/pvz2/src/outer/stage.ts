import 'pixi.js/prepare';
import { Application, Container, Sprite, Rectangle } from 'pixi.js';
import { PixiFactory, WorldClock, type PixiArmatureDisplay } from 'pixi-dragonbones-runtime';
import { textureScope } from '../assets/textures';
import { assetUrl, json } from '../assets/load';
import type { Draw } from '../shell/types';
import type { Rig } from '../rendering/battle-art';

/** A feature owns its armatures and texture leases; closing it leaves the map's leases intact. */
export class NativeStage {
  readonly app=new Application();
  readonly root=new Container();
  private textures=textureScope();
  private factory=new PixiFactory(null,false);
  private clock=new WorldClock();
  private loaded=new Map<string,Promise<void>>();
  private displays=new Set<PixiArmatureDisplay>();
  private tweens=new Set<()=>void>();
  private observer!:ResizeObserver;
  constructor(private host:HTMLElement,private groups:Record<string,string>){}
  async init(){
    await this.app.init({width:1024,height:640,resolution:Math.min(devicePixelRatio,2),autoDensity:true,antialias:true,backgroundAlpha:0,autoStart:false});
    this.host.append(this.app.canvas);this.app.stage.addChild(this.root);this.app.stage.eventMode='none';
    this.observer=new ResizeObserver(()=>{const scale=this.host.clientWidth/1024;this.root.scale.set(scale);this.app.renderer.resize(this.host.clientWidth,640*scale);this.app.render();});this.observer.observe(this.host);
    this.app.ticker.add(t=>{this.clock.advanceTime(Math.min(t.deltaMS/1000,.05));PixiFactory.advanceTime(0);});this.app.start();
  }
  async load(spec:Rig){
    if(!this.loaded.has(spec.rig))this.loaded.set(spec.rig,(async()=>{
      const base=spec.group==='actors'?`actors/${spec.rig}/`:`${this.groups[spec.rig]??spec.group}/rigs/${spec.rig}/`;
      const [skeleton,atlas,texture]=await Promise.all([json<object>(base+'skeleton.json'),json<object>(base+'atlas.json'),this.textures.load(assetUrl(base+'texture.webp'))]);
      this.factory.parseDragonBonesData(skeleton,spec.rig);this.factory.parseTextureAtlasData(atlas,texture,spec.rig);await this.app.renderer.prepare.upload(texture);
    })());
    await this.loaded.get(spec.rig);
  }
  rig(spec:Rig,animation=spec.animation,loops=0){
    const display=this.factory.buildArmatureDisplay(spec.armature,spec.rig)!;
    display.armature.clock=this.clock;if(animation)display.animation.play(animation,loops);display.armature.advanceTime(.001);this.displays.add(display);return display;
  }
  remove(display:PixiArmatureDisplay){display.removeFromParent();display.dispose();this.displays.delete(display);}
  clear(){for(const tick of this.tweens)this.app.ticker.remove(tick);this.tweens.clear();for(const display of this.displays)display.dispose();this.displays.clear();for(const child of this.root.removeChildren())child.destroy({children:true});PixiFactory.advanceTime(0);}
  async draw(draws:Draw[]){
    for(const draw of draws){
      let child:Container;
      if(draw.kind==='rig'){const spec={rig:draw.rig!,armature:draw.armature!,animation:draw.animation!,group:'outer'};await this.load(spec);child=this.rig(spec);}
      else if(draw.kind==='sprite'){const sprite=new Sprite(await this.textures.load(assetUrl(draw.image!)));sprite.anchor.set(draw.ax!,draw.ay!);sprite.width=draw.w!;sprite.height=draw.h!;child=sprite;}
      else continue;
      child.position.set(512+draw.x,320+draw.y);child.scale.set(draw.sx,draw.sy);child.rotation=draw.rotation;this.root.addChild(child);
    }
  }
  grow(rig:PixiArmatureDisplay,from:number,to:number){
    let elapsed=0;rig.scale.set(from);
    const tick=()=>{elapsed=Math.min(.7,elapsed+this.app.ticker.deltaMS/1000);const t=elapsed/.7,c=1.70158*1.525;const eased=t<.5?Math.pow(2*t,2)*((c+1)*2*t-c)/2:(Math.pow(2*t-2,2)*((c+1)*(2*t-2)+c)+2)/2;rig.scale.set(from+(to-from)*eased);if(elapsed===.7){this.app.ticker.remove(tick);this.tweens.delete(tick);}};this.tweens.add(tick);this.app.ticker.add(tick);
  }
  capture(specs:Rig[],frame?:Rectangle){
    const root=new Container(),rigs=specs.map(s=>this.rig(s));root.addChild(...rigs);
    const image=(this.app.renderer.extract.canvas({target:root,resolution:1.5,frame}) as HTMLCanvasElement).toDataURL('image/webp');
    rigs.forEach(r=>this.remove(r));root.destroy({children:true});return image;
  }
  async dispose(){this.observer.disconnect();this.app.stop();this.clear();this.clock.clear();this.factory.clear(false);PixiFactory.advanceTime(0);this.app.destroy({removeView:true,releaseGlobalResources:false},{children:true,texture:false,textureSource:false});await this.textures.dispose();}
}
export const CARD_RIG='91731241-49e8-4db3-bb69-f04d4f4762d6';
export const cardSpec=(armature:string,animation:string):Rig=>({rig:CARD_RIG,armature,animation,group:'shell'});
export function plantCard(stage:NativeStage,card:string,world:string){return stage.capture([cardSpec('background',world),cardSpec('plants',card),cardSpec('upper_dots','dotsNoPrice')],new Rectangle(-119,-75,238,150));}
