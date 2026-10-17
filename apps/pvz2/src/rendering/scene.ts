import {pirateArmor,zombieY,seaCell} from '../game/pirate';
import { textureScope } from '../assets/textures';
import { battleActors, zombieRig } from './resource-plan';
import type { BattleLevel } from '../game/levels';
import mowerPresentation from '../../public/assets/battle/mower.json';
import 'pixi.js/prepare';
import { BattleArt } from './battle-art';
import { animationTimeline, specialAnimationTiming, bonkAnimationTiming, COMBAT_VIEW, type Skeleton } from './presentation';
import { Application, Container, Graphics, Sprite, Texture, type Ticker } from 'pixi.js';
import { EventObject, PixiFactory, WorldClock, type PixiArmatureDisplay } from 'pixi-dragonbones-runtime';
import { assetUrl, json, loadInBatches } from '../assets/load';
import { BOARD, cellX, rowY, PLANT_KINDS, type AnimationTiming, type PlantKind, type ZombieKind, type Level } from '../game/level';
import { isCamel, isMatchCamel, type DeathCause, Game, Plant, Zombie, ZombieDeath } from '../game/model';

type RigName = PlantKind | 'pirateCaptain'|'pirateParrot'| 'barrelroller'|'pirateBarrel'|'pirateGargantuar'|'pirateImp'|'impCannon'| 'pirate'|'pirateFlag'|'swashbuckler'|'seagull'|'pelican'| 'boss' | 'torchlight' | 'pharaohWeak' | 'mummy' | 'ra' | 'camel' | 'camelTouch' | 'gargantuar' | 'imp' | 'explorer' | 'tombraiser' | 'pharaoh' | 'pharaohInner';
const RIGS: Record<RigName, { armature: string; idle: string; scale: number }> = {
  xshot:{armature:'Rotobaga',idle:'Idle',scale:.55},chardguard:{armature:'ChardGuard',idle:'Idle',scale:.55},dandelion:{armature:'Dandelion',idle:'Idle',scale:.55},jalapeno:{armature:'Jalapeno',idle:'Idle',scale:.55},lightningreed:{armature:'LightningReed',idle:'Idle',scale:.55},escaperoot:{armature:'EscapeRoot',idle:'Baby_Loop',scale:.55},spikerock:{armature:'Spikerock',idle:'Idle',scale:.55},threepeater:{armature:'Threepeater',idle:'Idle',scale:.55},pirateCaptain:{armature:'Captain',idle:'Walk',scale:.51},pirateParrot:{armature:'Parrot',idle:'Flying',scale:.51},
  spikeweed:{armature:'Spikeweed',idle:'Idle',scale:.55},springbean:{armature:'SpringBean',idle:'Idle',scale:.55},barrelroller:{armature:'BarrelPusher',idle:'Walk',scale:.51},pirateBarrel:{armature:'Barrel',idle:'Walk',scale:.51},pirateGargantuar:{armature:'PirateGargantuar',idle:'Walk',scale:.51},pirateImp:{armature:'Imp',idle:'Walk',scale:.51},impCannon:{armature:'ImpCannon',idle:'Idle',scale:.51},
  pelican:{armature:'PelicanZombie',idle:'Walk',scale:.51},pirate:{armature:'PirateBasic',idle:'Walk',scale:.51},pirateFlag:{armature:'PirateFlag',idle:'Walk',scale:.51},swashbuckler:{armature:'Swashbuckler',idle:'Walk',scale:.51},seagull:{armature:'SeagullZombie',idle:'Walk',scale:.51},snapdragon:{armature:'SnapDragon',idle:'Idle',scale:.55},coconutcannon:{armature:'CoconutCannon',idle:'Idle',scale:.55},
  boss:{armature:'Zomboss',idle:'Idle',scale:.51},torchlight:{armature:'TorchlightZombie',idle:'Walk',scale:.51},pharaohWeak:{armature:'WeakPharaohZombie',idle:'Walk',scale:.51},
  snowdrop:{armature:'SnowDrop',idle:'Idle',scale:.55},imitater:{armature:'Imitater',idle:'Idle',scale:.55},peapod:{armature:'Peapod',idle:'Idle',scale:.55},cherry_bomb:{armature:'CherryBomb',idle:'Idle',scale:.55},celerystalker:{armature:'CeleryStalker',idle:'Idle_Hidden',scale:.55},parsnip:{armature:'Parsnip',idle:'Idle',scale:.55},sapfling:{armature:'Sapfling',idle:'Idle',scale:.55},
  repeater:{armature:'Repeater',idle:'Idle',scale:.56},kernelpult:{armature:'KernelPult',idle:'Idle',scale:.55},melonpult:{armature:'Melon-pult',idle:'Idle',scale:.55},
  peashooter: { armature: 'Peashooter', idle: 'Idle', scale: .56 },
  sunflower: { armature: 'Sunflower', idle: 'Idle', scale: .55 },
  wallnut: { armature: 'Wall-nut', idle: 'Idle1', scale: .55 },
  potatomine: { armature: 'PotatoMine', idle: 'Idle_Baby', scale: .58 },
  cabbagepult:{armature:'Cabbage-Pult',idle:'Idle',scale:.55},
  bloomerang:{armature:'Bloomerang',idle:'Idle',scale:.55},
  iceburg:{armature:'IcebergLettuce',idle:'Idle',scale:.55},
  gravebuster:{armature:'GraveBuster',idle:'Idle',scale:.55},
  twinsunflower:{armature:'TwinSunflower',idle:'Idle',scale:.55},
  bonkchoy:{armature:'BonkChoy',idle:'Idle',scale:.55},
  pharaoh:{armature:'PharaohZombie',idle:'Walk',scale:.51},
  pharaohInner:{armature:'PharaoInnerZombie',idle:'Walk',scale:.51},
  iceweed:{armature:'Iceweed',idle:'Idle',scale:.55},
  gargantuar:{armature:'EgyptGargantuar',idle:'Walk',scale:.51},
  imp:{armature:'EgyptImp',idle:'Walk',scale:.51},
  explorer:{armature:'EgyptExplorerZombie',idle:'Walk',scale:.51},
  tombraiser:{armature:'TombRaiserZombie',idle:'Walk',scale:.51},
  camelTouch:{armature:'CamelZombie',idle:'Walk',scale:.51},
  camel:{armature:'CamelZombie',idle:'Walk',scale:.51},
  mummy: { armature: 'EgyptBasicZombie', idle: 'Walk', scale: .51 },
  ra: { armature: 'RaZombie', idle: 'Walk', scale: .51 },
};

interface Actor { rootGrown?:boolean;rootCharged?:boolean; captured?:boolean;capturing?:boolean; root: Container; rig: PixiArmatureDisplay; kind: RigName; animation: string; actionAt: number; armor?: PixiArmatureDisplay; armLost: boolean; mask?:Graphics;camelFrame?:number;plank?:PixiArmatureDisplay;plankState?:string;plankAt?:number; death?: {cause:DeathCause|'plant';elapsed:number;fadeAt:number;fallAt:number} }
interface Fragment {rig:PixiArmatureDisplay;x:number;y:number;ground:number;vx:number;vy:number;spin:number;age:number;landed:number}

export class Scene {
  private textures=textureScope();
  readonly app = new Application();
  readonly art = new BattleArt();
  private clock = new WorldClock();
  private npcs = new Map<string,PixiArmatureDisplay>();
  private mowerHolds=new Map<number,{root:Container;mask:Graphics}>();
  private mowerHoldTexture!:Texture;
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
  private foodLights = new Map<string,{rig:PixiArmatureDisplay;ending:boolean}>();
  private seenEffects = new Set<number>();
  private seenDeaths = new Set<number>();
  private fragments: Fragment[] = [];
  private sunFlights: {rig:PixiArmatureDisplay;x:number;y:number;age:number}[] = [];
  private skeletons = new Map<RigName,Skeleton>();
  private flowerAnimation='Idle';
  private bossView=false;
  private lawnRigs:PixiArmatureDisplay[]=[];
  private cameraX = 0;
  private cameraY = 0;
  private cameraZoom = 1;
  onSound: (name:string)=>void = () => {};
  onNPCEvent: (character:string,event:string)=>void = () => {};
  private npcTransition: 'enter'|'exit'|null = null;
  private rootLocator?:PixiArmatureDisplay;
  private pointer:readonly [number,number]=[0,0];
  private highlight = new Graphics();
  private observer!: ResizeObserver;
  private scale = 1;
  private tick = (ticker: Ticker) => this.onTick(ticker.deltaMS / 1000);

