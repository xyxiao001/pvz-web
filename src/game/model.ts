import { BOARD, cellX, endlessConfig, isPool, isNight, MUSHROOMS, LEVELS, PLANTS, type SurvivalScene, type LevelId, type PlantKind, type ZombieKind } from './config';
import { generateSurvivalWaves, isSurvivalFlagWave, survivalRoster } from './survival';
import { generateWaves, isFlagWave } from './waves';
import { RowPicker } from './row-picker';
import { walkingSpeed } from './zombie-motion';
import portable from './data/portable-adventure.json';

export type Phase = 'ready' | 'playing' | 'paused' | 'intermission' | 'won' | 'lost';
export interface Plant { id: number; kind: PlantKind; row: number; column: number; health: number; actionIn: number; born: number; shotAt: number; awake?: boolean; rearIn?: number; productionEnding?: number; scared?: boolean; tall?: boolean; kelp?: { target: number; remaining: number }; squash?: { remaining: number; x: number; target: number };
  chomp?: { phase: 'ready' | 'bite' | 'digest' | 'recover'; remaining: number } }
export const headless = (zombie: Zombie) => !['zomboni','catapult','gargantuar'].includes(zombie.kind) && zombie.health < Math.trunc((['pole','dancer','dolphin','jack','ladder'].includes(zombie.kind) ? 500 : 270) / (zombie.mini ? 4 : 1)) / 3;
export interface Roller { id: number; kind: 'wallnut' | 'explodenut'; row: number; x: number; y: number; direction: number; hit: number[] }
export interface Packet { id: number; kind: PlantKind; x: number }
export interface Zombie { id: number; kind: ZombieKind; armor: number; row: number; x: number; health: number; speed: number; biteIn: number; eating: boolean; wave: number; hitAt: number; chillIn: number; hasPole: boolean; vaultIn: number; animationTime: number; shield: number; rageIn: number; riseIn: number; hypnotized?: boolean; mini?: boolean; frozenIn?: number; summonIn?: number; dancePhase?: 'intro' | 'point' | 'hold' | 'dance'; danceIn?: number; leader?: number; slot?: number; flying?: boolean; popIn?: number; dolphin?: boolean; jackIn?: number; jackOpening?: boolean; sled?: number; sledLeader?: number; crashIn?: number; blownIn?: number; underground?: boolean; emergingIn?: number; backwards?: boolean; metalRemoved?: boolean; pogo?: boolean; butterIn?: number; ladderIn?: number; garlicIn?: number; garlicRow?: number; catapult?: { ammo: number; remaining: number; phase: 'walk' | 'shoot' | 'reload' }; giant?: { thrown: boolean; phase: 'walk' | 'smash' | 'throw'; remaining: number }; flight?: { remaining: number; duration: number; startX: number; endX: number }; landingIn?: number; bungee?: { phase: 'down' | 'wait' | 'up'; remaining: number; column: number; drop?: ZombieKind } }
export interface Pea { id: number; row: number; x: number; ice: boolean; puff: boolean; age: number; longRange?: boolean; fire?: boolean; torch?: number; spike?: boolean; high?: boolean; vx?: number; vy?: number; y?: number; originY?: number; star?: boolean; lob?: { kind: 'cabbage' | 'kernel' | 'butter' | 'melon' | 'basketball'; target: number; startX: number; endX: number; startY: number; endY: number; duration: number } }
export interface Vase { id: number; row: number; column: number; green: boolean; content: { type: 'seed'; kind: PlantKind } | { type: 'zombie'; kind: ZombieKind } }
export interface SeedDrop { id: number; kind: PlantKind; row: number; column: number; remaining: number }
export interface Sun { id: number; x: number; y: number; targetY: number; expiresIn: number; born: number; value: number }
export interface Coin { id: number; x: number; y: number; targetY: number; born: number; expiresIn: number; value: number }
export interface Mower { row: number; x: number; state: 'ready' | 'moving' | 'spent' }
export type GameEvent = { kind: 'plant' | 'shoot' | 'hit' | 'mower' | 'wave' | 'win' | 'lose' | 'explode' | 'flag' | 'whack' | 'hypnotize' | 'freeze' | 'blover' | 'vase' | 'thunder' | 'bungee' | 'coffee'; x: number; y: number }
  | { kind: 'fire'; x: number; y: number; row: number }
  | { kind: 'coin'; x: number; y: number; value: number }
  | { kind: 'sun'; x: number; y: number; value: number }
  | { kind: 'fume'; x: number; y: number; row: number }
  | { kind: 'swallow'; x: number; y: number; zombieId: number };

// Browser-independent, fixed 10 ms simulation. Rendering never changes this state.
export class Game {
  phase: Phase = 'ready';
  ticks = 0;
  sun: number;
  autoCollectSun = false;
  selected: PlantKind | null = null;
  plants: Plant[] = [];
  rollers: Roller[] = [];
  conveyor: Packet[] = [];
  selectedPacket: number | null = null;
  digging = false;
  private conveyorIn = 400;
  private lastConveyorSeed: PlantKind | null = null;
  readonly needsSeedChoice: boolean;
  seeds: PlantKind[];
  zombies: Zombie[] = [];
  peas: Pea[] = [];
  suns: Sun[] = [];
  coins: Coin[] = [];
  money = 0;
  mowers: Mower[];
  graves: { id: number; row: number; column: number }[] = [];
  private graveWaveIn = 0;
  craters: { id: number; row: number; column: number; remaining: number }[] = [];
  private poolFrozenIn = 0;
  iceTrails: { row: number; x: number; remaining: number }[] = [];
  fogBlownIn = 0;
  stormIn = 650;
  ladders: { column: number; row: number }[] = [];
  vaseStage = 0;
  vases: Vase[] = [];
  seedDrops: SeedDrop[] = [];
  selectedDrop: number | null = null;
  cooldowns: Record<PlantKind, number> = { umbrella:0, marigold:0, melonpult:0, splitpea:0, starfruit:0, pumpkin:0, magnetshroom:0, cabbagepult:0, flowerpot:0, kernelpult:0, coffeebean:0, garlic:0, jalapeno: 0, spikeweed: 0, torchwood: 0, tallnut: 0, seashroom: 0, cactus: 0, blover: 0, tanglekelp: 0, peashooter: 0, sunflower: 0, cherrybomb: 0, wallnut: 0, potatomine: 0, snowpea: 0, explodenut: 0, chomper: 0, repeater: 0, puffshroom: 0, sunshroom: 0, fumeshroom: 0, gravebuster: 0, hypnoshroom: 0, scaredyshroom: 0, iceshroom: 0, doomshroom: 0, lilypad: 0, squash: 0, threepeater: 0, plantern: 0 };
  wave = 0;
  kills = 0;
  planted = 0;
  collected = 0;
  events: GameEvent[] = [];
  private id = 0;
  private randomState: number;
  private started = false;
  private sunIn = 400;
  private sunsFallen = 0;
  private waveIn = 1800;
  private waveElapsed = 0;
  private waveThreshold = 0;
  flagWarningIn = 0;
  private whackSpawnIn = 0;
  private whackFinalSpawned = false;
  private rowPicker: RowPicker;
  readonly config;
  waves: ZombieKind[][];
  survivalStage = 0;
  survivalEnemies: ZombieKind[] = [];

  constructor(readonly level: LevelId, seed: number, readonly scenario: 'adventure' | 'endless' = 'adventure', readonly survivalScene: SurvivalScene = 'day') {
    this.config = scenario === 'endless' ? endlessConfig(survivalScene) : LEVELS[level];
    this.needsSeedChoice = scenario === 'endless' || this.config.mode === 'lawn' && level > 7;
    this.seeds = this.needsSeedChoice ? [] : [...this.config.seeds];
    this.sun = this.config.initialSun;
    this.randomState = seed >>> 0;
    if (scenario === 'endless') this.survivalEnemies = survivalRoster(0, () => this.random(), survivalScene);
    this.waves = scenario === 'endless' ? generateSurvivalWaves(0, this.survivalEnemies, () => this.random()) : generateWaves(level, () => this.random());
    if (scenario === 'endless') this.started = true;
    this.rowPicker = new RowPicker(this.config.rows);
    if (this.config.mode === 'bowling') {
      this.conveyor.push({ id: ++this.id, kind: 'wallnut', x: 0 });
      this.started = true; this.waveIn = 200;
    }
    if (this.config.mode === 'conveyor') {
      this.started = true; this.conveyorIn = 1;
    }
    if (this.config.mode === 'whack') { this.started = true; this.waveIn = 200; this.addWhackGraves(9); }
    if (this.config.environment === 'night' && this.config.mode !== 'whack' && this.config.mode !== 'vase') {
      const columns = scenario === 'endless' ? [[4,1],[5,1],[6,2],[7,2],[8,3]] : portable.graveColumns[level - 1];
      for (const [column, count] of columns) {
        const rows = [...this.config.rows];
        for (let i = 0; i < count; i++) this.graves.push({ id: ++this.id, column, row: rows.splice(Math.floor(this.random() * rows.length), 1)[0] });
      }
    }
    if (this.config.mode === 'vase') { this.started = true; this.populateVases(); }
    if (this.config.environment === 'roof') for (let column=0;column<(level===41?5:level===42?4:3);column++) for (const row of this.config.rows) this.plants.push({id:++this.id,kind:'flowerpot',column,row,health:300,actionIn:0,born:0,shotAt:-100});
    this.mowers = this.config.mode === 'vase' || this.config.environment === 'roof' ? [] : this.config.rows.map(row => ({ row, x: 20, state: 'ready' }));
  }

  snapshot() {
    const { config, rowPicker, ...state } = this;
    return structuredClone({ ...state, rowPicker: rowPicker.snapshot() });
  }
  static restore(snapshot: ReturnType<Game['snapshot']>) {
    const game = new Game(snapshot.level, 0, snapshot.scenario, snapshot.survivalScene);
    Object.assign(game, structuredClone(snapshot));
    game.rowPicker = RowPicker.restore(snapshot.rowPicker);
    return game;
  }
  get cellHeight() { return isPool(this.config.environment) || this.config.environment === 'roof' ? 85 : 100; }
  rowY(row: number, x = 440) { return BOARD.top + row * this.cellHeight + (this.config.environment === 'roof' ? 58 + this.slope(x) : isPool(this.config.environment) ? 68 : 78); }
  slope(x: number) { return this.config.environment === 'roof' ? Math.max(0,440-x)*.25 : 0; }
  rowAt(y: number, x = 440) { return Math.floor((y - BOARD.top - this.slope(x) + (this.config.environment === 'roof' ? 10 : 0)) / this.cellHeight); }
  waterRow(row: number) { return isPool(this.config.environment) && (row === 2 || row === 3); }
  sleeping(plant: Plant) { return !plant.awake && !isNight(this.config.environment) && MUSHROOMS.includes(plant.kind); }
  flying(z: Zombie) { return z.kind === 'balloon' && (z.flying || (z.popIn !== undefined && z.popIn > 0)); }
  submerged(z: Zombie) { return !!z.flight || !!z.landingIn || !!z.underground || !!z.emergingIn || !!z.bungee && z.bungee.phase !== 'wait' || z.kind === 'snorkel' && this.waterRow(z.row) && z.x > 100 && z.x < 770 && !z.eating; }

