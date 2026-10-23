import {Beghouled} from './beghouled';
import {ModernBattle,modernArmor} from './modern';
import {SkyBoss} from './sky-boss';
import {SkyBattle} from './sky';
import {DinoBattle,dinoArmor} from './dino';
import {EightiesBattle} from './eighties';
import type {FisherState} from './beach-fisher';
import type {OctopusState} from './beach-octopus';
import type {SurferState} from './beach-surfer';
import {isBowlingTool} from './beach-bowling';
import {IceageCombat} from './iceage-combat';
import {ToadstoolBattle} from './toadstool';
import {isRack,rackHP,type KongfuZombie} from './kongfu-combat';
import {KongfuBattle,kongfuArmor} from './kongfu';
import {LostCityBattle,lostcityArmor} from './lostcity';
import {ExpeditionPlants} from './expedition-plants';
import {IceageBattle,iceageArmor} from './iceage';
import {BeachFinalePlants} from './beach-finale-plants';
import {BeachBattle,beachArmor} from './beach';
import {DarkFinalePlants} from './dark-finale-plants';
import {DarkMemory} from './dark-memory';
import {DarkPlants} from './dark-plants';
import {DinoBoss} from './dino-boss';
import {EightiesBoss} from './eighties-boss';
import {KongfuBladeBoss} from './kongfu-blade-boss';
import {KongfuChiBoss} from './kongfu-chi-boss';
import {KongfuBoss} from './kongfu-boss';
import {LostCityBoss} from './lostcity-boss';
import {IceageBoss} from './iceage-boss';
import {BeachBoss} from './beach-boss';
import {DarkBoss} from './dark-boss';
import {DarkBattle,darkArmor,type DarkZombie} from './dark';
import {FutureBoss} from './future-boss';
import {FutureBattle,futureArmor,type FutureZombie} from './future';
import {WesternFinale} from './western-finale';
import {WesternPlants} from './western-plants';
import {CowboyBattle,cowboyArmor,type CowboyZombie} from './cowboy';
import {PirateFinalePlants} from './pirate-finale-plants';
import {EscapeRoots} from './escape-root';
import {PirateBattle,pirateArmor,seaCell,swinging,isFlying} from './pirate';
import mowerPresentation from '../../public/assets/battle/mower.json';
import { CowboyBoss } from './cowboy-boss';
import { PirateBoss } from './pirate-boss';
import { EgyptBoss } from './egypt-boss';
import { EGYPT_RULES as RULES } from './rules';
import { BOARD, cellX, rowY, PLANT_KINDS, type AnimationTiming, type Level, type PlantKind, type Properties, type ZombieKind, type SpawnAction, type ConveyorPlant } from './level';

export interface Plant {
  id: number; kind: PlantKind; row: number; column: number; hp: number; armor: number;
  age: number; nextAction: number; action: 'idle' | 'shoot' | 'produce' | 'food' | 'grow' | 'explode' | 'catch';
  sheep?:number;leap?:{x:number;y:number;at:number;duration?:number;pushed?:boolean};heads?:number;imitate?:PlantKind;hidden?:boolean;retreat?:number;animation?:string;variant?:boolean;eventIndex?:number;
  transformed?:boolean;leaves?:number;rootGrown?:boolean;spikes?:number;boosted?:boolean; endangered?:boolean; facing?:number;heavy?:boolean;
  actionAt: number; fired: boolean; burst: number; nextBurst: number;
}
export interface Zombie {balloon?:number;arbiter?:import('./sky-special').ArbiterState;skyHelmet?:boolean;drone?:import('./sky-drones').DroneState;droneMaker?:import('./sky-drones').DroneMakerState;skyEnemy?:import('./sky-enemies').SkyEnemyState;twin?:import('./sky-twins').TwinState;airRaid?:{next:number;escaped:boolean;props:import('./level').AirRaidEnemy};sky?:{animation:string;elapsed:number;event:number;impHealth:number;speed:number};scaredByTyranno?:boolean;dinoCarry?:number;loquatY?:number;garlicLane?:{from:number;to:number;at:number;y:number};kongfu?:KongfuZombie;heartDefence?:number[];zoySpawnAt?:number;tentSpawnAt?:number;bug?:{hp:number;animation:string;at:number;risen:boolean;flying:boolean};pilot?:{animation:string;at:number;event:number;hanging:boolean;left:number;fallTime:number};weasel?:{hidden:boolean;exploding:boolean;at:number;elapsed:number;event:number}; dodo?:{animation:string;at:number;elapsed:number;event:number;flying:boolean;remaining:number;column:number}; fisher?:FisherState; octopus?:OctopusState; surfer?:SurferState; knighted?:boolean;memoryRunner?:boolean; dark?:DarkZombie; future?:FutureZombie; poison?:{until:number;dps:number};perfumeUntil?:number; magnetized?:boolean; west?:CowboyZombie; captain?:{parrot:boolean;health:number;next:number};parrot?:{captain:number;target:number|null;y:number;height:number;capture:number;fleeing:boolean;escaped:boolean;carrying?:Plant}; stunnedUntil?:number; pirate?:{animation:string;at:number;elapsed:number;next:number;count:number;fired:boolean;imp:boolean};barrel?:number;pusher?:number;detachedAt?:number; swing?:{at:number;judge:number;end:number;failure:boolean};route?:{spawnLane:number;spawnWave:number;points:{x:number;y:number}[];index:number;y:number;angle:number}; sappedUntil?:number; butteredUntil?:number;reversed?:boolean;landUntil?:number; id: number; kind: ZombieKind; row: number; x: number; hp: number; armor: number; eating: boolean; absorbed: number; absorbUntil: number; absorbState:'idle'|'start'|'loop'|'end'; absorbAt:number;deathCause:DeathCause; frozenUntil:number;chilledUntil:number;food:boolean;entry:SpawnAction['mode'];entryAt:number;entryX:number;camelPart:number;team:number;leap:{fromX:number;fromY:number;toX:number;toRow:number;at:number;duration?:number}|null }
export type DeathCause = 'swallow' | 'electric' | 'water' | 'normal' | 'potato' | 'mower' | 'toss' | 'blow' | 'match';
export const isCamel=(kind:ZombieKind)=>kind.startsWith('camel_');
export const isMatchCamel=(kind:ZombieKind)=>kind.endsWith('_touch');
export interface SpecialZombie {action:'walk'|'smash'|'throw'|'bone';at:number;elapsed:number;fired:boolean;next:number;imp:boolean;torch:boolean}
export interface CamelCard {face:number;state:'back'|'face'|'match';at:number;removeAt:number}
export interface Grave {veteran?:boolean;kind?:string;spawnAt?:number;id:number;row:number;column:number;hp:number;stage:number}
export interface Pickup {id:number;kind:'food'|'sprout';x:number;y:number;age:number}
export interface Missile {id:number;projectile?:string;kind:'cabbage'|'boomerang'|'snow'|'bone'|'saw'|'parsnip';row:number;x:number;y:number;startX:number;startY:number;targetX:number;targetY:number;targetId:number;age:number;duration:number;damage:number;powered:boolean;returning:boolean;hits:number[];dx:number;dy:number}
export type PowerKind='fire'|'snow'|'toss'|'zap'|'cherry';
export const POWER_TYPES:Record<PowerKind,string>={fire:'powerupflamethrower',snow:'powerupsnowball',toss:'powerupflickzombie',zap:'powerupwizardfinger',cherry:'powerupcherrybomb'};
export interface ZombieDeath { zombie: Zombie; cause: DeathCause; at: number }
export interface Pea {snow?:boolean;fire?:'firePea'|'bluePea'; peanut?:boolean; vector?:{vx:number;vy:number;ay:number;stopY?:number}; mega?:boolean; speed?:number; id: number; row: number; x: number; y: number; damage: number; powered: boolean }
export interface Sun {floatingBomb?:boolean;bombProps?:NonNullable<Level['sunBomb']>; bomb?:boolean;defusedAt?:number; id: number; x: number; y: number; targetY: number; value: number; age: number; from: 'sky' | 'plant' | 'ra';vx:number;vy:number;groundAge:number;absorber:number|null;absorbAge:number }
export interface Mower { row: number; x: number; active: boolean; spent: boolean; starting: number; hold: number }
export interface Effect { id: number; x: number; y: number; kind: 'plant' | 'remove' | 'hit' | 'explode' | 'food' | 'collect' | 'freeze' | 'ground' | 'toss' | 'cabbageHit' | 'boomerangHit' | 'graveHit' | 'cherry' | 'snowHit' | 'graveSpawn' | 'pharaoh' | 'projectileHit' | 'grape'; projectile?:string; age: number; stage?:number }
export type GameEvent = { type: 'shot' | 'plant' | 'sun' | 'explode' | 'win' | 'lose' | 'food' | 'wave' | 'storm' | 'raid' | 'sprout' | 'flip' | 'match' | 'mower' };

export class Game {
  readonly sky=new SkyBattle(this);
  readonly dino=new DinoBattle(this);
  readonly eighties=new EightiesBattle(this);
  readonly cowboy:CowboyBattle;
  corralWaiting=false;
  readonly western=new WesternPlants(this);
  readonly future=new FutureBattle(this);
  readonly dark=new DarkBattle(this);
  readonly iceageCombat=new IceageCombat(this);
  readonly iceage=new IceageBattle(this);
  readonly beachFinale=new BeachFinalePlants(this);
  readonly beach=new BeachBattle(this);
  readonly darkMemory=new DarkMemory(this);
  readonly darkFinale=new DarkFinalePlants(this);
  readonly darkPlants=new DarkPlants(this);
  readonly westFinale=new WesternFinale(this);
  readonly finale=new PirateFinalePlants(this);
  plantsLost=0;
  readonly escape=new EscapeRoots(this);
  readonly pirate=new PirateBattle(this);
  boss:EgyptBoss|null=null;
  imitateKind:PlantKind|null=null;
  sap:{id:number;row:number;column:number;until:number;powered:boolean}[]=[];
  private pendingGraveSpawns:{action:SpawnAction;at:number}[]=[];
  phase: 'playing' | 'paused' | 'won' | 'lost' = 'playing';
  lossReason:'airRaid'|'tnt'|'plantsLost'|'brains'|'ship'|'protected'|'plants'|'sun'|'flowers'|'score'|'sunProduced'|'killChallenge'='brains';
  preparing=false;
  foodLimit=3;
  shovelRefund=0;
  wallnutFirstAid=false;
  plantfoodRefresh=false;
  manualMowers=0;
  private heldMower: number | null = null;
  sunProduced=0;
  recentKills:number[]=[];
  killChallengeComplete=false;
  sunSpent=0;
  time = 0;
  sun: number = RULES.startingSun;
  autoCollectSun = false;
  food: number = RULES.startingFood;
  wave = 0;
  kills = 0;
  plants: Plant[] = [];
  zombies: Zombie[] = [];
  deaths: ZombieDeath[] = [];
  peas: Pea[] = [];
  graves:Grave[]=[];
  missiles:Missile[]=[];
  pickups:Pickup[]=[];
  sprouts=0;
  pharaohs=new Set<number>();
  private pendingPharaohs:{id:number;row:number;x:number;at:number}[]=[];
  specialZombies=new Map<number,SpecialZombie>();
  camelCards=new Map<number,CamelCard>();
  private firstCard:number|null=null;
  private failedCards:number[]=[];
  private matchUntil=0;
  iceweedSpikes=new Map<number,number>();
  conveyor:{id:number;kind:PlantKind;lane:number;position:number;forceBoosted?:boolean}[]=[];
  conveyorPlants:ConveyorPlant[]=[];
  private conveyorDeliveryCount=new Map<ConveyorPlant,number>();
  private conveyorDelivered=new Map<PlantKind,number>();
  private nextCard=1/60;
  private sproutDropped=false;
  power:{kind:PowerKind;remaining:number;total:number;x:number;y:number;held:boolean;nextUse:number;hits:Set<number>}|null=null;
  fires:{row:number;column:number;until:number}[]=[];
  suns: Sun[] = [];
  effects: Effect[] = [];
  mowers: Mower[] = Array.from({ length: BOARD.rows }, (_, row) => ({ row, x: BOARD.left - 40, active: false, spent: false, starting: 0, hold: 0 }));
  cooldowns = Object.fromEntries(PLANT_KINDS.map(kind => [kind, 0])) as Record<PlantKind, number>;
  events: GameEvent[] = [];
  private id = 0;
  private nextSun: number = RULES.initialSunDelay;
  private droppedSuns = 0;
  private nextWave: number = RULES.firstWaveDelay + RULES.normalWaveEntrance;
  private waveDeadline = Infinity;
  private waveDamageDeadline = Infinity;
  private waveIds = new Set<number>();
  private waveHealth = 0;
  private threshold = 0;
  private pending: {airRaidType?:string;cargo?:ZombieKind;fallTime?:number;kind:ZombieKind;at:number;row:number;x:number;mode:SpawnAction['mode'];food:boolean}[] = [];

  readonly modern=new ModernBattle(this);
  readonly beghouled=new Beghouled(this);
  constructor(readonly level: Level, readonly props: Properties, readonly timing: AnimationTiming, readonly raTarget: (zombie: Zombie) => {x:number;y:number}, private seed = 1, tutorial=true) {
    this.cowboy=new CowboyBattle(this);this.kongfu.init();
    if(level.beghouled)this.beghouled.init();
    if(level.corral)this.nextWave=0;
    if(level.lastStand){this.preparing=true;this.sun=level.lastStand.sun;this.food=level.lastStand.food;this.nextWave=4+RULES.normalWaveEntrance;}
    this.graves=level.graves.map(g=>({...g,id:++this.id,hp:isRack(g.kind)?rackHP(g.kind!):props.grave.Toughness,stage:0}));
    if(level.randomGraves){
      const cells=Array.from({length:5*(level.randomGraves.end-level.randomGraves.start+1)},(_,i)=>({row:i%5,column:level.randomGraves!.start+Math.floor(i/5)}));
      for(let i=0;i<level.randomGraves.count;i++){const cell=cells.splice(Math.floor(this.random()*cells.length),1)[0];this.graves.push({...cell,id:++this.id,hp:props.grave.Toughness,stage:0});}
    }
    if(level.tide)this.beach.init();
    for(const plant of level.initialPlants)this.addPlant(plant.kind,plant.row,plant.column);
    for(const plant of level.protectedPlants){this.addPlant(plant.kind,plant.row,plant.column);this.plants.at(-1)!.endangered=true;}
    if(level.airRaid)this.nextWave=4;
    if(level.match)this.nextWave=4+RULES.normalWaveEntrance;
    this.sproutDropped=!tutorial;
    if(level.sunDropper)this.nextSun=level.sunDropper.InitialSunDropDelay;
    if(!level.sunDrops)this.nextSun=Infinity;
    if(!level.mowers)this.mowers.forEach(m=>m.spent=true);
    if(level.world==='egypt'&&level.day===2&&tutorial)this.addPlant('peashooter',2,2);
    this.dark.initLevel();this.iceage.init();for(const t of level.goldTiles)this.beachFinale.tiles.push({...t,next:0,at:-Infinity});
    this.conveyorPlants=level.conveyor?level.conveyor.InitialPlantList.map(p=>({...p})):[];
    if(level.boss)this.boss=level.boss.kind==='zombossmech_sky'?new SkyBoss(this):level.boss.kind.startsWith('zombossmech_dino')?new DinoBoss(this):level.boss.kind.startsWith('zombossmech_eighties')?new EightiesBoss(this):level.boss.kind==='kongfu_boss_chi'?new KongfuChiBoss(this):level.boss.kind==='kongfu_boss_blade'?new KongfuBladeBoss(this):level.boss.kind==='kongfu_boss_explode'?new KongfuBoss(this):level.boss.kind.startsWith('zombossmech_lostcity')?new LostCityBoss(this):level.boss.kind.startsWith('zombossmech_iceage')?new IceageBoss(this):level.boss.kind.startsWith('zombossmech_beach')?new BeachBoss(this):level.boss.kind.startsWith('zombossmech_dark')?new DarkBoss(this):level.boss.kind.startsWith('zombossmech_future')?new FutureBoss(this):level.boss.kind.startsWith('zombossmech_cowboy')?new CowboyBoss(this):level.boss.kind.startsWith('zombossmech_pirate')?new PirateBoss(this):new EgyptBoss(this);
    if(level.cannon){this.nextWave=4+RULES.normalWaveEntrance;level.cannon.RowHasCannon.forEach((has,row)=>{if(has)this.addPlant('coconutcannon',row,1);});}
  }

  kongfu=new KongfuBattle(this);
  lostcity=new LostCityBattle(this);
  toadstool=new ToadstoolBattle(this);
  expedition=new ExpeditionPlants(this);
  boosts=new Set<PlantKind>();
  usedBoosts=new Set<PlantKind>();
  nextEntityId(){return ++this.id;}
  random() { this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0; return this.seed / 4294967296; }
  private effect(kind: Effect['kind'], x: number, y: number) { this.effects.push({ id: ++this.id, kind, x, y, age: 0 }); }

  seedCost(kind:PlantKind){if(kind==='goldleaf')return this.props.plants.goldleaf.SunCost+this.beachFinale.tiles.length*this.props.plants.goldleaf.SunCostIncrement;if(kind==='powerplant'||kind==='imitater'&&this.imitateKind==='powerplant'){const costs=this.props.plants.powerplant.SunCostList,count=this.level.powerTiles.filter(t=>t.group==='epsilon').length+this.plants.filter(p=>p.hp>0&&p.kind==='powerplant').length;return costs[Math.min(count,costs.length-1)];}return this.props.plants[kind==='imitater'&&this.imitateKind!==null?this.imitateKind:kind].SunCost;}
  seedCooldown(kind:PlantKind){return this.props.plants[kind==='imitater'&&this.imitateKind!==null?this.imitateKind:kind].Cooldown;}

