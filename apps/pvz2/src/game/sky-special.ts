import source from '../../public/assets/sky/properties.json';
import {BOARD,cellX,rowY} from './level';
import type {Game,Plant,Zombie} from './model';
export interface ArbiterState {animation:string;elapsed:number;crash?:{x:number;ship:boolean;target:number}}
interface Fog {row:number;column:number;life:number;light:number;alpha:number}
interface Trooper {id:number;owner:number;target:number;x:number;y:number;tx:number;ty:number;fromX:number;fromY:number;at:number;out:number;back:number;side:number;stage:'out'|'shoot'|'back'|'done';animation:string;elapsed:number;event:number;left:number;food:boolean}
export class SkySpecial {
 fog: Fog[]=[];
 troopers:Trooper[]=[];
 shots:{id:number;x:number;y:number;tx:number;ty:number;at:number}[]=[];
 rays:{id:number;x:number;y:number;tx:number;ty:number;at:number}[]=[];
 private lights=new Map<number,number>();
 constructor(private g:Game){}
 private range(r:{Min:number;Max:number}){return r.Min+this.g.random()*(r.Max-r.Min);}
 private play(p:Plant,animation:string,action:Plant['action']){p.animation=animation;p.action=action;p.actionAt=this.g.time;p.eventIndex=0;}
 init(p:Plant){this.play(p,'Idle','idle');if(p.kind==='bulbkekengi'){this.lights.set(p.id,0);this.g.beach.sounds.push('bulbkekengi/spawn');}}
 food(p:Plant){if(p.kind==='bulbkekengi'){this.play(p,'Food','food');this.g.beach.sounds.push('bulbkekengi/food_light');}else {this.troopers=this.troopers.filter(t=>t.owner!==p.id);this.play(p,'AttackStart','food');this.g.beach.sounds.push('peacommando/attack');}}
 private target(){const g=this.g,count=(z:Zombie)=>this.troopers.filter(t=>t.target===z.id&&t.stage!=='done').length,candidates=g.zombies.filter(z=>z.hp>0&&(z!==g.boss?.zombie||g.level.world==='sky')&&z.x<cellX(9)&&!g.props.zombies[z.kind].IgnoredByHomingThistle);
  return candidates.filter(z=>count(z)===0).sort((a,b)=>a.x-b.x)[0]??candidates.sort((a,b)=>(b.hp+b.armor)*(12-(b.x-BOARD.left)/BOARD.cellWidth)/count(b)**2-(a.hp+a.armor)*(12-(a.x-BOARD.left)/BOARD.cellWidth)/count(a)**2)[0];
 }
 plant(p:Plant){
  const g=this.g;
  if(p.kind==='peacommando'&&p.action==='idle'&&g.time>=p.nextAction&&this.target()){this.play(p,'AttackStart','shoot');g.beach.sounds.push('peacommando/attack');}
  if(p.action==='idle')return;
  const timeline=g.props.plantAnimations[p.kind][p.animation!],elapsed=g.time-p.actionAt;
  while(p.eventIndex!<timeline.events.length&&elapsed>=timeline.events[p.eventIndex!].at){const event=timeline.events[p.eventIndex!++].name;
   if(event==='food_light')this.lights.set(p.id,g.time+source.plants.bulbkekengi.PlantfoodDuration);
   if(event.startsWith('head_'))for(let i=0;i<(p.action==='food'?source.plants.peacommando.HeadCountFactorPlantfood:source.plants.peacommando.HeadCountFactor);i++){
    const z=this.target(),out=this.range(source.plants.peacommando.FlyToTargetTime),flight=this.range(source.plants.peacommando.FlyTime),x=cellX(p.column),y=rowY(p.row)-50;
    // Native troopers choose a random cell when plant food launches with no target.
    this.troopers.push({id:g.nextEntityId(),owner:p.id,target:z?.id??0,x,y,tx:z?z.x:cellX(Math.floor(g.random()*9)),ty:z?rowY(z.row):rowY(Math.floor(g.random()*5)),fromX:x,fromY:y,at:g.time,out,back:flight-out,side:g.random()<.5?-1:1,stage:'out',animation:'Idle',elapsed:0,event:0,left:p.action==='food'?source.plants.peacommando.ShootCountPlantfood:source.plants.peacommando.ShootCount,food:p.action==='food'});
   }
  }
  if(elapsed>=timeline.duration){
   if(p.kind==='bulbkekengi'||p.animation==='AttackEnd')this.play(p,'Idle','idle');
   else if(p.animation==='AttackStart')this.play(p,'AttackLoop',p.action);
  }
 }
 spawn(z:Zombie){if(z.kind==='sky_arbiterx'){z.row=Math.max(1,Math.min(3,z.row));z.arbiter={animation:z.entry==='ground'?'Spawn':'Idle',elapsed:0};}}
 emitFog(z:Zombie){const p=source.zombies.sky_arbiterx;
  if(!z.reversed){const column=Math.floor((z.x+BOARD.cellWidth-BOARD.left)/BOARD.cellWidth);
   for(let c=column+1;c<12;c++)for(let row=Math.max(0,Math.round(z.row)-2);row<=Math.min(4,Math.round(z.row)+2);row++){const distance=Math.abs(row-Math.round(z.row)),life=distance===0?p.FogLifeSpanMiddle:distance===1?p.FogLifeSpanSide1:p.FogLifeSpanSide2;let fog=this.fog.find(f=>f.row===row&&f.column===c);if(!fog){fog={row,column:c,life:0,light:0,alpha:0};this.fog.push(fog);}fog.life=Math.max(fog.life,life);}
  }
 }
 zombie(z:Zombie,dt:number){
  if(!z.arbiter)return false;const g=this.g,s=z.arbiter,p=source.zombies.sky_arbiterx;dt*=g.time<z.chilledUntil?.5:1;s.elapsed+=dt;
  this.emitFog(z);
  if(s.animation==='Spawn'||s.animation==='Hit'){const timeline=g.props.plantAnimations.skyArbiterX[s.animation];if(s.elapsed>=timeline.events.find(e=>e.name==='switchingFalse')!.at){s.animation='Idle';s.elapsed=0;}return true;}
  if(s.crash){const c=s.crash,half=p.CrashBackwardTime,t=s.elapsed;z.x=c.x+(t<half?t/half:1-(c.ship?1.5:1)*(t-half)/half)*BOARD.cellWidth*(z.reversed?-1:1);
   if(t>=half*2){g.beach.sounds.push('skyArbiterX/HitSounds');if(c.ship){g.sky.damageShip(p.CrashDamageToShip);z.hp=0;g.beach.sounds.push('skyArbiterX/CrashSounds');}else {const plant=g.plants.find(q=>q.id===c.target&&q.hp>0);if(plant&&!g.kongfu.peach.protected(plant)&&plant.action!=='food'){const armor=Math.min(plant.armor,p.CrashDamage);plant.armor-=armor;plant.hp-=p.CrashDamage-armor;}s.animation='Hit';s.elapsed=0;}delete s.crash;}return true;
  }
  const target=g.plants.filter(q=>q.hp>0&&q.kind!=='bulbkekengi'&&!q.hidden&&q.action!=='food'&&Math.abs(q.row-z.row)<=1&&Math.abs(cellX(q.column)-z.x)<BOARD.cellWidth*.8).sort((a,b)=>b.column-a.column)[0],ship=!z.reversed&&z.x+p.SkyCityShipDetectXOffset*.6<=g.sky.edge;
  if(target||ship){s.crash={x:z.x,ship,target:target?.id??0};s.elapsed=0;g.beach.sounds.push('skyArbiterX/PreCrashSounds');}else z.x+=(z.reversed?1:-1)*p.WalkSPS*BOARD.cellWidth*dt;
  return true;
 }
 private shoot(t:Trooper){const g=this.g;
  if(t.food){this.rays.push({id:g.nextEntityId(),x:t.x,y:t.y,tx:t.tx,ty:t.ty-40,at:g.time});for(const z of g.zombies)if(z.hp>0&&Math.abs(z.x-t.tx)<=BOARD.cellWidth&&Math.abs(rowY(z.row)-t.ty)<BOARD.cellHeight/2)g.damage(z,source.plants.peacommando.PlantfoodRayDamage);g.beach.sounds.push('peacommando/ray');}
  else {this.shots.push({id:g.nextEntityId(),x:t.x,y:t.y,tx:t.tx,ty:t.ty-40,at:g.time});g.beach.sounds.push('peacommando/shoot');}
 }
 tick(dt:number){const g=this.g;
  for(const f of this.fog){let light=f.light;for(const p of g.plants)if(p.kind==='bulbkekengi'&&p.hp>0){const d=Math.max(Math.abs(p.row-f.row),Math.abs(p.column-f.column)),radius=g.time<this.lights.get(p.id)!?2:1;if(d<=radius)light=10;else if(d===radius+1)light=Math.max(light,7);}
   f.light=light;const desired=Math.min(1,f.life/10)*Math.max(0,1-f.light/10),delta=desired-f.alpha;f.alpha+=Math.sign(delta)*Math.min(Math.abs(delta),.25*dt*(delta<0?8:1));f.life-=dt;f.light=Math.max(0,f.light-dt);
  }
  this.fog=this.fog.filter(f=>f.life>0);
  for(const t of this.troopers){const owner=g.plants.find(p=>p.id===t.owner&&p.hp>0);if(!owner){t.stage='done';continue;}const z=g.zombies.find(z=>z.id===t.target&&z.hp>0);if(z){t.tx=z.x;t.ty=rowY(z.row);}
   const endpoint={x:t.tx+t.side*80,y:t.ty-140};
   if(t.stage==='out'||t.stage==='back'){const progress=Math.min(1,(g.time-t.at)/(t.stage==='out'?t.out:t.back)),n=t.stage==='out'?progress:1-progress;t.x=cellX(owner.column)+(endpoint.x-cellX(owner.column))*n;t.y=rowY(owner.row)-50+(endpoint.y-(rowY(owner.row)-50))*n-Math.sin(Math.PI*n)*50;if(progress===1){t.at=g.time;t.elapsed=0;t.event=0;t.stage=t.stage==='out'?'shoot':'done';t.animation='Shoot';}}
   else if(t.stage==='shoot'){t.x=endpoint.x;t.y=endpoint.y;t.elapsed+=dt;const timeline=g.props.plantAnimations.commandoTrooper.Shoot;while(t.event<timeline.events.length&&t.elapsed>=timeline.events[t.event].at){const event=timeline.events[t.event++].name;if(event==='shoot'){this.shoot(t);t.left--;}if(event==='judge_shoot'&&t.left>0){t.elapsed=0;t.event=0;break;}}
    if(t.elapsed>=timeline.duration){t.stage='back';t.at=g.time;t.animation='Idle';}
   }
  }
  for(const p of g.plants)if(p.kind==='peacommando'&&p.animation==='AttackLoop'){const own=this.troopers.filter(t=>t.owner===p.id);if(own.length&&own.every(t=>t.stage==='done')){const food=p.action==='food';this.play(p,'AttackEnd','grow');p.nextAction=g.time+(food?0:this.range(source.plants.peacommando.AttackInterval));this.troopers=this.troopers.filter(t=>t.owner!==p.id);g.beach.sounds.push('peacommando/flyEnd');}}
  this.troopers=this.troopers.filter(t=>g.plants.some(p=>p.id===t.owner&&p.hp>0));
  for(const shot of this.shots)if(g.time-shot.at>=.5){const zombies=g.zombies.filter(z=>z.hp>0&&Math.abs(z.x-shot.tx)<BOARD.cellWidth/2&&Math.abs(rowY(z.row)-40-shot.ty)<BOARD.cellHeight/2),target=zombies.sort((a,b)=>Math.abs(a.x-shot.tx)-Math.abs(b.x-shot.tx))[0];if(target)g.damage(target,source.projectiles.pea_commando.Damage);for(const z of zombies)if(z.hp>0)g.damage(z,source.projectiles.pea_commando.SplashDamage[0].Damage);}
  this.shots=this.shots.filter(s=>g.time-s.at<.5);this.rays=this.rays.filter(r=>g.time-r.at<1/3);
 }
}