  private random() {
    this.randomState = (Math.imul(this.randomState, 1664525) + 1013904223) >>> 0;
    return this.randomState / 0x100000000;
  }

  get hasConveyor() { return this.config.mode === 'bowling' || this.config.mode === 'conveyor'; }

  isFlagWave(wave: number) { return this.scenario === 'endless' ? isSurvivalFlagWave(wave) : isFlagWave(this.level, wave); }

  get survivalFlags() {
    // Board::GetSurvivalFlagsCompleted: a flag in progress is not yet a cleared flag.
    const pendingFlag = this.isFlagWave(this.wave - 1) && this.phase !== 'intermission';
    return this.survivalStage * 2 + Math.floor((this.wave - Number(pendingFlag)) / 10);
  }

  nextSurvivalStage() {
    if (this.scenario !== 'endless' || this.phase !== 'intermission') return;
    this.survivalStage++;
    this.survivalEnemies = survivalRoster(this.survivalStage, () => this.random(), this.survivalScene);
    this.waves = generateSurvivalWaves(this.survivalStage, this.survivalEnemies, () => this.random());
    this.wave = 0; this.waveIn = 600; this.waveElapsed = 0; this.waveThreshold = 0; this.flagWarningIn = 0;
    this.rowPicker.beginSurvivalStage();
    this.cancelSelection(); this.seeds = [];
    this.phase = 'ready';
  }

  chooseSeed(kind: PlantKind) {
    if (this.phase !== 'ready' || !this.needsSeedChoice || !this.config.seeds.includes(kind)) return;
    const index = this.seeds.indexOf(kind);
    if (index !== -1) this.seeds.splice(index, 1);
    else if (this.seeds.length < 6) this.seeds.push(kind);
  }
  start() {
    if (this.needsSeedChoice && this.seeds.length !== 6) return;
    this.phase = 'playing';
  }
  pause() { if (this.phase === 'playing') this.phase = 'paused'; }
  resume() { if (this.phase === 'paused') this.phase = 'playing'; }

  select(kind: PlantKind) {
    if (this.phase !== 'playing' || this.hasConveyor || this.config.mode === 'vase' || !this.seeds.includes(kind)) return;
    this.digging = false;
    this.selected = this.selected === kind ? null : kind;
  }

  selectPacket(id: number) {
    if (this.phase !== 'playing') return;
    const packet = this.conveyor.find(packet => packet.id === id);
    if (!packet) return;
    this.digging = false;
    this.selectedPacket = this.selectedPacket === id ? null : id;
    this.selected = this.selectedPacket === null ? null : packet.kind;
  }

  cancelSelection() { this.selected = null; this.selectedPacket = null; this.selectedDrop = null; this.digging = false; }
  toggleShovel() {
    if (this.phase !== 'playing' || this.scenario === 'adventure' && this.level < 6) return;
    this.digging = !this.digging; this.selected = null; this.selectedPacket = null; this.selectedDrop = null;
  }
  dig(column: number, row: number) {
    if (this.phase !== 'playing' || !this.digging) return;
    const occupants = this.plants.filter(plant => plant.column === column && plant.row === row);
    const target = occupants.find(p => p.kind === 'pumpkin') || occupants.find(plant => !['lilypad','flowerpot'].includes(plant.kind)) || occupants[0];
    if (target) this.ladders = this.ladders.filter(l => l.column !== column || l.row !== row);
    if (target?.kelp) { const caught = this.zombies.find(z => z.id === target.kelp!.target); if (caught) caught.health = 0; }
    this.plants = this.plants.filter(plant => plant !== target);
    this.digging = false;
  }

  canPlant(kind: PlantKind, column: number, row: number) {
    if (this.phase !== 'playing' || !this.seeds.includes(kind)
      || !this.config.rows.includes(row) || !(column >= 0 && column < BOARD.columns)) return false;
    if (this.vases.some(v => v.column === column && v.row === row) || this.iceTrails.some(ice => ice.row === row && cellX(column) + 30 >= ice.x)) return false;
    if (this.craters.some(c => c.column === column && c.row === row)) return false;
    const occupants = this.plants.filter(p => p.column === column && p.row === row);
    if ((kind === 'lilypad' || kind === 'tanglekelp' || kind === 'seashroom') && (!this.waterRow(row) || occupants.length > 0)) return false;
    if (this.waterRow(row) && kind !== 'lilypad' && kind !== 'tanglekelp' && kind !== 'seashroom' && (kind === 'potatomine' || kind === 'spikeweed' || !occupants.some(p => p.kind === 'lilypad'))) return false;
    if (this.config.environment === 'roof' && (['spikeweed','potatomine','lilypad','seashroom','tanglekelp','gravebuster'].includes(kind) || kind !== 'flowerpot' && !occupants.some(p => p.kind === 'flowerpot'))) return false;
    const occupied = kind === 'coffeebean' ? !occupants.some(p => this.sleeping(p)) || occupants.some(p => p.kind === 'coffeebean')
      : kind === 'pumpkin' ? occupants.some(p => p.kind === 'pumpkin')
      : kind === 'flowerpot' ? occupants.length > 0
      : occupants.some(p => kind === 'lilypad' || !['lilypad','flowerpot','pumpkin'].includes(p.kind));
    const grave = this.graves.some(grave => grave.column === column && grave.row === row);
    if (kind === 'gravebuster' ? !grave : grave) return false;
    if (this.config.mode === 'bowling') return column < 3 && this.conveyor.some(packet => packet.id === this.selectedPacket && packet.kind === kind);
    if (this.config.mode === 'conveyor') return this.conveyor.some(packet => packet.id === this.selectedPacket && packet.kind === kind)
      && !occupied;
    if (this.config.mode === 'vase') return !occupied && this.seedDrops.some(drop => drop.id === this.selectedDrop && drop.kind === kind);
    return this.sun >= PLANTS[kind].cost && this.cooldowns[kind] === 0
      && !occupied;
  }

  plant(column: number, row: number) {
    const kind = this.selected;
    if (!kind || !this.canPlant(kind, column, row)) return false;
    if (this.config.mode === 'bowling') {
      const packet = this.conveyor.splice(this.conveyor.findIndex(packet => packet.id === this.selectedPacket), 1)[0];
      this.rollers.push({ id: ++this.id, kind: packet.kind as Roller['kind'], row, x: cellX(column), y: this.rowY(row), direction: 0, hit: [] });
      this.selectedPacket = null;
    } else {
      if (this.config.mode === 'vase') {
        this.seedDrops = this.seedDrops.filter(drop => drop.id !== this.selectedDrop); this.selectedDrop = null;
      } else if (this.config.mode === 'conveyor') {
        this.conveyor.splice(this.conveyor.findIndex(packet => packet.id === this.selectedPacket), 1);
        this.selectedPacket = null;
      } else {
        this.sun -= PLANTS[kind].cost;
        this.cooldowns[kind] = PLANTS[kind].cooldown;
      }
      this.plants.push({ id: ++this.id, kind, column, row, health: PLANTS[kind].health,
        actionIn: kind === 'sunflower' || kind === 'sunshroom' || kind === 'marigold' ? 300 + Math.floor(this.random() * 951) : kind === 'jalapeno' || kind === 'cherrybomb' || kind === 'iceshroom' || kind === 'doomshroom' ? 100 : kind === 'potatomine' ? 1500 : kind === 'gravebuster' ? 400 : kind === 'coffeebean' ? 100
          : kind === 'peashooter' || kind === 'snowpea' || kind === 'repeater' || kind === 'puffshroom' || kind === 'fumeshroom' || kind === 'scaredyshroom' || kind === 'threepeater' || kind === 'seashroom' || kind === 'cactus' || kind === 'splitpea' || kind === 'starfruit' || kind === 'cabbagepult' || kind === 'kernelpult' || kind === 'melonpult' ? Math.floor(this.random() * 151) : 50,
        born: this.ticks, shotAt: -100, ...(kind === 'chomper' ? { chomp: { phase: 'ready' as const, remaining: 0 } } : {}) });
    }
    this.selected = null;
    this.started = true;
    this.planted++;
    this.events.push({ kind: 'plant', x: cellX(column), y: this.rowY(row) });
    return true;
  }

  collectSun(id: number) {
    if (this.phase !== 'playing') return;
    const index = this.suns.findIndex(sun => sun.id === id);
    if (index === -1) return;
    const [sun] = this.suns.splice(index, 1);
    this.sun += sun.value;
    this.collected += sun.value;
    this.events.push({ kind: 'sun', x: sun.x, y: sun.y, value: sun.value });
  }

  private addSun(x: number, y: number, targetY: number, value: number) {
    this.suns.push({ id: ++this.id, x, y, targetY, expiresIn: 1200, born: this.ticks, value });
  }

  private spawnWave() {
    // Board::SpawnZombieWave explicitly substitutes four normals if no usable ice exists.
    const wave = this.waves[this.wave].flatMap(kind => kind === 'bobsled' && !this.iceTrails.some(ice => ice.x < 700) ? ['normal','normal','normal','normal'] as ZombieKind[] : [kind]);
    for (const kind of wave) {
      const allowedRows = this.config.rows.filter(row => kind === 'bobsled' ? this.iceTrails.some(ice => ice.row === row && ice.x < 700)
        : kind === 'ducky' || kind === 'snorkel' || kind === 'dolphin' ? this.waterRow(row)
        : this.waterRow(row) ? kind === 'balloon' || this.wave >= 5 && ['normal','cone','bucket','flag'].includes(kind)
        : kind !== 'dancer' || isPool(this.config.environment) || row > 0 && row < 4);
      const row = this.rowPicker.pick(this.wave, this.random(), allowedRows);
      // Adapt original mPosX to this port's body anchor (+30 px); flag overrides to board width.
      const spawnX = 810 + Math.floor(this.random() * 40) + (this.isFlagWave(this.wave) ? 40 : 0);
      if (this.level === 45 && this.scenario === 'adventure' && kind !== 'bungee') { this.dropFromSky(kind, row, this.wave); continue; }
      const zombie = this.spawnZombie(kind, row, kind === 'flag' ? 830 : spawnX, this.wave);
      if (kind === 'bobsled') {
        zombie.armor = 300; zombie.sled = zombie.id;
        for (let i = 1; i < 4; i++) {
          const member = this.spawnZombie('bobsled', row, zombie.x + i * 45, this.wave);
          member.sled = zombie.id; member.sledLeader = zombie.id;
        }
      }
    }
    this.wave++;
    if (this.wave === this.config.waveCount && this.config.environment !== 'day') this.graveWaveIn = 200;
    this.waveElapsed = 0;
    const beforeFlag = this.config.mode !== 'bowling' && this.isFlagWave(this.wave);
    this.waveThreshold = beforeFlag ? 0 : this.zombies.filter(z => !z.hypnotized && z.wave === this.wave - 1 && !headless(z))
      .reduce((sum, z) => sum + z.health + z.armor + z.shield, 0) * (.5 + this.random() * .15);
    this.waveIn = beforeFlag ? 4500 : 2500 + Math.floor(this.random() * 600);
    this.events.push({ kind: 'wave', x: 400, y: 280 });
  }