  plant(kind: PlantKind, row: number, column: number, packetId?:number): boolean {
    const p = this.props.plants[kind];
    const tilePlant=kind==='hotpotato'||kind==='goldleaf'||kind==='powerplant'||kind==='powerplant_alpha'||kind==='powerplant_beta';
    // Native powertile tags use tilePutable: ordinary plants may share the square.
    if(tilePlant&&(this.level.powerTiles.some(t=>t.row===row&&t.column===column)||this.plants.some(p=>p.row===row&&p.column===column&&(p.endangered||p.kind==='powerplant'||p.kind==='powerplant_alpha'||p.kind==='powerplant_beta'))))return false;
    const placementKind=kind==='imitater'?this.imitateKind:kind;
    if(placementKind==='intensivecarrot'&&!this.eighties.carrot.at(row,column))return false;
    const pot=this.plants.find(p=>p.row===row&&p.column===column&&p.kind==='floawerPot');
    const existing=this.plants.find(p=>p.row===row&&p.column===column&&(kind==='lilypad'?p.kind==='lilypad':kind==='floawerPot'?p.kind==='floawerPot':p.kind!=='floawerPot'&&p.kind!=='lilypad'&&p.kind!=='bamboobusket'));
    if(pot&&this.darkPlants.states.get(pot.id)!.moving)return false;
    if(!this.kongfu.abbots.canPlant(kind,row,column))return false;
    const repairing=kind==='hollyknight'&&existing?.kind==='hollyknight'&&this.eighties.finale.needsReload(existing)||kind==='garlic'&&existing?.kind==='garlic'&&existing.hp<=p.Toughness*2/3||kind==='bamboozle'&&existing?.kind==='bamboozle'&&this.kongfu.bamboozle.needsReload(existing)||kind==='lychee'&&existing?.kind==='lychee'&&existing.hp<p.Toughness*5/6||kind==='turnip'&&existing?.kind==='turnip'&&existing.hp<=p.Toughness*2/3||kind==='endurian'&&existing?.kind==='endurian'&&existing.hp<p.Toughness*.75||kind==='bowlingbulb'&&existing?.kind==='bowlingbulb'&&this.beach.bowling.states.get(existing.id)!.loaded.some(loaded=>!loaded)||kind==='peanut'&&existing?.kind==='peanut'&&existing.hp<p.Toughness*.75||kind==='redstinger'&&existing?.kind==='redstinger'&&column>=6&&existing.hp<p.Toughness*.75||kind==='holonut'&&existing?.kind==='holonut'&&(existing.hidden||existing.hp<=p.Toughness*2/3)||this.wallnutFirstAid&&(kind==='wallnut'||kind==='primalwallnut'||kind==='tallnut')&&existing?.kind===kind&&existing.hp<=p.Toughness*(kind==='tallnut'?2/3:.75)||kind==='spikerock'&&existing?.kind==='spikerock'&&existing.spikes!<p.MaxSpike||kind==='chardguard'&&existing?.kind==='chardguard'&&existing.leaves!<p.MaxBounceTime;
    const stacking=kind==='peapod'&&existing?.kind==='peapod'&&existing.heads!<5;
    if(seaCell(this.level.planks,row,column)||!this.cowboy.canPlant(row,column)||this.dark.blocks(row,column)||!this.dark.canPlant(kind,row,column)||existing?.sheep!==undefined)return false;
    if(this.lostcity.cracks.some(c=>c.row===row&&c.column===column&&this.time<c.until))return false;
    if(!this.iceage.canPlant(kind,row,column))return false;
    if(kind==='imitater'&&this.imitateKind===null)return false;
    if(!this.beach.canPlant(placementKind!,row,column))return false;
    if(!this.sky.canPlant(placementKind!,column,row))return false;
    if(this.modern.blocked(row,column))return false;
    if(this.level.boss&&column>=BOARD.columns-this.level.boss.reserved)return false;
    if(this.dino.bully.cracks.some(c=>c.row===row&&c.column===column))return false;
    if(this.boss instanceof DinoBoss&&this.boss.cracks.some(c=>c.row===row&&c.column===column&&c.until>this.time))return false;
    const packet=this.conveyor.find(c=>c.id===packetId&&c.kind===kind);
    if (this.phase !== 'playing' || row < 0 || row >= BOARD.rows || column < 0 || column >= BOARD.columns
      || this.level.mold.some(c=>c.row===row&&c.column===column)
      || this.level.cannon || this.level.blacklist.includes(kind) || this.level.powerups || this.level.match || (this.level.conveyor?!packet:this.sun < this.seedCost(kind) || !this.preparing&&this.cooldowns[kind] > 0)
      || (placementKind==='gravebuster'?!this.graves.some(g=>g.row===row&&g.column===column&&g.hp>0&&g.kind!=='speaker'&&g.kind!=='eightiesarcadecabinet'&&g.kind!=='tent'&&g.kind!=='backpack'&&!isRack(g.kind)):this.graves.some(g=>g.row===row&&g.column===column&&g.hp>0)) || existing&&!tilePlant&&!stacking&&!repairing) return false;
    if(packet){if(this.level.corral)this.corralWaiting=false;this.conveyor.splice(this.conveyor.indexOf(packet),1);if(!this.level.corral)this.nextCard=Math.min(this.nextCard,this.time+this.conveyorDelay());}
    else {const cost=this.seedCost(kind);this.sun -= cost; this.sunSpent+=cost;this.cooldowns[kind] = this.preparing?0:this.seedCooldown(kind);}
    if(repairing){if(kind==='hollyknight')this.eighties.finale.repair(existing);else if(kind==='bamboozle')this.kongfu.bamboozle.repair(existing);else if(kind==='lychee')this.kongfu.lychee.repair(existing);else if(kind==='bowlingbulb')this.beach.bowling.replant(existing);else if(kind==='holonut')this.future.recoverNut(existing);else if(kind==='garlic'||kind==='turnip'||kind==='endurian'||kind==='peanut'||kind==='redstinger'||kind==='wallnut'||kind==='primalwallnut'||kind==='tallnut')existing.hp=p.Toughness;else if(kind==='chardguard'){existing.leaves=p.MaxBounceTime;existing.hp=p.Toughness;}else existing.spikes=p.MaxSpike;}else if(stacking){existing.heads!++;existing.hp=p.Toughness;}else this.addPlant(kind, row, column);
    if(packet?.forceBoosted)this.plantFood(row,column,true);
    else if(this.boosts.has(kind)&&!this.preparing){this.usedBoosts.add(kind);if(kind==='imitater')this.plants.at(-1)!.boosted=true;else this.plantFood(row,column,true);}
    this.checkChallenges();
    this.events.push({ type: 'plant' });
    return true;
  }

  addPlant(kind: PlantKind, row: number, column: number) {
    if(kind==='intensivecarrot'){this.eighties.carrot.revive(row,column);return;}
    if(kind!=='imitater')this.eighties.carrot.clear(row,column);
    if(isBowlingTool(kind)){this.beach.bowling.tool(kind,row,column);return;}
    const p = this.props.plants[kind];
    const nextAction = this.time + ((kind === 'sunflower'||kind==='twinsunflower'||kind==='primalsunflower') ? p.ProduceCountdownStart + this.random() * p.ProduceCountdownStartAdditional : kind==='coconutcannon'?0:.4);
    this.plants.push({ id: ++this.id, kind, row, column, hp: p.Toughness, armor: 0, age: 0, nextAction,
      action: 'idle', actionAt: this.time, fired: false, burst: 0, nextBurst: 0 });
    const plant=this.plants.at(-1)!;
    if(kind==='nightshade'||kind==='shrinkingviolet')this.modern.init(plant);
    if(plant.kind==='toadstool')this.toadstool.init(plant);this.lostcity.initPlant(plant);this.expedition.init(this.plants.at(-1)!);this.iceageCombat.init(plant);
    if(kind==='hotpotato')this.iceage.hot(plant);
    if(this.beachFinale.handles(kind))this.beachFinale.init(plant);
    if(kind==='homingthistle')this.beach.thistles.init(plant);
    if(kind==='bowlingbulb')this.beach.bowling.init(plant);
    if(kind==='lilypad'||kind==='tanglekelp')this.beach.initPlant(plant);
    if(this.darkFinale.handles(kind))this.darkFinale.init(plant);
    if(this.darkPlants.handles(kind))this.darkPlants.init(plant);
    if(this.western.handles(kind))plant.animation='Idle';
    if(kind==='peanut'){plant.animation='Idle0';plant.eventIndex=0;plant.nextAction=0;}
    if(kind==='fumeshroom'||kind==='sunbean')this.dark.init(plant);
    if(this.future.handles(kind))this.future.init(plant);
    if(this.westFinale.handles(kind))this.westFinale.init(plant);
    if(kind==='chardguard')plant.leaves=p.MaxBounceTime;
    if(kind==='bulbkekengi'||kind==='peacommando'||kind==='skyshooter'||kind==='asparagus')this.sky.initPlant(plant);
    if(kind==='goldbloom'){plant.animation='Attack';plant.action='produce';plant.eventIndex=0;}
    if(kind==='jalapeno'||kind==='perfumeshroom')plant.animation='Attack';
    if(kind==='escaperoot'){plant.rootGrown=false;plant.animation='Baby_Start';}
    if(kind==='peapod')plant.heads=1;
    if(kind==='spikerock')plant.spikes=p.MaxSpike;
    if(kind==='imitater'){plant.imitate=this.imitateKind!;plant.animation='Death';}
    if(kind==='cherry_bomb'||kind==='grapeshot')plant.animation='Attack';
    if(kind==='celerystalker'){plant.hidden=true;plant.animation='Idle_Hidden';plant.retreat=0;}
    this.kongfu.add(plant);this.eighties.add(plant);
    this.effect('plant', cellX(column), rowY(row));
  }

  shovel(row: number, column: number) {
    if (this.phase !== 'playing'||this.plants.some(p=>p.row===row&&p.column===column&&(p.endangered||p.sheep!==undefined))) return;
    const plant=this.plants.filter(p=>p.row===row&&p.column===column).sort((a,b)=>Number(a.kind==='floawerPot'||a.kind==='lilypad')-Number(b.kind==='floawerPot'||b.kind==='lilypad'))[0];
    if(plant){
      if(!this.preparing)this.plantsLost++;
      const cost=this.props.plants[plant.kind].SunCost*(plant.kind==='peapod'?plant.heads!:1);
      if(this.preparing){this.sun+=cost;this.sunSpent-=cost;}
      else if(this.shovelRefund>0&&!this.level.conveyor&&!this.level.match&&!this.level.powerups){
        // Native produceSun splits the refund into 75/50/25/5 sun pickups.
        this.sun+=Math.floor(cost*this.shovelRefund/5)*5;this.effect('collect',cellX(column),rowY(row)-35);this.events.push({type:'sun'});
      }
    }
    if(this.plants.some(p=>p.row===row&&p.column===column))this.effect('remove',cellX(column),rowY(row));
    this.plants = this.plants.filter(p => p!==plant);
    this.checkChallenges();
  }

  mowerPointer(x:number,y:number,held:boolean,begin=false) {
    const mower=held&&this.phase==='playing'&&this.manualMowers>0?this.mowers.find(m=>!m.active&&!m.spent&&Math.abs(x-m.x)<mowerPresentation.hitSize[0]*mowerPresentation.scale/2&&Math.abs(y-(rowY(m.row)+mowerPresentation.holdY*mowerPresentation.scale))<mowerPresentation.hitSize[1]*mowerPresentation.scale/2):undefined;
    // A drag away cancels the hold; returning without a new press does not restart it.
    if(this.heldMower!==null&&this.heldMower!==mower?.row)this.releaseMower();
    if(mower&&(begin||this.heldMower!==null))this.heldMower=mower.row;
  }
  releaseMower(){this.heldMower=null;for(const mower of this.mowers)mower.hold=0;}
  private launchMower(mower:Mower){mower.active=true;mower.starting=mowerPresentation.startSeconds;mower.hold=0;this.events.push({type:'mower'});}

  collect(id: number) {
    if (this.phase !== 'playing') return;
    const sun = this.suns.find(s => s.id === id);
    if (!sun) return;
    if(sun.bomb){this.future.collectBomb(sun);this.suns=this.suns.filter(s=>s.id!==id);return;}
    this.sun += sun.value; this.effect('collect', sun.x, sun.y);
    this.suns = this.suns.filter(s => s.id !== id); this.events.push({ type: 'sun' });
  }

  refreshSeed(kind:PlantKind):boolean {
    if(!this.plantfoodRefresh||this.phase!=='playing'||this.preparing||this.food===0||this.cooldowns[kind]<=0)return false;
    this.food--;this.cooldowns[kind]=0;return true;
  }
  plantFood(row: number, column: number, boost=false): boolean {
    if(this.level.airRaid)return this.sky.airRaid.food();
    const plant = this.plants.filter(p => p.row === row && p.column === column && p.hp>0&&p.kind!=='bamboobusket').sort((a,b)=>Number(a.kind==='floawerPot'||a.kind==='lilypad')-Number(b.kind==='floawerPot'||b.kind==='lilypad'))[0];
    if(plant?.sheep!==undefined||plant&&this.eighties.carrot.blocked(plant))return false;
    if(plant&&this.westFinale.handles(plant.kind)&&!this.westFinale.foodable(plant))return false;
    if(plant&&this.darkPlants.handles(plant.kind)&&!this.darkPlants.foodable(plant))return false;
    if((plant?.kind==='explodeonut'||plant?.kind==='endurian'||plant?.kind==='peanut')&&plant.armor===this.props.plants[plant.kind].ArmorToughness)return false;
    if(plant?.kind==='sunbean'&&this.dark.beanFood.has(plant.id))return false;
    if(plant?.kind==='holonut'&&!this.future.nutFoodable(plant))return false;
    if(plant?.kind==='lychee'&&this.kongfu.lychee.states.get(plant.id)!.fooded)return false;
    if(plant?.kind==='torchwood'&&this.dino.plants.blue.has(plant.id))return false;
    if(plant?.kind==='cactus'&&this.eighties.lit.has(plant.id))return false;
    if((plant?.kind==='tallnut'||plant?.kind==='primalwallnut')&&plant.armor>0)return false;
    if(plant?.kind==='escaperoot'&&(!plant.rootGrown||plant.action!=='idle'||plant.animation!=='Idle'))return false;
    if (!plant || plant.leap?.pushed || !boost&&this.food === 0 || this.phase !== 'playing' || plant.action === 'food' || ['goldbloom','loquat','hollybarrierleaf','hollybarrierleafplantfood','thymewarp','powerlily','goldleaf','hotpotato','powerplant','powerplant_alpha','powerplant_beta','empea','blover','gravebuster','imitater','perfumeshroom','grapeshot','cherry_bomb','jalapeno'].includes(plant.kind)) return false;
    this.eighties.skunk.stunned.delete(plant.id);
    if(!boost){this.food--;this.future.link(plant);} plant.action = 'food'; plant.actionAt = this.time; plant.fired = false;
    this.effect('food', cellX(column), rowY(row) - 35); this.events.push({ type: 'food' });
    if(plant.kind==='nightshade'||plant.kind==='shrinkingviolet')this.modern.food(plant);
    if(this.eighties.finale.handles(plant.kind)||plant.kind==='caulipower'||plant.kind==='sporeshroom'||plant.kind==='garlic'||plant.kind==='phatbeet'||plant.kind==='cactus')this.eighties.food(plant);
    if(plant.kind==='bulbkekengi'||plant.kind==='peacommando'||plant.kind==='moonbean'||plant.kind==='anthurium'||plant.kind==='skyshooter'||plant.kind==='asparagus')this.sky.food(plant);
    if(plant.kind==='explodeonut'){plant.hp=this.props.plants.explodeonut.Toughness;plant.animation='Food';plant.eventIndex=0;this.beach.sounds.push('explodeonut/foodSound');}
    if(plant.kind==='torchwood')this.dino.plants.food(plant);
    if(plant.kind==='primalpotatomine')this.dino.mines.food(plant);
    if(plant.kind==='primalsunflower'){plant.animation='Food';plant.eventIndex=0;}
    if(plant.kind==='toadstool')this.toadstool.food(plant);
    if(plant.kind==='akee')this.lostcity.food(plant);
    if(plant.kind==='zoybeanpod')this.lostcity.zoyFood(plant);
    if(plant.kind==='snowpea')this.lostcity.snowFood(plant);
    if(plant.kind==='lavaguava'||plant.kind==='gatling')this.expedition.food(plant);
    if(plant.kind==='endurian'||plant.kind==='primalpeashooter'||plant.kind==='pepperpult'||plant.kind==='stunion'||plant.kind==='firepeashooter')this.iceageCombat.food(plant);
    if(this.beachFinale.handles(plant.kind))this.beachFinale.food(plant);
    if(plant.kind==='splitpea'||plant.kind==='chilibean')this.cowboy.food(plant);
    if(plant.kind==='homingthistle')this.beach.thistles.food(plant);
    else if(plant.kind==='bowlingbulb')this.beach.bowling.food(plant);
    if(plant.kind==='lilypad'||plant.kind==='tanglekelp')this.beach.food(plant);
    if(this.darkFinale.handles(plant.kind))this.darkFinale.food(plant);
    if(this.darkPlants.handles(plant.kind))this.darkPlants.food(plant);
    if(plant.kind==='peanut')this.dark.peanutFood(plant);
    if(plant.kind==='fumeshroom'||plant.kind==='sunbean')this.dark.food(plant);
    if(this.future.handles(plant.kind))this.future.food(plant);
    if(this.westFinale.handles(plant.kind))this.westFinale.food(plant);
    if(this.western.handles(plant.kind))this.western.food(plant);
    if(this.finale.handles(plant.kind))this.finale.food(plant);
    if(plant.kind==='escaperoot')this.escape.food(plant);
    if (plant.kind === 'repeater') {plant.burst=this.props.plants.repeater.PlantfoodPeaCount;plant.nextBurst=this.time+2/plant.burst;plant.animation='Food';plant.eventIndex=0;}
    if(['cantaloupe','bloominghearts','kernelpult','melonpult','wintermelon','snowdrop','sapfling','celerystalker','snapdragon','spikeweed','spikerock','springbean','threepeater','coconutcannon'].includes(plant.kind)){plant.animation='Food';plant.eventIndex=0;}
    if(plant.kind==='spikerock')plant.spikes=this.props.plants.spikerock.MaxSpike;
    if(plant.kind==='threepeater'){plant.burst=0;plant.nextBurst=this.time+.01;}
    if(plant.kind==='peapod'||plant.kind==='parsnip'){plant.animation='FoodStart';plant.eventIndex=0;plant.burst=plant.kind==='peapod'?5:this.props.plants.parsnip.PlantfoodSummonCount;}
    if(plant.kind==='peach')this.kongfu.peach.food(plant);
    if(plant.kind==='bamboozle')this.kongfu.bamboozle.food(plant);
    if(plant.kind==='solarsage')this.kongfu.sage.food(plant);
    if(plant.kind==='lychee')this.kongfu.lychee.food(plant);
    if(plant.kind==='turnip')this.kongfu.turnip.food(plant);
    if(plant.kind==='bambooshoot')this.kongfu.bamboo.start(plant,true);
    if(plant.kind==='firegourd')this.kongfu.start(plant,true);
    if(plant.kind==='celerystalker'){plant.hidden=false;plant.hp=this.props.plants.celerystalker.Toughness;}
    if (plant.kind === 'peashooter') { plant.burst = this.props.plants.peashooter.PlantfoodPeaCount; plant.nextBurst = this.time + 2 / plant.burst; }
    if(plant.kind==='bloomerang'){plant.burst=this.props.plants.bloomerang.PlantfoodBoomerangCount;plant.nextBurst=this.time+.01;}
    if(plant.kind==='sunflower'||plant.kind==='twinsunflower'){plant.burst=this.props.plants[plant.kind].PlantfoodTime;plant.nextBurst=this.time+4/30;}
    if(plant.kind==='bonkchoy'){plant.burst=this.props.plants.bonkchoy.PlantfoodHitCount;plant.nextBurst=this.time+this.timing.bonk!.foodStart;plant.facing=1;}
    if(plant.kind==='iceweed')this.iceweedSpikes.set(plant.id,3);
    if(plant.kind==='primalwallnut'){plant.hp=this.props.plants.primalwallnut.Toughness;plant.animation='Food';plant.eventIndex=0;}
    if(plant.kind==='tallnut'){plant.hp=this.props.plants.tallnut.Toughness;plant.armor=this.props.plants.tallnut.ArmorToughness;plant.action='idle';this.cowboy.sounds.push('tallnut/foodSound');}
    if (plant.kind === 'wallnut') { plant.hp = this.props.plants.wallnut.Toughness; }
    if (plant.kind === 'potatomine') {
      plant.age = this.props.plants.potatomine.ChargeTime;
      const cells = Array.from({ length: 45 }, (_, index) => ({ row: Math.floor(index / 9), column: index % 9 }))
        .filter(c => !seaCell(this.level.planks,c.row,c.column)&&!this.level.mold.some(m=>m.row===c.row&&m.column===c.column)&&!this.plants.some(p => p.row === c.row && p.column === c.column)&&!this.graves.some(g=>g.row===c.row&&g.column===c.column));
      for (let i = 0; i < 2 && cells.length; i++) {
        const cell = cells.splice(Math.floor(this.random() * cells.length), 1)[0];
        this.addPlant('potatomine', cell.row, cell.column); this.plants.at(-1)!.age = this.props.plants.potatomine.ChargeTime;
      }
    }
    return true;
  }

