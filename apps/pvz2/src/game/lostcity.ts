import type {Game,Zombie,Plant,Grave} from './model';
import {BOARD,cellX,rowY,type ZombieKind} from './level';
import {isFlying,swinging} from './pirate';
import native from '../../public/assets/lostcity/properties.json';
export const lostcityArmor=(kind:ZombieKind)=>kind==='zoybean_armor1'?'zoybean_armor1':kind==='zoybean_armor2'?'zoybean_armor2':kind==='lostcity_armor4'||kind==='lostcity_bug_armor4'?'lostcity_armor4':kind==='lostcity_armor1'||kind==='lostcity_bug_armor1'?'lostcity_armor1':kind==='lostcity_armor2'||kind==='lostcity_bug_armor2'?'lostcity_armor2':null;
export class LostCityBattle {
 crystals=new Map<number,{animation:string;at:number;elapsed:number;event:number;charge:number;next:number}>();
 crystalRays:{id:number;x:number;y:number;length:number;direction:number;at:number}[]=[];
 private crystalTargets(z:Zombie,distance:number){const g=this.g;return g.plants.filter(p=>p.hp>0&&!p.hidden&&!p.leap&&p.row===z.row&&!['iceburg','potatomine','spikeweed','spikerock','lilypad'].includes(p.kind)&&(z.reversed?cellX(p.column)-z.x:z.x-cellX(p.column))>=0&&Math.abs(cellX(p.column)-z.x)<=distance);}
 crystalSun(z:Zombie,value:number){this.crystals.get(z.id)!.charge-=native.zombies.lostcity_crystalskull.ChargingTimeDecrementPer50Sun*value/50;}
 crystal(z:Zombie,dt:number){const s=this.crystals.get(z.id);if(!s)return false;const g=this.g,prop=native.zombies.lostcity_crystalskull,length=prop.LaserBeamLength/64*BOARD.cellWidth;
  const play=(animation:string)=>{s.animation=animation;s.at=g.time;s.elapsed=0;s.event=0;};
  if(s.animation==='Walk'){
   s.next-=dt;if(z.x>=BOARD.left+9*BOARD.cellWidth||s.next>0||(!z.reversed&&!this.crystalTargets(z,length-BOARD.cellWidth/2).length)||z.reversed&&!g.zombies.some(t=>t!==z&&!t.reversed&&t.hp>0&&t.row===z.row&&t.x>=z.x&&t.x-z.x<=length-BOARD.cellWidth/2))return false;
   play('AbsorbStart');s.charge=prop.ChargingTime;z.eating=false;g.beach.sounds.push('lostCrystal/absorbSounds','lostCrystal/absorbBG');
  }
  s.elapsed+=dt;
  if(s.animation==='AbsorbStart'||s.animation==='Absorbing'){
   s.charge-=dt;
   if(!z.reversed)for(const sun of g.suns)if(sun.absorber===null){sun.absorber=z.id;sun.absorbAge=0;}
   if(s.charge<=0){play('AbsorbEnd');s.next=prop.LaserCooldownTime;for(const sun of g.suns)if(sun.absorber===z.id)sun.absorber=null;g.beach.sounds.push('lostCrystal/absorbEndSound');}
  }else s.next-=dt;
  if(s.animation==='AbsorbStart'||s.animation==='AbsorbEnd'){const transition=native.crystalTransitions[s.animation];if(s.elapsed>=transition.at)play(transition.animation);}
  if(s.animation==='Shoot'){
   const timeline=g.props.plantAnimations.lostCrystal.Shoot;
   while(s.event<timeline.events.length&&s.elapsed>=timeline.events[s.event].at){const event=timeline.events[s.event++].name;if(event==='shoot'){
    if(!z.reversed)for(const p of this.crystalTargets(z,length)){p.hp-=prop.LaserBeamDamage*g.future.plantDamageScale(p);}
    else for(const other of g.zombies)if(other!==z&&!other.reversed&&other.hp>0&&other.row===z.row&&other.x>=z.x&&other.x-z.x<=length)g.damage(other,prop.LaserBeamDamage,'potato');
    const point=g.raTarget(z);this.crystalRays.push({id:g.nextEntityId(),...point,length:length-Math.abs(z.x-point.x),direction:z.reversed?-1:1,at:g.time});g.beach.sounds.push('lostCrystal/shootSounds');
   }if(event==='switchingFalse'){play('Walk');return true;}}
  }
  return true;
 }
 thunders:{id:number;row:number;column:number;at:number;fired:boolean}[]=[];
 cracks:{row:number;column:number;until:number}[]=[];
 zoy=new Map<number,{stage:number;next:number;food:boolean}>();
 fogs:{id:number;row:number;column:number;at:number}[]=[];
 heartRates(food:boolean){return native.projectiles[food?'blooming_heart_pf':'blooming_heart'].DefenceRateList;}
 private growthDelay(){const range=native.plants.zoybeanpod.GrowthInterval;return range.Min+this.g.random()*(range.Max-range.Min);}
 private growZoy(p:Plant){const s=this.zoy.get(p.id)!;p.animation='Grow'+s.stage;s.stage=(s.stage+1)%4;p.action=s.food?'food':'grow';p.actionAt=this.g.time;p.eventIndex=0;s.next=this.g.time+this.growthDelay();this.fogs=this.fogs.filter(f=>f.id!==p.id);}
 zoyFood(p:Plant){const s=this.zoy.get(p.id)!;s.stage=2;s.food=true;this.growZoy(p);}
 zoyPlant(p:Plant){const g=this.g,s=this.zoy.get(p.id)!;
  if(p.action==='idle'){if(g.time>=s.next)this.growZoy(p);return;}
  const timeline=g.props.plantAnimations.zoybeanpod[p.animation!],elapsed=g.time-p.actionAt;
  while(p.eventIndex!<timeline.events.length&&elapsed>=timeline.events[p.eventIndex!].at){const event=timeline.events[p.eventIndex!++].name;
   if(event.startsWith('grow'))g.beach.sounds.push('zoybeanpod/'+event);
   if(event==='summon'){const pool=s.food?native.plants.zoybeanpod.SummonTypePlantfood:native.plants.zoybeanpod.SummonType;let roll=g.random()*pool.reduce((sum,v)=>sum+v.Weight,0);
    for(const item of pool){roll-=item.Weight;if(roll<0){const z=g.spawnZombie(item.Type as ZombieKind,p.row,cellX(p.column));z.reversed=true;z.zoySpawnAt=g.time;z.landUntil=g.time+g.props.plantAnimations[s.food?'zoybeanGarg':'zoybean'].Spawn.duration;g.westFinale.adopt(z);break;}}
    this.fogs.push({id:p.id,row:p.row,column:p.column,at:g.time});
   }
  }
  if(elapsed>=timeline.duration){if(s.food){s.food=false;this.growZoy(p);}else{p.action='idle';p.animation='Idle'+s.stage;s.next=g.time+this.growthDelay();}}
 }
 snowFood(p:Plant){p.animation='FoodStart';p.actionAt=this.g.time;p.eventIndex=0;p.burst=this.g.props.plants.snowpea.PlantfoodPeaCount;p.nextBurst=this.g.time+this.g.props.plantAnimations.snowpea.FoodStart.duration;}
 snowPlant(p:Plant){const g=this.g,props=g.props.plants.snowpea,elapsed=g.time-p.actionAt;
  const shoot=(food:boolean)=>{g.peas.push({id:g.nextEntityId(),row:p.row,x:cellX(p.column)+38,y:rowY(p.row)-48,damage:g.props.projectiles.pea_snow.Damage,powered:food,snow:true,...(food?{speed:8*BOARD.cellWidth}:{})});g.events.push({type:'shot'});};
  if(p.action==='food'){
   if(elapsed>=g.props.plantAnimations.snowpea.FoodStart.duration){if(p.animation==='FoodStart'){p.animation='Food';for(const z of g.zombies)if(g.inLane(z,p.row))g.chill(z,native.plants.snowpea.PlantfoodChillDuration);}
    while(p.burst>0&&g.time>=p.nextBurst){shoot(true);p.burst--;p.nextBurst+=2/props.PlantfoodPeaCount;}
    if(!p.burst){p.action='idle';p.animation='Idle';}
   }return;
  }
  if(p.action==='shoot'){const timeline=g.props.plantAnimations.snowpea.Shoot;while(p.eventIndex!<timeline.events.length&&elapsed>=timeline.events[p.eventIndex!].at){if(timeline.events[p.eventIndex!++].name==='Shoot')shoot(false);}if(elapsed>=timeline.duration){p.action='idle';p.animation='Idle';}return;}
  if(g.time>=p.nextAction&&(g.zombies.some(z=>z.hp>0&&g.inLane(z,p.row)&&z.x>cellX(p.column)-15&&z.x<1150)||g.graves.some(t=>t.hp>0&&t.row===p.row&&t.column>p.column))){p.action='shoot';p.animation='Shoot';p.actionAt=g.time;p.eventIndex=0;p.nextAction=g.time+props.ShootInterval+g.random()*props.ShootIntervalAdditional;}
 }
 trapCooldown=new Map<number,number>();
 flames:{id:number;row:number;at:number;until:number}[]=[];
 boulders:{id:number;x:number;y:number;at:number}[]=[];
 triggerTrap(i:number){const g=this.g,t=g.level.trapTiles[i];
  const next=this.trapCooldown.get(i);if(next!==undefined&&g.time<next)return;
   this.trapCooldown.set(i,g.time+t.delay);g.beach.sounds.push((t.group==='thunder'?'trapThunder':t.group==='flame'?'trapFlame':'trapBoulder')+'/triggerSounds');
   if(t.group==='flame'){this.flames.push({id:g.nextEntityId(),row:t.row,at:g.time,until:g.time+native.tiles.flame_spreader_trap.FlameDuration});g.beach.sounds.push('trapFlame/fireStartSounds');}
   else if(t.group==='thunder'){for(const cell of [{row:t.row,column:t.column},...g.beachFinale.tiles])this.thunders.push({id:g.nextEntityId(),row:cell.row,column:cell.column,at:g.time+Math.hypot(cell.row-t.row,cell.column-t.column)*native.tiles.thunder_trap.IntervalBetweenSquares,fired:false});}
   else {this.boulders.push({id:g.nextEntityId(),x:cellX(t.column)+native.tiles.boulder_trap_falling_forward.BoulderXOffset*BOARD.cellWidth,y:BOARD.top-160,at:g.time});g.beach.sounds.push('boulder/rollStartSounds');}
 }
 tickTraps(dt:number){const g=this.g;
  for(const t of this.thunders)if(!t.fired&&g.time>=t.at){t.fired=true;const damage=native.tiles.thunder_trap.ThunderDamage;
   for(const z of [...g.zombies,...g.westFinale.allies])if(z.hp>0&&z.row===t.row&&Math.abs(z.x-cellX(t.column))<BOARD.cellWidth/2+20){z.hp-=damage;z.deathCause='electric';}
   for(const p of g.plants)if(p.row===t.row&&p.column===t.column){p.hp=0;p.armor=0;}
   for(const tomb of g.graves)if(tomb.row===t.row&&tomb.column===t.column)tomb.hp-=damage;
   this.cracks.push({row:t.row,column:t.column,until:g.time+native.tiles.thunder_trap.SquareCracklingDuration});g.beach.sounds.push('trapThunder/thunderSounds');
  }
  this.thunders=this.thunders.filter(t=>g.time<t.at+g.props.plantAnimations.thunderStrike.Play0.duration);this.cracks=this.cracks.filter(c=>g.time<c.until);
  this.crystalRays=this.crystalRays.filter(r=>g.time-r.at<g.props.plantAnimations.crystalRay.Play.duration);
  for(const [i,t] of g.level.trapTiles.entries()){
   const next=this.trapCooldown.get(i);if(next!==undefined&&g.time<next)continue;
   const plant=g.plants.some(p=>p.hp>0&&!p.leap&&p.row===t.row&&p.column===t.column)&&!g.plants.some(p=>p.hp>0&&p.row===t.row&&p.column===t.column&&p.kind==='floawerPot');
   const zombie=g.zombies.some(z=>z!==g.boss?.zombie&&z.hp>0&&!isFlying(z)&&!z.leap&&!swinging(z,g.time)&&z.row===t.row&&Math.abs(z.x-cellX(t.column))<25);
   const tomb=g.graves.some(v=>v.hp>0&&v.row===t.row&&v.column===t.column);
   if(!plant&&!zombie&&!tomb)continue;
   this.triggerTrap(i);
  }
  for(const f of this.flames){if(g.time>=f.until)continue;
   for(const z of g.zombies)if(z!==g.boss?.zombie&&z.hp>0&&z.row===f.row&&!isFlying(z)&&!z.leap&&!swinging(z,g.time)){z.hp-=native.tiles.flame_spreader_trap.FlameDPS*dt;z.deathCause='potato';}
   for(const p of g.plants)if(p.hp>0&&p.row===f.row&&!p.leap){p.hp=0;p.armor=0;}
   for(const t of g.graves)if(t.hp>0&&t.row===f.row)t.hp-=native.tiles.flame_spreader_trap.FlameDPS*dt;
  }
  for(const f of this.flames)if(g.time>=f.until)g.beach.sounds.push('trapFlame/fireEndSounds');this.flames=this.flames.filter(f=>g.time<f.until);
  for(const b of this.boulders){const elapsed=g.time-b.at;b.y=elapsed<.75?BOARD.top-160+160*(elapsed/.75)**2:BOARD.top+(elapsed-.75)*120;
   if(elapsed<.75)continue;
   for(const z of g.zombies)if(z!==g.boss?.zombie&&z.hp>0&&!swinging(z,g.time)&&Math.abs(z.x-b.x)<55&&Math.abs(rowY(z.row)-b.y)<55){z.hp=0;z.armor=0;z.deathCause='mower';}
   for(const p of g.plants)if(p.hp>0&&Math.abs(cellX(p.column)-b.x)<55&&Math.abs(rowY(p.row)-b.y)<55){p.hp=0;p.armor=0;}
   for(const t of g.graves)if(t.hp>0&&Math.abs(cellX(t.column)-b.x)<55&&Math.abs(rowY(t.row)-b.y)<55)t.hp=0;
  }
  this.boulders=this.boulders.filter(b=>b.y<BOARD.top+6*BOARD.cellHeight);
 }
 tenting=new Set<number>();
 porterDrops=new Map<number,{z:Zombie;animation:string;at:number;event:number}>();
 tents=new Map<number,number>();
 torches=new Map<number,boolean>();
 shovels=new Map<number,{animation:string;at:number;elapsed:number;event:number;held:boolean}>();
 blocks=new Map<number,number>();
 shots:{id:number;row:number;x:number;y:number;fromX:number;fromY:number;target:number;toX:number;toY:number;at:number;duration:number;food:boolean;hits:number[];dead:boolean}[]=[];
 constructor(private g:Game){}
 initPlant(p:Plant){if(p.kind==='zoybeanpod'){p.animation='Idle0';this.zoy.set(p.id,{stage:0,next:this.g.time+this.growthDelay(),food:false});}if(p.kind==='snowpea')p.animation='Idle';if(p.kind==='akee')p.animation='Idle';}
 food(p:Plant){p.animation='Food';p.action='food';p.actionAt=this.g.time;p.eventIndex=0;}
 private targets(row:number,x:number,hits:number[]){return [...this.g.zombies.filter(z=>z.hp>0).map(z=>({id:z.id,row:z.row,x:z.x})),...this.g.graves.filter(t=>t.hp>0&&(t.kind==='tent'||t.kind==='backpack')).map(t=>({id:t.id,row:t.row,x:cellX(t.column)}))].filter(z=>z.row===row&&z.x>=x&&!hits.includes(z.id)).sort((a,b)=>a.x-b.x);}
 private lob(p:Plant,row:number,food:boolean){const z=this.targets(row,cellX(p.column)-15,[])[0];if(!z)return;const x=cellX(p.column),y=rowY(p.row)-70;this.shots.push({id:this.g.nextEntityId(),row,x,y,fromX:x,fromY:y,target:z.id,toX:z.x,toY:rowY(row)-45,at:this.g.time,duration:Math.max(.65,Math.abs(z.x-x)/450),food,hits:[],dead:false});}
 plant(p:Plant){
  const g=this.g,prop=g.props.plants.akee;
  if(p.action==='idle'){
   if(g.time<p.nextAction||!this.targets(p.row,cellX(p.column)-15,[]).length)return;
   p.action='shoot';p.animation='Lob';p.actionAt=g.time;p.eventIndex=0;p.nextAction=g.time+prop.ThrowInterval+g.random()*prop.ThrowIntervalAdditional;
  }
  const timeline=g.props.plantAnimations.akee[p.animation!],elapsed=g.time-p.actionAt;
  while(p.eventIndex!<timeline.events.length&&elapsed>=timeline.events[p.eventIndex!].at){const event=timeline.events[p.eventIndex!++].name;
   if(event==='Lob')this.lob(p,p.row,false);
   if(event==='lobFood'){for(let row=0;row<5;row++)this.lob(p,row,true);g.beach.sounds.push('akee/foodLob');}
   if(event==='LobSound')g.beach.sounds.push('akee/lobSound');
   if(event==='load')g.beach.sounds.push('akee/reload');
  }
  if(elapsed>=timeline.duration){p.action='idle';p.animation='Idle';}
 }
 tickShots(){
  const g=this.g;
  for(const s of this.shots){
   const z=g.zombies.find(z=>z.id===s.target&&z.hp>0),tomb=g.graves.find(t=>t.id===s.target&&t.hp>0);if(tomb){s.toX=cellX(tomb.column);s.toY=rowY(tomb.row)-45;}if(z){s.toX=z.x;s.toY=rowY(z.row)-45;}
   const t=Math.min(1,(g.time-s.at)/s.duration);s.x=s.fromX+(s.toX-s.fromX)*t;s.y=s.fromY+(s.toY-s.fromY)*t-110*4*t*(1-t);
   if(t<1)continue;
   if(z&&this.blockShot(z,true,1)){s.dead=true;continue;}
   if(z){g.damage(z,g.props.projectiles[s.food?'akee_pf':'akee'].Damage);s.hits.push(z.id);g.effects.push({id:g.nextEntityId(),kind:'hit',x:s.x,y:s.y,age:0});g.beach.sounds.push((s.food?'akeeFood':'akeeShot')+'/PopSound');}
   if(tomb){tomb.hp-=g.props.projectiles[s.food?'akee_pf':'akee'].Damage;s.hits.push(tomb.id);}
   const next=this.targets(s.row,s.x+1,s.hits)[0],max=native.projectiles[s.food?'akee_pf':'akee'].MaxHitCount.Max;
   if(!next||s.hits.length>=max){s.dead=true;continue;}
   s.fromX=s.x;s.fromY=s.y;s.target=next.id;s.toX=next.x;s.toY=rowY(next.row)-45;s.at=g.time;s.duration=Math.max(.25,Math.abs(next.x-s.x)/450);
  }
  this.shots=this.shots.filter(s=>!s.dead);
 }
 blockShot(z:Zombie,lobbed:boolean,vx:number){
  const shovel=this.shovels.get(z.id)?.held&&!lobbed&&(z.reversed?-1:1)*vx>0,umbrella=z.kind==='lostcity_jane'&&lobbed;
  if(!shovel&&!umbrella)return false;
  this.blocks.set(z.id,this.g.time);this.g.beach.sounds.push((shovel?'lostExcavator':'lostJane')+'/blockSounds');return true;
 }
 excavate(z:Zombie,dt:number){
  const s=this.shovels.get(z.id);if(!s)return false;const g=this.g;
  const play=(animation:string)=>{s.animation=animation;s.at=g.time;s.elapsed=0;s.event=0;};
  const target=()=>g.plants.filter(p=>p.hp>0&&!p.hidden&&!p.leap&&p.action!=='explode'&&p.row===z.row&&z.x>=cellX(p.column)-22&&z.x<=cellX(p.column)+65&&!['spikeweed','spikerock','iceweed','iceburg','potatomine','blover','empea','stallia','hurrikale','lavaguava','stunion','goldleaf','hotpotato'].includes(p.kind)).sort((a,b)=>b.column-a.column)[0];
  if(s.animation==='Walk_Shovel'){
   const p=target();if(!p)return false;z.eating=false;play(p.action==='food'||g.props.plants[p.kind].CannotBePushedByFootballMech?'Attack':'Dig');
  }
  if(s.animation==='Walk')return false;
  s.elapsed+=dt;const timeline=g.props.plantAnimations.lostExcavator[s.animation];
  while(s.event<timeline.events.length&&s.elapsed>=timeline.events[s.event].at){const e=timeline.events[s.event++].name;
   if(e==='dig'||e==='throw'||e==='hit'){g.beach.sounds.push('lostExcavator/'+e+'Sounds');g.beach.sounds.push('lostExcavator/'+(e==='dig'?'digSaySounds':'throwSaySounds'));}
   if(e==='hit'){const p=target();if(p&&p.action!=='food')p.hp-=g.props.zombies[z.kind].ShovelDamage*g.future.plantDamageScale(p);}
   if(e==='throw'){const p=target();if(p){
    if(p.action==='food'||g.props.plants[p.kind].CannotBePushedByFootballMech){s.held=false;play('Lose');g.beach.sounds.push('lostExcavator/loseShovelSounds');return true;}
    const direction=z.reversed?-1:1;let col=p.column+2*direction;
    while(col>=0&&col<9&&(g.plants.some(q=>q.hp>0&&q.row===p.row&&q.column===col)||g.graves.some(q=>q.hp>0&&q.row===p.row&&q.column===col)||g.level.mold.some(q=>q.row===p.row&&q.column===col)))col+=direction;
    if(col<0||col>=9)p.hp=0;else {p.leap={x:cellX(p.column),y:rowY(p.row),at:g.time,pushed:true};p.column=col;}
   }}
  }
  if(s.elapsed>=timeline.duration)play(s.held?'Walk_Shovel':'Walk');return true;
 }

