import { BOARD, cellX, rowY, PLANT_KINDS, type AnimationTiming, type Level, type PlantKind, type Properties, type ZombieKind } from './level';

export interface Plant {
  id: number; kind: PlantKind; row: number; column: number; hp: number; armor: number;
  age: number; nextAction: number; action: 'idle' | 'shoot' | 'produce' | 'food';
  actionAt: number; fired: boolean; burst: number; nextBurst: number;
}
export interface Zombie { id: number; kind: ZombieKind; row: number; x: number; hp: number; armor: number; eating: boolean; absorbed: number; absorbUntil: number }
export interface Pea { id: number; row: number; x: number; y: number; damage: number; powered: boolean }
export interface Sun { id: number; x: number; y: number; targetY: number; value: number; age: number; from: 'sky' | 'plant' | 'ra' }
export interface Mower { row: number; x: number; active: boolean; spent: boolean }
export interface Effect { id: number; x: number; y: number; kind: 'plant' | 'hit' | 'explode' | 'food' | 'collect'; age: number }
export type GameEvent = { type: 'shot' | 'plant' | 'sun' | 'explode' | 'win' | 'lose' | 'food' | 'wave' };

export class Game {
  phase: 'playing' | 'paused' | 'won' | 'lost' = 'playing';
  time = 0;
  sun = 150;
  food = 1;
  wave = 0;
  kills = 0;
  plants: Plant[] = [];
  zombies: Zombie[] = [];
  peas: Pea[] = [];
  suns: Sun[] = [];
  effects: Effect[] = [];
  mowers: Mower[] = Array.from({ length: BOARD.rows }, (_, row) => ({ row, x: BOARD.left - 40, active: false, spent: false }));
  cooldowns = Object.fromEntries(PLANT_KINDS.map(kind => [kind, 0])) as Record<PlantKind, number>;
  events: GameEvent[] = [];
  private id = 0;
  private nextSun = 3;
  private nextWave = 16;
  private waveStarted = 0;
  private waveHealth = 0;
  private threshold = 0;
  private pending: { kind: ZombieKind; at: number; row: number }[] = [];

  constructor(readonly level: Level, readonly props: Properties, readonly timing: AnimationTiming, private seed = 1) {}

  private random() { this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0; return this.seed / 4294967296; }
  private effect(kind: Effect['kind'], x: number, y: number) { this.effects.push({ id: ++this.id, kind, x, y, age: 0 }); }

  plant(kind: PlantKind, row: number, column: number): boolean {
    const p = this.props.plants[kind];
    if (this.phase !== 'playing' || row < 0 || row >= BOARD.rows || column < 0 || column >= BOARD.columns
      || this.sun < p.SunCost || this.cooldowns[kind] > 0 || this.plants.some(p => p.row === row && p.column === column)) return false;
    this.sun -= p.SunCost; this.cooldowns[kind] = p.Cooldown;
    this.addPlant(kind, row, column);
    this.events.push({ type: 'plant' });
    return true;
  }

  private addPlant(kind: PlantKind, row: number, column: number) {
    const p = this.props.plants[kind];
    const nextAction = this.time + (kind === 'sunflower' ? p.ProduceCountdownStart + this.random() * p.ProduceCountdownStartAdditional : .4);
    this.plants.push({ id: ++this.id, kind, row, column, hp: p.Toughness, armor: 0, age: 0, nextAction,
      action: 'idle', actionAt: 0, fired: false, burst: 0, nextBurst: 0 });
    this.effect('plant', cellX(column), rowY(row));
  }

  shovel(row: number, column: number) {
    if (this.phase !== 'playing') return;
    this.plants = this.plants.filter(p => p.row !== row || p.column !== column);
  }

  collect(id: number) {
    if (this.phase !== 'playing') return;
    const sun = this.suns.find(s => s.id === id);
    if (!sun) return;
    this.sun += sun.value; this.effect('collect', sun.x, sun.y);
    this.suns = this.suns.filter(s => s.id !== id); this.events.push({ type: 'sun' });
  }

