import {EgyptBoss} from './egypt-boss';
import {BOARD,cellX,rowY,type BossAction,type ZombieKind} from './level';
import type {Game,Zombie} from './model';
import native from '../../public/assets/sky/properties.json';

/** Sky mech actions use the original three stages and skeleton event times. */
export class SkyBoss extends EgyptBoss {
 shipped=false;
 storms:{id:number;x:number;row:number;deadAt:number|null;hits:Set<number>}[]=[];
 shots:{id:number;x:number;y:number;vx:number;vy:number}[]=[];
 batteries=new Map<number,{partner:Zombie|null;next:number}>();
 private cursor=0;
 private restLeft=0;
 private stunLeftSky=0;
 private previous:BossAction|null=null;
 private repeatLeft=0;
 private rushDamageSky=0;
 private barrageAge:number|null=null;
 private barrageSent=0;
 private motion:{x:number;y:number;column:number;row:number;age:number;duration:number;after:'idle'|'stab'|'death'}|null=null;
 private pending:{kind:ZombieKind;row:number;column:number;at:number;food:boolean}[]=[];
 override get rate(){return ['Spawn','Trans','DeathStart','DeathIdle','Escape'].includes(this.animation)||this.animation.startsWith('Stun')?1:this.current.AnimRateModifier*(this.game.time<this.zombie.chilledUntil?.5:1);}
 private change(animation:string){this.animation=animation;this.elapsed=0;this.cursor=0;this.animationSerial++;}
 private rest(){this.change(this.shipped?'IdleShip':'Idle');this.restLeft=this.current.MinIdleTime+this.game.random()*(this.current.MaxIdleTime-this.current.MinIdleTime);}
 private move(column:number,row:number,duration:number,after:'idle'|'stab'|'death'='idle'){
  this.motion={x:this.zombie.x,y:this.y,column,row,age:0,duration,after};this.change(after==='stab'?'ShootLoop':this.shipped?'IdleShip':'Jump');
 }
 private stop(){this.motion=null;this.targets=[];this.barrageAge=null;this.stunLeftSky=this.current.StunTime;this.rushDamageSky=0;this.zombie.x+=BOARD.cellWidth*this.current.StunStaggerBackMovement;this.change(this.shipped?'StunStartShip':'StunStart');}
 override hit(amount:number){
  if(this.zombie.hp<=0||this.animation==='Spawn')return;
  const floor=this.stages.slice(this.stage+1).reduce((sum,s)=>sum+s.HitPoints,0);
  this.zombie.hp-=amount*(this.stunLeftSky>0?this.current.StunDamageScale:1);
  if(this.zombie.hp<=floor){
   this.zombie.hp=floor;this.pending=[];this.targets=[];this.barrageAge=null;this.previous=null;this.repeatLeft=0;
   if(this.stage===this.stages.length-1){this.stunLeftSky=0;this.move(this.game.level.boss!.deathColumn,this.game.level.boss!.deathRow,1.5,'death');}
   else {this.stage++;this.stop();}
  }else if(this.barrageAge!==null){this.rushDamageSky+=amount;if(this.rushDamageSky>=400)this.stop();}
 }
 private choose(){
  const g=this.game;
  if(Math.abs(this.zombie.x-cellX(6))>1){this.move(6,1+Math.floor(g.random()*4),this.shipped?1.5:3);return;}
  const eligible=this.current.Actions.filter(a=>a.weight>0&&(this.shipped||!['rush2','shoot'].includes(a.actionName)||g.plants.some(p=>p.hp>0))&&(a.actionName!=='rush'||g.plants.some(p=>p.hp>0&&p.row===this.zombie.row)));
  if(this.previous&&!eligible.includes(this.previous))this.repeatLeft=0;
  const choices=eligible.filter(a=>this.repeatLeft>0?a===this.previous:a!==this.previous);
  let roll=g.random()*choices.reduce((n,a)=>n+a.weight,0);const action=choices.find(a=>(roll-=a.weight)<0)!;
  if(this.repeatLeft===0){this.previous=action;this.repeatLeft=action.repeatMin+Math.floor(g.random()*(action.repeatMax-action.repeatMin+1));}this.repeatLeft--;
  if(action.actionName==='walk'){const rows=[this.zombie.row-1,this.zombie.row+1].filter(r=>r>=1&&r<=4);this.move(6,rows[Math.floor(g.random()*rows.length)],this.shipped?1.5:3);}
  else if(action.actionName==='summon')this.change(this.shipped?'SummonShip':'Summon');
  else if(action.actionName==='shoot'){
   if(this.shipped)this.change('ShootShip');
   else {const plants=g.plants.filter(p=>p.hp>0),p=plants[Math.floor(g.random()*plants.length)];this.targets=[{row:p.row,column:p.column}];g.beach.sounds.push('boss/worldZombossAimStartSound');this.change('ShootStart');}
  }else this.change(action.actionName==='rush2'?'Thunder':this.shipped?'RushStartShip':'Rush');
 }
 private summonColumn(){
  const g=this.game,p=this.previous!.summonProps,floor=this.stages.slice(this.stage+1).reduce((n,s)=>n+s.HitPoints,0),part=1-(this.zombie.hp-floor)/this.current.HitPoints;
  // ZombossSummonProps defaults in the pinned source: plantfoodchance=.3, columnOffset=0.
  let points=p.pointMin+part*(p.pointMax-p.pointMin),pool=p.zombieList.filter(k=>g.props.zombies[k].WavePointCost<=points),food=g.random()<(p.plantfoodchance??.3);
  while(pool.length){const kind=pool[Math.floor(g.random()*pool.length)];this.pending.push({kind,row:Math.floor(g.random()*5),column:8+(p.columnOffset??0),at:g.time+g.random(),food});food=false;points-=g.props.zombies[kind].WavePointCost;pool=pool.filter(k=>g.props.zombies[k].WavePointCost<=points);}
 }
 private stab(row:number,column:number){const g=this.game;for(const p of g.plants)if(p.hp>0&&p.row===row&&p.column===column&&p.action!=='food'&&!g.kongfu.peach.protected(p))p.hp=0;for(const z of g.westFinale.allies)if(z.hp>0&&z.row===row&&Math.abs(z.x-cellX(column))<BOARD.cellWidth/2)g.damage(z,native.zombies.zombossmech_sky.StompDamageToZombies);}
 private battery(){
  const g=this.game,upper=g.spawnZombie('sky_battery',Math.min(this.zombie.row-1,Math.floor(g.random()*5)),this.zombie.x),lower=g.spawnZombie('sky_battery_lower',Math.max(this.zombie.row+1,Math.floor(g.random()*5)),this.zombie.x);lower.row=Math.min(4,lower.row);
  for(const [z,partner] of [[upper,lower],[lower,upper]]){z.sky={animation:'IdlePaired',elapsed:0,event:0,impHealth:0,speed:1};this.batteries.set(z.id,{partner,next:g.time});}
 }
 batteryTick(z:Zombie,dt:number){
  const s=this.batteries.get(z.id);if(!s)return false;const g=this.game,p=native.zombies.sky_battery;
  if(s.partner&&s.partner.hp<=0){s.partner=null;z.sky!.animation='Trans';z.sky!.elapsed=0;}
  z.sky!.elapsed+=dt;if(z.sky!.animation==='Trans'&&z.sky!.elapsed>=g.props.plantAnimations.skyBattery.Trans.duration)z.sky!.animation='IdleSingle';
  z.x-=p.WalkSPS*BOARD.cellWidth*dt;if(s.partner&&z.kind==='sky_battery_lower')s.partner.x=z.x;
  if(g.time>=s.next&&(!s.partner||z.kind==='sky_battery_lower')){s.next=g.time+p.DamageInterval;const low=s.partner?Math.min(z.row,s.partner.row):z.row,high=s.partner?Math.max(z.row,s.partner.row):z.row;
   for(const plant of g.plants)if(plant.hp>0&&plant.row>=low&&plant.row<=high&&Math.abs(cellX(plant.column)-z.x)<BOARD.cellWidth/4&&plant.action!=='food'&&!g.kongfu.peach.protected(plant))plant.hp-=p.DamagePerHit;
   for(const ally of g.westFinale.allies)if(ally.hp>0&&ally.row>=low&&ally.row<=high&&Math.abs(ally.x-z.x)<BOARD.cellWidth/4)g.damage(ally,p.DamagePerHit,'electric');
  }
  if(z.x<BOARD.left-100)z.hp=0;return true;
 }
 private cue(name:string){
  const g=this.game,sound:Record<string,string>={move:'worldZombossMechMoveSounds',shake:'shakeSounds',wingSound:'wingSounds',roarSound:'roarSounds',introRoarSound:'introRoarSounds',flyThroughSound:'flyThroughSounds',introSaySound:'worldZombossSpawnSaySounds',saySound:'saySounds',trembleSound:'trembleSounds',thunderSound:'thunderSounds',electricitySound:'electricitySounds',stormSound:'stormSounds',mouthCloseSound:'worldZombossMechMouthCloseImpactSounds',breakSound:'breakSounds',throwSound:'throwSounds',extendSound:'extendSounds',radarSound:'radarSounds',batterySound:'batterySounds',chargeSound:'chargeSounds',bulletSound:'bulletSounds',coolSound:'coolSounds',smoke:'smokeSounds',droneShootSound:'droneShootSounds'};
  if(sound[name])g.beach.sounds.push('boss/'+sound[name]);
  if(name==='summon')this.summonColumn();
  if(name==='stabU'||name==='stabD')this.stab(this.zombie.row-(name==='stabU'?1:0),5);
  if(name==='storm')this.storms.push({id:g.nextEntityId(),x:this.zombie.x,row:this.zombie.row,deadAt:null,hits:new Set()});
  if(name==='battery')this.battery();
  if(name==='thunder'){const p=native.zombies.zombossmech_sky.ZombossStages[this.stage],count=p.ThunderCount!,linked=p.ThunderLinkedPlantCount!;g.sky.thunder.queue({TimeBeforeFirst:{Min:0,Max:0},TimeBetween:{Min:.2,Max:.3},Thunders:Array.from({length:count.Min+Math.floor(g.random()*(count.Max-count.Min+1))},()=>({Sign:g.random()<.5?-1:1,LinkedPlantCount:linked.Min+Math.floor(g.random()*(linked.Max-linked.Min+1))}))});}
  if(name==='shootStart'){const t=this.targets[0];this.move(t.column,t.row,.7,'stab');}
  if(name==='shootEndTeleport'){this.zombie.row=1+Math.floor(g.random()*4);this.zombie.x=cellX(6);this.y=rowY(this.zombie.row);}
  if(name==='rushShipStart'){this.barrageAge=0;this.barrageSent=0;this.rushDamageSky=0;this.change('RushLoopShip');}
  if(name==='Idle'&&!['Idle','IdleShip'].includes(this.animation)){if(this.animation==='Trans'&&this.zombie.hp<=0)this.change('DeathStart');else this.rest();}
 }
 private hazards(dt:number){
  const g=this.game;
  for(const w of this.storms){if(w.deadAt!==null)continue;const old=w.x;w.x-=2*BOARD.cellWidth*dt;
   if(g.eighties.finale.tornadoes.some(t=>Math.abs(t.row-w.row)<=1&&Math.abs(cellX(t.column)-w.x)<1.5*BOARD.cellWidth))w.deadAt=g.time;
   if(w.deadAt!==null)continue;
   for(const p of g.plants.filter(p=>p.hp>0&&p.row===w.row&&!w.hits.has(p.id)&&cellX(p.column)<=old+25&&cellX(p.column)>=w.x-25).sort((a,b)=>b.column-a.column)){w.hits.add(p.id);if(p.action!=='food'&&!g.kongfu.peach.protected(p))p.hp=0;if(g.props.plants[p.kind].ImmuneToSpeakerWave){w.deadAt=g.time;break;}}
   for(const b of g.sky.thunder.bolts)if(b.row===w.row&&Math.abs(b.x-w.x)<45){w.deadAt=g.time;b.x=2000;}
   for(const z of [...g.zombies,...g.westFinale.allies])if(w.deadAt===null&&z!==this.zombie&&z.hp>0&&z.row===w.row&&Math.abs(z.x-w.x)<40&&!w.hits.has(z.id)){w.hits.add(z.id);g.damage(z,Infinity,'toss');}
   if(w.x<BOARD.left-80)w.deadAt=g.time;
  }
  this.storms=this.storms.filter(w=>w.deadAt===null||g.time-w.deadAt<g.props.plantAnimations.skyStorm.die.duration);
  for(const b of this.shots){b.x+=b.vx*dt;b.y+=b.vy*dt;const p=g.plants.find(p=>p.hp>0&&!p.hidden&&Math.abs(rowY(p.row)-40-b.y)<35&&Math.abs(cellX(p.column)-b.x)<25);
   if(p){if(!g.beachFinale.reflect(p,30)&&p.action!=='food'){const armor=Math.min(p.armor,30);p.armor-=armor;p.hp-=30-armor;}b.x=-1000;}else if(b.x<=g.sky.edge){g.sky.damageShip(20);b.x=-1000;}
  }this.shots=this.shots.filter(b=>b.x>-100&&b.y>-100&&b.y<800);
 }
 override tick(dt:number){
  const g=this.game;this.hazards(dt);if(this.defeated)return;
  for(const p of this.pending)if(g.time>=p.at){if(p.kind==='sky_dropship')g.sky.addDropShip({DropShipType:'sky_dropship',DropShipPosition:{mX:p.column,mY:p.row},DropShipShiftedProperties:{...native.zombies.sky_dropship,ImpType:'sky_imp'}});else {const z=g.spawnZombie(p.kind,p.row,cellX(p.column));z.food=p.food;}}
  this.pending=this.pending.filter(p=>g.time<p.at);
  if(this.motion){const m=this.motion;m.age+=dt;const t=Math.min(1,m.age/m.duration),ease=m.after==='stab'?t*t:t<.5?2*t*t:1-(-2*t+2)**2/2;this.zombie.x=m.x+(cellX(m.column)-m.x)*ease;this.y=m.y+(rowY(m.row)-m.y)*ease;
   if(t===1){this.zombie.row=m.row;this.motion=null;if(m.after==='stab'){this.stab(m.row,m.column);this.targets=[];this.change('ShootEnd');}else if(m.after==='death'){for(const z of [...g.zombies,...g.westFinale.allies])if(z!==this.zombie){z.hp=0;z.deathCause='potato';}this.storms=[];this.shots=[];g.sky.drops=[];if(this.shipped)this.change('DeathStart');else {this.shipped=true;this.change('Trans');}}else this.rest();}return;}
  if(this.barrageAge!==null){this.barrageAge+=dt;const count=native.zombies.zombossmech_sky.ZombossStages[2].ShipRushProjectileCount!,sent=Math.floor(Math.min(1,this.barrageAge/5)*count);while(this.barrageSent<sent){this.barrageSent++;this.shots.push({id:g.nextEntityId(),x:this.zombie.x,y:this.y-40,vx:-(8+g.random()*4)*BOARD.cellWidth,vy:(g.random()*4-2)*BOARD.cellHeight});}if(this.barrageAge>=5){this.barrageAge=null;this.change('RushEndShip');}}
  const animation=this.animation,timeline=g.props.plantAnimations.boss[animation];this.elapsed+=dt*this.rate;
  if(animation==='Idle'||animation==='IdleShip'){this.restLeft-=dt;if(!this.shipped&&g.plants.some(p=>p.hp>0&&this.covers(p.row)&&p.column===5&&p.action!=='food'))this.change('Attack');else if(this.restLeft<=0)this.choose();return;}
  if(animation.startsWith('Stun'))this.stunLeftSky-=dt;
  if(animation==='StunLoop'||animation==='StunLoopShip'){if(this.stunLeftSky<=0)this.change(this.shipped?'StunEndShip':'StunEnd');return;}
  while(this.cursor<timeline.events.length&&this.elapsed>=timeline.events[this.cursor].at){this.cue(timeline.events[this.cursor++].name);if(this.animation!==animation)return;}
  if(this.elapsed>=timeline.duration){
   if(animation==='StunStart'||animation==='StunStartShip'){if(this.stage===2&&!this.shipped){this.shipped=true;this.stunLeftSky=0;this.change('Trans');}else this.change(this.shipped?'StunLoopShip':'StunLoop');}
   else if(animation==='RushLoopShip'){this.elapsed-=timeline.duration;this.cursor=0;}
   else if(animation==='DeathStart')this.change('DeathIdle');
   else if(animation==='DeathIdle')this.change('Escape');
   else if(animation==='Escape')this.defeated=true;
   else this.rest();
  }
 }
}