  private tickThreepeater(p:Plant){
    const props=this.props.plants.threepeater,x=cellX(p.column),y=rowY(p.row)-40;
    const shoot=(row:number,vx:number,vy:number,ay=0,stopY?:number)=>this.peas.push({id:++this.id,row,x:x+15,y,damage:20,powered:false,vector:{vx,vy,ay,stopY}});
    if(p.action==='food'){
      while(p.burst<=props.PlantfoodPeaCount&&this.time>=p.nextBurst){
        const angle=Math.PI*(props.PlantfoodPeaCount/2-Math.abs(p.burst%props.PlantfoodPeaCount-props.PlantfoodPeaCount/2))/props.PlantfoodPeaCount;
        for(const direction of [-1,1])shoot(p.row,240*Math.cos(angle),direction*240*Math.sin(angle));shoot(p.row,240,0);
        p.burst++;p.nextBurst+=2/props.PlantfoodPeaCount;
      }
      if(p.burst>props.PlantfoodPeaCount){p.action='idle';p.animation='Idle';p.nextAction=this.time+props.ShootInterval;}
      return;
    }
    if(p.action==='idle'&&this.time>=p.nextAction&&(this.zombies.some(z=>z.hp>0&&!swinging(z,this.time)&&Math.abs(z.row-p.row)<=1&&z.x>x-15)||this.iceage.blocks.some(b=>b.glacier&&b.hp>0&&Math.abs(b.row-p.row)<=1&&cellX(b.column)>x))){
      p.action='shoot';p.animation=p.row===0?'Shoot110':p.row===4?'Shoot011':'Shoot111';p.actionAt=this.time;p.eventIndex=0;p.nextAction=this.time+props.ShootInterval+this.random()*props.ShootIntervalAdditional;
    }
    if(p.action!=='shoot')return;
    const timeline=this.props.plantAnimations.threepeater[p.animation!],elapsed=this.time-p.actionAt;
    while(p.eventIndex!<timeline.events.length&&elapsed>=timeline.events[p.eventIndex!].at){
      const event=timeline.events[p.eventIndex!++].name,offset=event==='shootU'?-1:event==='shootD'?1:0;
      if(event.startsWith('shoot'))shoot(p.row+offset,240,offset*270,-offset*270*270/(2*BOARD.cellHeight),offset?y+offset*BOARD.cellHeight:undefined);
    }
    if(elapsed>=timeline.duration){p.action='idle';p.animation='Idle';}
  }

  dropSun(x: number, y: number, value: number, from: Sun['from']) {
    if(from==='plant')this.sunProduced+=value;
    this.suns.push({ ...(from==='sky'&&this.level.sunBomb?{bomb:true}:{}),id: ++this.id, x, y, targetY: from === 'sky' ? rowY(2)-50+this.random()*200 : y+65, value, age: 0, from,
      vx:from==='sky'?0:(6*this.random()-3)*30,vy:from==='sky'?90:-300,groundAge:0,absorber:null,absorbAge:0 });
  }

  private produceSun(p:Plant) {
    const value=this.props.plants[p.kind].SunValue;
    // Sunflower.produceSun(100) is two medium suns, not one doubled pickup.
    if(value===100)for(const dx of [-15,15])this.dropSun(cellX(p.column)+dx,rowY(p.row)-65,50,'plant');
    else this.dropSun(cellX(p.column),rowY(p.row)-65,value,'plant');
  }

  private shoot(p: Plant, powered: boolean) {
    this.peas.push({ id: ++this.id, row: p.row, x: cellX(p.column) + 38, y: rowY(p.row) - 48 + (powered ? (this.random()-.5)*15 : 0), damage: 20, powered, ...(powered ? {speed:(8+this.random()*3-1.5)*BOARD.cellWidth} : {}) });
    this.events.push({ type: 'shot' });
  }

  damage(zombie: Zombie, amount: number, cause: DeathCause = 'normal') {
    if(zombie.dinoCarry)return;
    if(this.sky.twins.damage(zombie,amount,cause))return;
    if(this.eighties.protected(zombie))return;
    const ice=this.iceage.blocks.find(b=>b.hp>0&&b.zombie===zombie);if(ice){ice.hp-=amount;return;}
    if(zombie.kind==='future_protector_shield'){this.future.damageShield(zombie,amount);return;}
    if(swinging(zombie,this.time))return;
    if(zombie.heartDefence)for(const rate of zombie.heartDefence)amount/=rate;
    if(this.lostcity.damageBug(zombie,amount))return;
    if(this.boss?.zombie===zombie){this.boss.hit(amount);return;}
    // Pharaoh's coffin protects its inner zombie: breaking it does not carry excess damage through.
    if(zombie.kind==='pharaoh'||zombie.kind==='pharaoh_weak'){const excess=Math.max(0,amount-zombie.armor),weak=zombie.kind==='pharaoh_weak';zombie.armor=Math.max(0,zombie.armor-amount);if(zombie.armor===0){zombie.kind='pharaoh_inner';zombie.landUntil=this.time+80/30;if(weak){zombie.hp-=excess;if(zombie.hp<=0)zombie.deathCause=cause;}}return;}
    if(zombie.kind==='beach_gargantuar'&&!this.beach.inWater(zombie))amount*=this.props.zombies[zombie.kind].TakingDamageScaleOnLand;
    amount=this.modern.damageScale(zombie)*this.kongfu.damageScale(zombie)*this.cowboy.damage(zombie,amount)*Math.pow(.85,zombie.dark?.toughness??0);
    amount=this.modern.enemies.damage(zombie,this.modern.paperDamage(zombie,amount));
    const armorDamage = Math.min(zombie.armor, amount); zombie.armor -= armorDamage; zombie.hp -= amount - armorDamage;this.cowboy.damaged(zombie);this.iceageCombat.damaged(zombie);
    if(isCamel(zombie.kind)&&!isMatchCamel(zombie.kind)&&zombie.armor===0){zombie.kind='mummy';}
    if (zombie.hp<=0)zombie.deathCause=cause;
  }

  private bonkTarget(p:Plant) {
    const props=this.props.plants.bonkchoy,x=cellX(p.column);
    const z=this.zombies.filter(z=>z.hp>0&&this.inLane(z,p.row)&&Math.abs(z.x-x)<props.ZombieDetectorWidth*BOARD.cellWidth/2).sort((a,b)=>a.x-b.x)[0];
    if(z)return {x:z.x,hp:z.hp+z.armor,hit:(damage:number)=>this.damage(z,damage)};
    const g=this.graves.filter(g=>g.hp>0&&g.row===p.row&&Math.abs(cellX(g.column)-x)<props.TombDetectorWidth*BOARD.cellWidth/2).sort((a,b)=>a.column-b.column)[0];
    return g?{x:cellX(g.column),hp:g.hp,hit:(damage:number)=>{g.hp-=damage;}}:null;
  }
  private tickBonk(p:Plant) {
    const props=this.props.plants.bonkchoy,timing=this.timing.bonk!;
    if(p.action==='food'){
      while(p.burst>0&&this.time>=p.nextBurst){
        for(const z of this.zombies)if(z.hp>0&&Math.abs(z.row-p.row)<=1&&Math.abs(z.x-cellX(p.column))<1.5*BOARD.cellWidth)this.damage(z,props.DamagePlantfood);
        for(const g of this.graves)if(Math.abs(g.row-p.row)<=1&&Math.abs(g.column-p.column)<=1)g.hp-=props.DamagePlantfood;
        p.burst--;p.nextBurst+=timing.foodHit;
      }
      if(p.burst===0){p.action='idle';p.nextAction=this.time;}
      return;
    }
    if(p.action==='shoot'&&!p.fired&&this.time-p.actionAt>=(p.heavy?timing.heavy:timing.attack)){
      p.fired=true;this.bonkTarget(p)?.hit(p.heavy?props.DamageHeavy:props.Damage);
    }
    if(this.time>=p.nextAction){
      const target=this.bonkTarget(p);
      if(target){p.action='shoot';p.actionAt=this.time;p.fired=false;p.heavy=target.hp<props.DamageHeavy;p.facing=target.x<cellX(p.column)?-1:1;p.nextAction=this.time+props.AttackInterval;}
      else {p.action='idle';p.facing=1;}
    }
  }

  private bouncePlant(plant:Plant){
    // Native grave waves search outward through shuffled 3×3 neighborhoods.
    const visited=new Set([plant.row*9+plant.column]);let frontier=[{row:plant.row,column:plant.column}];
    while(frontier.length){const next:typeof frontier=[];
      for(const cell of frontier){const neighbors=Array.from({length:9},(_,i)=>({row:cell.row+Math.floor(i/3)-1,column:cell.column+i%3-1})).filter(c=>c.row>=0&&c.row<5&&c.column>=0&&c.column<9);
        while(neighbors.length){const c=neighbors.splice(Math.floor(this.random()*neighbors.length),1)[0],key=c.row*9+c.column;if(visited.has(key))continue;visited.add(key);
          if(!this.graves.some(g=>g.row===c.row&&g.column===c.column)&&!this.plants.some(p=>p.row===c.row&&p.column===c.column)&&!this.level.mold.some(m=>m.row===c.row&&m.column===c.column)){
            plant.leap={x:cellX(plant.column),y:rowY(plant.row),at:this.time};plant.row=c.row;plant.column=c.column;return;
          }next.push(c);
        }
      }frontier=next;
    }
    plant.hp=0;
  }

  private startWave() {
    const actions=this.level.actions[this.wave];
    this.pending=[];
    if(this.level.airRaid)this.sky.airRaid.startWave(this.wave);
    for(const action of actions){
      if(action.airRaidSchedule){this.sky.airRaid.schedule(action.airRaidSchedule);continue;}
      if(action.mode==='qigong'){for(const q of action.qigong!)this.pending.push({kind:q.Type,row:q.Rows[Math.floor(this.random()*q.Rows.length)],x:cellX(q.Columns[Math.floor(this.random()*q.Columns.length)]),mode:'ground',at:this.time+q.Delay,food:false});continue;}
      if(action.thunder){this.sky.thunder.queue(action.thunder);continue;}
      if(action.dropShip){this.sky.addDropShip(action.dropShip);continue;}
      if(action.dinosaur){this.dino.add(action.dinosaur);continue;}
      if(action.portal)this.modern.portal(action.portal);
      if(action.jams)for(const jam of action.jams)this.eighties.jam=jam;
      if(action.mode==='chiHole'){this.kongfu.holes.spawn(action.chiHole!);continue;}
      if(action.mode==='frost'){this.iceage.wind(action.winds!);continue;}
      if(action.mode==='tide'){this.beach.change(action.tide!);continue;}
      if(action.mode==='conveyor'){if(action.remove)this.conveyorPlants=this.conveyorPlants.filter(p=>!action.remove!.includes(p.PlantType));if(action.add)this.conveyorPlants.push(...action.add);continue;}
      if(action.mode==='graves'){
        if(action.graveTypes!.every(t=>t==='speaker')){const cells=action.positions!.filter(c=>!this.graves.some(g=>g.row===c.row&&g.column===c.column));for(let i=0;i<action.graveCount!&&cells.length;i++){const c=cells.splice(Math.floor(this.random()*cells.length),1)[0];this.eighties.speaker.spawn(c.row,c.column);}continue;}
        if(action.graveTypes!.every(t=>t==='taichitile')){this.kongfu.addTiles(action.positions!.slice(0,action.graveCount));continue;}
        const cells=action.positions!.filter(c=>!this.graves.some(g=>g.row===c.row&&g.column===c.column));
        for(let i=0;i<action.graveCount!&&cells.length;i++){const cell=cells.splice(Math.floor(this.random()*cells.length),1)[0];this.graves.push({...cell,kind:action.graveTypes![i],spawnAt:this.time,id:++this.id,hp:isRack(action.graveTypes![i])?rackHP(action.graveTypes![i]):this.props.grave.Toughness,stage:0});this.effect('graveSpawn',cellX(cell.column),rowY(cell.row));}
        for(const plant of this.plants)if(this.graves.some(g=>g.row===plant.row&&g.column===plant.column))this.bouncePlant(plant);
        continue;
      }
      if(action.mode==='graveZombies'){this.pendingGraveSpawns.push({action,at:this.time+action.wait!});continue;}

      if(action.mode==='spider'||action.mode==='parachute'){
        let left=action.zombies.length;
        for(let at=0;at<action.spiderDuration!&&left>0;at+=action.interval){
          for(let i=0;i<action.groupSize&&left>0;i++){
            let row=Math.floor(this.random()*5),column=action.columnStart+Math.floor(this.random()*(action.columnEnd-action.columnStart+1));
            const cargo=action.cargo?.[action.zombies.length-left];if(cargo?.mX!==undefined)column=cargo.mX;if(cargo?.mY!==undefined)row=cargo.mY;
            // Native spider rain spends this attempt when the sampled square lies outside the lawn.
            if(column<0||column>=BOARD.columns)continue;
            this.pending.push({cargo:cargo?.Type,kind:action.zombies[action.zombies.length-left].kind,row,x:cellX(column),mode:action.mode,fallTime:action.fallTime,at:this.time+at,food:false});left--;
          }
        }
        continue;
      }
      const delay=action.delay?action.delay.Min+this.random()*(action.delay.Max-action.delay.Min):0;
      const foodIndices=new Set<number>();
      const indices=action.zombies.flatMap((z,i)=>this.props.zombies[z.kind].CannotCarryPlantfoodsInWaves||z.kind==='egypt_gargantuar'?[]:[i]);
      for(let n=0;n<action.food&&indices.length;n++)foodIndices.add(indices.splice(Math.floor(this.random()*indices.length),1)[0]);
      action.zombies.forEach((z,i)=>{
        const rows=this.level.planks===null?[0,1,2,3,4]:this.props.zombies[z.kind].ChooseToSpawnOnNonDeckRows?[0,1,2,3,4].filter(r=>!this.level.planks!.includes(r)):this.level.planks;
        let row=z.row===null?rows[Math.floor(this.random()*rows.length)]:z.row;
        if(action.mode==='storm'||action.lowTide){
          const counts=Array.from({length:5},(_,r)=>this.zombies.filter(z=>z.row===r).length+this.pending.filter(z=>z.row===r).length);
          const rows=counts.flatMap((n,r)=>n===Math.min(...counts)?[r]:[]);row=rows[Math.floor(this.random()*rows.length)];
        }
        const column=action.columnStart+Math.floor(this.random()*(action.columnEnd-action.columnStart+(action.mode==='ground'||action.mode==='spider'?1:0)));
        this.pending.push({airRaidType:z.airRaidType,kind:z.kind,row,x:z.column!==undefined?cellX(z.column):(action.mode==='walk'||action.mode==='raid')?(this.level.corral?1070-2*BOARD.cellWidth:1070)+(z.behind?BOARD.cellWidth:0)+(this.level.world==='pirate'?this.pending.filter(p=>p.row===row).length*2*BOARD.cellWidth:0):cellX(column),mode:z.column!==undefined?'ground':action.mode,
          at:this.time+delay+(action.lowTide?action.wait!+Math.ceil((i+1)/action.groupSize)*action.interval:action.mode==='spider'?Math.floor(i/action.groupSize)*action.interval:(action.mode==='storm'||action.mode==='raid')?Math.ceil((i+1)/action.groupSize)*action.interval:action.mode==='ground'?this.random():0),food:foodIndices.has(i)});
      });
      if(action.mode==='raid')this.events.push({type:'raid'});
      if(action.mode==='storm')this.events.push({type:'storm'});
    }
    if(!this.level.suppressFlag&&(this.wave+1)%this.level.flagInterval===0)this.pending.unshift({kind:this.level.world==='modern'?'tutorial_flag':this.level.world==='sky'?'sky_flag':this.level.world==='dino'?'dino_flag':this.level.world==='eighties'?'eighties_flag':this.level.world==='kongfu'?(this.level.day>=33?'abbot_flag':this.level.day>=17?'monk_flag':'kongfu_flag'):this.level.world==='lostcity'?'lostcity_flag':this.level.world==='iceage'?'iceage_flag':this.level.world==='beach'?'beach_flag':this.level.world==='pirate'?'pirate_flag':this.level.world==='west'?'cowboy_flag':this.level.world==='dark'?'dark_flag':this.level.world==='future'?'future_flag':'mummy_flag',row:this.level.planks===null?Math.floor(this.random()*5):this.level.planks[Math.floor(this.random()*this.level.planks.length)],x:1070,mode:'walk',at:this.time,food:false});
    this.wave++;this.nextWave=Infinity;this.waveIds.clear();
    this.waveDeadline=this.time+RULES.waveDelay+this.random()*RULES.waveDelayRange;
    this.waveDamageDeadline=this.time+RULES.waveDamageDelay+this.random()*RULES.waveDamageRange;
    this.threshold=this.level.minHealth+this.random()*(this.level.maxHealth-this.level.minHealth);
    this.waveHealth=this.pending.reduce((n,z)=>n+(isCamel(z.kind)?this.props.zombies[z.kind].TeamMemberCount[0]*this.props.zombies.mummy.Toughness:this.props.zombies[z.kind].Toughness),0);
    if(this.level.corral){this.corralWaiting=true;this.conveyor.push({id:++this.id,kind:this.conveyorPlants[0].PlantType,lane:0,position:0});this.threshold=0;this.waveDeadline=Infinity;this.waveDamageDeadline=this.time;}
    this.events.push({ type: 'wave' });
  }