  private spawnZombie(kind: ZombieKind, row: number, x: number, wave: number) {
    const zombie: Zombie = { id: ++this.id, kind, armor: kind === 'digger' ? 100 : kind === 'football' ? 1400 : kind === 'cone' ? 370 : kind === 'bucket' ? 1100 : 0,
      shield: kind === 'ladder' ? 500 : kind === 'newspaper' ? 150 : kind === 'door' ? 1100 : 0, rageIn: 0, riseIn: 0, row, x,
      health: kind === 'gargantuar' ? 3000 : kind === 'catapult' ? 850 : kind === 'bungee' ? 450 : kind === 'zomboni' ? 1350 : ['pole','dancer','dolphin','jack','ladder'].includes(kind) ? 500 : 270, speed: kind === 'pogo' ? .45 : kind === 'ladder' ? .79 + this.random() * .02 : kind === 'digger' ? .66 + this.random()*.02 : kind === 'dolphin' ? .89 + this.random() * .02 : kind === 'bobsled' ? .6 : ['pole','football','snorkel','jack'].includes(kind) ? .66 + this.random() * .02 : kind === 'dancer' || kind === 'backup' || kind === 'flag' ? .45 : .23 + this.random() * .14,
      biteIn: 4, eating: false, wave, hitAt: -100, chillIn: 0, hasPole: kind === 'pole', vaultIn: 0, animationTime: 0 };
    if (this.scenario === 'adventure' && this.level === 25) { zombie.mini = true; zombie.health = Math.trunc(zombie.health / 4); zombie.armor = Math.trunc(zombie.armor / 4); zombie.shield = Math.trunc(zombie.shield / 4); }
    if (kind === 'dancer') { zombie.summonIn = 0; zombie.dancePhase = 'intro'; zombie.danceIn = 300 + Math.floor(this.random() * 12); }
    if (kind === 'digger') zombie.underground = true;
    if (kind === 'pogo') zombie.pogo = true;
    if (kind === 'catapult') zombie.catapult = { ammo: 20, remaining: 0, phase: 'walk' };
    if (kind === 'gargantuar') zombie.giant = { thrown: false, remaining: 0, phase: 'walk' };
    if (kind === 'bungee') { const targets=this.plants.filter(p=>!this.zombies.some(z=>z.bungee?.column===p.column&&z.row===p.row)); const target=targets[Math.floor(this.random()*targets.length)]; const column=target?target.column:4+Math.floor(this.random()*5); zombie.row=target?target.row:row; zombie.x=cellX(column); zombie.bungee={phase:'down',remaining:375,column}; this.events.push({kind:'bungee',x:zombie.x,y:this.rowY(zombie.row,zombie.x)}); }
    if (kind === 'dolphin') zombie.dolphin = true;
    if (kind === 'balloon') zombie.flying = true;
    if (kind === 'jack') {
      const distance = (450 + Math.floor(this.random() * 300)) / (this.random() < .05 ? 3 : 1);
      zombie.jackIn = this.config.mode === 'vase' ? 10 : Math.trunc(distance / zombie.speed) * 2;
    }
    this.zombies.push(zombie); return zombie;
  }

  private populateVases() {
    const recipe = portable.vaseStages[this.vaseStage];
    const cells = this.config.rows.flatMap(row => Array.from({ length: 9 - recipe.firstColumn }, (_, i) => ({ row, column: i + recipe.firstColumn })));
    for (const content of recipe.contents) for (let i = 0; i < content.count; i++) {
      const cell = cells.splice(Math.floor(this.random() * cells.length), 1)[0];
      this.vases.push({ id: ++this.id, ...cell, green: false, content: content.type === 'seed' ? { type: 'seed', kind: content.kind as PlantKind } : { type: 'zombie', kind: content.kind as ZombieKind } });
    }
    const seeds = this.vases.filter(v => v.content.type === 'seed');
    for (let i = 0; i < recipe.green; i++) seeds.splice(Math.floor(this.random() * seeds.length), 1)[0].green = true;
    this.wave = this.vaseStage + 1;
  }

  openVase(column: number, row: number) {
    if (this.phase !== 'playing' || this.config.mode !== 'vase' || this.selected) return;
    const vase = this.vases.find(v => v.column === column && v.row === row);
    if (vase) this.breakVase(vase);
    this.digging = false;
  }

  private breakVase(vase: Vase) {
    this.vases = this.vases.filter(v => v !== vase);
    if (vase.content.type === 'seed') this.seedDrops.push({ id: ++this.id, kind: vase.content.kind, row: vase.row, column: vase.column, remaining: 1500 });
    else this.spawnZombie(vase.content.kind, vase.row, cellX(vase.column), this.vaseStage);
    this.events.push({ kind: 'vase', x: cellX(vase.column), y: this.rowY(vase.row) - 40 });
  }

  selectDrop(id: number) {
    if (this.phase !== 'playing') return;
    const drop = this.seedDrops.find(d => d.id === id);
    if (!drop) return;
    this.selectedDrop = id; this.selected = drop.kind; this.digging = false;
  }

  nextVaseStage() {
    if (this.config.mode !== 'vase' || this.phase !== 'intermission') return;
    this.vaseStage++; this.plants = []; this.zombies = []; this.peas = []; this.seedDrops = []; this.suns = [];
    this.cancelSelection(); this.populateVases(); this.phase = 'ready';
  }