  plantFood(row: number, column: number): boolean {
    const plant = this.plants.find(p => p.row === row && p.column === column);
    if (!plant || this.food === 0 || this.phase !== 'playing' || plant.action === 'food') return false;
    this.food--; plant.action = 'food'; plant.actionAt = this.time; plant.fired = false;
    this.effect('food', cellX(column), rowY(row) - 35); this.events.push({ type: 'food' });
    if (plant.kind === 'peashooter') { plant.burst = this.props.plants.peashooter.PlantfoodPeaCount; plant.nextBurst = this.time + .3; }
    if (plant.kind === 'sunflower') for (let i = 0; i < 6; i++) this.dropSun(cellX(column) + (i - 2.5) * 16, rowY(row) - 70, 50, 'plant');
    if (plant.kind === 'wallnut') { plant.hp = this.props.plants.wallnut.Toughness; plant.armor = this.props.plants.wallnut.ArmorToughness; }
    if (plant.kind === 'potatomine') {
      plant.age = this.props.plants.potatomine.ChargeTime;
      const cells = Array.from({ length: 45 }, (_, index) => ({ row: Math.floor(index / 9), column: index % 9 }))
        .filter(c => !this.plants.some(p => p.row === c.row && p.column === c.column));
      for (let i = 0; i < 2 && cells.length; i++) {
        const cell = cells.splice(Math.floor(this.random() * cells.length), 1)[0];
        this.addPlant('potatomine', cell.row, cell.column); this.plants.at(-1)!.age = this.props.plants.potatomine.ChargeTime;
      }
    }
    return true;
  }

  private dropSun(x: number, y: number, value: number, from: Sun['from']) {
    this.suns.push({ id: ++this.id, x, y, targetY: from === 'sky' ? BOARD.top + 40 + this.random() * 420 : y + 50, value, age: 0, from });
  }

  private shoot(p: Plant, powered: boolean) {
    this.peas.push({ id: ++this.id, row: p.row, x: cellX(p.column) + 38, y: rowY(p.row) - 48, damage: 20, powered });
    this.events.push({ type: 'shot' });
  }

  private damage(zombie: Zombie, amount: number) {
    const armorDamage = Math.min(zombie.armor, amount); zombie.armor -= armorDamage; zombie.hp -= amount - armorDamage;
  }

  private startWave() {
    const kinds = this.level.waves[this.wave];
    this.wave++; this.waveStarted = this.time; this.nextWave = Infinity;
    this.threshold = this.level.minHealth + this.random() * (this.level.maxHealth - this.level.minHealth);
    this.waveHealth = kinds.reduce((n, kind) => n + this.props.zombies[kind].Toughness + (kind === 'mummy_armor1' ? this.props.armors.egypt_armor1.Toughness : 0), 0);
    this.pending = kinds.map((kind, i) => ({ kind, at: this.time + i * 1.2, row: Math.floor(this.random() * BOARD.rows) }));
    this.events.push({ type: 'wave' });
  }

