import {EgyptBoss} from './egypt-boss';
import {BOARD,cellX,rowY,type BossAction,type ZombieKind} from './level';
import type {Game} from './model';

/** Dino mech walks between two-lane positions and sweeps lasers without charging. */
export class DinoBoss extends EgyptBoss {
 cracks:{id:number;row:number;column:number;at:number;until:number}[]=[];
 flames:{id:number;row:number;column:number;until:number;hit:Set<number>}[]=[];
 laserColumn:number|null=null;
 eyes=false;
 private cursor=0;
 private restLeft=0;
 private stunned=0;
 private rushAge=0;
 private rushHit=0;
 private previous:BossAction|null=null;
 private repeatLeft=0;
 private motion:{x:number;y:number;column:number;row:number;age:number;duration:number;death:boolean}|null=null;
 private pending:{kind:ZombieKind;row:number;column:number;at:number;food:boolean}[]=[];
 constructor(g:Game){super(g);this.zombie.x=cellX(7);}
 override get rate(){return ['Spawn','DeathStart','DeathIdle','Escape','StunStart','StunLoop','StunEnd'].includes(this.animation)?1:this.current.AnimRateModifier*(this.game.time<this.zombie.chilledUntil?.5:1);}
 private change(animation:string){this.animation=animation;this.elapsed=0;this.cursor=0;this.animationSerial++;}
 private rest(){this.change('Idle');this.restLeft=this.current.MinIdleTime+this.game.random()*(this.current.MaxIdleTime-this.current.MinIdleTime);}
 private move(column:number,row:number,duration:number,death=false){this.change('Idle');this.motion={x:this.zombie.x,y:this.y,column,row,age:0,duration,death};}
 private stop(){this.motion=null;this.targets=[];this.laserColumn=null;this.eyes=false;this.stunned=this.current.StunTime;this.zombie.x+=BOARD.cellWidth*this.current.StunStaggerBackMovement;this.change('StunStart');}
 override hit(amount:number){
  if(this.zombie.hp<=0||this.animation==='Spawn')return;
  const floor=this.stages.slice(this.stage+1).reduce((sum,s)=>sum+s.HitPoints,0);
  this.zombie.hp-=amount*(this.stunned>0?this.current.StunDamageScale:1);
  if(this.zombie.hp<=floor){
   this.zombie.hp=floor;this.pending=[];this.targets=[];this.laserColumn=null;this.eyes=false;this.previous=null;this.repeatLeft=0;
   if(this.stage===this.stages.length-1){this.stunned=0;this.move(this.game.level.boss!.deathColumn,this.game.level.boss!.deathRow,3,true);}
   else {this.stage++;this.stop();}
  }else if(this.laserColumn!==null){this.rushHit+=amount;if(this.rushHit>=1000)this.stop();}
 }
 private choose(){
  const g=this.game;
  if(Math.abs(this.zombie.x-cellX(6))>1){this.move(6,1+Math.floor(g.random()*4),3);return;}
  const choices=this.current.Actions.filter(a=>a.weight>0&&(this.repeatLeft>0?a===this.previous:a!==this.previous&&(a.actionName!=='rush'||g.plants.some(p=>p.hp>0&&this.covers(p.row)))));
  let roll=g.random()*choices.reduce((n,a)=>n+a.weight,0);const action=choices.find(a=>(roll-=a.weight)<0)!;
  if(this.repeatLeft===0){this.previous=action;this.repeatLeft=action.repeatMin+Math.floor(g.random()*(action.repeatMax-action.repeatMin+1));}this.repeatLeft--;
  if(action.actionName==='walk'){const rows=[this.zombie.row-1,this.zombie.row+1].filter(r=>r>=1&&r<=4);this.move(6,rows[Math.floor(g.random()*rows.length)],140/30);}
  else if(action.actionName==='summon')this.change('Summon');
  else if(action.actionName==='shoot'){this.aim();g.beach.sounds.push('boss/worldZombossAimStartSound');this.change('Shoot');}
  else this.change('RushStart');
 }
 private summonColumn(){
  const g=this.game,p=this.previous!.summonProps,floor=this.stages.slice(this.stage+1).reduce((n,s)=>n+s.HitPoints,0),part=1-(this.zombie.hp-floor)/this.current.HitPoints;
  let points=p.pointMin+part*(p.pointMax-p.pointMin),pool=p.zombieList.filter(k=>g.props.zombies[k].WavePointCost<=points),food=g.random()<.3;
  const row=Math.floor(g.random()*5),column=5+(p.dinoType?p.columnOffset!:0);
  if(p.dinoType)g.dino.add({kind:p.dinoType,row,delay:0});
  while(pool.length){const kind=pool[Math.floor(g.random()*pool.length)];this.pending.push({kind,row:p.dinoType?row:Math.floor(g.random()*5),column,at:g.time+g.random(),food});food=false;points-=g.props.zombies[kind].WavePointCost;pool=pool.filter(k=>g.props.zombies[k].WavePointCost<=points);}
 }
 protected override aim(){
  const g=this.game,count=this.current.MissileCount!,cells=Array.from({length:30},(_,i)=>({row:i%5,column:Math.floor(i/5)}));this.targets=[];
  const total=count.Min+Math.floor(g.random()*(count.Max-count.Min+1));
  while(this.targets.length<total){const occupied=cells.filter(c=>g.plants.some(p=>p.hp>0&&p.row===c.row&&p.column===c.column)),pool=occupied.length&&g.random()>.5?occupied:cells,t=pool[Math.floor(g.random()*pool.length)];this.targets.push(t);cells.splice(cells.indexOf(t),1);}
 }
 private crack(row:number,column:number,duration:number){
  const g=this.game,old=this.cracks.find(c=>c.row===row&&c.column===column);
  if(old)old.until=g.time+duration;else this.cracks.push({id:g.nextEntityId(),row,column,at:g.time,until:g.time+duration});
  for(const p of g.plants)if(p.hp>0&&p.row===row&&p.column===column&&p.action!=='food')p.hp=0;
 }
 protected override impact(m:{row:number;column:number}){
  const g=this.game,p=g.props.projectiles.zomboss_missile_dino;
  for(const plant of g.plants)if(plant.row===m.row&&Math.abs(plant.column-m.column)<=1&&plant.action!=='food')plant.hp-=plant.column===m.column?p.Damage:p.SplashDamage[0].Damage!;
  this.crack(m.row,m.column,10);g.beach.sounds.push('bossMissile/PopSound');
 }
 private sweep(column:number){
  const g=this.game;
  for(const row of [this.zombie.row-1,this.zombie.row]){this.crack(row,column,4);this.flames.push({id:g.nextEntityId(),row,column,until:g.time+4,hit:new Set()});}
 }
 private cue(name:string){
  if(name==='summon')this.summonColumn();
  if(name==='shoot')this.fire();
  if(name==='eyePar')this.eyes=true;
  if(name==='rush'){this.laserColumn=6;this.rushAge=0;this.rushHit=0;}
  if(name==='Idle'&&this.animation!=='Idle'){
   if(this.animation==='RushEnd'||this.animation==='StunEnd')this.move(6,1+Math.floor(this.game.random()*4),3);
   else this.rest();
  }
 }
 override tick(dt:number){
  const g=this.game;
  for(const m of this.missiles){m.age+=dt;if(m.age-dt<1.5&&m.age>=1.5)this.impact(m);}
  this.missiles=this.missiles.filter(m=>m.age<1.5+g.props.plantAnimations.bossMissileImpact.Play.duration);
  this.cracks=this.cracks.filter(c=>g.time<c.until);this.flames=this.flames.filter(f=>g.time<f.until);
  for(const f of this.flames)for(const z of [...g.zombies,...g.westFinale.allies])if(z!==this.zombie&&z.hp>0&&z.row===f.row&&Math.abs(z.x-cellX(f.column))<41&&!f.hit.has(z.id)){g.damage(z,3600,'potato');f.hit.add(z.id);}
  if(this.defeated)return;
  for(const p of this.pending)if(g.time>=p.at){const z=g.spawnZombie(p.kind,p.row,cellX(p.column),'ground');z.food=p.food;}
  this.pending=this.pending.filter(p=>g.time<p.at);
  if(this.motion){
   const m=this.motion;m.age+=dt*(m.duration===3?1:this.rate);const t=Math.min(1,m.age/m.duration),ease=t<.5?2*t*t:1-(-2*t+2)**2/2;this.zombie.x=m.x+(cellX(m.column)-m.x)*ease;this.y=m.y+(rowY(m.row)-m.y)*ease;
   if(t===1){this.zombie.row=m.row;this.motion=null;if(m.death){for(const z of [...g.zombies,...g.westFinale.allies])if(z!==this.zombie){z.hp=0;z.deathCause='potato';}this.change('DeathStart');}else this.rest();}return;
  }
  if(this.laserColumn!==null){const before=this.laserColumn;this.rushAge+=dt;this.laserColumn=6*Math.max(0,1-this.rushAge/3);for(let c=Math.floor(this.laserColumn);c<Math.floor(before);c++)this.sweep(c);if(this.rushAge>=3){this.laserColumn=null;this.eyes=false;this.change('RushEnd');}}
  const animation=this.animation,timeline=g.props.plantAnimations.boss[animation];this.elapsed+=dt*this.rate;
  if(animation==='Idle'){this.restLeft-=dt;if(this.restLeft<=0)this.choose();return;}
  if(animation==='StunStart')this.stunned-=dt;
  if(animation==='StunLoop'){this.stunned-=dt;if(this.stunned<=0)this.change('StunEnd');return;}
  while(this.cursor<timeline.events.length&&this.elapsed>=timeline.events[this.cursor].at){this.cue(timeline.events[this.cursor++].name);if(this.animation!==animation)return;}
  if(this.elapsed>=timeline.duration){
   if(animation==='StunStart')this.change('StunLoop');
   else if(animation==='RushStart')this.change('RushLoop');
   else if(animation==='RushLoop'){this.elapsed-=timeline.duration;this.cursor=0;}
   else if(animation==='DeathStart')this.change('DeathIdle');
   else if(animation==='DeathIdle')this.change('Escape');
   else if(animation==='Escape')this.defeated=true;
   else this.rest();
  }
 }
}
