import {EgyptBoss} from './egypt-boss';
import {cellX,rowY,type BossAction,type ZombieKind} from './level';
import native from '../../public/assets/kongfu/properties.json';

export class KongfuBoss extends EgyptBoss {
 blasts:{id:number;row:number;column:number;big:boolean;age:number}[]=[];
 private cursor=0;
 private restLeft=0;
 private stunned=0;
 private previous:BossAction|null=null;
 private repeatLeft=0;
 private pending:{kind:ZombieKind;row:number;column:number;delay:number;food:boolean;lane:boolean}[]=[];
 private travel:{x:number;y:number;toX:number;row:number;age:number;death:boolean}|null=null;
 override get rate(){return ['Spawn','DeathStart','DeathIdle','Escape','StunStart','StunLoop','StunEnd'].includes(this.animation)?1:this.current.AnimRateModifier;}
 override freeze(){}
 private change(animation:string){this.animation=animation;this.elapsed=0;this.cursor=0;this.animationSerial++;}
 private rest(){this.restLeft=this.current.MinIdleTime+this.game.random()*(this.current.MaxIdleTime-this.current.MinIdleTime);this.change(this.game.random()<.5?'Idle2':'Idle');}
 override hit(amount:number){
  if(this.zombie.hp<=0||this.animation==='Spawn'||this.height>0)return;
  const floor=this.stages.slice(this.stage+1).reduce((n,s)=>n+s.HitPoints,0);
  this.zombie.hp-=amount*(this.stunned>0?this.current.StunDamageScale:1);
  if(this.zombie.hp>floor)return;
  this.zombie.hp=floor;this.targets=[];this.pending=[];this.travel=null;this.repeatLeft=0;this.previous=null;
  if(this.stage===this.stages.length-1){this.missiles=[];for(const z of [...this.game.zombies,...this.game.westFinale.allies])if(z!==this.zombie){z.hp=0;z.deathCause='potato';}this.jumpTo(this.game.level.boss!.deathColumn,this.game.level.boss!.deathRow,true);}
  else {this.stage++;this.stunned=this.current.StunTime;this.change('StunStart');}
 }
 private jumpTo(column:number,row:number,death=false){this.travel={x:this.zombie.x,y:this.y,toX:cellX(column),row,age:0,death};this.change('LeapStart');}
 private choose(){const g=this.game,choices=this.current.Actions.filter(a=>a.weight>0&&(this.repeatLeft>0?a===this.previous:a!==this.previous));
  let roll=g.random()*choices.reduce((n,a)=>n+a.weight,0);const action=choices.find(a=>(roll-=a.weight)<0)!;
  if(this.repeatLeft===0){this.previous=action;this.repeatLeft=action.repeatMin+Math.floor(g.random()*(action.repeatMax-action.repeatMin+1));}this.repeatLeft--;
  if(action.actionName==='jump'){const rows=[1,2,3,4].filter(r=>r!==this.zombie.row);this.jumpTo(6,rows[Math.floor(g.random()*rows.length)]);}
  else if(action.actionName==='shoot'){this.aim();this.change('Shoot');}
  else this.change(action.actionName==='summon'?'Summon':action.actionName==='imps'?'Throw':'Rocket');
 }
 private summonColumn(){const g=this.game,props=this.previous!.summonProps,remaining=this.stages.slice(this.stage+1).reduce((n,s)=>n+s.HitPoints,0),part=1-(this.zombie.hp-remaining)/this.current.HitPoints;
  let points=props.pointMin+part*(props.pointMax-props.pointMin),pool=props.zombieList.filter(k=>g.props.zombies[k].WavePointCost<=points),food=props.plantfoodchance!==undefined&&g.random()<props.plantfoodchance;
  while(pool.length){const kind=pool[Math.floor(g.random()*pool.length)];this.pending.push({kind,row:Math.floor(g.random()*5),column:native.zombies.kongfu_boss_explode.SummonColumn,delay:g.random(),food,lane:false});food=false;points-=g.props.zombies[kind].WavePointCost;pool=pool.filter(k=>g.props.zombies[k].WavePointCost<=points);}
 }
 private cue(name:string){const g=this.game,stage=native.zombies.kongfu_boss_explode.ZombossStages[this.stage];
  if(name==='leap')this.change('LeapLoop');
  if(name==='shoot')this.fire();
  if(name==='summon')this.summonColumn();
  if(name==='rocket')for(let i=0;i<stage.RocketImpCount.Min+Math.floor(g.random()*(stage.RocketImpCount.Max-stage.RocketImpCount.Min+1));i++)this.pending.push({kind:'kongfu_rocket_imp',row:Math.floor(g.random()*5),column:10,delay:g.random()*2,food:false,lane:true});
  if(name==='imp'){
   const count=stage.ThrewImpCount.Min+Math.floor(g.random()*(stage.ThrewImpCount.Max-stage.ThrewImpCount.Min+1));
   for(let i=0;i<count;i++){const row=Math.floor(g.random()*5),column=8-(stage.ThrewImpColumn.Min+g.random()*(stage.ThrewImpColumn.Max-stage.ThrewImpColumn.Min)),z=g.spawnZombie('kongfu_rocket_imp',row,this.zombie.x,'ground');z.entry='walk';z.kongfu!.rocket=false;z.leap={fromX:this.zombie.x,fromY:this.y-120,toX:cellX(column),toRow:row,at:g.time,duration:.8+g.random()*.5};}
  }
  if(name==='dirt'||name==='expl')g.effects.push({id:g.nextEntityId(),kind:name==='expl'?'explode':'ground',x:this.zombie.x,y:this.y,age:0});
 }
 protected override impact(m:{row:number;column:number}){const g=this.game,big=g.plants.some(p=>p.hp>0&&p.row===m.row&&p.column===m.column),radius=big?1:0;
  for(const p of g.plants)if(p.hp>0&&p.action!=='food'&&!p.leap&&Math.abs(p.row-m.row)<=radius&&Math.abs(p.column-m.column)<=radius)p.hp=0;
  for(const z of g.westFinale.allies)if(z.hp>0&&Math.abs(z.row-m.row)<=radius&&Math.abs(z.x-cellX(m.column))<(radius+.5)*82)g.damage(z,native.projectiles.kongfu_boss_explode_bomb.Damage);
  this.blasts.push({...m,id:g.nextEntityId(),big,age:0});g.beach.sounds.push('kongfuBossBomb/'+(big?'explodeBigSounds':'explodeSmallSounds'));
 }
 override tick(dt:number){const g=this.game;
  for(const s of this.pending){s.delay-=dt;if(s.delay<=0){const z=g.spawnZombie(s.kind,s.row,cellX(s.column),s.lane?'walk':'ground');z.food=s.food;}}
  this.pending=this.pending.filter(s=>s.delay>0);
  for(const b of this.blasts)b.age+=dt;this.blasts=this.blasts.filter(b=>b.age<native.plantAnimations[b.big?'kongfuBombBig':'kongfuBombSmall'].Play.duration);
  for(const m of this.missiles){m.age+=dt;if(m.age-dt<1.5&&m.age>=1.5)this.impact(m);}this.missiles=this.missiles.filter(m=>m.age<1.5);
  if(this.defeated)return;
  const animation=this.animation;this.elapsed+=dt*this.rate;
  if(animation==='LeapLoop'){
   const m=this.travel!;m.age+=dt;const t=Math.min(1,m.age/1.5);this.zombie.x=m.x+(m.toX-m.x)*t;this.y=m.y+(rowY(m.row)-m.y)*t;this.height=400*4*t*(1-t);
   if(t===1){this.zombie.row=m.row;this.change('LeapEnd');for(const p of g.plants)if(p.action!=='food'&&this.covers(p.row)&&Math.abs(cellX(p.column)-this.zombie.x)<82)p.hp=0;}return;
  }
  if(animation==='Idle'||animation==='Idle2'){this.restLeft-=dt;if(this.restLeft<=0)this.choose();return;}
  if(animation==='StunStart')this.stunned-=dt;
  if(animation==='StunLoop'){this.stunned-=dt;if(this.stunned<=0)this.change('StunEnd');return;}
  const timeline=g.props.plantAnimations.boss[animation];
  while(this.cursor<timeline.events.length&&this.elapsed>=timeline.events[this.cursor].at){this.cue(timeline.events[this.cursor++].name);if(this.animation!==animation)return;}
  if(this.elapsed>=timeline.duration){
   if(animation==='StunStart')this.change('StunLoop');
   else if(animation==='LeapEnd'&&this.travel!.death){this.travel=null;this.change('DeathStart');}
   else if(animation==='DeathStart')this.change('DeathIdle');
   else if(animation==='DeathIdle')this.change('Escape');
   else if(animation==='Escape')this.defeated=true;
   else {this.travel=null;this.rest();}
  }
 }
}
