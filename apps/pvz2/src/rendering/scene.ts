import 'pixi.js/prepare';
import { BattleArt } from './battle-art';
import { animationTimeline, type Skeleton } from './presentation';
import { Application, Assets, Container, Graphics, Sprite, Texture, type Ticker } from 'pixi.js';
import { EventObject, PixiFactory, WorldClock, type PixiArmatureDisplay } from 'pixi-dragonbones-runtime';
import { assetUrl, json, loadInBatches } from '../assets/load';
import { BOARD, cellX, rowY, type AnimationTiming, type PlantKind } from '../game/level';
import type { DeathCause, Game, Plant, Zombie, ZombieDeath } from '../game/model';

type RigName = PlantKind | 'mummy' | 'ra';
const RIGS: Record<RigName, { armature: string; idle: string; scale: number }> = {
  peashooter: { armature: 'Peashooter', idle: 'Idle', scale: .56 },
  sunflower: { armature: 'Sunflower', idle: 'Idle', scale: .55 },
  wallnut: { armature: 'Wall-nut', idle: 'Idle1', scale: .55 },
  potatomine: { armature: 'PotatoMine', idle: 'Idle_Baby', scale: .58 },
  mummy: { armature: 'EgyptBasicZombie', idle: 'Walk', scale: .51 },
  ra: { armature: 'RaZombie', idle: 'Walk', scale: .51 },
};
interface Actor { root: Container; rig: PixiArmatureDisplay; kind: RigName; animation: string; actionAt: number; armor?: PixiArmatureDisplay; armLost: boolean; death?: {cause:DeathCause|'plant';elapsed:number;fadeAt:number;fallAt:number} }
interface Fragment {rig:PixiArmatureDisplay;x:number;y:number;ground:number;vx:number;vy:number;spin:number;age:number;landed:number}

export class Scene {
  readonly app = new Application();
  readonly art = new BattleArt();
  private clock = new WorldClock();
  private npcs = new Map<string,PixiArmatureDisplay>();
  private objects = new Map<string, PixiArmatureDisplay>();
  timing!: AnimationTiming;
  onTick: (dt: number) => void = () => {};
  onPoint: (x: number, y: number) => void = () => {};
  onHover: (x: number, y: number) => void = () => {};
  private factory = new PixiFactory(null, false);
  private actors = new Map<number, Actor>();
  private world = new Container();
  private actorLayer = new Container();
  private particles = new Map<number,PixiArmatureDisplay>();
  private seenEffects = new Set<number>();
  private seenDeaths = new Set<number>();
  private fragments: Fragment[] = [];
  private sunFlights: {rig:PixiArmatureDisplay;x:number;y:number;age:number}[] = [];
  private skeletons = new Map<RigName,Skeleton>();
  private cameraX = 0;
  onSound: (name:string)=>void = () => {};
  onNPCEvent: (character:string,event:string)=>void = () => {};
  private npcTransition: 'enter'|'exit'|null = null;
  private highlight = new Graphics();
  private observer!: ResizeObserver;
  private scale = 1;
  private tick = (ticker: Ticker) => this.onTick(ticker.deltaMS / 1000);

