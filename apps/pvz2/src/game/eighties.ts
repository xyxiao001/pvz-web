import {BOARD,cellX,rowY} from './level';
import type {Game,Plant,Zombie} from './model';
import {EightiesCarrot} from './eighties-carrot';
import {EightiesBoomBox} from './eighties-boombox';
import {EightiesArcade} from './eighties-arcade';
import {isFlying} from './pirate';

/** Native Eighties music cues, zombies and plants. */
export class EightiesBattle {
 readonly arcade:EightiesArcade;
 readonly carrot:EightiesCarrot;
 readonly boombox:EightiesBoomBox;
 get musicJam(){return this.g.time<this.boombox.musicUntil?'jam_ballad':this.jam;}
 spores=new Set<number>();
 sprouts:{row:number;column:number;x:number;at:number}[]=[];
 jam='jam_clear';
 warps=new Map<number,{at:number;delay:number;moved:boolean}>();
 glitter=new Map<number,number>();
 trails=new Map<number,{x:number;row:number;at:number;fade:number|null;reversed:boolean}>();
 mc=new Map<number,{at:number;elapsed:number;event:number}>();
 spins=new Map<number,{animation:string;at:number;elapsed:number;event:number}>();
 gargCountdown=new Map<number,number>();
 waves:{id:number;x:number;row:number;direction:number;friendly:boolean}[]=[];
 private nextGlitterSound=0;
 lit=new Set<number>();
 heavy=new Map<number,number>();
 kicks=new Map<number,number>();
 shots:{id:number;row:number;x:number;y:number;food:boolean;left:number;hits:Set<number>}[]=[];
 constructor(private g:Game){this.arcade=new EightiesArcade(g);this.carrot=new EightiesCarrot(g);this.boombox=new EightiesBoomBox(g);}
 private play(p:Plant,animation:string,action:Plant['action']='idle'){p.animation=animation;p.action=action;p.actionAt=this.g.time;p.eventIndex=0;}
 add(p:Plant){if(p.kind==='sporeshroom'){p.nextAction=this.g.time;this.play(p,'Idle');}if(p.kind==='garlic')this.play(p,'Idle00');if(p.kind==='thymewarp'){this.play(p,'Play','explode');p.hidden=true;this.warp();}if(p.kind==='phatbeet'){this.heavy.set(p.id,2);p.nextAction=this.g.time;this.play(p,'Idle');}if(p.kind==='cactus'){p.nextAction=this.g.time;this.play(p,'Idle');}}
 spawn(z:Zombie){this.arcade.spawn(z);if(z.kind==='eighties_punk')this.kicks.set(z.id,0);if(z.kind==='eighties_gargantuar')this.gargCountdown.set(z.id,4+1.5*this.g.random());}
 gargReady(z:Zombie,dt:number){
  if(this.jam!=='jam_metal'||z.x>=cellX(9))return false;
  const left=this.gargCountdown.get(z.id)!-dt*(this.g.time<z.chilledUntil?.5:1);this.gargCountdown.set(z.id,left);return left<=0;
 }
 gargEvent(z:Zombie,name:string){
  const g=this.g,metal=this.jam==='jam_metal'&&z.x<cellX(9);
  if(name==='guitar'&&metal)g.beach.sounds.push('eightiesGargantuar/guitarSwingSounds');
  if(name==='smash'){
   this.gargCountdown.set(z.id,4+1.5*g.random());
   if(metal){const direction=z.reversed?1:-1;this.waves.push({id:g.nextEntityId(),x:z.x+256.8475*.51*direction,row:z.row,direction,friendly:g.westFinale.allies.includes(z)});g.beach.sounds.push('eightiesGargantuar/guitarSmashSounds');}
  }
  const sound:Record<string,string>={swing:'swingSounds',smash:'smashSounds',afterSmash:'afterSmashSaySounds',impThrow:'ImpThrowSounds'};
  if(sound[name])g.beach.sounds.push('eightiesGargantuar/'+sound[name]);
 }
 food(p:Plant){this.play(p,'Food','food');if(p.kind==='garlic')this.g.beach.sounds.push('garlic/foodStart');}
 speed(z:Zombie){return z.kind==='eighties_arcade'&&z.x>=cellX(9)?2:z.kind==='eighties_breakdancer'&&this.jam==='jam_rap'?this.g.props.zombies.eighties_breakdancer.JamWalkSpeedMult:1;}
 private garlicMove(p:Plant,z:Zombie){
  const g=this.g,prop=g.props.plants.garlic;
  if(g.props.zombies[z.kind].ImmuneToGarlic||z.garlicLane)return false;
  const rows=[z.row-1,z.row+1].filter(r=>r>=0&&r<BOARD.rows),to=rows[Math.floor(g.random()*rows.length)];
  z.garlicLane={from:z.row,to,at:g.time+prop.DisgustDuration,y:rowY(z.row)};
  z.stunnedUntil=Math.max(z.stunnedUntil??0,g.time+(p.action==='food'?prop.StunDurationPlantfood:prop.DisgustDuration+prop.LaneChangeDuration));z.eating=false;
  g.beach.sounds.push('garlic/disgustSounds');g.future.visual('garlicDisgust','Play',z.x,rowY(z.row)-80);return true;
 }
 eatGarlic(p:Plant,z:Zombie){
  if(!this.garlicMove(p,z))return false;
  if(!this.g.props.zombies[z.kind].DoesNotDamageHeavilyToGarlic)p.hp-=this.g.props.plants.garlic.ReceivesDamageWhenEaten*this.g.future.plantDamageScale(p);
  return true;
 }
 private kickTargets(z:Zombie,range:number){
  const group=this.g.westFinale.allies.includes(z)?this.g.westFinale.allies:this.g.zombies;
  return group.filter(other=>other!==z&&other.hp>0&&other.row===z.row&&!other.leap&&!other.garlicLane&&other.x>=BOARD.left&&!(other.kind==='eighties_breakdancer'&&this.spins.has(other.id))&&Math.abs(other.x-z.x)<=range*BOARD.cellWidth+22);
 }
 private breakdance(z:Zombie,dt:number){
  const g=this.g,prop=g.props.zombies.eighties_breakdancer;
  const play=(animation:string)=>{this.spins.set(z.id,{animation,at:g.time,elapsed:0,event:0});z.eating=false;};
  if(!this.spins.has(z.id)&&this.jam==='jam_rap'&&z.x<cellX(9)&&this.kickTargets(z,.5).length)play('RotateStart');
  const state=this.spins.get(z.id);if(!state)return false;
  state.elapsed+=dt*(g.time<z.chilledUntil?.5:1);
  const timeline=g.props.plantAnimations.eightiesBreakDancer[state.animation];
  while(state.event<timeline.events.length&&state.elapsed>=timeline.events[state.event].at){
   const name=timeline.events[state.event++].name;
   if(name==='rotateStart'){
    for(const other of this.kickTargets(z,.75))other.leap={fromX:other.x,fromY:rowY(other.row),toX:Math.max(BOARD.left,other.x+(z.reversed?1:-1)*prop.KickDistance*BOARD.cellWidth),toRow:other.row,at:g.time,duration:.5};
    play('RotateLoop');return true;
   }
   if(name==='switchingFalse'){this.spins.delete(z.id);return true;}
   const sounds:Record<string,string>={rotate_start_say:'rotateStartSaySounds',rotate_start_sound:'rotateStartSounds',rotate_end_say:'rotateEndSaySounds'};
   if(sounds[name])g.beach.sounds.push('eightiesBreakDancer/'+sounds[name]);
  }
  if(state.animation==='RotateLoop'&&state.elapsed>=prop.KickingTime)play('RotateEnd');
  return true;
 }
 protected(z:Zombie){return this.warps.has(z.id)||this.g.time<(this.glitter.get(z.id)??0);}
 private clearBuff(z:Zombie){z.frozenUntil=z.chilledUntil=0;delete z.stunnedUntil;delete z.butteredUntil;delete z.poison;delete z.sappedUntil;delete z.perfumeUntil;delete z.heartDefence;}
 private warp(){
  const g=this.g;g.beach.sounds.push('thymewarp/teleportStartSound');
  for(const z of g.zombies)if(z.hp>0&&z!==g.boss?.zombie&&!g.props.zombies[z.kind].IgnoredByThymeWarp&&!this.warps.has(z.id)){
   this.warps.set(z.id,{at:g.time,delay:g.props.plants.thymewarp.WarpTime,moved:false});this.mc.delete(z.id);z.eating=false;z.leap=null;
   this.clearBuff(z);z.hp=g.props.zombies[z.kind].Toughness;
   if(z.armor>0&&(z.kind==='eighties_8bit_armor1'||z.kind==='eighties_8bit_armor2'||z.kind==='eighties_armor1'||z.kind==='eighties_armor2'))z.armor=g.props.armors[z.kind].Toughness;
   g.future.visual('thymeTeleport','Play',z.x,rowY(z.row));
  }
 }
 warpScale(z:Zombie){
  const w=this.warps.get(z.id);if(!w)return 1;
  const age=this.g.time-w.at;
  return age<1?Math.min(1,(1-age)/.4):age<1+w.delay?0:Math.min(1,(age-1-w.delay)/.4);
 }
 crush(z:Zombie,p:Plant){
  if(this.carrot.blocked(p)||z.kind!=='eighties_glitter'||this.jam!=='jam_pop'||this.g.kongfu.peach.protected(p)||p.action==='food')return false;
  p.hp=0;p.armor=0;z.eating=false;this.g.future.visual('glitterHit','Play',z.x,rowY(z.row));return true;
 }
 private mcTargets(z:Zombie){return this.g.plants.filter(p=>p.hp>0&&!p.hidden&&!p.leap?.pushed&&p.sheep===undefined&&p.action!=='food'&&p.action!=='explode'&&!this.g.kongfu.peach.protected(p)&&!['spikeweed','spikerock','iceweed','lilypad','potatomine','stunion','iceburg','goldleaf','bambooshoot','hotpotato','thymewarp'].includes(p.kind)&&Math.abs(p.row-z.row)<=1&&Math.abs(cellX(p.column)-z.x)<(p.row===z.row?1.5625:1)*BOARD.cellWidth+22);}
 zombie(z:Zombie,dt:number){
  if(z.kind==='eighties_boombox')return this.boombox.zombie(z);
  if(z.kind==='eighties_arcade')return this.arcade.zombie(z,dt);
  if(z.kind==='eighties_breakdancer')return this.breakdance(z,dt);
  if(z.kind!=='eighties_mc')return false;
  const g=this.g;
  if(!this.mc.has(z.id)&&this.jam==='jam_rap'&&z.x<cellX(9)&&this.mcTargets(z).length){this.mc.set(z.id,{at:g.time,elapsed:0,event:0});z.eating=false;}
  const state=this.mc.get(z.id);if(!state)return false;
  state.elapsed+=dt*(g.time<z.chilledUntil?.5:1);
  const timeline=g.props.plantAnimations.eightiesMC.Attack;
  while(state.event<timeline.events.length&&state.elapsed>=timeline.events[state.event].at){
   const name=timeline.events[state.event++].name;
   if(name==='attack')for(const p of this.mcTargets(z)){const damage=g.props.zombies.eighties_mc.JamAttackDamage,armor=Math.min(p.armor,damage);p.armor-=armor;p.hp-=(damage-armor)*g.future.plantDamageScale(p);}
   if(name==='attackStart'||name==='attackEnd')g.beach.sounds.push('eightiesMC/'+name+'Sounds');
  }
  if(state.elapsed>=timeline.duration)this.mc.delete(z.id);
  return true;
 }
 private enemies(p:Plant,range:number){return this.g.zombies.filter(z=>z.hp>0&&Math.abs(z.row-p.row)<=range&&Math.abs(z.x-cellX(p.column))<(range+.5)*BOARD.cellWidth);}
 private thump(p:Plant,food:boolean,heavy=false){
  const g=this.g,prop=g.props.plants.phatbeet,near=new Set(this.enemies(p,1).map(z=>z.id));
  for(const z of this.enemies(p,food?2:1)){
   g.damage(z,food?(near.has(z.id)?prop.PlantfoodDamageNear:prop.PlantfoodDamageFar):heavy?prop.DamageHeavy:prop.Damage);
   g.future.visual('phatHit','Play',z.x,rowY(z.row)-35);
  }
  for(const t of g.graves)if(t.hp>0&&Math.abs(t.row-p.row)<=(food?2:1)&&Math.abs(t.column-p.column)<=(food?2:1))t.hp-=food?(Math.abs(t.row-p.row)<=1&&Math.abs(t.column-p.column)<=1?prop.PlantfoodDamageNear:prop.PlantfoodDamageFar):heavy?prop.DamageHeavy:prop.Damage;
  g.beach.sounds.push('phatbeet/hit');
 }
 private shoot(p:Plant){
  const prop=this.g.props.plants.cactus;
  this.shots.push({id:this.g.nextEntityId(),row:p.row,x:cellX(p.column)+25,y:rowY(p.row)-48,food:this.lit.has(p.id),left:prop.PierceCount+Math.floor(this.g.random()*(prop.PierceCountAdditional+1)),hits:new Set()});
 }
 plant(p:Plant){
  const g=this.g,prop=g.props.plants[p.kind];
  if(p.kind==='sporeshroom'){this.sporePlant(p);return;}
  if(p.kind==='garlic'){
   if(p.action==='food'){
    const elapsed=(g.time-p.actionAt)*1.2,timeline=g.props.plantAnimations.garlic.Food;
    while(p.eventIndex!<timeline.events.length&&elapsed>=timeline.events[p.eventIndex!].at){
     const name=timeline.events[p.eventIndex!++].name;
     if(name==='shoot'){for(const z of g.zombies)if(z.hp>0&&z.row===p.row&&z.x+22>cellX(p.column))this.garlicMove(p,z);g.future.visual('chiliFart','Play',cellX(p.column)+30,rowY(p.row));g.beach.sounds.push('garlic/foodShoot');}
     if(name==='foodEnd'){this.play(p,'Idle00');return;}
    }
   }else {const animation=p.hp<=prop.Toughness/3?'Idle20':p.hp<=prop.Toughness*2/3?'Idle10':'Idle00';if(p.animation!==animation)this.play(p,animation);}
   return;
  }
  if(p.kind==='thymewarp'){if(g.time-p.actionAt>=g.props.plantAnimations.thymewarp.Play.events.find(e=>e.name==='kill')!.at)p.hp=0;return;}
  if(p.kind==='phatbeet'){
   if(p.action==='idle'&&g.time>=p.nextAction&&(this.enemies(p,1).length||g.graves.some(t=>t.hp>0&&Math.abs(t.row-p.row)<=1&&Math.abs(t.column-p.column)<=1))){this.play(p,'Attack','shoot');p.nextAction=g.time+prop.AttackInterval;}
  }else if(p.action!=='food'){
   const hide=g.zombies.some(z=>z.hp>0&&z.row===p.row&&Math.abs(z.x-cellX(p.column))<BOARD.cellWidth+22);
   if(hide!==!!p.hidden){p.hidden=hide;this.play(p,hide?'Hide':'Recover_Hidden','grow');}
   if(p.action==='idle'&&g.time>=p.nextAction){
    if(p.hidden){
     if(g.zombies.some(z=>z.hp>0&&!isFlying(z)&&z.row===p.row&&Math.abs(z.x-cellX(p.column))<BOARD.cellWidth/2+22)){this.play(p,'Attack_Hidden','shoot');p.nextAction=g.time+prop.StabInterval;}
    }else if(g.zombies.some(z=>z.hp>0&&g.inLane(z,p.row)&&z.x>=cellX(p.column))||g.graves.some(t=>t.hp>0&&t.row===p.row&&t.column>=p.column)){
     this.play(p,'Shoot','shoot');p.nextAction=g.time+prop.ShootInterval+g.random()*prop.ShootIntervalAdditional;
    }
   }
  }
  if(p.action==='idle')return;
  const animation=p.animation!,timeline=g.props.plantAnimations[p.kind][animation],elapsed=g.time-p.actionAt;
  while(p.eventIndex!<timeline.events.length&&elapsed>=timeline.events[p.eventIndex!].at){
   const event=timeline.events[p.eventIndex!++].name;
   if(p.kind==='phatbeet'){
    if(event==='attack'){
     let left=this.heavy.get(p.id)!-1;const heavy=left<=0;
     if(heavy)left=prop.TimesHeavy+Math.floor(g.random()*(prop.TimesHeavyAdditional+1));this.heavy.set(p.id,left);
     this.thump(p,false,heavy);g.future.visual('phatWave',heavy?'Play_Heavy':'Play',cellX(p.column),rowY(p.row));
    }
    if(event==='foodAttack')this.thump(p,true);
    if(event==='foodWave'){g.future.visual('phatWave','Play_PF',cellX(p.column),rowY(p.row));g.beach.sounds.push('phatbeet/impactPF');}
    if(event==='attackStart')g.beach.sounds.push('phatbeet/attack');
    if(event==='foodStart')g.beach.sounds.push('phatbeet/attackPF');
   }else {
    if(event==='Shoot')this.shoot(p);
    if(event==='Attack'){
     for(const z of g.zombies)if(z.hp>0&&!isFlying(z)&&z.row===p.row&&Math.abs(z.x-cellX(p.column))<BOARD.cellWidth/2+22)g.damage(z,this.lit.has(p.id)?prop.StabDamagePlantfood:prop.StabDamage);
     g.beach.sounds.push('cactus/shakeSound');
    }
    if(event==='light')this.lit.add(p.id);
    if(event==='shootSound')g.beach.sounds.push('cactus/'+(this.lit.has(p.id)?'shootFoodSounds':'shootSounds'));
    if(event==='hideSound')g.beach.sounds.push('cactus/hideSounds');
    if(event==='hideEndSound')g.beach.sounds.push('cactus/blopSounds');
    if(event==='attackSound')g.beach.sounds.push('cactus/stabSound');
    if(event==='foodSound'){g.beach.sounds.push('cactus/foodShootSound');g.beach.sounds.push('cactus/foodShoutSound');}
   }
   if(event==='foodEnd'){if(p.kind==='cactus')this.lit.add(p.id);this.play(p,p.hidden?'Idle_Hidden':'Idle');return;}
  }
  if(elapsed>=timeline.duration)this.play(p,p.hidden?'Idle_Hidden':'Idle');
 }
 private sporeTargets(p:Plant,food:boolean){
  const g=this.g,zombies=g.zombies.filter(z=>z.hp>0&&(food?z!==g.boss?.zombie:z.row===p.row&&z.x+22>=cellX(p.column)&&z.x-22<=cellX(9))).sort((a,b)=>a.x-b.x);
  if(zombies.length){const z=zombies[food?Math.floor(g.random()*zombies.length):0];return {id:z.id,x:z.x,y:rowY(z.row)-45};}
  const tombs=g.graves.filter(t=>t.hp>0&&(food?t.column<9:t.row===p.row&&t.column>=p.column&&t.column<=9)).sort((a,b)=>a.column-b.column);
  if(tombs.length){const t=tombs[food?Math.floor(g.random()*tombs.length):0];return {id:t.id,x:cellX(t.column),y:rowY(t.row)-40};}
 }
 private sporePlant(p:Plant){
  const g=this.g,prop=g.props.plants.sporeshroom;
  if(p.action==='idle'&&g.time>=p.nextAction&&this.sporeTargets(p,false)){this.play(p,'Shoot','shoot');p.nextAction=g.time+prop.ShootInterval+g.random()*prop.ShootIntervalAdditional;}
  if(p.action==='idle')return;
  const timeline=g.props.plantAnimations.sporeshroom[p.animation!],elapsed=g.time-p.actionAt;
  while(p.eventIndex!<timeline.events.length&&elapsed>=timeline.events[p.eventIndex!].at){
   const name=timeline.events[p.eventIndex!++].name;
   if(name==='shoot'||name==='foodShoot'){const food=name==='foodShoot',t=this.sporeTargets(p,food);g.lob(p,t?.id??-1,t?.x??BOARD.width,t?.y??rowY(p.row)-45,food);}
   const sound:Record<string,string>={breath:'breath',foodBreath:'foodBreath',shootSound:'shoot',foodShootSound:'foodShoot',gas:'spawn'};
   if(sound[name])g.beach.sounds.push('sporeshroom/'+sound[name]);
   if(name==='foodEnd'){this.play(p,'Idle');return;}
  }
  if(elapsed>=timeline.duration)this.play(p,'Idle');
 }
 sporeHit(z:Zombie){if(z!==this.g.boss?.zombie&&!this.g.props.zombies[z.kind].ImmuneToSporeShroom&&!this.protected(z))this.spores.add(z.id);}
 die(z:Zombie){
  if(!this.spores.delete(z.id))return;
  if(['swallow','blow','toss','water'].includes(z.deathCause))return;
  this.sprouts.push({row:z.row,column:Math.floor((z.x-BOARD.left)/BOARD.cellWidth),x:z.x,at:this.g.time+.3});
 }
 kick(z:Zombie,p:Plant){
  const g=this.g;
  if(z.kind!=='eighties_punk'||this.jam!=='jam_punk'||g.time<this.kicks.get(z.id)!||p.action==='food')return false;
  const stack=g.plants.filter(q=>q.hp>0&&q.row===p.row&&q.column===p.column);
  if(stack.some(q=>g.props.plants[q.kind].CannotBePushedByFootballMech)||g.kongfu.peach.protected(p))return false;
  this.kicks.set(z.id,g.time+g.props.zombies.eighties_punk.PushCooldown);
  let column=p.column+(z.reversed?1:-1);
  while(column>=0&&column<BOARD.columns&&(g.plants.some(q=>q.hp>0&&q.row===p.row&&q.column===column)||g.graves.some(t=>t.hp>0&&t.row===p.row&&t.column===column)||g.level.mold.some(t=>t.row===p.row&&t.column===column)))column+=z.reversed?1:-1;
  if(column<0||column>=BOARD.columns)p.hp=0;
  else {p.leap={x:cellX(p.column),y:rowY(p.row),at:g.time,duration:.5,pushed:true};p.column=column;}
  z.eating=false;g.beach.sounds.push('eightiesPunk/kickSounds');return true;
 }
 tick(dt:number){
  const g=this.g;this.carrot.tick();this.boombox.tick(dt);this.arcade.tick(dt);
  for(const s of this.sprouts)if(g.time>=s.at){
   g.future.visual('sporeSpawn','Play',s.x,rowY(s.row));
   if(s.column>=0&&s.column<9&&!g.plants.some(p=>p.hp>0&&p.row===s.row&&p.column===s.column)&&!g.graves.some(t=>t.hp>0&&t.row===s.row&&Math.round(t.column)===s.column)&&!g.level.mold.some(t=>t.row===s.row&&t.column===s.column)){g.addPlant('sporeshroom',s.row,s.column);this.play(g.plants.at(-1)!,'Spawn','grow');}
  }
  this.sprouts=this.sprouts.filter(s=>s.at>g.time);
  for(const z of [...g.zombies,...g.westFinale.allies])if(z.garlicLane){
   const lane=z.garlicLane,age=g.time-lane.at;
   if(age>=0){if(age<dt)g.beach.sounds.push('garlic/'+(lane.to<lane.from?'moveUpSounds':'moveDownSounds'));const t=Math.min(1,age/g.props.plants.garlic.LaneChangeDuration),ease=t<.5?2*t*t:1-2*(1-t)**2;lane.y=rowY(lane.from)+(rowY(lane.to)-rowY(lane.from))*ease;z.row=Math.round(lane.from+(lane.to-lane.from)*ease);if(t===1)delete z.garlicLane;}
  }
  for(const id of this.spins.keys())if(![...g.zombies,...g.westFinale.allies].some(z=>z.id===id&&z.hp>0))this.spins.delete(id);
  for(const w of this.waves){
   const from=w.x;w.x+=w.direction*5.5*BOARD.cellWidth*dt;
   const left=Math.min(from,w.x)-22,right=Math.max(from,w.x)+22;
   const p=w.friendly?undefined:g.plants.filter(p=>p.hp>0&&p.row===w.row&&p.kind!=='thymewarp'&&p.action!=='explode'&&cellX(p.column)>=left&&cellX(p.column)<=right).sort((a,b)=>(a.column-b.column)*w.direction)[0];
   const z=(w.friendly?g.zombies:g.westFinale.allies).find(z=>z.hp>0&&z.row===w.row&&z.x>=left&&z.x<=right);
   if(p||z){const damage=g.props.projectiles.eighties_gargantuar_wave.Damage;if(p&&!g.kongfu.peach.protected(p)){const armor=Math.min(p.armor,damage);p.armor-=armor;p.hp-=(damage-armor)*g.future.plantDamageScale(p);}if(z)g.damage(z,damage);g.future.visual('metalHit','Play',w.x,rowY(w.row));g.beach.sounds.push('metalWave/PopSound');w.x=-1000;}
  }
  this.waves=this.waves.filter(w=>w.x>BOARD.left-100&&w.x<BOARD.width+100);
  for(const id of this.gargCountdown.keys())if(![...g.zombies,...g.westFinale.allies].some(z=>z.id===id&&z.hp>0))this.gargCountdown.delete(id);
  for(const [id,w] of this.warps){
   const z=g.zombies.find(z=>z.id===id);if(!z){this.warps.delete(id);continue;}
   if(!w.moved&&g.time-w.at>=1+w.delay){w.moved=true;z.x=cellX(8);z.entry='walk';g.future.visual('thymeTeleport','Play',z.x,rowY(z.row));g.beach.sounds.push('thymewarp/teleportEndSound');}
   if(g.time-w.at>=2.3+w.delay)this.warps.delete(id);
  }
  const dancers=g.zombies.filter(z=>z.hp>0&&z.kind==='eighties_glitter'&&this.jam==='jam_pop'&&!this.warps.has(z.id));
  for(const z of dancers){
   if(!this.trails.has(z.id)||this.trails.get(z.id)!.fade!==null)this.trails.set(z.id,{x:z.x,row:z.row,at:g.time,fade:null,reversed:!!z.reversed});
   const trail=this.trails.get(z.id)!;trail.x=z.x;trail.row=z.row;
   for(const other of g.zombies){const distance=(other.x-z.x)*(z.reversed?-1:1);if(other!==z&&other.hp>0&&other.row===z.row&&other.reversed===z.reversed&&distance>=BOARD.cellWidth/2-22&&distance<=BOARD.cellWidth*(.5+g.props.zombies.eighties_glitter.RainbowTrailLength)+22){this.glitter.set(other.id,g.time+.3);this.clearBuff(other);}}
  }
  if(dancers.length&&g.time>=this.nextGlitterSound){g.beach.sounds.push('eightiesGlitter/glitterSound');this.nextGlitterSound=g.time+.66667;}
  for(const [id,t] of this.trails){if(!dancers.some(z=>z.id===id)&&t.fade===null)t.fade=g.time;if(t.fade!==null&&g.time-t.fade>=g.props.plantAnimations.glitterTrail.Fade.duration)this.trails.delete(id);}
  for(const [id,until] of this.glitter)if(g.time>=until)this.glitter.delete(id);
  for(const id of this.mc.keys())if(!g.zombies.some(z=>z.id===id&&z.hp>0))this.mc.delete(id);
  for(const s of this.shots){
   const from=s.x;s.x+=11*BOARD.cellWidth*dt;
   const targets=[...g.zombies.filter(z=>z.hp>0&&g.inLane(z,s.row)).map(z=>({id:z.id,x:z.x,z})),...g.graves.filter(t=>t.hp>0&&t.row===s.row).map(t=>({id:t.id,x:cellX(t.column),t}))].filter(t=>t.x>=from-22&&t.x<=s.x+22&&!s.hits.has(t.id)).sort((a,b)=>a.x-b.x);
   for(const t of targets){if(s.left===0)break;s.hits.add(t.id);s.left--;const damage=g.props.projectiles[s.food?'cactus_pf':'cactus'].Damage;if('z' in t)g.damage(t.z,damage);else t.t.hp-=damage;g.effects.push({id:g.nextEntityId(),kind:'hit',x:t.x,y:s.y,age:0});}
  }
  this.shots=this.shots.filter(s=>s.left>0&&s.x<BOARD.width+50);
  for(const id of this.heavy.keys())if(!g.plants.some(p=>p.id===id))this.heavy.delete(id);
  for(const id of this.lit)if(!g.plants.some(p=>p.id===id))this.lit.delete(id);
  for(const id of this.kicks.keys())if(!g.zombies.some(z=>z.id===id))this.kicks.delete(id);
 }
}
