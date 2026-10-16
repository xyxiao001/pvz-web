import { EGYPT_RULES as RULES } from './rules';
import { BOARD, cellX, rowY, PLANT_KINDS, type AnimationTiming, type Level, type PlantKind, type Properties, type ZombieKind } from './level';

export interface Plant {
  id: number; kind: PlantKind; row: number; column: number; hp: number; armor: number;
  age: number; nextAction: number; action: 'idle' | 'shoot' | 'produce' | 'food' | 'grow' | 'explode';
  actionAt: number; fired: boolean; burst: number; nextBurst: number;
}
export interface Zombie { id: number; kind: ZombieKind; row: number; x: number; hp: number; armor: number; eating: boolean; absorbed: number; absorbUntil: number; absorbState:'idle'|'start'|'loop'|'end'; absorbAt:number;deathCause:DeathCause }
export type DeathCause = 'normal' | 'potato' | 'mower';
export interface ZombieDeath { zombie: Zombie; cause: DeathCause; at: number }
export interface Pea { id: number; row: number; x: number; y: number; damage: number; powered: boolean }
export interface Sun { id: number; x: number; y: number; targetY: number; value: number; age: number; from: 'sky' | 'plant' | 'ra';vx:number;vy:number;groundAge:number;absorber:number|null;absorbAge:number }
export interface Mower { row: number; x: number; active: boolean; spent: boolean }
export interface Effect { id: number; x: number; y: number; kind: 'plant' | 'remove' | 'hit' | 'explode' | 'food' | 'collect'; age: number }
export type GameEvent = { type: 'shot' | 'plant' | 'sun' | 'explode' | 'win' | 'lose' | 'food' | 'wave' };

export class Game {
  phase: 'playing' | 'paused' | 'won' | 'lost' = 'playing';
  time = 0;
  sun: number = RULES.startingSun;
  food: number = RULES.startingFood;
  wave = 0;
  kills = 0;
  plants: Plant[] = [];
  zombies: Zombie[] = [];
  deaths: ZombieDeath[] = [];
  peas: Pea[] = [];
  suns: Sun[] = [];
  effects: Effect[] = [];
  mowers: Mower[] = Array.from({ length: BOARD.rows }, (_, row) => ({ row, x: BOARD.left - 40, active: false, spent: false }));
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
  private pending: { kind: ZombieKind; at: number; row: number }[] = [];