  step() {
    if (this.phase !== 'playing') return;
    this.ticks++;
    if (this.level===40 && this.scenario==='adventure' && --this.stormIn===0) { this.stormIn=450+Math.floor(this.random()*450); this.events.push({kind:'thunder',x:400,y:300}); }
    for (const ice of this.iceTrails) ice.remaining--;
    this.iceTrails = this.iceTrails.filter(ice => ice.remaining > 0);
    if (this.fogBlownIn > 0) this.fogBlownIn--;
    for (const drop of this.seedDrops) if (drop.id !== this.selectedDrop) drop.remaining--;
    this.seedDrops = this.seedDrops.filter(drop => drop.remaining > 0);
    for (const crater of this.craters) crater.remaining--;
    this.craters = this.craters.filter(c => c.remaining > 0);
    if (this.poolFrozenIn > 0) this.poolFrozenIn--;
    for (const kind of this.seeds) if (this.cooldowns[kind] > 0) this.cooldowns[kind]--;
    if (!this.started) return;

    if (this.hasConveyor && this.ticks % 4 === 0) {
      this.conveyor.forEach((packet, index) => { packet.x = Math.max(index * 50, packet.x - 1); });
    }
    if (this.hasConveyor && --this.conveyorIn === 0) {
      const count = this.conveyor.length;
      this.conveyorIn = count > 8 ? 1000 : count > 6 ? 500 : count > 4 ? 425 : 400;
      if (count < 10) this.conveyor.push({ id: ++this.id, kind: this.nextConveyorSeed(),
        x: count === 0 ? 500 : Math.max(500, this.conveyor[count - 1].x + 50) });
    }

    // Match Board::UpdateGameObjects ordering: plants, zombies, projectiles, suns, mowers.
    for (const plant of this.plants) {
      if(plant.kind==='marigold'&&this.wave===this.config.waveCount&&plant.productionEnding===undefined)plant.productionEnding=this.ticks+6000;
      if (plant.kind === 'tanglekelp') { this.updateKelp(plant); continue; }
      if (plant.health <= 0 || this.sleeping(plant) || ['wallnut','tallnut','torchwood','hypnoshroom','lilypad','flowerpot','pumpkin','garlic','plantern','umbrella'].includes(plant.kind)) continue;
      if (plant.kind === 'magnetshroom') { this.updateMagnet(plant); continue; }
      if (plant.kind === 'coffeebean') { if (--plant.actionIn===0) { const mushroom=this.plants.find(p=>p.column===plant.column&&p.row===plant.row&&this.sleeping(p)); if(mushroom)mushroom.awake=true;plant.health=0;this.events.push({kind:'coffee',x:cellX(plant.column),y:this.rowY(plant.row,cellX(plant.column))}); } continue; }
      if (plant.kind === 'splitpea') { if (plant.rearIn && --plant.rearIn===0) this.fireRear(plant); }
      if (plant.kind === 'spikeweed') {
        if (--plant.actionIn <= 0) {
          const targets = this.zombies.filter(z => !z.hypnotized && !this.flying(z) && !z.underground && z.health > 0 && z.row === plant.row && z.vaultIn === 0 && Math.abs(z.x - cellX(plant.column)) < 45);
          if (targets.length) { for (const z of targets) this.damageZombie(z, 20, true); plant.shotAt = this.ticks; plant.actionIn = 100; }
        }
        continue;
      }
      if (plant.kind === 'squash') { this.updateSquash(plant); continue; }
      if (plant.kind === 'scaredyshroom') {
        // Portable tests a 120-pixel circle against nearby enemy bodies (adjacent rows too).
        plant.scared = this.zombies.some(z => !z.hypnotized && z.health > 0 && !headless(z)
          && Math.abs(z.row - plant.row) <= 1 && Math.hypot(Math.max(0, Math.abs(z.x - cellX(plant.column)) - 20), Math.max(0, Math.abs(z.row - plant.row) * this.cellHeight - 50)) <= 120);
        if (plant.scared) { plant.actionIn = 150; continue; }
      }
      if (plant.kind === 'sunshroom' && this.ticks - plant.born >= 12000 && this.ticks - plant.born < 12092) continue;
      if (plant.kind === 'gravebuster') {
        if (--plant.actionIn === 0) { this.graves = this.graves.filter(g => g.row !== plant.row || g.column !== plant.column); plant.health = 0; }
        continue;
      }
      if (plant.kind === 'chomper') { this.updateChomper(plant); continue; }
      if (plant.kind === 'potatomine') {
        if (plant.actionIn > 0) { plant.actionIn--; continue; }
        if (this.zombies.some(z => !z.hypnotized && !this.flying(z) && z.health > 0 && z.vaultIn === 0 && z.riseIn === 0 && z.row === plant.row && Math.abs(z.x - cellX(plant.column)) < 35)) {
          for (const z of this.zombies) if (!z.hypnotized && !this.flying(z) && z.vaultIn === 0 && z.riseIn === 0 && z.row === plant.row && Math.abs(z.x - cellX(plant.column)) <= 60) this.damageZombie(z, 1800, true);
          plant.health = 0;
          this.events.push({ kind: 'explode', x: cellX(plant.column), y: this.rowY(plant.row, cellX(plant.column)) - 35 });
        }
        continue;
      }
      --plant.actionIn;
      // Portable UpdateShooter checks the repeater at 25 and at zero: a 25-tick pair.
      if (plant.kind === 'repeater' && plant.actionIn === 25) this.firePea(plant);
      if (plant.actionIn > 0) continue;
      if (plant.kind === 'blover') {
        if (this.ticks - plant.born <= 50) {
          for (const z of this.zombies) if (z.flying) z.blownIn = 100;
          this.fogBlownIn = 4000; plant.actionIn = 100;
          this.events.push({ kind: 'blover', x: cellX(plant.column), y: this.rowY(plant.row, cellX(plant.column)) });
        } else plant.health = 0;
        continue;
      }
      if (plant.kind === 'jalapeno') {
        this.ladders=this.ladders.filter(l=>l.row!==plant.row);
        for (const z of this.zombies) if (!z.hypnotized && z.row === plant.row) { this.damageZombie(z, 1800, true); z.chillIn = 0; z.frozenIn = 0; }
        for (const ice of this.iceTrails) if (ice.row === plant.row) ice.remaining = 20;
        plant.health = 0;
        this.events.push({ kind: 'fire', x: 0, y: this.rowY(plant.row, cellX(plant.column)), row: plant.row }); continue;
      }
      if (plant.kind === 'iceshroom') {
        for (const z of this.zombies) if (!z.hypnotized && z.health > 0 && z.kind !== 'zomboni' && z.kind !== 'catapult' && !z.sled) {
          const cold = z.chillIn > 0 || (z.frozenIn !== undefined && z.frozenIn > 0);
          z.frozenIn = this.waterRow(z.row) ? 300 : cold ? 300 + Math.floor(this.random()*101) : 400 + Math.floor(this.random()*201);
          z.chillIn = 2000; this.damageZombie(z,20,true);
        }
        this.poolFrozenIn = 300; plant.health = 0;
        this.events.push({kind:'freeze',x:400,y:300}); continue;
      }
      if (plant.kind === 'doomshroom') {
        const x = cellX(plant.column), y = this.rowY(plant.row, cellX(plant.column));
        for (const z of this.zombies) if (!z.hypnotized && Math.abs(z.row-plant.row)<=3 && Math.hypot(z.x-x, this.rowY(z.row)-y)<=250) this.damageZombie(z,1800,true);
        for (const p of this.plants) if (p.column === plant.column && p.row === plant.row) p.health = 0;
        this.craters.push({id:++this.id,column:plant.column,row:plant.row,remaining:18000});
        this.events.push({kind:'explode',x,y:y-35}); continue;
      }
      if (plant.kind === 'splitpea') { this.firePea(plant); this.fireRear(plant); plant.rearIn=25;plant.actionIn=150-Math.floor(this.random()*15);continue; }
      if (plant.kind === 'starfruit') { this.fireStars(plant);plant.actionIn=150-Math.floor(this.random()*15);continue; }
      if (plant.kind === 'cabbagepult' || plant.kind === 'kernelpult' || plant.kind === 'melonpult') { this.fireLob(plant);plant.actionIn=300-Math.floor(this.random()*15);continue; }
      if (plant.kind === 'threepeater') {
        if (this.zombies.some(z=>!z.hypnotized&&!this.flying(z)&&!this.submerged(z)&&z.health>0&&z.riseIn===0&&Math.abs(z.row-plant.row)<=1&&z.x>cellX(plant.column)&&z.x<825))
          for (const row of this.config.rows) if (Math.abs(row-plant.row)<=1) this.firePea({...plant,row},true);
        plant.shotAt = this.ticks; plant.actionIn = 150-Math.floor(this.random()*15); continue;
      }
      if (plant.kind === 'marigold') {
        if (plant.productionEnding !== undefined && this.ticks >= plant.productionEnding) continue;
        const x=cellX(plant.column), y=this.rowY(plant.row,x);
        this.coins.push({id:++this.id,x:x+12,y:y-55,targetY:y-10,born:this.ticks,expiresIn:1500,value:this.random()<.1?50:10});
        plant.actionIn=2500-150+Math.floor(this.random()*151);plant.shotAt=this.ticks;
        continue;
      }
      if (plant.kind === 'cherrybomb') {
        this.ladders=this.ladders.filter(l=>Math.abs(l.row-plant.row)>1||Math.abs(l.column-plant.column)>1);
        for (const zombie of this.zombies) {
          if (!zombie.hypnotized && Math.abs(zombie.row - plant.row) <= 1 && Math.abs(zombie.x - cellX(plant.column)) <= 115) this.damageZombie(zombie, 1800, true);
        }
        plant.health = 0;
        this.events.push({ kind: 'explode', x: cellX(plant.column), y: this.rowY(plant.row, cellX(plant.column)) - 35 });
      } else if (plant.kind === 'sunflower' || plant.kind === 'sunshroom') {
        this.addSun(cellX(plant.column) + 12, this.rowY(plant.row, cellX(plant.column)) - 55, this.rowY(plant.row, cellX(plant.column)) - 15, plant.kind === 'sunshroom' && this.ticks - plant.born < 12000 ? 15 : 25);
        plant.actionIn = PLANTS.sunflower.interval - 150 + Math.floor(this.random() * 151);
      } else {
        plant.actionIn = PLANTS.peashooter.interval - Math.floor(this.random() * 15);
        this.firePea(plant);
      }
    }

    for (const zombie of this.zombies) {
      if (zombie.health <= 0) continue;
      if (zombie.blownIn !== undefined && zombie.blownIn > 0) {
        zombie.x += 6; zombie.animationTime++;
        if (--zombie.blownIn === 0) zombie.health = 0;
        continue;
      }
      if (this.plants.some(p => p.kelp?.target === zombie.id)) { zombie.eating = false; continue; }
      if (zombie.butterIn && zombie.butterIn>0) { zombie.butterIn--;continue; }
      if (zombie.chillIn > 0) zombie.chillIn--;
      if (zombie.frozenIn !== undefined && zombie.frozenIn > 0) { zombie.frozenIn--; continue; }
      const speedFactor = zombie.chillIn > 0 ? .4 : 1;
      zombie.animationTime += speedFactor;
      if (zombie.riseIn > 0) { zombie.riseIn--; zombie.eating = false; continue; }
      if (zombie.flight) {
        const f=zombie.flight; f.remaining--; zombie.x=f.startX+(f.endX-f.startX)*(1-f.remaining/f.duration);
        if(f.remaining===0){zombie.flight=undefined;zombie.landingIn=21;}
        continue;
      }
      if(zombie.landingIn){zombie.landingIn--;continue;}
      if(zombie.catapult){this.updateCatapult(zombie);continue;}
      if(zombie.giant){this.updateGiant(zombie,speedFactor);continue;}
      if (zombie.bungee) { this.updateBungee(zombie); continue; }
      if (zombie.underground) { zombie.x-=zombie.speed*speedFactor; if(zombie.x<45){zombie.underground=false;zombie.emergingIn=230;zombie.backwards=true;zombie.speed=.12;}continue; }
      if (zombie.emergingIn) { zombie.emergingIn--;continue; }
      if (zombie.garlicIn) { if(--zombie.garlicIn===0){zombie.row=zombie.garlicRow!;zombie.eating=false;}continue; }
      if (zombie.ladderIn) { if(--zombie.ladderIn===0){this.ladders.push({column:Math.round((zombie.x-35-80)/80),row:zombie.row});zombie.shield=0;zombie.speed=.3;}continue; }
      if (zombie.kind === 'zomboni') { this.updateZomboni(zombie); continue; }
      if (zombie.sled || zombie.crashIn) { this.updateSled(zombie); continue; }
      if (zombie.kind === 'jack' && !zombie.metalRemoved && !headless(zombie) && this.updateJack(zombie)) continue;
      if (zombie.popIn !== undefined && zombie.popIn > 0) {
        if (--zombie.popIn === 0 && this.waterRow(zombie.row)) zombie.health = 0;
        continue;
      }
      if (zombie.flying) { zombie.eating = false; zombie.x -= zombie.speed * speedFactor; continue; }
      if (zombie.rageIn > 0 && !headless(zombie)) {
        zombie.rageIn -= Math.min(speedFactor, zombie.rageIn); zombie.eating = false;
        if (zombie.rageIn === 0) zombie.speed = .89 + this.random() * .02;
        continue;
      }
      // Zombie::UpdateDamageStates / UpdatePlaying: below 1/3 health a normal
      // zombie can no longer eat, loses health over time, and cannot enter the house.
      if (headless(zombie)) {
        zombie.vaultIn = 0; zombie.hasPole = false;
        zombie.eating = false;
        zombie.x += (zombie.hypnotized || zombie.backwards ? 1 : -1) * walkingSpeed(zombie) * speedFactor;
        if (this.random() < .2) zombie.health--;
        if (zombie.hypnotized || zombie.backwards ? zombie.x > 900 : zombie.x < 35) zombie.health = 0;
        continue;
      }
      if (zombie.vaultIn > 0) {
        const progress = Math.min(speedFactor, zombie.vaultIn);
        zombie.vaultIn -= progress; zombie.x -= (zombie.kind === 'dolphin' ? 150 / 120 : 150 / 168) * progress;
        if (zombie.vaultIn === 0) zombie.speed = .23 + this.random() * .14;
        continue;
      }
      if (zombie.kind === 'dolphin' && zombie.dolphin && zombie.x < 780) {
        const barrier = this.plants.filter(p => p.health > 0 && p.row === zombie.row && p.kind !== 'tanglekelp' && zombie.x - cellX(p.column) < 95 && zombie.x > cellX(p.column))
          .sort((a,b) => Number(b.kind === 'tallnut') - Number(a.kind === 'tallnut'))[0];
        if (barrier) {
          zombie.dolphin = false; zombie.eating = false;
          if (barrier.kind === 'tallnut') { zombie.x = cellX(barrier.column) + 32; zombie.speed = .3; }
          else zombie.vaultIn = 120;
        } else { zombie.x -= .9 * speedFactor; continue; }
      }
      if (zombie.kind === 'dancer' && this.updateDancer(zombie)) continue;
      if (!zombie.hypnotized && zombie.hasPole) {
        const barrier = this.plants.find(p => p.health > 0 && p.row === zombie.row && p.kind !== 'spikeweed'
          && !(p.kind === 'potatomine' && p.actionIn > 0) && zombie.x - cellX(p.column) < 95 && zombie.x - cellX(p.column) > 0);
        if (barrier) {
          zombie.hasPole = false; zombie.eating = false;
          if (barrier.kind === 'tallnut') { zombie.x = cellX(barrier.column) + 32; zombie.speed = .3; }
          else zombie.vaultIn = 168;
          continue;
        }
      }
      if (zombie.pogo && !headless(zombie)) {
        const tall=this.plants.find(p=>p.kind==='tallnut'&&p.health>0&&p.row===zombie.row&&zombie.x-cellX(p.column)>0&&zombie.x-cellX(p.column)<65);
        if(tall){zombie.pogo=false;zombie.speed=.3;}else{zombie.eating=false;zombie.x-=.45*speedFactor;continue;}
      }
      const rival = this.zombies.find(other => other !== zombie && !!other.hypnotized !== !!zombie.hypnotized
        && other.health > 0 && !this.flying(other) && !headless(other) && other.row === zombie.row && other.riseIn === 0 && other.vaultIn === 0
        && (other.x - zombie.x) * (zombie.hypnotized || zombie.backwards ? 1 : -1) >= -30 && (other.x - zombie.x) * (zombie.hypnotized || zombie.backwards ? 1 : -1) < 40);
      if (rival) {
        zombie.eating = true;
        if (--zombie.biteIn <= 0) { this.damageZombie(rival, 4, true); rival.hitAt = this.ticks; zombie.biteIn = zombie.chillIn > 0 ? 8 : 4; }
        continue;
      }
      const food = !zombie.hypnotized && [...this.plants].sort((a,b) => Number(b.kind==='pumpkin')-Number(a.kind==='pumpkin') || Number(['lilypad','flowerpot'].includes(a.kind))-Number(['lilypad','flowerpot'].includes(b.kind))).find(plant => plant.kind !== 'tanglekelp' && plant.kind !== 'spikeweed' && plant.health > 0 && plant.row === zombie.row
        && (zombie.x - cellX(plant.column))*(zombie.backwards?-1:1) < 35 && (zombie.x - cellX(plant.column))*(zombie.backwards?-1:1) > -30
        && !this.ladders.some(l=>l.column===plant.column&&l.row===plant.row) );
      zombie.eating = !!food;
      if (food) {
        if(zombie.kind==='ladder'&&zombie.shield>0&&['wallnut','tallnut','pumpkin'].includes(food.kind)){zombie.ladderIn=100;zombie.x=cellX(food.column)+35;continue;}
        if (--zombie.biteIn <= 0) {
          if (food.kind === 'hypnoshroom' && !this.sleeping(food)) {
            food.health = 0; zombie.hypnotized = true; zombie.speed = .17; zombie.eating = false;
            if (zombie.kind === 'dancer') for (const follower of this.zombies) if (follower.leader === zombie.id) { follower.hypnotized = true; follower.speed = .17; }
            this.events.push({ kind: 'hypnotize', x: zombie.x, y: this.rowY(zombie.row) - 50 });
          } else food.health -= 4;
          if(food.kind==='garlic'){const rows=this.config.rows.filter(r=>Math.abs(r-zombie.row)===1&&!this.waterRow(r));zombie.garlicRow=rows[Math.floor(this.random()*rows.length)];zombie.garlicIn=100;}
          zombie.biteIn = zombie.chillIn > 0 ? 8 : 4;
        }
      } else {
        if(this.dancerMoving(zombie)) zombie.x += (zombie.hypnotized || zombie.backwards ? 1 : -1) * walkingSpeed(zombie) * speedFactor;
        zombie.biteIn = 4;
      }
    }
    for (const plant of this.plants) if (plant.health <= 0 && plant.kelp) { const target = this.zombies.find(z => z.id === plant.kelp!.target); if (target) target.health = 0; }
    this.ladders=this.ladders.filter(l=>this.plants.some(p=>p.column===l.column&&p.row===l.row&&p.health>0));
    this.plants = this.plants.filter(plant => plant.health > 0);

    for (const pea of this.peas) {
      if(pea.lob){this.updateLob(pea);continue;}
      if(pea.star){this.updateStar(pea);continue;}
      const oldX = pea.x;
      pea.x += pea.vx === undefined ? 3.33 : pea.vx; pea.age++;
      if(this.config.environment==='roof'&&pea.originY!==undefined&&pea.originY>this.rowY(pea.row,pea.x)-20){pea.x=1000;continue;}
      if (!pea.puff && !pea.spike && !pea.fire) {
        const torch = this.plants.find(p => p.kind === 'torchwood' && p.row === pea.row && p.column !== pea.torch && oldX <= cellX(p.column) + 10 && pea.x >= cellX(p.column) - 10);
        if (torch) { pea.torch = torch.column; if (pea.ice) pea.ice = false; else pea.fire = true; }
      }
      if (pea.puff && !pea.longRange && pea.age >= 75) { pea.x = 1000; continue; }
      const target = this.zombies.filter(zombie => !zombie.hypnotized && !!pea.high === !!this.flying(zombie) && !this.submerged(zombie) && zombie.health > 0 && zombie.row === pea.row
        && zombie.vaultIn === 0 && zombie.riseIn === 0 && Math.min(oldX,pea.x) <= zombie.x + 18 && Math.max(oldX,pea.x) >= zombie.x - 18).sort((a, b) => a.x - b.x)[0];
      if (target) {
        const reachesBody = target.shield < 20;
        if (pea.high && target.flying) { target.flying = false; target.popIn = 50; }
        else if (pea.fire) {
          for (const z of this.zombies) if (!z.hypnotized && !this.flying(z) && !this.submerged(z) && z.health > 0 && z.row === pea.row && Math.abs(z.x - target.x) <= 50) {
            this.damageZombie(z, 40); z.chillIn = 0; z.frozenIn = 0;
          }
        } else this.damageZombie(target, 20);
        if (pea.ice && reachesBody && target.kind !== 'zomboni' && target.kind !== 'catapult' && !target.sled) target.chillIn = 1000;
        target.hitAt = this.ticks;
        this.events.push({ kind: 'hit', x: pea.x, y: this.rowY(pea.row) - 43 });
        pea.x = 1000;
      }
    }
    this.peas = this.peas.filter(pea => pea.x < 850 && pea.x > -60 && (pea.y===undefined || pea.y>-80&&pea.y<650));

    for (const nut of this.rollers) {
      nut.x += 3.3;
      if (nut.direction !== 0) {
        nut.y += nut.direction * 2;
        if (nut.y <= this.rowY(0)) nut.direction = 1;
        if (nut.y >= this.rowY(4)) nut.direction = -1;
        nut.row = Math.round((nut.y - this.rowY(0)) / 100);
      }
      const target = this.zombies.find(z => !z.hypnotized && z.health > 0 && z.row === nut.row && Math.abs(nut.y - this.rowY(z.row)) <= 2
        && Math.abs(z.x - nut.x) < 40 && !nut.hit.includes(z.id));
      if (target) {
        nut.hit.push(target.id);
        if (nut.kind === 'explodenut') {
          for (const z of this.zombies) if (Math.abs(z.row - nut.row) <= 1 && Math.abs(z.x - nut.x) <= 90) this.damageZombie(z, 1800, true);
          this.events.push({ kind: 'explode', x: nut.x, y: nut.y - 35 }); nut.x = 1000;
        } else {
          this.damageZombie(target, target.armor > 0 ? 900 : 1800); target.hitAt = this.ticks;
          nut.direction = nut.row === 0 ? 1 : nut.row === 4 ? -1 : nut.direction === 0 ? (this.random() < .5 ? -1 : 1) : -nut.direction;
          this.events.push({ kind: 'hit', x: nut.x, y: nut.y - 35 });
        }
      }
    }
    this.rollers = this.rollers.filter(nut => nut.x < 900);

    for (const sun of this.suns) {
      if (sun.y < sun.targetY) sun.y = Math.min(sun.targetY, sun.y + .65);
      else sun.expiresIn--;
    }
    this.suns = this.suns.filter(sun => sun.expiresIn > 0);

    for(const coin of this.coins){coin.y=Math.min(coin.targetY,coin.y+1.5);if(coin.y===coin.targetY)coin.expiresIn--;}
    this.coins=this.coins.filter(coin=>coin.expiresIn>0);
    for (const mower of this.mowers) {
      if (mower.state === 'ready' && this.zombies.some(zombie => !zombie.hypnotized && !this.flying(zombie) && !zombie.underground && !zombie.bungee && zombie.health > 0 && zombie.row === mower.row && zombie.x < 28)) {
        mower.state = 'moving';
        this.rowPicker.mowed(mower.row, this.wave);
        this.events.push({ kind: 'mower', x: mower.x, y: this.rowY(mower.row) });
      }
      if (mower.state === 'moving') {
        mower.x += 3.5;
        for (const zombie of this.zombies) if (!zombie.hypnotized && !this.flying(zombie) && !zombie.underground && !zombie.bungee && zombie.row === mower.row && Math.abs(zombie.x - mower.x) < 45) zombie.health = 0;
        if (mower.x > 890) mower.state = 'spent';
      }
    }
    if (this.config.mode === 'whack') for (const zombie of this.zombies) if (zombie.health <= 0) {
      const hit = Math.floor(this.random() * 30000), factor = portable.zombies[zombie.kind].value;
      const max = this.sun > 500 ? 2800 : this.sun > 350 ? 3100 : this.sun > 200 ? 3700 : 5000;
      if (hit >= 2500 * factor && hit <= max * factor) for (let i = 0; i < 3; i++) this.addSun(zombie.x - i * 20, this.rowY(zombie.row) - 60, this.rowY(zombie.row) - 15, 25);
    }
    this.kills += this.zombies.filter(zombie => !zombie.hypnotized && zombie.health <= 0).length;
    this.zombies = this.zombies.filter(zombie => zombie.health > 0 && !((zombie.hypnotized || zombie.backwards) && zombie.x > 900));
    if (this.zombies.some(zombie => !zombie.hypnotized && !zombie.underground && !zombie.backwards && zombie.x < -35)) {
      this.phase = 'lost';
      this.events.push({ kind: 'lose', x: 400, y: 300 });
      return;
    }

    if (this.config.mode === 'lawn' && !isNight(this.config.environment) && --this.sunIn <= 0) {
      const row = this.config.rows[Math.floor(this.random() * this.config.rows.length)];
      this.addSun(100 + this.random() * 549, 70, this.rowY(row) - 30, 25);
      this.sunsFallen++;
      this.sunIn = Math.min(950, 425 + this.sunsFallen * 10) + Math.floor(this.random() * 275);
    }
    if (this.autoCollectSun) for (const sun of [...this.suns]) if (sun.y >= sun.targetY) this.collectSun(sun.id);

    if (this.config.mode === 'vase') {
      if (this.vases.length === 0 && !this.zombies.some(z => !z.hypnotized)) {
        this.cancelSelection(); this.phase = this.vaseStage === 2 ? 'won' : 'intermission';
        if (this.phase === 'won') this.events.push({ kind: 'win', x: 400, y: 300 });
      }
      return;
    }

    if (this.graveWaveIn > 0 && --this.graveWaveIn === 0) {
      if(this.config.environment==='roof')for(let i=0;i<(this.level<43?2:3);i++)this.dropFromSky(this.random()<.5?'normal':'cone',this.config.rows[Math.floor(this.random()*5)],this.wave-1);
      if (isPool(this.config.environment) && this.poolFrozenIn === 0) {
        const cells = [2,3].flatMap(row => [5,6,7,8].map(column => ({row,column})));
        const count = this.scenario === 'endless' ? 3 : this.level <= 22 ? 2 : 3;
        for (let i=0;i<count;i++) {
          const cell = cells.splice(Math.floor(this.random()*cells.length),1)[0];
          const z = this.spawnZombie(this.random()<.5?'normal':'cone',cell.row,cellX(cell.column)-35,this.wave-1); z.riseIn=50;
        }
      }
      for (const grave of this.graves) {
        const kind = portable.zombies.cone.allowedLevels[this.level - 1] && this.random() < .5 ? 'cone' : 'normal';
        const zombie = this.spawnZombie(kind, grave.row, cellX(grave.column) - 35, this.wave - 1);
        zombie.riseIn = 150;
      }
    }
    if (this.config.mode === 'whack') {
      this.updateWhack();
      if (this.whackFinalSpawned && this.zombies.length === 0) { this.phase = 'won'; this.events.push({ kind: 'win', x: 400, y: 300 }); }
      return;
    }
    if (this.wave < this.config.waveCount) {
      this.waveElapsed++;
      const remaining = this.zombies.filter(zombie => !zombie.hypnotized && zombie.wave === this.wave - 1 && !headless(zombie)).reduce((sum, zombie) => sum + zombie.health + zombie.armor + zombie.shield, 0);
      if (this.flagWarningIn > 0) {
        if (--this.flagWarningIn === 0) this.spawnWave();
        return;
      }
      if (this.wave > 0 && this.waveElapsed > 400 && this.waveIn > 200 && remaining <= this.waveThreshold) this.waveIn = 200;
      this.waveIn--;
      if (this.waveIn === 5 && this.isFlagWave(this.wave)) {
        this.flagWarningIn = 750;
        this.events.push({ kind: 'flag', x: 400, y: 280 });
      } else if (this.waveIn === 0) this.spawnWave();
    } else if (!this.zombies.some(z => !z.hypnotized) && this.graveWaveIn === 0) {
      if (this.scenario === 'endless') {
        this.cancelSelection(); this.phase = 'intermission';
      } else {
        this.phase = 'won';
        this.events.push({ kind: 'win', x: 400, y: 300 });
      }
    }
  }