  async init(host: HTMLElement, progress: (done: number, total: number) => void) {
    await this.app.init({ width: BOARD.width, height: BOARD.height, background: '#b5924c', antialias: true,
      resolution: Math.min(window.devicePixelRatio, 2), autoDensity: true, autoStart: false });
    host.append(this.app.canvas);
    this.app.canvas.setAttribute('aria-label', '神秘埃及战场，五行九列。选择植物后点击地块种植。');
    this.app.stage.eventMode = 'none';
    this.app.stage.addChild(this.world);
    const lawn = new Sprite(await Assets.load<Texture>(assetUrl('egypt/lawn.webp')));
    lawn.position.set(-340, -40); this.world.addChild(lawn, this.highlight, this.actorLayer);
    this.actorLayer.sortableChildren = true;
    const artCount=await this.art.init(this.app,(done,total)=>progress(done+1,total+7));
    let done = artCount+1; const total=artCount+7;
    const skeletons = new Map<RigName, Skeleton>();
    await loadInBatches(Object.keys(RIGS) as RigName[], 2, async name => {
      const [skeleton, atlas, texture] = await Promise.all([
        json<Skeleton>(`actors/${name}/skeleton.json`), json<object>(`actors/${name}/atlas.json`),
        Assets.load<Texture>(assetUrl(`actors/${name}/texture.webp`)),
      ]);
      this.factory.parseDragonBonesData(skeleton, name);
      this.factory.parseTextureAtlasData(atlas, texture, name);
      await this.app.renderer.prepare.upload(texture);
      skeletons.set(name, skeleton); progress(++done, total);
    });
    this.skeletons=skeletons;
    const shoot=animationTimeline(skeletons.get('peashooter')!,'Peashooter','Shoot'),produce=animationTimeline(skeletons.get('sunflower')!,'Sunflower','Produce');
    const grow=animationTimeline(skeletons.get('potatomine')!,'PotatoMine','Grow'),mine=animationTimeline(skeletons.get('potatomine')!,'PotatoMine','Charging');
    this.timing = { shoot:shoot.events.Shoot,shootDuration:shoot.duration,produce:produce.events.Produce,produceDuration:produce.duration,mineGrow:grow.events.activate,mineExplode:mine.events.explode,mineDeath:mine.events.die,
      raStart:animationTimeline(skeletons.get('ra')!,'RaZombie','AbsorbStart').duration,raEnd:animationTimeline(skeletons.get('ra')!,'RaZombie','AbsorbEnd').duration };
    this.observer = new ResizeObserver(() => {
      this.scale = host.clientWidth / BOARD.width;
      this.app.renderer.resize(host.clientWidth, host.clientWidth * BOARD.height / BOARD.width);
      this.world.scale.set(this.scale);
      this.world.x=-this.cameraX*this.scale;
      this.render();
    });
    this.observer.observe(host);
    const point = (e: PointerEvent) => { const r = this.app.canvas.getBoundingClientRect(); return [(e.clientX - r.left) / this.scale, (e.clientY - r.top) / this.scale] as const; };
    this.app.canvas.addEventListener('pointerdown', e => { e.preventDefault(); this.onPoint(...point(e)); });
    this.app.canvas.addEventListener('pointermove', e => this.onHover(...point(e)));
    this.app.canvas.addEventListener('pointerleave', () => this.highlight.clear());
    this.app.ticker.add(this.tick);
    this.render();
  }

  private rig(name: RigName, armature = RIGS[name].armature) {
    const rig = this.factory.buildArmatureDisplay(armature, name)!;
    rig.armature.clock = this.clock; return rig;
  }

  portrait(kind: PlantKind): string {
    const rig = this.rig(kind);
    rig.animation.play(kind === 'potatomine' ? 'Idle' : RIGS[kind].idle, 0);
    rig.armature.advanceTime(.01);
    const canvas = this.app.renderer.extract.canvas({ target: rig, resolution: 1 });
    const url = (canvas as HTMLCanvasElement).toDataURL('image/webp');
    rig.dispose(); PixiFactory.advanceTime(0);
    return url;
  }

  highlightCell(row: number, column: number, color: number) {
    this.highlight.clear();
    if (row >= 0 && row < 5 && column >= 0 && column < 9) this.highlight.rect(BOARD.left + column * BOARD.cellWidth, BOARD.top + row * BOARD.cellHeight,
      BOARD.cellWidth, BOARD.cellHeight).fill({ color, alpha: .22 }).stroke({ color, alpha: .6, width: 2 });
  }

  private addActor(id: number, name: RigName, flag = false) {
    const root = new Container();
    const shade = new Graphics().ellipse(0, 2, name === 'mummy' || name === 'ra' ? 23 : 25, 8).fill({ color: '#302d20', alpha: .2 });
    const rig = this.rig(name, flag ? 'EgyptFlagZombie' : RIGS[name].armature); rig.scale.set(RIGS[name].scale);
    root.addChild(shade, rig); this.actorLayer.addChild(root);
    const actor: Actor = { root, rig, kind:name, animation: '', actionAt: -1, armLost:false };
    this.actors.set(id, actor); return actor;
  }

  private animate(actor: Actor, name: string, actionAt = 0, times = 0) {
    if (actor.animation === name && actor.actionAt === actionAt) return;
    actor.rig.animation.play(name, times); actor.animation = name; actor.actionAt = actionAt;
  }