  collectPickup(id:number) {
    if(this.phase!=='playing')return;
    const p=this.pickups.find(p=>p.id===id);
    if(!p||p.kind==='food'&&this.food>=this.foodLimit)return;
    if(p.kind==='food')this.food++;else {this.sprouts++;this.events.push({type:'sprout'});}
    this.pickups.splice(this.pickups.indexOf(p),1);
  }

  freeze(z:Zombie,duration:number) {
    if(this.eighties.protected(z))return;
    if(z.kind==='kongfu_bronze_statue')return;
    if(z.kind==='iceage_hunter_veteran'||z.kind==='iceage_troglobite_veteran'||z.kind==='iceage_dodo'||z.kind==='iceage_gargantuar'||z.kind==='iceage_troglobite'||z.kind==='iceage_weaselhoarder'||z.kind==='iceage_weasel'){this.chill(z,duration);return;}
    if(this.boss?.zombie===z){this.boss.freeze();return;}
    for(const member of this.zombies)if(member.id===z.id||isCamel(z.kind)&&member.team===z.team){member.frozenUntil=this.time+duration;this.modern.enemies.cold(member);this.cowboy.cold(member);this.kongfu.cold(member);if(member.kind==='lostcity_gargantuar')this.lostcity.torches.set(member.id,false);const special=this.specialZombies.get(member.id);if(special)special.torch=false;}
  }

  spawnZombie(kind:ZombieKind,row:number,x:number,entry:SpawnAction['mode']='walk',airRaidType?:string) {
    const camel=isCamel(kind),match=isMatchCamel(kind);
    const z:Zombie={id:++this.id,kind,row,x,hp:camel?this.props.zombies.mummy.Toughness:(kind==='pharaoh'||kind==='pharaoh_weak')?this.props.zombies.pharaoh_inner.Toughness:this.props.zombies[kind].Toughness,
      armor:modernArmor(kind)?this.props.armors[modernArmor(kind)!].Toughness:kind==='sky_armor1'||kind==='sky_armor2'?this.props.armors[kind].Toughness:dinoArmor(kind)?this.props.armors[dinoArmor(kind)!].Toughness:(kind==='eighties_8bit_armor1'||kind==='eighties_8bit_armor2'||kind==='eighties_armor1'||kind==='eighties_armor2'||kind==='eighties_armor4')?this.props.armors[kind].Toughness:kongfuArmor(kind)?this.props.armors[kongfuArmor(kind)!].Toughness:lostcityArmor(kind)?this.props.armors[lostcityArmor(kind)!].Toughness:iceageArmor(kind)?this.props.armors[iceageArmor(kind)!].Toughness:beachArmor(kind)?this.props.armors[beachArmor(kind)!].Toughness:darkArmor(kind)?this.props.armors[darkArmor(kind)!].Toughness:futureArmor(kind)?this.props.armors[futureArmor(kind)!].Toughness:cowboyArmor(kind)?this.props.armors[cowboyArmor(kind)!].Toughness:pirateArmor(kind)?this.props.armors[pirateArmor(kind)!].Toughness:(kind==='pharaoh'||kind==='pharaoh_weak')?this.props.zombies[kind].Toughness:camel&&!match?this.props.zombies[kind].Toughness:kind==='mummy_armor1'?this.props.armors.egypt_armor1.Toughness:kind==='mummy_armor2'?this.props.armors.egypt_armor2.Toughness:kind==='mummy_armor4'?this.props.armors.egypt_armor4.Toughness:0,
      eating:false,absorbed:0,absorbUntil:0,absorbState:'idle',absorbAt:0,deathCause:'normal',frozenUntil:0,chilledUntil:0,food:false,entry,entryAt:this.time,entryX:x,camelPart:0,team:0,leap:null};
    this.zombies.push(z);this.modern.spawn(z);this.sky.twins.spawn(z);this.sky.special.spawn(z);this.sky.airRaid.spawn(z,airRaidType);this.sky.drones.spawn(z);this.eighties.spawn(z);this.kongfu.spawn(z);this.lostcity.spawn(z);this.iceageCombat.spawn(z);this.beach.fishers.spawn(z);this.beach.surfers.spawn(z);this.beach.octopuses.spawn(z);this.dark.spawn(z);this.future.spawn(z);this.cowboy.spawn(z);if(this.level.world==='pirate'||this.level.world==='modern')this.pirate.spawn(z);
    if(match)this.camelCards.set(z.id,{face:Math.floor(this.random()*this.level.match!.types),state:'back',at:this.time,removeAt:Infinity});
    if(['egypt_gargantuar','explorer','explorer_veteran','tomb_raiser'].includes(kind))this.specialZombies.set(z.id,{action:'walk',at:this.time,elapsed:0,fired:false,next:kind==='tomb_raiser'?this.props.zombies.tomb_raiser.TimeBetweenGroups+this.random()*this.props.zombies.tomb_raiser.TimeBetweenGroupsAdditional:0,imp:true,torch:kind==='explorer'||kind==='explorer_veteran'});
    if(entry==='ground')this.effect('ground',x,rowY(row));
    return z;
  }

  private conveyorWeight(p:NonNullable<Level['conveyor']>['InitialPlantList'][number]) {
    if(p.MaxDelivered!==undefined&&(this.conveyorDeliveryCount.get(p)??0)>=p.MaxDelivered)return 0;
    const count=this.level.powerTiles.filter(t=>'powerplant_'+t.group===p.PlantType).length+this.plants.filter(plant=>plant.kind===p.PlantType).length+this.conveyor.filter(card=>card.kind===p.PlantType).length;
    // ConveyorPlant's serialized default for either weight factor is 1.
    let weight=p.Weight;
    if(p.MinCount!==undefined&&count<=p.MinCount)weight*=p.MinWeightFactor??1;
    if(p.MaxCount!==undefined&&count>=p.MaxCount){weight*=p.MaxWeightFactor??1;if(p.MaxCountCooldownSeconds!==undefined&&this.time-(this.conveyorDelivered.get(p.PlantType)??-Infinity)<p.MaxCountCooldownSeconds)weight=0;}
    return weight;
  }

  chill(z:Zombie,duration:number) {
    if(this.eighties.protected(z))return;
    if(z.kind==='kongfu_boss_explode')return;
    if(z.kind==='kongfu_bronze_statue')return;
    for(const member of this.zombies)if(member.id===z.id||isCamel(z.kind)&&member.team===z.team){member.chilledUntil=this.time+duration;this.modern.enemies.cold(member);this.cowboy.cold(member);this.kongfu.cold(member);if(member.kind==='lostcity_gargantuar')this.lostcity.torches.set(member.id,false);const state=this.specialZombies.get(member.id);if(state)state.torch=false;}
  }

  flipCamel(id:number) {
    const card=this.camelCards.get(id),z=this.zombies.find(z=>z.id===id);
    if(this.phase!=='playing'||!z||!card||card.state!=='back'||this.time<this.matchUntil||this.time-z.entryAt<1.35)return false;
    for(const failed of this.failedCards){const c=this.camelCards.get(failed)!;c.state='back';c.at=this.time;}this.failedCards=[];
    card.state='face';card.at=this.time;this.events.push({type:'flip'});
    if(this.firstCard===null){this.firstCard=id;return true;}
    const first=this.camelCards.get(this.firstCard)!;
    if(first.face===card.face){
      for(const c of [first,card]){c.removeAt=this.time+1;c.at=this.time;}
      this.matchUntil=this.time+.5;
    }else {this.failedCards=[this.firstCard,id];first.at=this.time;}
    this.firstCard=null;return true;
  }
  private tickMatching() {
    if(!this.level.match)return;
    for(const [id,card] of this.camelCards){
      if(card.removeAt!==Infinity&&this.time>=card.removeAt-.5&&card.state!=='match'){card.state='match';card.at=this.time;this.events.push({type:'match'});}
      if(this.time>=card.removeAt){const z=this.zombies.find(z=>z.id===id);if(z){z.hp=0;z.deathCause='match';}}
    }
    if(this.failedCards.length&&this.time-this.camelCards.get(this.failedCards[0])!.at>=3){for(const id of this.failedCards){const c=this.camelCards.get(id)!;c.state='back';c.at=this.time;}this.failedCards=[];}
    // Native camelUpdate adds cards of odd parity after the last wave.
    if(this.wave===this.level.waves.length&&!this.pending.length){
      const odd=Array.from({length:this.level.match.types},(_,face)=>face).filter(face=>this.zombies.filter(z=>z.hp>0&&this.camelCards.get(z.id)?.face===face).length%2===1);
      if(odd.length){const rows=[0,1,2,3,4].sort((a,b)=>this.zombies.filter(z=>z.row===a).length-this.zombies.filter(z=>z.row===b).length),team=this.id+1;
        odd.forEach((face,index)=>{const z=this.spawnZombie('camel_onehump_touch',rows[0],cellX(6)+index*60,'ground');z.team=team;z.camelPart=index===0?0:index===odd.length-1?2:1;this.camelCards.get(z.id)!.face=face;});
      }
    }
  }

  private tombCells(z:Zombie) {
    const col=Math.floor((z.x-BOARD.left)/BOARD.cellWidth);
    return Array.from({length:45},(_,i)=>({row:i%5,column:Math.floor(i/5)})).filter(c=>c.column>=Math.max(col-2,1)&&c.column<=col+1&&!this.graves.some(g=>g.row===c.row&&g.column===c.column)&&!this.plants.some(p=>p.row===c.row&&p.column===c.column));
  }
  private tickSpecialZombie(z:Zombie,dt:number) {
    const state=this.specialZombies.get(z.id);if(!state)return false;
    const step=dt*(this.time<z.chilledUntil?.5:1),t=this.timing.special!;
    const target=this.plants.filter(p=>p.hp>0&&p.row===z.row&&z.x>=cellX(p.column)-22&&z.x<=cellX(p.column)+75).sort((a,b)=>b.column-a.column)[0];
    const grave=this.graves.find(g=>g.row===z.row&&Math.abs(z.x-cellX(g.column))<75);
    if((z.kind==='explorer'||z.kind==='explorer_veteran')&&state.torch&&grave&&!target){grave.hp-=this.props.zombies[z.kind].FireDPS*step;z.eating=true;return true;}
    if(z.kind==='egypt_gargantuar'&&state.action==='walk'){
      if(state.imp&&z.hp<this.props.zombies[z.kind].Toughness/2&&z.x>cellX(2)){state.action='throw';state.elapsed=0;state.fired=false;state.at=this.time;}
      else if(target||grave){state.action='smash';state.elapsed=0;state.fired=false;state.at=this.time;}
    }
    if(z.kind==='tomb_raiser'&&state.action==='walk'&&!target&&z.x<cellX(9)&&z.x>cellX(2)&&this.tombCells(z).length){state.next-=step;if(state.next<=0){state.action='bone';state.elapsed=0;state.fired=false;state.at=this.time;}}
    if(state.action==='walk')return false;
    state.elapsed+=step;z.eating=false;
    if(state.action==='smash'&&!state.fired&&state.elapsed>=t.gargSmash){
      state.fired=true;
      if(target){if(target.kind==='iceweed'){this.damage(z,(this.iceweedSpikes.get(target.id)??1)>1?this.props.plants.iceweed.DamagePowered:this.props.plants.iceweed.Damage);this.chill(z,this.props.plants.iceweed.ChillDuration);const spikes=(this.iceweedSpikes.get(target.id)??1)-1;this.iceweedSpikes.set(target.id,spikes);if(spikes===0)target.hp=0;}else {target.hp=0;target.armor=0;}}
      if(grave)grave.hp-=this.props.zombies[z.kind].SmashDamage;
    }
    if(state.action==='throw'&&!state.fired&&state.elapsed>=t.gargThrow){
      state.fired=true;state.imp=false;const imp=this.spawnZombie('egypt_imp',z.row,z.x);
      imp.leap={fromX:z.x,fromY:rowY(z.row)-110,toX:cellX(2),toRow:z.row,at:this.time,duration:1.5};
    }
    if(state.action==='bone'){
      const crossed=[t.boneThrow,t.boneEnd+t.boneThrow].some(at=>state.elapsed-step<at&&state.elapsed>=at);
      if(crossed){state.fired=true;const cells=this.tombCells(z);
        if(cells.length){const cell=cells[Math.floor(this.random()*cells.length)],x=z.x-25,y=rowY(z.row)-100;
          this.missiles.push({id:++this.id,kind:'bone',row:cell.row,x,y,startX:x,startY:y,targetX:cellX(cell.column),targetY:rowY(cell.row),targetId:-1,age:0,duration:.9,damage:this.props.projectiles.tombraiser_bone.Damage,powered:false,returning:false,hits:[],dx:0,dy:0});}
      }

    }
    const end=state.action==='smash'?t.gargSmashEnd:state.action==='throw'?t.gargThrowEnd:t.boneEnd*2;
    if(state.elapsed>=end){state.action='walk';if(z.kind==='tomb_raiser')state.next=this.props.zombies.tomb_raiser.TimeBetweenGroups+this.random()*this.props.zombies.tomb_raiser.TimeBetweenGroupsAdditional;state.at=this.time;}
    return true;
  }