  async init(host: HTMLElement, progress: (done: number, total: number) => void,config:BattleLevel,plantActors:PlantKind[],level:Level) {
    this.bossView=!!level?.boss;
    await this.app.init({ width: BOARD.width, height: BOARD.height, background: '#b5924c', antialias: true,
      resolution: Math.min(window.devicePixelRatio, 2), autoDensity: true, autoStart: false });
    host.append(this.app.canvas);
    this.app.canvas.setAttribute('aria-label', `${config.worldName}战场，五行九列。选择植物后点击地块种植。`);
    this.app.stage.eventMode = 'none';
    this.app.stage.addChild(this.world,this.conveyorLayer);
    if(config.world!=='pirate'){const lawn=new Sprite(await this.textures.load(assetUrl(config.presentation.lawn)));lawn.width=1974;lawn.height=768;lawn.position.set(-340,-40);this.world.addChild(lawn);}
    this.world.addChild(this.highlight,this.actorLayer);
    this.actorLayer.sortableChildren = true;
    const actorNames=battleActors(level,plantActors) as RigName[];
    const artCount=await this.art.init(this.app,(done,total)=>progress(done+1,total+actorNames.length+1),config,plantActors,level,this.textures);
    if(config.world==='pirate'){
      const lawn=this.art.build('pirateLawn','Idle');lawn.scale.set(.5);lawn.position.set(449.645,344);this.world.addChildAt(lawn,0);this.lawnRigs.push(lawn);
      for(let row=0;row<5;row++){lawn.armature.getSlot(`DECKSHADE${row}`)!.displayIndex=level.planks!.includes(row)?0:-1;const deck=this.art.build('pirateLawn',level.planks!.includes(row)?'On':'Off',`Deck${row}`);deck.scale.set(.5);deck.position.set(449.645,344-[15.248,15.248,18.739,18.739,22.227][row]*.5);this.world.addChildAt(deck,row+1);this.lawnRigs.push(deck);}
      if(level.cannon){const guide=this.art.build('pirateLawn','Idle','CannonGuide');guide.scale.set(.5);guide.position.set(449.645,344);this.world.addChildAt(guide,6);this.lawnRigs.push(guide);}
    }
    this.mowerHoldTexture=await this.textures.load(assetUrl(this.art.catalog.ui.mowerHold.image));
    if(level?.conveyor){for(const lane of [0,1]){
      const rig=this.art.build('conveyor','Idle'),bounds=rig.getLocalBounds();
      // The native horizontal lanes rotate the vertical armature by 90° (Y-up).
      const sx=BOARD.height*.09/bounds.width,sy=BOARD.width*.43/bounds.height;
      rig.scale.set(sx,sy);rig.rotation=-Math.PI/2;
      rig.position.set(BOARD.width*.08-bounds.y*sy,BOARD.height*(.01+lane*.09)+(bounds.x+bounds.width)*sx);this.conveyorLayer.addChild(rig);
    }this.conveyorLayer.visible=false;}
    let done = artCount+1; const total=artCount+actorNames.length+1;
    const skeletons = new Map<RigName, Skeleton>();
    await loadInBatches(actorNames, 2, async name => {
      const spec=config.assets==='campaign'?this.art.campaign.actors[name]:undefined;
      const base=spec?`${spec.group}/rigs/${spec.rig}`:`actors/${name}`;
      const [skeleton, atlas, texture] = await Promise.all([
        json<Skeleton>(`${base}/skeleton.json`), json<object>(`${base}/atlas.json`),
        this.textures.load(assetUrl(`${base}/texture.webp`)),
      ]);
      this.factory.parseDragonBonesData(skeleton, name);
      this.factory.parseTextureAtlasData(atlas, texture, name);
      await this.app.renderer.prepare.upload(texture);
      skeletons.set(name, skeleton); progress(++done, total);
    });
    this.skeletons=skeletons;
    const shoot=animationTimeline(skeletons.get('peashooter')!,'Peashooter','Shoot'),produce=animationTimeline(skeletons.get('sunflower')!,'Sunflower','Produce');
    const grow=animationTimeline(skeletons.get('potatomine')!,'PotatoMine','Grow'),mine=animationTimeline(skeletons.get('potatomine')!,'PotatoMine','Charging');
    this.timing = { wallnutArmor:animationTimeline(skeletons.get('wallnut')!,'Wall-nut','Food').events.wearArmor,wallnutFoodEnd:animationTimeline(skeletons.get('wallnut')!,'Wall-nut','Food').events.foodEnd,shoot:shoot.events.Shoot,shootDuration:shoot.duration,produce:produce.events.Produce,produceDuration:produce.duration,mineGrow:grow.events.activate,mineExplode:mine.events.explode,mineDeath:mine.events.die,
      raStart:animationTimeline(skeletons.get('ra')!,'RaZombie','AbsorbStart').duration,raEnd:animationTimeline(skeletons.get('ra')!,'RaZombie','AbsorbEnd').duration };
    if(config.assets==='campaign'){
      for(const name of ['cabbagepult','bloomerang','iceburg'] as const)if(!skeletons.has(name))skeletons.set(name,await json<Skeleton>(`campaign/rigs/${this.art.campaign.actors[name].rig}/skeleton.json`));
      const cabbage=animationTimeline(skeletons.get('cabbagepult')!,'Cabbage-Pult','Lob'),boom=animationTimeline(skeletons.get('bloomerang')!,'Bloomerang','Shoot'),ice=animationTimeline(skeletons.get('iceburg')!,'IcebergLettuce','Death');
      this.timing.campaign={cabbage:cabbage.events.Lob,cabbageDuration:cabbage.duration,cabbageFood:animationTimeline(skeletons.get('cabbagepult')!,'Cabbage-Pult','Food').events.lobFood,cabbageFoodEnd:animationTimeline(skeletons.get('cabbagepult')!,'Cabbage-Pult','Food').events.foodEnd,boomerang:boom.events.Shoot,boomerangDuration:boom.duration,boomerangCatch:animationTimeline(skeletons.get('bloomerang')!,'Bloomerang','Catch').duration,ice:ice.events.explode,iceDuration:ice.duration,iceFood:animationTimeline(skeletons.get('iceburg')!,'IcebergLettuce','Food').events.foodExplode/.8,iceFoodEnd:animationTimeline(skeletons.get('iceburg')!,'IcebergLettuce','Food').events.foodEnd/.8};
    }
    if(actorNames.some(name=>['gargantuar','tombraiser','gravebuster','twinsunflower','iceweed'].includes(name))){
      for(const name of ['gargantuar','tombraiser','gravebuster','twinsunflower','iceweed'] as const)if(!skeletons.has(name))skeletons.set(name,await json<Skeleton>(`campaign/rigs/${this.art.campaign.actors[name].rig}/skeleton.json`));
      this.timing.special=specialAnimationTiming(skeletons);
    }
    this.observer = new ResizeObserver(() => {
      this.scale = host.clientWidth / BOARD.width;
      this.app.renderer.resize(host.clientWidth, host.clientWidth * BOARD.height / BOARD.width);
      this.applyCamera();
      this.render();
    });
    if(skeletons.has('bonkchoy'))this.timing.bonk=bonkAnimationTiming(skeletons.get('bonkchoy')!);
    this.observer.observe(host);
    const point = (e: PointerEvent) => { const r = this.app.canvas.getBoundingClientRect(); return [(e.clientX - r.left) / (this.scale*this.cameraZoom)+this.cameraX, (e.clientY - r.top) / (this.scale*this.cameraZoom)+this.cameraY] as const; };
    this.app.canvas.addEventListener('pointerdown', e => { e.preventDefault();this.app.canvas.setPointerCapture(e.pointerId); this.pointer=point(e);this.onPoint(...this.pointer); });
    this.app.canvas.addEventListener('pointermove', e => {this.pointer=point(e);this.onHover(...this.pointer);});
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
    const events:Partial<Record<RigName,Record<string,string>>>={escaperoot:{unWrapSound:'unwrapQuickSounds'},spikerock:{attack:'attackSound'},threepeater:{ShootSound:'shootSound'},spikeweed:{attack:'attackSound'},springbean:{foodLeap:'foodLeapSound',foodBounce:'foodBounceSound'},impCannon:{Shoot:'ShootSound',Explode:'ExplodeSound'},pirateGargantuar:{steady:'steadySounds',step:'stepSounds',swing:'swingSounds',smash:'smashSounds',afterSmash:'afterSmashSaySounds',impThrow:'ImpThrowSounds',deathPole:'deathPoleSounds',deathFall:'deathFallSounds'},swashbuckler:{swing:'swingSounds'},snapdragon:{attackSound:'attackSound',flap:'flapSound',foodAttack:'foodSound'},coconutcannon:{Shoot:'shootSound',foodShoot:'shootFoodSound'},boss:{introSmashSound:'introSmashSound',introFallSound:'introFallSound',introSound:'introSound',spawnLandSound:'introLandSound',stepSound:'worldZombossMechStepSounds',moveSound:'worldZombossMechMoveSounds',mouthOpenSound:'worldZombossMechMouthOpenSounds',mouthCloseSound:'worldZombossMechMouthCloseSounds',leapSound:'worldZombossMechLeapStartSounds',landSound:'worldZombossMechLeapEndSounds',deathFallSound:'worldZombossMechDeathFallSounds',shootReadySound:'worldZombossMechShootRiseSounds',shootStart:'worldZombossMechShootSounds',shoot:'worldZombossMechPRJDropSounds',escape_trigger:'worldZombossEscapeTriggerSound'},snowdrop:{LobSound:'lobSound'},sapfling:{LobSound:'lobSound',sneeze:'sneezeSound',brush:'brushSound'},peapod:{ShootMega:'shootMegaSounds'},imitater:{sound:'imitateSound'},celerystalker:{hit:'hitSounds',foodSummon:'foodSounds'},parsnip:{hit:'snipSound',summon:'popSound'},repeater:{ShootSound:'shootSound',shootMega:'shootMegaSound'},kernelpult:{LobSound:'lobSound'},melonpult:{Lob:'lobSound'},bonkchoy:{attackAir:'attackAirSound',attackGoal:'attackGoalSound',attackHeavy:'defeatSound',foodAttack:'attackAirSound'},cabbagepult:{LobSound:'lobSound'},bloomerang:{ShootSound:'shootSound',catch:'catchSound'},iceburg:{explode:'deadSound',foodExplode:'foodBlastSound'},tombraiser:{puke:'pukeSound',throw:'throwSound'},gargantuar:{step:'stepSounds',swing:'swingSounds',smash:'smashSounds',afterSmash:'afterSmashSaySounds',impThrow:'ImpThrowSounds',deathPole:'deathPoleSounds',deathFall:'deathFallSounds'}};
    if(name==='boss'&&this.art.campaign.actors.boss.group==='pirate'){
      events.boss!.shoot='afterShootSound';
      rig.addDBEventListener(EventObject.FRAME_EVENT,event=>{if(event.name==='shoot')this.onSound('boss/addShootSounds');if(event.name==='shootReadySound')this.onSound('boss/waveBeforeShootSound');},this);
    }
    if(events[name])rig.addDBEventListener(EventObject.FRAME_EVENT,event=>{const key=events[name]![event.name];if(key)this.onSound(name+'/'+key);},this);
    if(name==='camelTouch'){actor.plank=this.rig(name,'_plank');actor.plank.scale.set(.51,.51*.989);actor.plank.position.set(-.42*.51,-141.306*.51);actor.plank.animation.play('IdleBack',0);root.addChild(actor.plank);}
    if(name==='gravebuster')this.onSound('gravebuster/chompSound');
    this.actors.set(id, actor); return actor;
  }