  private nextConveyorSeed(): PlantKind {
    if (this.config.mode === 'bowling') return this.random() < .85 ? 'wallnut' : 'explodenut';
    // Challenge::UpdateConveyor: reduce repeats and cards piling up on the belt.
    const choices = (this.level === 45 ? portable.conveyorFortyFive : this.level === 40 ? portable.conveyorForty : this.level === 30 ? portable.conveyorThirty : this.level === 25 ? portable.conveyorTwentyFive : this.level === 20 ? portable.conveyorTwenty : portable.conveyorTen).map(({ kind, weight }) => {
      const count = this.conveyor.filter(packet => packet.kind === kind).length;
      // Challenge.cpp:1630–1636: fewer bases once the new special boards are filled.
      if (this.level === 45 && kind === 'flowerpot' || this.level === 40 && kind === 'lilypad') {
        const total = count + this.plants.filter(p => p.kind === kind).length;
        weight = Math.trunc(weight + (1 - weight) * Math.min(1, total / (kind === 'flowerpot' ? 35 : 18)));
      }
      return { kind: kind as PlantKind, weight: count >= 4 ? 1 : count >= 3 ? 5 : kind === this.lastConveyorSeed ? Math.trunc(weight / 2) : weight };
    });
    let pick = Math.floor(this.random() * choices.reduce((sum, choice) => sum + choice.weight, 0));
    let index = 0;
    while (pick >= choices[index].weight) pick -= choices[index++].weight;
    this.lastConveyorSeed = choices[index].kind;
    return this.lastConveyorSeed;
  }