  private plantAnimation(plant: Plant, game: Game) {
    if (plant.action === 'food') return 'Food';
    if (plant.action === 'shoot') return 'Shoot';
    if (plant.action === 'produce') return 'Produce';
    if (plant.action === 'grow') return 'Grow';
    if (plant.action === 'explode') return 'Charging';
    if (plant.kind === 'wallnut') return plant.armor > 0 ? 'Idle4' : plant.hp < 1333 ? 'Idle3' : plant.hp < 2666 ? 'Idle2' : 'Idle1';
    if (plant.kind === 'potatomine') return plant.age<14/30?'Spawn_Baby':plant.age < game.props.plants.potatomine.ChargeTime ? 'Idle_Baby' : 'Idle';
    return 'Idle';
  }

  sync(game: Game, dt: number) {
    const alive = new Set<number>();
    for (const p of game.plants) {
      alive.add(p.id);
      const actor = this.actors.get(p.id) ?? this.addActor(p.id, p.kind);
      actor.root.position.set(cellX(p.column), rowY(p.row)); actor.root.zIndex = rowY(p.row);
      const animation = this.plantAnimation(p, game);
      this.animate(actor, animation, p.action === 'idle' ? 0 : p.actionAt, ['shoot','produce','grow','explode'].includes(p.action)||animation==='Spawn_Baby'?1:0);
    }
    for (const z of game.zombies) {
      alive.add(z.id);
      const actor = this.actors.get(z.id) ?? this.addActor(z.id, z.kind === 'ra' ? 'ra' : 'mummy', z.kind === 'mummy_flag');
      actor.root.position.set(z.x, rowY(z.row)); actor.root.zIndex = rowY(z.row) + 1;
      const absorbAnimation={idle:'Walk',start:'AbsorbStart',loop:'Absorbing',end:'AbsorbEnd'}[z.absorbState];
      this.animate(actor,z.kind==='ra'&&z.absorbState!=='idle'?absorbAnimation:z.eating?'Eat':'Walk',0,z.absorbState==='start'||z.absorbState==='end'?1:0);
      if(!actor.armLost&&z.hp<=game.props.zombies[z.kind].Toughness*this.art.catalog.presentation.armDropHealthFraction){actor.armLost=true;this.dropFragment(actor,'arm');this.onSound('zombieLimbPop');}
      if (z.armor > 0 && !actor.armor) {
        actor.armor = this.rig('mummy', 'Cone'); actor.armor.scale.set(.51); actor.root.addChild(actor.armor);
      }
      if (actor.armor) {
        if(actor.armor.visible&&z.armor<=0){this.dropFragment(actor,'Cone');this.onSound('zombieLimbPop');}
        actor.armor.visible = z.armor > 0;
        const animation = z.armor > 246 ? 'Broken0' : z.armor > 123 ? 'Broken1' : 'Broken2';
        if (actor.armor.animation.lastAnimationName !== animation) actor.armor.animation.play(animation, 0);
      }
    }
    for(const death of game.deaths)if(!this.seenDeaths.has(death.zombie.id)){this.seenDeaths.add(death.zombie.id);this.killZombie(death);}
    for (const [id, actor] of this.actors) if (!alive.has(id)&&!actor.death&&actor.kind!=='mummy'&&actor.kind!=='ra') {
      if(actor.animation==='Charging'||game.effects.some(effect=>effect.kind==='remove'&&effect.x===actor.root.x&&effect.y===actor.root.y)){this.removeActor(id,actor);continue;}
      const animation=actor.kind==='wallnut'?actor.animation.replace('Idle','Death'):actor.kind==='potatomine'?'Death_Baby':'Death';
      const timeline=animationTimeline(this.skeletons.get(actor.kind)!,RIGS[actor.kind].armature,animation);
      this.animate(actor,animation,0,1);actor.death={cause:'plant',elapsed:0,fadeAt:timeline.duration,fallAt:Infinity};
    }
    this.clock.advanceTime(dt); this.art.clock.advanceTime(dt); PixiFactory.advanceTime(0);
    this.updateDeaths(dt);
    for (const actor of this.actors.values()) if (actor.armor?.visible) {
      const bone = actor.rig.armature.getBone('armorSOCKET')!;
      bone.updateGlobalTransform();
      actor.armor.position.set(bone.global.x * .51, bone.global.y * .51);
      actor.armor.rotation = bone.global.rotation;
    }
    this.drawObjects(game);
    this.updateParticles();
    this.updateSunFlights(dt);
  }

