import {isRack,rackDisplay} from '../game/kongfu-combat';
import {kongfuArmor} from '../game/kongfu';
import {lostcityArmor} from '../game/lostcity';
import {iceageArmor} from '../game/iceage';
import {beachArmor} from '../game/beach';
import { applyCostume } from '../shell/costumes';
import {KongfuBladeBoss} from '../game/kongfu-blade-boss';
import {KongfuBoss} from '../game/kongfu-boss';
import {LostCityBoss} from '../game/lostcity-boss';
import {IceageBoss} from '../game/iceage-boss';
import {BeachBoss} from '../game/beach-boss';
import {DarkBoss} from '../game/dark-boss';
import {darkArmor,graveArt} from '../game/dark';
import {FutureBoss} from '../game/future-boss';
import {futureArmor} from '../game/future';
import {cowboyArmor} from '../game/cowboy';
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

type RigName = PlantKind |'abbot'|'abbotFlag'|'abbotTorch'|'abbotChi'|'abbotImp'|'monkDrink'|'kongfuHook'|'monk'|'monkFlag'|'monkBlade'|'monkNunchaku'|'monkTorch'|'monkImp'|'kongfuChi'|'kongfuBomb'|'kongfuDrink'|'kongfuGong'|'kongfuStatue'|'kongfuStrong'|'kongfuTorch'|'kongfuHammer'|'kongfuRocket'|'kongfu'|'kongfuFlag'|'zoybean'|'zoybeanGarg'|'lostPilotVeteran'|'lostCrystal'|'lostRelic'|'lostPorter'|'lostGargantuar'|'lostExcavator'|'lostJane'|'lostImp'|'lostcity'|'lostcityFlag'|'lostPilot'| 'iceageHunterVeteran'|'iceageTroglobiteVeteran'| 'iceageWeaselHoarder'|'iceageWeasel'|'iceageTroglobite'|'iceageDodo'|'iceageGargantuar'|'iceageHunter'|'iceageImp'|'iceage'|'iceageFlag'| 'beachFisher'|'beachOctopus'|'beachSurfer'|'beachSurferVeteran'|'beachSnorkel'|'beachGargantuar'|'beach'|'beachFemale'|'beachFlag'|'beachImp'| 'darkKingVeteran'| 'darkWizardVeteran'| 'darkKing'|'dragonImp'| 'darkWizard'| 'darkGargantuar'| 'dark'|'darkFlag'|'darkImp'|'darkJester'| 'jetpackVeteran'|'footballMech'|'futureGargantuar'|'discoMech'|'discoJetpack'|'future'|'futureFlag'|'futureJetpack'|'futureProtector'|'futureShield'|'futureImp'|'mechCone'| 'blackBull'|'bull'|'cowboyGargantuar'|'cowboyImp'|'chickenFarmer'|'chicken'|'chickenPumpkin'| 'cowboy'|'cowboyFlag'|'prospector'|'poncho'|'piano'| 'pirateCaptain'|'pirateParrot'| 'barrelroller'|'pirateBarrel'|'pirateGargantuar'|'pirateImp'|'impCannon'| 'pirate'|'pirateFlag'|'swashbuckler'|'seagull'|'pelican'| 'boss' | 'torchlight' | 'pharaohWeak' | 'mummy' | 'ra' | 'camel' | 'camelTouch' | 'gargantuar' | 'imp' | 'explorer' | 'tombraiser' | 'pharaoh' | 'pharaohInner';
const RIGS: Record<RigName, { armature: string; idle: string; scale: number }> = {
  primalpeashooter:{armature:'PrimalPeashooter',idle:'Idle',scale:.55},firepeashooter:{armature:'FirePeashooter',idle:'Idle',scale:.55},iceageWeaselHoarder:{armature:'WeaselHorder',idle:'Walk_Hidden',scale:.51},iceageWeasel:{armature:'Weasel',idle:'Walk',scale:.51},
  solarsage:{armature:'SolarSage',idle:'Idle',scale:.55},abbot:{armature:'AbbotBasicZombie',idle:'Walk',scale:.51},abbotFlag:{armature:'AbbotFlagZombie',idle:'Walk',scale:.51},abbotTorch:{armature:'AbbotTorchZombie',idle:'Walk',scale:.51},abbotChi:{armature:'AbbotChi',idle:'Idle',scale:.51},abbotImp:{armature:'Imp',idle:'Walk',scale:.51},
  powerlily:{armature:'PowerLily',idle:'Idle',scale:.55},monkDrink:{armature:'MonkDrinkZombie',idle:'Walk',scale:.51},kongfuHook:{armature:'BronzeHook',idle:'Walk',scale:.51},peach:{armature:'Peach',idle:'Idle',scale:.55},monk:{armature:'MonkBasicZombie',idle:'Walk',scale:.51},monkFlag:{armature:'MonkFlagZombie',idle:'Walk',scale:.51},monkBlade:{armature:'MonkBladeZombie',idle:'Walk',scale:.51},monkNunchaku:{armature:'NunchakuZombie',idle:'Walk',scale:.51},monkTorch:{armature:'TorchMonkZombie',idle:'Walk',scale:.51},monkImp:{armature:'Imp',idle:'Walk',scale:.51},
  lychee:{armature:'Lychee',idle:'Idle',scale:.55},turnip:{armature:'Turnip',idle:'Idle0',scale:.55},kongfuChi:{armature:'ChiZombie',idle:'Walk',scale:.51},bambooshoot:{armature:'BambooShoot',idle:'Idle',scale:.55},kongfuBomb:{armature:'BombZombie',idle:'Walk',scale:.51},kongfuDrink:{armature:'DrinkZombie',idle:'Walk',scale:.51},kongfuGong:{armature:'GongZombie',idle:'Walk',scale:.51},kongfuStatue:{armature:'BronzeStatue',idle:'Idle0',scale:.51},kongfuStrong:{armature:'BronzeStrong',idle:'Walk',scale:.51},kongfuTorch:{armature:'KongfuTorchZombie',idle:'Walk',scale:.51},kongfuHammer:{armature:'HammerZombie',idle:'Walk',scale:.51},kongfuRocket:{armature:'Imp',idle:'Walk',scale:.51},kongfu:{armature:'KongfuBasicZombie',idle:'Walk',scale:.51},kongfuFlag:{armature:'KongfuFlagZombie',idle:'Walk',scale:.51},firegourd:{armature:'FireGourd',idle:'Idle1',scale:.55},lostPilotVeteran:{armature:'LostPilot_v',idle:'Walk',scale:.51},bloominghearts:{armature:'BloomingHearts',idle:'Idle',scale:.55},zoybeanpod:{armature:'ZoyBeanPod',idle:'Idle0',scale:.55},snowpea:{armature:'SnowPea',idle:'Idle',scale:.55},zoybean:{armature:'BasicZombie',idle:'Walk',scale:.51},zoybeanGarg:{armature:'Gargantuar',idle:'Walk',scale:.51},lostCrystal:{armature:'CrystalSkullZombie',idle:'Walk',scale:.51},toadstool:{armature:'ToadStool',idle:'Idle',scale:.55},lostRelic:{armature:'RelicHunter',idle:'Walk',scale:.51},lostPorter:{armature:'PorterImp',idle:'Walk',scale:.51},lostGargantuar:{armature:'Gargantuar',idle:'Walk',scale:.51},akee:{armature:'AKEE',idle:'Idle',scale:.55},lostExcavator:{armature:'Excavator',idle:'Walk_Shovel',scale:.51},lostJane:{armature:'Jane',idle:'Walk',scale:.51},lostImp:{armature:'Imp',idle:'Walk',scale:.51},gatling:{armature:'GatlingPea',idle:'Idle',scale:.55},lavaguava:{armature:'LavaGuava',idle:'Idle',scale:.55},lostcity:{armature:'BasicZombie',idle:'Walk',scale:.51},lostcityFlag:{armature:'FlagZombie',idle:'Walk',scale:.51},lostPilot:{armature:'LostPilot',idle:'Walk',scale:.51},
  endurian:{armature:'Endurian',idle:'Idle00',scale:.55},iceageHunterVeteran:{armature:'HunterVeteran',idle:'Walk',scale:.51},iceageTroglobiteVeteran:{armature:'TroglobiteVeteran',idle:'Walk',scale:.51},
  stunion:{armature:'Stunion',idle:'Idle',scale:.55},iceageTroglobite:{armature:'TroglobiteZombie',idle:'Walk',scale:.51},
  iceageDodo:{armature:'Dodo',idle:'Walk',scale:.51},iceageGargantuar:{armature:'Gargantuar',idle:'Walk',scale:.51},
  pepperpult:{armature:'PepperPult',idle:'Idle',scale:.55},iceageHunter:{armature:'Hunter',idle:'Walk',scale:.51},iceageImp:{armature:'Imp',idle:'Walk',scale:.51},
  iceage:{armature:'BasicZombie',idle:'Walk',scale:.51},iceageFlag:{armature:'FlagZombie',idle:'Walk',scale:.51},
  moonflower:{armature:'Moonflower',idle:'Idle',scale:.55},goldleaf:{armature:'GoldLeaf',idle:'Attack',scale:.55},ghostpepper:{armature:'GhostPepper',idle:'Idle0',scale:.55},coldsnapdragon:{armature:'ColdSnapdragon',idle:'Idle',scale:.55},seashooter:{armature:'SeaShooter',idle:'Idle_H',scale:.55},pineapple:{armature:'Pineapple',idle:'Idle0',scale:.55},hotpotato:{armature:'HotPotato',idle:'Attack',scale:.55},
  missiletoe:{armature:'MissileToe',idle:'Idle',scale:.55},seashroom:{armature:'SeaShroom',idle:'Idle',scale:.55},
  homingthistle:{armature:'HomingThistle',idle:'Idle',scale:.55},
  beachFisher:{armature:'FishermanZombie',idle:'Idle',scale:.51},
  beachOctopus:{armature:'OctopusZombie',idle:'Walk',scale:.51},
  beachSurferVeteran:{armature:'SurferZombie_v',idle:'Walk_Board',scale:.51},
  beachSurfer:{armature:'SurferZombie',idle:'Walk_Board',scale:.51},
  bowlingbulb:{armature:'BowlingBulb',idle:'Idle',scale:.55},tool_projectile_bowlingbulb1:{armature:'Prj0',idle:'Idle',scale:.55},tool_projectile_bowlingbulb2:{armature:'Prj1',idle:'Idle',scale:.55},tool_projectile_bowlingbulb3:{armature:'Prj2',idle:'Idle',scale:.55},tool_projectile_bowlingbulb_explode:{armature:'PrjFood',idle:'Idle',scale:.55},beachSnorkel:{armature:'SnorkelZombie',idle:'Walk',scale:.51},beachGargantuar:{armature:'Gargantuar',idle:'Walk',scale:.51},
  lilypad:{armature:'LilyPad',idle:'Idle',scale:.55},tanglekelp:{armature:'TangleKelp',idle:'Idle',scale:.55},beach:{armature:'BasicZombie',idle:'Walk',scale:.51},beachFemale:{armature:'BasicFemaleZombie',idle:'Walk',scale:.51},beachFlag:{armature:'FlagZombie',idle:'Walk',scale:.51},beachImp:{armature:'Imp',idle:'Walk',scale:.51},
  guacodile:{armature:'Guacodile',idle:'Idle',scale:.55},jackolantern:{armature:'JackOLantern',idle:'Idle',scale:.55},darkKingVeteran:{armature:'KingVeteran',idle:'Idle',scale:.51},scaredyshroom:{armature:'ScaredyShroom',idle:'Idle',scale:.55},chomper:{armature:'Chomper',idle:'Idle',scale:.55},floawerPot:{armature:'FloawerPot',idle:'Idle',scale:.55},darkWizardVeteran:{armature:'WizardVeteran',idle:'Walk',scale:.51},darkKing:{armature:'King',idle:'Idle',scale:.51},dragonImp:{armature:'Imp',idle:'Walk',scale:.51},peanut:{armature:'Peanut',idle:'Idle0',scale:.55},darkWizard:{armature:'Wizard',idle:'Walk',scale:.51},sunbean:{armature:'SunBean',idle:'Idle',scale:.55},darkGargantuar:{armature:'Gargantuar',idle:'Walk',scale:.51},fumeshroom:{armature:'FumeShroom',idle:'Idle',scale:.55},dark:{armature:'BasicZombie',idle:'Walk',scale:.51},darkFlag:{armature:'FlagZombie',idle:'Walk',scale:.51},darkImp:{armature:'Imp',idle:'Walk',scale:.51},darkJester:{armature:'Jester',idle:'Walk',scale:.51},
  applemortar:{armature:'AppleMortar',idle:'Idle',scale:.55},wasabiwhip:{armature:'WasabiWhip',idle:'Idle',scale:.55},electricblueberry:{armature:'ElectricBlueBerry',idle:'Idle00',scale:.55},pinkstarfruit:{armature:'PinkStarFruit',idle:'Idle',scale:.55},redstinger:{armature:'RedStinger',idle:'Idle',scale:.55},jetpackVeteran:{armature:'JetpackVeteran',idle:'Walk',scale:.51},powerplant:{armature:'TileTurnip',idle:'Idle',scale:.55},starfruit:{armature:'StarFruit',idle:'Idle',scale:.55},holonut:{armature:'InfiNut',idle:'Idle',scale:.55},footballMech:{armature:'MechFootball',idle:'Walk',scale:.51},powerplant_alpha:{armature:'TileTurnip',idle:'Idle',scale:.55},powerplant_beta:{armature:'TileTurnip',idle:'Idle',scale:.55},citron:{armature:'Citron',idle:'Idle',scale:.55},empea:{armature:'EMPeach',idle:'Idle',scale:.55},futureGargantuar:{armature:'Gargantuar',idle:'Walk',scale:.51},discoMech:{armature:'MechDisco',idle:'Walk',scale:.51},discoJetpack:{armature:'JetpackDisco',idle:'Walk',scale:.51},laser_bean:{armature:'LaserBean',idle:'Idle',scale:.55},blover:{armature:'Blover',idle:'Idle',scale:.55},future:{armature:'FutureBasic',idle:'Walk',scale:.51},futureFlag:{armature:'FutureFlag',idle:'Walk',scale:.51},futureJetpack:{armature:'JetpackZombie',idle:'Walk',scale:.51},futureProtector:{armature:'Protector',idle:'Walk',scale:.51},futureShield:{armature:'Shield',idle:'Idle',scale:.51},futureImp:{armature:'FutureImp',idle:'Walk',scale:.51},mechCone:{armature:'MechCone',idle:'Walk',scale:.51},
  shadowshroom:{armature:'ShadowShroom',idle:'Idle',scale:.55},stallia:{armature:'Stallia',idle:'Idle',scale:.55},hurrikale:{armature:'Hurrikale',idle:'Idle',scale:.55},sunshroom:{armature:'SunShroom',idle:'Idle_Small',scale:.55},puffshroom:{armature:'PuffShroom',idle:'Idle',scale:.55},banana:{armature:'BananaLauncher',idle:'Idle',scale:.55},electriccurrant:{armature:'ElectricCurrant',idle:'Idle',scale:.55},hypnoshroom:{armature:'HypnoShroom',idle:'Idle',scale:.55},blackBull:{armature:'Bull_Black',idle:'Walk',scale:.51},
  electricpeashooter:{armature:'ElectricPeashooter',idle:'Idle',scale:.55},magnetshroom:{armature:'MagnetShroom',idle:'Idle',scale:.55},magnifyinggrass:{armature:'MagnifyingGrass',idle:'Idle',scale:.55},
  tallnut:{armature:'TallNut',idle:'Idle0',scale:.55},bull:{armature:'Bull',idle:'Walk',scale:.51},wintermelon:{armature:'Melon-pult',idle:'Idle',scale:.55},cowboyGargantuar:{armature:'CowboyGargantuar',idle:'Walk',scale:.51},cowboyImp:{armature:'CowboyImp',idle:'Walk',scale:.51},chickenFarmer:{armature:'ChickenFarmerZombie',idle:'WalkWithChicken',scale:.51},chicken:{armature:'Chicken',idle:'IdleWalk',scale:.51},chickenPumpkin:{armature:'ChickenPumpkin',idle:'IdleWalk',scale:.51},
  cowboy:{armature:'CowboyBasic',idle:'Walk',scale:.51},cowboyFlag:{armature:'CowboyFlag',idle:'Walk',scale:.51},prospector:{armature:'ProspectorZombie',idle:'Walk',scale:.51},piano:{armature:'PianoZombie',idle:'Walk',scale:.51},poncho:{armature:'PonchoZombie',idle:'Walk',scale:.51},splitpea:{armature:'SplitPea',idle:'Idle',scale:.55},chilibean:{armature:'Chilibean',idle:'Idle',scale:.55},
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

interface Actor {knighted?:boolean; rootGrown?:boolean;rootCharged?:boolean; captured?:boolean;capturing?:boolean; root: Container; rig: PixiArmatureDisplay; kind: RigName; animation: string; actionAt: number; armor?: PixiArmatureDisplay; armorKind?:string; armLost: boolean; mask?:Graphics;camelFrame?:number;plank?:PixiArmatureDisplay;plankState?:string;plankAt?:number; death?: {cause:DeathCause|'plant';elapsed:number;fadeAt:number;fallAt:number} }
interface Fragment {rig:PixiArmatureDisplay;x:number;y:number;ground:number;vx:number;vy:number;spin:number;age:number;landed:number}

export class Scene {
  costumes:Record<string,number> = {};
  private textures=textureScope();
  readonly app = new Application();
  readonly art = new BattleArt();
  private clock = new WorldClock();
  private npcs = new Map<string,PixiArmatureDisplay>();
  private beachWater=new Graphics();
  private beachEdge?:PixiArmatureDisplay;
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
    if(config.world!=='pirate'&&config.world!=='cowboy'&&config.world!=='future'&&config.world!=='dark'&&config.world!=='beach'){const lawn=new Sprite(await this.textures.load(assetUrl(config.presentation.lawn)));lawn.width=1974;lawn.height=768;lawn.position.set(-340,-40);this.world.addChild(lawn);}
    this.world.addChild(this.highlight,this.actorLayer);
    this.actorLayer.sortableChildren = true;
    const actorNames=battleActors(level,plantActors) as RigName[];
    const artCount=await this.art.init(this.app,(done,total)=>progress(done+1,total+actorNames.length+1),config,plantActors,level,this.textures);
    if(config.world==='pirate'){
      const lawn=this.art.build('pirateLawn','Idle');lawn.scale.set(.5);lawn.position.set(449.645,344);this.world.addChildAt(lawn,0);this.lawnRigs.push(lawn);
      for(let row=0;row<5;row++){lawn.armature.getSlot(`DECKSHADE${row}`)!.displayIndex=level.planks!.includes(row)?0:-1;const deck=this.art.build('pirateLawn',level.planks!.includes(row)?'On':'Off',`Deck${row}`);deck.scale.set(.5);deck.position.set(449.645,344-[15.248,15.248,18.739,18.739,22.227][row]*.5);this.world.addChildAt(deck,row+1);this.lawnRigs.push(deck);}
      if(level.cannon){const guide=this.art.build('pirateLawn','Idle','CannonGuide');guide.scale.set(.5);guide.position.set(449.645,344);this.world.addChildAt(guide,6);this.lawnRigs.push(guide);}
    }
    if(config.world==='beach'){
      const lawn=this.art.build('beachLawn','Idle');lawn.scale.set(.5);lawn.position.set(449.645,344);this.world.addChildAt(lawn,0);this.lawnRigs.push(lawn);
      const water=new Container(),mask=new Graphics().rect(BOARD.left,BOARD.top,1200-BOARD.left,BOARD.rows*BOARD.cellHeight).fill(0xffffff);
      this.beachEdge=this.art.build('tide','Idle','waterUpper');this.beachEdge.scale.set(.5);water.addChild(this.beachWater,this.beachEdge,mask);water.mask=mask;const x=BOARD.left+level.tide!.start*BOARD.cellWidth;this.beachWater.rect(x,BOARD.top,Math.max(0,1200-x),BOARD.rows*BOARD.cellHeight).fill({color:0x29b9ce,alpha:.55});this.beachEdge.position.set(x,rowY(2)-35);this.world.addChildAt(water,1);this.lawnRigs.push(this.beachEdge);
      if(level.tide!.showMarker){
      const line=this.art.build('tideLine','idle');line.scale.set(.46);line.position.set(BOARD.left+(9-level.tide!.max)*BOARD.cellWidth,rowY(2)-35);this.world.addChildAt(line,2);this.lawnRigs.push(line);
      const sign=this.art.build('tideSign','Idle');sign.scale.set(.2);sign.position.set(line.x,BOARD.top+14);this.world.addChildAt(sign,3);this.lawnRigs.push(sign);
      }
      if(level.bowlingLine!==null){
        const x=BOARD.left+level.bowlingLine*BOARD.cellWidth;
        const line=this.art.build('bowlingLine','idle');line.scale.set(.46);line.position.set(x,rowY(2)-35);this.world.addChildAt(line,2);this.lawnRigs.push(line);
        const sign=this.art.build('bowlingSign','Idle');sign.scale.set(.2);sign.position.set(x,BOARD.top+14);this.world.addChildAt(sign,3);this.lawnRigs.push(sign);
      }
    }
    if(config.world==='dark'){const lawn=this.art.build('darkLawn','Idle');lawn.scale.set(.5);lawn.position.set(449.645,344);this.world.addChildAt(lawn,0);this.lawnRigs.push(lawn);}
    if(config.world==='kongfu'){const lawn=this.art.build('kongfuLawn','Idle');lawn.scale.set(.5);lawn.position.set(449.645,344);this.world.addChildAt(lawn,0);this.lawnRigs.push(lawn);}
    if(config.world==='lostcity'){const lawn=this.art.build(config.night?'lostcityNightLawn':'lostcityLawn','Idle');lawn.scale.set(.5);lawn.position.set(449.645,344);this.world.addChildAt(lawn,0);this.lawnRigs.push(lawn);}
    if(config.world==='iceage'){const lawn=this.art.build('iceageLawn','Idle');lawn.scale.set(.5);lawn.position.set(449.645,344);this.world.addChildAt(lawn,0);this.lawnRigs.push(lawn);}
    if(config.world==='future'){const lawn=this.art.build(config.night?'futureNightLawn':'futureLawn','Idle');lawn.scale.set(.5);lawn.position.set(449.645,344);this.world.addChildAt(lawn,0);this.lawnRigs.push(lawn);}
    if(config.world==='cowboy'){const lawn=this.art.build('cowboyLawn','Idle');lawn.scale.set(.5);lawn.position.set(449.645,344);this.world.addChildAt(lawn,0);this.lawnRigs.push(lawn);}
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
    if(name==='boss'&&this.art.campaign.actors.boss.group==='kongfu'&&armature===RIGS.boss.armature)armature=this.art.campaign.actors.boss.armature;
    if(name==='lostcity'&&armature==='BricksDrop')armature='Bricks_Drop';
    if(name==='lostPilotVeteran'&&armature==='head')armature='head_v';
    if(name==='beachSurferVeteran'&&armature==='head')armature='head_v';
    if(name==='beachSurferVeteran'&&armature==='arm')name='beachSnorkel';
    if(name==='darkWizardVeteran'&&(armature==='head'||armature==='arm'))armature+='_v';
    if((name==='monk'||name==='abbot')&&['Cone','Bucket','Helmet','Cone_Drop','Bucket_Drop','Helmet_Drop'].includes(armature))name='kongfu';
    if(name==='dark'&&armature==='Cone')armature='Corn';
    const rig = this.factory.buildArmatureDisplay(armature, name)!;
    rig.armature.clock = this.clock; return rig;
  }

  portrait(kind: PlantKind): string {
    const rig = this.rig(kind);
    rig.animation.play(kind === 'potatomine' ? 'Idle' : RIGS[kind].idle, 0);
    rig.armature.advanceTime(.01);
    if(Object.hasOwn(this.costumes,kind))applyCostume(rig.armature.getSlots(),this.costumes[kind]);
    if(!Object.hasOwn(this.costumes,kind)&&['scaredyshroom','fumeshroom','starfruit','electricpeashooter','magnetshroom','magnifyinggrass','shadowshroom','stallia','hurrikale','sunshroom','puffshroom','banana','electriccurrant','hypnoshroom'].includes(kind))for(const slot of rig.armature.getSlots())if(slot.name.startsWith('COS'))slot.displayIndex=-1;
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
    const events:Partial<Record<RigName,Record<string,string>>>={lostRelic:{swing:'swingSounds'},iceageDodo:{say:'saySounds',fly:'flyStartSounds',land:'landSounds',hit:'hitSounds',expl:'explSounds'},iceageGargantuar:{step:'stepSounds',swing:'swingSounds',smash:'smashSounds',afterSmash:'afterSmashSaySounds',impThrow:'ImpThrowSounds',deathPole:'deathPoleSounds',deathFall:'deathFallSounds'},beachSurferVeteran:{laugh:'laughSounds',death_splash:'deathFallSounds'},beachFisher:{preswing:'preswingSounds',swing:'swingSounds',Shoot:'tossSounds',pull:'pullSounds',hit:'hitSounds',splash:'splashSounds',splat:'splatSounds'},beachOctopus:{walk:'walkSounds',move:'moveSounds',grab:'grabSounds',swing:'swingSounds',reload:'reloadSounds'},beachSurfer:{laugh:'laughSounds',death_splash:'deathFallSounds'},darkKing:{music:'musicSounds',smash:'smashSounds',give:'giveSounds',attackSay:'attackSaySounds',puke:'pukeSounds',swallow:'swallowSounds',deathSay:'deathSaySounds',headPop:'headPopSounds'},darkGargantuar:{step:'stepSounds',deathPole:'deathPoleSounds',deathFall:'deathFallSounds',swing:'swingSounds',smash:'smashSounds',afterSmash:'afterSmashSaySounds'},jetpackVeteran:{steady:'steadySound',bounce:'bounceSound'},footballMech:{step:'stepSounds',deactivateFall:'deactivateFallSound',deathSound:'deathFallSound'},futureGargantuar:{step:'stepSounds',stepRise:'stepRiseSounds',rise:'riseSound',throw_prepare:'throwPrepareSound'},discoMech:{chew:'chewSounds',step:'stepSounds',pull:'pullSound'},discoJetpack:{steady:'steadySound',bounce:'bounceSound'},futureJetpack:{steady:'steadySound',bounce:'bounceSound'},futureProtector:{cut:'cutSounds',mouthOpen:'mouthOpenSound',mouthClose:'mouthCloseSound',armBack:'armBackSound'},futureImp:{walkStart:'hopSound',chew:'eatSound',deathFall:'deathFallSound',expand:'expandSound',mouthHitDeactivate:'mouthDeactivateSound',mouthHitActivate:'mouthActivateSound'},mechCone:{mouthOpen:'mouthOpenSounds',eatStart:'eatStartSounds',footStep:'footStepsSounds',curveSound:'curveSounds',deathFall:'deathFallSounds'},bull:{step:'stepSounds',deathSound:'deathSounds',brakeSound:'brakeSounds',impSteady:'impSteadySounds'},wintermelon:{Lob:'lobSound'},cowboyGargantuar:{step:'stepSounds',swing:'swingSounds',smash:'smashSounds',afterSmash:'afterSmashSaySounds',impThrow:'ImpThrowSounds',deathPole:'deathPoleSounds',deathFall:'deathFallSounds'},escaperoot:{unWrapSound:'unwrapQuickSounds'},spikerock:{attack:'attackSound'},threepeater:{ShootSound:'shootSound'},spikeweed:{attack:'attackSound'},springbean:{foodLeap:'foodLeapSound',foodBounce:'foodBounceSound'},impCannon:{Shoot:'ShootSound',Explode:'ExplodeSound'},pirateGargantuar:{steady:'steadySounds',step:'stepSounds',swing:'swingSounds',smash:'smashSounds',afterSmash:'afterSmashSaySounds',impThrow:'ImpThrowSounds',deathPole:'deathPoleSounds',deathFall:'deathFallSounds'},swashbuckler:{swing:'swingSounds'},snapdragon:{attackSound:'attackSound',flap:'flapSound',foodAttack:'foodSound'},coconutcannon:{Shoot:'shootSound',foodShoot:'shootFoodSound'},boss:{introSmashSound:'introSmashSound',introFallSound:'introFallSound',introSound:'introSound',spawnLandSound:'introLandSound',stepSound:'worldZombossMechStepSounds',moveSound:'worldZombossMechMoveSounds',mouthOpenSound:'worldZombossMechMouthOpenSounds',mouthCloseSound:'worldZombossMechMouthCloseSounds',leapSound:'worldZombossMechLeapStartSounds',landSound:'worldZombossMechLeapEndSounds',deathFallSound:'worldZombossMechDeathFallSounds',shootReadySound:'worldZombossMechShootRiseSounds',shootStart:'worldZombossMechShootSounds',shoot:'worldZombossMechPRJDropSounds',escape_trigger:'worldZombossEscapeTriggerSound'},snowdrop:{LobSound:'lobSound'},sapfling:{LobSound:'lobSound',sneeze:'sneezeSound',brush:'brushSound'},peapod:{ShootMega:'shootMegaSounds'},imitater:{sound:'imitateSound'},celerystalker:{hit:'hitSounds',foodSummon:'foodSounds'},parsnip:{hit:'snipSound',summon:'popSound'},repeater:{ShootSound:'shootSound',shootMega:'shootMegaSound'},kernelpult:{LobSound:'lobSound'},melonpult:{Lob:'lobSound'},bonkchoy:{attackAir:'attackAirSound',attackGoal:'attackGoalSound',attackHeavy:'defeatSound',foodAttack:'attackAirSound'},cabbagepult:{LobSound:'lobSound'},bloomerang:{ShootSound:'shootSound',catch:'catchSound'},iceburg:{explode:'deadSound',foodExplode:'foodBlastSound'},tombraiser:{puke:'pukeSound',throw:'throwSound'},gargantuar:{step:'stepSounds',swing:'swingSounds',smash:'smashSounds',afterSmash:'afterSmashSaySounds',impThrow:'ImpThrowSounds',deathPole:'deathPoleSounds',deathFall:'deathFallSounds'}};
    if(name==='blackBull')events.blackBull=events.bull;
    if(name==='boss'&&this.art.campaign.actors.boss.group==='cowboy'){
      Object.assign(events.boss!,{rollingSound:'rollingSound',expandSound:'expandSound',introBodyCallSound:'introBodyCallSound',loadMissileSound:'loadMissileSound',mouthCloseImpactSound:'worldZombossMechMouthCloseImpactSounds',summonFallSound:'worldZombossMechMouthOpenBodySounds'});
      delete events.boss!.mouthCloseSound;
      rig.addDBEventListener(EventObject.FRAME_EVENT,event=>{if(event.name==='expandSound')this.onSound('boss/expand2Sound');if(event.name==='loadMissileSound')this.onSound('boss/loadMissile2Sound');},this);
    }
    if(name==='boss'&&this.art.campaign.actors.boss.group==='dark'){
      Object.assign(events.boss!,{eyeBlopSound:'eyeblopSound',roarSound:'roarSounds',introSkySound:'introSkySounds',shade:'introFlyShadeSounds',introLand:'worldZombossMechStabSounds',introFireSound:'introFireSounds',introRoarSound:'introRoarSounds',deathRoarSound:'deathRoarSounds',fireSteadySound:'fireSteadySounds',fireShootSound:'fireShootSounds',fireEndSound:'fireEndSounds',stunStartSound:'magnetStartSounds',stunEndSound:'magnetEndSounds',rushStart:'rushStartSounds',rushEndSound:'rushEndSounds'});
    }
    if(name==='boss'&&this.art.campaign.actors.boss.group==='kongfu'){events.boss={bomb_knock:'bombKnockSounds',expl:'explodeSounds',shake:'shakeSounds',strike:'strikeSounds',throw:'throwSounds',imp:'throwImpSounds',fly:'flySounds',magic:'magicSounds',say:'saySounds',sayThrow:'sayThrowSounds',pat:'patSounds',landSound:'worldZombossMechLeapEndSounds',blackhole:'blackholeOpenSounds'};}
    if(name==='boss'&&this.art.campaign.actors.boss.group==='lostcity'){
      events.boss={flap:'flapSounds',introSound:'introSounds',introSay:'worldZombossSpawnSaySounds',balloonDeath:'balloonDeathSounds',triggerStart:'triggerSounds',triggerEnd:'triggerSounds',mouthOpen:'mouthOpenSounds',mouthClose:'mouthCloseSounds',engineBurst:'engineShootSounds',plane:'planeSounds',dropSound:'dropSounds',rushSay:'worldZombossStabSaySounds',deathFallSound:'worldZombossMechDeathFallSounds',escape_trigger:'worldZombossEscapeTriggerSound'};
    }
    if(name==='boss'&&this.art.campaign.actors.boss.group==='iceage'){
      events.boss={introSound:'introSounds',introRoarSound:'introRoarSounds',windBreathe:'windRoarSounds',summonReady:'tubeSummonExtendSounds',tubeExpand:'tubeSteelExtendSounds',summonStart:'summonStartHitSounds',summonEnd:'summonEndSaySounds',steelReturn:'tubeSteelReturnSounds',tubeSummonReturn:'tubeSummonReturnSounds',stunStartSound:'worldZombossStunStartSound',stunEndSound:'stunEndSounds',prjCreate:'prjCreateSounds',shootStartSound:'shootRoarSounds',shootSound:'shootBounceSounds',deathFallSound:'worldZombossMechDeathFallSounds',escape_trigger:'worldZombossEscapeTriggerSound'};
    }
    if(name==='boss'&&this.art.campaign.actors.boss.group==='beach'){
      events.boss={splashSound:'splashSounds',hitSound:'hitSounds',mouthMoveSound:'mouthMoveSounds',mouthMoveSmallSound:'mouthMoveSmallSounds',fanAppearSound:'fanAppearSound',igniteSound:'igniteSound',rushStartSound:'rushStartSounds',fanHideSound:'fanHideSound',rushEndSound:'rushEndSounds',introDiveSound:'introDiveSound',introAppearSound:'introAppearSound',coughSound:'coughSounds',deathRoarSound:'deathSharkSaySounds',teethFallSound:'teethFallSounds',diveSound:'diveSounds',appearSound:'appearSounds',cutSound:'cutSounds',summonSound:'summonSharkSaySounds',coughStartSound:'coughStartSounds',stunStartSound:'stunStartSharkSaySound',stunEndSound:'worldZombossStunEndSound',deathFallSound:'worldZombossMechDeathFallSounds',escape_trigger:'worldZombossEscapeTriggerSound'};
    }
    if(name==='boss'&&this.art.campaign.actors.boss.group==='future'){
      for(const key of ['stunStartSound','stunStartLandSound','stunEndSound','stunEndLandSound','mouthOpenBodyFallSound','mouthOpenBodyHitSound','mouthOpenSound','mouthCloseSound','mouthCloseBodyRiseSound','mouthCloseBodyCallSound','riseOnSound','riseOffSound','sparkSound','shootStartSound','shootBodyPushSound','shootBodyFallSound','eyeBackSound','shootMissilePushSound','deathStartSound','introSuckSound','introSuckHitSound'])events.boss![key]=key;
      events.boss!.headAppear='introFlySound';events.boss!.stepBackSound='stepBackSounds';
    }
    if(name==='boss'&&this.art.campaign.actors.boss.group==='pirate'){
      events.boss!.shoot='afterShootSound';
      rig.addDBEventListener(EventObject.FRAME_EVENT,event=>{if(event.name==='shoot')this.onSound('boss/addShootSounds');if(event.name==='shootReadySound')this.onSound('boss/waveBeforeShootSound');},this);
    }
    if(events[name])rig.addDBEventListener(EventObject.FRAME_EVENT,event=>{const key=events[name]![event.name];if(key)this.onSound(name+'/'+key);},this);
    if(name==='bull'||name==='blackBull')rig.addDBEventListener(EventObject.FRAME_EVENT,event=>{if(event.name==='playDeath')this.animate(actor,'Death',0,1);},this);
    if(name==='chickenFarmer')rig.addDBEventListener(EventObject.FRAME_EVENT,event=>{if(event.name==='chickenKill'){const slots=rig.armature.getSlots().filter(s=>s.name.includes('_CHICK'));if(slots.some(s=>s.displayIndex>=0)){for(const slot of slots)slot.displayIndex=-1;this.chickenFeathers(actor,-id,'PlaySky');}}},this);
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
    if (plant.kind === 'tallnut') return `Idle${3-Math.ceil(plant.hp/game.props.plants.tallnut.Toughness*3)}`;
    if (plant.kind === 'wallnut') return `Idle${5-Math.ceil(plant.hp/game.props.plants.wallnut.Toughness*4)}`;
    if (plant.kind === 'potatomine') return plant.age<14/30?'Spawn_Baby':plant.age < game.props.plants.potatomine.ChargeTime ? 'Idle_Baby' : 'Idle';
    return 'Idle';
  }

  sync(game: Game, dt: number) {
    this.conveyorLayer.visible=!!game.level.conveyor&&(!game.level.corral||game.corralWaiting);
    if(game.escape.selected!==null){
      if(!this.rootLocator){this.rootLocator=this.rig('escaperoot','Locator');this.rootLocator.scale.set(.55);this.rootLocator.animation.play('Idle',0);this.rootLocator.zIndex=2000;this.actorLayer.addChild(this.rootLocator);}
      this.rootLocator.visible=true;this.rootLocator.position.set(...this.pointer);
    }else if(this.rootLocator)this.rootLocator.visible=false;
    const alive = new Set<number>();
    for (const p of game.plants) {
      alive.add(p.id);
      const actor = this.actors.get(p.id) ?? this.addActor(p.id, p.kind);
      actor.root.position.set(cellX(p.column), rowY(p.row)); actor.root.zIndex = rowY(p.row);
      if(p.kind==='lilypad')actor.root.zIndex-=1;
      if(p.kind==='floawerPot'){actor.root.zIndex-=1;const moving=game.darkPlants.states.get(p.id)!.moving;if(moving){const t=Math.min(1,(game.time-moving.at)/game.props.plants.floawerPot.MoveToPosTime),e=1-(1-t)**2;actor.root.position.set(moving.x+(cellX(p.column)-moving.x)*e,moving.y+(rowY(p.row)-moving.y)*e-70*4*t*(1-t));}}
      else if(game.plants.some(q=>q.kind==='floawerPot'&&q.row===p.row&&q.column===p.column))actor.root.y-=40;
      if(p.leap){const t=Math.min(1,(game.time-p.leap.at)/(p.leap.duration??(p.kind==='chilibean'||p.kind==='turnip'?.8:.5)));actor.root.position.set(p.leap.x+(cellX(p.column)-p.leap.x)*t,p.leap.y+(rowY(p.row)-p.leap.y)*t-(p.leap.pushed&&Math.abs(cellX(p.column)-p.leap.x)===BOARD.cellWidth?0:100)*4*t*(1-t));}
      if(p.kind==='escaperoot')actor.rootGrown=p.rootGrown;
      if(p.kind==='sunshroom')actor.rig.scale.set(.55*[.6,.8,1][game.westFinale.states.get(p.id)!.stage]);
      if(p.kind==='bonkchoy')actor.rig.scale.x=RIGS.bonkchoy.scale*(p.facing??1);
      actor.root.visible=p.sheep===undefined;
      if(game.kongfu.peach.protected(p))actor.rig.tint=0xffd5ef;else if(p.kind==='peach'||game.kongfu.peach.shields.has(p.id))actor.rig.tint=0xffffff;
      if(p.kind==='lychee'){const s=game.kongfu.lychee.states.get(p.id)!;for(const slot of actor.rig.armature.getSlots())if(slot.name.startsWith('SHELL'))slot.displayIndex=Number(slot.name[5])===s.stage?(s.fooded?1:0):-1;}
      if(p.kind==='peanut')actor.rig.armature.getSlot('ARMOR')!.displayIndex=p.armor>0?(p.armor>game.props.plants.peanut.ArmorToughness*2/3?0:p.armor>game.props.plants.peanut.ArmorToughness/3?1:2):-1;
      actor.rig.animation.timeScale=game.corralWaiting||(p.kind!=='hotpotato'&&game.iceage.blocked(p))||p.sheep!==undefined?0:game.darkPlants.handles(p.kind)?game.darkPlants.rate(p):game.future.handles(p.kind)?game.future.rate(p):game.western.handles(p.kind)?game.western.rate(p):game.finale.handles(p.kind)?game.finale.rate(p):p.kind==='coconutcannon'&&['Shoot','Food'].includes(p.animation!)?2:p.kind==='parsnip'&&p.action==='shoot'?Math.max(1,1/game.props.plants.parsnip.AttackInterval):p.kind==='iceburg'&&p.action==='food'?.8:1;
      const animation = this.plantAnimation(p, game);
      this.animate(actor, animation, p.action === 'idle'&&p.kind!=='endurian' ? 0 : p.actionAt, p.kind==='toadstool'?(['Idle','Chew','AttackLoop'].includes(animation)?0:1):animation==='FoodBig'?1:p.action==='food'&&(p.kind==='sunflower'||p.kind==='twinsunflower')?game.props.plants[p.kind].PlantfoodTime: ['shoot','produce','grow','explode','catch'].includes(p.action)||p.action==='food'&&['endurian','cabbagepult','iceburg','wallnut'].includes(p.kind)||animation==='Spawn_Baby'?1:0);
    }
    for(const bomb of game.escape.bombs){
      alive.add(bomb.id);const actor=this.actors.get(bomb.id)??this.addActor(bomb.id,'escaperoot');
      actor.root.position.set(cellX(bomb.column),rowY(bomb.row));actor.root.zIndex=rowY(bomb.row);
      this.animate(actor,bomb.animation,bomb.at,1);
    }
    for (const z of [...game.zombies,...game.westFinale.allies]) {
      alive.add(z.id);
      if(game.boss?.zombie===z){
        const boss=game.boss,actor=this.actors.get(z.id)??this.addActor(z.id,'boss');
        actor.root.position.set(z.x,boss.y-boss.height);actor.root.zIndex=boss.y+1;
        actor.rig.animation.timeScale=boss.rate;
        this.animate(actor,boss.animation,boss.animationSerial,['Idle','SummonLoop','Summonning','Stunning','Leaping','StunLoop','CoughLoop','MagnetLoop','RushLoop'].includes(boss.animation)?0:1);
        continue;
      }
      let actor=this.actors.get(z.id);
      if(actor&&(actor.kind==='camel'&&!isCamel(z.kind)||(actor.kind==='pharaoh'||actor.kind==='pharaohWeak')&&z.kind==='pharaoh_inner')){
        this.shedShell(z.id,actor);actor=undefined;
      }
      if(actor&&(z.kind.startsWith('kongfu')||z.kind.startsWith('monk')||z.kind.startsWith('abbot'))&&actor.kind!==zombieRig(z.kind)){this.removeActor(z.id,actor);actor=undefined;}
      actor=actor??this.addActor(z.id,zombieRig(z.kind),z.kind==='mummy_flag');
      actor.knighted=z.knighted;actor.root.alpha=game.dark.invisible(z)?.25:1;
      const potionScale=game.dark.scale(z);actor.root.scale.set((z.reversed?-1:1)*potionScale,potionScale);
      actor.root.position.set(z.x, (game.iceage.slides.has(z.id)?game.iceage.y(z):zombieY(z))-(z.parrot?.height??0)); actor.root.zIndex = zombieY(z) + 1;
      if(z.parrot){
        if(z.parrot.capture>0&&!actor.capturing)this.onSound('pirateParrot/captureSound');actor.capturing=z.parrot.capture>0;
        const p=z.parrot.carrying;if(p){alive.add(p.id);const carried=this.actors.get(p.id)??this.addActor(p.id,p.kind);carried.captured=true;carried.root.position.set(z.x,z.parrot.y-z.parrot.height+50);carried.root.zIndex=z.parrot.y;carried.rig.animation.timeScale=0;}
      }
      actor.rig.animation.timeScale=game.corralWaiting||game.iceage.blocks.some(b=>b.zombie===z)||game.time<z.frozenUntil||z.stunnedUntil!==undefined&&game.time<z.stunnedUntil||z.butteredUntil!==undefined&&game.time<z.butteredUntil?0:game.time<z.chilledUntil?.5:(z.kind==='seagull'||z.kind==='pelican')?1.5:1;
      actor.rig.animation.timeScale*=Math.pow(1.5,z.dark?.speed??0);
      actor.rig.tint=game.westFinale.allies.includes(z)&&!z.kind.startsWith('zoybean')?0xd990ff:z.poison?0xa4e25b:game.time<(z.perfumeUntil??0)?0xcd9ae0:game.time<z.frozenUntil||game.time<z.chilledUntil?0x9ce8ff:z.food?0xb0ff83:z.dark?.toughness?0xd7aaff:z.dark?.speed?0xffbf80:z.dark?.bean?0xffef7f:0xffffff;
      const entering=z.entry!=='walk'&&game.time-z.entryAt<(z.entry==='ground'?1.35:1);
      if(z.entry==='ground'){
        if(entering&&!actor.mask){actor.mask=new Graphics().rect(-130,-250,260,250).fill(0xffffff);actor.root.addChild(actor.mask);actor.root.mask=actor.mask;}
        actor.rig.y=entering?120*Math.pow(1-Math.min(1,(game.time-z.entryAt)),2):0;
        if(!entering&&actor.mask){actor.root.mask=null;actor.mask.destroy();actor.mask=undefined;}
      }
      if(z.kind==='beach_snorkel'&&!entering){
        const depth=game.beach.inWater(z)?(game.beach.diving(z)?50:25)*.51:0;
        actor.rig.y=depth;
        if(depth&&!actor.mask){actor.mask=new Graphics().rect(-130,-250,260,250).fill(0xffffff);actor.root.addChild(actor.mask);actor.root.mask=actor.mask;}
        if(!depth&&actor.mask){actor.root.mask=null;actor.mask.destroy();actor.mask=undefined;}
      }
      if(z.pilot?.animation==='Arrive')actor.root.y-=600*Math.max(0,1-(game.time-z.pilot.at)/z.pilot.fallTime);
      if(z.leap){const t=Math.min(1,(game.time-z.leap.at)/(z.leap.duration??.5));actor.root.y=z.leap.fromY+(rowY(z.leap.toRow)-z.leap.fromY)*t-(z.west?.blockedByTallnut?0:z.kind==='prospector'?150:90)*Math.sin(t*Math.PI);}
      if(isCamel(z.kind)&&!isMatchCamel(z.kind))actor.camelFrame=z.camelPart*3+(z.armor<125?2:z.armor<250?1:0);
      const swingAnimation=z.swing?(game.time<z.swing.judge?'SwingBack':z.swing.failure?'SwingFailure':'SwingSuccess'):null;
      const absorbAnimation={idle:'Walk',start:'AbsorbStart',loop:'Absorbing',end:'AbsorbEnd'}[z.absorbState];
      const special=game.specialZombies.get(z.id);
      const specialAnimation=special?.action==='smash'?'Smash':special?.action==='throw'||special?.action==='bone'?'Throw':null;
      if(special?.action==='throw'&&actor.animation!=='Throw')this.onSound('gargantuar/ImpThrowSaySounds');
      const westAnimation=game.corralWaiting?'Idle':z.west?.poisonAt!==undefined&&game.time-z.west.poisonAt>=2?'Idle':z.west?.animation??(z.west?.bullThrown&&z.leap?'FlyHorizontal':null)??(z.kind==='piano'?'Walk':z.west?.dance&&!z.eating?'Dance':null);
      const king=game.dark.kings.get(z.id),wizard=game.dark.wizards.get(z.id),jester=game.dark.jesters.get(z.id),darkAnimation=jester&&jester.animation!=='Walk'?jester.animation:null;
      const dodoAnimation=z.dodo&&z.dodo.animation!=='Walk'?z.dodo.animation:null;
      const troglobite=game.iceageCombat.troglobites.get(z.id);
      const bugAnimation=z.bug&&(z.bug.hp>0||z.bug.animation==='Land')?(['Land','Rise_Bug','Unrise_Bug'].includes(z.bug.animation)?z.bug.animation:entering?'Idle_Bug':z.eating?'Eat_Bug':z.bug.animation):null;
      this.animate(actor,game.kongfu.animation(z)??(z.zoySpawnAt!==undefined&&game.time<z.landUntil!?'Spawn':null)??(game.lostcity.crystals.has(z.id)&&game.lostcity.crystals.get(z.id)!.animation!=='Walk'?game.lostcity.crystals.get(z.id)!.animation:null)??(z.tentSpawnAt!==undefined&&game.time<z.landUntil!?'Spawn':null)??bugAnimation??(game.lostcity.shovels.get(z.id)?.held||game.lostcity.shovels.get(z.id)?.animation==='Lose'?game.lostcity.shovels.get(z.id)!.animation:null)??(z.pilot&&z.pilot.animation!=='Walk'?z.pilot.animation:null)??(z.weasel?.exploding?'Explode':z.weasel?.hidden?(entering?'Idle_Hidden':z.eating?'Eat_Hidden':'Walk_Hidden'):null)??(troglobite?.pushing?'Push':null)??dodoAnimation??(game.iceageCombat.veteranHunters.get(z.id)?.throwing?'Throw':game.iceageCombat.veteranHunters.get(z.id)?.cooldown!>0?'Idle':null)??(game.iceageCombat.hunters.get(z.id)?.throwing?'Throw':null)??z.fisher?.animation??(z.octopus?.animation==='Throw'?'Throw':null)??(z.surfer&&(z.surfer.board>0||z.surfer.animation==='Fall'||z.surfer.animation==='Stab')?z.surfer.animation:null)??king?.animation??(wizard?.animation==='Attack'?'Attack':null)??darkAnimation??z.future?.animation??westAnimation??(z.parrot?'Flying':null)??z.pirate?.animation??(z.kind==='barrelroller'&&z.barrel!==undefined?(z.eating?'Eat_Barrel':'Walk_Barrel'):null)??swingAnimation??(z.kind==='pharaoh_inner'&&z.landUntil!==undefined&&game.time<z.landUntil?'Idle':z.leap&&(z.kind==='lostcity_imp'||z.kind==='iceage_imp'||z.kind==='beach_imp'||z.kind==='dark_imp'||z.kind==='egypt_imp'||z.kind==='pirate_imp'||z.kind==='west_bullrider')?'Fly':(z.kind==='lostcity_imp'||z.kind==='iceage_imp'||z.kind==='beach_imp'||z.kind==='dark_imp'||z.kind==='egypt_imp'||z.kind==='pirate_imp'||z.kind==='west_bullrider')&&z.landUntil!==undefined&&game.time<z.landUntil?'Land':specialAnimation??(entering?'Idle':z.kind==='ra'&&z.absorbState!=='idle'?absorbAnimation:z.eating?'Eat':z.kind==='chicken_farmer'&&z.west?.chickens?'WalkWithChicken':z.kind==='chicken'||z.kind==='chicken_pumpkin'?'IdleWalk':'Walk')),game.kongfu.animation(z)?z.kongfu!.at:z.zoySpawnAt!==undefined&&game.time<z.landUntil!?z.zoySpawnAt:game.lostcity.crystals.has(z.id)?game.lostcity.crystals.get(z.id)!.at:z.tentSpawnAt!==undefined&&game.time<z.landUntil!?z.tentSpawnAt:bugAnimation?z.bug!.at:game.lostcity.shovels.has(z.id)?game.lostcity.shovels.get(z.id)!.at:z.pilot&&z.pilot.animation!=='Walk'?z.pilot.at:z.weasel?.exploding?z.weasel.at:troglobite?.pushing?troglobite.at:dodoAnimation?z.dodo!.at:game.iceageCombat.veteranHunters.get(z.id)?.throwing?game.iceageCombat.veteranHunters.get(z.id)!.at:game.iceageCombat.hunters.get(z.id)?.throwing?game.iceageCombat.hunters.get(z.id)!.at:z.fisher?z.fisher.at:z.octopus?.animation==='Throw'?z.octopus.at:z.surfer?z.surfer.at:king?king.at:wizard?.animation==='Attack'?wizard.at:darkAnimation?jester!.at:z.future?z.future.at:z.west?.animation?z.west.at:z.pirate?z.pirate.at:swingAnimation?z.swing!.at:specialAnimation?special!.at:0,z.weasel?.exploding?1:troglobite?.pushing?1:dodoAnimation&&dodoAnimation!=='FlyLoop'?1:z.fisher&&!['Idle','AttackLoop'].includes(z.fisher.animation)?1:z.octopus?.animation==='Throw'?1:z.surfer&&(z.surfer.animation==='Fall'||z.surfer.animation==='Stab')?1:(z.kind==='west_bull'||z.kind==='west_bull_veteran'||z.kind==='west_bullrider')&&z.west?.animation&&z.west.animation!=='Rush'?1:z.pirate&&!['Idle','Walk'].includes(z.pirate.animation)?1:swingAnimation?1:special?.action==='bone'?2:specialAnimation?1:z.absorbState==='start'||z.absorbState==='end'?1:0);

      if(z.kind==='kongfu_bomb')for(const slot of actor.rig.armature.getSlots()){if(slot.name.includes('SPK'))slot.displayIndex=z.kongfu!.ignited?0:-1;if(slot.name.includes('BOMB'))slot.displayIndex=z.kongfu!.bomb?0:-1;}
      if((actor.kind==='kongfu'||actor.kind==='monk'||actor.kind==='abbot'))actor.rig.armature.getSlot('HELMET_THERE_HEAD')!.displayIndex=(z.kind==='kongfu_armor3'||z.kind==='monk_armor3'||z.kind==='abbot_armor3')&&z.armor>game.props.armors.kongfu_armor3.Toughness/3?0:-1;
      if(z.kind==='kongfu_bronze_strong')for(const slot of actor.rig.armature.getSlots())if(slot.name.includes('_BP'))slot.displayIndex=z.hp<game.props.zombies[z.kind].Toughness/2?1:0;
      if(z.kind==='kongfu_torch'||z.kind==='monk_torch')for(const slot of actor.rig.armature.getSlots())if(slot.name.includes('FIRE'))slot.displayIndex=z.kongfu!.torch?0:-1;
      if(z.kind==='kongfu_rocket_imp')actor.rig.armature.getSlot('BODY')!.displayIndex=z.kongfu!.rocket?1:0;
      if(actor.plank){const card=game.camelCards.get(z.id)!;
        if(actor.plankState!==card.state||actor.plankAt!==card.at){actor.plank.animation.play(card.state==='back'?'FlipBack':card.state==='face'?'FlipFace':'Match',1);actor.plankState=card.state;actor.plankAt=card.at;}
        actor.plank.armature.getSlot('icon')!.displayIndex=card.face;actor.plank.armature.getSlot('type')!.displayIndex=z.camelPart;
      }
      if(z.kind==='monk_drink')for(const slot of actor.rig.armature.getSlots())if(slot.name.includes('_DRUNK'))slot.displayIndex=z.kongfu!.drunk?0:-1;
    if(['abbot','abbotFlag','abbotTorch','abbotChi','abbotImp','monkDrink','monk','monkFlag','monkBlade','monkNunchaku','monkTorch','monkImp','kongfuChi','kongfuBomb','kongfuDrink','kongfuGong','kongfuTorch','kongfuHammer','kongfuRocket','kongfu','kongfuFlag','lostExcavator','lostJane','lostImp','lostcity','lostcityFlag','lostPilot','iceageHunterVeteran','iceageTroglobiteVeteran','iceageWeaselHoarder','iceageTroglobite','iceageHunter','iceageImp','iceage','iceageFlag','beach','beachFemale','beachFlag','beachImp','dark','darkFlag','darkImp','darkJester','future','futureFlag','jetpackVeteran','futureJetpack','discoJetpack','chickenFarmer','cowboyImp','cowboy','cowboyFlag','prospector','poncho','piano','pirateCaptain','pirate','pirateFlag','swashbuckler','mummy','ra','explorer','torchlight','tombraiser','imp','pharaohInner'].includes(actor.kind)&&!actor.armLost&&z.hp<=game.props.zombies[z.kind].Toughness*((z.kind==='kongfu_drink'||z.kind==='monk_drink')?.25:this.art.catalog.presentation.armDropHealthFraction)){actor.armLost=true;this.dropFragment(actor,'arm');this.onSound('zombieLimbPop');}
      if((actor.kind==='dark'||(actor.kind==='kongfu'||actor.kind==='monk'||actor.kind==='abbot'))&&actor.armor&&actor.armorKind!==(z.knighted?'dark_armor3':z.kind)){actor.armor.removeFromParent();actor.armor.dispose();actor.armor=undefined;}
      if ((z.knighted||(actor.kind==='kongfu'||actor.kind==='monk'||actor.kind==='abbot')||actor.kind==='zoybean'||actor.kind==='lostcity'||actor.kind==='iceage'||actor.kind==='beach'||actor.kind==='beachFemale'||actor.kind==='dark'||actor.kind==='mummy'||actor.kind==='pirate'||actor.kind==='cowboy'||actor.kind==='future')&&z.armor > 0 && !actor.armor) {
        actor.armor = this.rig(z.knighted?'dark':actor.kind, z.knighted||((z.kind==='kongfu_armor3'||z.kind==='monk_armor3'||z.kind==='abbot_armor3')||z.kind==='dark_armor3'||z.kind==='iceage_armor3')?'Helmet':z.kind.endsWith('_armor4')?'Bricks':z.kind.endsWith('_armor2')?'Bucket':'Cone'); actor.armor.scale.set(.51); actor.root.addChild(actor.armor);actor.armorKind=z.knighted?'dark_armor3':z.kind;
      }
      if (actor.armor) {
        if(actor.armor.visible&&z.armor<=0&&!z.magnetized){this.dropFragment(actor,z.knighted||((z.kind==='kongfu_armor3'||z.kind==='monk_armor3'||z.kind==='abbot_armor3')||z.kind==='dark_armor3'||z.kind==='iceage_armor3')?'Helmet':z.kind.endsWith('_armor4')?'Bricks':z.kind.endsWith('_armor2')?'Bucket':'Cone');this.onSound('zombieLimbPop');}
        actor.armor.visible = z.armor > 0;
        const max=kongfuArmor(z.kind)?game.props.armors[kongfuArmor(z.kind)!].Toughness:lostcityArmor(z.kind)?game.props.armors[lostcityArmor(z.kind)!].Toughness:iceageArmor(z.kind)?game.props.armors[iceageArmor(z.kind)!].Toughness:beachArmor(z.kind)?game.props.armors[beachArmor(z.kind)!].Toughness:z.knighted?game.props.armors.dark_armor3.Toughness:darkArmor(z.kind)?game.props.armors[darkArmor(z.kind)!].Toughness:futureArmor(z.kind)?game.props.armors[futureArmor(z.kind)!].Toughness:cowboyArmor(z.kind)?game.props.armors[cowboyArmor(z.kind)!].Toughness:pirateArmor(z.kind)?game.props.armors[pirateArmor(z.kind)!].Toughness:z.kind==='mummy_armor4'?game.props.armors.egypt_armor4.Toughness:z.kind==='mummy_armor2'?game.props.armors.egypt_armor2.Toughness:game.props.armors.egypt_armor1.Toughness;
        const animation = z.armor > max*2/3 ? 'Broken0' : z.armor > max/3 ? 'Broken1' : 'Broken2';
        if (actor.armor.animation.lastAnimationName !== animation) actor.armor.animation.play(animation, 0);
      }
    }
    for(const death of game.deaths)if(!this.seenDeaths.has(death.zombie.id)){this.seenDeaths.add(death.zombie.id);this.killZombie(death,game);}
    for (const [id, actor] of this.actors) if (!alive.has(id)&&!actor.death&&PLANT_KINDS.includes(actor.kind as PlantKind)) {
      if(actor.kind==='powerlily'||actor.kind==='hotpotato'||actor.kind==='goldleaf'||actor.kind==='ghostpepper'&&actor.animation==='Death'||actor.kind==='tanglekelp'||actor.kind==='guacodile'||actor.kind==='powerplant'||actor.kind==='powerplant_alpha'||actor.kind==='powerplant_beta'||actor.kind==='empea'||actor.kind==='blover'&&actor.animation==='Death'||actor.kind==='hurrikale'||actor.kind==='stallia'&&actor.animation==='Death'||(actor.kind==='puffshroom'||actor.kind==='seashroom')&&actor.animation==='Fade'||actor.kind==='escaperoot'&&(id<0||actor.rootGrown)||actor.captured||actor.kind==='imitater'||actor.kind==='cherry_bomb'||actor.kind==='jalapeno'||actor.kind==='gravebuster'||actor.animation==='Charging'||actor.kind==='iceburg'&&actor.animation==='Death'||game.effects.some(effect=>effect.kind==='remove'&&effect.x===actor.root.x&&effect.y===actor.root.y)){this.removeActor(id,actor);continue;}
      const animation=actor.kind==='turnip'?'Death'+game.kongfu.turnip.states.get(id)!.stage:actor.kind==='zoybeanpod'?'Death'+actor.animation.at(-1):actor.kind==='endurian'||actor.kind==='pineapple'?'Death3':actor.kind==='seashooter'&&actor.animation.endsWith('_H')?'Death_H':actor.kind==='scaredyshroom'&&actor.animation.startsWith('Hid')?'DeathHiding':actor.kind==='floawerPot'&&actor.animation.includes('Iron')?'Death_Iron':actor.kind==='peanut'?(/(?:Idle|Shoot)[23]/.test(actor.animation)?'Death23':'Death01'):actor.kind==='redstinger'?(actor.root.x>=cellX(6)?'Death_Hide':actor.root.x>=cellX(3)?'Death_Scared':'Death'):(actor.kind==='banana'||actor.kind==='missiletoe')&&actor.animation==='IdleSad'?'DeathSad':actor.kind==='escaperoot'?'Baby_Death':(actor.kind==='wallnut'||actor.kind==='tallnut')?actor.animation.replace('Idle','Death'):actor.kind==='potatomine'?'Death_Baby':actor.kind==='magnetshroom'&&['Resting','AbsorbEnd'].includes(actor.animation)?'DeathDark':'Death';
      const timeline=animationTimeline(this.skeletons.get(actor.kind)!,RIGS[actor.kind].armature,animation);
      this.animate(actor,animation,0,1);actor.death={cause:'plant',elapsed:0,fadeAt:timeline.duration,fallAt:Infinity};
    }
    this.updateFoodLights(game);
    this.clock.advanceTime(dt); this.art.clock.advanceTime(dt); PixiFactory.advanceTime(0);
    this.updateDeaths(dt);
    for(const z of game.zombies)if(z.future){
      const actor=this.actors.get(z.id)!,state=z.future;
      if(z.kind==='future_gargantuar'&&!state.imp)for(const slot of actor.rig.armature.getSlots())if(slot.name.includes('_IMP'))slot.displayIndex=-1;
      if(z.kind==='future_imp'&&!z.leap&&state.animation==='Fall')actor.root.y=rowY(z.row)-600*Math.pow(Math.max(0,1-(game.time-z.entryAt)),2);
      if(z.kind==='future_protector_shield'){
        const master=game.zombies.find(m=>m.id===state.master)!;
        for(const slot of actor.rig.armature.getSlots())if(slot.name.includes('U')||slot.name.includes('D')){if(slot.name.includes('U')&&z.row!==Math.max(0,master.row-1)||slot.name.includes('D')&&z.row!==Math.min(4,master.row+1))slot.displayIndex=-1;}
      }
      if(z.kind==='football_mech'||z.kind==='mech_cone'||z.kind==='future_protector'||z.kind==='disco_mech'){
        const stage=Math.min(6,Math.floor(7*(1-z.hp/game.props.zombies[z.kind].Toughness)));
        for(const slot of actor.rig.armature.getSlots()){const part=/_bp(\d)/.exec(slot.name);if(part)slot.displayIndex=z.kind!=='future_protector'?stage===Number(part[1])?0:-1:stage>Number(part[1])?0:-1;if(z.kind==='future_protector'&&slot.name==='hat')slot.displayIndex=state.shield===undefined?0:1;}
      }
    }

    for(const [id,actor] of this.actors){
      if(Object.hasOwn(this.costumes,actor.kind))applyCostume(actor.rig.armature.getSlots(),this.costumes[actor.kind]);
      const state=game.specialZombies.get(id);
      if(actor.kind==='puffshroom'&&!actor.death){const p=game.plants.find(p=>p.id===id)!,life=game.westFinale.states.get(id)!.life;actor.rig.armature.getSlot('head')!.displayIndex=life>40?0:life>20?1:2;actor.root.alpha=p.action!=='food'&&life<10&&life>0&&Math.floor(4*life)%4===1?100/255:1;}
      if(actor.kind==='chomper'&&!actor.death){const count=game.darkPlants.states.get(id)!.chews.length;for(const slot of actor.rig.armature.getSlots()){if(['ARM1','ARM1_','HAND1','HAND1_'].includes(slot.name))slot.displayIndex=count>=1?0:-1;if(['ARM2','ARM2_','HAND2','HAND2_'].includes(slot.name))slot.displayIndex=count>=2?0:-1;}}
      for(const slot of actor.rig.armature.getSlots()){
        if(actor.kind==='bowlingbulb'&&!actor.death){const ball=/_B([012])_([MH])/.exec(slot.name);if(ball){const loaded=game.beach.bowling.states.get(id)!.loaded[Number(ball[1])];slot.displayIndex=(ball[2]==='M'?loaded:!loaded)?0:-1;}}
        if(actor.kind==='beachFisher'&&!actor.death&&slot.name.endsWith('_HK')){const z=game.zombies.find(z=>z.id===id)!;if(z.fisher!.hook)slot.displayIndex=-1;}
        if((actor.kind==='beachSurfer'||actor.kind==='beachSurferVeteran')&&!actor.death&&slot.name.includes('BOARD')&&slot.childArmature){const state=[...game.zombies,...game.westFinale.allies].find(z=>z.id===id)!.surfer!;for(const part of slot.childArmature.getSlots())part.displayIndex=state.board>0?game.beach.surfers.stage(state.board,actor.kind==='beachSurferVeteran'):-1;}
        if(actor.kind==='laser_bean'&&slot.name.endsWith('_FS')&&slot.childArmature&&slot.childArmature.animation.lastAnimationName!=='Floor')slot.childArmature.animation.play('Floor',0);
        if(!Object.hasOwn(this.costumes,actor.kind)&&(game.darkPlants.handles(actor.kind as PlantKind)||actor.kind==='fumeshroom'||game.future.handles(actor.kind as PlantKind)||game.western.handles(actor.kind as PlantKind)||game.westFinale.handles(actor.kind as PlantKind))&&slot.name.startsWith('COS'))slot.displayIndex=-1;
        if(actor.kind==='bull'||actor.kind==='blackBull'){const z=game.zombies.find(z=>z.id===id)??game.deaths.find(d=>d.zombie.id===id)?.zombie;if(z){if(slot.name.includes('_IMP')&&!z.west!.imp)slot.displayIndex=-1;if(slot.name.includes('_bp1'))slot.displayIndex=z.hp<=game.props.zombies[z.kind].Toughness*2/3&&z.hp>game.props.zombies[z.kind].Toughness/3?0:-1;if(slot.name.includes('_bp2'))slot.displayIndex=z.hp<=game.props.zombies[z.kind].Toughness/3?0:-1;}}
        if((actor.kind==='lostGargantuar'||actor.kind==='beachGargantuar'||actor.kind==='darkGargantuar'||actor.kind==='cowboyGargantuar')&&[...game.zombies,...game.westFinale.allies].find(z=>z.id===id)?.west?.imp===false&&slot.name.includes('_IMP'))slot.displayIndex=-1;
        if(actor.kind==='lostGargantuar'&&slot.name.includes('FIRE')&&!game.lostcity.torches.get(id))slot.displayIndex=-1;
        if(actor.kind==='lostcity'&&!actor.death&&slot.name.includes('_BP')){const b=game.zombies.find(z=>z.id===id)!.bug;if(b)slot.displayIndex=b.hp>0&&slot.name.includes(b.hp>game.props.zombies[game.zombies.find(z=>z.id===id)!.kind].BugToughness/2?'_BP0':'_BP1')?0:-1;}
        if(actor.kind==='iceageGargantuar'&&!actor.death){const z=game.zombies.find(z=>z.id===id)!;const imp=/_IM([012])/.exec(slot.name);if(imp&&Number(imp[1])<z.west!.iceageHeld!)slot.displayIndex=-1;}
        if(actor.kind==='iceageDodo'&&!actor.death){const z=game.zombies.find(z=>z.id===id)!;if(slot.name.includes('_bp0'))slot.displayIndex=z.hp<=game.props.zombies[z.kind].Toughness*2/3?0:-1;if(slot.name.includes('_bp1'))slot.displayIndex=z.hp<=game.props.zombies[z.kind].Toughness/3?0:-1;}
        if(actor.kind==='chickenFarmer'&&slot.name.includes('_CHICK')&&[...game.zombies,...game.westFinale.allies].find(z=>z.id===id)?.west?.chickens===false)slot.displayIndex=-1;
        if(actor.kind==='pirateCaptain'&&slot.name.includes('Parrot'))slot.displayIndex=game.zombies.find(z=>z.id===id)?.captain?.parrot?0:-1;
        if((actor.kind==='lostExcavator'&&slot.name==='shovel'||actor.kind==='lostJane'&&slot.name.includes('Umbrella'))&&slot.childArmature){const at=game.lostcity.blocks.get(id);if(at!==undefined&&game.time-at<.1)slot.childArmature.animation.play('Play',1);}
        if(actor.kind==='gatling'&&slot.name.includes('_GUN'))slot.displayIndex=game.expedition.gunned.has(id)?0:-1;
        if(actor.kind==='endurian'&&!actor.death&&slot.name.includes('ARMOR')){const p=game.plants.find(p=>p.id===id)!,stage=p.armor>2000?0:p.armor>1000?1:p.armor>0?2:3;slot.displayIndex=stage<3&&slot.name.includes('ARMOR'+stage)?0:-1;}
        if((actor.kind==='wallnut'||actor.kind==='tallnut')&&slot.name==='ARMOR'){const p=game.plants.find(p=>p.id===id);slot.displayIndex=p&&p.armor>0?Math.max(0,2-Math.floor(p.armor/game.props.plants[actor.kind as 'wallnut'|'tallnut'].ArmorToughness*3)):-1;}
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
      if((actor.kind==='pirateParrot'||(actor.kind==='mummy'||actor.kind==='prospector')&&actor.root.scale.x<0||game.level.cannon&&(actor.kind==='seagull'||actor.kind==='pelican'))&&!alive.has(id)&&!actor.death)this.removeActor(id,actor);
    }
    for(const z of [...game.zombies,...game.westFinale.allies]){const actor=this.actors.get(z.id)!,state=z.west;
      if(state?.hat!==undefined)actor.rig.armature.getSlot('hat_HEAD')!.displayIndex=state.hat?0:-1;
      if(state?.poncho!==undefined){actor.rig.armature.getSlot('PONCHO')!.displayIndex=state.poncho>0?0:-1;actor.rig.armature.getSlot('SHIELD')!.displayIndex=state.plate!>0?Math.min(2,2-Math.ceil(state.plate!/game.props.zombies[z.kind].ShieldToughness*3)+1):-1;}
      if(z.kind==='prospector'){const tnt=actor.rig.armature.getSlot('TNT')!.childArmature!,name=state!.dirty?'Nothing':!state!.ignited?'Out':state!.fuse!>20/3?'Small':state!.fuse!>10/3?'Mid':'Big';if(tnt.animation.lastAnimationName!==name)tnt.animation.play(name,0);for(const slot of actor.rig.armature.getSlots())if(slot.name.includes('_ASH'))slot.displayIndex=state!.dirty?0:-1;}
      if(state?.poisonAt!==undefined){const age=game.time-state.poisonAt,value=Math.round(255*(age<2?1-age/2:Math.min(1,age-2)));actor.rig.tint=(value<<16)|0xff00|value;}
    }
    for(const sound of game.cowboy.sounds.splice(0))this.onSound(sound);
    for (const actor of this.actors.values()) if (actor.armor?.visible) {
      const bone = actor.rig.armature.getBone(actor.knighted?'head':'armorSOCKET')!;
      bone.updateGlobalTransform();
      actor.armor.position.set(actor.rig.x+bone.global.x*.51, actor.rig.y+bone.global.y*.51);
      actor.armor.rotation = bone.global.rotation;
    }
    this.drawChallengeTiles(game.level);
    if(game.level.flowerLine!==null){
      const x=BOARD.left+game.level.flowerLine*82,animation=game.phase==='lost'&&game.lossReason==='flowers'?'Die':game.phase==='won'?'Grow':game.zombies.some(z=>z.hp>0&&!z.leap&&!z.reversed&&Math.abs(z.x-x)<70)?'Nervous':'Idle';
      if(animation!==this.flowerAnimation){this.flowerAnimation=animation;for(let row=0;row<5;row++)this.objects.get(`tile-flower-${row}`)!.animation.play(animation,animation==='Idle'?0:1);}
    }
    for(const id of game.westFinale.converted){const actor=this.actors.get(id);if(actor&&!alive.has(id))this.removeActor(id,actor);}
    this.drawObjects(game);
    this.updateParticles();
    this.updateSunFlights(dt);
  }

  absorptionTarget(zombie: Zombie) {
    // EgyptRaZOMBIE's absorber is attached to the animated rays bone at the staff tip.
    const actor=this.actors.get(zombie.id)!;
    const bone=actor.rig.armature.getBone(zombie.kind==='lostcity_crystalskull'?'skull':'rays')!;
    bone.updateGlobalTransform();
    return {x:zombie.x+bone.global.x*actor.rig.scale.x,y:rowY(zombie.row)+bone.global.y*actor.rig.scale.y};
  }

  private removeActor(id:number,actor:Actor) {
    actor.plank?.removeFromParent();actor.plank?.dispose();actor.rig.removeFromParent();actor.rig.dispose();actor.armor?.removeFromParent();actor.armor?.dispose();actor.root.destroy({children:true});this.actors.delete(id);
  }
  private dropFragment(actor:Actor,part:'head'|'arm'|'Cone'|'Bucket'|'Bricks'|'Helmet') {
    const rig=this.rig(part==='Helmet'&&actor.kind!=='iceage'?'dark':(actor.kind==='jetpackVeteran'||actor.kind==='futureJetpack'||actor.kind==='discoJetpack')?'future':actor.kind,part==='Bricks'?'BricksDrop':actor.kind==='iceageHunterVeteran'&&(part==='head'||part==='arm')?part+'_v':part);rig.scale.set(RIGS[actor.kind].scale);
    rig.animation.play((actor.kind==='zoybean'||actor.kind==='beachOctopus'||actor.kind==='iceageTroglobite'||actor.kind==='iceageTroglobiteVeteran')&&(part==='head'||part==='arm')?'idle':(part==='Cone'||part==='Bucket'||part==='Bricks'||part==='Helmet')?actor.armor!.animation.lastAnimationName!:part==='arm'&&!['abbotImp','lostImp','beachImp','darkImp','imp','cowboyImp'].includes(actor.kind)?'newAnimation':'Idle',0);
    const bone=actor.rig.armature.getBone(part==='head'?'head':part==='arm'?((actor.kind==='jetpackVeteran'||actor.kind==='futureJetpack'||actor.kind==='discoJetpack')?'armRoot_here':'arm_here'):actor.knighted?'head':'armorSOCKET')!;
    bone.updateGlobalTransform();
    const x=actor.root.x+actor.rig.x+bone.global.x*actor.rig.scale.x,y=actor.root.y+actor.rig.y+bone.global.y*actor.rig.scale.y;
    rig.position.set(x,y);rig.zIndex=actor.root.zIndex+1;this.actorLayer.addChild(rig);
    this.fragments.push({rig,x,y,ground:actor.root.y,vx:(5-10*Math.random())*.55*60,vy:-15*.55*60,spin:(Math.random()<.5?-1:1)*(2*Math.random()+1),age:0,landed:0});
  }
  private shedShell(id:number,actor:Actor) {
    this.actors.delete(id);this.actors.set(-100000-id,actor);this.animate(actor,'Death',0,1);
    actor.death={cause:'plant',elapsed:0,fadeAt:animationTimeline(this.skeletons.get(actor.kind)!,RIGS[actor.kind].armature,'Death').duration,fallAt:Infinity};
  }
  private chickenFeathers(actor:Actor,id:number,animation:string){const ash=this.art.build('chickenAsh',animation);ash.scale.set(.51);ash.position.copyFrom(actor.root.position);ash.animation.play(animation,1);ash.zIndex=actor.root.zIndex;this.actorLayer.addChild(ash);this.particles.set(id,ash);this.onSound('birdExpl');}
  private killZombie(death:ZombieDeath,game:Game) {
    const z=death.zombie;
    const shell=this.actors.get(z.id);
    // Multiple hits can break the coffin and kill its occupant before the next render.
    if((shell?.kind==='pharaoh'||shell?.kind==='pharaohWeak')&&z.kind==='pharaoh_inner')this.shedShell(z.id,shell);
    const actor=this.actors.get(z.id)??this.addActor(z.id,zombieRig(z.kind),z.kind==='mummy_flag');
    actor.root.position.set(z.x,zombieY(z)-(z.parrot?.height??0));actor.root.zIndex=zombieY(z)+1;actor.rig.animation.timeScale=1;actor.rig.tint=0xffffff;if(actor.kind==='cowboy'||actor.kind==='cowboyFlag')actor.rig.armature.getSlot('hat_HEAD')!.displayIndex=-1;
    if(actor.mask){actor.root.mask=null;actor.mask.destroy();actor.mask=undefined;actor.rig.y=0;}
    if(death.cause==='blow'){if(z.kind==='future_imp'&&z.future!.animation==='Fall')actor.root.y=rowY(z.row)-600*Math.max(0,1-(death.at-z.entryAt))**2;actor.death={cause:'blow',elapsed:0,fadeAt:Infinity,fallAt:Infinity};return;}
    if(death.cause==='water'||death.cause==='swallow'){this.removeActor(z.id,actor);return;}
    if(z.kind==='chicken'||z.kind==='chicken_pumpkin'){this.chickenFeathers(actor,-z.id,'PlayFloor');this.removeActor(z.id,actor);return;}
    if(z.kind==='cannon'&&z.pirate?.animation==='Explode'){this.removeActor(z.id,actor);return;}
    if(z.swing?.failure){this.removeActor(z.id,actor);return;}
    if((actor.kind==='seagull'||actor.kind==='pelican')){
      actor.rig.armature.getSlot('Seagull')!.childArmature!.animation.play(death.cause==='potato'?'Explode':z.butteredUntil!==undefined?'Death':'Escape',1);
      if(z.butteredUntil!==undefined||death.cause==='potato')this.onSound(actor.kind+'/seagullButteredSounds');
      if(death.cause==='potato'){const feathers=this.rig(actor.kind,'ParticleSeagull');feathers.scale.set(.51);feathers.position.copyFrom(actor.root.position);feathers.animation.play('Play',1);feathers.zIndex=actor.root.zIndex;this.actorLayer.addChild(feathers);this.particles.set(-z.id,feathers);}
    }
    if(!(actor.kind==='lostPorter'&&game.lostcity.tenting.has(z.id))&&!['kongfuHook','kongfuStatue','kongfuStrong','zoybean','zoybeanGarg','iceageWeasel','iceageDodo','beachFisher','darkKing','darkKingVeteran','footballMech','futureGargantuar','discoMech','futureProtector','futureShield','futureImp','mechCone','blackBull','bull','pirateParrot','pirateBarrel','impCannon','seagull','pelican','camel','camelTouch','pharaoh','pharaohWeak'].includes(actor.kind))this.dropFragment(actor,'head');if(actor.kind!=='bull'&&actor.kind!=='blackBull')this.onSound(actor.kind==='pirateParrot'?'pirateParrot/deathSound':'zombieLimbPop');
    if(actor.armor?.visible){this.dropFragment(actor,z.knighted||((z.kind==='kongfu_armor3'||z.kind==='monk_armor3'||z.kind==='abbot_armor3')||z.kind==='dark_armor3'||z.kind==='iceage_armor3')?'Helmet':z.kind.endsWith('_armor4')?'Bricks':z.kind.endsWith('_armor2')?'Bucket':'Cone');actor.armor.visible=false;}
    if(death.cause==='match'&&actor.plank){actor.plank.removeFromParent();actor.plank.dispose();actor.plank=undefined;}
    if(death.cause==='potato'&&!z.surfer?.surfing&&actor.kind!=='bull'&&actor.kind!=='blackBull'){this.removeActor(z.id,actor);return;}
    const animation=z.kind==='monk_imp'&&z.kongfu!.flying?'Death_Floating':z.kind==='kongfu_drink'&&z.kongfu!.drunk?'Death_Drunk':actor.kind==='lostPorter'&&game.lostcity.tenting.has(z.id)?'Tent':actor.kind==='lostExcavator'&&actor.animation!=='Walk'&&actor.animation!=='Eat'&&actor.animation!=='Lose'?'Death_Shovel':z.pilot?.hanging?'Death_Hang':z.weasel?.hidden?'Death_Hidden':actor.kind==='iceageDodo'&&death.cause==='electric'?'Shock':z.fisher?.deathAnimation??z.surfer?.deathAnimation??(actor.kind==='pirateParrot'?'Die':'Death'),timeline=animationTimeline(this.skeletons.get(actor.kind)!,actor.rig.armature.name,animation);
    const shock=(actor.kind==='bull'||actor.kind==='blackBull')&&death.cause==='electric';
    this.animate(actor,shock?'Shock':animation,z.swing?.at??0,1);if(shock)this.onSound('zombieShock');
    actor.death={cause:death.cause,elapsed:0,fadeAt:timeline.events.die+(shock?animationTimeline(this.skeletons.get(actor.kind)!,RIGS[actor.kind].armature,'Shock').events.playDeath:0),fallAt:['abbot','abbotFlag','abbotTorch','abbotChi','abbotImp','monkDrink','monk','monkFlag','monkBlade','monkNunchaku','monkTorch','monkImp','kongfuChi','kongfuBomb','kongfuDrink','kongfuGong','kongfuTorch','kongfuHammer','kongfuRocket','zoybean','zoybeanGarg','lostPorter','lostExcavator','lostJane','lostImp','lostPilot','iceageTroglobiteVeteran','iceageWeasel','iceageWeaselHoarder','iceageTroglobite','iceageDodo','beachFisher','darkKing','dragonImp','darkJester','footballMech','futureGargantuar','discoMech','futureProtector','futureShield','futureImp','mechCone'].includes(actor.kind)?Infinity:actor.kind==='bull'||actor.kind==='blackBull'||actor.kind==='pirateParrot'?Infinity:(actor.kind==='kongfuHook'||actor.kind==='kongfuStatue'||actor.kind==='kongfuStrong'||actor.kind==='lostGargantuar'||actor.kind==='iceageGargantuar'||actor.kind==='darkGargantuar'||actor.kind==='gargantuar'||actor.kind==='pirateGargantuar'||actor.kind==='cowboyGargantuar')?timeline.events.deathFall:timeline.events.fall};
  }
  private updateDeaths(dt:number) {
    for(const [id,actor] of this.actors) {
      const death=actor.death;
      if(death){
        if(death.cause==='toss'){actor.root.x+=dt*500;actor.root.y-=dt*350;actor.root.rotation+=dt*4;}
        const before=death.elapsed;death.elapsed+=dt;
        if(death.cause==='blow'){actor.root.x+=1020*(Math.min(1,death.elapsed)**2-Math.min(1,before)**2);if(death.elapsed>=1)this.removeActor(id,actor);continue;}
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
        if(death&&actor.animation!=='Tent'&&death.cause!=='plant'&&!['darkKing','darkKingVeteran','footballMech','futureGargantuar','discoMech','futureProtector','futureShield','futureImp','mechCone'].includes(actor.kind)&&(slot.name.endsWith('_HEAD')||(actor.kind==='seagull'||actor.kind==='pelican')&&death.elapsed>=.4&&slot.name.endsWith('_head')))slot.displayIndex=-1;
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
    for(const plant of game.plants)if(plant.action==='food'){const light=this.foodLights.get(`${plant.id}:${plant.actionAt}`);if(light)light.rig.position.set(cellX(plant.column),rowY(plant.row));}
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
    if(game.level.tide){const x=BOARD.left+game.beach.position*BOARD.cellWidth;this.beachWater.clear().rect(x,BOARD.top,Math.max(0,1200-x),BOARD.rows*BOARD.cellHeight).fill({color:0x29b9ce,alpha:.55});this.beachEdge!.position.set(x,rowY(2)-35);}
    for(const [i,t] of game.kongfu.tiles.entries())if(t.deadAt===null||game.time-t.deadAt<game.props.plantAnimations.taichi.Die_Lit.duration){const rig=object(`taichi-${i}`,'taichi',t.deadAt!==null?'Die_Lit':t.lit?'Idle_Lit':'Idle',cellX(t.column),rowY(t.row),.5);rig.zIndex=-80;rig.animation.timeScale=t.deadAt!==null?1:t.lit?t.rate:1;}
    for(const p of game.plants)if(p.kind==='firegourd'&&p.hp>0&&p.sheep===undefined){const s=game.kongfu.gourds.get(p.id)!;if(s.flame){const rig=object(`gourd-fire-${p.id}`,'gourdFire','Idle',cellX(p.column)+30,rowY(p.row)-45,.5);rig.scale.x=s.distance*BOARD.cellWidth/300;}}
    for(const [i,t] of game.level.trapTiles.entries()){const rig=object(`trap-${i}`,t.group==='thunder'?'trapThunder':t.group==='flame'?'trapFlame':'trapBoulder',game.time<(game.lostcity.trapCooldown.get(i)??0)?'Idle_Down':'Idle',cellX(t.column),rowY(t.row),.5);rig.zIndex=-80;}
    for(const f of game.lostcity.flames)for(let c=0;c<9;c++){const rig=object(`trap-fire-${f.id}-${c}`,'jalapenoFire','Idle',cellX(c),rowY(f.row),.24*BOARD.cellWidth/68);rig.tint=0x70ff80;}
    for(const b of game.lostcity.boulders)object(`boulder-${b.id}`,'boulder','idle',b.x,b.y,.5);
    for(const p of game.plants){const tongue=game.toadstool.states.get(p.id)?.tongue;if(tongue){const x=cellX(p.column)+20,y=rowY(p.row)-30,rig=object(`toad-tongue-${p.id}`,'toadTongue','Play'+Math.min(10,Math.round(Math.hypot(tongue.x-x,tongue.y-y)/BOARD.cellWidth)),x,y,.55);rig.rotation=Math.atan2(tongue.y-y,tongue.x-x);}}
    for(const ray of game.lostcity.crystalRays){const rig=object(`crystal-ray-${ray.id}`,'crystalRay','Play',ray.x,ray.y,.51);rig.scale.x=ray.direction*ray.length/522;rig.animation.lastAnimationState!.playTimes=1;}
    for(const t of game.lostcity.thunders)if(t.fired)object(`thunder-${t.id}`,'thunderStrike','Play0',cellX(t.column),rowY(t.row),.5);
    for(const f of game.lostcity.fogs)if(game.plants.some(p=>p.id===f.id&&p.hp>0))object(`zoy-fog-${f.id}`,'zoyFog',game.time-f.at<game.props.plantAnimations.zoyFog.Spawn.duration?'Spawn':'Idle',cellX(f.column),rowY(f.row),.55);
    for(const shot of game.lostcity.shots)object(`akee-${shot.id}`,shot.food?'akeeFood':'akeeShot','idle',shot.x,shot.y,.55);
    for(const t of game.expedition.lava){const rig=object(`lava-${t.id}`,'lava',game.time>=t.until?'Fade':game.time-t.at<.533?'Spawn':'Idle',cellX(t.column),rowY(t.row),.5);rig.zIndex=-75;}
    for(const [id,t] of game.expedition.cracks)for(let c=t.column;c<9;c++){const rig=object(`lava-crack-${id}-${c}`,'lavaCrack',c===t.column?'Idle_L':c===8?'Idle_R':'Idle_M0',cellX(c),rowY(t.row),BOARD.cellWidth/156);rig.zIndex=-75;}
    for(const s of game.iceageCombat.lobbedSnowballs)object(`hunter-lob-${s.id}`,'hunterSnowball','idle',s.x,s.y,.51);
    for(const s of game.iceageCombat.snowballs)object(`hunter-shot-${s.id}`,'hunterSnowball','idle',s.x,rowY(s.row)-40,.51);
    for(const s of game.iceageCombat.peppers){const rig=object(`pepper-shot-${s.id}`,s.food?'pepper_pf':'pepper','Idle',s.x,s.y,.55);rig.rotation=(game.time-s.at)*3;rig.zIndex=1000;}
    for(const w of game.iceage.winds)if(game.time>=w.at){const rig=object(`frost-${w.id}`,'frostWind',w.left?'left':'right',cellX(4),rowY(w.row),.5);rig.animation.lastAnimationState!.playTimes=1;}
    for(const [key,cold] of game.iceage.cold){const [row,column]=key.split(':').map(Number);object(`ice-prepare-${key}`,'icePrepare','Idle'+(cold-1),cellX(column),rowY(row),.5);}
    for(const [i,t] of game.level.sliders.entries()){const name=t.up?'sliderUp':'sliderDown';for(const suffix of ['','Back']){const rig=object(`slider-${i}-${suffix}`,name+suffix,'Idle',cellX(t.column),rowY(t.row),.5);rig.zIndex=suffix?-71:-70;}}
    for(const b of game.iceage.blocks){if(b.glacier){const rig=object(`glacier-${b.id}`,'glacierBlock','Idle',cellX(b.column),rowY(b.row),.45);for(const slot of rig.armature.getSlots()){const match=/BP([1-5])/.exec(slot.name);if(match)slot.displayIndex=b.hp<600*(6-Number(match[1]))/5?0:-1;}continue;}const name=b.zombie?'iceZombie':'icePlant';for(const suffix of ['Back','']){const rig=object(`ice-${b.id}-${suffix}`,name+suffix,'Idle',cellX(b.column),rowY(b.row),.5);rig.zIndex=suffix?-50:rowY(b.row)+5;for(const slot of rig.armature.getSlots())if(slot.name==='MAIN')slot.displayIndex=Math.min(3,Math.floor((600-b.hp)/150));}}
    for(const b of game.iceageCombat.primalPeas)object(`primal-${b.id}`,'primalPea','Idle',b.x,b.y,b.kind==='pea_primal_pf'?.75:.5);
    for(const b of game.iceageCombat.firePeas)object(`fire-pea-${b.id}`,'firePea','Idle',b.x,b.y,.5);
    for(const e of game.iceageCombat.fireHits)object(`fire-hit-${e.id}`,'firePeaHit','Play',e.x,e.y,.5).animation.lastAnimationState!.playTimes=1;
    for(const p of game.plants)if(p.kind==='firepeashooter'&&p.animation==='Food')for(let c=p.column+1;c<=Math.min(8,p.column+Math.floor((game.time-p.actionAt)*18));c++){const fire=object(`fire-food-${p.id}-${c}`,'jalapenoFire','Idle',cellX(c),rowY(p.row),.24*BOARD.cellWidth/68);fire.scale.y=.24*10/20*BOARD.cellHeight/80.77;}
    for(const e of game.iceage.effects)object(`ice-effect-${e.id}`,e.name,e.animation,cellX(e.column),rowY(e.row),.5);
    for(const t of game.beachFinale.tiles){const lit=game.plants.some(p=>p.hp>0&&p.kind!=='goldleaf'&&p.row===t.row&&p.column===t.column);const rig=object(`gold-${t.row}-${t.column}`,'goldtile',game.time-t.at<.17?'Produce':lit?'Idle_Lit':'Idle_Unlit',cellX(t.column),rowY(t.row),.5);rig.zIndex=-80;}
    for(const v of game.beachFinale.visuals)object(`beach-final-${v.id}`,v.name,v.animation,v.x,v.y,.55);
    for(const s of game.beachFinale.shields)object(`moon-shield-${s.id}`,'moonShield','Idle',cellX(s.column),rowY(s.row),.5);
    for(const s of game.beachFinale.shots){const rig=object(`sea-shot-${s.id}`,s.sea?'seaPea':'pea','Idle',s.x,s.y,.55);rig.rotation=Math.atan2(s.dy,s.dx);}
    for(const sound of game.beach.sounds.splice(0))this.onSound(sound);
    for(const e of game.beach.surfers.effects){const t=Math.min(1,(game.time-e.at)/.6),rig=object(`surfer-${e.id}`,e.name,e.animation,e.x+(e.toX-e.x)*(1-(1-t)**2),rowY(e.row),.51);rig.animation.lastAnimationState!.playTimes=1;if(e.name==='surfboardThrow'||e.name==='surfboardThrowVeteran')rig.armature.getSlot('MAIN')!.displayIndex=game.beach.surfers.stage(e.board,e.veteran);}
    for(const shot of game.beach.octopuses.shots){const t=Math.min(1,(game.time-shot.at)/shot.duration);object(`octopus-shot-${shot.id}`,'octopusShot','idle',shot.fromX+(cellX(shot.column)-shot.fromX)*t,shot.fromY+(rowY(shot.row)-shot.fromY)*t-130*4*t*(1-t),.51);}
    for(const r of game.beach.octopuses.released){const rig=object(`octopus-die-${r.id}`,'octopus','Die',cellX(r.column),rowY(r.row),.51);rig.animation.lastAnimationState!.playTimes=1;}
    for(const s of game.beach.thistles.shots){const rig=object(`thistle-${s.id}`,s.food?'thistleFood':'thistle','Idle',s.x,s.y,.55);rig.rotation=s.angle;}
    for(const z of game.zombies)if(z.fisher?.hook){const h=z.fisher.hook,y=rowY(z.row)-45;object(`fisher-hook-${z.id}`,'fisherHook','idle',h.x,y,.51);const wire=object(`fisher-wire-${z.id}`,'fisherWire','idle',z.x-15,rowY(z.row)-90,.51);wire.rotation=Math.atan2(y-wire.y,h.x-wire.x);wire.scale.x=Math.hypot(h.x-wire.x,y-wire.y)/25;}
    for(const b of game.beach.bowling.balls)object(`bowling-${b.id}`,b.kind,'Idle',b.x,b.y,.55);
    for(const h of game.beach.hands){const rig=object(`kelp-${h.id}`,'kelpHands','Play',h.zombie.x,rowY(h.zombie.row),.55);rig.animation.lastAnimationState!.playTimes=1;}
    for(const t of game.level.powerTiles){const rig=object(`power-tile-${t.row}-${t.column}`,'tile_'+t.group,game.plants.some(p=>p.row===t.row&&p.column===t.column)?'Idle_Lit':'Idle_Unlit',cellX(t.column),rowY(t.row)-31,.44);rig.zIndex=-100;}
    for(const mark of game.darkMemory.markers)object(`memory-${mark.id}`,'memoryImp','Idle',cellX(mark.column),rowY(mark.row)-35,.51);
    for(const sound of game.darkFinale.sounds.splice(0))this.onSound(sound);
    for(const shot of game.darkFinale.shots)object(`guac-shot-${shot.id}`,'guacShot','idle',shot.x,shot.y,.55);
    for(const runner of game.darkFinale.runners)object(`guac-runner-${runner.id}`,'guacRunner',runner.animation,runner.x,rowY(runner.row),.55);
    for(const f of game.darkFinale.fires){const age=game.time-f.at,animation=age<game.props.plantAnimations.jackFood.Start0.duration?'Start0':age<7.5?'Idle0':'Fade';object(`jack-food-${f.id}`,'jackFood',animation,cellX(f.column),rowY(f.row),.55);}
    for(const p of game.plants)if(p.kind==='jackolantern'&&p.animation==='AttackLoop'&&p.sheep===undefined)for(let c=p.column+1;c<=Math.min(8,p.column+game.props.plants.jackolantern.Distance);c++)object(`jack-fire-${p.id}-${c}`,'jackFire','Idle',cellX(c),rowY(p.row),.55);
    for(const sound of game.darkPlants.sounds.splice(0))this.onSound(sound);
    for(const shot of game.darkPlants.spores){const rig=object(`scaredy-${shot.id}`,shot.knockback?'scaredyFood':'scaredyShot',shot.hitAt===undefined?'Idle':'Fade',shot.x,shot.y,.55);if(shot.hitAt!==undefined)rig.animation.lastAnimationState!.playTimes=1;}
    for(const sound of game.dark.sounds.splice(0))this.onSound(sound);
    for(const s of game.dark.sheep){const rig=object(`wizard-sheep-${s.id}`,'wizardSheep',s.animation,cellX(s.plant.column),rowY(s.plant.row),.55);rig.animation.lastAnimationState!.playTimes=s.animation==='Idle0'?0:1;}
    for(const l of game.dark.links){const rig=object(`wizard-link-${l.id}`,'wizardLink','Play1',l.x,l.y,1);rig.rotation=Math.atan2(l.toY-l.y,l.toX-l.x);rig.scale.set(Math.hypot(l.toX-l.x,l.toY-l.y)/2509,.55);rig.animation.lastAnimationState!.playTimes=1;}
    for(const p of game.dark.potions){const rig=object(`potion-${p.id}`,p.kind==='zombiepotion_invisibility'?'potionInvisibility':p.kind==='zombiepotion_speed'?'potionSpeed':'potionToughness',p.animation,cellX(p.column),rowY(p.row),.55);rig.animation.lastAnimationState!.playTimes=p.animation==='Idle'?0:1;}
    for(const f of game.dark.knightEffects){const z=game.zombies.find(z=>z.id===f.target);if(z){const rig=object(`knight-${f.id}`,'knightEffect',f.animation,z.x,rowY(z.row)-100,.51);rig.animation.lastAnimationState!.playTimes=1;}}
    for(const v of game.dark.visuals){const rig=object(`dark-fx-${v.id}`,v.name,'Play',v.x,v.y,.55);rig.animation.lastAnimationState!.playTimes=1;}
    for(const s of game.kongfu.sage.spirits){const rig=object(`sage-spirit-${s.id}`,'sageSpirit',s.animation,s.x,rowY(s.row),.55);rig.scale.x=-.55;}
    for(const s of game.kongfu.abbots.shots)object(`abbot-shot-${s.id}`,'abbotShot','i',s.x,rowY(s.row)-35,.51);
    for(const z of game.zombies)if(z.kind==='abbot_torch'&&z.hp>0&&z.kongfu!.animation==='Breath_Loop'){const rig=object(`abbot-fire-${z.id}`,'abbotFire','Idle',z.x-20,rowY(z.row)-45,.51);rig.scale.x=z.reversed?.51:-.51;}
    for(const h of game.kongfu.lychee.hits){const rig=object(`lychee-hit-${h.id}`,h.metal?'lycheeMetal':'lycheeHit','Play0',cellX(h.column),rowY(h.row),.7*.55);rig.animation.lastAnimationState!.playTimes=1;}
    for(const h of game.kongfu.holes.holes)object(`chi-hole-${h.id}`,'chiHole',h.animation,cellX(h.props.Column)+.45*BOARD.cellWidth,rowY(2)-40,.4*.55*h.props.LanesToAffect.length);
    for(const h of game.kongfu.peach.heals)if(game.time-h.at<game.props.plantAnimations.peachHeal.Play.duration){const rig=object(`peach-heal-${h.id}`,'peachHeal','Play',cellX(h.column),rowY(h.row),.55);rig.animation.lastAnimationState!.playTimes=1;}
    for(const p of game.plants)if(game.kongfu.peach.protected(p))object(`peach-shield-${p.id}`,'peachShield','Idle',cellX(p.column),rowY(p.row),.55);
    for(const p of game.plants)if(p.kind==='bambooshoot'&&p.hp>0){const s=game.kongfu.bamboo.states.get(p.id)!;if(s.moving)object(`bamboo-${p.id}`,s.food?'bambooPF':'bamboo',s.returning?'IdleL':'IdleR',s.x,rowY(p.row),.55);}
    for(const p of game.kongfu.reflected)object(`kongfu-reflect-${p.id}`,p.name,'Idle',p.x,p.y,.55,p.name==='pea'?(p.powered?'pea_g':'pea0'):(p.powered?'Projectile1':'Projectile0'));
    for(const t of game.kongfu.tnt){const y=rowY(t.row)-20;object(`tnt-${t.row}`,'kongfuTNT',t.explodeAt===null?'Idle':'Explode',cellX(t.column),y,.5);if(t.explodeAt===null){const rope=object(`tnt-rope-${t.row}`,'tntRope','Idle',cellX(t.column),y,.5);rope.scale.x=t.length*BOARD.cellWidth/2659.28;rope.zIndex=y-1;if(t.lit)object(`tnt-spark-${t.row}`,'tntSpark','Idle',game.kongfu.tip(t),y,.5);}}
    for(const p of game.dark.reflected)object(`dark-reflect-${p.id}`,p.name,'Idle',p.x,p.y,.55,p.armature);
    for(const sound of game.future.sounds.splice(0))this.onSound(sound);
    for(const v of game.future.visuals){const rig=object(`future-fx-${v.id}`,v.name,v.animation,v.x,v.y,.55);rig.animation.lastAnimationState!.playTimes=1;}
    for(const shot of game.future.finale.apples){const t=Math.min(1,(game.time-shot.at)/shot.duration);object(`apple-${shot.id}`,shot.food?'appleFood':'appleShot','Idle',shot.fromX+(shot.x-shot.fromX)*t,shot.fromY+(shot.y-shot.fromY)*t-Math.sin(t*Math.PI)*60,.55);}
    for(const c of game.future.finale.clouds){const rig=object(`blueberry-cloud-${c.id}`,'blueberryCloud',c.animation,c.x,c.y,.55);const stamp=`cloud:${c.id}:${c.at}`;if(rig.label!==stamp){rig.animation.play(c.animation,c.animation==='Idle0'?0:1);rig.label=stamp;}}
    for(const shot of game.future.stars)object(`star-shot-${shot.id}`,shot.style==='red'?'redShot':shot.style==='redWeak'?'redWeak':shot.style==='pink'?(shot.food?'pinkFood':'pinkShot'):(shot.food?'starFood':'starShot'),'Idle',shot.x,shot.y,.55);
    for(const p of game.plants)if(p.kind==='redstinger'&&game.future.redStates.get(p.id)!.rayUntil>game.time){object(`red-ray-${p.id}`,'redRay','Idle',cellX(p.column)+22,rowY(p.row)-52,.55);}
    for(const shot of game.future.shots)object(`future-shot-${shot.id}`,shot.food?'citronFood':'citronShot','Idle',shot.x,shot.y,.55);
    for(const [id,s] of game.future.holonuts)if(s.shield>0){const p=game.plants.find(p=>p.id===id);if(!p)continue;const animation=game.time-s.shieldAt<game.props.plantAnimations.infinutShield.Spawn.duration?'Spawn':s.shield>game.props.zombies.future_infinut_shield.Toughness*2/3?'Idle':s.shield>game.props.zombies.future_infinut_shield.Toughness/3?'Idle1':'Idle2';for(let row=0;row<5;row++)object(`infinut-shield-${id}-${row}`,'infinutShield',animation,this.actors.get(p.id)!.root.x,rowY(row),.51);}
    for(const z of game.zombies)if(z.future){
      const s=z.future;
      if(s.empUntil!==undefined)object(`emp-${z.id}`,'empEffect','Idle1',z.x,rowY(z.row)-55,.51);
      if(z.kind==='future_gargantuar'&&(s.animation==='ShootStart'||s.beam)){
        const actor=this.actors.get(z.id)!;
        const eyes=['eyeL','eyeR'].map(name=>{const bone=actor.rig.armature.getBone(name)!;return {x:z.x+bone.global.x*.51,y:rowY(z.row)+bone.global.y*.51};});
        for(let i=0;i<eyes.length;i++)object(`garg-eye-${z.id}-${i}`,'gargEye',s.beam?'Idle':'Start',eyes[i].x,eyes[i].y,.51);
        if(s.beam){const b=s.beam,eye=eyes[0],ray=object(`garg-ray-${z.id}`,'gargRay','Idle',eye.x,eye.y,.51);ray.scale.x=Math.hypot(b.x-eye.x,b.y-eye.y)/200;ray.rotation=Math.atan2(b.y-eye.y,b.x-eye.x);object(`garg-hit-${z.id}`,'gargHit','Idle',b.x,b.y,.51);}
      }
    }
    for(const link of game.future.links)if(game.time>=link.at){
      const dx=link.to.column-link.from.column,dy=link.to.row-link.from.row,travel=(game.time-link.at)*16;
      for(let step=0;step<=Math.min(travel,Math.abs(dx)+Math.abs(dy))*4;step++){
        const d=step/4,x=cellX(link.from.column)+Math.sign(dx)*Math.min(d,Math.abs(dx))*BOARD.cellWidth,y=rowY(link.from.row)+Math.sign(dy)*Math.max(0,d-Math.abs(dx))*BOARD.cellHeight;
        const rig=object(`power-dot-${link.id}-${step}`,'tile_'+link.group+'Dot','Play',x,y,.5);rig.animation.lastAnimationState!.playTimes=1;
      }
    }
    for(const rail of game.level.rails?.Rails??[])for(let row=rail.RowStart;row<=rail.RowEnd;row++){
      const rig=object(`rail-${rail.Column}-${row}`,'rail',(row===rail.RowStart?'Up':row===rail.RowEnd?'Down':'Mid')+(game.level.world==='beach'?'Beach':'Cowboy'),cellX(rail.Column),rowY(row),.5);rig.zIndex=-100;
    }
    if(game.level.corral)for(let row=0;row<5;row++){
      const clear=!game.zombies.some(z=>z.row===row&&z.hp>0);
      const back=object(`fence-back-${row}`,'fenceThere',clear?'Ignite':'Out',cellX(8)+BOARD.cellWidth*1.2,rowY(row),.51);back.zIndex=rowY(row)-100;back.animation.lastAnimationState!.playTimes=1;
      const front=object(`fence-front-${row}`,'fenceHere','Idle',cellX(8)+BOARD.cellWidth*1.2,rowY(row),.51);front.zIndex=rowY(row)+1;
    }
    for(const z of game.zombies)if(z.west?.chiliUntil&&game.time<z.west.chiliUntil)object(`chili-stun-${z.id}`,'chiliStun','Idle',z.x,rowY(z.row)-40,.51);
    for(const cart of game.cowboy.carts){const rig=object(`cart-${cart.id}`,'cart','Cowboy',cellX(cart.column),rowY(cart.row),.5);rig.zIndex=rowY(cart.row)-2;rig.armature.getSlot('LINK')!.displayIndex=-1;}
    for(const shot of game.cowboy.shots){const rig=object(`west-shot-${shot.id}`,shot.mega?'megaPea':'pea','Idle',shot.x,rowY(shot.row)-48,shot.mega?.55:.5);rig.scale.x*=Math.sign(shot.vx);}
    for(const effect of game.cowboy.effects){const age=game.time-effect.at,animation=effect.kind==='cowboyHat'?'Idle':effect.kind==='plateDrop'?'Broken2':effect.kind==='prospectorTail'?'Play0':'Play';const rig=object(`west-fx-${effect.id}`,effect.kind,animation,effect.x,effect.y,.51);rig.animation.lastAnimationState!.playTimes=1;if(effect.kind==='cowboyHat'||effect.kind==='plateDrop'){rig.y+=-100*age+180*age*age;rig.rotation=age*2;rig.alpha=Math.min(1,(1.5-age)*2);}}
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
      const blue=sun.absorber!==null&&game.zombies.some(z=>z.id===sun.absorber&&z.kind==='lostcity_crystalskull');
      const animation=blue?(previous==='Normal'?'N-B':previous==='N-B'&&!this.objects.get(key)!.animation.isCompleted?'N-B':'Blue'):sun.absorber===null&&(previous==='Blue'||previous==='N-B')?'B-N':previous==='B-N'&&!this.objects.get(key)!.animation.isCompleted?'B-N':sun.bomb?'Purple':sun.defusedAt!==undefined&&game.time-sun.defusedAt<1?'P-N':sun.absorber===null?(previous==='Red'||previous==='N-R'?'R-N':previous==='R-N'&&!this.objects.get(key)!.animation.isCompleted?'R-N':'Normal'):(previous==='Normal'?'N-R':previous==='N-R'&&!this.objects.get(key)!.animation.isCompleted?'N-R':'Red');
      const rig=object(key,game.level.sunBomb?'sunbomb':'sun',animation,sun.x,sun.y,.5);rig.alpha=Math.max(0,1-Math.max(0,sun.groundAge-7)/.5);
      if(sun.bomb)object(`sunbomb-ray-${sun.id}`,'sunbombRay',sun.age<2/3?'Start':'Idle',sun.x,sun.y,.5);
      if(animation==='N-B'||animation==='B-N'||animation==='P-N'||animation==='N-R'||animation==='R-N')rig.animation.lastAnimationState!.playTimes=1;
    }
    for(const g of game.graves){
      if(isRack(g.kind)){const rig=object(`grave-${g.id}`,'kongfuRack',g.spawnAt!==undefined&&game.time-g.spawnAt<1/3?'Spawn':'Idle',cellX(g.column),rowY(g.row),.5);rig.armature.getSlot('MAIN')!.displayIndex=g.stage;rig.armature.getSlot('DISPLAY')!.displayIndex=rackDisplay(g.kind!);rig.zIndex=rowY(g.row)-1;continue;}
      if(g.kind==='tent'||g.kind==='backpack'){const name=g.kind==='tent'?'lostTent':'lostBackpack',spawning=game.time-g.spawnAt!<game.props.plantAnimations[name].Spawn.duration,rig=object(`grave-${g.id}`,name,spawning?'Spawn':'Idle',cellX(g.column),rowY(g.row),.51);rig.animation.lastAnimationState!.playTimes=spawning?1:0;rig.armature.getSlot('MAIN')!.displayIndex=g.stage;rig.zIndex=rowY(g.row)-1;continue;}
      if(g.kind==='octopus'){const spawning=game.time-g.spawnAt!<2/3,rig=object(`grave-${g.id}`,'octopus',spawning?'Spawn':'Idle',cellX(g.column),rowY(g.row),.51);rig.animation.lastAnimationState!.playTimes=spawning?1:0;continue;}
      const rig=object(`grave-${g.id}`,g.kind==='surfboard'?(g.veteran?'surfboardVeteran':'surfboard'):graveArt(g.kind),g.kind==='surfboard'&&game.time-g.spawnAt!<.6?'Spawn':game.level.world==='dark'&&g.spawnAt!==undefined&&game.time-g.spawnAt<1/3?'Spawn':'Idle',cellX(g.column),rowY(g.row),.5);
      rig.armature.getSlot('MAIN')!.displayIndex=g.stage;rig.zIndex=rowY(g.row)-1;
      rig.visible=!game.plants.some(p=>p.kind==='gravebuster'&&p.row===g.row&&p.column===g.column&&p.age>=game.timing.special!.graveBust);
    }
    for(const sap of game.sap){const rig=object(`sap-${sap.id}`,'sapTile','Idle',cellX(sap.column),rowY(sap.row)-40,.35);rig.zIndex=rowY(sap.row)-3;}
    if(game.boss){
      if(!(game.boss instanceof LostCityBoss)&&(game.boss.animation==='Summonning'||game.boss.animation==='SummonStart'))object('boss-portal','bossPortal','Idle',game.boss.zombie.x-38.184,game.boss.y-44.147,.5);
      if(game.boss instanceof LostCityBoss){
        for(const b of game.boss.sandbags)object(`city-bag-${b.id}`,'sandbag','idle',cellX(b.column),rowY(b.row)-180*(1-b.age/.75),.51).zIndex=1100;
        for(const p of game.boss.planes){const rig=object(`city-plane-${p.id}`,'planeShade','PlayL',cellX(3),rowY(2),.51);rig.zIndex=1200;rig.animation.lastAnimationState!.playTimes=1;}
      }
      if(game.boss instanceof IceageBoss){
        const boss=game.boss;
        if(!boss.defeated){
          object('glacier-up','glacierUp','Idle',boss.zombie.x,boss.y,.51).zIndex=-40;
          object('glacier-down','glacierDown','Idle',boss.zombie.x,boss.y,.51).zIndex=rowY(4)+10;
          if(boss.shield>0){const rig=object('glacier-mid-'+boss.shieldAt,'glacierMid',game.time-boss.shieldAt<.9?'Spawn':'Idle',boss.zombie.x,boss.y,.51);rig.zIndex=boss.y+10;for(const slot of rig.armature.getSlots()){const match=/BP([1-5])/.exec(slot.name);if(match)slot.displayIndex=boss.shield<game.props.zombies[boss.zombie.kind].GlacierToughness*(6-Number(match[1]))/5?0:-1;}}
        }
        for(const m of boss.icebergs){if(m.age<1.5){object(`iceberg-${m.id}`,'iceberg','idle',cellX(m.column),rowY(m.row)-600*(1-m.age/1.5),.5).zIndex=1100;object(`ice-locator-${m.id}`,'bossTarget','Idle',cellX(m.column),rowY(m.row),.2);}else object(`ice-impact-${m.id}`,'icebergHit','Play',cellX(m.column),rowY(m.row),.5).animation.lastAnimationState!.playTimes=1;}
      }
      if(game.boss instanceof BeachBoss){
        for(const s of game.boss.sharks){const rig=object(`beach-shark-${s.id}`,'beachShark',s.animation,cellX(s.column),rowY(s.row),.5);rig.animation.timeScale=s.target&&s.animation!=='Kill'?3:1;}
        for(const c of game.boss.cuts){const rig=object(`beach-cut-${c.id}`,'bossCut','Pop',cellX(c.column),rowY(c.row),.5);rig.animation.lastAnimationState!.playTimes=1;}
        if(game.boss.animation==='LeapStart')object('beach-dive','bossDive','Idle',game.boss.zombie.x,game.boss.y,.5);
        for(const p of game.plants)if(game.boss.pulling.has(p.id)&&game.beach.water(p.column))object(`beach-suck-${p.id}`,'bossSuction','Idle',cellX(p.column),rowY(p.row),.35);
      }
      if(game.boss instanceof FutureBoss)for(const t of game.boss.canceledTargets){const rig=object(`boss-canceled-${t.id}`,'bossTarget','Die',cellX(t.column),rowY(t.row),.2);rig.animation.lastAnimationState!.playTimes=1;}
      if(game.boss instanceof DarkBoss){
        for(const f of game.boss.fireballs){const rig=object(`dragon-ball-${f.id}`,'bossMissile','Idle',cellX(f.column),rowY(f.row)-600*(1-f.age/1.5),.5);rig.zIndex=1100;}
        for(const f of game.boss.flames){
          const age=game.time-(f.until-game.props.projectiles.zomboss_missile_dark.FlameDuration);
          const ground=object(`dragon-ground-${f.id}`,'jalapenoFire','Idle',cellX(f.column),rowY(f.row),.24);ground.scale.y=.12;
          if(age<game.props.plantAnimations.dragonFire.Play.duration){const flash=object(`dragon-fire-${f.id}`,'dragonFire','Play',cellX(f.column),rowY(f.row),.5);flash.animation.lastAnimationState!.playTimes=1;}
        }
        for(const v of game.boss.visuals){const rig=object(`dragon-intro-${v.id}`,v.name,'Play',v.x,v.y,.5);rig.animation.lastAnimationState!.playTimes=1;}
      }
      for(const [i,t] of game.boss.targets.entries())object(`boss-target-${i}`,'bossTarget','Idle',cellX(t.column),rowY(t.row),.2);
      if(game.boss instanceof KongfuBladeBoss){
        for(const c of game.boss.chis)object(`blade-chi-${c.id}`,'bladeChi','i',c.x,rowY(c.row)-30,.51);
        const b=game.boss.boomerang;if(b){object(`blade-boomerang-${b.id}`,'bladeBoomerang','Idle',b.x,rowY(b.row),.51);const link=object(`blade-link-${b.id}`,'bladeLink','idle',game.boss.zombie.x,game.boss.y-60,.51);link.scale.x=(b.x-game.boss.zombie.x)/300;link.rotation=Math.atan2(rowY(b.row)-game.boss.y+60,b.x-game.boss.zombie.x);}
      }
      if(game.boss instanceof KongfuBoss){
        for(const m of game.boss.missiles){const t=m.age/1.5;object(`kongfu-bomb-${m.id}`,'kongfuBossBomb','i',game.boss.zombie.x+(cellX(m.column)-game.boss.zombie.x)*t,game.boss.y-100+(rowY(m.row)-game.boss.y+100)*t-200*4*t*(1-t),.5);}
        for(const b of game.boss.blasts){const rig=object(`kongfu-blast-${b.id}`,b.big?'kongfuBombBig':'kongfuBombSmall','Play',cellX(b.column),rowY(b.row),.5);rig.animation.lastAnimationState!.playTimes=1;}
      }
      else for(const m of game.boss.missiles){
        if(m.age<1.5){object(`boss-missile-${m.id}`,'bossMissile','Idle',cellX(m.column),rowY(m.row)-600*(1-m.age/1.5),.5).zIndex=1100;object(`boss-locator-${m.id}`,'bossTarget','Idle',cellX(m.column),rowY(m.row),.2);}
        else {const west=game.level.world==='west'||game.level.world==='future',key=`boss-impact-${m.id}`;if(west&&!this.objects.has(key))this.onSound('boss/missileImpact');const rig=object(key,west?'bossMissileImpact':'bossMissile','Play',cellX(m.column),rowY(m.row),.5,west?undefined:'ProjectileExplode');rig.animation.lastAnimationState!.playTimes=1;}
      }
      if(game.boss.animation==='Escape'){const rig=object('boss-escape','bossEscape','Play',game.boss.zombie.x+65.644,game.boss.y-84.136,.5);rig.animation.lastAnimationState!.playTimes=1;}
    }
    for(const p of game.pickups)object(`pickup-${p.id}`,p.kind,'Idle',p.x,p.y+Math.sin(p.age*3)*4,p.kind==='food'?.7:.8).zIndex=1000;
    for(const m of game.missiles){
      const nativeProjectile=m.projectile&&m.projectile!=='cabbage'&&m.projectile!=='cabbage_pf'?m.projectile:null;
      const projectileAnimation=m.projectile?.startsWith('blooming_heart')?'idle':m.kind==='parsnip'&&m.age<game.props.plantAnimations[m.projectile!].Spawn.events.find(e=>e.name==='Idle')!.at?'Spawn':'Idle';
      const rig=object(`missile-${m.id}`,nativeProjectile??(m.kind==='snow'?'powerSnow':m.kind==='bone'?'tombBone':m.kind==='saw'?'iceSaw':m.kind),projectileAnimation,m.x,m.y,m.kind==='parsnip'?.5:m.powered?.65:.5,nativeProjectile||['snow','bone','saw'].includes(m.kind)?undefined:m.kind==='cabbage'?(m.powered?'Projectile2':'Projectile1'):(m.powered?'Projectile1':'Projectile0'));
      rig.zIndex=1000;rig.rotation=m.kind==='boomerang'?m.age*20:m.kind==='parsnip'?0:m.age*3;
    }
    for(const z of game.zombies){
      if(game.time<z.frozenUntil)object(`ice-${z.id}`,'iceTrap','Idle',z.x,rowY(z.row),.55);
      if(z.entry==='storm'&&game.time-z.entryAt<1.5){
        const age=game.time-z.entryAt,x=z.entryX+(1070-z.entryX)*Math.max(0,1-age);
        const rig=object(`storm-${z.id}`,game.level.world==='iceage'?'snowstorm':'sandstorm',age<1?'Idle':'Die',x,rowY(z.row),.5);if(age>=1)rig.animation.lastAnimationState!.playTimes=1;
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

    for(const sound of game.westFinale.sounds.splice(0))this.onSound(sound);
    for(const shot of game.westFinale.shots)object(`west-final-shot-${shot.id}`,shot.kind==='banana'||shot.kind==='missiletoe'?shot.kind+'Shot':shot.kind,'Idle',shot.x,shot.y,.55);
    for(const v of game.westFinale.visuals){const rig=object(`west-final-fx-${v.id}`,v.name,v.animation,v.x,v.y,.55);rig.animation.lastAnimationState!.playTimes=1;}
    for(const c of game.westFinale.lines){const center=c.direction===0,rig=object(`currant-${c.row}-${c.column}-${c.direction}`,center?'currantCenter':'currantLine',(c.food?'food':'normal')+(center?'':'0'),cellX(c.column),rowY(c.row)-35,center?.55:(c.direction===1?BOARD.cellWidth:BOARD.cellHeight)/200);rig.rotation=c.direction===1?Math.PI/2:0;}
    if(game.westFinale.selected!==null)object('banana-target',game.plants.find(p=>p.id===game.westFinale.selected)!.kind==='missiletoe'?'missiletoeTarget':'bananaTarget','Idle',this.pointer[0],this.pointer[1],.55);

    for(const sound of game.western.sounds.splice(0))this.onSound(sound);
    for(const shot of game.western.shots){
      const rig=object(`west-shot-${shot.id}`,shot.armor?.name??shot.kind,shot.armor?.animation??'Idle',shot.x,shot.y,.5,shot.armor?.armature);rig.rotation=Math.atan2(shot.vy,shot.vx);
      if(shot.kind==='electricpea'||shot.kind==='electricpea_pf')object(`west-foot-${shot.id}`,'electricFoot','Idle',shot.x,shot.y,.5);
    }
    for(const v of game.western.visuals){const rig=object(`west-fx-${v.id}`,v.name,v.animation,v.x,v.y,.5);rig.animation.lastAnimationState!.playTimes=1;if(v.toX!==undefined){const dx=v.toX-v.x,dy=v.toY!-v.y;rig.rotation=Math.atan2(dy,dx);rig.scale.x=Math.hypot(dx,dy)/200;}}
    for(const metal of game.western.metals){
      const state=game.western.magnets.get(metal.plant)!,shrink=metal.food||game.time-metal.at<.2?1:Math.max(.01,(state.restUntil-game.time)/game.props.plants.magnetshroom.RestTime);
      object(`west-metal-${metal.id}`,metal.name,metal.animation,metal.x,metal.y,.5*shrink,metal.armature);
    }
    for(const beam of game.western.beams){
      const age=game.time-beam.at,ending=game.time>=beam.until;
      const from=object(`grass-from-${beam.plant}`,'grassFrom',ending?'End':age<game.props.plantAnimations.grassFrom.Start.duration?'Start':'Idle',beam.x,beam.y,.5);if(ending)from.animation.lastAnimationState!.playTimes=1;
      if(beam.target!==null){
        const hit=object(`grass-to-${beam.plant}`,'grassTo',ending?'Die':'Idle',beam.toX,beam.toY,.5);if(ending)hit.animation.lastAnimationState!.playTimes=1;
        const ray=object(`grass-ray-${beam.plant}`,'grassRay',ending?'End':age<game.props.plantAnimations.grassRay.Start.duration?'Start':'Idle',beam.x,beam.y,.5);ray.rotation=Math.atan2(beam.toY-beam.y,beam.toX-beam.x);ray.scale.x=Math.hypot(beam.toX-beam.x,beam.toY-beam.y)/500;if(ending)ray.animation.lastAnimationState!.playTimes=1;
      }
      for(const [index,id] of beam.producers.entries()){
        const p=game.plants.find(p=>p.id===id);if(!p||ending||age>=(index+1)*game.props.plants.magnifyinggrass.PlantfoodDurationExtendPerProducer)continue;
        object(`grass-absorb-${beam.plant}-${id}`,'grassAbsorb','Idle',cellX(p.column),rowY(p.row)-50,.5);
      }
    }
    for(const sound of game.finale.sounds.splice(0))this.onSound(sound);
    for(const shot of game.finale.shots){const name=shot.kind==='rotobaga'?(shot.food?'rotobagaFood':'rotobaga'):(shot.food?'dandelionFood':'dandelionShot');const rig=object(`finale-shot-${shot.id}`,name,'Idle',shot.x,shot.y,.5);rig.rotation=Math.atan2(shot.vy,shot.vx);}
    for(const v of game.finale.visuals){const rig=object(`finale-fx-${v.id}`,v.name,v.animation,v.x,v.y,.5);rig.animation.lastAnimationState!.playTimes=1;if(v.toX!==undefined){const dx=v.toX-v.x,dy=v.toY!-v.y;rig.rotation=Math.atan2(dy,dx);rig.scale.set(Math.hypot(dx,dy)/200,.5);}}
    for(const c of game.finale.clouds){const age=game.time-c.at,animation=age<.5?'Spawn':age>=.5+game.props.plants.lightningreed.PlantfoodDuration?'Fade':'Idle';const rig=object(`reed-cloud-${c.id}`,'reedCloud',animation,c.x,c.y,.55);if(animation!=='Idle')rig.animation.lastAnimationState!.playTimes=1;for(const slot of rig.armature.getSlots())if(slot.name.includes('LIGHTNING'))slot.displayIndex=c.striking||animation!=='Idle'?0:-1;}
    for(const f of game.finale.fires)for(let column=0;column<9;column++){const age=game.time-f.at-Math.abs(column-f.column)/18;if(age<0)continue;const animation=age<game.props.plantAnimations.jalapenoFire.Spawn.duration?'Spawn':age>=game.props.plants.jalapeno.Duration?'Fade':'Idle';const rig=object(`jalapeno-${f.id}-${column}`,'jalapenoFire',animation,cellX(column),rowY(f.row),.24*BOARD.cellWidth/68);rig.scale.y=.24*15/20*BOARD.cellHeight/80.77;if(animation!=='Idle')rig.animation.lastAnimationState!.playTimes=1;}
    for(const grape of game.escape.grapes)object(`grape-${grape.id}`,'grapeshot',grape.vx>0?'WalkR':grape.vx<0?'WalkL':grape.vy<0?'WalkU':'WalkD',grape.x,grape.y,.5);
    for(const pea of game.peas)object(`pea-${pea.id}`,pea.snow?'snowPea':pea.fire??(pea.peanut?'peanutShot':'pea'),'Idle',pea.x,pea.y,.5,pea.fire||pea.snow?undefined:pea.mega?'pea_g':'pea0');
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
      const projectileHits:Record<string,string>={corn:'Particle0',butter:'ParticleButter0',butter2:'ParticleButter0',melon:'Particle0',melon_pf:'ParticleMega',winter_melon:'Particle0',winter_melon_pf:'ParticleMega',snowdrop:'Par',snowdrop_freeze:'Par',sapfling:'Particle',sapfling_pf:'Particle'};
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
  preview(kinds:ZombieKind[]=['mummy','ra','mummy_armor1'],graves:{row:number;column:number;kind?:string}[]=[],plants:Plant[]=[],level?:Level) {
    this.reset();
    if(level)this.drawChallengeTiles(level);
    for(const [index,g] of graves.entries()){const rig=this.art.build(isRack(g.kind)?'kongfuRack':graveArt(g.kind),'Idle');if(isRack(g.kind))rig.armature.getSlot('DISPLAY')!.displayIndex=rackDisplay(g.kind!);rig.position.set(cellX(g.column),rowY(g.row));rig.scale.set(.5);rig.zIndex=rowY(g.row)-1;this.actorLayer.addChild(rig);this.objects.set(`preview-grave-${index}`,rig);}
    for(const p of plants){const actor=this.addActor(p.id,p.kind);actor.root.position.set(cellX(p.column),rowY(p.row));actor.root.zIndex=rowY(p.row);this.animate(actor,RIGS[p.kind].idle);}
    for (const [index,kind] of [...new Set(kinds)].slice(0,6).entries()) {
      const actor = this.addActor(-index-1,zombieRig(kind),kind==='mummy_flag');
      actor.root.position.set(1280 + index % 2 * 70,260 + index * 65);
      if(kind==='mummy_armor1'||kind==='mummy_armor2'||kind==='mummy_armor4'||pirateArmor(kind)||cowboyArmor(kind)||futureArmor(kind)||darkArmor(kind)||beachArmor(kind)||lostcityArmor(kind)||kongfuArmor(kind)||iceageArmor(kind)){actor.armor=this.rig(actor.kind,(kind==='kongfu_armor3'||kind==='monk_armor3'||kind==='abbot_armor3'||kind==='dark_armor3'||kind==='iceage_armor3')?'Helmet':kind.endsWith('_armor4')?'Bricks':kind.endsWith('_armor2')?'Bucket':'Cone');actor.armor.scale.set(.51);actor.armor.animation.play('Broken0',0);actor.root.addChild(actor.armor);actor.armorKind=kind;}
      this.animate(actor,kind.startsWith('lostcity_bug')?'Idle_Bug':'Idle');
      actor.rig.armature.advanceTime(.01);
    }
    this.setCamera(this.art.catalog.presentation.camera.PanStartOffset);
    this.render();
  }
  previewTick(dt: number) {
    this.clock.advanceTime(dt);this.art.clock.advanceTime(dt);
    for(const actor of this.actors.values())if(Object.hasOwn(this.costumes,actor.kind))applyCostume(actor.rig.armature.getSlots(),this.costumes[actor.kind]);
    for(const actor of this.actors.values())if(actor.armor){const bone=actor.rig.armature.getBone(actor.knighted?'head':'armorSOCKET')!;bone.updateGlobalTransform();actor.armor.position.set(bone.global.x*.51,bone.global.y*.51);actor.armor.rotation=bone.global.rotation;}
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
  frameCorral(progress:number){const view=COMBAT_VIEW;this.setCamera(view.x+(this.art.catalog.presentation.camera.PanStreetOffset-view.x)*progress,view.zoom+(1-view.zoom)*progress,view.y*(1-progress));}
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