  whack(x: number, y: number) {
    if (this.phase !== 'playing' || this.config.mode !== 'whack' || this.selected || this.digging) return;
    // Hammer circle against the port's body rectangle, topmost row drawn last.
    const target = this.zombies.filter(z => z.health > 0 && !headless(z)
      && Math.hypot(Math.max(0, Math.abs(x - z.x) - 24), Math.max(0, Math.abs(y - 20 - (this.rowY(z.row) - 60)) - 55)) <= 45)
      .sort((a, b) => b.row - a.row || b.id - a.id)[0];
    this.events.push({ kind: 'whack', x, y });
    if (target) {
      if (target.armor > 0) target.armor = Math.max(0, target.armor - 900);
      else target.health = 0;
      target.hitAt = this.ticks;
    }
  }

  private addWhackGraves(count: number) {
    const places = this.config.rows.flatMap(row => Array.from({ length: 6 }, (_, i) => ({ row, column: i + 3 })))
      .filter(p => !this.graves.some(g => g.row === p.row && g.column === p.column));
    for (let i = 0; i < count && places.length; i++) {
      const weights = places.map(p => this.plants.some(plant => plant.row === p.row && plant.column === p.column) ? 1 : 100000);
      let pick = this.random() * weights.reduce((sum, weight) => sum + weight, 0), index = 0;
      while (pick >= weights[index]) pick -= weights[index++];
      const place = places.splice(index, 1)[0];
      this.plants = this.plants.filter(p => p.row !== place.row || p.column !== place.column);
      this.graves.push({ id: ++this.id, ...place });
    }
  }

  private updateWhack() {
    // Challenge::WhackAZombieSpawning: 200-tick intro, 2000-tick rounds,
    // then a delayed final group. Ordinary adventure wave lists are unused.
    if (this.whackFinalSpawned) return;
    this.waveIn--;
    if (this.waveIn === 100 && this.wave > 0) this.addWhackGraves(Math.max(1, 5 - this.graves.length));
    if (this.waveIn === 5 && this.wave === this.config.waveCount - 1) this.events.push({ kind: 'flag', x: 400, y: 280 });
    if (this.waveIn === 0) {
      this.waveIn = 2000; this.wave++;
      this.whackSpawnIn = this.wave === this.config.waveCount ? 300 : 1;
      this.events.push({ kind: 'wave', x: 400, y: 280 });
    } else if (this.waveIn < 300) return;
    if (--this.whackSpawnIn !== 0) return;
    const phase = Math.max(0, Math.min(5, Math.floor((this.wave - 1) * 6 / 12)));
    const doubles = [0, 30, 10, 10, 15, 18], triples = [0, 0, 0, 0, 10, 13];
    const pails = [0, 0, 0, 10, 15, 15], cones = [0, 0, 30, 30, 30, 30];
    const groupRoll = Math.floor(this.random() * 100), typeRoll = Math.floor(this.random() * 100);
    const final = this.wave === this.config.waveCount;
    const count = final ? 20 : groupRoll < triples[phase] ? 3 : groupRoll < triples[phase] + doubles[phase] ? 2 : 1;
    const kind: ZombieKind = typeRoll < pails[phase] && count < 3 ? 'bucket' : typeRoll < pails[phase] + cones[phase] ? 'cone' : 'normal';
    const graves = this.graves.filter(g => !this.plants.some(p => p.kind === 'gravebuster' && p.row === g.row && p.column === g.column));
    const maxSpeed = final ? 2 : Math.round(1 + 2 * ((this.wave - 1) / 11) ** 2);
    for (let i = 0; i < count && graves.length; i++) {
      const grave = graves.splice(Math.floor(this.random() * graves.length), 1)[0];
      const zombie = this.spawnZombie(final ? this.random() < .5 ? 'cone' : 'bucket' : kind, grave.row, cellX(grave.column) - 35, this.wave - 1);
      zombie.riseIn = 50; zombie.speed = .5 + this.random() * (maxSpeed - .5);
    }
    const min = Math.round(100 - (this.wave - 1) * 70 / 11), max = Math.round(200 - (this.wave - 1) * 140 / 11);
    this.whackSpawnIn = min + Math.floor(this.random() * (max - min + 1));
    if (final) { this.whackFinalSpawned = true; this.waveIn = 0; this.whackSpawnIn = 0; }
  }

  private updateZomboni(z: Zombie) {
    if (z.health <= 200) { z.health = 0; return; }
    z.speed = .05 + .2 * Math.max(0, Math.min(1, (z.x - 30 - 300) / 400));
    z.x -= z.speed; z.eating = false;
    const x = Math.max(25, z.x + 88);
    if (x < 800) {
      const ice = this.iceTrails.find(ice => ice.row === z.row);
      if (ice) { ice.x = Math.min(ice.x, x); ice.remaining = 3000; }
      else this.iceTrails.push({ row: z.row, x, remaining: 3000 });
    }
    for (const plant of this.plants) if (plant.health > 0 && plant.row === z.row && Math.abs(cellX(plant.column) - z.x) < 55) {
      plant.health = 0;
      if (plant.kind === 'spikeweed') { z.health = 0; this.events.push({ kind: 'hit', x: z.x, y: this.rowY(z.row) }); break; }
    }
  }

  private crashSled(id: number) {
    for (const z of this.zombies) if (z.sled === id) { z.sled = undefined; z.sledLeader = undefined; z.armor = 0; z.crashIn = 150; z.speed = .23 + this.random() * .14; }
  }