  absorptionTarget(zombie: Zombie) {
    // EgyptRaZOMBIE's absorber is attached to the animated rays bone at the staff tip.
    const actor=this.actors.get(zombie.id)!;
    const bone=actor.rig.armature.getBone('rays')!;
    bone.updateGlobalTransform();
    return {x:zombie.x+bone.global.x*actor.rig.scale.x,y:rowY(zombie.row)+bone.global.y*actor.rig.scale.y};
  }

  private removeActor(id:number,actor:Actor) {
    actor.rig.removeFromParent();actor.rig.dispose();actor.armor?.removeFromParent();actor.armor?.dispose();actor.root.destroy({children:true});this.actors.delete(id);
  }
  private dropFragment(actor:Actor,part:'head'|'arm'|'Cone') {
    const rig=this.rig(actor.kind,part);rig.scale.set(RIGS[actor.kind].scale);
    rig.animation.play(part==='Cone'?actor.armor!.animation.lastAnimationName!:part==='arm'?'newAnimation':'Idle',0);
    const bone=actor.rig.armature.getBone(part==='head'?'head':part==='arm'?'arm_here':'armorSOCKET')!;
    bone.updateGlobalTransform();
    const x=actor.root.x+bone.global.x*actor.rig.scale.x,y=actor.root.y+bone.global.y*actor.rig.scale.y;
    rig.position.set(x,y);rig.zIndex=actor.root.zIndex+1;this.actorLayer.addChild(rig);
    this.fragments.push({rig,x,y,ground:actor.root.y,vx:(5-10*Math.random())*.55*60,vy:-15*.55*60,spin:(Math.random()<.5?-1:1)*(2*Math.random()+1),age:0,landed:0});
  }
  private killZombie(death:ZombieDeath) {
    const z=death.zombie;
    const actor=this.actors.get(z.id)??this.addActor(z.id,z.kind==='ra'?'ra':'mummy',z.kind==='mummy_flag');
    actor.root.position.set(z.x,rowY(z.row));actor.root.zIndex=rowY(z.row)+1;
    this.dropFragment(actor,'head');this.onSound('zombieLimbPop');
    if(actor.armor?.visible){this.dropFragment(actor,'Cone');actor.armor.visible=false;}
    if(death.cause==='potato'){this.removeActor(z.id,actor);return;}
    const timeline=animationTimeline(this.skeletons.get(actor.kind)!,actor.rig.armature.name,'Death');
    this.animate(actor,'Death',0,1);
    actor.death={cause:death.cause,elapsed:0,fadeAt:timeline.events.die,fallAt:timeline.events.fall};
  }
  private updateDeaths(dt:number) {
    for(const [id,actor] of this.actors) {
      const death=actor.death;
      if(death){
        const before=death.elapsed;death.elapsed+=dt;
        if(death.cause==='mower') {
          const t=Math.min(1,death.elapsed/this.art.catalog.presentation.mowerDeathDuration);
          actor.root.scale.y=1-.99*t*t;actor.rig.rotation=Math.PI/2*(1-(1-t)*(1-t));
          actor.rig.scale.y=RIGS[actor.kind].scale*(1+.5*(1-(1-t)*(1-t)));
          if(t===1){this.removeActor(id,actor);continue;}
        } else {
          if(before<death.fallAt&&death.elapsed>=death.fallAt)this.onSound('zombieLie');
          if(death.elapsed>=death.fadeAt)actor.root.alpha=Math.max(0,1-(death.elapsed-death.fadeAt)/this.art.catalog.presentation.corpseFadeDuration);
          if(actor.root.alpha===0){this.removeActor(id,actor);continue;}
        }
      }
      // The original BodyGrouper controls these slots independently of animation poses.
      for(const slot of actor.rig.armature.getSlots()) {
        if(death&&death.cause!=='plant'&&slot.name.endsWith('_HEAD'))slot.displayIndex=-1;
        if(actor.armLost&&slot.name.endsWith('_HAND'))slot.displayIndex=-1;
        if(actor.armLost&&slot.name.endsWith('_ARM'))slot.displayIndex=0;
      }
    }
    for(const fragment of this.fragments) {
      fragment.age+=dt;
      if(!fragment.landed){fragment.x+=fragment.vx*dt;fragment.vy+=.6666*3600*dt;fragment.y+=fragment.vy*dt;fragment.rig.rotation+=fragment.spin*dt;
        if(fragment.y>=fragment.ground){fragment.y=fragment.ground;fragment.landed=fragment.age;}}
      else fragment.rig.alpha=Math.max(0,1-(fragment.age-fragment.landed)/.5);
      fragment.rig.position.set(fragment.x,fragment.y);
    }
    this.fragments=this.fragments.filter(fragment=>{if(fragment.rig.alpha>0)return true;fragment.rig.removeFromParent();fragment.rig.dispose();return false;});
  }
  get hasDeathAnimations(){return [...this.actors.values()].some(actor=>actor.death)||this.fragments.length>0;}
  private updateParticles() {
    for(const [id,rig] of this.particles)if(rig.animation.isCompleted){rig.removeFromParent();rig.dispose();this.particles.delete(id);}
  }
  private updateSunFlights(dt:number) {
    for(const flight of this.sunFlights){flight.age+=dt;const t=Math.min(1,flight.age),p=1-(1-t)*(1-t);
      flight.rig.position.set(flight.x+(42-flight.x)*p,flight.y+(42-flight.y)*p);
      if(flight.age>1)flight.rig.scale.set(.5*Math.max(0,1-Math.pow((flight.age-1)/.2,2)));
    }
    this.sunFlights=this.sunFlights.filter(flight=>{if(flight.age<1.2)return true;flight.rig.removeFromParent();flight.rig.dispose();return false;});
  }

