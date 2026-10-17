import {BOARD,cellX,rowY,type ZombieKind} from './level';
import type {Game,Plant,Zombie} from './model';
export const cowboyArmor=(kind:ZombieKind)=>kind==='cowboy_armor4'?'cowboy_armor4':kind==='cowboy_armor1'?'cowboy_armor1':kind==='cowboy_armor2'?'cowboy_armor2':null;
export interface CowboyZombie {
 bullThrown?:boolean;blockedByTallnut?:boolean;
 bull?:{delay:number;blocked:boolean;retreating:boolean;cheer:number};chickens?:boolean;imp?:boolean;fired?:boolean;animation?:string;at:number;elapsed:number;fuse?:number;ignited?:boolean;dirty?:boolean;
 poncho?:number;plate?:number;dance?:boolean;danceBeat?:number;lane?:{from:number;to:number;at:number;y?:number};
 chiliUntil?:number;tailAt?:number;poisonAt?:number;poisonDuration?:number;farted?:boolean;hat?:boolean;
}
export class CowboyBattle {
 carts:{id:number;row:number;column:number;start:number;end:number}[]=[];
 chickenThrowers:{x:number;row:number;reversed:boolean;left:number;cooldown:number}[]=[];
 selected:number|null=null;
 sounds:string[]=[];
 effects:{id:number;kind:'chiliFart'|'prospectorSmoke'|'prospectorTail'|'ponchoBreak'|'plateDrop'|'cowboyHat';x:number;y:number;at:number}[]=[];
 shots:{id:number;x:number;row:number;vx:number;damage:number;mega:boolean}[]=[];
 // SoundManager keeps piano activity alive for one second after the last playing zombie.
 pianoTime=0;pianoPlaying=false;private pianoUntil=0;private serial=0;
 #game:Game;
 constructor(game:Game){
  this.#game=game;
  const rails=game.level.rails;
  if(rails)this.carts=rails.Railcarts.map((c,id)=>{const rail=rails.Rails.find(r=>r.Column===c.Column&&c.Row>=r.RowStart&&c.Row<=r.RowEnd)!;return {id,row:c.Row,column:c.Column,start:rail.RowStart,end:rail.RowEnd};});
 }
 canPlant(row:number,column:number){return !this.#game.level.rails?.Rails.some(r=>r.Column===column&&row>=r.RowStart&&row<=r.RowEnd)||this.carts.some(c=>c.row===row&&c.column===column);}
 select(row:number,column:number){const cart=this.carts.find(c=>c.row===row&&c.column===column);this.selected=cart?.id??null;return !!cart;}
 move(row:number){
  const g=this.#game,cart=this.carts.find(c=>c.id===this.selected);
  if(!cart||g.phase!=='playing'||row<cart.start||row>cart.end||row===cart.row)return false;
  const plants=g.plants.filter(p=>p.row===cart.row&&p.column===cart.column);
  if(plants.some(p=>p.leap||p.kind==='imitater')||g.graves.some(p=>p.row===row&&p.column===cart.column)||this.carts.some(c=>c!==cart&&c.row===row&&c.column===cart.column))return false;
  for(const plant of plants)plant.row=row;
  cart.row=row;this.sounds.push('cart/moveSounds');return true;
 }
 spawn(z:Zombie){
  const g=this.#game,props=g.props.zombies[z.kind];
  if(z.kind==='west_bull')z.west={at:g.time,elapsed:0,imp:true,fired:false,bull:{delay:props.BullRunAgainDelay,blocked:false,retreating:false,cheer:3}};
  if(z.kind==='chicken_farmer')z.west={at:g.time,elapsed:0,chickens:true};
  if(z.kind==='cowboy_gargantuar')z.west={at:g.time,elapsed:0,imp:true,animation:'Walk',fired:false};
  if(z.kind==='piano'||z.kind==='west_bullrider')z.west={at:g.time,elapsed:0};
  if(z.kind==='prospector')z.west={at:g.time,elapsed:0,fuse:props.ExplodeCountdown,ignited:true,dirty:false};
  if(z.kind.startsWith('poncho'))z.west={at:g.time,elapsed:0,poncho:props.PonchoToughness,plate:g.random()<props.ChanceToPlate?props.ShieldToughness:0};
  if(['cowboy','cowboy_armor1','cowboy_armor2','cowboy_armor4','cowboy_flag'].includes(z.kind))z.west={at:g.time,elapsed:0,dance:false,danceBeat:0,hat:z.armor===0};
 }
 damage(z:Zombie,amount:number){
  const state=z.west;if(state?.poncho!==undefined){
   for(const key of ['poncho','plate'] as const){const used=Math.min(amount,state[key]!);state[key]!-=used;amount-=used;
    if(used>0&&state[key]===0)this.effect(key==='poncho'?'ponchoBreak':'plateDrop',z.x,rowY(z.row));}
  }return amount;
 }
 damaged(z:Zombie){
  const g=this.#game,s=z.west,p=g.props.zombies.chicken_farmer;
  if(z.kind==='chicken_farmer'&&s!.chickens&&z.hp<=p.Toughness*p.ChickeningHealthPercentage&&g.time>=z.frozenUntil&&g.time>=(z.butteredUntil??0)&&g.time>=(z.stunnedUntil??0)){
   s!.chickens=false;this.sounds.push('chickenFarmer/chickenActionSound');
   this.chickenThrowers.push({x:z.x,row:z.row,reversed:!!z.reversed,left:p.ChickeningDuration+(1-2*g.random())*p.ChickeningDurationVariance,cooldown:0});
  }
 }
 private effect(kind:CowboyBattle['effects'][number]['kind'],x:number,y:number){this.effects.push({id:++this.serial,kind,x,y,at:this.#game.time});}
 die(z:Zombie){if(z.kind==='west_bull'&&z.deathCause==='electric')z.west!.imp=false;if(z.west?.hat){z.west.hat=false;this.effect('cowboyHat',z.x,rowY(z.row)-90);}}
 cold(z:Zombie){if(z.kind==='prospector')z.west!.ignited=false;}
 landed(z:Zombie){if(z.kind==='prospector'&&z.west!.animation==='Flying'){z.reversed=!z.reversed;z.west!.animation='FlyEnd';z.west!.at=this.#game.time;z.landUntil=this.#game.time+this.#game.props.zombies.prospector.LandingStunnTime;this.sounds.push('prospector/landSound');}}
 eaten(p:Plant,z:Zombie){if(p.kind==='chilibean'&&z.kind!=='piano'&&z.kind!=='west_bull'){z.west??={at:0,elapsed:0};z.west.poisonAt=this.#game.time;z.west.poisonDuration=this.#game.props.plants.chilibean.ChiliStunDuration;}}
 tick(dt:number){
  const g=this.#game;
  for(const thrower of this.chickenThrowers){
   thrower.left-=dt;thrower.cooldown-=dt;
   if(thrower.cooldown<0){const p=g.props.zombies.chicken_farmer;thrower.cooldown=p.ChickeningInterval+(1-2*g.random())*p.ChickeningIntervalVariance;
    const rows=[thrower.row,thrower.row+1,thrower.row-1].filter(r=>r>=0&&r<5),row=rows[Math.floor(g.random()*rows.length)];
    const chicken=g.spawnZombie(g.random()*101<100?'chicken':'chicken_pumpkin',row,thrower.x+(1-2*g.random())*BOARD.cellWidth);chicken.reversed=thrower.reversed;
   }
  }
  this.chickenThrowers=this.chickenThrowers.filter(t=>t.left>=0);
  if(g.zombies.some(z=>z.kind==='piano'&&z.hp>0&&z.x<cellX(9)&&g.time>=z.frozenUntil&&g.time>=(z.butteredUntil??0)&&g.time>=(z.stunnedUntil??0)))this.pianoUntil=g.time+1;this.pianoPlaying=g.time<this.pianoUntil;
  if(this.pianoPlaying)this.pianoTime+=dt;else this.pianoTime=0;
  for(const z of g.zombies){const s=z.west;
   if(!s)continue;
   if(s.hat&&z.hp<=150){s.hat=false;this.effect('cowboyHat',z.x,rowY(z.row)-90);}
   if(s.poisonAt!==undefined){const age=g.time-s.poisonAt;if(age>=2&&!s.farted){s.farted=true;this.effect('chiliFart',z.x,rowY(z.row)-40);this.sounds.push('zombieFart');for(const other of g.zombies)if(other.row===z.row&&(z.reversed?other.x<=z.x+BOARD.cellWidth/2:other.x>=z.x-BOARD.cellWidth/2)){other.stunnedUntil=g.time+s.poisonDuration!;other.west??={at:0,elapsed:0};other.west.chiliUntil=other.stunnedUntil;}}if(age>=3)z.hp=0;}
   if(z.leap&&z.kind==='prospector'&&g.time>=(s.tailAt??0)){s.tailAt=g.time+.08;const t=(g.time-z.leap.at)/z.leap.duration!;this.effect('prospectorTail',z.x,rowY(z.row)-150*Math.sin(Math.PI*t));}
   if(s.lane){const t=Math.min(1,(g.time-s.lane.at)/.75);s.lane.y=rowY(s.lane.from)+(rowY(s.lane.to)-rowY(s.lane.from))*t;z.row=Math.round(s.lane.from+(s.lane.to-s.lane.from)*t);if(t===1)delete s.lane;}
  }
  for(const shot of this.shots){const before=shot.x;shot.x+=shot.vx*dt;
   const target=g.zombies.filter(z=>z.hp>0&&!z.leap&&g.inLane(z,shot.row)&&z.x>=Math.min(before,shot.x)-20&&z.x<=Math.max(before,shot.x)+20).sort((a,b)=>Math.abs(a.x-before)-Math.abs(b.x-before))[0];
   if(target){g.damage(target,shot.damage);shot.x=-999;}
  }
  this.shots=this.shots.filter(s=>s.x>-60&&s.x<1250);
  this.effects=this.effects.filter(e=>g.time-e.at<(e.kind==='plateDrop'||e.kind==='cowboyHat'?1.5:g.props.plantAnimations[e.kind][e.kind==='prospectorTail'?'Play0':'Play'].duration));
 }
 tickZombie(z:Zombie,dt:number){
  const g=this.#game,s=z.west;
  if(z.kind==='west_bull')return this.tickBull(z,dt);
  if(z.kind==='cowboy_gargantuar')return this.tickGargantuar(z,dt);
  if(s?.poisonAt!==undefined&&g.time-s.poisonAt>=2)return true;
  if(z.kind==='piano'&&z.hp<=g.props.zombies.piano.Toughness/2){if(!s!.animation){s!.animation='Walk_Break';s!.at=g.time;}else if(s!.animation==='Walk_Break'&&g.time-s!.at>=g.props.plantAnimations.piano.Walk_Break.duration)s!.animation='Walk_Broken';}
  if(z.kind==='prospector'){
   if(s!.animation==='FlyEnd'&&g.time>=z.landUntil!){delete s!.animation;}
   if(s!.animation==='FlyStart'){
    s!.elapsed+=dt*(g.time<z.chilledUntil?.5:1);
    if(s!.elapsed>=g.props.plantAnimations.prospector.FlyStart.events[0].at){s!.animation='Flying';s!.at=g.time;s!.dirty=true;z.leap={fromX:z.x,fromY:rowY(z.row),toX:cellX(z.reversed?8:0),toRow:z.row,at:g.time,duration:1};this.effect('prospectorSmoke',z.x,rowY(z.row));this.sounds.push('prospector/explodeSound','prospector/explodeSaySound');}return true;
   }
   if(s!.ignited&&!s!.dirty&&z.x<cellX(9)){const previous=s!.fuse!;s!.fuse!-=dt*(g.time<z.chilledUntil?.5:1);if(Math.floor(previous/(10/3))!==Math.floor(s!.fuse!/(10/3)))this.sounds.push('prospector/igniteSound');if(s!.fuse!<=0){s!.animation='FlyStart';s!.at=g.time;s!.elapsed=0;return true;}}
  }
  // The pinned class uses CowboyPianoDancingSpeedScale=1; DanceSPSScale in JSON is not read.
  if(['cowboy','cowboy_armor1','cowboy_armor2','cowboy_armor4','cowboy_flag'].includes(z.kind)&&s){
   const dancing=this.pianoPlaying&&z.x<cellX(9);
   if(dancing!==s.dance){s.dance=dancing;if(!z.eating){s.animation=dancing?'DanceStart':'DanceEnd';s.at=g.time;s.elapsed=0;}}
   if(s.animation==='DanceStart'||s.animation==='DanceEnd'){s.elapsed+=dt;if(s.elapsed<1/3)return true;delete s.animation;}
   const beat=Math.floor(this.pianoTime/(z.kind==='cowboy'?g.props.zombies.cowboy.CowboyPianoActionInterval:7));
   if(dancing&&beat!==s.danceBeat&&!s.lane){const choices=[z.row-1,z.row+1].filter(r=>r>=0&&r<=4);s.lane={from:z.row,to:choices[Math.floor(g.random()*choices.length)],at:g.time};}s.danceBeat=beat;
  }
  return false;
 }
 private tickBull(z:Zombie,dt:number){
  const g=this.#game,s=z.west!,bull=s.bull!,props=g.props.zombies.west_bull,timelines=g.props.plantAnimations.bull;
  const step=dt*(g.time<z.chilledUntil?.5:1),direction=z.reversed?-1:1;
  const start=(animation:string)=>{s.animation=animation;s.at=g.time;s.elapsed=0;};
  const blocked=()=>g.plants.some(p=>p.hp>0&&!p.leap&&!p.hidden&&p.row===z.row&&!(p.kind==='escaperoot'&&p.rootGrown)&&!['iceburg','iceweed','spikeweed','spikerock','imitater','cherry_bomb','jalapeno'].includes(p.kind)&&!(p.kind==='springbean'&&['Ready','Idle_Ready'].includes(p.animation!))&&p.action!=='explode'&&Math.abs(z.x-cellX(p.column))<60);
  if(!s.animation){
   if(!z.eating&&z.x<cellX(9)&&bull.delay>0){bull.delay-=step;if(bull.delay<=0){start('RushStart');this.sounds.push('bull/angrySounds','bull/impSteadySounds');}}
   if(!s.animation)return false;
  }
  const timeline=timelines[s.animation],before=s.elapsed;
  s.elapsed+=step;
  if(s.animation==='RushStart'){
   if(s.elapsed>=timeline.events.find(e=>e.name==='rushStart')!.at){
    bull.blocked ||= blocked();
    if(!bull.blocked)z.x-=direction*props.RushSPS*BOARD.cellWidth*step;
   }
   if(s.elapsed>=timeline.duration){if(bull.blocked){start('RushEnd');bull.retreating=true;}else start('Rush');}
   return true;
  }
  if(s.animation==='Rush'){
   bull.blocked ||= blocked();
   if(bull.blocked){if(s.elapsed>=timeline.duration){start('RushEnd');bull.retreating=true;}return true;}
   bull.cheer-=step;if(bull.cheer<=0&&s.imp){this.sounds.push('bull/impCheerSounds');bull.cheer=3;}
   s.elapsed%=timeline.duration;return false;
  }
  // Normal bulls brake and throw once; only the later black-bull variant rams plants.
  for(const event of timeline.events)if(before<event.at&&s.elapsed>=event.at){
   if(event.name==='rushEnd'){bull.retreating=false;this.sounds.push('bull/bullBrakeSounds');if(s.imp)this.sounds.push('bull/impBrakeSounds');}
   if(event.name==='throw'&&s.imp){
    s.imp=false;const x=z.x+9.46*.51*direction,imp=g.spawnZombie('west_bullrider',z.row,x);imp.reversed=z.reversed;imp.west!.bullThrown=true;
    imp.leap={fromX:x,fromY:rowY(z.row)-154.208*.51,toX:Math.max(cellX(0),Math.min(cellX(8),x-direction*props.ImpThrowDistance*BOARD.cellWidth)),toRow:z.row,at:g.time,duration:.7};
    this.sounds.push('bull/bullThrowSounds','bull/impThrowSounds');
   }
  }
  if(bull.retreating)z.x+=direction*1.25*BOARD.cellWidth*step;
  if(s.elapsed>=timeline.duration){delete s.animation;bull.blocked=false;}
  return true;
 }
 private tickGargantuar(z:Zombie,dt:number){
  const g=this.#game,s=z.west!,timelines=g.props.plantAnimations.cowboyGargantuar;
  const target=g.plants.filter(p=>p.hp>0&&!p.leap&&p.row===z.row&&Math.abs(cellX(p.column)-z.x)<75&&!(p.kind==='escaperoot'&&p.rootGrown)&&!(p.kind==='springbean'&&['Ready','Idle_Ready'].includes(p.animation!))).sort((a,b)=>b.column-a.column)[0];
  const start=(animation:string)=>{s.animation=animation;s.at=g.time;s.elapsed=0;s.fired=false;};
  if(s.animation==='Walk'){
   if(s.imp&&z.hp<g.props.zombies.cowboy_gargantuar.Toughness/2&&z.x>cellX(2)){start('Throw');this.sounds.push('cowboyGargantuar/ImpThrowSaySounds');}
   else if(target)start('Smash');else return false;
  }
  s.elapsed+=dt*(g.time<z.chilledUntil?.5:1);
  const event=s.animation==='Smash'?'smash':'impThrow';
  if(!s.fired&&s.elapsed>=timelines[s.animation!].events.find(e=>e.name===event)!.at){
   s.fired=true;
   if(event==='impThrow'){s.imp=false;const imp=g.spawnZombie('west_bullrider',z.row,z.x);imp.reversed=z.reversed;imp.leap={fromX:z.x,fromY:rowY(z.row)-100,toX:cellX(z.reversed?6:2),toRow:z.row,at:g.time,duration:1.5};}
   else {
    if(target){if(target.kind==='spikeweed'||target.kind==='spikerock'){g.damage(z,g.props.plants[target.kind].Damage);if(target.action!=='food'){if(target.kind==='spikerock'){target.spikes!--;if(target.spikes===0)target.hp=0;}else target.hp=0;}}else {target.hp=0;target.armor=0;}}
    // The west giant's smash point is 260 source pixels ahead (the actor scale is .51).
    const x=z.x-260.4515*.51*(z.reversed?-1:1);
    for(const p of g.plants)if(p.hp>0&&p.row===z.row&&Math.abs(cellX(p.column)-x)<BOARD.cellWidth){const damage=g.props.zombies.cowboy_gargantuar.SplashDamageToPlants,armor=Math.min(damage,p.armor);p.armor-=armor;p.hp-=damage-armor;}
   }
  }
  if(s.elapsed>=timelines[s.animation!].duration)start('Walk');
  return true;
 }
 food(p:Plant){p.animation='Food';p.eventIndex=0;p.burst=0;p.nextBurst=this.#game.time;this.sounds.push(p.kind+'/foodSound');}
 tickPlant(p:Plant){
  const g=this.#game,props=g.props.plants[p.kind],x=cellX(p.column);
  const shoot=(direction:number,mega=false)=>{this.shots.push({id:++this.serial,x:x+direction*22,row:p.row,vx:direction*360,damage:mega?g.props.projectiles.pea_mega.Damage:20,mega});};
  if(p.kind==='splitpea'){
   if(p.action==='food'){
    const elapsed=g.time-p.actionAt,front=Math.min(props.PlantfoodPeaCount,Math.floor(elapsed/2*props.PlantfoodPeaCount)),back=Math.min(props.PlantfoodPeaCountBack,Math.floor(elapsed/2*props.PlantfoodPeaCountBack));
    while(p.burst<front){shoot(1);p.burst++;}while(p.eventIndex!<back){shoot(-1);p.eventIndex!++;}
    if(elapsed>=2)p.animation='ShootL';
    if(elapsed>=2+g.props.plantAnimations.splitpea.ShootL.events[0].at){shoot(-1,true);p.action='idle';p.animation='Idle';this.sounds.push('splitpea/shootMegaSound','splitpea/foodEndSound');}return;
   }
   if(p.action==='idle'&&g.time>=p.nextAction){const targets=g.zombies.filter(z=>z.hp>0&&!z.leap&&g.inLane(z,p.row)),left=targets.some(z=>z.x<=x),right=targets.some(z=>z.x>x);if(left||right){p.action='shoot';p.animation='Shoot'+(right?'R':'')+(left?'L':'');p.actionAt=g.time;p.eventIndex=0;p.fired=false;p.nextAction=g.time+props.ShootInterval+g.random()*props.ShootIntervalAdditional;}}
   if(p.action==='shoot'){const timeline=g.props.plantAnimations.splitpea[p.animation!],elapsed=g.time-p.actionAt;
    while(p.eventIndex!<timeline.events.length&&elapsed>=timeline.events[p.eventIndex!].at){const event=timeline.events[p.eventIndex!++].name;if(event==='ShootR')shoot(1);if(event==='ShootL'){shoot(-1,p.fired);if(p.fired){p.action='idle';p.animation='Idle';this.sounds.push('splitpea/shootMegaSound','splitpea/foodEndSound');return;}}if(event==='ShootSound')this.sounds.push('splitpea/shootSound');}
    if(elapsed>=timeline.duration){p.action='idle';p.animation='Idle';}
   }return;
  }
  if(p.action==='food'){
   const timeline=g.props.plantAnimations.chilibean.Food,elapsed=g.time-p.actionAt;
   if(!p.fired&&elapsed>=timeline.events.find(e=>e.name==='foodSpawn')!.at){p.fired=true;
    const free=(r:number,c:number)=>this.canPlant(r,c)&&!g.plants.some(p=>p.row===r&&p.column===c)&&!g.graves.some(p=>p.row===r&&p.column===c)&&!g.level.mold.some(p=>p.row===r&&p.column===c);
    const targets=[...new Map(g.zombies.filter(z=>z.hp>0).map(z=>{const c=Math.floor((z.x-BOARD.left)/BOARD.cellWidth),r=Math.round(z.row);return [r*9+c,{r,c}];})).values()].filter(c=>c.c>=0&&c.c<9&&free(c.r,c.c));
    const cells=Array.from({length:45},(_,i)=>({r:Math.floor(i/9),c:i%9})).filter(c=>free(c.r,c.c));
    while(targets.length<props.PlantfoodChildrenCount&&cells.length){const c=cells.splice(Math.floor(g.random()*cells.length),1)[0];if(!targets.some(t=>t.r===c.r&&t.c===c.c))targets.push(c);}
    for(const c of targets.slice(0,props.PlantfoodChildrenCount)){g.addPlant('chilibean',c.r,c.c);const child=g.plants.at(-1)!;child.leap={x,y:rowY(p.row),at:g.time};child.animation='Flying';}
   }
   if(elapsed>=timeline.events.find(e=>e.name==='foodEnd')!.at){p.action='idle';p.animation='Idle';}
  }else if(p.animation==='Flying'){p.animation='FlyEnd';p.actionAt=g.time;this.sounds.push('chilibean/landSound');}
  else if(p.animation==='FlyEnd'&&g.time-p.actionAt>=g.props.plantAnimations.chilibean.FlyEnd.duration)p.animation='Idle';
 }
}