  private animate(actor: Actor, name: string, actionAt = 0, times = 0) {
    if (actor.animation === name && actor.actionAt === actionAt) return;
    const sound=actor.kind==='escaperoot'?({Baby_Start:'spawnSounds',Baby_End:'unwrapSounds',Dig_Start:'burrowSounds',Dig_End:'digEndSounds',Ready_Start:'locateSounds',Baby_Ready_Start:'locateSounds'} as Record<string,string>)[name]:actor.kind==='coconutcannon'&&name==='Food'?'foodStartSound':actor.kind==='threepeater'?(name==='Food'?'foodSound':actor.animation==='Food'?'foodEndSound':null):actor.kind==='springbean'?({Ready:'readySound',Bounce:'bounceSound',Food:'foodSound'} as Record<string,string>)[name]:(actor.kind==='spikeweed'||actor.kind==='spikerock')?name==='Food'?'foodSound':actor.animation==='Food'?'foodEndSound':null:actor.kind==='pirateGargantuar'&&name==='Throw'?'ImpThrowSaySounds':null;if(sound)this.onSound(actor.kind+'/'+sound);
    actor.rig.animation.play(name, times); actor.animation = name; actor.actionAt = actionAt;
  }

  private plantAnimation(plant: Plant, game: Game) {
    if(plant.animation)return plant.animation;
    if(plant.kind==='bonkchoy')return plant.action==='food'?(game.time-plant.actionAt<game.timing.bonk!.foodStart?'FoodStart':'Food'):plant.action==='shoot'?(plant.heavy?'Defeat':'Attack'):'Idle';
    if(plant.kind==='gravebuster')return plant.age<game.timing.special!.graveBust?'Spawn':'Busting';
    if(plant.kind==='iceweed'&&plant.action==='shoot')return 'Attack';
    if(plant.action==='catch')return 'Catch';
    if (plant.action === 'food') return 'Food';
    if (plant.action === 'shoot') return plant.kind==='cabbagepult'?'Lob':'Shoot';
    if (plant.action === 'produce') return 'Produce';
    if (plant.action === 'grow') return 'Grow';
    if (plant.action === 'explode') return plant.kind==='iceburg'?'Death':'Charging';
    if (plant.kind === 'wallnut') return `Idle${5-Math.ceil(plant.hp/game.props.plants.wallnut.Toughness*4)}`;
    if (plant.kind === 'potatomine') return plant.age<14/30?'Spawn_Baby':plant.age < game.props.plants.potatomine.ChargeTime ? 'Idle_Baby' : 'Idle';
    return 'Idle';
  }