  private updateSled(z: Zombie) {
    if (z.crashIn) { z.crashIn--; return; }
    const leader = z.sledLeader ? this.zombies.find(other => other.id === z.sledLeader && other.health > 0) : z;
    const ice = this.iceTrails.find(trail => trail.row === z.row);
    if (!leader || !ice || leader.x < ice.x || leader.armor === 0) { this.crashSled(z.sled!); return; }
    z.x -= .6; ice.remaining = Math.max(ice.remaining, 500);
    for (const plant of this.plants) if (plant.health > 0 && plant.row === z.row && Math.abs(cellX(plant.column) - z.x) < 45) {
      plant.health = 0;
      if (plant.kind === 'spikeweed') { this.crashSled(z.sled!); break; }
    }
  }

  private updateJack(z: Zombie) {
    if (--z.jackIn! > 0) return !!z.jackOpening;
    if (!z.jackOpening) { z.jackOpening = true; z.jackIn = 110; z.eating = false; return true; }
    for (const plant of this.plants) if (!z.hypnotized && Math.hypot(cellX(plant.column) - z.x, this.rowY(plant.row, cellX(plant.column)) - this.rowY(z.row)) < 90) plant.health = 0;
    for (const other of this.zombies) if (!!other.hypnotized !== !!z.hypnotized && Math.abs(other.row - z.row) <= 1 && Math.abs(other.x - z.x) < 115) this.damageZombie(other, 1800, true);
    if (this.config.mode === 'vase') for (const vase of [...this.vases]) if (Math.abs(vase.column - Math.floor((z.x - BOARD.left) / 80)) <= 1 && Math.abs(vase.row - z.row) <= 1) this.breakVase(vase);
    z.health = 0; this.events.push({ kind: 'explode', x: z.x, y: this.rowY(z.row) - 35 }); return true;
  }

  private updateKelp(plant: Plant) {
    if (!plant.kelp) {
      const target = this.zombies.find(z => !z.hypnotized && !this.flying(z) && z.vaultIn === 0 && !headless(z) && z.health > 0 && z.row === plant.row
        && z.x > 90 && z.x < 780 && z.riseIn === 0 && Math.abs(z.x - cellX(plant.column)) < 60
        && !this.plants.some(p => p.kelp?.target === z.id));
      if (target) plant.kelp = { target: target.id, remaining: 100 };
    } else if (--plant.kelp.remaining === 0 || plant.health <= 0) {
      const target = this.zombies.find(z => z.id === plant.kelp!.target);
      if (target) target.health = 0;
      plant.health = 0;
    }
  }

  private updateSquash(plant: Plant) {
    const target = () => this.zombies.filter(z => !z.hypnotized && !this.flying(z) && !z.flight && !z.landingIn && z.health>0 && !headless(z) && z.row===plant.row && z.riseIn===0 && z.vaultIn===0 && Math.abs(z.x-cellX(plant.column))<100).sort((a,b)=>Math.abs(a.x-cellX(plant.column))-Math.abs(b.x-cellX(plant.column)))[0];
    if (!plant.squash) { const z=target(); if(z) plant.squash={remaining:185,x:z.x,target:z.id}; return; }
    plant.squash.remaining--;
    if (plant.squash.remaining===60) { const z=this.zombies.find(z=>z.id===plant.squash!.target); if(z) plant.squash.x=z.x-30*walkingSpeed(z); }
    if (plant.squash.remaining===0) {
      for (const z of this.zombies) if(!z.hypnotized&&!this.flying(z)&&!z.flight&&!z.landingIn&&z.row===plant.row&&Math.abs(z.x-plant.squash.x)<65&&z.vaultIn===0) this.damageZombie(z,1800,true);
      plant.health=0; this.events.push({kind:'hit',x:plant.squash.x,y:this.rowY(plant.row, cellX(plant.column))});
    }
  }
  private updateDancer(z: Zombie) {
    if (z.eating) return false;
    const positions = [{row:z.row-1,x:z.x},{row:z.row+1,x:z.x},{row:z.row,x:z.x-100},{row:z.row,x:z.x+100}];
    const missing = positions.map((p,slot)=>({...p,slot})).filter(p=>this.config.rows.includes(p.row)&&!this.waterRow(p.row)&&!this.zombies.some(other=>other.leader===z.id&&other.slot===p.slot&&other.health>0));
    if(z.dancePhase==='intro') {
      if(--z.danceIn! === 0){z.dancePhase='point';z.danceIn=38;}
      return false;
    }
    if(z.dancePhase==='point') {
      if(--z.danceIn! === 0){
        for(const p of missing){const follower=this.spawnZombie('backup',p.row,p.x,z.wave);follower.riseIn=150;follower.leader=z.id;follower.slot=p.slot;follower.hypnotized=z.hypnotized;}
        z.dancePhase='hold';z.danceIn=200;
      }
      return true;
    }
    if(z.dancePhase==='hold'){if(--z.danceIn! === 0)z.dancePhase='dance';return true;}
    if(missing.length){
      if(z.summonIn===0)z.summonIn=100;
      else if(z.summonIn!>1)z.summonIn! --;
      else if(Math.floor(this.ticks/20)%23===12&&z.x<730){z.dancePhase='point';z.danceIn=38;z.summonIn=0;return true;}
    }
    return false;
  }
  private dancerMoving(z: Zombie) {
    if(z.kind!=='dancer'&&z.kind!=='backup')return true;
    if(z.dancePhase==='intro')return true;
    if(Math.floor(this.ticks/20)%23>11)return false;
    const leader=z.kind==='dancer'?z:this.zombies.find(other=>other.id===z.leader);
    return !this.zombies.some(other=>(other===leader||leader&&other.leader===leader.id)&&(other.eating||(other.frozenIn!==undefined&&other.frozenIn>0)));
  }

  private damageZombie(zombie: Zombie, damage: number, bypassShield = false) {
    if (!bypassShield && zombie.shield > 0) {
      const absorbed = Math.min(zombie.shield, damage);
      zombie.shield -= absorbed; damage -= absorbed;
      if (zombie.kind === 'ladder' && zombie.shield === 0) { zombie.ladderIn = 0; zombie.speed = .3; }
      if (zombie.kind === 'newspaper' && zombie.shield === 0) { zombie.rageIn = 150; zombie.eating = false; }
    }
    const absorbed = Math.min(zombie.armor, damage);
    zombie.armor -= absorbed;
    zombie.health -= damage - absorbed;
  }

  private firePea(plant: Plant, force = false) {
    const x = cellX(plant.column);
    const range = plant.kind === 'puffshroom' || plant.kind === 'seashroom' ? 250 : plant.kind === 'fumeshroom' ? 360 : 825 - x;
    if (plant.kind === 'cactus') plant.tall = this.zombies.some(z => !z.hypnotized && z.flying && z.health > 0 && z.row === plant.row && z.x > x - 10 && z.x < 825);
    const targets = this.zombies.filter(z => !z.hypnotized && !!this.flying(z) === !!plant.tall && !z.underground && !z.emergingIn && (!this.submerged(z) || z.kind==='snorkel'&&plant.kind === 'fumeshroom') && z.health > 0 && z.row === plant.row && z.riseIn === 0 && z.x > x - 10 && z.x < x + range);
    if (targets.length || force) {
      if (plant.kind === 'fumeshroom') {
        for (const zombie of targets) if (zombie.vaultIn === 0 && zombie.riseIn === 0) { this.damageZombie(zombie, 20, true); zombie.hitAt = this.ticks; }
        this.events.push({ kind: 'fume', x: x + 25, y: this.rowY(plant.row, cellX(plant.column)) - 45, row: plant.row });
      } else {
        this.peas.push({ id: ++this.id, row: plant.row, x: x + 27, ice: plant.kind === 'snowpea', puff: ['puffshroom','scaredyshroom','seashroom'].includes(plant.kind), longRange: plant.kind === 'scaredyshroom', spike: plant.kind === 'cactus', high: plant.tall, age: 0, originY:this.rowY(plant.row,cellX(plant.column))-43 });
        this.events.push({ kind: 'shoot', x: x + 27, y: this.rowY(plant.row, cellX(plant.column)) - 43 });
      }
      plant.shotAt = this.ticks;
    }
  }

  private updateChomper(plant: Plant) {
    const state = plant.chomp!;
    const target = () => this.zombies.filter(z => !z.hypnotized && !this.flying(z) && !z.flight && !z.landingIn && !z.underground && (!z.bungee||z.bungee.phase==='wait') && z.health > 0 && z.riseIn === 0 && z.row === plant.row
      && z.x - cellX(plant.column) >= -10 && z.x - cellX(plant.column) <= 100).sort((a, b) => a.x - b.x)[0];
    if (state.phase === 'ready') {
      if (target()) { state.phase = 'bite'; state.remaining = 70; }
    } else if (--state.remaining === 0) {
      if (state.phase === 'bite') {
        const zombie = target();
        if (zombie && ['zomboni','catapult','gargantuar'].includes(zombie.kind)) { this.damageZombie(zombie, 40, true); state.phase = 'recover'; state.remaining = 30; }
        else if (zombie && !zombie.hasPole && zombie.vaultIn === 0) {
          zombie.health = 0;
          this.events.push({ kind: 'swallow', zombieId: zombie.id, x: cellX(plant.column), y: this.rowY(plant.row, cellX(plant.column)) });
          state.phase = 'digest'; state.remaining = 4000;
        } else { state.phase = 'recover'; state.remaining = 30; }
      } else { state.phase = 'ready'; }
    }
  }