  private drawObjects(game: Game) {
    const alive = new Set<string>();
    const object = (key: string, name: string, animation: string, x: number, y: number, scale: number,armature?:string) => {
      alive.add(key);
      let rig = this.objects.get(key);
      if (!rig) { rig = this.art.build(name,animation,armature); this.objects.set(key,rig); this.actorLayer.addChild(rig); }
      if (rig.animation.lastAnimationName !== animation) rig.animation.play(animation,0);
      rig.position.set(x,y); rig.scale.set(scale); rig.zIndex = name === 'sun' ? 1000 : y;
      return rig;
    };
    for (const mower of game.mowers) if (!mower.spent) object(`mower-${mower.row}`,'mower',mower.active?'Attack':'Idle',mower.x,rowY(mower.row),.5);
    for (const sun of game.suns) {
      const key=`sun-${sun.id}`,previous=this.objects.get(key)?.animation.lastAnimationName;
      const animation=sun.absorber===null?(previous==='Red'||previous==='N-R'?'R-N':previous==='R-N'&&!this.objects.get(key)!.animation.isCompleted?'R-N':'Normal'):(previous==='Normal'?'N-R':previous==='N-R'&&!this.objects.get(key)!.animation.isCompleted?'N-R':'Red');
      const rig=object(key,'sun',animation,sun.x,sun.y,.5);rig.alpha=Math.max(0,1-Math.max(0,sun.groundAge-7)/.5);
      if(animation==='N-R'||animation==='R-N')rig.animation.lastAnimationState!.playTimes=1;
    }
    for(const pea of game.peas)object(`pea-${pea.id}`,'pea','Idle',pea.x,pea.y,.5,pea.powered?'pea_g':'pea0');
    for (const [key,rig] of this.objects) if (!alive.has(key)) { rig.removeFromParent(); rig.dispose(); this.objects.delete(key); }
    for (const effect of game.effects) if(!this.seenEffects.has(effect.id)) {
      this.seenEffects.add(effect.id);
      if(effect.kind==='collect'){
        const rig=this.art.build('sun','Normal');rig.position.set(effect.x,effect.y);rig.scale.set(.5);rig.zIndex=1000;this.actorLayer.addChild(rig);
        this.sunFlights.push({rig,x:effect.x,y:effect.y,age:0});continue;
      }
      const name=effect.kind==='explode'?'spudow':effect.kind==='hit'?'peaHit':'plantDirt';
      const animation=effect.kind==='explode'?'Explode':effect.kind==='hit'?['Play','Play1','Play2'][effect.id%3]:effect.kind==='food'?'Start':effect.kind==='remove'?'Remove':'Plant';
      const rig=this.art.build(name,animation,effect.kind==='food'?'plant_food_light':undefined);
      rig.animation.play(animation,1);rig.position.set(effect.x,effect.y);rig.scale.set(.5);rig.zIndex=effect.y+2;
      this.actorLayer.addChild(rig);this.particles.set(effect.id,rig);
      if(effect.kind==='hit')this.onSound('peaHit');
    }
  }