  private tickLatePlant(p:Plant) {
    const props=this.props.plants[p.kind],timings=this.props.plantAnimations[p.kind];
    const elapsed=this.time-p.actionAt;
    const lobber=p.kind!=='repeater';
    if(p.action==='food'&&p.kind==='repeater'){
      while(p.burst>0&&this.time>=p.nextBurst){this.shoot(p,true);p.burst--;p.nextBurst+=2/props.PlantfoodPeaCount;}
      if(elapsed>=2){
        p.animation='FoodBig';
        if(!p.fired&&elapsed>=2+timings.FoodBig.events.find(e=>e.name==='shootMega')!.at){p.fired=true;this.shoot(p,true);this.peas.at(-1)!.damage=this.props.projectiles.pea_mega.Damage;this.peas.at(-1)!.mega=true;}
        if(elapsed>=2+timings.FoodBig.duration){p.action='idle';p.animation='Idle';p.nextAction=this.time;}
      }
      return;
    }
    if(p.action==='shoot'||p.action==='food'){
      const animation=timings[p.animation!];
      for(;p.eventIndex!<animation.events.length&&elapsed>=animation.events[p.eventIndex!].at;p.eventIndex!++){
        const event=animation.events[p.eventIndex!].name;
        if(event==='Shoot')this.shoot(p,false);
        if(event==='Lob'||event==='Lob_Butter')this.throwCabbage(p);
        if(event==='lobFood'&&p.kind==='sapfling')for(let i=0;i<20;i++)this.lob(p,-1,cellX(Math.floor(this.random()*9)),rowY(Math.floor(this.random()*5))-45,true);
        if(event==='lobFood')for(const z of this.zombies.filter(z=>z.hp>0))this.lob(p,z.id,z.x,rowY(z.row)-45,true);
        if(/^foodLob[0-3]$/.test(event)){
          const band=Number(event.at(-1)),left=6-band*2,right=left+2;
          const targets=this.zombies.filter(z=>z.hp>0&&(band===0||z.x<cellX(right))&&(band===3||z.x>cellX(left)));
          for(const z of targets)this.lob(p,z.id,z.x,rowY(z.row)-45,true);
          for(let i=targets.length;i<5;i++){const row=Math.floor(this.random()*5);this.lob(p,-1,cellX(Math.floor(this.random()*9)),rowY(row)-45,true);}
        }
      }
      if(elapsed>=animation.duration){p.action='idle';p.animation='Idle';}
      return;
    }
    if(this.time>=p.nextAction&&(this.zombies.some(z=>z.hp>0&&this.inLane(z,p.row)&&(p.kind!=='sapfling'||z!==this.boss?.zombie)&&z.x>cellX(p.column)-15&&z.x<1150)||p.kind!=='sapfling'&&this.graves.some(g=>g.row===p.row&&g.column>p.column))){
      p.action='shoot';p.actionAt=this.time;p.eventIndex=0;p.variant=(p.kind==='kernelpult'||p.kind==='snowdrop')&&this.random()<props.ChanceToButter;
      p.animation=lobber?(p.variant?'Lob_Butter':'Lob'):'Shoot';
      p.nextAction=this.time+(lobber?props.ThrowInterval:props.ShootInterval)+this.random()*(lobber?props.ThrowIntervalAdditional:props.ShootIntervalAdditional);
    }
  }

  inLane(z:Zombie,row:number){if(z.dinoCarry||swinging(z,this.time)||this.dark.invisible(z))return false;return z===this.boss?.zombie?this.boss.covers(row):z.arbiter?Math.abs(z.row-row)<=1:z.drone?Math.abs(z.row-row)<.5:z.row===row;}
  throwBone(row:number,column:number,x:number,y:number){
    this.missiles.push({id:++this.id,kind:'bone',row,x,y,startX:x,startY:y,targetX:cellX(column),targetY:rowY(row),targetId:-1,age:0,duration:.9,damage:this.props.projectiles.tombraiser_bone.Damage,powered:false,returning:false,hits:[],dx:0,dy:0});
  }
  private launchParsnip(p:Plant,powered:boolean){
    const x=cellX(p.column),y=rowY(p.row),projectile=powered?'parsnip_child_small':'parsnip_child';
    this.missiles.push({id:++this.id,projectile,kind:'parsnip',row:p.row,x,y,startX:x,startY:y,targetX:1200,targetY:y,targetId:-1,age:0,duration:0,damage:this.props.projectiles[projectile].DamagePerHit,powered,returning:false,hits:[],dx:1,dy:0});
  }
  private tickFinalePlant(p:Plant){
    const props=this.props.plants[p.kind],timelines=this.props.plantAnimations[p.kind];
    const transition=(animation:string,action:Plant['action']=p.action)=>{p.animation=animation;p.action=action;p.actionAt=this.time;p.eventIndex=0;};
    const elapsed=(this.time-p.actionAt)*(p.kind==='parsnip'&&p.action==='shoot'?Math.max(1,1/props.AttackInterval):1);
    if(p.kind==='imitater'){
      if(elapsed>=timelines.Death.events.find(e=>e.name==='showPlant')!.at){
        this.addPlant(p.imitate!,p.row,p.column);p.hp=0;p.transformed=true;if(p.boosted)this.plantFood(p.row,p.column,true);
      }return;
    }
    if(p.kind==='cherry_bomb'||p.kind==='grapeshot'){
      if(elapsed>=timelines.Attack.events.find(e=>e.name==='explode')!.at){
        for(const z of this.zombies)if(z.hp>0&&Math.abs(z.row-p.row)<=1&&Math.abs(z.x-cellX(p.column))<123)this.damage(z,props.Damage,'potato');
        for(const g of this.graves)if(Math.abs(g.row-p.row)<=1&&Math.abs(g.column-p.column)<=1)g.hp-=props.Damage;
        this.effect(p.kind==='grapeshot'?'grape':'cherry',cellX(p.column),rowY(p.row));if(p.kind==='grapeshot'){this.escape.shootGrapes(p.row,p.column);this.beach.sounds.push('grapeshot/explSounds');}this.events.push({type:'explode'});p.hp=0;
      }return;
    }
    const celery=p.kind==='celerystalker',x=cellX(p.column);
    const targets=()=>this.zombies.filter(z=>z.hp>0&&this.inLane(z,p.row)&&(celery?z.x<x-35&&z.x>x-123:z.x>x-20&&z.x<x+205)).sort((a,b)=>a.x-b.x);
    const graves=()=>this.graves.filter(g=>g.hp>0&&g.row===p.row&&(celery?g.column===p.column-1:g.column>p.column&&g.column<=p.column+2)).sort((a,b)=>a.column-b.column);
    const hit=()=>{const z=targets()[0],g=graves()[0];if(z)this.damage(z,celery?props.DamagePerHit:props.DamagePerSnip);else if(g)g.hp-=celery?props.DamagePerHit:props.DamagePerSnip;};
    if(p.kind==='peapod'){
      if(p.action==='idle'&&this.time>=p.nextAction&&(this.zombies.some(z=>z.hp>0&&this.inLane(z,p.row)&&z.x>x-15)||this.graves.some(g=>g.hp>0&&g.row===p.row&&g.column>p.column))){transition('Shoot','shoot');p.nextAction=this.time+props.ShootInterval+this.random()*props.ShootIntervalAdditional;}
    }else if(celery&&p.action!=='food'){
      if(p.animation==='Idle_Hidden'){if(targets().length||graves().length){p.hidden=false;transition('Show','shoot');}return;}
      if(p.animation==='Idle'&&(targets().length||graves().length))transition('AttackStart','shoot');
      if(p.animation==='Idle'&&!targets().length&&!graves().length&&this.time>=p.retreat!){p.hidden=true;transition('Hide','shoot');}
    }else if(p.kind==='parsnip'&&(p.action==='idle'||p.action==='shoot'&&p.fired)&&this.time>=p.nextAction&&(targets().length||graves().length)){transition('Attack','shoot');p.fired=false;p.nextAction=this.time+props.AttackInterval;}
    if(!p.animation||p.animation==='Idle')return;
    const animation=p.animation,timeline=timelines[animation];
    p.eventIndex??=0;
    // Recompute elapsed after transitions so an old idle age cannot fire a new attack early.
    const age=(this.time-p.actionAt)*(p.kind==='parsnip'&&p.action==='shoot'?Math.max(1,1/props.AttackInterval):1);
    while(p.eventIndex<timeline.events.length&&age>=timeline.events[p.eventIndex].at){
      const event=timeline.events[p.eventIndex++].name;
      if(/^Shoot[0-4]$/.test(event)&&Number(event.at(-1))<p.heads!)this.shoot(p,false);
      if(event==='ShootMega'){this.shoot(p,true);const pea=this.peas.at(-1)!;pea.mega=true;pea.damage=this.props.projectiles.pea_mega.Damage;}
      if(event==='toFoodShoot'){transition('FoodShoot','food');return;}
      if(event==='hit'){hit();p.fired=true;if(celery){p.retreat=this.time+props.RetractionDelay;if(!targets().length&&!graves().length){transition('AttackEnd','shoot');return;}}}
      if(event==='attackLoop'){transition('AttackLoop','shoot');return;}
      if(event==='foodSummon'){
        const cells=Array.from({length:45},(_,i)=>({row:i%5,column:Math.floor(i/5)})).filter(c=>c.column<9-(this.level.boss?.reserved??0)&&!this.plants.some(p=>p.row===c.row&&p.column===c.column)&&!this.graves.some(g=>g.row===c.row&&g.column===c.column)&&!this.level.mold.some(m=>m.row===c.row&&m.column===c.column));
        for(let i=0;i<props.PlantfoodChildrenCount&&cells.length;i++){const c=cells.splice(Math.floor(this.random()*cells.length),1)[0];this.addPlant('celerystalker',c.row,c.column);}this.checkChallenges();
      }
      if(event==='summon'){this.launchParsnip(p,true);p.burst--;if(p.burst===0){transition('FoodEnd','food');return;}}
      if(event==='foodEnd'){transition('Idle','idle');p.nextAction=this.time;return;}
    }
    if(age>=timeline.duration){
      if(animation==='FoodStart')transition('Fooding','food');
      else if(animation==='Fooding')transition('Fooding','food');
      else if(animation==='FoodShoot'){p.burst--;transition(p.burst?'FoodShoot':'FoodEnd','food');}
      else if(animation==='Show')transition('AttackStart','shoot');
      else if(animation==='Hide')transition('Idle_Hidden','idle');
      else if(animation==='AttackLoop')transition('AttackLoop','shoot');
      else transition('Idle','idle');
    }
  }

  private conveyorDelay() {
    if(this.conveyor.length>=10)return Infinity;
    return [...this.level.conveyor!.DropDelayConditions].sort((a,b)=>b.MaxPackets-a.MaxPackets).find(c=>this.conveyor.length>=c.MaxPackets)!.Delay;
  }
  private tickConveyor(dt:number) {
    if(this.level.corral)return;
    if(!this.level.conveyor)return;
    if(this.time>=this.nextCard&&this.conveyor.length<10){
      const choices=this.conveyorPlants.map(p=>({plant:p,Weight:this.conveyorWeight(p)})),total=choices.reduce((n,p)=>n+p.Weight,0);
      if(total===0){this.nextCard=this.time+1/60;return;} // Native conveyor waits until a weighted card becomes available.
      let roll=this.random()*total;
      const chosen=choices.find(p=>(roll-=p.Weight)<0)!.plant;
      const counts=[0,1].map(lane=>this.conveyor.filter(c=>c.lane===lane).length);
      this.conveyorDelivered.set(chosen.PlantType,this.time);
      this.conveyorDeliveryCount.set(chosen,(this.conveyorDeliveryCount.get(chosen)??0)+1);
      this.conveyor.push({id:++this.id,kind:chosen.PlantType,forceBoosted:chosen.ForceBoosted,lane:counts[0]<=counts[1]?0:1,position:5});
      this.nextCard=this.time+this.conveyorDelay();
    }
    for(const lane of [0,1])this.conveyor.filter(c=>c.lane===lane).forEach((c,index)=>{c.position=Math.max(index,c.position-dt);});
  }

  private throwCabbage(p:Plant) {
    const target=this.zombies.filter(z=>z.hp>0&&this.inLane(z,p.row)&&(p.kind!=='sapfling'||z!==this.boss?.zombie)&&z.x>cellX(p.column)-15).sort((a,b)=>a.x-b.x)[0];
    const grave=this.graves.filter(g=>g.hp>0&&g.row===p.row&&g.column>p.column).sort((a,b)=>a.column-b.column)[0];
    if(target)this.lob(p,target.id,target.x,rowY(target.row)-45,false);
    else if(grave&&p.kind!=='sapfling')this.lob(p,grave.id,cellX(grave.column),rowY(grave.row)-40,false);
  }
  lob(p:Plant,targetId:number,x:number,y:number,powered:boolean) {
    const startX=cellX(p.column)-10,startY=rowY(p.row)-70;
    const projectile=p.kind==='cabbagepult'?(powered?'cabbage_pf':'cabbage'):powered?this.props.plants[p.kind].CabbageTypePlantfood:p.variant?this.props.plants[p.kind].ButterType:this.props.plants[p.kind].CabbageType;
    this.missiles.push({id:++this.id,projectile,kind:'cabbage',row:p.row,x:startX,y:startY,startX,startY,targetX:x,targetY:y,targetId,
      age:0,duration:p.kind==='sporeshroom'?1:p.kind==='cantaloupe'?4/9:Math.max(.65,Math.abs(x-startX)/450),damage:projectile.startsWith('sapfling')?0:this.props.projectiles[projectile].Damage,
      powered,returning:false,hits:[],dx:0,dy:0});
  }
  private boomerang(p:Plant,powered:boolean,dx:number,dy:number) {
    const x=cellX(p.column),y=rowY(p.row)-45;
    this.missiles.push({id:++this.id,kind:'boomerang',row:p.row,x,y,startX:x,startY:y,targetX:1070,targetY:y,targetId:p.id,age:0,duration:0,
      damage:this.props.projectiles.boomerang.Damage,powered,returning:false,hits:[],dx,dy});
  }
  private tickMissiles(dt:number) {
    const removed=new Set<number>();
    for(const m of this.missiles){
      m.age+=dt;
      if(m.kind==='parsnip'){
        m.x+=4.5*BOARD.cellWidth*dt;
        const timeline=this.props.plantAnimations[m.projectile!],start=timeline.Spawn.events.find(e=>e.name==='Idle')!.at,first=start+timeline.Idle.events.find(e=>e.name==='hit')!.at,period=timeline.Idle.duration;
        const hit=m.age>=first&&Math.floor((m.age-first)/period)>Math.floor((m.age-dt-first)/period);
        if(hit){for(const z of this.zombies)if(z.hp>0&&this.inLane(z,m.row)&&Math.abs(z.x-m.x)<65)this.damage(z,m.damage);for(const g of this.graves)if(g.row===m.row&&Math.abs(cellX(g.column)-m.x)<65)g.hp-=m.damage;}
        if(m.x>1200)removed.add(m.id);
      }else if(m.kind==='saw'){
        m.x+=this.props.plants.iceweed.PlantfoodDragSPS*BOARD.cellWidth*dt;
        for(const z of this.zombies)if(z.row===m.row&&Math.abs(z.x-m.x)<65){this.damage(z,this.props.plants.iceweed.PlantfoodDPS*dt);this.freeze(z,this.props.projectiles.iceweed_saw.FreezeDuration);this.chill(z,this.props.projectiles.iceweed_saw.ChillDuration);if(z.kind!=='egypt_gargantuar')z.x=m.x+30;}
        for(const g of this.graves)if(g.row===m.row&&Math.abs(cellX(g.column)-m.x)<65)g.hp-=this.props.plants.iceweed.PlantfoodDPS*dt;
        if(m.x>1200)removed.add(m.id);
      }else if(m.kind==='bone'){
        const t=Math.min(1,m.age/m.duration);m.x=m.startX+(m.targetX-m.startX)*t;m.y=m.startY+(m.targetY-m.startY)*t-140*4*t*(1-t);
        if(t===1){const column=Math.round((m.targetX-BOARD.left)/BOARD.cellWidth-.5);
          if(!this.graves.some(g=>g.row===m.row&&g.column===column)&&!this.plants.some(p=>p.row===m.row&&p.column===column)){
            this.graves.push({id:++this.id,row:m.row,column,hp:this.props.grave.Toughness,stage:0});this.effect('graveSpawn',m.targetX,m.targetY);
          }removed.add(m.id);
        }
      }else if(m.kind==='cabbage'||m.kind==='snow'){
        const hit=this.zombies.find(z=>z.id===m.targetId);
        const z=hit?.kind==='pirate_barrel'&&hit.pusher!==undefined?this.zombies.find(z=>z.id===hit.pusher):hit;
        if(z){m.targetX=z.x;m.targetY=rowY(z.row)-45;}
        const t=Math.min(1,m.age/m.duration);
        m.x=m.startX+(m.targetX-m.startX)*t;m.y=m.startY+(m.targetY-m.startY)*t-140*4*t*(1-t);
        if(m.projectile==='cantaloupe'||m.projectile==='cantaloupe_pf'){
          m.y-=this.props.plants.cantaloupe.ExtraHeightAboveTargets*t;
          if(t===1){const splash=this.props.projectiles[m.projectile].SplashDamage[0].Damage!;
            for(const target of this.zombies)if(target.hp>0&&Math.abs(target.x-m.targetX)<123&&Math.abs(rowY(target.row)-45-m.targetY)<147)this.damage(target,splash);
            for(const grave of this.graves)if(grave.hp>0&&Math.abs(cellX(grave.column)-m.targetX)<123&&Math.abs(rowY(grave.row)-45-m.targetY)<147)grave.hp-=splash;
            this.kongfu.cantaloupeSplashes.push({id:++this.id,x:m.x,y:m.y,groundY:m.targetY,age:0,powered:m.powered});
            this.beach.sounds.push((m.powered?'cantaloupeFood':'cantaloupeShot')+'/splatSounds');removed.add(m.id);
          }continue;
        }
        if(t===1){
          if(z&&m.kind==='cabbage'&&this.lostcity.blockShot(z,true,1)){removed.add(m.id);continue;}
          if(m.kind==='snow'){
            const prop=this.props.projectiles.powerup_snow;
            const direct=this.zombies.find(target=>target.hp>0&&Math.abs(target.x-m.targetX)<25&&Math.abs(rowY(target.row)-50-m.targetY)<45);
            const directGrave=!direct&&this.graves.find(g=>Math.abs(cellX(g.column)-m.targetX)<25&&Math.abs(rowY(g.row)-50-m.targetY)<45);
            if(direct){this.damage(direct,m.damage);this.chill(direct,prop.ChillDuration);}
            if(directGrave)directGrave.hp-=m.damage;
            for(const target of this.zombies){
              const dx=Math.abs(target.x-m.targetX),dy=Math.abs(rowY(target.row)-50-m.targetY);
              if(target!==direct&&dx<123&&dy<147){this.chill(target,prop.ChillDuration);this.damage(target,5+(dx<41&&dy<49?prop.Damage:0));}
            }
            for(const g of this.graves)if(g!==directGrave&&Math.abs(cellX(g.column)-m.targetX)<123&&Math.abs(rowY(g.row)-50-m.targetY)<147)g.hp-=5+(Math.abs(cellX(g.column)-m.targetX)<41&&Math.abs(rowY(g.row)-50-m.targetY)<49?prop.Damage:0);
          }
          else if(z){if(m.projectile?.startsWith('sporeshroom_spore'))this.eighties.sporeHit(z);if(m.projectile==='blooming_heart'||m.projectile==='blooming_heart_pf'){z.heartDefence??=[];z.heartDefence.push(...this.lostcity.heartRates(m.powered));}this.damage(z,this.sky.damagePilot(z,m.damage));if(m.projectile==='winter_melon'||m.projectile==='winter_melon_pf')this.chill(z,this.props.projectiles[m.projectile].ChillDuration);if((m.projectile==='butter'||m.projectile==='butter2')&&z!==this.boss?.zombie){z.butteredUntil=this.time+this.props.projectiles[m.projectile].ButterDuration;if(z.bug&&(z.bug.hp>0||z.bug.animation==='Land')){if(z.bug.hp>0)this.lostcity.damageBug(z,z.bug.hp);z.butteredUntil=0;}else if(isFlying(z))z.hp=0;}}
          if(m.projectile==='melon'||m.projectile==='melon_pf'||m.projectile==='winter_melon'||m.projectile==='winter_melon_pf'){
            const splash=this.props.projectiles[m.projectile].SplashDamage[0].Damage!;
            for(const target of this.zombies)if(target!==z&&Math.abs(target.x-m.targetX)<123&&Math.abs(rowY(target.row)-m.targetY)<147){this.damage(target,splash);if(m.projectile==='winter_melon'||m.projectile==='winter_melon_pf')this.chill(target,this.props.projectiles[m.projectile].SplashDamage[0].ChillDuration!);}
            for(const grave of this.graves)if(grave.id!==m.targetId&&Math.abs(cellX(grave.column)-m.targetX)<123&&Math.abs(rowY(grave.row)-m.targetY)<147)grave.hp-=splash;
          }
          if(m.projectile==='snowdrop'||m.projectile==='snowdrop_freeze'){
            const prop=this.props.projectiles[m.projectile];
            if(z){this.chill(z,prop.ChillDuration);if(m.projectile==='snowdrop_freeze')this.freeze(z,prop.FreezeDuration);}
            for(const target of this.zombies)if(target!==z&&Math.abs(target.x-m.targetX)<41&&Math.abs(rowY(target.row)-45-m.targetY)<49){this.chill(target,prop.SplashDamage[0].ChillDuration!);if(m.projectile==='snowdrop_freeze')this.freeze(target,prop.SplashDamage[0].FreezeDuration!);}
          }
          if(m.projectile==='sapfling'||m.projectile==='sapfling_pf'){
            const row=Math.max(0,Math.min(4,Math.round((m.targetY+45-rowY(0))/98))),column=Math.max(0,Math.min(8,Math.floor((m.targetX-BOARD.left)/82)));
            const previous=this.sap.find(s=>s.row===row&&s.column===column),until=this.time+this.props.projectiles[m.projectile].TileLiquid.Duration;
            if(previous){previous.until=until;previous.powered=m.powered;}else this.sap.push({id:++this.id,row,column,until,powered:m.powered});
          }
          const grave=this.graves.find(g=>g.id===m.targetId);if(grave)grave.hp-=m.damage;
          if(m.projectile&&['corn','butter','butter2','melon','melon_pf','winter_melon','winter_melon_pf','snowdrop','snowdrop_freeze','sapfling','sapfling_pf'].includes(m.projectile))this.effects.push({id:++this.id,kind:'projectileHit',projectile:m.projectile,x:m.x,y:m.y,age:0});
          else if(!m.projectile?.startsWith('sporeshroom_spore'))this.effect(m.kind==='snow'?'snowHit':'cabbageHit',m.x,m.y);removed.add(m.id);
        }
      }else{
        const beforeX=m.x,beforeY=m.y,sign=m.returning?-1:1;
        m.x+=m.dx*656*dt*sign;m.y+=m.dy*490*dt*sign;
        const hit=(x:number,y:number)=>Math.hypot(x-m.x,y-m.y)<30||Math.hypot(x-(beforeX+m.x)/2,y-(beforeY+m.y)/2)<30;
        const targets=[...this.zombies.filter(z=>z.hp>0).flatMap(z=>(z===this.boss?.zombie?[z.row-1,z.row]:[z.row]).map(row=>({id:z.id,x:z.x,y:rowY(row)-45,damage:(n:number)=>this.damage(z,n)}))),
          ...this.graves.filter(g=>g.hp>0).map(g=>({id:g.id,x:cellX(g.column),y:rowY(g.row)-45,damage:(n:number)=>{g.hp-=n;}}))];
        for(const target of targets)if((m.powered||m.hits.length<this.props.plants.bloomerang.PierceCount)&&!m.hits.includes(target.id)&&hit(target.x,target.y)){
          target.damage(m.damage);m.hits.push(target.id);this.effect('boomerangHit',m.x,m.y);
          if(!m.powered&&m.hits.length>=this.props.plants.bloomerang.PierceCount)break;
        }
        if(!m.returning&&(m.x>1070||m.x<BOARD.left||m.y<BOARD.top-50||m.y>rowY(4)||!m.powered&&m.hits.length>=this.props.plants.bloomerang.PierceCount)){
          if(m.powered)removed.add(m.id);else {m.returning=true;m.hits=[];}
        }
        if(m.returning&&m.x<=m.startX){removed.add(m.id);const p=this.plants.find(p=>p.id===m.targetId);if(p&&p.action==='idle'){p.action='catch';p.actionAt=this.time;}}
      }
    }
    this.missiles=this.missiles.filter(m=>!removed.has(m.id));
  }