  sync(game: Game, dt: number) {
    this.conveyorLayer.visible=!!game.level.conveyor;
    if(game.escape.selected!==null){
      if(!this.rootLocator){this.rootLocator=this.rig('escaperoot','Locator');this.rootLocator.scale.set(.55);this.rootLocator.animation.play('Idle',0);this.rootLocator.zIndex=2000;this.actorLayer.addChild(this.rootLocator);}
      this.rootLocator.visible=true;this.rootLocator.position.set(...this.pointer);
    }else if(this.rootLocator)this.rootLocator.visible=false;
    const alive = new Set<number>();
    for (const p of game.plants) {
      alive.add(p.id);
      const actor = this.actors.get(p.id) ?? this.addActor(p.id, p.kind);
      actor.root.position.set(cellX(p.column), rowY(p.row)); actor.root.zIndex = rowY(p.row);
      if(p.leap){const t=Math.min(1,(game.time-p.leap.at)/.5);actor.root.position.set(p.leap.x+(cellX(p.column)-p.leap.x)*t,p.leap.y+(rowY(p.row)-p.leap.y)*t-100*4*t*(1-t));}
      if(p.kind==='escaperoot')actor.rootGrown=p.rootGrown;
      if(p.kind==='bonkchoy')actor.rig.scale.x=RIGS.bonkchoy.scale*(p.facing??1);
      actor.rig.animation.timeScale=game.finale.handles(p.kind)?game.finale.rate(p):p.kind==='coconutcannon'&&['Shoot','Food'].includes(p.animation!)?2:p.kind==='parsnip'&&p.action==='shoot'?Math.max(1,1/game.props.plants.parsnip.AttackInterval):p.kind==='iceburg'&&p.action==='food'?.8:1;
      const animation = this.plantAnimation(p, game);
      this.animate(actor, animation, p.action === 'idle' ? 0 : p.actionAt, animation==='FoodBig'?1:p.action==='food'&&(p.kind==='sunflower'||p.kind==='twinsunflower')?game.props.plants[p.kind].PlantfoodTime: ['shoot','produce','grow','explode','catch'].includes(p.action)||p.action==='food'&&['cabbagepult','iceburg','wallnut'].includes(p.kind)||animation==='Spawn_Baby'?1:0);
    }
    for(const bomb of game.escape.bombs){
      alive.add(bomb.id);const actor=this.actors.get(bomb.id)??this.addActor(bomb.id,'escaperoot');
      actor.root.position.set(cellX(bomb.column),rowY(bomb.row));actor.root.zIndex=rowY(bomb.row);
      this.animate(actor,bomb.animation,bomb.at,1);
    }
    for (const z of game.zombies) {
      alive.add(z.id);
      if(game.boss?.zombie===z){
        const boss=game.boss,actor=this.actors.get(z.id)??this.addActor(z.id,'boss');
        actor.root.position.set(z.x,boss.y-boss.height);actor.root.zIndex=boss.y+1;
        actor.rig.animation.timeScale=boss.rate;
        this.animate(actor,boss.animation,boss.animationSerial,['Idle','Summonning','Stunning','Leaping'].includes(boss.animation)?0:1);
        continue;
      }
      let actor=this.actors.get(z.id);
      if(actor&&(actor.kind==='camel'&&!isCamel(z.kind)||(actor.kind==='pharaoh'||actor.kind==='pharaohWeak')&&z.kind==='pharaoh_inner')){
        this.shedShell(z.id,actor);actor=undefined;
      }
      actor=actor??this.addActor(z.id,zombieRig(z.kind),z.kind==='mummy_flag');
      actor.root.scale.x=z.reversed?-1:1;
      actor.root.position.set(z.x, zombieY(z)-(z.parrot?.height??0)); actor.root.zIndex = zombieY(z) + 1;
      if(z.parrot){
        if(z.parrot.capture>0&&!actor.capturing)this.onSound('pirateParrot/captureSound');actor.capturing=z.parrot.capture>0;
        const p=z.parrot.carrying;if(p){alive.add(p.id);const carried=this.actors.get(p.id)??this.addActor(p.id,p.kind);carried.captured=true;carried.root.position.set(z.x,z.parrot.y-z.parrot.height+50);carried.root.zIndex=z.parrot.y;carried.rig.animation.timeScale=0;}
      }
      actor.rig.animation.timeScale=game.time<z.frozenUntil||z.stunnedUntil!==undefined&&game.time<z.stunnedUntil||z.butteredUntil!==undefined&&game.time<z.butteredUntil?0:game.time<z.chilledUntil?.5:(z.kind==='seagull'||z.kind==='pelican')?1.5:1;
      actor.rig.tint=game.time<z.frozenUntil||game.time<z.chilledUntil?0x9ce8ff:z.food?0xb0ff83:0xffffff;
      const entering=z.entry!=='walk'&&game.time-z.entryAt<(z.entry==='ground'?1.35:1);
      if(z.entry==='ground'){
        if(entering&&!actor.mask){actor.mask=new Graphics().rect(-130,-250,260,250).fill(0xffffff);actor.root.addChild(actor.mask);actor.root.mask=actor.mask;}
        actor.rig.y=entering?120*Math.pow(1-Math.min(1,(game.time-z.entryAt)),2):0;
        if(!entering&&actor.mask){actor.root.mask=null;actor.mask.destroy();actor.mask=undefined;}
      }
      if(z.leap){const t=Math.min(1,(game.time-z.leap.at)/(z.leap.duration??.5));actor.root.y=z.leap.fromY+(rowY(z.leap.toRow)-z.leap.fromY)*t-90*Math.sin(t*Math.PI);}
      if(isCamel(z.kind)&&!isMatchCamel(z.kind))actor.camelFrame=z.camelPart*3+(z.armor<125?2:z.armor<250?1:0);
      const swingAnimation=z.swing?(game.time<z.swing.judge?'SwingBack':z.swing.failure?'SwingFailure':'SwingSuccess'):null;
      const absorbAnimation={idle:'Walk',start:'AbsorbStart',loop:'Absorbing',end:'AbsorbEnd'}[z.absorbState];
      const special=game.specialZombies.get(z.id);
      const specialAnimation=special?.action==='smash'?'Smash':special?.action==='throw'||special?.action==='bone'?'Throw':null;
      if(special?.action==='throw'&&actor.animation!=='Throw')this.onSound('gargantuar/ImpThrowSaySounds');
      this.animate(actor,(z.parrot?'Flying':null)??z.pirate?.animation??(z.kind==='barrelroller'&&z.barrel!==undefined?(z.eating?'Eat_Barrel':'Walk_Barrel'):null)??swingAnimation??(z.kind==='pharaoh_inner'&&z.landUntil!==undefined&&game.time<z.landUntil?'Idle':z.leap&&(z.kind==='egypt_imp'||z.kind==='pirate_imp')?'Fly':(z.kind==='egypt_imp'||z.kind==='pirate_imp')&&z.landUntil!==undefined&&game.time<z.landUntil?'Land':specialAnimation??(entering?'Idle':z.kind==='ra'&&z.absorbState!=='idle'?absorbAnimation:z.eating?'Eat':'Walk')),z.pirate?z.pirate.at:swingAnimation?z.swing!.at:specialAnimation?special!.at:0,z.pirate&&!['Idle','Walk'].includes(z.pirate.animation)?1:swingAnimation?1:special?.action==='bone'?2:specialAnimation?1:z.absorbState==='start'||z.absorbState==='end'?1:0);

      if(actor.plank){const card=game.camelCards.get(z.id)!;
        if(actor.plankState!==card.state||actor.plankAt!==card.at){actor.plank.animation.play(card.state==='back'?'FlipBack':card.state==='face'?'FlipFace':'Match',1);actor.plankState=card.state;actor.plankAt=card.at;}
        actor.plank.armature.getSlot('icon')!.displayIndex=card.face;actor.plank.armature.getSlot('type')!.displayIndex=z.camelPart;
      }
      if(['pirateCaptain','pirate','pirateFlag','swashbuckler','mummy','ra','explorer','torchlight','tombraiser','imp','pharaohInner'].includes(actor.kind)&&!actor.armLost&&z.hp<=game.props.zombies[z.kind].Toughness*this.art.catalog.presentation.armDropHealthFraction){actor.armLost=true;this.dropFragment(actor,'arm');this.onSound('zombieLimbPop');}
      if ((actor.kind==='mummy'||actor.kind==='pirate')&&z.armor > 0 && !actor.armor) {
        actor.armor = this.rig(actor.kind, z.kind.endsWith('_armor4')?'Bricks':z.kind.endsWith('_armor2')?'Bucket':'Cone'); actor.armor.scale.set(.51); actor.root.addChild(actor.armor);
      }
      if (actor.armor) {
        if(actor.armor.visible&&z.armor<=0){this.dropFragment(actor,z.kind.endsWith('_armor4')?'Bricks':z.kind.endsWith('_armor2')?'Bucket':'Cone');this.onSound('zombieLimbPop');}
        actor.armor.visible = z.armor > 0;
        const max=pirateArmor(z.kind)?game.props.armors[pirateArmor(z.kind)!].Toughness:z.kind==='mummy_armor4'?game.props.armors.egypt_armor4.Toughness:z.kind==='mummy_armor2'?game.props.armors.egypt_armor2.Toughness:game.props.armors.egypt_armor1.Toughness;
        const animation = z.armor > max*2/3 ? 'Broken0' : z.armor > max/3 ? 'Broken1' : 'Broken2';
        if (actor.armor.animation.lastAnimationName !== animation) actor.armor.animation.play(animation, 0);
      }
    }
    for(const death of game.deaths)if(!this.seenDeaths.has(death.zombie.id)){this.seenDeaths.add(death.zombie.id);this.killZombie(death);}
    for (const [id, actor] of this.actors) if (!alive.has(id)&&!actor.death&&PLANT_KINDS.includes(actor.kind as PlantKind)) {
      if(actor.kind==='escaperoot'&&(id<0||actor.rootGrown)||actor.captured||actor.kind==='imitater'||actor.kind==='cherry_bomb'||actor.kind==='jalapeno'||actor.kind==='gravebuster'||actor.animation==='Charging'||actor.kind==='iceburg'&&actor.animation==='Death'||game.effects.some(effect=>effect.kind==='remove'&&effect.x===actor.root.x&&effect.y===actor.root.y)){this.removeActor(id,actor);continue;}
      const animation=actor.kind==='escaperoot'?'Baby_Death':actor.kind==='wallnut'?actor.animation.replace('Idle','Death'):actor.kind==='potatomine'?'Death_Baby':'Death';
      const timeline=animationTimeline(this.skeletons.get(actor.kind)!,RIGS[actor.kind].armature,animation);
      this.animate(actor,animation,0,1);actor.death={cause:'plant',elapsed:0,fadeAt:timeline.duration,fallAt:Infinity};
    }
    this.updateFoodLights(game);
    this.clock.advanceTime(dt); this.art.clock.advanceTime(dt); PixiFactory.advanceTime(0);
    this.updateDeaths(dt);
    for(const [id,actor] of this.actors){
      const state=game.specialZombies.get(id);
      for(const slot of actor.rig.armature.getSlots()){
        if(actor.kind==='pirateCaptain'&&slot.name.includes('Parrot'))slot.displayIndex=game.zombies.find(z=>z.id===id)?.captain?.parrot?0:-1;
        if(actor.kind==='wallnut'&&slot.name==='ARMOR'){const p=game.plants.find(p=>p.id===id);slot.displayIndex=p&&p.armor>0?Math.max(0,2-Math.floor(p.armor/game.props.plants.wallnut.ArmorToughness*3)):-1;}
        if((actor.kind==='gargantuar'&&state&&!state.imp||actor.kind==='pirateGargantuar'&&game.zombies.find(z=>z.id===id)?.pirate?.imp===false)&&slot.name.includes('_IMP'))slot.displayIndex=-1;
        if(actor.kind==='gargantuar'&&game.pharaohs.has(id)&&slot.name.includes('PHARAOH'))slot.displayIndex=-1;
        if((actor.kind==='pharaoh'||actor.kind==='pharaohWeak')&&slot.name==='armor'){const z=game.zombies.find(z=>z.id===id);if(z)slot.displayIndex=z.armor<game.props.zombies.pharaoh.Toughness/3?2:z.armor<game.props.zombies.pharaoh.Toughness*2/3?1:0;}
        if(actor.kind==='boss'&&game.boss){const part=slot.name.match(/_BP([0-3])/);if(part)slot.displayIndex=(game.boss.zombie.hp<=0?3:game.boss.stage)>=Math.max(1,Number(part[1]))?0:-1;}
        if(actor.kind==='peapod'){const p=game.plants.find(p=>p.id===id);if(p){const head=slot.name.match(/_(?:HEAD|UH)([0-4])$/);if(head)slot.displayIndex=Number(head[1])<p.heads!?0:-1;}}
        if(actor.kind==='escaperoot'&&['PM','PPM','CB','GS'].includes(slot.name)){
          const bomb=game.escape.bombs.find(b=>b.id===id),timeline=bomb&&game.props.plantAnimations.escaperoot[bomb.animation];
          const visible=!!bomb&&slot.name===['PM','PPM','CB','GS'][bomb.variant]&&game.time-bomb.at>=timeline!.events.find(e=>e.name==='Show')!.at;
          slot.displayIndex=visible?0:-1;
          if(visible&&game.time-bomb!.at>=timeline!.events.find(e=>e.name==='charge')!.at&&!actor.rootCharged){slot.childArmature!.animation.play('Attack',1);actor.rootCharged=true;if(bomb!.variant>=2)this.onSound('escaperoot/cherryChargeSound');}
        }
        if(actor.kind==='chardguard'){const p=game.plants.find(p=>p.id===id);const hand=slot.name.match(/HAND([012])/);if(p&&hand)slot.displayIndex=p.leaves!>2-Number(hand[1])?0:-1;}
        if(actor.kind==='spikerock'){const spikes=actor.death?0:game.plants.find(p=>p.id===id)!.spikes!;if(slot.name==='spikeL')slot.displayIndex=spikes>=1?0:-1;if(slot.name==='spikeM')slot.displayIndex=spikes>=2?0:-1;if(slot.name==='spikeR')slot.displayIndex=spikes>=3?0:-1;}
        if(actor.kind==='iceweed'){const spikes=game.iceweedSpikes.get(id)??1;if(slot.name.endsWith('_S1'))slot.displayIndex=spikes>=2?1:0;if(slot.name.endsWith('_S2'))slot.displayIndex=spikes>=3?1:0;}
        if((actor.kind==='explorer'||actor.kind==='torchlight')&&state&&!state.torch&&slot.name.startsWith('FIRE'))slot.displayIndex=-1;
      }
      if((actor.kind==='pirateParrot'||actor.kind==='mummy'&&actor.root.scale.x<0||game.level.cannon&&(actor.kind==='seagull'||actor.kind==='pelican'))&&!alive.has(id)&&!actor.death)this.removeActor(id,actor);
    }
    for (const actor of this.actors.values()) if (actor.armor?.visible) {
      const bone = actor.rig.armature.getBone('armorSOCKET')!;
      bone.updateGlobalTransform();
      actor.armor.position.set(actor.rig.x+bone.global.x*.51, actor.rig.y+bone.global.y*.51);
      actor.armor.rotation = bone.global.rotation;
    }
    this.drawChallengeTiles(game.level);
    if(game.level.flowerLine!==null){
      const x=BOARD.left+game.level.flowerLine*82,animation=game.phase==='lost'&&game.lossReason==='flowers'?'Die':game.phase==='won'?'Grow':game.zombies.some(z=>z.hp>0&&!z.leap&&!z.reversed&&Math.abs(z.x-x)<70)?'Nervous':'Idle';
      if(animation!==this.flowerAnimation){this.flowerAnimation=animation;for(let row=0;row<5;row++)this.objects.get(`tile-flower-${row}`)!.animation.play(animation,animation==='Idle'?0:1);}
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
    actor.plank?.removeFromParent();actor.plank?.dispose();actor.rig.removeFromParent();actor.rig.dispose();actor.armor?.removeFromParent();actor.armor?.dispose();actor.root.destroy({children:true});this.actors.delete(id);
  }
  private dropFragment(actor:Actor,part:'head'|'arm'|'Cone'|'Bucket'|'Bricks') {
    const rig=this.rig(actor.kind,part==='Bricks'?'BricksDrop':part);rig.scale.set(RIGS[actor.kind].scale);
    rig.animation.play((part==='Cone'||part==='Bucket'||part==='Bricks')?actor.armor!.animation.lastAnimationName!:part==='arm'&&actor.kind!=='imp'?'newAnimation':'Idle',0);
    const bone=actor.rig.armature.getBone(part==='head'?'head':part==='arm'?'arm_here':'armorSOCKET')!;
    bone.updateGlobalTransform();
    const x=actor.root.x+actor.rig.x+bone.global.x*actor.rig.scale.x,y=actor.root.y+actor.rig.y+bone.global.y*actor.rig.scale.y;
    rig.position.set(x,y);rig.zIndex=actor.root.zIndex+1;this.actorLayer.addChild(rig);
    this.fragments.push({rig,x,y,ground:actor.root.y,vx:(5-10*Math.random())*.55*60,vy:-15*.55*60,spin:(Math.random()<.5?-1:1)*(2*Math.random()+1),age:0,landed:0});
  }
  private shedShell(id:number,actor:Actor) {
    this.actors.delete(id);this.actors.set(-100000-id,actor);this.animate(actor,'Death',0,1);
    actor.death={cause:'plant',elapsed:0,fadeAt:animationTimeline(this.skeletons.get(actor.kind)!,RIGS[actor.kind].armature,'Death').duration,fallAt:Infinity};
  }
  private killZombie(death:ZombieDeath) {
    const z=death.zombie;
    const shell=this.actors.get(z.id);
    // Multiple hits can break the coffin and kill its occupant before the next render.
    if((shell?.kind==='pharaoh'||shell?.kind==='pharaohWeak')&&z.kind==='pharaoh_inner')this.shedShell(z.id,shell);
    const actor=this.actors.get(z.id)??this.addActor(z.id,zombieRig(z.kind),z.kind==='mummy_flag');
    actor.root.position.set(z.x,zombieY(z)-(z.parrot?.height??0));actor.root.zIndex=zombieY(z)+1;actor.rig.animation.timeScale=1;actor.rig.tint=0xffffff;
    if(actor.mask){actor.root.mask=null;actor.mask.destroy();actor.mask=undefined;actor.rig.y=0;}
    if(death.cause==='water'){this.removeActor(z.id,actor);return;}
    if(z.kind==='cannon'&&z.pirate?.animation==='Explode'){this.removeActor(z.id,actor);return;}
    if(z.swing?.failure){this.removeActor(z.id,actor);return;}
    if((actor.kind==='seagull'||actor.kind==='pelican')){
      actor.rig.armature.getSlot('Seagull')!.childArmature!.animation.play(death.cause==='potato'?'Explode':z.butteredUntil!==undefined?'Death':'Escape',1);
      if(z.butteredUntil!==undefined||death.cause==='potato')this.onSound(actor.kind+'/seagullButteredSounds');
      if(death.cause==='potato'){const feathers=this.rig(actor.kind,'ParticleSeagull');feathers.scale.set(.51);feathers.position.copyFrom(actor.root.position);feathers.animation.play('Play',1);feathers.zIndex=actor.root.zIndex;this.actorLayer.addChild(feathers);this.particles.set(-z.id,feathers);}
    }
    if(!['pirateParrot','pirateBarrel','impCannon','seagull','pelican','camel','camelTouch','pharaoh','pharaohWeak'].includes(actor.kind))this.dropFragment(actor,'head');this.onSound(actor.kind==='pirateParrot'?'pirateParrot/deathSound':'zombieLimbPop');
    if(actor.armor?.visible){this.dropFragment(actor,z.kind.endsWith('_armor4')?'Bricks':z.kind.endsWith('_armor2')?'Bucket':'Cone');actor.armor.visible=false;}
    if(death.cause==='match'&&actor.plank){actor.plank.removeFromParent();actor.plank.dispose();actor.plank=undefined;}
    if(death.cause==='potato'){this.removeActor(z.id,actor);return;}
    const animation=actor.kind==='pirateParrot'?'Die':'Death',timeline=animationTimeline(this.skeletons.get(actor.kind)!,actor.rig.armature.name,animation);
    this.animate(actor,animation,z.swing?.at??0,1);
    actor.death={cause:death.cause,elapsed:0,fadeAt:timeline.events.die,fallAt:actor.kind==='pirateParrot'?Infinity:(actor.kind==='gargantuar'||actor.kind==='pirateGargantuar')?timeline.events.deathFall:timeline.events.fall};
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
          if((actor.kind==='seagull'||actor.kind==='pelican')&&before<.4&&death.elapsed>=.4)this.dropFragment(actor,'head');
          if(before<death.fallAt&&death.elapsed>=death.fallAt)this.onSound('zombieLie');
          if(death.elapsed>=death.fadeAt)actor.root.alpha=Math.max(0,1-(death.elapsed-death.fadeAt)/this.art.catalog.presentation.corpseFadeDuration);
          if(actor.root.alpha===0){this.removeActor(id,actor);continue;}
        }
      }
      if(actor.kind==='camel'&&!death)actor.rig.armature.getSlot('PLANK')!.displayIndex=actor.camelFrame!;
      // The original BodyGrouper controls these slots independently of animation poses.
      for(const slot of actor.rig.armature.getSlots()) {
        if(death&&death.cause!=='plant'&&(slot.name.endsWith('_HEAD')||(actor.kind==='seagull'||actor.kind==='pelican')&&death.elapsed>=.4&&slot.name.endsWith('_head')))slot.displayIndex=-1;
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
  private updateFoodLights(game:Game) {
    const active=new Set<string>();
    for(const plant of game.plants)if(plant.action==='food'&&(game.phase==='playing'||game.phase==='paused')){
      const key=`${plant.id}:${plant.actionAt}`;active.add(key);
      if(!this.foodLights.has(key)){
        const rig=this.art.build('plantDirt','Start','plant_food_light');
        rig.label='plant-food-light';rig.animation.play('Start',1);
        rig.position.set(cellX(plant.column),rowY(plant.row));rig.scale.set(.5);rig.zIndex=rowY(plant.row)-.5;
        this.actorLayer.addChild(rig);this.foodLights.set(key,{rig,ending:false});
      }
    }
    // Start switches itself to looping Idle in the native skeleton. Plant.foodEnd
    // explicitly plays End; completion alone can never retire an Idle light.
    for(const [key,light] of this.foodLights){
      if(!active.has(key)&&!light.ending){light.rig.animation.play('End',1);light.ending=true;}
      if(light.ending&&light.rig.animation.isCompleted){light.rig.removeFromParent();light.rig.dispose();this.foodLights.delete(key);}
    }
  }
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
    const alive = new Set<string>([...this.objects.keys()].filter(key=>key.startsWith('tile-')));
    const object = (key: string, name: string, animation: string, x: number, y: number, scale: number,armature?:string) => {
      alive.add(key);
      let rig = this.objects.get(key);
      if (!rig) { rig = this.art.build(name,animation,armature); this.objects.set(key,rig); this.actorLayer.addChild(rig); }
      if (rig.animation.lastAnimationName !== animation) rig.animation.play(animation,0);
      rig.position.set(x,y); rig.scale.set(scale); rig.zIndex = name === 'sun' ? 1000 : y;
      return rig;
    };
    for(const p of game.plants)if((p.kind==='spikeweed'||p.kind==='spikerock')&&p.action==='food')for(let column=0;column<9;column++)if(column!==p.column&&!seaCell(game.level.planks,p.row,column))object(`spike-food-${p.id}-${column}`,p.kind==='spikerock'?'rockFood':'spikeFood','Idle',cellX(column),rowY(p.row),.5);
    for(const z of game.zombies)if(z.kind==='pirate_barrel'){const actor=this.actors.get(z.id)!;actor.rig.armature.getSlot('face')!.displayIndex=Math.max(0,2-Math.floor(3*z.hp/game.props.zombies.pirate_barrel.Toughness));}
    for(const shot of game.pirate.shots){const rig=object(`coconut-${shot.id}`,shot.food?'coconutFood':'coconut',shot.explodeAt!==undefined?'Explode':'Idle',shot.x,shot.y,shot.food?.6:.5);if(shot.explodeAt!==undefined)rig.animation.lastAnimationState!.playTimes=1;}
    for(const effect of game.pirate.effects){const animation=effect.kind==='snapFire'||effect.kind==='snapBall'?'Play1':'Play',timeline=game.props.plantAnimations[effect.kind][animation];if(game.time-effect.at>=timeline.duration)continue;const rig=object(`pirate-fx-${effect.id}`,effect.kind,animation,effect.x,effect.y,effect.kind==='snapFire'?BOARD.cellHeight/350:effect.kind==='snapBall'?.3:.5);rig.animation.lastAnimationState!.playTimes=1;}
    for (const mower of game.mowers) {
      if(!mower.spent)object(`mower-${mower.row}`,'mower',mower.starting>0?'Trans':mower.active?'Attack':'Idle',mower.x,rowY(mower.row),mowerPresentation.scale);
      let hold=this.mowerHolds.get(mower.row);
      if(mower.hold>0&&!hold){
        const root=new Container(),background=new Sprite(this.mowerHoldTexture),fill=new Sprite(this.mowerHoldTexture),mask=new Graphics();
        background.anchor.set(.5);background.width=background.height=mowerPresentation.holdBackgroundSize*mowerPresentation.scale;
        const color=mowerPresentation.holdColors[0];background.tint=((color&255)<<16)|(color&0xff00)|((color>>>16)&255);background.alpha=(color>>>24)/255;
        fill.anchor.set(.5);fill.width=fill.height=mowerPresentation.holdSize*mowerPresentation.scale;fill.tint=0xffffff;fill.alpha=(mowerPresentation.holdColors[1]>>>24)/255;
        fill.mask=mask;root.addChild(background,fill,mask);root.zIndex=1000;this.actorLayer.addChild(root);hold={root,mask};this.mowerHolds.set(mower.row,hold);
      }
      if(hold){hold.root.visible=mower.hold>0;hold.root.position.set(mower.x,rowY(mower.row)+mowerPresentation.holdY*mowerPresentation.scale);
        hold.mask.clear().moveTo(0,0).arc(0,0,mowerPresentation.holdSize*mowerPresentation.scale/2,-mowerPresentation.fillStart*Math.PI*2,-mowerPresentation.fillStart*Math.PI*2-Math.PI*2*mower.hold/mowerPresentation.holdSeconds,true).lineTo(0,0).fill(0xffffff);
      }
    }
    for (const sun of game.suns) {
      const key=`sun-${sun.id}`,previous=this.objects.get(key)?.animation.lastAnimationName;
      const animation=sun.absorber===null?(previous==='Red'||previous==='N-R'?'R-N':previous==='R-N'&&!this.objects.get(key)!.animation.isCompleted?'R-N':'Normal'):(previous==='Normal'?'N-R':previous==='N-R'&&!this.objects.get(key)!.animation.isCompleted?'N-R':'Red');
      const rig=object(key,'sun',animation,sun.x,sun.y,.5);rig.alpha=Math.max(0,1-Math.max(0,sun.groundAge-7)/.5);
      if(animation==='N-R'||animation==='R-N')rig.animation.lastAnimationState!.playTimes=1;
    }
    for(const g of game.graves){
      const rig=object(`grave-${g.id}`,'grave','Idle',cellX(g.column),rowY(g.row),.5);
      rig.armature.getSlot('MAIN')!.displayIndex=g.stage;rig.zIndex=rowY(g.row)-1;
      rig.visible=!game.plants.some(p=>p.kind==='gravebuster'&&p.row===g.row&&p.column===g.column&&p.age>=game.timing.special!.graveBust);
    }
    for(const sap of game.sap){const rig=object(`sap-${sap.id}`,'sapTile','Idle',cellX(sap.column),rowY(sap.row)-40,.35);rig.zIndex=rowY(sap.row)-3;}
    if(game.boss){
      if(game.boss.animation==='Summonning'||game.boss.animation==='SummonStart')object('boss-portal','bossPortal','Idle',game.boss.zombie.x-38.184,game.boss.y-44.147,.5);
      for(const [i,t] of game.boss.targets.entries())object(`boss-target-${i}`,'bossTarget','Idle',cellX(t.column),rowY(t.row),.2);
      for(const m of game.boss.missiles){
        if(m.age<1.5){object(`boss-missile-${m.id}`,'bossMissile','Idle',cellX(m.column),rowY(m.row)-600*(1-m.age/1.5),.5).zIndex=1100;object(`boss-locator-${m.id}`,'bossTarget','Idle',cellX(m.column),rowY(m.row),.2);}
        else {const rig=object(`boss-impact-${m.id}`,'bossMissile','Play',cellX(m.column),rowY(m.row),.5,'ProjectileExplode');rig.animation.lastAnimationState!.playTimes=1;}
      }
      if(game.boss.animation==='Escape'){const rig=object('boss-escape','bossEscape','Play',game.boss.zombie.x+65.644,game.boss.y-84.136,.5);rig.animation.lastAnimationState!.playTimes=1;}
    }
    for(const p of game.pickups)object(`pickup-${p.id}`,p.kind,'Idle',p.x,p.y+Math.sin(p.age*3)*4,p.kind==='food'?.7:.8).zIndex=1000;
    for(const m of game.missiles){
      const nativeProjectile=m.projectile&&m.projectile!=='cabbage'&&m.projectile!=='cabbage_pf'?m.projectile:null;
      const projectileAnimation=m.kind==='parsnip'&&m.age<game.props.plantAnimations[m.projectile!].Spawn.events.find(e=>e.name==='Idle')!.at?'Spawn':'Idle';
      const rig=object(`missile-${m.id}`,nativeProjectile??(m.kind==='snow'?'powerSnow':m.kind==='bone'?'tombBone':m.kind==='saw'?'iceSaw':m.kind),projectileAnimation,m.x,m.y,m.kind==='parsnip'?.5:m.powered?.65:.5,nativeProjectile||['snow','bone','saw'].includes(m.kind)?undefined:m.kind==='cabbage'?(m.powered?'Projectile2':'Projectile1'):(m.powered?'Projectile1':'Projectile0'));
      rig.zIndex=1000;rig.rotation=m.kind==='boomerang'?m.age*20:m.kind==='parsnip'?0:m.age*3;
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
    for(const sound of game.finale.sounds.splice(0))this.onSound(sound);
    for(const shot of game.finale.shots){const name=shot.kind==='rotobaga'?(shot.food?'rotobagaFood':'rotobaga'):(shot.food?'dandelionFood':'dandelionShot');const rig=object(`finale-shot-${shot.id}`,name,'Idle',shot.x,shot.y,.5);rig.rotation=Math.atan2(shot.vy,shot.vx);}
    for(const v of game.finale.visuals){const rig=object(`finale-fx-${v.id}`,v.name,v.animation,v.x,v.y,.5);rig.animation.lastAnimationState!.playTimes=1;if(v.toX!==undefined){const dx=v.toX-v.x,dy=v.toY!-v.y;rig.rotation=Math.atan2(dy,dx);rig.scale.set(Math.hypot(dx,dy)/200,.5);}}
    for(const c of game.finale.clouds){const age=game.time-c.at,animation=age<.5?'Spawn':age>=.5+game.props.plants.lightningreed.PlantfoodDuration?'Fade':'Idle';const rig=object(`reed-cloud-${c.id}`,'reedCloud',animation,c.x,c.y,.55);if(animation!=='Idle')rig.animation.lastAnimationState!.playTimes=1;for(const slot of rig.armature.getSlots())if(slot.name.includes('LIGHTNING'))slot.displayIndex=c.striking||animation!=='Idle'?0:-1;}
    for(const f of game.finale.fires)for(let column=0;column<9;column++){const age=game.time-f.at-Math.abs(column-f.column)/18;if(age<0)continue;const animation=age<game.props.plantAnimations.jalapenoFire.Spawn.duration?'Spawn':age>=game.props.plants.jalapeno.Duration?'Fade':'Idle';const rig=object(`jalapeno-${f.id}-${column}`,'jalapenoFire',animation,cellX(column),rowY(f.row),.24*BOARD.cellWidth/68);rig.scale.y=.24*15/20*BOARD.cellHeight/80.77;if(animation!=='Idle')rig.animation.lastAnimationState!.playTimes=1;}
    for(const grape of game.escape.grapes)object(`grape-${grape.id}`,'grapeshot',grape.vx>0?'WalkR':grape.vx<0?'WalkL':grape.vy<0?'WalkU':'WalkD',grape.x,grape.y,.5);
    for(const pea of game.peas)object(`pea-${pea.id}`,'pea','Idle',pea.x,pea.y,.5,pea.mega?'pea_g':'pea0');
    for (const [key,rig] of this.objects) if (!alive.has(key)) { rig.removeFromParent(); rig.dispose(); this.objects.delete(key); }
    for (const effect of game.effects) if(!this.seenEffects.has(effect.id)) {
      this.seenEffects.add(effect.id);
      if(effect.kind==='food')continue;
      if(effect.kind==='collect'){
        const rig=this.art.build('sun','Normal');rig.position.set(effect.x,effect.y);rig.scale.set(.5);rig.zIndex=1000;this.actorLayer.addChild(rig);
        this.sunFlights.push({rig,x:effect.x,y:effect.y,age:0});continue;
      }
      const special:Partial<Record<typeof effect.kind,{name:string;animation:string;armature?:string}>>={
        grape:{name:'escapeGrapeExplosion',animation:'Play'},cherry:{name:'cherryExplosion',animation:'Play'},snowHit:{name:'snowHit',animation:'Play'},
        pharaoh:{name:'pharaohBreak',animation:'Play'},graveSpawn:{name:'dirtSpawn',animation:'Play'},ground:{name:'dirtSpawn',animation:'Play'},freeze:{name:'iceTrap',animation:'Die'},
        toss:{name:'tossPar',animation:'Play'},graveHit:{name:'grave',animation:`Play${effect.stage}`,armature:'Particle'},
        cabbageHit:{name:'cabbage',animation:'Pop',armature:'Particle1'},boomerangHit:{name:'boomerang',animation:'Hit',armature:'Particle0'},
      };
      const projectileHits:Record<string,string>={corn:'Particle0',butter:'ParticleButter0',butter2:'ParticleButter0',melon:'Particle0',melon_pf:'ParticleMega',snowdrop:'Par',snowdrop_freeze:'Par',sapfling:'Particle',sapfling_pf:'Particle'};
      const spec=effect.kind==='projectileHit'?{name:effect.projectile!,animation:'Play',armature:projectileHits[effect.projectile!]}:special[effect.kind];
      const name=spec?spec.name:effect.kind==='explode'?'spudow':effect.kind==='hit'?'peaHit':'plantDirt';
      const animation=spec?spec.animation:effect.kind==='explode'?'Explode':effect.kind==='hit'?['Play','Play1','Play2'][effect.id%3]:effect.kind==='remove'?'Remove':'Plant';
      const rig=this.art.build(name,animation,spec?.armature);
      rig.animation.play(animation,1);rig.position.set(effect.x,effect.y);rig.scale.set(.5);rig.zIndex=effect.y+2;
      this.actorLayer.addChild(rig);this.particles.set(effect.id,rig);
      if(effect.kind==='grape')this.onSound('escaperoot/grapeExplSounds');
      if(effect.kind==='hit')this.onSound('peaHit');
    }
  }

  enterNarrative(characters:string[]=['crazydave','winnie']) {
    this.reset();this.setCamera(this.art.catalog.presentation.camera.PanStartOffset);this.npcTransition='enter';
    this.setNarrativeCast(characters);this.start();
  }
  setNarrativeCast(characters:string[]){
    for(const [name,rig] of this.npcs)if(!characters.includes(name)){rig.removeFromParent();rig.dispose();this.npcs.delete(name);}
    for(const [name,x,y] of [['crazydave',175,628],['winnie',990,618],['zombossicon',540,270]] as const) {
      if(!characters.includes(name)||this.npcs.has(name))continue;
      const rig=this.art.build(name,'Enter');rig.animation.play('Enter',1);rig.position.set(x+this.cameraX,y);rig.scale.set(.47);
      rig.addDBEventListener(EventObject.FRAME_EVENT,event=>this.onNPCEvent(name,event.name),this);
      this.actorLayer.addChild(rig);this.npcs.set(name,rig);
    }
    for(const name of characters)this.onSound(name+'/Enter');
  }
  narrative(character: string, animation: string) {
    for(const [name,rig] of this.npcs) {
      rig.animation.play(name===character?animation:'Idle',name===character?1:0);
    }
    this.render();this.start();
  }
  exitNarrative() {
    this.npcTransition='exit';for(const rig of this.npcs.values())rig.animation.play('Exit',1);
    for(const name of this.npcs.keys())this.onSound(name+'/Exit');
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
  private drawChallengeTiles(level:Level) {
    if(level.flowerLine!==null)for(let row=0;row<5;row++){const key=`tile-flower-${row}`;if(!this.objects.has(key)){const rig=this.art.build('flower','Idle');rig.position.set(BOARD.left+level.flowerLine*82,rowY(row));rig.scale.set(.5);rig.zIndex=rowY(row)-2;this.actorLayer.addChild(rig);this.objects.set(key,rig);}}

    for(const [name,cells,animation,scale] of [['mold',level.mold,'Idle',.6],['endangered',level.protectedPlants,'Idle_Floor',.5]] as const){
      for(const cell of cells){const key=`tile-${name}-${cell.row}-${cell.column}`;
        if(!this.objects.has(key)){const rig=this.art.build(name,animation);rig.position.set(cellX(cell.column),rowY(cell.row)-30);rig.scale.set(scale);rig.zIndex=rowY(cell.row)-2;this.actorLayer.addChild(rig);this.objects.set(key,rig);}
      }
    }
  }
  preview(kinds:ZombieKind[]=['mummy','ra','mummy_armor1'],graves:{row:number;column:number}[]=[],plants:Plant[]=[],level?:Level) {
    this.reset();
    if(level)this.drawChallengeTiles(level);
    for(const [index,g] of graves.entries()){const rig=this.art.build('grave','Idle');rig.position.set(cellX(g.column),rowY(g.row));rig.scale.set(.5);rig.zIndex=rowY(g.row)-1;this.actorLayer.addChild(rig);this.objects.set(`preview-grave-${index}`,rig);}
    for(const p of plants){const actor=this.addActor(p.id,p.kind);actor.root.position.set(cellX(p.column),rowY(p.row));actor.root.zIndex=rowY(p.row);this.animate(actor,RIGS[p.kind].idle);}
    for (const [index,kind] of [...new Set(kinds)].slice(0,6).entries()) {
      const actor = this.addActor(-index-1,zombieRig(kind),kind==='mummy_flag');
      actor.root.position.set(1280 + index % 2 * 70,260 + index * 65);
      if(kind==='mummy_armor1'||kind==='mummy_armor2'||kind==='mummy_armor4'||pirateArmor(kind)){actor.armor=this.rig(actor.kind,kind.endsWith('_armor4')?'Bricks':kind.endsWith('_armor2')?'Bucket':'Cone');actor.armor.scale.set(.51);actor.armor.animation.play('Broken0',0);actor.root.addChild(actor.armor);}
      this.animate(actor,'Idle');
      actor.rig.armature.advanceTime(.01);
    }
    this.setCamera(this.art.catalog.presentation.camera.PanStartOffset);
    this.render();
  }
  previewTick(dt: number) {
    this.clock.advanceTime(dt);this.art.clock.advanceTime(dt);
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
    const view=this.bossView?{x:0,y:0,zoom:1}:COMBAT_VIEW;
    this.setCamera(start+(view.x-start)*progress,1+(view.zoom-1)*progress,view.y*progress);
  }
  async dispose(){
    this.reset();for(const rig of this.lawnRigs){rig.removeFromParent();rig.dispose();}this.lawnRigs=[];for(const child of this.conveyorLayer.children){(child as PixiArmatureDisplay).dispose();}this.observer.disconnect();this.clock.clear();this.art.dispose();this.factory.clear(false);PixiFactory.advanceTime(0);
    // The map application is still alive; destroy(true) also releases its shared Pixi batch pools.
    this.app.destroy({removeView:true,releaseGlobalResources:false},{children:true,texture:false,textureSource:false});
    await this.textures.dispose();
  }
  render() { this.app.render(); }
  start() { this.app.start(); }
  stop() { this.app.stop(); }
  reset() {
    this.stop();this.conveyorLayer.visible=false;
    if(this.rootLocator){this.rootLocator.removeFromParent();this.rootLocator.dispose();this.rootLocator=undefined;}
    for (const [id,actor] of this.actors)this.removeActor(id,actor);
    for(const hold of this.mowerHolds.values())hold.root.destroy({children:true});this.mowerHolds.clear();
    for (const rig of this.objects.values()) {rig.removeFromParent();rig.dispose();} this.objects.clear();
    for(const rig of this.npcs.values()){rig.removeFromParent();rig.dispose();}this.npcs.clear();
    for(const rig of this.particles.values()){rig.removeFromParent();rig.dispose();}this.particles.clear();
    for(const {rig} of this.foodLights.values()){rig.removeFromParent();rig.dispose();}this.foodLights.clear();
    for(const fragment of this.fragments){fragment.rig.removeFromParent();fragment.rig.dispose();}this.fragments=[];
    for(const flight of this.sunFlights){flight.rig.removeFromParent();flight.rig.dispose();}this.sunFlights=[];
    this.seenDeaths.clear();this.seenEffects.clear();this.flowerAnimation='Idle';this.npcTransition=null;
    this.actors.clear(); this.highlight.clear(); PixiFactory.advanceTime(0);
  }
}