  enterNarrative() {
    this.reset();this.setCamera(this.art.catalog.presentation.camera.PanStartOffset);this.npcTransition='enter';
    for(const [name,x,y] of [['crazydave',175,628],['winnie',990,618]] as const) {
      const rig=this.art.build(name,'Enter');rig.animation.play('Enter',1);rig.position.set(x+this.cameraX,y);rig.scale.set(.47);
      rig.addDBEventListener(EventObject.FRAME_EVENT,event=>this.onNPCEvent(name,event.name),this);
      this.actorLayer.addChild(rig);this.npcs.set(name,rig);
    }
    this.onSound('crazydave/Enter');this.start();
  }
  narrative(character: string, animation: string) {
    for(const [name,rig] of this.npcs) {
      rig.animation.play(name===character?animation:'Idle',name===character?1:0);
    }
    this.render();this.start();
  }
  exitNarrative() {
    this.npcTransition='exit';for(const rig of this.npcs.values())rig.animation.play('Exit',1);
    this.onSound('crazydave/Exit');
  }
  narrativeTick(dt: number) {
    this.art.clock.advanceTime(dt); PixiFactory.advanceTime(0);
    if(this.npcTransition){
      if([...this.npcs.values()].every(rig=>rig.animation.isCompleted)) {
        const transition=this.npcTransition;this.npcTransition=null;
        if(transition==='exit'){for(const rig of this.npcs.values()){rig.removeFromParent();rig.dispose();}this.npcs.clear();}
        else for(const rig of this.npcs.values())rig.animation.play('Idle',0);
        return true;
      }
    }else for(const rig of this.npcs.values()) if(rig.animation.isCompleted)rig.animation.play('Idle',0);
    return false;
  }
  preview() {
    this.reset();
    for (const [index,kind] of ['mummy','ra','mummy'].entries()) {
      const actor = this.addActor(-index-1,kind as RigName);
      actor.root.position.set(1280 + index % 2 * 70,300 + index * 110);
      if(index===2){actor.armor=this.rig('mummy','Cone');actor.armor.scale.set(.51);actor.armor.animation.play('Broken0',0);actor.root.addChild(actor.armor);}
      this.animate(actor,'Idle');
      actor.rig.armature.advanceTime(.01);
    }
    this.setCamera(this.art.catalog.presentation.camera.PanStartOffset);
    this.render();
  }
  previewTick(dt: number) {
    this.clock.advanceTime(dt);
    for(const actor of this.actors.values())if(actor.armor){const bone=actor.rig.armature.getBone('armorSOCKET')!;bone.updateGlobalTransform();actor.armor.position.set(bone.global.x*.51,bone.global.y*.51);actor.armor.rotation=bone.global.rotation;}
  }
  setCamera(x:number){this.cameraX=x;this.world.x=-x*this.scale;}
  render() { this.app.render(); }
  start() { this.app.start(); }
  stop() { this.app.stop(); }
  reset() {
    this.stop();
    for (const [id,actor] of this.actors)this.removeActor(id,actor);
    for (const rig of this.objects.values()) {rig.removeFromParent();rig.dispose();} this.objects.clear();
    for(const rig of this.npcs.values()){rig.removeFromParent();rig.dispose();}this.npcs.clear();
    for(const rig of this.particles.values()){rig.removeFromParent();rig.dispose();}this.particles.clear();
    for(const fragment of this.fragments){fragment.rig.removeFromParent();fragment.rig.dispose();}this.fragments=[];
    for(const flight of this.sunFlights){flight.rig.removeFromParent();flight.rig.dispose();}this.sunFlights=[];
    this.seenDeaths.clear();this.seenEffects.clear();this.npcTransition=null;
    this.actors.clear(); this.highlight.clear(); PixiFactory.advanceTime(0);
  }
}