 porter(z:Zombie){
  if(z.kind!=='lostcity_impporter'||z.eating)return false;const g=this.g;
  const tile=g.beachFinale.tiles.find(t=>t.row===z.row&&Math.abs(z.x-cellX(t.column))<20&&!g.graves.some(tomb=>tomb.hp>0&&tomb.row===t.row&&tomb.column===t.column));
  if(!tile)return false;
  this.tenting.add(z.id);z.hp=0;return true;
 }
 die(z:Zombie){
  if(z.kind!=='lostcity_impporter'||['water','swallow','potato','blow','toss'].includes(z.deathCause))return;
  this.porterDrops.set(z.id,{z,animation:this.tenting.has(z.id)?'Tent':'Death',at:this.g.time,event:0});
 }
 private placeTomb(z:Zombie,kind:'tent'|'backpack'){
  const g=this.g,column=Math.floor((z.x-BOARD.left)/BOARD.cellWidth);
  if(column<0||column>=9||g.graves.some(t=>t.hp>0&&t.row===z.row&&t.column===column))return;
  for(const p of g.plants)if(p.row===z.row&&p.column===column){p.hp=0;p.armor=0;}
  const tomb:Grave={id:g.nextEntityId(),row:z.row,column,kind,hp:native.tombs[kind].Toughness,stage:0,spawnAt:g.time};g.graves.push(tomb);
  if(kind==='tent')this.tents.set(tomb.id,g.time+native.tombs.tent.SummonInterval.Min+g.random()*(native.tombs.tent.SummonInterval.Max-native.tombs.tent.SummonInterval.Min));
 }
 tickTents(){
  const g=this.g;
  for(const [id,d] of this.porterDrops){
   const timeline=g.props.plantAnimations.lostPorter[d.animation];
   while(d.event<timeline.events.length&&g.time-d.at>=timeline.events[d.event].at){const event=timeline.events[d.event++].name;
    if(event==='tent')this.placeTomb(d.z,'tent');if(event==='place'){this.placeTomb(d.z,'backpack');g.beach.sounds.push('lostPorter/placeSounds');}
    if(event==='throw')g.beach.sounds.push('lostPorter/throwSounds','lostPorter/throwSaySounds');
   }
   if(g.time-d.at>=timeline.duration)this.porterDrops.delete(id);
  }
  for(const [id,next] of this.tents){
   const t=g.graves.find(t=>t.id===id&&t.hp>0);if(!t){this.tents.delete(id);continue;}
   if(g.time<next)continue;
   const props=native.tombs.tent;let roll=g.random()*props.SummonnedZombies.reduce((sum,z)=>sum+z.Weight,0);
   for(const item of props.SummonnedZombies){roll-=item.Weight;if(roll<0){const z=g.spawnZombie(item.Type as ZombieKind,t.row,cellX(t.column));z.tentSpawnAt=g.time;z.landUntil=g.time+g.props.plantAnimations.lostcity.Spawn.events.find(e=>e.name==='switchingFalse')!.at;break;}}
   this.tents.set(id,g.time+props.SummonInterval.Min+g.random()*(props.SummonInterval.Max-props.SummonInterval.Min));
  }
 }
 damageTomb(t:Grave){const kind=t.kind as 'tent'|'backpack';t.stage=t.hp<=0?5:5-Math.floor(t.hp/native.tombs[kind].Toughness*5);if(t.hp<=0)this.g.beach.sounds.push('lostTent/breakSounds');}