  tick(dt: number) {
    if (this.phase !== 'playing') return;
    this.time += dt;
    for (const kind of PLANT_KINDS) this.cooldowns[kind] = Math.max(0, this.cooldowns[kind] - dt);
    if (this.time >= this.nextSun) { this.dropSun(BOARD.left + 30 + this.random() * 650, 110, 50, 'sky'); this.nextSun = this.time + 8; }
    if (this.wave < this.level.waves.length && this.time >= this.nextWave) this.startWave();
    for (const spawn of this.pending.filter(s => s.at <= this.time)) this.zombies.push({ id: ++this.id, kind: spawn.kind, row: spawn.row,
      x: 1070, hp: this.props.zombies[spawn.kind].Toughness, armor: spawn.kind === 'mummy_armor1' ? this.props.armors.egypt_armor1.Toughness : 0,
      eating: false, absorbed: 0, absorbUntil: 0 });
    this.pending = this.pending.filter(s => s.at > this.time);

    for (const p of this.plants) {
      p.age += dt;
      if (p.action === 'food') {
        if (p.kind === 'peashooter' && p.burst > 0 && this.time >= p.nextBurst) { this.shoot(p, true); p.burst--; p.nextBurst += .06; }
        if (this.time - p.actionAt >= 4) { p.action = 'idle'; p.nextAction = this.time + 1; }
        continue;
      }
      if (p.action === 'shoot' || p.action === 'produce') {
        const shoot = p.action === 'shoot', eventTime = shoot ? this.timing.shoot : this.timing.produce;
        if (!p.fired && this.time - p.actionAt >= eventTime) {
          p.fired = true;
          if (shoot) this.shoot(p, false); else this.dropSun(cellX(p.column), rowY(p.row) - 65, this.props.plants.sunflower.SunValue, 'plant');
        }
        if (this.time - p.actionAt >= (shoot ? this.timing.shootDuration : this.timing.produceDuration)) p.action = 'idle';
      }
      if (p.kind === 'peashooter' && p.action === 'idle' && this.time >= p.nextAction && this.zombies.some(z => z.row === p.row && z.x > cellX(p.column) - 15 && z.x < 1150 && z.hp > 0)) {
        p.action = 'shoot'; p.actionAt = this.time; p.fired = false;
        p.nextAction = this.time + this.props.plants.peashooter.ShootInterval + this.random() * this.props.plants.peashooter.ShootIntervalAdditional;
      }
      if (p.kind === 'sunflower' && p.action === 'idle' && this.time >= p.nextAction) {
        p.action = 'produce'; p.actionAt = this.time; p.fired = false;
        p.nextAction = this.time + this.props.plants.sunflower.ProduceInterval + this.random() * this.props.plants.sunflower.ProduceIntervalAdditional;
      }
      if (p.kind === 'potatomine' && p.age >= this.props.plants.potatomine.ChargeTime && this.zombies.some(z => z.hp > 0 && z.row === p.row && Math.abs(z.x - cellX(p.column)) < 38)) {
        for (const z of this.zombies) if (z.row === p.row && Math.abs(z.x - cellX(p.column)) < 105) this.damage(z, this.props.plants.potatomine.Damage);
        p.hp = 0; this.effect('explode', cellX(p.column), rowY(p.row) - 20); this.events.push({ type: 'explode' });
      }
    }

    for (const pea of this.peas) {
      const oldX = pea.x; pea.x += dt * 360;
      const target = this.zombies.filter(z => z.hp > 0 && z.row === pea.row && z.x - 18 >= oldX - 12 && z.x - 18 <= pea.x + 12).sort((a, b) => a.x - b.x)[0];
      if (target) { this.damage(target, pea.damage); this.effect('hit', pea.x, pea.y); pea.x = 1300; }
    }
    this.peas = this.peas.filter(p => p.x < 1200);
    for (const z of this.zombies) {
      if (z.hp <= 0) continue;
      const target = this.plants.filter(p => p.hp > 0 && p.row === z.row && z.x >= cellX(p.column) - 22 && z.x <= cellX(p.column) + 38).sort((a, b) => b.column - a.column)[0];
      z.eating = !!target;
      if (target) { const amount = this.props.zombies[z.kind].EatDPS * dt, armor = Math.min(target.armor, amount); target.armor -= armor; target.hp -= amount - armor; }
      else if (this.time >= z.absorbUntil) z.x -= this.props.zombies[z.kind].WalkSPS * BOARD.cellWidth * dt;
      if (z.kind === 'ra' && !z.eating && this.time >= z.absorbUntil && z.absorbed < this.props.zombies.ra.MaxAbsorbValue) {
        const sun = this.suns.find(s => s.age > 2 && Math.abs(s.x - z.x) < 180 && Math.abs(s.y - rowY(z.row)) < 150);
        if (sun) { z.absorbed += sun.value; z.absorbUntil = this.time + 2; this.suns = this.suns.filter(s => s.id !== sun.id); }
      }
      const mower = this.mowers[z.row];
      if (z.x < BOARD.left - 15 && !mower.spent) mower.active = true;
      if (z.x < BOARD.left - 100) { this.phase = 'lost'; this.events.push({ type: 'lose' }); }
    }
    for (const mower of this.mowers) if (mower.active) {
      mower.x += 600 * dt;
      for (const z of this.zombies) if (z.row === mower.row && z.x < mower.x + 40) z.hp = 0;
      if (mower.x > 1230) { mower.spent = true; mower.active = false; }
    }
    for (const z of this.zombies) if (z.hp <= 0) {
      this.kills++; if (this.kills % 6 === 0) this.food++;
      if (z.absorbed) this.dropSun(z.x, rowY(z.row) - 65, z.absorbed, 'ra');
    }
    this.zombies = this.zombies.filter(z => z.hp > 0);
    this.plants = this.plants.filter(p => p.hp > 0);
    for (const sun of this.suns) { sun.age += dt; sun.y = Math.min(sun.targetY, sun.y + dt * 38); }
    this.suns = this.suns.filter(s => s.age < 18);
    for (const effect of this.effects) effect.age += dt;
    this.effects = this.effects.filter(e => e.age < .65);
    if (this.wave > 0 && !this.pending.length && this.wave < this.level.waves.length && this.nextWave === Infinity) {
      const health = this.zombies.reduce((n, z) => n + z.hp + z.armor, 0);
      if (health <= this.waveHealth * this.threshold || this.time - this.waveStarted >= 30) this.nextWave = this.time + 5;
    }
    if (this.wave === this.level.waves.length && !this.pending.length && !this.zombies.length && this.phase === 'playing') { this.phase = 'won'; this.events.push({ type: 'win' }); }
  }
}
