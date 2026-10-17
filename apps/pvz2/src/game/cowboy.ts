import {BOARD,cellX,rowY,type ZombieKind} from './level';
import type {Game,Plant,Zombie} from './model';
export const cowboyArmor=(kind:ZombieKind)=>kind==='cowboy_armor1'?'cowboy_armor1':kind==='cowboy_armor2'?'cowboy_armor2':null;
export interface CowboyZombie {
 animation?:string;at:number;elapsed:number;fuse?:number;ignited?:boolean;dirty?:boolean;
 poncho?:number;plate?:number;dance?:boolean;danceBeat?:number;lane?:{from:number;to:number;at:number;y?:number};
 chiliUntil?:number;tailAt?:number;poisonAt?:number;poisonDuration?:number;farted?:boolean;hat?:boolean;
}
export class CowboyBattle {
 carts:{id:number;row:number;column:number;start:number;end:number}[]=[];
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
  if(z.kind==='piano')z.west={at:g.time,elapsed:0};
  if(z.kind==='prospector')z.west={at:g.time,elapsed:0,fuse:props.ExplodeCountdown,ignited:true,dirty:false};
  if(z.kind.startsWith('poncho'))z.west={at:g.time,elapsed:0,poncho:props.PonchoToughness,plate:g.random()<props.ChanceToPlate?props.ShieldToughness:0};
  if(z.kind.startsWith('cowboy'))z.west={at:g.time,elapsed:0,dance:false,danceBeat:0,hat:z.armor===0};
 }
 damage(z:Zombie,amount:number){
  const state=z.west;if(state?.poncho!==undefined){
   for(const key of ['poncho','plate'] as const){const used=Math.min(amount,state[key]!);state[key]!-=used;amount-=used;
    if(used>0&&state[key]===0)this.effect(key==='poncho'?'ponchoBreak':'plateDrop',z.x,rowY(z.row));}
  }return amount;
 }
 private effect(kind:CowboyBattle['effects'][number]['kind'],x:number,y:number){this.effects.push({id:++this.serial,kind,x,y,at:this.#game.time});}
 die(z:Zombie){if(z.west?.hat){z.west.hat=false;this.effect('cowboyHat',z.x,rowY(z.row)-90);}}
 cold(z:Zombie){if(z.kind==='prospector')z.west!.ignited=false;}
 landed(z:Zombie){if(z.kind==='prospector'&&z.west!.animation==='Flying'){z.reversed=!z.reversed;z.west!.animation='FlyEnd';z.west!.at=this.#game.time;z.landUntil=this.#game.time+this.#game.props.zombies.prospector.LandingStunnTime;this.sounds.push('prospector/landSound');}}
 eaten(p:Plant,z:Zombie){if(p.kind==='chilibean'&&z.kind!=='piano'){z.west??={at:0,elapsed:0};z.west.poisonAt=this.#game.time;z.west.poisonDuration=this.#game.props.plants.chilibean.ChiliStunDuration;}}
 tick(dt:number){
  const g=this.#game;if(g.zombies.some(z=>z.kind==='piano'&&z.hp>0&&z.x<cellX(9)&&g.time>=z.frozenUntil&&g.time>=(z.butteredUntil??0)&&g.time>=(z.stunnedUntil??0)))this.pianoUntil=g.time+1;this.pianoPlaying=g.time<this.pianoUntil;
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
  if(z.kind.startsWith('cowboy')&&s){
   const dancing=this.pianoPlaying&&z.x<cellX(9);
   if(dancing!==s.dance){s.dance=dancing;if(!z.eating){s.animation=dancing?'DanceStart':'DanceEnd';s.at=g.time;s.elapsed=0;}}
   if(s.animation==='DanceStart'||s.animation==='DanceEnd'){s.elapsed+=dt;if(s.elapsed<1/3)return true;delete s.animation;}
   const beat=Math.floor(this.pianoTime/(z.kind==='cowboy'?g.props.zombies.cowboy.CowboyPianoActionInterval:7));
   if(dancing&&beat!==s.danceBeat&&!s.lane){const choices=[z.row-1,z.row+1].filter(r=>r>=0&&r<=4);s.lane={from:z.row,to:choices[Math.floor(g.random()*choices.length)],at:g.time};}s.danceBeat=beat;
  }
  return false;
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
