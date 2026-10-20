import {BOARD,cellX,rowY,type PlantKind} from './level';
import type {Game,Zombie} from './model';
import native from '../../public/assets/kongfu/properties.json';
export class KongfuAbbots {
 storms:{id:number;x:number;fromX:number;row:number;distance:number;direction:number;age:number;carrying:number|null;reversed:boolean}[]=[];
 shots:{id:number;x:number;row:number;direction:number}[]=[];
 private shields=new Map<number,{x:number;done:boolean;left:number}>();
 constructor(private g:Game){}
 private change(z:Zombie,animation:string){Object.assign(z.kongfu!,{animation,at:this.g.time,elapsed:0,event:0});}
 spawn(z:Zombie){if(!['abbot_fan','abbot_torch','abbot_chi','abbot_imp'].includes(z.kind))return;
  z.kongfu={animation:'Walk',at:this.g.time,elapsed:0,event:0,torch:z.kind==='abbot_torch',flying:false,rocket:false};
  if(z.kind==='abbot_fan'){const t=native.zombies.abbot_fan.TimeBeforeFirst;z.kongfu.next=t.Min+this.g.random()*(t.Max-t.Min);}
  if(z.kind==='abbot_chi'){z.x=cellX(8);z.entry='walk';z.kongfu.next=native.zombies.abbot_chi.TimeBeforeFirst;this.change(z,'Spawn');}
  if(z.kind==='abbot_imp'){const p=native.zombies.abbot_imp;this.shields.set(z.id,{x:cellX(p.ShieldColumn.Min+this.g.random()*(p.ShieldColumn.Max-p.ShieldColumn.Min)),done:false,left:p.ShieldDuration.Min+this.g.random()*(p.ShieldDuration.Max-p.ShieldDuration.Min)});if(z.entry==='ground'){z.leap={fromX:cellX(10),fromY:rowY(z.row)-180,toX:z.x,toRow:z.row,at:this.g.time,duration:.8};z.entry='walk';this.change(z,'Fly');this.g.beach.sounds.push('abbotImp/leapSounds');}}
 }
 carried(z:Zombie){return this.storms.some(s=>s.carrying===z.id&&s.age<native.zombies.abbot_fan.StormMovingTime);}
 private eligible(z:Zombie,reversed:boolean){return z.hp>0&&!!z.reversed===reversed&&!z.leap&&!z.eating&&!z.kongfu?.flying&&(!z.kongfu||z.kongfu.animation==='Walk')&&this.g.time>=z.frozenUntil&&this.g.time>=(z.stunnedUntil??0)&&this.g.time>=(z.butteredUntil??0)&&this.g.props.zombies[z.kind].ZombieSort!=='Gargantuar'&&!z.kind.startsWith('kongfu_bronze')&&!this.carried(z);}
 canPlant(kind:PlantKind,row:number,column:number){return !this.g.zombies.some(z=>z.kind==='abbot_chi'&&z.hp>0&&z.row===row&&Math.abs(z.x-cellX(column))<BOARD.cellWidth/2)||kind==='solarsage'||kind==='cherry_bomb';}
 zombie(z:Zombie,dt:number){const g=this.g;
  if(['abbot','abbot_armor1','abbot_armor2','abbot_armor3'].includes(z.kind)){
   const helmet=z.kind==='abbot_armor3'&&z.armor>native.armors.kongfu_armor3.Toughness/3;
   const rack=g.graves.find(t=>t.hp>0&&['kongfu_rack_helmet','kongfu_rack_torch','kongfu_rack_flag','kongfu_rack_fan'].includes(t.kind!)&&t.row===z.row&&Math.abs(cellX(t.column)-z.x)<50&&!helmet&&(t.kind==='kongfu_rack_helmet'||z.armor<=0&&z.hp>g.props.zombies[z.kind].Toughness*.5));
   if(rack){rack.hp=0;if(rack.kind==='kongfu_rack_helmet'){z.kind='abbot_armor3';z.armor=native.armors.kongfu_armor3.Toughness;}else{z.kind=rack.kind==='kongfu_rack_fan'?'abbot_fan':rack.kind==='kongfu_rack_torch'?'abbot_torch':'abbot_flag';z.hp=g.props.zombies[z.kind].Toughness;this.spawn(z);if(z.kind==='abbot_flag')for(let i=0;i<3;i++)g.spawnZombie((['abbot','abbot_armor1','abbot_armor2'] as const)[Math.floor(g.random()*3)],Math.floor(g.random()*5),cellX(10));}}
  }
  const s=z.kongfu;if(!s)return false;s.elapsed+=dt*(g.time<z.chilledUntil?.5:1);
  if(z.kind==='abbot_fan'){
   const p=native.zombies.abbot_fan,direction=z.reversed?1:-1,distance=Math.min(p.StormMaxDistance*BOARD.cellWidth,(cellX(z.reversed?8-p.StormMinColumn:p.StormMinColumn)-z.x)*direction);
   if(s.animation==='Walk'){s.next!-=dt;if(s.next!<=0&&distance>0&&g.zombies.some(q=>q!==z&&q.row===z.row&&this.eligible(q,!!z.reversed)&&(q.x-z.x)*direction>0&&(q.x-z.x)*direction<=distance)){this.change(z,'Attack');const t=p.TimeBetween;s.next=t.Min+g.random()*(t.Max-t.Min);}}
   if(s.animation==='Attack'){const a=native.plantAnimations.abbotFan.Attack;
    while(s.event!<a.events.length&&s.elapsed>=a.events[s.event!].at){const e=a.events[s.event!++].name;
     if(e==='launch')this.storms.push({id:g.nextEntityId(),x:z.x,fromX:z.x,row:z.row,distance,direction,age:0,carrying:null,reversed:!!z.reversed});
     if(['open','close','rotate','swing','launch'].includes(e))g.beach.sounds.push('abbotFan/'+e+'Sounds');
    }
    if(s.elapsed>=a.events.find(e=>e.name==='switchingFalse')!.at)this.change(z,'Walk');z.eating=false;return true;
   }return false;
  }
  if(z.kind==='abbot_torch'){
   const p=native.zombies.abbot_torch,anims=native.plantAnimations.abbotTorch,dir=z.reversed?-1:1;
   const targets=g.plants.filter(p=>p.hp>0&&p.row===z.row&&(z.x-cellX(p.column))*dir>=-20&&(z.x-cellX(p.column))*dir<=native.zombies.abbot_torch.FlameDetectDistance*BOARD.cellWidth);
   if(s.animation==='Walk'&&s.torch&&targets.length){this.change(z,'Breath_Start');s.next=p.FireDuration;}
   if(s.animation==='Breath_Start'&&s.elapsed>=anims.Breath_Start.events[0].at){this.change(z,'Breath_Loop');g.beach.sounds.push('abbotTorch/fireStartSounds');}
   if(s.animation==='Breath_Loop'){
    if(!s.torch||s.next!<=0){this.change(z,'Breath_End');g.beach.sounds.push('abbotTorch/fireEndSounds');}
    else {s.next!-=dt;for(const plant of g.plants)if(plant.hp>0&&plant.row===z.row&&(z.x-cellX(plant.column))*dir>=-20&&(z.x-cellX(plant.column))*dir<=p.FlameAttackDistance*BOARD.cellWidth){const damage=p.FireDPS*dt*g.future.plantDamageScale(plant),armor=Math.min(plant.armor,damage);plant.armor-=armor;plant.hp-=damage-armor;}}
   }
   if(s.animation==='Breath_End'&&s.elapsed>=anims.Breath_End.duration)this.change(z,'Walk');
   if(s.animation!=='Walk'){z.eating=false;return true;}return false;
  }
  if(z.kind==='abbot_chi'){
   const anims=g.props.plantAnimations.abbotChi,a=anims[s.animation];
   if(s.animation==='Charge_Loop'){s.next!-=dt;if(s.next!<=0)this.change(z,'Charge_End');return true;}
   if(s.animation==='Idle'){if(g.plants.some(p=>p.hp>0&&p.row===z.row&&cellX(p.column)<z.x))this.change(z,'Attack');return true;}
   while(s.event!<a.events.length&&s.elapsed>=a.events[s.event!].at){const name=a.events[s.event!++].name;if(name==='launch'){this.shots.push({id:g.nextEntityId(),x:z.x,row:z.row,direction:z.reversed?1:-1});g.beach.sounds.push('abbotChi/launchSounds','abbotChi/windSounds');}}
   if(s.elapsed>=a.duration){if(s.animation==='Spawn'||s.animation==='Charge_Start')this.change(z,'Charge_Loop');else if(s.animation==='Charge_End')this.change(z,'Idle');else if(s.animation==='Attack'){s.next=native.zombies.abbot_chi.TimeBetween;this.change(z,'Charge_Start');}}
   return true;
  }
  if(z.kind==='abbot_imp'){
   const state=this.shields.get(z.id)!,a=native.plantAnimations.abbotImp;
   if(s.animation==='Fly'){this.change(z,'Land');return true;}
   if(s.animation==='Land'&&s.elapsed>=a.Land.duration)this.change(z,'Walk');
   if(s.animation==='Walk'&&!state.done&&z.x<=state.x)this.change(z,'ShieldStart');
   if(s.animation==='ShieldStart'&&s.elapsed>=a.ShieldStart.events[0].at){state.done=true;this.change(z,'ShieldLoop');g.beach.sounds.push('abbotImp/shieldSounds');}
   if(s.animation==='ShieldLoop'){z.frozenUntil=0;z.chilledUntil=0;z.stunnedUntil=0;z.butteredUntil=0;state.left-=dt;if(state.left<=0){this.change(z,'ShieldEnd');g.beach.sounds.push('abbotImp/shieldEndSounds');}}
   if(s.animation==='ShieldEnd'&&s.elapsed>=a.ShieldEnd.duration)this.change(z,'Walk');
   if(s.animation!=='Walk')return true;
   if(!state.done){z.x-=native.zombies.abbot_imp.WalkSPS*native.zombies.abbot_imp.IntroSpeedScale*BOARD.cellWidth*dt;return true;}
  }
  return false;
 }
 tick(dt:number){const g=this.g;
  const duration=native.zombies.abbot_fan.StormMovingTime;
  for(const storm of this.storms){const old=storm.x;storm.age+=dt;const t=Math.min(1,storm.age/duration);storm.x=storm.fromX+storm.direction*storm.distance*(2*t-t*t);
   if(storm.age>=duration)continue;
   if(storm.carrying===null){const q=g.zombies.find(q=>q.row===storm.row&&this.eligible(q,storm.reversed)&&q.x>=Math.min(old,storm.x)-2&&q.x<=Math.max(old,storm.x)+2);if(q)storm.carrying=q.id;}
   if(storm.carrying!==null){const q=g.zombies.find(q=>q.id===storm.carrying);if(q&&q.hp>0){q.x=storm.x;q.eating=false;}else storm.age=duration;}
  }
  this.storms=this.storms.filter(s=>s.age<duration+.5);
  for(const shot of this.shots){shot.x+=shot.direction*8*BOARD.cellWidth*dt;const target=[...g.plants].sort((a,b)=>Number(b.kind==='bamboobusket')-Number(a.kind==='bamboobusket')).find(p=>p.hp>0&&p.row===shot.row&&!p.leap&&Math.abs(cellX(p.column)-shot.x)<30);if(target){target.hp-=native.projectiles.abbot_chi.Damage*g.future.plantDamageScale(target);g.future.pushPlant(target,0);shot.x=-200;}}
  this.shots=this.shots.filter(s=>s.x>-100&&s.x<1300);
 }
}