  selectPower(kind:PowerKind) {
    if(!this.level.powerups||this.phase!=='playing'||this.power&&this.power.remaining>0)return false;
    const props=this.props.powerups[POWER_TYPES[kind]];
    this.power={kind,remaining:0,total:props.TotalTime,x:0,y:0,held:false,nextUse:0,hits:new Set()};return true;
  }
  powerPointer(x:number,y:number,held:boolean,pressed=false) {
    const power=this.power;if(!power||this.phase!=='playing')return;
    const dx=x-power.x,dy=y-power.y;power.x=x;power.y=y;power.held=held;
    if(!held){power.hits.clear();return;}
    if(x<BOARD.left||x>cellX(9)||y<BOARD.top||y>rowY(4)+20)return;
    if(power.remaining===0){power.remaining=power.total;power.nextUse=this.time;}
    if(power.kind==='cherry'&&pressed){
      const row=Math.floor((y-BOARD.top)/98),column=Math.floor((x-BOARD.left)/82);
      for(const z of this.zombies)if(Math.abs(z.row-row)<=1&&Math.abs(z.x-cellX(column))<123)this.damage(z,1800,'potato');
      for(const g of this.graves)if(Math.abs(g.row-row)<=1&&Math.abs(g.column-column)<=1)g.hp-=1800;
      this.effect('cherry',cellX(column),rowY(row));
    }
    if(power.kind==='toss'&&Math.hypot(dx,dy)>5){
      for(const z of this.zombies)if(Math.abs(z.x-x)<60&&Math.abs(rowY(z.row)-60-y)<80&&!power.hits.has(z.id)){
        power.hits.add(z.id);
        if(dx>0&&z.leap){z.hp=0;z.deathCause='toss';}
        else {
          const vertical=Math.abs(dy)>Math.abs(dx),toRow=vertical?Math.max(0,Math.min(4,z.row+Math.sign(dy))):z.row;
          z.leap={fromX:z.x,fromY:rowY(z.row),toX:z.x+Math.sign(dx)*82,toRow,at:this.time};
        }
        this.effect('toss',z.x,rowY(z.row)-50);
      }
    }
  }
  private tickPower(dt:number) {
    const power=this.power;
    if(power&&power.remaining>0){
      power.remaining=Math.max(0,power.remaining-dt);
      if(power.held){
        const prop=this.props.powerups[POWER_TYPES[power.kind]];
        const targets=this.zombies.filter(z=>z.hp>0&&Math.abs(z.x-power.x)<123&&Math.abs(rowY(z.row)-50-power.y)<147);
        if(power.kind==='fire'||power.kind==='zap'){
          const damage=(power.kind==='fire'?prop.FlamethrowerNormalDPS:prop.DPS)*dt;
          for(const z of targets)this.damage(z,damage);
          for(const g of this.graves)if(Math.abs(cellX(g.column)-power.x)<123&&Math.abs(rowY(g.row)-50-power.y)<147)g.hp-=damage;
          if(power.kind==='fire'){
            const row=Math.floor((power.y-BOARD.top)/98),column=Math.floor((power.x-BOARD.left)/82);
            if(row>=0&&row<5&&column>=0&&column<9){const fire=this.fires.find(f=>f.row===row&&f.column===column);if(fire)fire.until=this.time+prop.GroundFlameDuration;else this.fires.push({row,column,until:this.time+prop.GroundFlameDuration});}
          }
        }
        if(power.kind==='snow'&&this.time>=power.nextUse){
          this.missiles.push({id:++this.id,kind:'snow',row:2,x:80,y:rowY(2)-10,startX:80,startY:rowY(2)-10,targetX:power.x,targetY:power.y,targetId:-1,age:0,duration:.8,damage:350,powered:false,returning:false,hits:[],dx:0,dy:0});
          power.nextUse=this.time+prop.TimePerUse;
        }
      }
      if(power.remaining===0)this.power=null;
    }
    const fireProps=this.level.powerups?this.props.powerups.powerupflamethrower:null;
    for(const fire of this.fires)for(const z of this.zombies)if(z.row===fire.row&&Math.abs(z.x-cellX(fire.column))<41)this.damage(z,fireProps!.GroundFlameNormalDPS*dt);
    this.fires=this.fires.filter(f=>f.until>this.time);
  }

