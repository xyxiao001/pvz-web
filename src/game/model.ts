import { BOARD, cellX, endlessConfig, isPool, isNight, MUSHROOMS, LEVELS, PLANTS, type SurvivalScene, type LevelId, type PlantKind, type ZombieKind } from './config';
import { generateSurvivalWaves, isSurvivalFlagWave, survivalRoster } from './survival';
import { generateWaves, isFlagWave } from './waves';
import { RowPicker } from './row-picker';
import { walkingSpeed } from './zombie-motion';
import portable from './data/portable-adventure.json';

export type Phase = 'ready' | 'playing' | 'paused' | 'intermission' | 'won' | 'lost';
export interface Plant { id: number; kind: PlantKind; row: number; column: number; health: number; actionIn: number; born: number; shotAt: number; scared?: boolean; kelp?: { target: number; remaining: number }; squash?: { remaining: number; x: number; target: number };
  chomp?: { phase: 'ready' | 'bite' | 'digest' | 'recover'; remaining: number } }
export const headless = (zombie: Zombie) => zombie.health < Math.trunc((zombie.kind === 'pole' || zombie.kind === 'dancer' ? 500 : 270) / (zombie.mini ? 4 : 1)) / 3;
export interface Roller { id: number; kind: 'wallnut' | 'explodenut'; row: number; x: number; y: number; direction: number; hit: number[] }
export interface Packet { id: number; kind: PlantKind; x: number }
export interface Zombie { id: number; kind: ZombieKind; armor: number; row: number; x: number; health: number; speed: number; biteIn: number; eating: boolean; wave: number; hitAt: number; chillIn: number; hasPole: boolean; vaultIn: number; animationTime: number; shield: number; rageIn: number; riseIn: number; hypnotized?: boolean; mini?: boolean; frozenIn?: number; summonIn?: number; dancePhase?: 'intro' | 'point' | 'hold' | 'dance'; danceIn?: number; leader?: number; slot?: number }
export interface Pea { id: number; row: number; x: number; ice: boolean; puff: boolean; age: number; longRange?: boolean }
export interface Sun { id: number; x: number; y: number; targetY: number; expiresIn: number; born: number; value: number }
export interface Mower { row: number; x: number; state: 'ready' | 'moving' | 'spent' }
export type GameEvent = { kind: 'plant' | 'shoot' | 'hit' | 'mower' | 'wave' | 'win' | 'lose' | 'explode' | 'flag' | 'whack' | 'hypnotize' | 'freeze'; x: number; y: number }
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
  mowers: Mower[];
  graves: { id: number; row: number; column: number }[] = [];
  private graveWaveIn = 0;
  craters: { id: number; row: number; column: number; remaining: number }[] = [];
  private poolFrozenIn = 0;
  cooldowns: Record<PlantKind, number> = { tanglekelp: 0, peashooter: 0, sunflower: 0, cherrybomb: 0, wallnut: 0, potatomine: 0, snowpea: 0, explodenut: 0, chomper: 0, repeater: 0, puffshroom: 0, sunshroom: 0, fumeshroom: 0, gravebuster: 0, hypnoshroom: 0, scaredyshroom: 0, iceshroom: 0, doomshroom: 0, lilypad: 0, squash: 0, threepeater: 0, plantern: 0 };
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
    if (this.config.environment === 'night' && this.config.mode !== 'whack') {
      const columns = scenario === 'endless' ? [[4,1],[5,1],[6,2],[7,2],[8,3]] : portable.graveColumns[level - 1];
      for (const [column, count] of columns) {
        const rows = [...this.config.rows];
        for (let i = 0; i < count; i++) this.graves.push({ id: ++this.id, column, row: rows.splice(Math.floor(this.random() * rows.length), 1)[0] });
      }
    }
    this.mowers = this.config.rows.map(row => ({ row, x: 20, state: 'ready' }));
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
  get cellHeight() { return isPool(this.config.environment) ? 85 : 100; }
  rowY(row: number) { return BOARD.top + row * this.cellHeight + (isPool(this.config.environment) ? 68 : 78); }
  rowAt(y: number) { return Math.floor((y - BOARD.top) / this.cellHeight); }
  waterRow(row: number) { return isPool(this.config.environment) && (row === 2 || row === 3); }
  sleeping(plant: Plant) { return !isNight(this.config.environment) && MUSHROOMS.includes(plant.kind); }
  submerged(z: Zombie) { return z.kind === 'snorkel' && this.waterRow(z.row) && z.x > 100 && z.x < 770 && !z.eating; }

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
    if (this.phase !== 'playing' || this.hasConveyor || !this.seeds.includes(kind)) return;
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

  cancelSelection() { this.selected = null; this.selectedPacket = null; this.digging = false; }
  toggleShovel() {
    if (this.phase !== 'playing' || this.scenario === 'adventure' && this.level < 6) return;
    this.digging = !this.digging; this.selected = null; this.selectedPacket = null;
  }
  dig(column: number, row: number) {
    if (this.phase !== 'playing' || !this.digging) return;
    const occupants = this.plants.filter(plant => plant.column === column && plant.row === row);
    const target = occupants.find(plant => plant.kind !== 'lilypad') || occupants[0];
    if (target?.kelp) { const caught = this.zombies.find(z => z.id === target.kelp!.target); if (caught) caught.health = 0; }
    this.plants = this.plants.filter(plant => plant !== target);
    this.digging = false;
  }

  canPlant(kind: PlantKind, column: number, row: number) {
    if (this.phase !== 'playing' || !this.seeds.includes(kind)
      || !this.config.rows.includes(row) || !(column >= 0 && column < BOARD.columns)) return false;
    if (this.craters.some(c => c.column === column && c.row === row)) return false;
    const occupants = this.plants.filter(p => p.column === column && p.row === row);
    if ((kind === 'lilypad' || kind === 'tanglekelp') && (!this.waterRow(row) || occupants.length > 0)) return false;
    if (this.waterRow(row) && kind !== 'lilypad' && kind !== 'tanglekelp' && (kind === 'potatomine' || !occupants.some(p => p.kind === 'lilypad'))) return false;
    const occupied = occupants.some(p => kind === 'lilypad' || p.kind !== 'lilypad');
    const grave = this.graves.some(grave => grave.column === column && grave.row === row);
    if (kind === 'gravebuster' ? !grave : grave) return false;
    if (this.config.mode === 'bowling') return column < 3 && this.conveyor.some(packet => packet.id === this.selectedPacket && packet.kind === kind);
    if (this.config.mode === 'conveyor') return this.conveyor.some(packet => packet.id === this.selectedPacket && packet.kind === kind)
      && !occupied;
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
      if (this.config.mode === 'conveyor') {
        this.conveyor.splice(this.conveyor.findIndex(packet => packet.id === this.selectedPacket), 1);
        this.selectedPacket = null;
      } else {
        this.sun -= PLANTS[kind].cost;
        this.cooldowns[kind] = PLANTS[kind].cooldown;
      }
      this.plants.push({ id: ++this.id, kind, column, row, health: PLANTS[kind].health,
        actionIn: kind === 'sunflower' || kind === 'sunshroom' ? 300 + Math.floor(this.random() * 951) : kind === 'cherrybomb' || kind === 'iceshroom' || kind === 'doomshroom' ? 100 : kind === 'potatomine' ? 1500 : kind === 'gravebuster' ? 400
          : kind === 'peashooter' || kind === 'snowpea' || kind === 'repeater' || kind === 'puffshroom' || kind === 'fumeshroom' || kind === 'scaredyshroom' || kind === 'threepeater' ? Math.floor(this.random() * 151) : 50,
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
    for (const kind of this.waves[this.wave]) {
      const allowedRows = this.config.rows.filter(row => kind === 'ducky' || kind === 'snorkel' ? this.waterRow(row)
        : this.waterRow(row) ? this.wave >= 5 && ['normal','cone','bucket','flag'].includes(kind)
        : kind !== 'dancer' || isPool(this.config.environment) || row > 0 && row < 4);
      const row = this.rowPicker.pick(this.wave, this.random(), allowedRows);
      // Adapt original mPosX to this port's body anchor (+30 px); flag overrides to board width.
      const spawnX = 810 + Math.floor(this.random() * 40) + (this.isFlagWave(this.wave) ? 40 : 0);
      this.spawnZombie(kind, row, kind === 'flag' ? 830 : spawnX, this.wave);
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
    const zombie: Zombie = { id: ++this.id, kind, armor: kind === 'football' ? 1400 : kind === 'cone' ? 370 : kind === 'bucket' ? 1100 : 0,
      shield: kind === 'newspaper' ? 150 : kind === 'door' ? 1100 : 0, rageIn: 0, riseIn: 0, row, x,
      health: kind === 'pole' || kind === 'dancer' ? 500 : 270, speed: kind === 'pole' || kind === 'football' || kind === 'snorkel' ? .66 + this.random() * .02 : kind === 'dancer' || kind === 'backup' || kind === 'flag' ? .45 : .23 + this.random() * .14,
      biteIn: 4, eating: false, wave, hitAt: -100, chillIn: 0, hasPole: kind === 'pole', vaultIn: 0, animationTime: 0 };
    if (this.scenario === 'adventure' && this.level === 25) { zombie.mini = true; zombie.health = Math.trunc(zombie.health / 4); zombie.armor = Math.trunc(zombie.armor / 4); zombie.shield = Math.trunc(zombie.shield / 4); }
    if (kind === 'dancer') { zombie.summonIn = 0; zombie.dancePhase = 'intro'; zombie.danceIn = 300 + Math.floor(this.random() * 12); }
    this.zombies.push(zombie); return zombie;
  }

  step() {
    if (this.phase !== 'playing') return;
    this.ticks++;
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
      if (plant.kind === 'tanglekelp') { this.updateKelp(plant); continue; }
      if (this.sleeping(plant) || ['wallnut','hypnoshroom','lilypad','plantern'].includes(plant.kind)) continue;
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
        if (this.zombies.some(z => !z.hypnotized && z.health > 0 && z.vaultIn === 0 && z.riseIn === 0 && z.row === plant.row && Math.abs(z.x - cellX(plant.column)) < 35)) {
          for (const z of this.zombies) if (!z.hypnotized && z.vaultIn === 0 && z.riseIn === 0 && z.row === plant.row && Math.abs(z.x - cellX(plant.column)) <= 60) this.damageZombie(z, 1800, true);
          plant.health = 0;
          this.events.push({ kind: 'explode', x: cellX(plant.column), y: this.rowY(plant.row) - 35 });
        }
        continue;
      }
      --plant.actionIn;
      // Portable UpdateShooter checks the repeater at 25 and at zero: a 25-tick pair.
      if (plant.kind === 'repeater' && plant.actionIn === 25) this.firePea(plant);
      if (plant.actionIn > 0) continue;
      if (plant.kind === 'iceshroom') {
        for (const z of this.zombies) if (!z.hypnotized && z.health > 0) {
          const cold = z.chillIn > 0 || (z.frozenIn !== undefined && z.frozenIn > 0);
          z.frozenIn = this.waterRow(z.row) ? 300 : cold ? 300 + Math.floor(this.random()*101) : 400 + Math.floor(this.random()*201);
          z.chillIn = 2000; this.damageZombie(z,20,true);
        }
        this.poolFrozenIn = 300; plant.health = 0;
        this.events.push({kind:'freeze',x:400,y:300}); continue;
      }
      if (plant.kind === 'doomshroom') {
        const x = cellX(plant.column), y = this.rowY(plant.row);
        for (const z of this.zombies) if (!z.hypnotized && Math.abs(z.row-plant.row)<=3 && Math.hypot(z.x-x, this.rowY(z.row)-y)<=250) this.damageZombie(z,1800,true);
        for (const p of this.plants) if (p.column === plant.column && p.row === plant.row) p.health = 0;
        this.craters.push({id:++this.id,column:plant.column,row:plant.row,remaining:18000});
        this.events.push({kind:'explode',x,y:y-35}); continue;
      }
      if (plant.kind === 'threepeater') {
        if (this.zombies.some(z=>!z.hypnotized&&!this.submerged(z)&&z.health>0&&z.riseIn===0&&Math.abs(z.row-plant.row)<=1&&z.x>cellX(plant.column)&&z.x<825))
          for (const row of this.config.rows) if (Math.abs(row-plant.row)<=1) this.firePea({...plant,row},true);
        plant.shotAt = this.ticks; plant.actionIn = 150-Math.floor(this.random()*15); continue;
      }
      if (plant.kind === 'cherrybomb') {
        for (const zombie of this.zombies) {
          if (!zombie.hypnotized && Math.abs(zombie.row - plant.row) <= 1 && Math.abs(zombie.x - cellX(plant.column)) <= 115) this.damageZombie(zombie, 1800, true);
        }
        plant.health = 0;
        this.events.push({ kind: 'explode', x: cellX(plant.column), y: this.rowY(plant.row) - 35 });
      } else if (plant.kind === 'sunflower' || plant.kind === 'sunshroom') {
        this.addSun(cellX(plant.column) + 12, this.rowY(plant.row) - 55, this.rowY(plant.row) - 15, plant.kind === 'sunshroom' && this.ticks - plant.born < 12000 ? 15 : 25);
        plant.actionIn = PLANTS.sunflower.interval - 150 + Math.floor(this.random() * 151);
      } else {
        plant.actionIn = PLANTS.peashooter.interval - Math.floor(this.random() * 15);
        this.firePea(plant);
      }
    }

    for (const zombie of this.zombies) {
      if (zombie.health <= 0) continue;
      if (this.plants.some(p => p.kelp?.target === zombie.id)) { zombie.eating = false; continue; }
      if (zombie.chillIn > 0) zombie.chillIn--;
      if (zombie.frozenIn !== undefined && zombie.frozenIn > 0) { zombie.frozenIn--; continue; }
      const speedFactor = zombie.chillIn > 0 ? .4 : 1;
      zombie.animationTime += speedFactor;
      if (zombie.riseIn > 0) { zombie.riseIn--; zombie.eating = false; continue; }
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
        zombie.x += (zombie.hypnotized ? 1 : -1) * walkingSpeed(zombie) * speedFactor;
        if (this.random() < .2) zombie.health--;
        if (zombie.hypnotized ? zombie.x > 900 : zombie.x < 35) zombie.health = 0;
        continue;
      }
      if (zombie.vaultIn > 0) {
        const progress = Math.min(speedFactor, zombie.vaultIn);
        zombie.vaultIn -= progress; zombie.x -= 150 / 168 * progress;
        if (zombie.vaultIn === 0) zombie.speed = .23 + this.random() * .14;
        continue;
      }
      if (zombie.kind === 'dancer' && this.updateDancer(zombie)) continue;
      if (!zombie.hypnotized && zombie.hasPole && this.plants.some(p => p.health > 0 && p.row === zombie.row
        && !(p.kind === 'potatomine' && p.actionIn > 0) && zombie.x - cellX(p.column) < 95 && zombie.x - cellX(p.column) > 0)) {
        zombie.hasPole = false; zombie.vaultIn = 168; zombie.eating = false; continue;
      }
      const rival = this.zombies.find(other => other !== zombie && !!other.hypnotized !== !!zombie.hypnotized
        && other.health > 0 && !headless(other) && other.row === zombie.row && other.riseIn === 0 && other.vaultIn === 0
        && (other.x - zombie.x) * (zombie.hypnotized ? 1 : -1) >= -30 && (other.x - zombie.x) * (zombie.hypnotized ? 1 : -1) < 40);
      if (rival) {
        zombie.eating = true;
        if (--zombie.biteIn <= 0) { this.damageZombie(rival, 4, true); rival.hitAt = this.ticks; zombie.biteIn = zombie.chillIn > 0 ? 8 : 4; }
        continue;
      }
      const food = !zombie.hypnotized && [...this.plants].sort((a,b) => Number(a.kind==='lilypad')-Number(b.kind==='lilypad')).find(plant => plant.kind !== 'tanglekelp' && plant.health > 0 && plant.row === zombie.row
        && zombie.x - cellX(plant.column) < 35 && zombie.x - cellX(plant.column) > -30);
      zombie.eating = !!food;
      if (food) {
        if (--zombie.biteIn <= 0) {
          if (food.kind === 'hypnoshroom' && !this.sleeping(food)) {
            food.health = 0; zombie.hypnotized = true; zombie.speed = .17; zombie.eating = false;
            if (zombie.kind === 'dancer') for (const follower of this.zombies) if (follower.leader === zombie.id) { follower.hypnotized = true; follower.speed = .17; }
            this.events.push({ kind: 'hypnotize', x: zombie.x, y: this.rowY(zombie.row) - 50 });
          } else food.health -= 4;
          zombie.biteIn = zombie.chillIn > 0 ? 8 : 4;
        }
      } else {
        if(this.dancerMoving(zombie)) zombie.x += (zombie.hypnotized ? 1 : -1) * walkingSpeed(zombie) * speedFactor;
        zombie.biteIn = 4;
      }
    }
    for (const plant of this.plants) if (plant.health <= 0 && plant.kelp) { const target = this.zombies.find(z => z.id === plant.kelp!.target); if (target) target.health = 0; }
    this.plants = this.plants.filter(plant => plant.health > 0);

    for (const pea of this.peas) {
      const oldX = pea.x;
      pea.x += 3.33; pea.age++;
      if (pea.puff && !pea.longRange && pea.age >= 75) { pea.x = 1000; continue; }
      const target = this.zombies.filter(zombie => !zombie.hypnotized && !this.submerged(zombie) && zombie.health > 0 && zombie.row === pea.row
        && zombie.vaultIn === 0 && zombie.riseIn === 0 && oldX <= zombie.x + 18 && pea.x >= zombie.x - 18).sort((a, b) => a.x - b.x)[0];
      if (target) {
        const reachesBody = target.shield < 20;
        this.damageZombie(target, 20);
        if (pea.ice && reachesBody) target.chillIn = 1000;
        target.hitAt = this.ticks;
        this.events.push({ kind: 'hit', x: pea.x, y: this.rowY(pea.row) - 43 });
        pea.x = 1000;
      }
    }
    this.peas = this.peas.filter(pea => pea.x < 850);

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

    for (const mower of this.mowers) {
      if (mower.state === 'ready' && this.zombies.some(zombie => !zombie.hypnotized && zombie.health > 0 && zombie.row === mower.row && zombie.x < 28)) {
        mower.state = 'moving';
        this.rowPicker.mowed(mower.row, this.wave);
        this.events.push({ kind: 'mower', x: mower.x, y: this.rowY(mower.row) });
      }
      if (mower.state === 'moving') {
        mower.x += 3.5;
        for (const zombie of this.zombies) if (!zombie.hypnotized && zombie.row === mower.row && Math.abs(zombie.x - mower.x) < 45) zombie.health = 0;
        if (mower.x > 890) mower.state = 'spent';
      }
    }
    if (this.config.mode === 'whack') for (const zombie of this.zombies) if (zombie.health <= 0) {
      const hit = Math.floor(this.random() * 30000), factor = portable.zombies[zombie.kind].value;
      const max = this.sun > 500 ? 2800 : this.sun > 350 ? 3100 : this.sun > 200 ? 3700 : 5000;
      if (hit >= 2500 * factor && hit <= max * factor) for (let i = 0; i < 3; i++) this.addSun(zombie.x - i * 20, this.rowY(zombie.row) - 60, this.rowY(zombie.row) - 15, 25);
    }
    this.kills += this.zombies.filter(zombie => !zombie.hypnotized && zombie.health <= 0).length;
    this.zombies = this.zombies.filter(zombie => zombie.health > 0 && !(zombie.hypnotized && zombie.x > 900));
    if (this.zombies.some(zombie => !zombie.hypnotized && zombie.x < -35)) {
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

    if (this.graveWaveIn > 0 && --this.graveWaveIn === 0) {
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
    const choices = (this.level === 25 ? portable.conveyorTwentyFive : this.level === 20 ? portable.conveyorTwenty : portable.conveyorTen).map(({ kind, weight }) => {
      const count = this.conveyor.filter(packet => packet.kind === kind).length;
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

  private updateKelp(plant: Plant) {
    if (!plant.kelp) {
      const target = this.zombies.find(z => !z.hypnotized && !headless(z) && z.health > 0 && z.row === plant.row
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
    const target = () => this.zombies.filter(z => !z.hypnotized && z.health>0 && !headless(z) && z.row===plant.row && z.riseIn===0 && z.vaultIn===0 && Math.abs(z.x-cellX(plant.column))<100).sort((a,b)=>Math.abs(a.x-cellX(plant.column))-Math.abs(b.x-cellX(plant.column)))[0];
    if (!plant.squash) { const z=target(); if(z) plant.squash={remaining:185,x:z.x,target:z.id}; return; }
    plant.squash.remaining--;
    if (plant.squash.remaining===60) { const z=this.zombies.find(z=>z.id===plant.squash!.target); if(z) plant.squash.x=z.x-30*walkingSpeed(z); }
    if (plant.squash.remaining===0) {
      for (const z of this.zombies) if(!z.hypnotized&&z.row===plant.row&&Math.abs(z.x-plant.squash.x)<65&&z.vaultIn===0) this.damageZombie(z,1800,true);
      plant.health=0; this.events.push({kind:'hit',x:plant.squash.x,y:this.rowY(plant.row)});
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
      if (zombie.kind === 'newspaper' && zombie.shield === 0) { zombie.rageIn = 150; zombie.eating = false; }
    }
    const absorbed = Math.min(zombie.armor, damage);
    zombie.armor -= absorbed;
    zombie.health -= damage - absorbed;
  }

  private firePea(plant: Plant, force = false) {
    const x = cellX(plant.column);
    const range = plant.kind === 'puffshroom' ? 250 : plant.kind === 'fumeshroom' ? 360 : 825 - x;
    const targets = this.zombies.filter(z => !z.hypnotized && (!this.submerged(z) || plant.kind === 'fumeshroom') && z.health > 0 && z.row === plant.row && z.riseIn === 0 && z.x > x - 10 && z.x < x + range);
    if (targets.length || force) {
      if (plant.kind === 'fumeshroom') {
        for (const zombie of targets) if (zombie.vaultIn === 0 && zombie.riseIn === 0) { this.damageZombie(zombie, 20, true); zombie.hitAt = this.ticks; }
        this.events.push({ kind: 'fume', x: x + 25, y: this.rowY(plant.row) - 45, row: plant.row });
      } else {
        this.peas.push({ id: ++this.id, row: plant.row, x: x + 27, ice: plant.kind === 'snowpea', puff: plant.kind === 'puffshroom' || plant.kind === 'scaredyshroom', longRange: plant.kind === 'scaredyshroom', age: 0 });
        this.events.push({ kind: 'shoot', x: x + 27, y: this.rowY(plant.row) - 43 });
      }
      plant.shotAt = this.ticks;
    }
  }

  private updateChomper(plant: Plant) {
    const state = plant.chomp!;
    const target = () => this.zombies.filter(z => !z.hypnotized && z.health > 0 && z.riseIn === 0 && z.row === plant.row
      && z.x - cellX(plant.column) >= -10 && z.x - cellX(plant.column) <= 100).sort((a, b) => a.x - b.x)[0];
    if (state.phase === 'ready') {
      if (target()) { state.phase = 'bite'; state.remaining = 70; }
    } else if (--state.remaining === 0) {
      if (state.phase === 'bite') {
        const zombie = target();
        if (zombie && !zombie.hasPole && zombie.vaultIn === 0) {
          zombie.health = 0;
          this.events.push({ kind: 'swallow', zombieId: zombie.id, x: cellX(plant.column), y: this.rowY(plant.row) });
          state.phase = 'digest'; state.remaining = 4000;
        } else { state.phase = 'recover'; state.remaining = 30; }
      } else { state.phase = 'ready'; }
    }
  }

  drainEvents() { return this.events.splice(0); }
}
