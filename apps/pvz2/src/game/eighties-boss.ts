import {EgyptBoss} from './egypt-boss';
import {cellX,rowY,type BossAction,type ZombieKind} from './level';
import type {Game} from './model';
import native from '../../public/assets/eighties/properties.json';

/** Fixed five-lane stage: summon, drop speakers, charge a lane, then change genre. */
export class EightiesBoss extends EgyptBoss {
 private cursor=0;
 private restLeft=0;
 private stunned=0;
 private shotLeft=0;
 private previous:BossAction|null=null;
 private repeatLeft=0;
 private pending:{kind:ZombieKind;row:number;delay:number;food:boolean}[]=[];
 bandAt=0;
 deathAt:number|null=null;
 constructor(g:Game){super(g);this.zombie.x=cellX(7.6);this.y=rowY(1.667);}
 override covers(_row:number){return true;}
 override get rate(){return 1;}
 private change(animation:string){this.animation=animation;this.elapsed=0;this.cursor=0;this.animationSerial++;}
 private rest(){this.restLeft=this.current.MinIdleTime+this.game.random()*(this.current.MaxIdleTime-this.current.MinIdleTime);}
 private switchJam(){
  const g=this.game,jam=native.zombies.zombossmech_eighties.ZombossStages[this.stage].JamStyle;
  g.eighties.jam=jam;this.change('Idle_'+({jam_punk:'Punk',jam_pop:'Pop',jam_rap:'Rap',jam_8bit:'8bit',jam_metal:'Metal'}[jam]));
  for(let row=0;row<5;row++){const old=g.graves.find(t=>t.row===row&&t.column===6);if(old)g.graves.splice(g.graves.indexOf(old),1);g.eighties.speaker.spawn(row,6);}
  g.future.visual('bossCostume','Play',this.zombie.x,this.y);g.beach.sounds.push('eightiesBoss/sparkSounds');this.rest();
 }
 override hit(amount:number){
  if(this.zombie.hp<=0||this.animation==='Spawn')return;
  const floor=this.stages.slice(this.stage+1).reduce((n,s)=>n+s.HitPoints,0);this.zombie.hp-=amount;
  if(this.zombie.hp>floor)return;
  this.zombie.hp=floor;this.targets=[];this.shotLeft=0;this.pending=[];this.previous=null;this.repeatLeft=0;
  if(this.stage===this.stages.length-1){
   this.stunned=0;this.deathAt=this.game.time;this.game.eighties.speaker.finish();this.game.eighties.arcade.finish();
   for(const z of [...this.game.zombies,...this.game.westFinale.allies])if(z!==this.zombie){z.hp=0;z.deathCause='potato';}
   this.change('DeathStart');
  }else {this.stage++;this.stunned=this.current.StunTime;this.game.beach.sounds.push('eightiesBoss/shakeSounds');}
 }
 private summonColumn(action:BossAction){
  const g=this.game,p=action.summonProps,floor=this.stages.slice(this.stage+1).reduce((n,s)=>n+s.HitPoints,0),part=1-(this.zombie.hp-floor)/this.current.HitPoints;
  let points=p.pointMin+part*(p.pointMax-p.pointMin),pool=p.zombieList.filter(k=>g.props.zombies[k].WavePointCost<=points),food=g.random()<(p.plantfoodchance===undefined?.3:p.plantfoodchance);
  while(pool.length){const kind=pool[Math.floor(g.random()*pool.length)];this.pending.push({kind,row:Math.floor(g.random()*5),delay:g.random(),food});food=false;points-=g.props.zombies[kind].WavePointCost;pool=pool.filter(k=>g.props.zombies[k].WavePointCost<=points);}
 }
 private choose(){
  const g=this.game,choices=this.current.Actions.filter(a=>a.weight>0&&(this.repeatLeft>0?a===this.previous:a!==this.previous));let roll=g.random()*choices.reduce((sum,a)=>sum+a.weight,0);const action=choices.find(a=>(roll-=a.weight)<0)!;
  if(this.repeatLeft===0){this.previous=action;const min=Math.min(action.repeatMin,action.repeatMax),max=Math.max(action.repeatMin,action.repeatMax);this.repeatLeft=min+Math.floor(g.random()*(max-min+1));}this.repeatLeft--;
  if(action.actionName==='summon')this.summonColumn(action);
  if(action.actionName==='rush'){const rows=[0,1,2,3,4].filter(row=>!g.graves.some(t=>t.hp>0&&t.row===row&&t.column===6&&t.kind!=='speaker'));if(rows.length){const row=rows[Math.floor(g.random()*rows.length)],speaker=g.graves.find(t=>t.hp>0&&t.row===row&&t.column===6&&t.kind==='speaker')??g.eighties.speaker.spawn(row,6);g.eighties.speaker.charge(speaker);}}
  if(action.actionName==='shoot'){
   const cells=Array.from({length:5*6},(_,i)=>({row:i%5,column:1+Math.floor(i/5)})).filter(c=>!g.graves.some(t=>t.hp>0&&t.row===c.row&&t.column===c.column));
   if(cells.length){this.targets=[cells[Math.floor(g.random()*cells.length)]];this.shotLeft=2;g.beach.sounds.push('eightiesBoss/worldZombossAimStartSound');}
  }
  this.rest();
 }
 override tick(dt:number){
  const g=this.game;if(this.defeated)return;
  for(const p of this.pending){p.delay-=dt;if(p.delay<=0){const z=g.spawnZombie(p.kind,p.row,cellX(5),'ground');z.food=p.food;}}this.pending=this.pending.filter(p=>p.delay>0);
  if(this.stunned>0){this.stunned-=dt;if(this.stunned<=0)this.switchJam();return;}
  if(this.shotLeft>0){this.shotLeft-=dt;if(this.shotLeft<=0){for(const t of this.targets)g.eighties.speaker.spawn(t.row,t.column);this.targets=[];}}
  const animation=this.animation,timeline=g.props.plantAnimations.eightiesBoss[animation];this.elapsed+=dt;
  while(this.cursor<timeline.events.length&&this.elapsed>=timeline.events[this.cursor].at){
   const name=timeline.events[this.cursor++].name,sounds:Record<string,string>={say_intro:'worldZombossSpawnSaySounds',say_angry:'worldZombossAngrySaySounds',say_rush:'worldZombossRushSaySounds',say_shoot:'worldZombossShootSaySounds',say_jump:'worldZombossLeapSaySounds',jump:'jumpSounds',moonwalk:'moonwalkSounds',mic_drop:'micDropSounds'};
   if(sounds[name])g.beach.sounds.push('eightiesBoss/'+sounds[name]);
   if(name==='escape_trigger'){g.future.visual('bossCostume','Play',this.zombie.x,this.y);g.beach.sounds.push('eightiesBoss/sparkSounds');}
  }
  if(animation.startsWith('Idle_')){this.restLeft-=dt;if(this.restLeft<=0&&this.shotLeft<=0)this.choose();if(this.elapsed>=timeline.duration){this.elapsed-=timeline.duration;this.cursor=0;}return;}
  if(this.elapsed>=timeline.duration){if(animation==='Spawn'){this.bandAt=g.time;this.switchJam();}else if(animation==='DeathStart')this.change('DeathIdle');else if(animation==='DeathIdle')this.change('Escape');else if(animation==='Escape')this.defeated=true;}
 }
}
