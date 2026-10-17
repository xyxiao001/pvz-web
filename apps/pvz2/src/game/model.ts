import { EGYPT_RULES as RULES } from './rules';
import { BOARD, cellX, rowY, PLANT_KINDS, type AnimationTiming, type Level, type PlantKind, type Properties, type ZombieKind, type SpawnAction } from './level';

export interface Plant {
  id: number; kind: PlantKind; row: number; column: number; hp: number; armor: number;
  age: number; nextAction: number; action: 'idle' | 'shoot' | 'produce' | 'food' | 'grow' | 'explode' | 'catch';
  actionAt: number; fired: boolean; burst: number; nextBurst: number;
}
export interface Zombie { id: number; kind: ZombieKind; row: number; x: number; hp: number; armor: number; eating: boolean; absorbed: number; absorbUntil: number; absorbState:'idle'|'start'|'loop'|'end'; absorbAt:number;deathCause:DeathCause; frozenUntil:number;chilledUntil:number;food:boolean;entry:SpawnAction['mode'];entryAt:number;entryX:number;camelPart:number;team:number;leap:{fromX:number;fromY:number;toX:number;toRow:number;at:number}|null }
export type DeathCause = 'normal' | 'potato' | 'mower' | 'toss';
export interface Grave {id:number;row:number;column:number;hp:number;stage:number}
export interface Pickup {id:number;kind:'food'|'sprout';x:number;y:number;age:number}
export interface Missile {id:number;kind:'cabbage'|'boomerang'|'snow';row:number;x:number;y:number;startX:number;startY:number;targetX:number;targetY:number;targetId:number;age:number;duration:number;damage:number;powered:boolean;returning:boolean;hits:number[];dx:number;dy:number}
export type PowerKind='fire'|'snow'|'toss'|'zap'|'cherry';
export const POWER_TYPES:Record<PowerKind,string>={fire:'powerupflamethrower',snow:'powerupsnowball',toss:'powerupflickzombie',zap:'powerupwizardfinger',cherry:'powerupcherrybomb'};
export interface ZombieDeath { zombie: Zombie; cause: DeathCause; at: number }
export interface Pea { id: number; row: number; x: number; y: number; damage: number; powered: boolean }
export interface Sun { id: number; x: number; y: number; targetY: number; value: number; age: number; from: 'sky' | 'plant' | 'ra';vx:number;vy:number;groundAge:number;absorber:number|null;absorbAge:number }
export interface Mower { row: number; x: number; active: boolean; spent: boolean }
export interface Effect { id: number; x: number; y: number; kind: 'plant' | 'remove' | 'hit' | 'explode' | 'food' | 'collect' | 'freeze' | 'ground' | 'toss' | 'cabbageHit' | 'boomerangHit' | 'graveHit' | 'cherry' | 'snowHit'; age: number; stage?:number }
export type GameEvent = { type: 'shot' | 'plant' | 'sun' | 'explode' | 'win' | 'lose' | 'food' | 'wave' | 'storm' | 'sprout' };

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
  graves:Grave[]=[];
  missiles:Missile[]=[];
  pickups:Pickup[]=[];
  sprouts=0;
  conveyor:{id:number;kind:PlantKind;lane:number;position:number}[]=[];
  private nextCard=1/60;
  private sproutDropped=false;
  power:{kind:PowerKind;remaining:number;total:number;x:number;y:number;held:boolean;nextUse:number;hits:Set<number>}|null=null;
  fires:{row:number;column:number;until:number}[]=[];
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
  private pending: {kind:ZombieKind;at:number;row:number;x:number;mode:SpawnAction['mode'];food:boolean}[] = [];

  constructor(readonly level: Level, readonly props: Properties, readonly timing: AnimationTiming, private readonly raTarget: (zombie: Zombie) => {x:number;y:number}, private seed = 1, tutorial=true) {
    this.graves=level.graves.map(g=>({...g,id:++this.id,hp:props.grave.Toughness,stage:0}));
    this.sproutDropped=!tutorial;
    if(!level.sunDrops)this.nextSun=Infinity;
    if(!level.mowers)this.mowers.forEach(m=>m.spent=true);
    if(level.day===2&&tutorial)this.addPlant('peashooter',2,2);
  }

  private random() { this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0; return this.seed / 4294967296; }
  private effect(kind: Effect['kind'], x: number, y: number) { this.effects.push({ id: ++this.id, kind, x, y, age: 0 }); }

  plant(kind: PlantKind, row: number, column: number, packetId?:number): boolean {
    const p = this.props.plants[kind];
    const packet=this.conveyor.find(c=>c.id===packetId&&c.kind===kind);
    if (this.phase !== 'playing' || row < 0 || row >= BOARD.rows || column < 0 || column >= BOARD.columns
      || this.level.powerups || (this.level.conveyor?!packet:this.sun < p.SunCost || this.cooldowns[kind] > 0)
      || this.graves.some(g=>g.row===row&&g.column===column&&g.hp>0) || this.plants.some(p => p.row === row && p.column === column)) return false;
    if(packet){this.conveyor.splice(this.conveyor.indexOf(packet),1);this.nextCard=Math.min(this.nextCard,this.time+this.conveyorDelay());}
    else {this.sun -= p.SunCost; this.cooldowns[kind] = p.Cooldown;}
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
    if(plant.kind==='bloomerang'){plant.burst=this.props.plants.bloomerang.PlantfoodBoomerangCount;plant.nextBurst=this.time+.01;}
    if (plant.kind === 'sunflower') for (let i = 0; i < 6; i++) this.dropSun(cellX(column) + (i - 2.5) * 16, rowY(row) - 70, 50, 'plant');
    if (plant.kind === 'wallnut') { plant.hp = this.props.plants.wallnut.Toughness; plant.armor = this.props.plants.wallnut.ArmorToughness; }
    if (plant.kind === 'potatomine') {
      plant.age = this.props.plants.potatomine.ChargeTime;
      const cells = Array.from({ length: 45 }, (_, index) => ({ row: Math.floor(index / 9), column: index % 9 }))
        .filter(c => !this.plants.some(p => p.row === c.row && p.column === c.column)&&!this.graves.some(g=>g.row===c.row&&g.column===c.column));
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
    if(zombie.kind==='camel_onehump'&&zombie.armor===0){zombie.kind='mummy';}
    if (zombie.hp<=0)zombie.deathCause=cause;
  }

  private startWave() {
    const actions=this.level.actions[this.wave];
    this.pending=[];
    for(const action of actions){
      const foodIndices=new Set<number>();
      const indices=action.zombies.map((_,i)=>i);
      for(let n=0;n<action.food&&indices.length;n++)foodIndices.add(indices.splice(Math.floor(this.random()*indices.length),1)[0]);
      action.zombies.forEach((z,i)=>{
        let row=z.row===null?Math.floor(this.random()*BOARD.rows):z.row;
        if(action.mode==='storm'){
          const counts=Array.from({length:5},(_,r)=>this.zombies.filter(z=>z.row===r).length+this.pending.filter(z=>z.row===r).length);
          const rows=counts.flatMap((n,r)=>n===Math.min(...counts)?[r]:[]);row=rows[Math.floor(this.random()*rows.length)];
        }
        const column=action.columnStart+Math.floor(this.random()*(action.columnEnd-action.columnStart+(action.mode==='ground'?1:0)));
        this.pending.push({kind:z.kind,row,x:action.mode==='walk'?1070:cellX(column),mode:action.mode,
          at:this.time+(action.mode==='storm'?Math.ceil((i+1)/action.groupSize)*action.interval:action.mode==='ground'?this.random():0),food:foodIndices.has(i)});
      });
      if(action.mode==='storm')this.events.push({type:'storm'});
    }
    if((this.wave+1)%this.level.flagInterval===0)this.pending.unshift({kind:'mummy_flag',row:Math.floor(this.random()*5),x:1070,mode:'walk',at:this.time,food:false});
    this.wave++;this.nextWave=Infinity;this.waveIds.clear();
    this.waveDeadline=this.time+RULES.waveDelay+this.random()*RULES.waveDelayRange;
    this.waveDamageDeadline=this.time+RULES.waveDamageDelay+this.random()*RULES.waveDamageRange;
    this.threshold=this.level.minHealth+this.random()*(this.level.maxHealth-this.level.minHealth);
    this.waveHealth=this.pending.reduce((n,z)=>n+(z.kind==='camel_onehump'?3*this.props.zombies.mummy.Toughness:this.props.zombies[z.kind].Toughness),0);
    this.events.push({ type: 'wave' });
  }

  collectPickup(id:number) {
    if(this.phase!=='playing')return;
    const p=this.pickups.find(p=>p.id===id);
    if(!p||p.kind==='food'&&this.food>=3)return;
    if(p.kind==='food')this.food++;else {this.sprouts++;this.events.push({type:'sprout'});}
    this.pickups.splice(this.pickups.indexOf(p),1);
  }

  private freeze(z:Zombie,duration:number) {
    for(const member of this.zombies)if(member.id===z.id||z.kind==='camel_onehump'&&member.team===z.team)member.frozenUntil=this.time+duration;
  }

  private conveyorDelay() {
    if(this.conveyor.length>=10)return Infinity;
    return [...this.level.conveyor!.DropDelayConditions].sort((a,b)=>b.MaxPackets-a.MaxPackets).find(c=>this.conveyor.length>=c.MaxPackets)!.Delay;
  }
  private tickConveyor(dt:number) {
    if(!this.level.conveyor)return;
    if(this.time>=this.nextCard&&this.conveyor.length<10){
      const choices=this.level.conveyor.InitialPlantList,total=choices.reduce((n,p)=>n+p.Weight,0);
      let roll=this.random()*total;
      const chosen=choices.find(p=>(roll-=p.Weight)<0)!;
      const counts=[0,1].map(lane=>this.conveyor.filter(c=>c.lane===lane).length);
      // ConveyorPlant's default Min/MaxWeightFactor are both 1 in this build.
      this.conveyor.push({id:++this.id,kind:chosen.PlantType,lane:counts[0]<=counts[1]?0:1,position:5});
      this.nextCard=this.time+this.conveyorDelay();
    }
    for(const lane of [0,1])this.conveyor.filter(c=>c.lane===lane).forEach((c,index)=>{c.position=Math.max(index,c.position-dt);});
  }

  private throwCabbage(p:Plant) {
    const target=this.zombies.filter(z=>z.hp>0&&z.row===p.row&&z.x>cellX(p.column)-15).sort((a,b)=>a.x-b.x)[0];
    const grave=this.graves.filter(g=>g.hp>0&&g.row===p.row&&g.column>p.column).sort((a,b)=>a.column-b.column)[0];
    if(target)this.lob(p,target.id,target.x,rowY(target.row)-45,false);
    else if(grave)this.lob(p,grave.id,cellX(grave.column),rowY(grave.row)-40,false);
  }
  private lob(p:Plant,targetId:number,x:number,y:number,powered:boolean) {
    const startX=cellX(p.column)-10,startY=rowY(p.row)-70;
    this.missiles.push({id:++this.id,kind:'cabbage',row:p.row,x:startX,y:startY,startX,startY,targetX:x,targetY:y,targetId,
      age:0,duration:Math.max(.65,Math.abs(x-startX)/450),damage:this.props.projectiles[powered?'cabbage_pf':'cabbage'].Damage,
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
      if(m.kind==='cabbage'||m.kind==='snow'){
        const z=this.zombies.find(z=>z.id===m.targetId);
        if(z){m.targetX=z.x;m.targetY=rowY(z.row)-45;}
        const t=Math.min(1,m.age/m.duration);
        m.x=m.startX+(m.targetX-m.startX)*t;m.y=m.startY+(m.targetY-m.startY)*t-140*4*t*(1-t);
        if(t===1){
          if(m.kind==='snow'){
            const prop=this.props.projectiles.powerup_snow;
            const direct=this.zombies.find(target=>target.hp>0&&Math.abs(target.x-m.targetX)<25&&Math.abs(rowY(target.row)-50-m.targetY)<45);
            const directGrave=!direct&&this.graves.find(g=>Math.abs(cellX(g.column)-m.targetX)<25&&Math.abs(rowY(g.row)-50-m.targetY)<45);
            if(direct){this.damage(direct,m.damage);direct.chilledUntil=this.time+prop.ChillDuration;}
            if(directGrave)directGrave.hp-=m.damage;
            for(const target of this.zombies){
              const dx=Math.abs(target.x-m.targetX),dy=Math.abs(rowY(target.row)-50-m.targetY);
              if(target!==direct&&dx<123&&dy<147){target.chilledUntil=this.time+prop.ChillDuration;this.damage(target,5+(dx<41&&dy<49?prop.Damage:0));}
            }
            for(const g of this.graves)if(g!==directGrave&&Math.abs(cellX(g.column)-m.targetX)<123&&Math.abs(rowY(g.row)-50-m.targetY)<147)g.hp-=5+(Math.abs(cellX(g.column)-m.targetX)<41&&Math.abs(rowY(g.row)-50-m.targetY)<49?prop.Damage:0);
          }
          else if(z)this.damage(z,m.damage);
          const grave=this.graves.find(g=>g.id===m.targetId);if(grave)grave.hp-=m.damage;
          this.effect(m.kind==='snow'?'snowHit':'cabbageHit',m.x,m.y);removed.add(m.id);
        }
      }else{
        const beforeX=m.x,beforeY=m.y,sign=m.returning?-1:1;
        m.x+=m.dx*656*dt*sign;m.y+=m.dy*490*dt*sign;
        const hit=(x:number,y:number)=>Math.hypot(x-m.x,y-m.y)<30||Math.hypot(x-(beforeX+m.x)/2,y-(beforeY+m.y)/2)<30;
        const targets=[...this.zombies.filter(z=>z.hp>0).map(z=>({id:z.id,x:z.x,y:rowY(z.row)-45,damage:(n:number)=>this.damage(z,n)})),
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

  tick(dt: number) {
    if (this.phase !== 'playing') return;
    this.time += dt;
    for (const kind of PLANT_KINDS) this.cooldowns[kind] = Math.max(0, this.cooldowns[kind] - dt);
    if (this.time >= this.nextSun) { this.dropSun(cellX(4)-150+this.random()*300, -90, 50, 'sky'); this.nextSun = this.time + Math.min(RULES.sunMax, RULES.sunBase + this.droppedSuns * RULES.sunIncrease + this.random() * RULES.sunRange); this.droppedSuns++; }
    if (this.wave < this.level.waves.length && this.time >= this.nextWave) this.startWave();
    for(const spawn of this.pending.filter(s=>s.at<=this.time)){
      const camel=spawn.kind==='camel_onehump',team=this.id+1;
      for(let part=0;part<(camel?3:1);part++){
        const id=++this.id;this.waveIds.add(id);
        this.zombies.push({id,kind:spawn.kind,row:spawn.row,x:(spawn.mode==='storm'?1070:spawn.x)+part*60,
          hp:this.props.zombies[camel?'mummy':spawn.kind].Toughness,
          armor:camel?this.props.zombies.camel_onehump.Toughness:spawn.kind==='mummy_armor1'?this.props.armors.egypt_armor1.Toughness:spawn.kind==='mummy_armor2'?this.props.armors.egypt_armor2.Toughness:0,
          eating:false,absorbed:0,absorbUntil:0,absorbState:'idle',absorbAt:0,deathCause:'normal',frozenUntil:0,chilledUntil:0,food:spawn.food&&part===0,
          entry:spawn.mode,entryAt:this.time,entryX:spawn.x+part*60,camelPart:part,team,leap:null});
        if(spawn.mode==='ground')this.effect('ground',spawn.x,rowY(spawn.row));
      }
    }
    this.pending = this.pending.filter(s => s.at > this.time);

    for(const z of this.zombies){
      if(z.entry==='storm'&&this.time-z.entryAt<=1)z.x=z.entryX+(1070-z.entryX)*(1-(this.time-z.entryAt));
      if(z.leap){const t=Math.min(1,(this.time-z.leap.at)/.5);z.x=z.leap.fromX+(z.leap.toX-z.leap.fromX)*t;if(t===1){z.row=z.leap.toRow;z.leap=null;}}
    }
    this.tickConveyor(dt);this.tickPower(dt);
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
      if(p.action==='catch'&&this.time-p.actionAt>=this.timing.campaign!.boomerangCatch)p.action='idle';
      if(p.kind==='iceburg'&&p.action==='explode'){
        if(!p.fired&&this.time-p.actionAt>=this.timing.campaign!.ice){p.fired=true;const z=this.zombies.filter(z=>z.row===p.row&&Math.abs(z.x-cellX(p.column))<82&&z.hp>0).sort((a,b)=>Math.abs(a.x-cellX(p.column))-Math.abs(b.x-cellX(p.column)))[0];if(z)this.freeze(z,this.props.plants.iceburg.FreezeDuration);this.effect('freeze',cellX(p.column),rowY(p.row));}
        if(this.time-p.actionAt>=this.timing.campaign!.iceDuration)p.hp=0;continue;
      }
      if (p.action === 'food') {
        if (p.kind === 'peashooter' && p.burst > 0 && this.time >= p.nextBurst) { this.shoot(p, true); p.burst--; p.nextBurst += .06; }
        if(p.kind==='cabbagepult'&&!p.fired&&this.time-p.actionAt>=this.timing.campaign!.cabbageFood){p.fired=true;for(const z of this.zombies.filter(z=>z.hp>0))this.lob(p,z.id,z.x,rowY(z.row)-45,true);for(const g of this.graves)this.lob(p,g.id,cellX(g.column),rowY(g.row)-40,true);}
        if(p.kind==='bloomerang'&&p.burst>0&&this.time>=p.nextBurst){for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]])this.boomerang(p,true,dx,dy);p.burst--;p.nextBurst+=2/this.props.plants.bloomerang.PlantfoodBoomerangCount;}
        if(p.kind==='iceburg'&&!p.fired&&this.time-p.actionAt>=this.timing.campaign!.iceFood){p.fired=true;for(const z of this.zombies)this.freeze(z,this.props.plants.iceburg.FreezeDuration);this.effect('freeze',cellX(p.column),rowY(p.row));}
        const duration=p.kind==='cabbagepult'?this.timing.campaign!.cabbageFoodEnd:p.kind==='iceburg'?this.timing.campaign!.iceFoodEnd:p.kind==='bloomerang'?2:4;
        if(this.time-p.actionAt>=duration){p.action='idle';p.nextAction=this.time+(p.kind==='bloomerang'?0:1);}
        continue;
      }
      if (p.action === 'shoot' || p.action === 'produce') {
        const shoot=p.action==='shoot',eventTime=shoot?(p.kind==='cabbagepult'?this.timing.campaign!.cabbage:p.kind==='bloomerang'?this.timing.campaign!.boomerang:this.timing.shoot):this.timing.produce;
        if (!p.fired && this.time - p.actionAt >= eventTime) {
          p.fired = true;
          if(shoot){if(p.kind==='cabbagepult')this.throwCabbage(p);else if(p.kind==='bloomerang')this.boomerang(p,false,1,0);else this.shoot(p,false);} else this.dropSun(cellX(p.column), rowY(p.row) - 65, this.props.plants.sunflower.SunValue, 'plant');
        }
        if (this.time - p.actionAt >= (shoot ? (p.kind==='cabbagepult'?this.timing.campaign!.cabbageDuration:p.kind==='bloomerang'?this.timing.campaign!.boomerangDuration:this.timing.shootDuration) : this.timing.produceDuration)) p.action = 'idle';
      }
      if (['peashooter','cabbagepult','bloomerang'].includes(p.kind) && p.action === 'idle' && this.time >= p.nextAction && (this.zombies.some(z => z.row === p.row && z.x > cellX(p.column) - 15 && z.x < 1150 && z.hp > 0)||this.graves.some(g=>g.hp>0&&g.row===p.row&&cellX(g.column)>cellX(p.column)))) {
        p.action = 'shoot'; p.actionAt = this.time; p.fired = false;
        const prop=this.props.plants[p.kind];p.nextAction=this.time+(p.kind==='cabbagepult'?prop.ThrowInterval:prop.ShootInterval)+this.random()*(p.kind==='cabbagepult'?prop.ThrowIntervalAdditional:prop.ShootIntervalAdditional);
      }
      if (p.kind === 'sunflower' && p.action === 'idle' && this.time >= p.nextAction) {
        p.action = 'produce'; p.actionAt = this.time; p.fired = false;
        p.nextAction = this.time + this.props.plants.sunflower.ProduceInterval + this.random() * this.props.plants.sunflower.ProduceIntervalAdditional;
      }
      if ((p.kind==='iceburg'||p.kind === 'potatomine' && p.age >= this.props.plants.potatomine.ChargeTime) && p.action==='idle' && this.zombies.some(z => z.hp > 0 && z.row === p.row && Math.abs(z.x - cellX(p.column)) < 38)) {
        p.action='explode';p.actionAt=this.time;p.fired=false;
      }
    }

    for (const pea of this.peas) {
      const oldX = pea.x; pea.x += dt * 360;
      const target = this.zombies.filter(z => z.hp > 0 && z.row === pea.row && z.x - 18 >= oldX - 12 && z.x - 18 <= pea.x + 12).sort((a, b) => a.x - b.x)[0];
      const grave=this.graves.filter(g=>g.hp>0&&g.row===pea.row&&cellX(g.column)-25>=oldX-12&&cellX(g.column)-25<=pea.x+12).sort((a,b)=>a.column-b.column)[0];
      if(grave&&(!target||cellX(grave.column)<target.x)){grave.hp-=pea.damage;this.effect('hit',pea.x,pea.y);pea.x=1300;}
      else if (target) { this.damage(target, pea.damage); this.effect('hit', pea.x, pea.y); pea.x = 1300; }
    }
    this.peas = this.peas.filter(p => p.x < 1200);
    this.tickMissiles(dt);
    for(const grave of this.graves){
      const stage=grave.hp<=0?4:4-Math.floor(grave.hp/this.props.grave.Toughness*4);
      if(stage!==grave.stage){this.effects.push({id:++this.id,kind:'graveHit',x:cellX(grave.column),y:rowY(grave.row),age:0,stage});grave.stage=stage;}
    }
    this.graves=this.graves.filter(g=>g.hp>0);
    for (const z of this.zombies) {
      if(z.hp<=0||z.leap||this.time<z.frozenUntil||(z.entry!=='walk'&&this.time-z.entryAt<(z.entry==='ground'?1.35:1)))continue;
      const target = this.plants.filter(p => p.hp > 0 && p.kind!=='iceburg' && p.action!=='explode' && p.row === z.row && z.x >= cellX(p.column) - 22 && z.x <= cellX(p.column) + 38).sort((a, b) => b.column - a.column)[0];
      z.eating = !!target;
      if (target) { const amount = this.props.zombies[z.kind].EatDPS * dt*(this.time<z.chilledUntil?.5:1), armor = Math.min(target.armor, amount); target.armor -= armor; target.hp -= amount - armor; }
      else if (this.time >= z.absorbUntil) z.x -= (this.time<z.chilledUntil?.5:1)* this.props.zombies[z.kind].WalkSPS * BOARD.cellWidth * dt;
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
      if(z.food)this.pickups.push({id:++this.id,kind:'food',x:z.x,y:rowY(z.row)-45,age:0});
      if(this.level.day===5&&z.kind==='ra'&&!this.sproutDropped){this.sproutDropped=true;this.pickups.push({id:++this.id,kind:'sprout',x:z.x,y:rowY(z.row)-45,age:0});}
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
    for(const p of this.pickups)p.age+=dt;
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
