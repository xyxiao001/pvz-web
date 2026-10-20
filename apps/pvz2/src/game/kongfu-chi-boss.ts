import {EgyptBoss} from './egypt-boss';
import {BOARD,cellX,rowY,type BossAction,type ZombieKind} from './level';
import type {Plant} from './model';
import {rackHP} from './kongfu-combat';
import native from '../../public/assets/kongfu/properties.json';
const prop=native.zombies.kongfu_boss_chi;
export class KongfuChiBoss extends EgyptBoss {
 shieldLeft=0;
 rayLength=0;
 stuns=new Map<number,number>();
 chis:{id:number;x:number;row:number}[]=[];
 impacts:{id:number;row:number;column:number;age:number}[]=[];
 private cursor=0;
 private restLeft=0;
 private stunned=0;
 private skillLeft=0;
 private pullAt=0;
 private previous:BossAction|null=null;
 private repeatLeft=0;
 private pending:{kind:ZombieKind;row:number;delay:number;food:boolean}[]=[];
 private travel:{x:number;y:number;toX:number;row:number;age:number;death:boolean}|null=null;
 override get rate(){return ['Spawn','DeathStart','DeathIdle','Escape','StunStart','StunLoop','StunEnd'].includes(this.animation)?1:this.current.AnimRateModifier*(this.game.time<this.zombie.chilledUntil?.5:1);}
 override freeze(){if(this.shieldLeft<=0)super.freeze();}
 plantStunned(p:Plant){return this.game.time<this.stuns.get(p.id)!&&p.action!=='food';}
 private change(animation:string){this.animation=animation;this.elapsed=0;this.cursor=0;this.animationSerial++;}
 private rest(){this.restLeft=this.current.MinIdleTime+this.game.random()*(this.current.MaxIdleTime-this.current.MinIdleTime);this.change('Idle');}
 override hit(amount:number){
  if(this.zombie.hp<=0||this.animation==='Spawn'||this.animation==='LeapStart'||this.height>0||this.shieldLeft>0)return;
  const floor=this.stages.slice(this.stage+1).reduce((n,s)=>n+s.HitPoints,0);
  this.zombie.hp-=amount*(this.stunned>0?this.current.StunDamageScale:1);
  if(this.zombie.hp>floor)return;
  this.zombie.hp=floor;this.targets=[];this.pending=[];this.travel=null;this.repeatLeft=0;this.previous=null;this.skillLeft=0;
  if(this.stage===this.stages.length-1){this.missiles=[];this.chis=[];this.stuns.clear();for(const z of [...this.game.zombies,...this.game.westFinale.allies])if(z!==this.zombie){z.hp=0;z.deathCause='potato';}this.jumpTo(this.game.level.boss!.deathColumn,this.game.level.boss!.deathRow,true);}
  else {this.stage++;this.stunned=this.current.StunTime;this.change('StunStart');}
 }
 private jumpTo(column:number,row:number,death=false){this.travel={x:this.zombie.x,y:this.y,toX:cellX(column),row,age:0,death};this.change('LeapStart');}
 private choose(){const g=this.game,choices=this.current.Actions.filter(a=>a.weight>0&&(this.repeatLeft>0?a===this.previous:a!==this.previous));
  let roll=g.random()*choices.reduce((n,a)=>n+a.weight,0);const action=choices.find(a=>(roll-=a.weight)<0)!;
  if(this.repeatLeft===0){this.previous=action;this.repeatLeft=action.repeatMin+Math.floor(g.random()*(action.repeatMax-action.repeatMin+1));}this.repeatLeft--;
  if(action.actionName==='jump'){const rows=[1,2,3,4].filter(r=>r!==this.zombie.row);this.jumpTo(6,rows[Math.floor(g.random()*rows.length)]);}
  else if(action.actionName==='shoot'){this.aim();this.change('Shoot');}
  else if(action.actionName==='roar'){for(const p of g.plants)this.stuns.set(p.id,g.time+2.6);for(const z of [...g.zombies,...g.westFinale.allies])if(z!==this.zombie)z.stunnedUntil=g.time+2.6;this.change('Roar');}
  else this.change(action.actionName==='summon'?'Summon':action.actionName==='rush'?'RushStart':'HoleStart');
 }
 private summonColumn(){const g=this.game,props=this.previous!.summonProps,remaining=this.stages.slice(this.stage+1).reduce((n,s)=>n+s.HitPoints,0),part=1-(this.zombie.hp-remaining)/this.current.HitPoints;
  let points=props.pointMin+part*(props.pointMax-props.pointMin),pool=props.zombieList.filter(k=>g.props.zombies[k].WavePointCost<=points),food=props.plantfoodchance!==undefined&&g.random()<props.plantfoodchance;
  while(pool.length){const kind=pool[Math.floor(g.random()*pool.length)];this.pending.push({kind,row:Math.floor(g.random()*5),delay:g.random(),food});food=false;points-=g.props.zombies[kind].WavePointCost;pool=pool.filter(k=>g.props.zombies[k].WavePointCost<=points);}
 }
 private cue(name:string){const g=this.game,stage=prop.ZombossStages[this.stage];
  const sounds:Record<string,string>={taichi_blast:'taichiBlastSounds',shoot_launch:'launchSounds',shoot_charge:'shootChargeSounds',shoot_charge2:'shootCharge2Sounds',strengthen:'strengthenSounds',taichi:'taichiSounds',bounce:'bounceSounds',roar:'roarSounds',star:'starSounds',cough:'coughSounds',cough_long:'coughLongSounds',woosh:'wooshSounds',swing:'swingSounds',shake:'shakeSounds',expl:'fleeSounds',magic:'magicSounds',portal:'blackholeOpenSounds',blackhole:'blackholeOpenSounds'};
  if(sounds[name])g.beach.sounds.push('bossChi/'+sounds[name]);
  if(name==='shoot')this.fire();
  if(name==='summon')this.summonColumn();
  if(name==='summon_abbot_chi'&&this.stage===2&&this.zombie.hp>0)this.pending.push({kind:'abbot_chi',row:this.zombie.row-Math.floor(g.random()*2),delay:.5,food:false});
  if(name==='shield'){this.shieldLeft=stage.ShieldLifeSpan;this.zombie.chilledUntil=0;g.beach.sounds.push('bossChi/shieldSounds');}
  if(name==='smash')for(const row of [this.zombie.row-1,this.zombie.row])this.chis.push({id:g.nextEntityId(),x:this.zombie.x-50,row});
  if(name==='rush'){this.skillLeft=stage.RushDuration;this.change('RushLoop');g.beach.sounds.push('bossChi/rayStartSounds');}
  if(name==='absorb_begin'){this.skillLeft=stage.AbsorbDuration;this.pullAt=0;this.change('HoleLoop');}
  if(name==='roar'){for(const t of g.graves)t.hp-=1000;for(const p of g.plants)if(p.action!=='food')this.stuns.set(p.id,g.time+stage.RoarStunDuration);for(const z of g.westFinale.allies)z.stunnedUntil=g.time+stage.RoarStunDuration;}
 }
 protected override impact(m:{row:number;column:number}){const g=this.game,p=native.projectiles.kongfu_boss_chi_rack;
  for(const plant of g.plants)if(plant.hp>0&&plant.action!=='food'&&plant.row===m.row&&Math.abs(plant.column-m.column)<=1)plant.hp-=(plant.column===m.column?p.Damage:p.SplashDamage[0].Damage)*g.future.plantDamageScale(plant);
  const kind=p.RackTypes[Math.floor(g.random()*p.RackTypes.length)],old=g.graves.find(t=>t.row===m.row&&t.column===m.column);
  if(old){old.kind=kind;old.hp=rackHP(kind);}else g.graves.push({id:g.nextEntityId(),row:m.row,column:m.column,hp:rackHP(kind),stage:0,kind});
  this.impacts.push({...m,id:g.nextEntityId(),age:0});g.beach.sounds.push('chiBossRack/PopSound');
 }
 override tick(dt:number){const g=this.game,stage=prop.ZombossStages[this.stage];
  if(this.shieldLeft>0){this.shieldLeft-=dt;this.zombie.chilledUntil=0;this.zombie.frozenUntil=0;if(this.shieldLeft<=0)g.beach.sounds.push('bossChi/shieldEndSounds');}
  for(const s of this.pending){s.delay-=dt;if(s.delay<=0){const z=g.spawnZombie(s.kind,s.row,cellX(prop.SummonColumn),'ground');z.food=s.food;}}this.pending=this.pending.filter(s=>s.delay>0);
  for(const m of this.missiles){m.age+=dt;if(m.age-dt<1.5&&m.age>=1.5)this.impact(m);}this.missiles=this.missiles.filter(m=>m.age<1.5);
  for(const hit of this.impacts)hit.age+=dt;this.impacts=this.impacts.filter(h=>h.age<g.props.plantAnimations.chiBossRackHit.Play.duration);
  for(const c of this.chis){c.x-=4*BOARD.cellWidth*dt;const p=g.plants.find(p=>p.hp>0&&p.row===c.row&&!p.leap&&Math.abs(cellX(p.column)-c.x)<30);if(p){if(p.action!=='food')p.hp-=native.projectiles.kongfu_boss_chi_chi.Damage*g.future.plantDamageScale(p);g.future.pushPlant(p,0);c.x=cellX(-2);}}this.chis=this.chis.filter(c=>c.x>cellX(-1));
  if(this.defeated)return;
  const animation=this.animation;this.elapsed+=dt*this.rate;
  if(animation==='LeapLoop'){const m=this.travel!;m.age+=dt;const t=Math.min(1,m.age/1.5);this.zombie.x=m.x+(m.toX-m.x)*t;this.y=m.y+(rowY(m.row)-m.y)*t;this.height=400*4*t*(1-t);if(t===1){this.zombie.row=m.row;this.change('LeapEnd');}return;}
  if(animation==='Idle'){this.restLeft-=dt;if(g.plants.some(p=>p.hp>0&&this.covers(p.row)&&Math.abs(cellX(p.column)-this.zombie.x)<150*.51))this.change('Smash');else if(this.restLeft<=0)this.choose();return;}
  if(animation==='RushLoop'){
   const plants=g.plants.filter(p=>p.hp>0&&this.covers(p.row)&&cellX(p.column)<this.zombie.x),zombies=[...g.zombies,...g.westFinale.allies].filter(z=>z!==this.zombie&&z.hp>0&&this.covers(z.row)&&z.x<this.zombie.x);
   const front=Math.max(cellX(-1),...plants.map(p=>cellX(p.column)),...zombies.map(z=>z.x));this.rayLength=Math.max(0,this.zombie.x-60-front);
   for(const p of plants)if(cellX(p.column)>=front-30&&p.action!=='food')p.hp-=stage.RushDPS*dt*g.future.plantDamageScale(p);
   for(const z of zombies)if(z.x>=front-30){g.damage(z,stage.RushDPS*dt);z.x-=stage.RushSPS*BOARD.cellWidth*dt;}
   this.skillLeft-=dt;if(this.skillLeft<=0){g.beach.sounds.push('bossChi/rayEndSounds');this.change('RushEnd');}return;
  }
  if(animation==='HoleLoop'){
   this.skillLeft-=dt;if(g.time>=this.pullAt){this.pullAt=g.time+.75;const column=Math.round((this.zombie.x-BOARD.left)/BOARD.cellWidth-.5)-2;for(const row of [this.zombie.row-1,this.zombie.row]){for(const p of g.plants)if(p.hp>0&&p.row===row&&p.column===column&&p.kind!=='turnip'&&p.action!=='food'&&!p.leap&&!g.props.plants[p.kind].CannotBePushedByFootballMech)p.hp=0;g.kongfu.turnip.chiLine(row,column,.75);}}
   if(this.skillLeft<=0)this.change('HoleEnd');return;
  }
  if(animation==='StunStart')this.stunned-=dt;
  if(animation==='StunLoop'){this.stunned-=dt;if(this.stunned<=0)this.change('StunEnd');return;}
  const timeline=g.props.plantAnimations.bossChi[animation];
  while(this.cursor<timeline.events.length&&this.elapsed>=timeline.events[this.cursor].at){this.cue(timeline.events[this.cursor++].name);if(this.animation!==animation)return;}
  if(this.elapsed>=timeline.duration){
   if(animation==='LeapStart')this.change('LeapLoop');
   else if(animation==='StunStart')this.change('StunLoop');
   else if(animation==='LeapEnd'&&this.travel!.death){this.travel=null;this.change('DeathStart');}
   else if(animation==='DeathStart')this.change('DeathIdle');
   else if(animation==='DeathIdle')this.change('Escape');
   else if(animation==='Escape')this.defeated=true;
   else if(animation==='RushEnd'||animation==='HoleEnd'){const rows=[1,2,3,4].filter(r=>r!==this.zombie.row);this.jumpTo(6,rows[Math.floor(g.random()*rows.length)]);}
   else {this.travel=null;this.rest();}
  }
 }
}