 damageBug(z:Zombie,amount:number){
  const b=z.bug;if(!b||b.hp<=0)return false;
  b.hp=Math.max(0,b.hp-amount);
  if(b.hp===0){b.animation='Land';b.at=this.g.time;b.risen=false;this.g.beach.sounds.push('lostcity/bugSplatSounds');}
  return true;
 }
 tickBug(z:Zombie){
  const b=z.bug;if(!b||!b.flying&&b.animation!=='Land')return false;const g=this.g;
  if(['Land','Rise_Bug','Unrise_Bug'].includes(b.animation)){
   const timeline=g.props.plantAnimations.lostcity[b.animation],elapsed=g.time-b.at;
   if(b.animation==='Land'&&elapsed>=timeline.events.find(e=>e.name==='leapEnd')!.at)b.flying=false;
   if(elapsed<timeline.events.find(e=>e.name==='switchingFalse')!.at){z.eating=false;return true;}
   b.animation=b.hp>0?(b.risen?'Walk_Bug_Risen':'Walk_Bug'):'Walk';
   if(b.hp===0)return false;
  }
  const plants=g.plants.filter(p=>p.hp>0&&!p.hidden&&!p.leap&&p.row===z.row&&Math.abs(z.x-cellX(p.column))<55&&!['spikeweed','spikerock','iceweed','iceburg','potatomine','blover','empea','stallia','hurrikale','lavaguava','stunion','goldleaf','hotpotato'].includes(p.kind));
  const rise=plants.length>0&&!plants.some(p=>p.kind==='tallnut');
  if(rise!==b.risen){b.risen=rise;b.animation=rise?'Rise_Bug':'Unrise_Bug';b.at=g.time;z.eating=false;g.beach.sounds.push(rise?'lostcity/bugRiseSounds':'lostcity/bugUnriseSounds');return true;}
  b.animation=b.risen?'Walk_Bug_Risen':'Walk_Bug';return false;
 }