  drainEvents() { return this.events.splice(0); }
  collectCoin(id: number) {
    if(this.phase!=='playing')return;
    const index=this.coins.findIndex(coin=>coin.id===id);
    if(index===-1)return;
    const [coin]=this.coins.splice(index,1);this.money+=coin.value;
    this.events.push({kind:'coin',x:coin.x,y:coin.y,value:coin.value});
  }
  private findUmbrella(column: number,row: number) {
    return this.plants.find(p=>p.kind==='umbrella'&&p.health>0&&Math.abs(p.column-column)<=1&&Math.abs(p.row-row)<=1);
  }
  // Zombie::FindCatapultTarget / UpdateZombieCatapult: leftmost plant, 20 balls,
  // 300-tick firing cycles; 32-pose anim_shoot at 24 fps releases at 0.545.
  private updateCatapult(z: Zombie) {
    const state=z.catapult!;
    const target=()=>this.plants.filter(p=>p.health>0&&p.row===z.row&&cellX(p.column)<z.x-100)
      .sort((a,b)=>a.column-b.column||Number(a.kind==='flowerpot')-Number(b.kind==='flowerpot')||Number(a.kind==='pumpkin')-Number(b.kind==='pumpkin'))[0];
    if(state.phase==='walk'){
      z.eating=false;
      if(z.x<=650&&state.ammo>0&&target()){state.phase='shoot';state.remaining=300;}
      else {z.x-=z.speed;for(const p of this.plants)if(p.row===z.row&&Math.abs(cellX(p.column)-z.x)<40)p.health=0;}
      return;
    }
    state.remaining--;
    if(state.phase==='shoot'&&state.remaining===230){
      const p=target();
      if(p){const x=z.x+65,endX=cellX(p.column);this.peas.push({id:++this.id,row:z.row,x,y:this.rowY(z.row,x)-110,age:0,ice:false,puff:false,lob:{kind:'basketball',target:p.id,startX:x,endX,startY:this.rowY(z.row,x)-110,endY:this.rowY(z.row,endX)-45,duration:120}});}
    }
    if(state.phase==='shoot'&&state.remaining===171){state.ammo--;state.phase='reload';}
    if(state.remaining===0){state.phase=state.ammo>0&&target()?'shoot':'walk';if(state.phase==='shoot')state.remaining=300;}
  }
  // Giant smash/throw use 33/34-pose source clips at 24 fps. The Web port uses
  // a deterministic arc for the thrown imp; roof landing distance follows source.
  private updateGiant(z: Zombie,speedFactor: number) {
    const state=z.giant!;
    const food=()=>this.plants.find(p=>p.health>0&&p.row===z.row&&z.x-cellX(p.column)<55&&z.x-cellX(p.column)>-30);
    if(state.phase==='walk'){
      z.eating=false;
      if(!state.thrown&&z.health<1500&&z.x>400){state.phase='throw';state.remaining=138;}
      else if(food()){state.phase='smash';state.remaining=134;}
      else z.x-=walkingSpeed(z)*speedFactor;
      return;
    }
    const before=state.remaining;state.remaining=Math.max(0,state.remaining-speedFactor);
    if(state.phase==='smash'&&before>48&&state.remaining<=48){
      const p=food();if(p)for(const victim of this.plants)if(victim.column===p.column&&victim.row===p.row)victim.health=0;
      this.events.push({kind:'hit',x:z.x,y:this.rowY(z.row,z.x)});
    }
    if(state.phase==='throw'&&before>36&&state.remaining<=36){
      state.thrown=true;
      let distance=z.x-360-(this.config.environment==='roof'?180:0);
      distance=Math.max(this.config.environment==='roof'?-140:40,distance);
      if(distance>140)distance-=this.random()*100;
      const imp=this.spawnZombie('imp',z.row,z.x-133,z.wave);
      const duration=Math.max(30,Math.round(Math.abs(distance)/3));
      imp.flight={startX:imp.x,endX:imp.x-distance,duration,remaining:duration};
    }
    if(state.remaining===0)state.phase='walk';
  }

  private fireRear(plant: Plant) {
    const x=cellX(plant.column);
    if(!this.zombies.some(z=>!z.hypnotized&&!this.flying(z)&&!this.submerged(z)&&z.health>0&&z.row===plant.row&&z.x<x))return;
    this.peas.push({id:++this.id,row:plant.row,x:x-25,vx:-3.33,ice:false,puff:false,age:0,originY:this.rowY(plant.row,x)-43});plant.shotAt=this.ticks;
    this.events.push({kind:'shoot',x,y:this.rowY(plant.row,x)-43});
  }
  private fireStars(plant: Plant) {
    if(!this.zombies.some(z=>!z.hypnotized&&!this.flying(z)&&!this.submerged(z)&&z.health>0&&z.x<825))return;
    for(const [vx,vy] of [[-3.33,0],[0,-3.33],[0,3.33],[2.35,-2.35],[2.35,2.35]])this.peas.push({id:++this.id,row:plant.row,x:cellX(plant.column),y:this.rowY(plant.row,cellX(plant.column))-35,vx,vy,star:true,ice:false,puff:false,age:0});
    plant.shotAt=this.ticks;this.events.push({kind:'shoot',x:cellX(plant.column),y:this.rowY(plant.row,cellX(plant.column))});
  }
  private updateStar(pea: Pea) {
    pea.x+=pea.vx!;pea.y!+=pea.vy!;pea.age++;
    const target=this.zombies.find(z=>!z.hypnotized&&!this.flying(z)&&!this.submerged(z)&&z.health>0&&Math.abs(z.x-pea.x)<22&&Math.abs(this.rowY(z.row,z.x)-43-pea.y!)<32);
    if(target){this.damageZombie(target,20);target.hitAt=this.ticks;pea.x=1000;}
  }
  private fireLob(plant: Plant) {
    const x=cellX(plant.column), target=this.zombies.filter(z=>!z.hypnotized&&!this.flying(z)&&!z.flight&&!z.landingIn&&!z.underground&&!z.emergingIn&&(!z.bungee||z.bungee.phase==='wait')&&z.health>0&&z.row===plant.row&&z.x>x-10&&z.x<825).sort((a,b)=>a.x-b.x)[0];
    if(!target)return;
    const kind=plant.kind==='melonpult'?'melon':plant.kind==='cabbagepult'?'cabbage':this.random()<.25?'butter':'kernel';
    const duration=100,endX=target.x-(target.eating||target.bungee||target.giant&&target.giant.phase!=='walk'||target.catapult&&target.catapult.phase!=='walk'?0:walkingSpeed(target)*duration);
    this.peas.push({id:++this.id,row:plant.row,x,y:this.rowY(plant.row,x)-60,age:0,ice:false,puff:false,lob:{kind,target:target.id,startX:x,endX,startY:this.rowY(plant.row,x)-60,endY:this.rowY(plant.row,endX)-55,duration}});
    plant.shotAt=this.ticks;this.events.push({kind:'shoot',x,y:this.rowY(plant.row,x)-60});
  }
  private updateLob(pea: Pea) {
    const shot=pea.lob!,t=++pea.age/shot.duration;
    pea.x=shot.startX+(shot.endX-shot.startX)*t;pea.y=shot.startY+(shot.endY-shot.startY)*t-Math.sin(t*Math.PI)*150;
    if(t<1)return;
    if(shot.kind==='basketball'){
      const victim=this.plants.find(p=>p.id===shot.target&&p.health>0);
      if(victim){const umbrella=this.findUmbrella(victim.column,victim.row);if(umbrella)umbrella.shotAt=this.ticks;else victim.health-=75;}
      pea.x=1000;return;
    }
    const target=this.zombies.find(z=>z.id===shot.target&&z.health>0&&!z.underground&&(!z.bungee||z.bungee.phase==='wait')&&Math.abs(z.x-shot.endX)<65);
    if(target){
      if(shot.kind==='melon'){
        const nearby=this.zombies.filter(z=>z!==target&&!z.hypnotized&&!this.flying(z)&&!this.submerged(z)&&z.health>0&&Math.abs(z.row-target.row)<=1&&Math.abs(z.x-target.x)<=80);
        const splash=nearby.length*26>560?Math.max(1,Math.trunc(80*560/(nearby.length*26*3))):26;
        for(const z of [target,...nearby]){const damage=z===target?80:splash;if(z.shield>0)this.damageZombie(z,Math.min(z.shield,damage));this.damageZombie(z,damage,true);z.hitAt=this.ticks;}
      }else{this.damageZombie(target,shot.kind==='kernel'?20:40,true);target.hitAt=this.ticks;if(shot.kind==='butter'&&target.kind!=='catapult'&&target.kind!=='zomboni')target.butterIn=400;}
    }
    pea.x=1000;
  }
  private updateMagnet(plant: Plant) {
    if(plant.actionIn>0){plant.actionIn--;return;}
    const candidates=this.zombies.filter(z=>!z.hypnotized&&!headless(z)&&z.health>0&&Math.abs(z.row-plant.row)<=2&&Math.hypot(z.x-cellX(plant.column),(z.row-plant.row)*this.cellHeight)<(z.eating?320:270)&&
      ((['bucket','football'].includes(z.kind)&&z.armor>0)||(['door','ladder'].includes(z.kind)&&z.shield>0)||z.pogo||z.kind==='digger'&&!z.metalRemoved||z.kind==='jack'&&!z.metalRemoved&&!z.jackOpening)).sort((a,b)=>Math.abs(a.x-cellX(plant.column))-Math.abs(b.x-cellX(plant.column)));
    const z=candidates[0];
    if(z){if(['bucket','football'].includes(z.kind))z.armor=0;else if(['door','ladder'].includes(z.kind)){z.shield=0;z.ladderIn=0;z.speed=.3;}else if(z.kind==='pogo'){z.pogo=false;z.speed=.3;}else if(z.kind==='digger'&&z.underground){z.underground=false;z.emergingIn=330;z.backwards=false;z.speed=.3;}z.metalRemoved=true;plant.actionIn=1500;plant.shotAt=this.ticks;return;}
    const ladder=this.ladders.find(l=>Math.abs(l.row-plant.row)<=2&&Math.hypot((l.column-plant.column)*80,(l.row-plant.row)*this.cellHeight)<270);
    if(ladder){this.ladders=this.ladders.filter(l=>l!==ladder);plant.actionIn=1500;plant.shotAt=this.ticks;}
  }
  private dropFromSky(kind: ZombieKind,row: number,wave: number) {
    const column=4+Math.floor(this.random()*5);
    const z=this.spawnZombie('bungee',row,cellX(column),wave);
    z.row=row;z.x=cellX(column);z.bungee={phase:'down',remaining:375,column,drop:kind};
  }
  private updateBungee(z: Zombie) {
    const state=z.bungee!;
    if(--state.remaining>0)return;
    if(state.phase==='down'){
      const umbrella=this.findUmbrella(state.column,z.row);
      if(umbrella){umbrella.shotAt=this.ticks;state.phase='up';state.remaining=100;return;}
      if(state.drop){this.spawnZombie(state.drop,z.row,z.x,z.wave);state.phase='up';state.remaining=100;}
      else{state.phase='wait';state.remaining=300;}
    }else if(state.phase==='wait'){
      const occupants=this.plants.filter(p=>p.column===state.column&&p.row===z.row);
      const victim=occupants.find(p=>p.kind!=='pumpkin'&&p.kind!=='flowerpot'&&p.kind!=='lilypad')||occupants.find(p=>p.kind==='pumpkin')||occupants[0];
      if(victim)victim.health=0;
      state.phase='up';state.remaining=100;
    }else this.zombies=this.zombies.filter(other=>other!==z);
  }

}