  startLastStand(){this.preparing=false;}
  private checkChallenges(){
    if(this.phase!=='playing')return;
    const reason=this.level.maxPlantsLost!==null&&this.plantsLost>this.level.maxPlantsLost?'plantsLost':this.level.maxPlants!==null&&this.plants.filter(p=>p.kind!=='bamboobusket').length>this.level.maxPlants?'plants':this.level.maxSun!==null&&this.sunSpent>this.level.maxSun?'sun':null;
    if(reason){this.lossReason=reason;this.phase='lost';this.events.push({type:'lose'});}
  }
  tick(dt: number) {
    if (this.phase !== 'playing'||this.preparing||this.corralWaiting) return;
    this.time += dt;
    if(this.heldMower!==null){
      const mower=this.mowers[this.heldMower];
      if(mower.active||mower.spent||this.manualMowers===0)this.releaseMower();
      else {mower.hold+=dt;if(mower.hold>mowerPresentation.holdSeconds){this.launchMower(mower);this.manualMowers--;this.releaseMower();}}
    }
    this.boss?.tick(dt);
    if(this.boss&&this.boss.zombie.hp<=0)this.pendingPharaohs=[];
    for(const pending of this.pendingGraveSpawns.filter(p=>p.at<=this.time)){
      const sapSource=pending.action.gridTypes!.includes('sap'),graves=sapSource?this.sap.filter(s=>s.until>this.time):this.level.world==='dark'?this.graves.filter(t=>t.hp>0&&pending.action.gridTypes!.includes(t.kind!)):[...this.graves];let food=pending.action.food;
      for(const spawn of pending.action.zombies){if(!graves.length)break;const grave=graves.splice(Math.floor(this.random()*graves.length),1)[0];this.pending.push({kind:spawn.kind,row:grave.row,x:cellX(grave.column),mode:'ground',at:this.time,food:!this.props.zombies[spawn.kind].CannotCarryPlantfoodsInWaves&&food-->0});this.waveHealth+=this.props.zombies[spawn.kind].Toughness;}
    }
    this.pendingGraveSpawns=this.pendingGraveSpawns.filter(p=>p.at>this.time);
    this.sap=this.sap.filter(s=>s.until>this.time);
    for(const sap of this.sap)for(const z of this.zombies)if(z!==this.boss?.zombie&&z.row===sap.row&&Math.abs(z.x-cellX(sap.column))<41)z.sappedUntil=this.time+.5;
    for(const pending of this.pendingPharaohs.filter(p=>p.at<=this.time)){const z=this.spawnZombie('mummy',pending.row,pending.x);z.reversed=true;this.pharaohs.add(pending.id);this.effect('pharaoh',z.x,rowY(z.row));}
    this.pendingPharaohs=this.pendingPharaohs.filter(p=>p.at>this.time);
    for (const kind of PLANT_KINDS) this.cooldowns[kind] = Math.max(0, this.cooldowns[kind] - dt);
    if (this.time >= this.nextSun) { this.dropSun(cellX(4)-150+this.random()*300, -90, 50, 'sky'); const drop=this.level.sunDropper;this.nextSun = this.time + (drop?Math.min(drop.SunCountdownMax,drop.SunCountdownBase+this.droppedSuns*drop.SunCountdownIncreasePerSun+this.random()*drop.SunCountdownRange):Math.min(RULES.sunMax, RULES.sunBase + this.droppedSuns * RULES.sunIncrease + this.random() * RULES.sunRange)); this.droppedSuns++; }
    if (!this.level.memory && this.wave < this.level.waves.length && this.time >= this.nextWave) this.startWave();
    for(const spawn of this.pending.filter(s=>s.at<=this.time)){
      const counts=isCamel(spawn.kind)?this.props.zombies[spawn.kind].TeamMemberCount:[1];
      const count=counts[Math.floor(this.random()*counts.length)],team=this.id+1;
      if(isCamel(spawn.kind))this.waveHealth+=(count-counts[0])*this.props.zombies.mummy.Toughness;
      for(let part=0;part<count;part++){
        const z=this.spawnZombie(spawn.kind,spawn.row,(spawn.mode==='storm'?1070:spawn.x)+part*60,spawn.mode,spawn.airRaidType);if(spawn.mode==='parachute')z.pilot!.fallTime=spawn.fallTime!;
        if(spawn.cargo){const cargo=this.spawnZombie(spawn.cargo,spawn.row,spawn.x);cargo.leap={fromX:spawn.x,fromY:rowY(spawn.row)-700,toX:spawn.x,toRow:spawn.row,at:this.time,duration:spawn.fallTime!};this.waveIds.add(cargo.id);}
        z.food=spawn.food&&part===0;z.entryX=spawn.x+part*60;z.team=team;z.camelPart=part===0?0:part===count-1?2:1;this.waveIds.add(z.id);
      }
    }
    this.pending = this.pending.filter(s => s.at > this.time);

    if(this.corralWaiting)return;
    if(this.level.beghouled)this.beghouled.tick(dt);
    this.modern.tick(dt);this.sky.tick(dt);this.dino.tick(dt);this.eighties.tick(dt);this.kongfu.tick(dt);this.lostcity.tickTraps(dt);this.lostcity.tickTents();this.lostcity.tickShots();this.expedition.tick(dt);this.iceageCombat.tick(dt);this.iceage.tick(dt);this.beachFinale.tick(dt);this.beach.tick(dt);this.darkFinale.tick(dt);this.darkMemory.tick();this.dark.tick(dt);this.darkPlants.tick(dt);
    this.cowboy.tick(dt);
    for(const z of [...this.zombies,...this.westFinale.allies]){
      if(z.entry==='storm'&&this.time-z.entryAt<=1)z.x=z.entryX+(1070-z.entryX)*(1-(this.time-z.entryAt));
      if(z.leap){
        const flight=z.leap,t=Math.min(1,(this.time-flight.at)/(flight.duration??.5));
        z.x=flight.fromX+(flight.toX-flight.fromX)*t;
        const height=(rowY(flight.toRow)-flight.fromY)*(1-t)+90*Math.sin(t*Math.PI);
        // Native tallNutListen uses the ground hit rectangle, excluding leap height.
        const blocker=!this.westFinale.allies.includes(z)&&z.west?.bullThrown&&!z.west.blockedByTallnut&&this.plants.find(p=>p.kind==='tallnut'&&p.hp>0&&p.row===flight.toRow&&Math.abs(z.x-cellX(p.column))<48*.55/2+20);
        if(blocker){
          z.west!.blockedByTallnut=true;z.west!.animation='Blocked';z.west!.at=this.time;
          z.leap={fromX:z.x,fromY:rowY(flight.toRow)-height,toX:z.x,toRow:flight.toRow,at:this.time,duration:this.props.plantAnimations.cowboyImp.Blocked.duration};
          this.cowboy.sounds.push('cowboyImp/landSounds');
        }else if(t===1){
          z.row=flight.toRow;this.cowboy.landed(z);this.modern.enemies.landed(z);
          if(z.kind==='lostcity_imp')z.landUntil=this.time+this.props.plantAnimations.lostImp.Land.duration;
          if(z.kind==='sky_imp'){z.landUntil=this.time+this.props.plantAnimations.skyImp.Parachute_End.duration;}
          if(z.kind==='tutorial_imp'||z.kind==='dino_imp'||z.kind==='eighties_imp'||z.kind==='iceage_imp'||z.kind==='dark_imp'||z.kind==='egypt_imp'||z.kind==='pirate_imp'||z.kind==='west_bullrider')z.landUntil=this.time+(z.west?.bullThrown?this.props.plantAnimations.cowboyImp.LandVerticle.events.find(e=>e.name==='switchingFalse')!.at:14/30);
          if(z.west?.bullThrown){z.west.animation='LandVerticle';z.west.at=this.time;this.cowboy.sounds.push('cowboyImp/landSounds');}
          if(this.level.world==='pirate'&&seaCell(this.level.planks,z.row,Math.floor((z.x-BOARD.left)/BOARD.cellWidth))&&!isFlying(z)){z.hp=0;z.deathCause='water';}z.leap=null;
        }
      }
      if(z.west?.animation==='LandVerticle'&&this.time>=z.landUntil!)delete z.west.animation;
    }
    this.tickConveyor(dt);this.tickPower(dt);this.tickMatching();this.escape.tick(dt);this.finale.tick(dt);this.western.tick(dt);this.westFinale.tick(dt);this.future.tick(dt);
    for (const p of this.plants) {
      if(this.level.airRaid)continue;
      if(this.sky.thunder.slow(p,dt))continue;
      if(this.eighties.carrot.blocked(p)||this.eighties.boombox.blocked(p)||this.eighties.skunk.blocked(p)){p.actionAt+=dt;p.nextAction+=dt;p.nextBurst+=dt;continue;}
      if(this.boss instanceof KongfuChiBoss&&this.boss.plantStunned(p)){p.actionAt+=dt;p.nextAction+=dt;p.nextBurst+=dt;continue;}
      if(p.kind==='hotpotato'){this.iceage.tickHot(p);continue;}
      if(this.iceage.blocked(p))continue;
      if(p.sheep!==undefined){p.actionAt+=dt;p.nextAction+=dt;p.nextBurst+=dt;continue;}
      if(p.kind==='toadstool'){this.toadstool.tick(p,dt);continue;}
      if((this.level.world==='kongfu'||this.level.world==='eighties'||this.level.world==='dino'||this.level.world==='modern')&&p.leap?.pushed){if(this.time-p.leap.at<(p.leap.duration??.5))continue;delete p.leap;}
      if(p.kind==='powerlily'){if(this.time-p.actionAt>=this.props.plantAnimations.powerlily.Attack.events.find(e=>e.name==='produce')!.at){this.pickups.push({id:this.nextEntityId(),kind:'food',x:cellX(p.column),y:rowY(p.row)-45,age:0});p.hp=0;}continue;}
      if(p.kind==='nightshade'||p.kind==='shrinkingviolet'){this.modern.plant(p,dt);continue;}
      if(p.kind==='bulbkekengi'||p.kind==='peacommando'||p.kind==='moonbean'||p.kind==='anthurium'||p.kind==='skyshooter'||p.kind==='asparagus'){this.sky.plant(p);continue;}
      if(p.kind==='explodeonut'){this.dino.plants.nut(p);continue;}
      if(p.kind==='goldbloom'||p.kind==='torchwood'){this.dino.plants.plant(p);continue;}
      if(p.kind==='primalpotatomine'){p.age+=dt;this.dino.mines.tick(p);continue;}
      if(p.kind==='primalsunflower'){this.dino.sunflower(p);continue;}
      if(p.kind==='perfumeshroom'){this.dino.perfume(p);continue;}
      if(p.kind==='primalwallnut'){this.dino.nut(p);continue;}
      if(this.eighties.finale.handles(p.kind)||p.kind==='caulipower'||p.kind==='sporeshroom'||p.kind==='garlic'||p.kind==='thymewarp'||p.kind==='phatbeet'||p.kind==='cactus'){this.eighties.plant(p,dt);continue;}
      if(p.kind==='peach'){this.kongfu.peach.tick(p,dt);continue;}
      if(p.kind==='bamboozle'||p.kind==='bamboobusket'){this.kongfu.bamboozle.plant(p);continue;}
      if(p.kind==='solarsage'){this.kongfu.sage.plant(p);continue;}
      if(p.kind==='lychee'){this.kongfu.lychee.tick(p);continue;}
      if(p.kind==='turnip'){this.kongfu.turnip.tick(p,dt);continue;}
      if(p.kind==='bambooshoot'){this.kongfu.bamboo.tick(p,dt);continue;}
      if(p.kind==='firegourd'){this.kongfu.plant(p,dt);continue;}
      if(p.kind==='zoybeanpod'){this.lostcity.zoyPlant(p);continue;}
      if(p.kind==='snowpea'){this.lostcity.snowPlant(p);continue;}
      if(p.kind==='akee'){this.lostcity.plant(p);continue;}
      if(p.kind==='lavaguava'||p.kind==='gatling'){this.expedition.plant(p,dt);continue;}
      if(p.kind==='pepperpult'){this.iceageCombat.tickPlant(p);continue;}
      if(p.kind==='primalpeashooter'){this.iceageCombat.primal(p);continue;}
      if(p.kind==='firepeashooter'){this.iceageCombat.firePeashooter(p);continue;}
      if(p.kind==='endurian'){this.iceageCombat.endurian(p);continue;}
      if(p.kind==='stunion'){this.iceageCombat.stunion(p);continue;}
      if(this.beachFinale.handles(p.kind)){this.beachFinale.tickPlant(p,dt);continue;}
      if(p.kind==='homingthistle'){this.beach.thistles.tickPlant(p);continue;}
      if(p.kind==='bowlingbulb'){this.beach.bowling.tickPlant(p,dt);continue;}
      if(p.kind==='lilypad'||p.kind==='tanglekelp'){this.beach.tickPlant(p);continue;}
      if(this.darkFinale.handles(p.kind)){this.darkFinale.tickPlant(p,dt);continue;}
      if(this.darkPlants.handles(p.kind)){this.darkPlants.tickPlant(p,dt);continue;}
      if(p.kind==='peanut'){this.dark.tickPeanut(p,dt);continue;}
      if(p.leap){if(this.time-p.leap.at<(p.kind==='chilibean'?.8:.5))continue;delete p.leap;}
      if(p.kind==='splitpea'||p.kind==='chilibean'){this.cowboy.tickPlant(p);continue;}
      if(p.kind==='sunbean'){this.dark.tickBean(p,dt);continue;}
      if(p.kind==='fumeshroom'){this.dark.tickPlant(p,dt);continue;}
      if(this.future.handles(p.kind)){this.future.tickPlant(p,dt);continue;}
      if(this.westFinale.handles(p.kind)){this.westFinale.tickPlant(p,dt);continue;}
      if(this.western.handles(p.kind)){this.western.tickPlant(p,dt);continue;}
      if(this.finale.handles(p.kind)){this.finale.tickPlant(p,dt);continue;}
      if(p.kind==='escaperoot'){this.escape.tickPlant(p,dt);continue;}
      if(p.kind==='threepeater'){p.age+=dt;this.tickThreepeater(p);continue;}
      if(p.kind==='snapdragon'||p.kind==='coconutcannon'||p.kind==='spikeweed'||p.kind==='spikerock'||p.kind==='springbean'){p.age+=dt;this.pirate.tickPlant(p,dt);continue;}
      const previousAge=p.age;
      p.age += dt;
      if(['cantaloupe','bloominghearts','repeater','kernelpult','melonpult','wintermelon','snowdrop','sapfling'].includes(p.kind)){this.tickLatePlant(p);continue;}
      if(['grapeshot','peapod','imitater','cherry_bomb','celerystalker','parsnip'].includes(p.kind)){this.tickFinalePlant(p);continue;}
      if(p.kind==='bonkchoy'){this.tickBonk(p);continue;}
      if(p.kind==='gravebuster'){
        const elapsed=this.time-p.actionAt,timing=this.level.memory?{graveBust:this.level.memory.bustTime,graveFinish:0,graveDie:this.timing.special!.graveDie}:this.timing.special!;
        if(elapsed>=timing.graveBust+timing.graveFinish){if(this.level.world==='dark'){for(const grave of this.graves)if(grave.row===p.row&&grave.column===p.column)grave.hp=0;}else this.graves=this.graves.filter(g=>g.row!==p.row||g.column!==p.column);}
        if(elapsed>=timing.graveBust+timing.graveDie)p.hp=0;
        continue;
      }
      if(p.kind==='iceweed'&&p.action!=='food'){
        const targets=this.zombies.filter(z=>z.hp>0&&!isFlying(z)&&!z.leap&&this.inLane(z,p.row)&&Math.abs(z.x-cellX(p.column))<55);
        p.action=targets.length?'shoot':'idle';
        if(targets.length&&this.time>=p.nextAction){p.actionAt=this.time;for(const z of targets){this.damage(z,(this.iceweedSpikes.get(p.id)??1)>1?this.props.plants.iceweed.DamagePowered:this.props.plants.iceweed.Damage);this.chill(z,this.props.plants.iceweed.ChillDuration);}p.nextAction=this.time+this.props.plants.iceweed.AttackInterval;}
        continue;
      }
      if(p.kind==='potatomine' &&p.action!=='food') {
        if(previousAge<this.props.plants.potatomine.ChargeTime&&p.age>=this.props.plants.potatomine.ChargeTime){p.action='grow';p.actionAt=this.time;}
        if(p.action==='grow'&&this.time-p.actionAt>=this.timing.mineGrow)p.action='idle';
        if(p.action==='explode') {
          if(!p.fired&&this.time-p.actionAt>=this.timing.mineExplode){
            p.fired=true;
            for(const z of this.zombies)if(z.hp>0&&!isFlying(z)&&this.inLane(z,p.row)&&Math.abs(z.x-cellX(p.column))<105)this.damage(z,this.props.plants.potatomine.Damage,'potato');
            this.effect('explode',cellX(p.column),rowY(p.row));this.events.push({type:'explode'});
          }
          if(this.time-p.actionAt>=this.timing.mineDeath)p.hp=0;
          continue;
        }
      }
      if(p.action==='catch'&&this.time-p.actionAt>=this.timing.campaign!.boomerangCatch)p.action='idle';
      if(p.kind==='iceburg'&&p.action==='explode'){
        if(!p.fired&&this.time-p.actionAt>=this.timing.campaign!.ice){p.fired=true;const z=this.zombies.filter(z=>this.inLane(z,p.row)&&Math.abs(z.x-cellX(p.column))<82&&z.hp>0).sort((a,b)=>Math.abs(a.x-cellX(p.column))-Math.abs(b.x-cellX(p.column)))[0];if(z)this.freeze(z,this.props.plants.iceburg.FreezeDuration);this.kongfu.extinguish(p);this.effect('freeze',cellX(p.column),rowY(p.row));}
        if(this.time-p.actionAt>=this.timing.campaign!.iceDuration)p.hp=0;continue;
      }
      if (p.action === 'food') {
        if(p.kind==='wallnut'&&!p.fired&&this.time-p.actionAt>=this.timing.wallnutArmor){p.fired=true;p.armor=this.props.plants.wallnut.ArmorToughness;}
        if((p.kind==='sunflower'||p.kind==='twinsunflower')&&p.burst>0&&this.time>=p.nextBurst){this.produceSun(p);p.burst--;p.nextBurst+=8/30;}
        while (p.kind === 'peashooter' && p.burst > 0 && this.time >= p.nextBurst) { this.shoot(p, true); p.burst--; p.nextBurst += 2 / this.props.plants.peashooter.PlantfoodPeaCount; }
        if(p.kind==='cabbagepult'&&!p.fired&&this.time-p.actionAt>=this.timing.campaign!.cabbageFood){p.fired=true;for(const z of this.zombies.filter(z=>z.hp>0))this.lob(p,z.id,z.x,rowY(z.row)-45,true);for(const g of this.graves)this.lob(p,g.id,cellX(g.column),rowY(g.row)-40,true);}
        if(p.kind==='bloomerang'&&p.burst>0&&this.time>=p.nextBurst){for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])this.boomerang(p,true,dx,dy);p.burst--;p.nextBurst+=2/this.props.plants.bloomerang.PlantfoodBoomerangCount;}
        if(p.kind==='iceburg'&&!p.fired&&this.time-p.actionAt>=this.timing.campaign!.iceFood){p.fired=true;for(const z of this.zombies)this.freeze(z,this.props.plants.iceburg.FreezeDuration);this.kongfu.extinguish(p,true);this.effect('freeze',cellX(p.column),rowY(p.row));}
        if(p.kind==='iceweed'&&!p.fired&&this.time-p.actionAt>=this.timing.special!.iceweedShoot){
          p.fired=true;const x=cellX(p.column),y=rowY(p.row)-20;
          this.missiles.push({id:++this.id,kind:'saw',row:p.row,x,y,startX:x,startY:y,targetX:1070,targetY:y,targetId:p.id,age:0,duration:4,damage:200,powered:true,returning:false,hits:[],dx:1,dy:0});
        }
        const duration=p.kind==='wallnut'?this.timing.wallnutFoodEnd:p.kind==='peashooter'?2:p.kind==='sunflower'||p.kind==='twinsunflower'?this.props.plants[p.kind].PlantfoodTime*8/30:p.kind==='iceweed'?this.timing.special!.iceweedFoodEnd:p.kind==='cabbagepult'?this.timing.campaign!.cabbageFoodEnd:p.kind==='iceburg'?this.timing.campaign!.iceFoodEnd:p.kind==='bloomerang'?2:4;
        if(this.time-p.actionAt>=duration){p.action='idle';p.nextAction=this.time+((p.kind==='sunflower'||p.kind==='twinsunflower')?this.props.plants[p.kind].ProduceCountdownStart+this.random()*this.props.plants[p.kind].ProduceCountdownStartAdditional:p.kind==='bloomerang'?0:1);}
        continue;
      }
      if (p.action === 'shoot' || p.action === 'produce') {
        const shoot=p.action==='shoot',eventTime=shoot?(p.kind==='cabbagepult'?this.timing.campaign!.cabbage:p.kind==='bloomerang'?this.timing.campaign!.boomerang:this.timing.shoot):this.timing.produce;
        if (!p.fired && this.time - p.actionAt >= eventTime) {
          p.fired = true;
          if(shoot){if(p.kind==='cabbagepult')this.throwCabbage(p);else if(p.kind==='bloomerang')this.boomerang(p,false,1,0);else this.shoot(p,false);} else this.produceSun(p);
        }
        if (this.time - p.actionAt >= (shoot ? (p.kind==='cabbagepult'?this.timing.campaign!.cabbageDuration:p.kind==='bloomerang'?this.timing.campaign!.boomerangDuration:this.timing.shootDuration) : this.timing.produceDuration)) p.action = 'idle';
      }
      if (['peashooter','cabbagepult','bloomerang'].includes(p.kind) && p.action === 'idle' && this.time >= p.nextAction && (this.zombies.some(z => (p.kind==='cabbagepult'||!this.beach.diving(z)) && this.inLane(z,p.row) && z.x > cellX(p.column) - 15 && z.x < 1150 && z.hp > 0)||this.graves.some(g=>g.hp>0&&g.row===p.row&&cellX(g.column)>cellX(p.column)))) {
        p.action = 'shoot'; p.actionAt = this.time; p.fired = false;
        const prop=this.props.plants[p.kind];p.nextAction=this.time+(p.kind==='cabbagepult'?prop.ThrowInterval:prop.ShootInterval)+this.random()*(p.kind==='cabbagepult'?prop.ThrowIntervalAdditional:prop.ShootIntervalAdditional);
      }
      if ((p.kind === 'sunflower'||p.kind==='twinsunflower') && p.action === 'idle' && this.time >= p.nextAction) {
        p.action = 'produce'; p.actionAt = this.time; p.fired = false;
        p.nextAction = this.time + this.props.plants[p.kind].ProduceInterval + this.random() * this.props.plants[p.kind].ProduceIntervalAdditional;
      }
      if ((p.kind==='iceburg'||p.kind === 'potatomine' && p.age >= this.props.plants.potatomine.ChargeTime) && p.action==='idle' && (p.kind==='iceburg'&&this.kongfu.burningAt(p)||this.zombies.some(z => z.hp > 0 && !isFlying(z) && this.inLane(z,p.row) && Math.abs(z.x - cellX(p.column)) < 38))) {
        p.action='explode';p.actionAt=this.time;p.fired=false;
      }
    }

    for (const pea of this.peas) {
      const oldX = pea.x; pea.x += dt * (pea.vector?pea.vector.vx:pea.powered ? pea.speed! : 360);
      if(pea.vector){const v=pea.vector;pea.y+=v.vy*dt+.5*v.ay*dt*dt;v.vy+=v.ay*dt;if(v.stopY!==undefined&&(v.ay>0?v.vy>=0:v.vy<=0)){pea.y=v.stopY;v.vy=0;v.ay=0;delete v.stopY;}}
      this.dino.plants.ignite(pea,oldX);
      if(this.iceage.hit(pea.row,oldX,pea.x,pea.damage)){pea.x=1300;continue;}
      const target = this.zombies.filter(z => z.hp > 0 && !this.beach.diving(z) && (pea.vector?(z===this.boss?.zombie&&this.level.world==='iceage'?[1,2,3].some(row=>Math.abs(rowY(row)-40-pea.y)<35):Math.abs(rowY(z.row)-40-pea.y)<35):this.inLane(z,pea.row)) && z.x - 18 >= Math.min(oldX,pea.x) - 12 && z.x - 18 <= Math.max(oldX,pea.x) + 12).sort((a, b) => a.x - b.x)[0];
      const grave=this.graves.filter(g=>g.hp>0&&(pea.vector?Math.abs(rowY(g.row)-40-pea.y)<35:g.row===pea.row)&&cellX(g.column)-25>=oldX-12&&cellX(g.column)-25<=pea.x+12).sort((a,b)=>a.column-b.column)[0];
      if(grave&&(!target||cellX(grave.column)<target.x)){grave.hp-=pea.damage;this.effect('hit',pea.x,pea.y);pea.x=1300;}
      else if (target) { if(pea.fire){this.kongfu.heat(target);if(target.kind==='lostcity_gargantuar')this.lostcity.torches.set(target.id,true);target.frozenUntil=0;target.chilledUntil=0;}if(!this.lostcity.blockShot(target,false,pea.vector?.vx??360)&&!this.beach.surfers.blockShot(target,pea.damage,oldX)){this.damage(target, pea.damage);if(pea.snow)this.chill(target,this.props.projectiles.pea_snow.ChillDuration);} this.effect('hit', pea.x, pea.y); pea.x = 1300; }
    }
    this.peas = this.peas.filter(p => p.x>-100 && p.x < 1200 && p.y>-100 && p.y<800);
    this.tickMissiles(dt);
    for(const grave of this.graves){
      if(isRack(grave.kind)){grave.stage=Math.min(3,Math.max(0,4-Math.ceil(grave.hp/rackHP(grave.kind!)*4)));continue;}
      if(grave.kind==='tent'||grave.kind==='backpack'){this.lostcity.damageTomb(grave);continue;}
      if(grave.kind==='speaker'){this.eighties.speaker.damage(grave);continue;}
      if(grave.kind==='eightiesarcadecabinet'){this.eighties.arcade.damage(grave);continue;}
      if(grave.kind==='octopus'){if(grave.hp<=0)this.beach.octopuses.release(grave);continue;}
      if(grave.kind==='surfboard'){this.beach.surfers.damageBoard(grave);continue;}
      const stage=grave.hp<=0?4:4-Math.floor(grave.hp/this.props.grave.Toughness*4);
      if(stage!==grave.stage){this.effects.push({id:++this.id,kind:'graveHit',x:cellX(grave.column),y:rowY(grave.row),age:0,stage});grave.stage=stage;}
    }
    for(const grave of this.graves)if(grave.hp<=0)this.dark.graveDestroyed(grave);
    this.graves=this.graves.filter(g=>g.hp>0);
    const camelFronts=new Map<number,number>();
    for(const z of this.zombies)if(isMatchCamel(z.kind)&&z.hp>0)camelFronts.set(z.team,Math.min(camelFronts.get(z.team)??Infinity,z.x));
    const blockedCamels=new Set<number>();
    for(const z of this.zombies)if(isMatchCamel(z.kind)&&z.hp>0){const front=camelFronts.get(z.team)!;if(this.zombies.some(other=>other.hp>0&&other.team!==z.team&&other.row===z.row&&other.x<front&&other.x+60>front))blockedCamels.add(z.team);}
    for (const z of this.zombies) {
      if(z.dinoCarry||z===this.boss?.zombie||z.hp<=0||this.eighties.warps.has(z.id)||z.weasel?.exploding||z.leap||z.landUntil!==undefined&&this.time<z.landUntil||this.time<z.frozenUntil||z.stunnedUntil!==undefined&&this.time<z.stunnedUntil||z.butteredUntil!==undefined&&this.time<z.butteredUntil||(z.entry!=='walk'&&this.time-z.entryAt<(z.entry==='ground'?1.35:1)))continue;
      const statusDt=dt*(z.scaredByTyranno?4:1)*Math.pow(1.5,z.dark?.speed??0)*(this.time<(z.perfumeUntil??0)?.5:1);
      if(this.modern.zombie(z,statusDt)||this.sky.zombie(z,statusDt)||this.dino.bully.zombie(z,statusDt)||this.eighties.zombie(z,statusDt)||this.kongfu.zombie(z,statusDt)||this.lostcity.crystal(z,statusDt)||this.lostcity.porter(z)||this.lostcity.tickBug(z)||this.lostcity.excavate(z,statusDt)||this.lostcity.tick(z,statusDt)||this.iceage.tickZombie(z)||this.iceageCombat.hunter(z,statusDt)||this.iceageCombat.dodo(z,statusDt)||this.iceageCombat.troglobite(z,statusDt))continue;
      if(this.beach.fishers.tickZombie(z,statusDt)||this.beach.octopuses.tickZombie(z,statusDt)||this.beach.surfers.tickZombie(z,statusDt)||this.future.tickZombie(z,statusDt)||this.cowboy.tickZombie(z,statusDt)||this.pirate.tickZombie(z,dt)||this.tickSpecialZombie(z,dt))continue;
      if(this.beachFinale.block(z,statusDt)||this.westFinale.blockEnemy(z,statusDt)||this.dark.movement(z)===0)continue;
      if(this.dark.eatPotion(z))continue;
      const target = this.plants.filter(p => (!z.balloon||p.kind==='tallnut') && !z.dodo?.flying && (!(z.bug&&z.bug.hp>0)||p.kind==='tallnut') && p.hp > 0 && !(p.kind==='primalpotatomine'&&(p.rootGrown||p.leap)) && p.kind!=='shrinkingviolet'&&p.kind!=='bulbkekengi'&&p.kind!=='goldbloom'&&p.kind!=='thymewarp'&&p.kind!=='bambooshoot'&&p.kind!=='lavaguava'&&p.kind!=='stunion'&&p.kind!=='ghostpepper'&&p.kind!=='goldleaf'&&p.kind!=='hotpotato'&&p.kind!=='tanglekelp' && (p.kind!=='lilypad'||!this.beach.occupant(p)) && p.sheep===undefined && !this.eighties.carrot.blocked(p) && (p.kind!=='floawerPot'||!this.darkPlants.occupant(p)) && !p.leap?.pushed && !((p.kind==='chilibean'||p.kind==='turnip')&&p.leap) && (!isFlying(z)||p.kind!=='potatomine')&&(p.kind!=='escaperoot'||!p.rootGrown)&&p.kind!=='empea'&&p.kind!=='blover'&&p.kind!=='hurrikale'&&p.kind!=='stallia'&&p.kind!=='iceburg'&&p.kind!=='iceweed'&&p.kind!=='spikeweed'&&p.kind!=='spikerock'&&(p.kind!=='springbean'||!['Ready','Idle_Ready'].includes(p.animation!)) &&p.kind!=='imitater'&&p.kind!=='perfumeshroom'&&p.kind!=='grapeshot'&&p.kind!=='cherry_bomb'&&p.kind!=='jalapeno'&&!p.hidden&& p.action!=='explode' && p.row === z.row && z.x >= cellX(p.column) - 22 && z.x <= cellX(p.column) + 38).sort((a, b) => b.column - a.column||Number(b.kind==='bamboobusket')-Number(a.kind==='bamboobusket'))[0];
      z.eating = !!target;
      if(target&&this.eighties.crush(z,target)){}
      else if(target&&this.eighties.finale.eaten(target)){}
      else if(target&&this.eighties.kick(z,target)){}
      else if(target&&this.kongfu.peach.protected(target)){}
      else if(target&&(z.kongfu?.torch||(z.kind==='explorer'||z.kind==='explorer_veteran')&&this.specialZombies.get(z.id)!.torch)){target.hp=0;target.armor=0;}
      else if(target&&target.kind==='garlic'&&this.eighties.eatGarlic(target,z)){}
      else if (target) { const amount = (z.kind==='egypt_imp'?100:this.props.zombies[z.kind].EatDPS) * this.modern.bite(z) * (z.kongfu?.drunk?2:1)*statusDt*(this.time<z.chilledUntil?.5:1), armor = Math.min(target.armor, amount); target.armor -= armor; target.hp -= (amount - armor)*this.future.plantDamageScale(target);if(target.hp<=0){this.cowboy.eaten(target,z);this.westFinale.eaten(target,z);this.dark.eaten(target,z);}if(target.hp<=0&&target.kind==='parsnip')this.launchParsnip(target,false); }
      else if(blockedCamels.has(z.team))continue;
      else if (!z.pilot?.hanging&&this.time >= z.absorbUntil) z.x -= this.modern.speed(z)*this.eighties.speed(z)*this.kongfu.speed(z)*this.beach.speed(z)*this.dark.movement(z)*(z.reversed?-1:1)* (this.time<z.chilledUntil?.5:1)*(this.time<(z.sappedUntil??0)?.5:1)*(z.kind==='piano'&&z.x>=cellX(9)?4:1)*(z.west?.animation==='Rush'?this.props.zombies[z.kind].RushSPS:(z.bug&&z.bug.hp>0?this.props.zombies[z.kind].BuggedSPS:z.memoryRunner?this.level.memory!.enemySpeed:this.props.zombies[z.kind].WalkSPS)) * BOARD.cellWidth * statusDt;
      if (z.kind === 'ra' && z.x<BOARD.left+BOARD.columns*BOARD.cellWidth) {
        let reserved=z.absorbed+this.suns.filter(s=>s.absorber===z.id).reduce((sum,s)=>sum+s.value,0);
        for(const sun of this.suns)if(sun.absorber===null&&sun.y>=BOARD.top&&sun.x>=BOARD.left&&sun.x<=BOARD.left+BOARD.columns*BOARD.cellWidth&&reserved+sun.value<=this.props.zombies.ra.MaxAbsorbValue){sun.absorber=z.id;sun.absorbAge=0;reserved+=sun.value;}
        const absorbing=this.suns.some(s=>s.absorber===z.id);
        if(absorbing&&(z.absorbState==='idle'||z.absorbState==='end')){z.absorbState='start';z.absorbAt=this.time;z.absorbUntil=Infinity;}
        if(z.absorbState==='start'&&this.time-z.absorbAt>=this.timing.raStart)z.absorbState='loop';
        if(!absorbing&&(z.absorbState==='start'||z.absorbState==='loop')){z.absorbState='end';z.absorbAt=this.time;z.absorbUntil=this.time+this.timing.raEnd;}
        if(z.absorbState==='end'&&this.time>=z.absorbUntil)z.absorbState='idle';
      }
      const mower = this.mowers[z.row];
      if (z.x < BOARD.left - 15 && !mower.spent&&!mower.active) this.launchMower(mower);
      if(this.level.flowerLine!==null&&Math.abs(z.x-(BOARD.left+this.level.flowerLine*BOARD.cellWidth))<10&&!z.eating&&!z.reversed&&!z.leap&&this.phase==='playing'){this.lossReason='flowers';this.phase='lost';this.events.push({type:'lose'});}
      if (z.x < BOARD.left - 100) { this.phase = 'lost'; this.events.push({ type: 'lose' }); }
    }
    if(this.level.world==='modern'||this.level.world==='pirate'||this.level.world==='west'||this.level.world==='dark')this.pirate.tick(dt);
    for (const mower of this.mowers) if (mower.active) {
      if(mower.starting>0)mower.starting=Math.max(0,mower.starting-dt);
      else mower.x += 600 * dt;
      for (const z of this.zombies) if (z!==this.boss?.zombie&&z.hp>0 && z.row === mower.row && z.x < mower.x + 40) {z.hp = 0;z.deathCause=this.props.zombies[z.kind].NormalDeathWhenMowed?'normal':'mower';}
      if (mower.x > (this.boss instanceof EightiesBoss?cellX(7):1230)) { mower.spent = true; mower.active = false; }
    }
    if(this.level.killChallenge&&!this.killChallengeComplete)this.recentKills=this.recentKills.filter(at=>this.time-at<this.level.killChallenge!.seconds);
    this.kongfu.lychee.settle();
    this.dark.settleBeans();
    this.dino.plants.settleNuts();
    for (const z of this.zombies) if (z!==this.boss?.zombie&&z.hp <= 0&&!z.weasel?.exploding) {
      if(z.airRaid?.escaped)continue;
      if(this.level.airRaid)this.sky.airRaid.killed(z);
      if(this.level.world==='pirate'||this.level.world==='modern')this.pirate.die(z);
      this.eighties.die(z);this.lostcity.die(z);this.beach.fishers.die(z);this.beach.surfers.die(z);this.cowboy.die(z);this.future.die(z);
      if(z.kind!=='future_protector_shield')this.kills++;
      if(this.level.killChallenge&&!this.killChallengeComplete){this.recentKills.push(this.time);if(this.recentKills.length>=this.level.killChallenge.count)this.killChallengeComplete=true;}
      if(z.kind==='egypt_gargantuar'&&z.deathCause!=='potato'&&z.x>=BOARD.left&&z.x<cellX(9)&&this.random()<.75)this.pendingPharaohs.push({id:z.id,row:z.row,x:z.x,at:this.time+this.timing.special!.gargPharaoh});
      if(z.food)this.pickups.push({id:++this.id,kind:'food',x:z.x,y:rowY(z.row)-45,age:0});
      if(this.level.world==='egypt'&&this.level.day===5&&z.kind==='ra'&&!this.sproutDropped){this.sproutDropped=true;this.pickups.push({id:++this.id,kind:'sprout',x:z.x,y:rowY(z.row)-45,age:0});}
      this.deaths.push({zombie:{...z},cause:z.deathCause,at:this.time});
      for(const sun of this.suns)if(sun.absorber===z.id){sun.absorber=null;sun.vx=0;sun.vy=0;}
      if (z.absorbed) this.dropSun(z.x, rowY(z.row) - 65, z.absorbed, 'ra');
    }
    this.zombies = this.zombies.filter(z => z===this.boss?.zombie||z.weasel?.exploding||z.hp > 0&&!(z.reversed&&!z.parrot&&z.x>1070));
    this.future.settleNuts();this.darkFinale.settle();
    for(const p of this.plants)if(p.hp<=0&&this.westFinale.handles(p.kind))this.westFinale.removed(p);
    for(const p of this.plants)if(p.hp<=0&&p.kind==='torchwood')this.dino.plants.removed(p);
    for(const p of this.plants)if(p.hp<=0&&p.kind==='moonbean')this.sky.thunder.moonDied(p);
    this.plantsLost+=this.plants.filter(p=>p.hp<=0&&!p.transformed&&p.kind!=='bamboobusket').length;
    for(const p of this.plants)if(p.hp<=0)this.eighties.carrot.remember(p);
    const protectedPlantDied=this.plants.some(p=>p.endangered&&p.hp<=0);
    if(this.level.airRaid&&this.sky.airRaid.player&&this.sky.airRaid.player.hp<=0&&this.phase==='playing'){this.phase='lost';this.lossReason='airRaid';this.events.push({type:'lose'});}
    if(this.level.beghouled)this.beghouled.recordDeaths();
    this.plants = this.plants.filter(p => p.hp > 0);
    this.checkChallenges();
    // Beach 40 keeps the source count of 5 for 3 plants; native protection checks on death.
    if(((this.level.world!=='beach'||this.level.day!==40)&&(this.level.world!=='iceage'||this.level.day!==37)&&(this.level.world!=='lostcity'||this.level.day!==35)||protectedPlantDied)&&this.level.mustProtect>0&&this.plants.filter(p=>p.endangered).length<this.level.mustProtect&&this.phase==='playing'){this.lossReason='protected';this.phase='lost';this.events.push({type:'lose'});}
    const absorbed=new Set<number>();
    for (const sun of this.suns) {
      sun.age+=dt;
      if(sun.absorber!==null){
        const ra=this.zombies.find(z=>z.id===sun.absorber)!;sun.absorbAge+=dt;
        // sun.ts pulls in three .5-second bursts separated by .3-second rests, then continuously.
        if(sun.absorbAge>=2.4||sun.absorbAge%.8<.5){const {x,y}=this.raTarget(ra),dx=x-sun.x,dy=y-sun.y,distance=Math.hypot(dx,dy),move=4*BOARD.cellWidth*dt;
          if(distance<=move){if(ra.kind==='lostcity_crystalskull')this.lostcity.crystalSun(ra,sun.value);else ra.absorbed+=sun.value;absorbed.add(sun.id);}else{sun.x+=dx/distance*move;sun.y+=dy/distance*move;}}
      }else if(sun.y<sun.targetY){sun.x+=sun.vx*dt;sun.y=Math.min(sun.targetY,sun.y+sun.vy*dt);if(sun.from!=='sky'&&!sun.floatingBomb)sun.vy+=990*dt;}
      else {if(sun.bomb)this.future.defuse(sun);sun.groundAge+=dt;}
    }
    this.suns = this.suns.filter(s => !absorbed.has(s.id)&&s.groundAge<7.5);
    if(this.autoCollectSun)for(const sun of this.suns)if(sun.groundAge>0&&!sun.bomb)this.collect(sun.id);
    for(const p of this.pickups)p.age+=dt;
    for (const effect of this.effects) effect.age += dt;
    this.effects = this.effects.filter(e => e.age < .65);
    if (!this.level.memory && this.wave > 0 && !this.pending.length &&!this.pendingGraveSpawns.length&& this.wave < this.level.waves.length && this.nextWave === Infinity) {
      const health = this.zombies.filter(z => this.waveIds.has(z.id)).reduce((n, z) => n + (z.kind==='pharaoh'||z.kind==='pharaoh_weak'?z.armor:z.hp), 0);
      if (!(this.level.airRaid&&this.level.actions[this.wave-1].some(a=>a.mustKillAll)&&this.zombies.some(z=>z.hp>0&&!z.airRaid?.props.IgnoredInWaves))&&!this.kongfu.holes.suppressesWave && this.time >= this.waveDamageDeadline && (health <= this.waveHealth * this.threshold || this.time >= this.waveDeadline)) {
        this.nextWave = this.time + (this.level.corral?0:(this.wave + 1) % this.level.flagInterval === 0 ? RULES.flagWaveEntrance : RULES.normalWaveEntrance);
      }
    }
    if (!this.level.beghouled && (this.boss?this.boss.defeated:this.wave === this.level.waves.length && !this.pending.length &&!this.modern.pending&&!this.pendingGraveSpawns.length&& !this.zombies.some(z=>!z.droneMaker&&!z.drone&&!z.airRaid?.props.IgnoredInWaves) && !this.cowboy.chickenThrowers.length && !this.iceageCombat.weaselThrowers.length && !this.pendingPharaohs.length&&!this.lostcity.porterDrops.size&&!this.sky.drops.length&&!this.sky.thunder.pending.length) && (!this.level.memory||this.darkMemory.complete) && this.phase === 'playing') {if(this.level.airRaid&&this.sky.airRaid.score<this.level.airRaid.target){this.phase='lost';this.lossReason='score';this.events.push({type:'lose'});}else if(this.level.killChallenge&&!this.killChallengeComplete){this.phase='lost';this.lossReason='killChallenge';this.events.push({type:'lose'});}else if(this.level.targetSun!==null&&this.sunProduced<this.level.targetSun){this.phase='lost';this.lossReason='sunProduced';this.events.push({type:'lose'});}else if(this.level.cannon&&this.pirate.score<this.level.cannon.MinScore){this.phase='lost';this.lossReason='score';this.events.push({type:'lose'});}else {this.phase = 'won';this.eighties.arcade.finish();this.eighties.speaker.finish(); this.events.push({ type: 'win' });} }
  }
}
