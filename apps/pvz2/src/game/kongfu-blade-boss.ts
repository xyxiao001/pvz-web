import {EgyptBoss} from './egypt-boss';
import {BOARD,cellX,rowY,type BossAction,type ZombieKind} from './level';
import native from '../../public/assets/kongfu/properties.json';
const prop=native.zombies.kongfu_boss_blade;
export class KongfuBladeBoss extends EgyptBoss {
 chis:{id:number;x:number;row:number}[]=[];
 boomerang:{id:number;x:number;row:number;age:number}|null=null;
 shield=false;
 private cursor=0;
 private restLeft=0;
 private stunned=0;
 private previous:BossAction|null=null;
 private repeatLeft=0;
 private bladesLeft=0;
 private pending:{kind:ZombieKind;row:number;delay:number;food:boolean}[]=[];
 private travel:{x:number;y:number;toX:number;row:number;age:number;death:boolean}|null=null;
 override get rate(){return ['Spawn','DeathStart','DeathIdle','Escape','StunStart','StunLoop','StunEnd'].includes(this.animation)?1:this.current.AnimRateModifier*(this.game.time<this.zombie.chilledUntil?.5:1);}
 override freeze(){if(!this.shield)super.freeze();}
 private change(animation:string){this.animation=animation;this.elapsed=0;this.cursor=0;this.animationSerial++;}
 private rest(){this.restLeft=this.current.MinIdleTime+this.game.random()*(this.current.MaxIdleTime-this.current.MinIdleTime);this.change('Idle');}
 override hit(amount:number){
  if(this.zombie.hp<=0||this.animation==='Spawn'||this.height>0||this.shield)return;
  const floor=this.stages.slice(this.stage+1).reduce((n,s)=>n+s.HitPoints,0);
  this.zombie.hp-=amount*(this.stunned>0?this.current.StunDamageScale:1);
  if(this.zombie.hp>floor)return;
  this.zombie.hp=floor;this.pending=[];this.travel=null;this.repeatLeft=0;this.previous=null;
  if(this.stage===this.stages.length-1){this.chis=[];this.boomerang=null;for(const z of [...this.game.zombies,...this.game.westFinale.allies])if(z!==this.zombie){z.hp=0;z.deathCause='potato';}this.jumpTo(this.game.level.boss!.deathColumn,this.game.level.boss!.deathRow,true);}
  else {this.stage++;this.stunned=this.current.StunTime;this.change('StunStart');}
 }
 private jumpTo(column:number,row:number,death=false){this.travel={x:this.zombie.x,y:this.y,toX:cellX(column),row,age:0,death};this.change(column*BOARD.cellWidth>this.zombie.x-BOARD.left?'LeapStartBack':'LeapStart');}
 private choose(){const g=this.game,choices=this.current.Actions.filter(a=>a.weight>0&&(this.repeatLeft>0?a===this.previous:a!==this.previous));
  let roll=g.random()*choices.reduce((n,a)=>n+a.weight,0);const action=choices.find(a=>(roll-=a.weight)<0)!;
  if(this.repeatLeft===0){this.previous=action;this.repeatLeft=action.repeatMin+Math.floor(g.random()*(action.repeatMax-action.repeatMin+1));}this.repeatLeft--;
  if(action.actionName==='jump'){const rows=[1,2,3,4].filter(r=>r!==this.zombie.row);this.jumpTo(6,rows[Math.floor(g.random()*rows.length)]);}
  else if(action.actionName==='shoot'){
   const plants=g.plants.filter(p=>p.hp>0&&this.covers(p.row)),x=plants.length?Math.max(...plants.map(p=>cellX(p.column))):cellX(-.5);
   this.travel={x:this.zombie.x,y:this.y,toX:x+prop.SmashDistance*.51/2,row:this.zombie.row,age:0,death:false};this.change('AttackStart');
  }else this.change(action.actionName==='summon'?'Summon':action.actionName==='imps'?'Push':'ShieldStart');
 }
 private summonColumn(){const g=this.game,props=this.previous!.summonProps,remaining=this.stages.slice(this.stage+1).reduce((n,s)=>n+s.HitPoints,0),part=1-(this.zombie.hp-remaining)/this.current.HitPoints;
  let points=props.pointMin+part*(props.pointMax-props.pointMin),pool=props.zombieList.filter(k=>g.props.zombies[k].WavePointCost<=points),food=props.plantfoodchance!==undefined&&g.random()<props.plantfoodchance;
  while(pool.length){const kind=pool[Math.floor(g.random()*pool.length)];this.pending.push({kind,row:Math.floor(g.random()*5),delay:g.random(),food});food=false;points-=g.props.zombies[kind].WavePointCost;pool=pool.filter(k=>g.props.zombies[k].WavePointCost<=points);}
 }
 private throwBlade(){this.boomerang={id:this.game.nextEntityId(),x:cellX(-10),row:Math.floor(this.game.random()*5),age:0};this.bladesLeft--;this.game.beach.sounds.push('bossBlade/bmrShootSounds');}
 private smash(){const g=this.game;for(const p of g.plants)if(p.hp>0&&p.action!=='food'&&!p.leap&&this.covers(p.row)&&Math.abs(cellX(p.column)-this.zombie.x)<prop.SmashDistance*.51)p.hp-=prop.SmashDamage*g.future.plantDamageScale(p);g.beach.sounds.push('bossBlade/smashSounds');}
 private cue(name:string){const g=this.game;
  if(name==='leap')this.change('LeapLoop');
  if(name==='attack_move')this.change('AttackLoop');
  if(name==='summon')this.summonColumn();
  if(name==='smash')this.smash();
  if(name==='chi'){for(const row of [this.zombie.row-1,this.zombie.row])this.chis.push({id:g.nextEntityId(),x:this.zombie.x,row});g.beach.sounds.push('bossBlade/chiChargeSounds');}
  if(name==='shield'){this.shield=true;this.zombie.chilledUntil=0;g.beach.sounds.push('bossBlade/shieldSounds');}
  if(name==='shieldStart'){const range=prop.ZombossStages[this.stage].BoomerangCount;this.bladesLeft=Math.round(range.Min+g.random()*(range.Max-range.Min));this.throwBlade();}
  if(name==='shieldEnd')this.shield=false;
  if(name==='dirt'||name==='expl')g.effects.push({id:g.nextEntityId(),kind:name==='expl'?'explode':'ground',x:this.zombie.x,y:this.y,age:0});
 }
 override tick(dt:number){const g=this.game;
  for(const s of this.pending){s.delay-=dt;if(s.delay<=0){const z=g.spawnZombie(s.kind,s.row,cellX(prop.SummonColumn),'ground');z.food=s.food;}}this.pending=this.pending.filter(s=>s.delay>0);
  for(const chi of this.chis){chi.x-=4*BOARD.cellWidth*dt;for(const p of g.plants)if(p.hp>0&&p.row===chi.row&&!p.leap&&Math.abs(cellX(p.column)-chi.x)<30){g.future.pushPlant(p,500);chi.x=cellX(-2);}}
  this.chis=this.chis.filter(c=>c.x>cellX(-1));
  if(this.boomerang){const b=this.boomerang;b.age+=dt;b.x=cellX(-10+28*b.age/prop.ZombossStages[this.stage].BoomerangMovingTime);
   for(const p of g.plants)if(p.hp>0&&p.action!=='food'&&p.row===b.row&&Math.abs(cellX(p.column)-b.x)<BOARD.cellWidth/2)p.hp=0;
   for(const t of g.graves)if(t.hp>0&&t.row===b.row&&Math.abs(cellX(t.column)-b.x)<BOARD.cellWidth/2)t.hp=0;
   if(b.age>=prop.ZombossStages[this.stage].BoomerangMovingTime){if(this.bladesLeft>0)this.throwBlade();else {this.boomerang=null;this.change('ShieldEnd');}}
  }
  if(this.defeated)return;
  const animation=this.animation;this.elapsed+=dt*this.rate;
  if(animation==='LeapLoop'||animation==='AttackLoop'){
   const m=this.travel!;m.age+=dt;const attack=animation==='AttackLoop',t=Math.min(1,m.age/(attack?1:1.5));this.zombie.x=m.x+(m.toX-m.x)*t;this.y=m.y+(rowY(m.row)-m.y)*t;this.height=(attack?200:400)*4*t*(1-t);
   if(t===1){this.zombie.row=m.row;this.change(attack?'AttackEnd':'LeapEnd');if(!attack)this.smash();}return;
  }
  if(animation==='Idle'){this.restLeft-=dt;if(g.plants.some(p=>p.hp>0&&this.covers(p.row)&&Math.abs(cellX(p.column)-this.zombie.x)<prop.SmashDistance*.51))this.change('Smash');else if(this.restLeft<=0)this.choose();return;}
  if(animation==='ShieldLoop')return;
  if(animation==='StunStart')this.stunned-=dt;
  if(animation==='StunLoop'){this.stunned-=dt;if(this.stunned<=0)this.change('StunEnd');return;}
  const timeline=g.props.plantAnimations.bossBlade[animation];
  while(this.cursor<timeline.events.length&&this.elapsed>=timeline.events[this.cursor].at){this.cue(timeline.events[this.cursor++].name);if(this.animation!==animation)return;}
  if(this.elapsed>=timeline.duration){
   if(animation==='StunStart')this.change('StunLoop');
   else if(animation==='ShieldStart')this.change('ShieldLoop');
   else if(animation==='AttackEnd'||animation==='ShieldEnd')this.jumpTo(6,this.zombie.row);
   else if(animation==='LeapEnd'&&this.travel!.death){this.travel=null;this.change('DeathStart');}
   else if(animation==='DeathStart')this.change('DeathIdle');
   else if(animation==='DeathIdle')this.change('Escape');
   else if(animation==='Escape')this.defeated=true;
   else {this.travel=null;this.rest();}
  }
 }
}