 spawn(z:Zombie){if(z.kind==='lostcity_crystalskull')this.crystals.set(z.id,{animation:'Walk',at:this.g.time,elapsed:0,event:0,charge:0,next:0});if(z.kind==='lostcity_relichunter'){const g=this.g,prop=g.props.zombies[z.kind],timeline=g.props.plantAnimations.lostRelic,back=timeline.SwingBack.events.find(e=>e.name==='swingJudge')!.at;z.x=cellX(prop.LandingColumns[Math.floor(g.random()*prop.LandingColumns.length)]);z.swing={at:g.time,judge:g.time+back,end:g.time+back+timeline.SwingSuccess.events.find(e=>e.name==='switchingFalse')!.at,failure:false};}if(z.kind==='lostcity_gargantuar')this.torches.set(z.id,true);if(z.kind.startsWith('lostcity_bug'))z.bug={hp:this.g.props.zombies[z.kind].BugToughness,animation:'Walk_Bug',at:this.g.time,risen:false,flying:true};if(z.kind==='lostcity_excavator')this.shovels.set(z.id,{animation:'Walk_Shovel',at:this.g.time,elapsed:0,event:0,held:true});if(z.kind==='lostcity_lostpilot'||z.kind==='lostcity_lostpilot_veteran')z.pilot={animation:z.entry==='parachute'?'Arrive':'Walk',at:this.g.time,event:0,hanging:z.entry==='parachute',left:this.g.props.zombies[z.kind].HangingNoEatTimeUntilDrop,fallTime:0};}
 tick(z:Zombie,dt:number){
  const s=z.pilot;if(!s)return false;const g=this.g;
  const play=(name:string)=>{s.animation=name;s.at=g.time;s.event=0;};
  if(s.animation==='Walk')return false;
  if(s.animation==='Idle_Hang'||s.animation==='Eat_Hang'){
   if(!z.eating)s.left-=dt;if(s.left<=0){s.hanging=false;play('Land');return true;}s.animation=z.eating?'Eat_Hang':'Idle_Hang';return false;
  }
  const timeline=g.props.plantAnimations[z.kind==='lostcity_lostpilot_veteran'?'lostPilotVeteran':'lostPilot'][s.animation];
  while(s.event<timeline.events.length&&g.time-s.at>=timeline.events[s.event].at){const e=timeline.events[s.event++].name;if(['arrive','drop','break'].includes(e))g.beach.sounds.push((z.kind==='lostcity_lostpilot_veteran'?'lostPilotVeteran':'lostPilot')+'/'+e+'Sounds');}
  if(g.time-s.at>=Math.max(s.animation==='Arrive'?s.fallTime:0,timeline.duration))play(s.hanging?'Idle_Hang':'Walk');
  return true;
 }
}