  constructor(readonly level: Level, readonly props: Properties, readonly timing: AnimationTiming, private readonly raTarget: (zombie: Zombie) => {x:number;y:number}, private seed = 1) {}

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
    if(this.plants.some(p=>p.row===row&&p.column===column))this.effect('remove',cellX(column),rowY(row));
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
    this.suns.push({ id: ++this.id, x, y, targetY: from === 'sky' ? rowY(2)-50+this.random()*200 : y+65, value, age: 0, from,
      vx:from==='sky'?0:(6*this.random()-3)*30,vy:from==='sky'?90:-300,groundAge:0,absorber:null,absorbAge:0 });
  }

  private shoot(p: Plant, powered: boolean) {
    this.peas.push({ id: ++this.id, row: p.row, x: cellX(p.column) + 38, y: rowY(p.row) - 48, damage: 20, powered });
    this.events.push({ type: 'shot' });
  }

  private damage(zombie: Zombie, amount: number, cause: DeathCause = 'normal') {
    const armorDamage = Math.min(zombie.armor, amount); zombie.armor -= armorDamage; zombie.hp -= amount - armorDamage;
    if (zombie.hp<=0)zombie.deathCause=cause;
  }

  private startWave() {
    const kinds = [...this.level.waves[this.wave]];
    if ((this.wave + 1) % this.level.flagInterval === 0) kinds.unshift('mummy_flag');
    this.wave++; this.nextWave = Infinity;
    this.waveIds.clear();
    this.waveDeadline = this.time + RULES.waveDelay + this.random() * RULES.waveDelayRange;
    this.waveDamageDeadline = this.time + RULES.waveDamageDelay + this.random() * RULES.waveDamageRange;
    this.threshold = this.level.minHealth + this.random() * (this.level.maxHealth - this.level.minHealth);
    this.waveHealth = kinds.reduce((n, kind) => n + this.props.zombies[kind].Toughness, 0);
    this.pending = kinds.map(kind => ({ kind, at: this.time, row: Math.floor(this.random() * BOARD.rows) }));
    this.events.push({ type: 'wave' });
  }

  tick(dt: number) {
    if (this.phase !== 'playing') return;
    this.time += dt;
    for (const kind of PLANT_KINDS) this.cooldowns[kind] = Math.max(0, this.cooldowns[kind] - dt);
    if (this.time >= this.nextSun) { this.dropSun(cellX(4)-150+this.random()*300, -90, 50, 'sky'); this.nextSun = this.time + Math.min(RULES.sunMax, RULES.sunBase + this.droppedSuns * RULES.sunIncrease + this.random() * RULES.sunRange); this.droppedSuns++; }
    if (this.wave < this.level.waves.length && this.time >= this.nextWave) this.startWave();
    for (const spawn of this.pending.filter(s => s.at <= this.time)) { this.waveIds.add(this.id + 1); this.zombies.push({ id: ++this.id, kind: spawn.kind, row: spawn.row,
      x: 1070, hp: this.props.zombies[spawn.kind].Toughness, armor: spawn.kind === 'mummy_armor1' ? this.props.armors.egypt_armor1.Toughness : 0,
      eating: false, absorbed: 0, absorbUntil: 0,absorbState:'idle',absorbAt:0,deathCause:'normal' }); }
    this.pending = this.pending.filter(s => s.at > this.time);

    for (const p of this.plants) {
      const previousAge=p.age;
      p.age += dt;
      if(p.kind==='potatomine'&&p.action!=='food') {
        if(previousAge<this.props.plants.potatomine.ChargeTime&&p.age>=this.props.plants.potatomine.ChargeTime){p.action='grow';p.actionAt=this.time;}
        if(p.action==='grow'&&this.time-p.actionAt>=this.timing.mineGrow)p.action='idle';
        if(p.action==='explode') {
          if(!p.fired&&this.time-p.actionAt>=this.timing.mineExplode){
            p.fired=true;
            for(const z of this.zombies)if(z.hp>0&&z.row===p.row&&Math.abs(z.x-cellX(p.column))<105)this.damage(z,this.props.plants.potatomine.Damage,'potato');
            this.effect('explode',cellX(p.column),rowY(p.row));this.events.push({type:'explode'});
          }
          if(this.time-p.actionAt>=this.timing.mineDeath)p.hp=0;
          continue;
        }
      }
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
      if (p.kind === 'potatomine' && p.action==='idle' && p.age >= this.props.plants.potatomine.ChargeTime && this.zombies.some(z => z.hp > 0 && z.row === p.row && Math.abs(z.x - cellX(p.column)) < 38)) {
        p.action='explode';p.actionAt=this.time;p.fired=false;
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
      const target = this.plants.filter(p => p.hp > 0 && p.action!=='explode' && p.row === z.row && z.x >= cellX(p.column) - 22 && z.x <= cellX(p.column) + 38).sort((a, b) => b.column - a.column)[0];
      z.eating = !!target;
      if (target) { const amount = this.props.zombies[z.kind].EatDPS * dt, armor = Math.min(target.armor, amount); target.armor -= armor; target.hp -= amount - armor; }
      else if (this.time >= z.absorbUntil) z.x -= this.props.zombies[z.kind].WalkSPS * BOARD.cellWidth * dt;
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
      if (z.x < BOARD.left - 15 && !mower.spent) mower.active = true;
      if (z.x < BOARD.left - 100) { this.phase = 'lost'; this.events.push({ type: 'lose' }); }
    }
    for (const mower of this.mowers) if (mower.active) {
      mower.x += 600 * dt;
      for (const z of this.zombies) if (z.hp>0 && z.row === mower.row && z.x < mower.x + 40) {z.hp = 0;z.deathCause='mower';}
      if (mower.x > 1230) { mower.spent = true; mower.active = false; }
    }
    for (const z of this.zombies) if (z.hp <= 0) {
      this.kills++;
      this.deaths.push({zombie:{...z},cause:z.deathCause,at:this.time});
      for(const sun of this.suns)if(sun.absorber===z.id){sun.absorber=null;sun.vx=0;sun.vy=0;}
      if (z.absorbed) this.dropSun(z.x, rowY(z.row) - 65, z.absorbed, 'ra');
    }
    this.zombies = this.zombies.filter(z => z.hp > 0);
    this.plants = this.plants.filter(p => p.hp > 0);
    const absorbed=new Set<number>();
    for (const sun of this.suns) {
      sun.age+=dt;
      if(sun.absorber!==null){
        const ra=this.zombies.find(z=>z.id===sun.absorber)!;sun.absorbAge+=dt;
        // sun.ts pulls in three .5-second bursts separated by .3-second rests, then continuously.
        if(sun.absorbAge>=2.4||sun.absorbAge%.8<.5){const {x,y}=this.raTarget(ra),dx=x-sun.x,dy=y-sun.y,distance=Math.hypot(dx,dy),move=4*BOARD.cellWidth*dt;
          if(distance<=move){ra.absorbed+=sun.value;absorbed.add(sun.id);}else{sun.x+=dx/distance*move;sun.y+=dy/distance*move;}}
      }else if(sun.y<sun.targetY){sun.x+=sun.vx*dt;sun.y=Math.min(sun.targetY,sun.y+sun.vy*dt);if(sun.from!=='sky')sun.vy+=990*dt;}
      else sun.groundAge+=dt;
    }
    this.suns = this.suns.filter(s => !absorbed.has(s.id)&&s.groundAge<7.5);
    for (const effect of this.effects) effect.age += dt;
    this.effects = this.effects.filter(e => e.age < .65);
    if (this.wave > 0 && !this.pending.length && this.wave < this.level.waves.length && this.nextWave === Infinity) {
      const health = this.zombies.filter(z => this.waveIds.has(z.id)).reduce((n, z) => n + z.hp, 0);
      if (this.time >= this.waveDamageDeadline && (health <= this.waveHealth * this.threshold || this.time >= this.waveDeadline)) {
        this.nextWave = this.time + ((this.wave + 1) % this.level.flagInterval === 0 ? RULES.flagWaveEntrance : RULES.normalWaveEntrance);
      }
    }
    if (this.wave === this.level.waves.length && !this.pending.length && !this.zombies.length && this.phase === 'playing') { this.phase = 'won'; this.events.push({ type: 'win' }); }
  }
}
