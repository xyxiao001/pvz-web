import 'pixi.js/prepare';
import { BattleArt } from './battle-art';
import { animationTimeline, COMBAT_VIEW, type Skeleton } from './presentation';
import { Application, Assets, Container, Graphics, Sprite, Texture, type Ticker } from 'pixi.js';
import { EventObject, PixiFactory, WorldClock, type PixiArmatureDisplay } from 'pixi-dragonbones-runtime';
import { assetUrl, json, loadInBatches } from '../assets/load';
import { BOARD, cellX, rowY, type AnimationTiming, type PlantKind, type ZombieKind } from '../game/level';
import type { DeathCause, Game, Plant, Zombie, ZombieDeath } from '../game/model';

type RigName = PlantKind | 'mummy' | 'ra' | 'camel';
const RIGS: Record<RigName, { armature: string; idle: string; scale: number }> = {
  peashooter: { armature: 'Peashooter', idle: 'Idle', scale: .56 },
  sunflower: { armature: 'Sunflower', idle: 'Idle', scale: .55 },
  wallnut: { armature: 'Wall-nut', idle: 'Idle1', scale: .55 },
  potatomine: { armature: 'PotatoMine', idle: 'Idle_Baby', scale: .58 },
  cabbagepult:{armature:'Cabbage-Pult',idle:'Idle',scale:.55},
  bloomerang:{armature:'Bloomerang',idle:'Idle',scale:.55},
  iceburg:{armature:'IcebergLettuce',idle:'Idle',scale:.55},
  camel:{armature:'CamelZombie',idle:'Walk',scale:.51},
  mummy: { armature: 'EgyptBasicZombie', idle: 'Walk', scale: .51 },
  ra: { armature: 'RaZombie', idle: 'Walk', scale: .51 },
};
interface Actor { root: Container; rig: PixiArmatureDisplay; kind: RigName; animation: string; actionAt: number; armor?: PixiArmatureDisplay; armLost: boolean; mask?:Graphics;camelFrame?:number; death?: {cause:DeathCause|'plant';elapsed:number;fadeAt:number;fallAt:number} }
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
  onRelease:()=>void=()=>{};
  onHover: (x: number, y: number) => void = () => {};
  private factory = new PixiFactory(null, false);
  private actors = new Map<number, Actor>();
  private world = new Container();
  private conveyorLayer=new Container();
  private actorLayer = new Container();
  private particles = new Map<number,PixiArmatureDisplay>();
  private seenEffects = new Set<number>();
  private seenDeaths = new Set<number>();
  private fragments: Fragment[] = [];
  private sunFlights: {rig:PixiArmatureDisplay;x:number;y:number;age:number}[] = [];
  private skeletons = new Map<RigName,Skeleton>();
  private cameraX = 0;
  private cameraY = 0;
  private cameraZoom = 1;
  onSound: (name:string)=>void = () => {};
  onNPCEvent: (character:string,event:string)=>void = () => {};
  private npcTransition: 'enter'|'exit'|null = null;
  private highlight = new Graphics();
  private observer!: ResizeObserver;
  private scale = 1;
  private tick = (ticker: Ticker) => this.onTick(ticker.deltaMS / 1000);

  async init(host: HTMLElement, progress: (done: number, total: number) => void,day=1,plantActors:PlantKind[]=['peashooter','sunflower','wallnut','potatomine']) {
    await this.app.init({ width: BOARD.width, height: BOARD.height, background: '#b5924c', antialias: true,
      resolution: Math.min(window.devicePixelRatio, 2), autoDensity: true, autoStart: false });
    host.append(this.app.canvas);
    this.app.canvas.setAttribute('aria-label', '神秘埃及战场，五行九列。选择植物后点击地块种植。');
    this.app.stage.eventMode = 'none';
    this.app.stage.addChild(this.world,this.conveyorLayer);
    const lawn = new Sprite(await Assets.load<Texture>(assetUrl(day===4||day===5?'campaign/night.webp':'egypt/lawn.webp')));
    lawn.width=1974;lawn.height=768;
    lawn.position.set(-340, -40); this.world.addChild(lawn, this.highlight, this.actorLayer);
    this.actorLayer.sortableChildren = true;
    const actorNames:RigName[]=[...new Set<RigName>(['peashooter','sunflower','wallnut','potatomine','mummy','ra',...plantActors,...(day===6?['camel' as const]:[])])];
    const artCount=await this.art.init(this.app,(done,total)=>progress(done+1,total+actorNames.length+1),day,plantActors);
    if(day===4){for(const lane of [0,1]){
      const rig=this.art.build('conveyor','Idle'),bounds=rig.getLocalBounds();
      const sx=BOARD.width*.43/bounds.width,sy=BOARD.height*.09/bounds.height;
      rig.scale.set(sx,sy);rig.position.set(BOARD.width*.08-bounds.x*sx,BOARD.height*(.01+lane*.09)-bounds.y*sy);this.conveyorLayer.addChild(rig);
    }this.conveyorLayer.visible=false;}
    let done = artCount+1; const total=artCount+actorNames.length+1;
    const skeletons = new Map<RigName, Skeleton>();
    await loadInBatches(actorNames, 2, async name => {
      const spec=day>1?this.art.campaign.actors[name]:undefined;
      const base=spec?`campaign/rigs/${spec.rig}`:`actors/${name}`;
      const [skeleton, atlas, texture] = await Promise.all([
        json<Skeleton>(`${base}/skeleton.json`), json<object>(`${base}/atlas.json`),
        Assets.load<Texture>(assetUrl(`${base}/texture.webp`)),
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
    if(day>1){
      for(const name of ['cabbagepult','bloomerang','iceburg'] as const)if(!skeletons.has(name))skeletons.set(name,await json<Skeleton>(`campaign/rigs/${this.art.campaign.actors[name].rig}/skeleton.json`));
      const cabbage=animationTimeline(skeletons.get('cabbagepult')!,'Cabbage-Pult','Lob'),boom=animationTimeline(skeletons.get('bloomerang')!,'Bloomerang','Shoot'),ice=animationTimeline(skeletons.get('iceburg')!,'IcebergLettuce','Death');
      this.timing.campaign={cabbage:cabbage.events.Lob,cabbageDuration:cabbage.duration,cabbageFood:animationTimeline(skeletons.get('cabbagepult')!,'Cabbage-Pult','Food').events.lobFood,cabbageFoodEnd:animationTimeline(skeletons.get('cabbagepult')!,'Cabbage-Pult','Food').events.foodEnd,boomerang:boom.events.Shoot,boomerangDuration:boom.duration,boomerangCatch:animationTimeline(skeletons.get('bloomerang')!,'Bloomerang','Catch').duration,ice:ice.events.explode,iceDuration:ice.duration,iceFood:animationTimeline(skeletons.get('iceburg')!,'IcebergLettuce','Food').events.foodExplode/.8,iceFoodEnd:animationTimeline(skeletons.get('iceburg')!,'IcebergLettuce','Food').events.foodEnd/.8};
    }
    this.observer = new ResizeObserver(() => {
      this.scale = host.clientWidth / BOARD.width;
      this.app.renderer.resize(host.clientWidth, host.clientWidth * BOARD.height / BOARD.width);
      this.applyCamera();
      this.render();
    });
    this.observer.observe(host);
    const point = (e: PointerEvent) => { const r = this.app.canvas.getBoundingClientRect(); return [(e.clientX - r.left) / (this.scale*this.cameraZoom)+this.cameraX, (e.clientY - r.top) / (this.scale*this.cameraZoom)+this.cameraY] as const; };
    this.app.canvas.addEventListener('pointerdown', e => { e.preventDefault();this.app.canvas.setPointerCapture(e.pointerId); this.onPoint(...point(e)); });
    this.app.canvas.addEventListener('pointermove', e => this.onHover(...point(e)));
    this.app.canvas.addEventListener('pointerup',()=>this.onRelease());
    this.app.canvas.addEventListener('pointercancel',()=>this.onRelease());
    this.app.canvas.addEventListener('pointerleave', () => {this.highlight.clear();this.onRelease();});
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
    const canvas = this.app.renderer.extract.canvas({ target: rig, resolution: 2 });
    const url = (canvas as HTMLCanvasElement).toDataURL('image/png');
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
    const actor: Actor = { root, rig, kind:name, animation: '', actionAt: -1, armLost:false,camelFrame:name==='camel'?0:undefined };
    const events:Partial<Record<RigName,Record<string,string>>>={cabbagepult:{LobSound:'lobSound'},bloomerang:{ShootSound:'shootSound',catch:'catchSound'},iceburg:{explode:'deadSound',foodExplode:'foodBlastSound'}};
    if(events[name])rig.addDBEventListener(EventObject.FRAME_EVENT,event=>{const key=events[name]![event.name];if(key)this.onSound(name+'/'+key);},this);
    this.actors.set(id, actor); return actor;
  }

  private animate(actor: Actor, name: string, actionAt = 0, times = 0) {
    if (actor.animation === name && actor.actionAt === actionAt) return;
    actor.rig.animation.play(name, times); actor.animation = name; actor.actionAt = actionAt;
  }

  private plantAnimation(plant: Plant, game: Game) {
    if(plant.action==='catch')return 'Catch';
    if (plant.action === 'food') return 'Food';
    if (plant.action === 'shoot') return plant.kind==='cabbagepult'?'Lob':'Shoot';
    if (plant.action === 'produce') return 'Produce';
    if (plant.action === 'grow') return 'Grow';
    if (plant.action === 'explode') return plant.kind==='iceburg'?'Death':'Charging';
    if (plant.kind === 'wallnut') return plant.armor > 0 ? 'Idle4' : plant.hp < 1333 ? 'Idle3' : plant.hp < 2666 ? 'Idle2' : 'Idle1';
    if (plant.kind === 'potatomine') return plant.age<14/30?'Spawn_Baby':plant.age < game.props.plants.potatomine.ChargeTime ? 'Idle_Baby' : 'Idle';
    return 'Idle';
  }

  sync(game: Game, dt: number) {
    this.conveyorLayer.visible=!!game.level.conveyor;
    const alive = new Set<number>();
    for (const p of game.plants) {
      alive.add(p.id);
      const actor = this.actors.get(p.id) ?? this.addActor(p.id, p.kind);
      actor.root.position.set(cellX(p.column), rowY(p.row)); actor.root.zIndex = rowY(p.row);
      actor.rig.animation.timeScale=p.kind==='iceburg'&&p.action==='food'?.8:1;
      const animation = this.plantAnimation(p, game);
      this.animate(actor, animation, p.action === 'idle' ? 0 : p.actionAt, ['shoot','produce','grow','explode','catch'].includes(p.action)||p.action==='food'&&['cabbagepult','iceburg'].includes(p.kind)||animation==='Spawn_Baby'?1:0);
    }
    for (const z of game.zombies) {
      alive.add(z.id);
      let actor=this.actors.get(z.id);
      if(actor?.kind==='camel'&&z.kind!=='camel_onehump'){
        this.actors.delete(z.id);this.actors.set(-100000-z.id,actor);this.animate(actor,'Death',0,1);
        actor.death={cause:'plant',elapsed:0,fadeAt:animationTimeline(this.skeletons.get('camel')!,'CamelZombie','Death').duration,fallAt:Infinity};actor=undefined;
      }
      actor=actor??this.addActor(z.id,z.kind==='camel_onehump'?'camel':z.kind==='ra'?'ra':'mummy',z.kind==='mummy_flag');
      actor.root.position.set(z.x, rowY(z.row)); actor.root.zIndex = rowY(z.row) + 1;
      actor.rig.animation.timeScale=game.time<z.frozenUntil?0:game.time<z.chilledUntil?.5:1;
      actor.rig.tint=game.time<z.frozenUntil||game.time<z.chilledUntil?0x9ce8ff:z.food?0xb0ff83:0xffffff;
      const entering=z.entry!=='walk'&&game.time-z.entryAt<(z.entry==='ground'?1.35:1);
      if(z.entry==='ground'){
        if(entering&&!actor.mask){actor.mask=new Graphics().rect(-130,-250,260,250).fill(0xffffff);actor.root.addChild(actor.mask);actor.root.mask=actor.mask;}
        actor.rig.y=entering?120*Math.pow(1-Math.min(1,(game.time-z.entryAt)),2):0;
        if(!entering&&actor.mask){actor.root.mask=null;actor.mask.destroy();actor.mask=undefined;}
      }
      if(z.leap){const t=Math.min(1,(game.time-z.leap.at)/.5);actor.root.y=z.leap.fromY+(rowY(z.leap.toRow)-z.leap.fromY)*t-90*Math.sin(t*Math.PI);}
      if(z.kind==='camel_onehump')actor.camelFrame=z.camelPart*3+(z.armor<125?2:z.armor<250?1:0);
      const absorbAnimation={idle:'Walk',start:'AbsorbStart',loop:'Absorbing',end:'AbsorbEnd'}[z.absorbState];
      this.animate(actor,entering?'Idle':z.kind==='ra'&&z.absorbState!=='idle'?absorbAnimation:z.eating?'Eat':'Walk',0,z.absorbState==='start'||z.absorbState==='end'?1:0);
      if(z.kind!=='camel_onehump'&&!actor.armLost&&z.hp<=game.props.zombies[z.kind].Toughness*this.art.catalog.presentation.armDropHealthFraction){actor.armLost=true;this.dropFragment(actor,'arm');this.onSound('zombieLimbPop');}
      if (z.kind!=='camel_onehump'&&z.armor > 0 && !actor.armor) {
        actor.armor = this.rig('mummy', z.kind==='mummy_armor2'?'Bucket':'Cone'); actor.armor.scale.set(.51); actor.root.addChild(actor.armor);
      }
      if (actor.armor) {
        if(actor.armor.visible&&z.armor<=0){this.dropFragment(actor,z.kind==='mummy_armor2'?'Bucket':'Cone');this.onSound('zombieLimbPop');}
        actor.armor.visible = z.armor > 0;
        const max=z.kind==='mummy_armor2'?game.props.armors.egypt_armor2.Toughness:game.props.armors.egypt_armor1.Toughness;
        const animation = z.armor > max*2/3 ? 'Broken0' : z.armor > max/3 ? 'Broken1' : 'Broken2';
        if (actor.armor.animation.lastAnimationName !== animation) actor.armor.animation.play(animation, 0);
      }
    }
    for(const death of game.deaths)if(!this.seenDeaths.has(death.zombie.id)){this.seenDeaths.add(death.zombie.id);this.killZombie(death);}
    for (const [id, actor] of this.actors) if (!alive.has(id)&&!actor.death&&actor.kind!=='mummy'&&actor.kind!=='ra'&&actor.kind!=='camel') {
      if(actor.animation==='Charging'||actor.kind==='iceburg'&&actor.animation==='Death'||game.effects.some(effect=>effect.kind==='remove'&&effect.x===actor.root.x&&effect.y===actor.root.y)){this.removeActor(id,actor);continue;}
      const animation=actor.kind==='wallnut'?actor.animation.replace('Idle','Death'):actor.kind==='potatomine'?'Death_Baby':'Death';
      const timeline=animationTimeline(this.skeletons.get(actor.kind)!,RIGS[actor.kind].armature,animation);
      this.animate(actor,animation,0,1);actor.death={cause:'plant',elapsed:0,fadeAt:timeline.duration,fallAt:Infinity};
    }
    this.clock.advanceTime(dt); this.art.clock.advanceTime(dt); PixiFactory.advanceTime(0);
    this.updateDeaths(dt);
    for (const actor of this.actors.values()) if (actor.armor?.visible) {
      const bone = actor.rig.armature.getBone('armorSOCKET')!;
      bone.updateGlobalTransform();
      actor.armor.position.set(actor.rig.x+bone.global.x*.51, actor.rig.y+bone.global.y*.51);
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
  private dropFragment(actor:Actor,part:'head'|'arm'|'Cone'|'Bucket') {
    const rig=this.rig(actor.kind,part);rig.scale.set(RIGS[actor.kind].scale);
    rig.animation.play((part==='Cone'||part==='Bucket')?actor.armor!.animation.lastAnimationName!:part==='arm'?'newAnimation':'Idle',0);
    const bone=actor.rig.armature.getBone(part==='head'?'head':part==='arm'?'arm_here':'armorSOCKET')!;
    bone.updateGlobalTransform();
    const x=actor.root.x+actor.rig.x+bone.global.x*actor.rig.scale.x,y=actor.root.y+actor.rig.y+bone.global.y*actor.rig.scale.y;
    rig.position.set(x,y);rig.zIndex=actor.root.zIndex+1;this.actorLayer.addChild(rig);
    this.fragments.push({rig,x,y,ground:actor.root.y,vx:(5-10*Math.random())*.55*60,vy:-15*.55*60,spin:(Math.random()<.5?-1:1)*(2*Math.random()+1),age:0,landed:0});
  }
  private killZombie(death:ZombieDeath) {
    const z=death.zombie;
    const actor=this.actors.get(z.id)??this.addActor(z.id,z.kind==='camel_onehump'?'camel':z.kind==='ra'?'ra':'mummy',z.kind==='mummy_flag');
    actor.root.position.set(z.x,rowY(z.row));actor.root.zIndex=rowY(z.row)+1;actor.rig.animation.timeScale=1;actor.rig.tint=0xffffff;
    if(actor.mask){actor.root.mask=null;actor.mask.destroy();actor.mask=undefined;actor.rig.y=0;}
    if(actor.kind!=='camel')this.dropFragment(actor,'head');this.onSound('zombieLimbPop');
    if(actor.armor?.visible){this.dropFragment(actor,z.kind==='mummy_armor2'?'Bucket':'Cone');actor.armor.visible=false;}
    if(death.cause==='potato'){this.removeActor(z.id,actor);return;}
    const timeline=animationTimeline(this.skeletons.get(actor.kind)!,actor.rig.armature.name,'Death');
    this.animate(actor,'Death',0,1);
    actor.death={cause:death.cause,elapsed:0,fadeAt:timeline.events.die,fallAt:actor.kind==='camel'?Infinity:timeline.events.fall};
  }
  private updateDeaths(dt:number) {
    for(const [id,actor] of this.actors) {
      const death=actor.death;
      if(death){
        if(death.cause==='toss'){actor.root.x+=dt*500;actor.root.y-=dt*350;actor.root.rotation+=dt*4;}
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
      if(actor.kind==='camel'&&!death)actor.rig.armature.getSlot('PLANK')!.displayIndex=actor.camelFrame!;
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
      flight.rig.position.set(flight.x+(this.cameraX+42/this.cameraZoom-flight.x)*p,flight.y+(this.cameraY+42/this.cameraZoom-flight.y)*p);
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
    for(const g of game.graves){
      const rig=object(`grave-${g.id}`,'grave','Idle',cellX(g.column),rowY(g.row),.5);
      rig.armature.getSlot('MAIN')!.displayIndex=g.stage;
    }
    for(const p of game.pickups)object(`pickup-${p.id}`,p.kind,'Idle',p.x,p.y+Math.sin(p.age*3)*4,p.kind==='food'?.7:.8).zIndex=1000;
    for(const m of game.missiles){
      const rig=object(`missile-${m.id}`,m.kind==='snow'?'powerSnow':m.kind,'Idle',m.x,m.y,m.powered?.65:.5,m.kind==='snow'?undefined:m.kind==='cabbage'?(m.powered?'Projectile2':'Projectile1'):(m.powered?'Projectile1':'Projectile0'));
      rig.zIndex=1000;rig.rotation=m.kind==='boomerang'?m.age*20:m.age*3;
    }
    for(const z of game.zombies){
      if(game.time<z.frozenUntil)object(`ice-${z.id}`,'iceTrap','Idle',z.x,rowY(z.row),.55);
      if(z.entry==='storm'&&game.time-z.entryAt<1.5){
        const age=game.time-z.entryAt,x=z.entryX+(1070-z.entryX)*Math.max(0,1-age);
        const rig=object(`storm-${z.id}`,'sandstorm',age<1?'Idle':'Die',x,rowY(z.row),.5);if(age>=1)rig.animation.lastAnimationState!.playTimes=1;
      }
    }
    for(const fire of game.fires)object(`fire-${fire.row}-${fire.column}`,'flameSquare','Play',cellX(fire.column),rowY(fire.row),.5);
    const power=game.power;
    if(power&&power.held&&power.remaining>0){
      if(power.kind==='fire'||power.kind==='zap')object('power-finger',power.kind==='fire'?'flameFinger':'wizardFinger','Idle',power.x,power.y,.5).zIndex=1100;
      if(power.kind==='zap')for(const z of game.zombies)if(Math.abs(z.x-power.x)<123&&Math.abs(rowY(z.row)-50-power.y)<147){
        const dx=z.x-power.x,dy=rowY(z.row)-50-power.y;
        const rig=object(`zap-${z.id}`,'wizardPoint','Idle',power.x,power.y,1);rig.scale.set(Math.hypot(dx,dy)/175,.5);rig.rotation=Math.atan2(dy,dx);rig.zIndex=1100;
      }
    }
    for(const pea of game.peas)object(`pea-${pea.id}`,'pea','Idle',pea.x,pea.y,.5,pea.powered?'pea_g':'pea0');
    for (const [key,rig] of this.objects) if (!alive.has(key)) { rig.removeFromParent(); rig.dispose(); this.objects.delete(key); }
    for (const effect of game.effects) if(!this.seenEffects.has(effect.id)) {
      this.seenEffects.add(effect.id);
      if(effect.kind==='collect'){
        const rig=this.art.build('sun','Normal');rig.position.set(effect.x,effect.y);rig.scale.set(.5);rig.zIndex=1000;this.actorLayer.addChild(rig);
        this.sunFlights.push({rig,x:effect.x,y:effect.y,age:0});continue;
      }
      const special:Partial<Record<typeof effect.kind,{name:string;animation:string;armature?:string}>>={
        cherry:{name:'cherryExplosion',animation:'Play'},snowHit:{name:'snowHit',animation:'Play'},
        ground:{name:'dirtSpawn',animation:'Play'},freeze:{name:'iceTrap',animation:'Die'},
        toss:{name:'tossPar',animation:'Play'},graveHit:{name:'grave',animation:`Play${effect.stage}`,armature:'Particle'},
        cabbageHit:{name:'cabbage',animation:'Pop',armature:'Particle1'},boomerangHit:{name:'boomerang',animation:'Hit',armature:'Particle0'},
      };
      const spec=special[effect.kind];
      const name=spec?spec.name:effect.kind==='explode'?'spudow':effect.kind==='hit'?'peaHit':'plantDirt';
      const animation=spec?spec.animation:effect.kind==='explode'?'Explode':effect.kind==='hit'?['Play','Play1','Play2'][effect.id%3]:effect.kind==='food'?'Start':effect.kind==='remove'?'Remove':'Plant';
      const rig=this.art.build(name,animation,spec?spec.armature:effect.kind==='food'?'plant_food_light':undefined);
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
  preview(kinds:ZombieKind[]=['mummy','ra','mummy_armor1'],graves:{row:number;column:number}[]=[]) {
    this.reset();
    for(const [index,g] of graves.entries()){const rig=this.art.build('grave','Idle');rig.position.set(cellX(g.column),rowY(g.row));rig.scale.set(.5);rig.zIndex=rowY(g.row);this.actorLayer.addChild(rig);this.objects.set(`preview-grave-${index}`,rig);}
    for (const [index,kind] of [...new Set(kinds)].slice(0,6).entries()) {
      const actor = this.addActor(-index-1,kind==='camel_onehump'?'camel':kind==='ra'?'ra':'mummy',kind==='mummy_flag');
      actor.root.position.set(1280 + index % 2 * 70,260 + index * 65);
      if(kind==='mummy_armor1'||kind==='mummy_armor2'){actor.armor=this.rig('mummy',kind==='mummy_armor2'?'Bucket':'Cone');actor.armor.scale.set(.51);actor.armor.animation.play('Broken0',0);actor.root.addChild(actor.armor);}
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
  private applyCamera() {
    const scale=this.scale*this.cameraZoom;
    this.conveyorLayer.scale.set(this.scale);
    this.world.scale.set(scale);this.world.position.set(-this.cameraX*scale,-this.cameraY*scale);
  }
  setCamera(x:number,zoom=1,y=0){this.cameraX=x;this.cameraY=y;this.cameraZoom=zoom;this.applyCamera();}
  frameCombat(progress=1) {
    const start=this.art.catalog.presentation.seedChoosingCameraX;
    this.setCamera(start+(COMBAT_VIEW.x-start)*progress,1+(COMBAT_VIEW.zoom-1)*progress,COMBAT_VIEW.y*progress);
  }
  dispose(){this.reset();for(const child of this.conveyorLayer.children){(child as PixiArmatureDisplay).dispose();}this.observer.disconnect();this.clock.clear();this.art.dispose();this.factory.clear(false);this.app.destroy(true,{children:true,texture:false,textureSource:false});}
  render() { this.app.render(); }
  start() { this.app.start(); }
  stop() { this.app.stop(); }
  reset() {
    this.stop();this.conveyorLayer.visible=false;
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
