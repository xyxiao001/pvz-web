import {BOARD,cellX,rowY,type ZombieKind} from './level';
import type {Game,Plant,Zombie} from './model';
import native from '../../public/assets/kongfu/properties.json';
export interface KongfuZombie {animation:string;at:number;elapsed:number;torch:boolean;flying:boolean;rocket:boolean;bomb?:boolean;ignited?:boolean;drunk?:boolean;enraged?:boolean;next?:number;count?:number;event?:number;life?:number;duration?:number;awakens?:ZombieKind}
export const isRack=(kind?:string)=>kind!==undefined&&['kongfu_rack_torch','kongfu_rack_hammer','kongfu_rack_bomb','kongfu_rack_flag','kongfu_rack_helmet'].includes(kind);
export const rackHP=(kind:string)=>native.tombs[kind as keyof typeof native.tombs].Toughness;
export const rackDisplay=(kind:string)=>({kongfu_rack_torch:0,kongfu_rack_bomb:2,kongfu_rack_flag:3,kongfu_rack_hammer:5,kongfu_rack_helmet:6})[kind]!;
export class KongfuCombat {
 tnt:{row:number;column:number;length:number;speed:number;lit:boolean;explodeAt:number|null}[]=[];
 reflected:{id:number;x:number;y:number;vx:number;damage:number;name:'pea'|'boomerang';powered:boolean}[]=[];
 constructor(protected g:Game){}
 initCombat(){for(const t of this.g.level.bronzeStatues){const z=this.g.spawnZombie('kongfu_bronze_statue',t.GridY,cellX(t.GridX)),s=z.kongfu!;s.duration=t.LifeSpan.Min+this.g.random()*(t.LifeSpan.Max-t.LifeSpan.Min);s.life=s.duration;s.awakens=t.ZombiesToSpawn[Math.floor(this.g.random()*t.ZombiesToSpawn.length)];}this.tnt=this.g.level.tnt?this.g.level.tnt.SpawnData.map(t=>({row:t.GridY,column:t.GridX,length:t.WireLength,speed:t.Speed,lit:false,explodeAt:null})):[];}
 spawn(z:Zombie){if(!['kongfu_chi','kongfu_torch','kongfu_hammer','kongfu_rocket_imp','kongfu_bomb','kongfu_drink','kongfu_gong','kongfu_bronze_statue','kongfu_bronze_strong'].includes(z.kind))return;const flying=z.kind==='kongfu_rocket_imp'&&(z.entry==='walk'||z.entry==='raid');z.kongfu={animation:flying?'Walk_Fly':'Walk',at:this.g.time,elapsed:0,torch:z.kind==='kongfu_torch',flying,rocket:z.kind==='kongfu_rocket_imp',event:0};if(z.kind==='kongfu_chi')z.kongfu.next=native.zombies.kongfu_chi.ChiIntervalStart;if(z.kind==='kongfu_bomb'){z.kongfu.bomb=true;z.kongfu.ignited=true;}if(z.kind==='kongfu_gong'){const t=native.zombies.kongfu_gong.TimeBeforeSummon;z.kongfu.next=t.Min+this.g.random()*(t.Max-t.Min);}if(z.kind==='kongfu_bronze_statue')z.kongfu.animation='Idle0';if(flying){z.entry='walk';this.g.beach.sounds.push('kongfuRocket/launchSounds');}}
 private change(z:Zombie,animation:string){Object.assign(z.kongfu!,{animation,at:this.g.time,elapsed:0,event:0});}
 cold(z:Zombie){if(!z.kongfu)return;z.kongfu.torch=false;z.kongfu.ignited=false;if(z.kongfu.flying)this.land(z,false);}
 heat(z:Zombie){if(z.kind==='kongfu_bomb'&&z.kongfu!.bomb)z.kongfu!.ignited=true;if(z.kind==='kongfu_torch')z.kongfu!.torch=true;if(z.kind==='kongfu_rocket_imp'&&z.kongfu!.rocket&&!z.kongfu!.flying&&z.kongfu!.animation!=='Flee'){this.change(z,'Flee');this.g.beach.sounds.push('kongfuRocket/scream0Sounds');}}
 private land(z:Zombie,throwRocket=true){z.kongfu!.flying=false;if(throwRocket)z.kongfu!.rocket=false;this.change(z,'Drop');this.g.beach.sounds.push('kongfuRocket/scream1Sounds');}
 speed(z:Zombie){return z.kongfu?.drunk?native.zombies.kongfu_drink.DrunkWalkingSpeedScale:z.kongfu?.enraged?native.zombies.kongfu_bronze_strong.EnragedWalkingSpeedScale:1;}
 damageScale(z:Zombie){return z.kongfu?.drunk?native.zombies.kongfu_drink.DrunkDamageMult:z.kongfu?.animation==='Drink'?native.zombies.kongfu_drink.DrinkingDamageMult:1;}
 animation(z:Zombie){if(z.kongfu?.drunk&&z.kongfu.animation==='Walk')return z.eating?'Eat_Drunk':'Walk_Drunk';return z.kongfu&&z.kongfu.animation!=='Walk'?z.kongfu.animation:null;}
 zombie(z:Zombie,dt:number){const g=this.g;
  if(['kongfu','kongfu_armor1','kongfu_armor2','kongfu_armor3'].includes(z.kind)){
   const helmet=z.kind==='kongfu_armor3'&&z.armor>native.armors.kongfu_armor3.Toughness/3;
   const rack=g.graves.find(t=>t.hp>0&&isRack(t.kind)&&t.row===z.row&&Math.abs(cellX(t.column)-z.x)<50&&!helmet&&(t.kind==='kongfu_rack_helmet'||z.armor<=0&&z.hp>g.props.zombies[z.kind].Toughness*.5));
   if(rack){rack.hp=0;if(rack.kind==='kongfu_rack_helmet'){z.kind='kongfu_armor3';z.armor=native.armors.kongfu_armor3.Toughness;}
    else {z.kind=({kongfu_rack_torch:'kongfu_torch',kongfu_rack_hammer:'kongfu_hammer',kongfu_rack_bomb:'kongfu_bomb',kongfu_rack_flag:'kongfu_flag'} as const)[rack.kind as 'kongfu_rack_torch'|'kongfu_rack_hammer'|'kongfu_rack_bomb'|'kongfu_rack_flag'];z.hp=g.props.zombies[z.kind].Toughness;this.spawn(z);
     if(z.kind==='kongfu_flag')for(let i=0;i<3;i++)g.spawnZombie((['kongfu','kongfu_armor1','kongfu_armor2'] as const)[Math.floor(g.random()*3)],Math.floor(g.random()*5),cellX(10));
    }
   }
  }
  const s=z.kongfu;if(!s)return false;const step=dt*(g.time<z.chilledUntil?.5:1);s.elapsed+=s.flying?dt:step*(s.enraged&&s.animation==='Smash'?native.zombies.kongfu_bronze_strong.EnragedSmashingSpeedScale:1);
  if(this.roster(z))return true;
  if(z.kind==='kongfu_hammer'){
   const timeline=native.plantAnimations.kongfuHammer;
   if(s.animation==='RotateStart'&&s.elapsed>=timeline.RotateStart.events[0].at)this.change(z,'RotateLoop');
   else if(s.animation==='RotateLoop'&&s.elapsed>=native.zombies.kongfu_hammer.HammerDuration)this.change(z,'RotateEnd');
   else if(s.animation==='RotateEnd'&&s.elapsed>=timeline.RotateEnd.events[0].at)this.change(z,'Resting');
   else if(s.animation==='Resting'&&s.elapsed>=native.zombies.kongfu_hammer.RestDuration)this.change(z,'Walk');
   if(s.animation!=='Walk'){z.eating=false;return true;}
  }
  if(z.kind==='kongfu_rocket_imp'){
   if(s.animation==='Flee'){if(s.elapsed>=native.plantAnimations.kongfuRocket.Flee.duration)g.damage(z,z.hp+z.armor,'blow');return true;}
   if(s.animation==='Drop'){if(s.elapsed>=native.plantAnimations.kongfuRocket.Drop.events.find(e=>e.name==='switchingFalse')!.at)this.change(z,'Walk');return true;}
   if(s.flying){if(z.x<=cellX(0)||g.plants.some(p=>p.hp>0&&!p.hidden&&p.row===z.row&&!['iceburg','spikeweed','spikerock'].includes(p.kind)&&Math.abs(cellX(p.column)-z.x)<45)||g.graves.some(t=>t.hp>0&&t.row===z.row&&Math.abs(cellX(t.column)-z.x)<45)){this.land(z);return true;}z.x-=native.zombies.kongfu_rocket_imp.WalkSPS*native.zombies.kongfu_rocket_imp.WalkSpeedMultFlying*BOARD.cellWidth*dt;return true;}
  }
  return false;
 }
 private roster(z:Zombie){const g=this.g,s=z.kongfu!;
  if(z.kind==='kongfu_bronze_statue')return true;
  if(z.kind==='kongfu_chi'){
   if(z.reversed&&s.animation==='Absorb')this.change(z,'Walk');
   if(!z.reversed&&s.animation==='Walk'&&!z.eating&&z.x>cellX(2)&&z.x<cellX(9)&&g.plants.some(p=>p.hp>0&&!p.hidden&&p.row===z.row&&cellX(p.column)<z.x&&!['bambooshoot','iceburg','spikeweed','spikerock'].includes(p.kind))&&s.elapsed>=s.next!){this.change(z,'Absorb');g.beach.sounds.push('kongfuChi/chargeSound');}
   if(s.animation==='Absorb'){const timeline=native.plantAnimations.kongfuChi.Absorb;
    if(s.event===0&&s.elapsed>=timeline.events.find(e=>e.name==='absorb')!.at){s.event=1;g.kongfu.turnip.chi(z);g.beach.sounds.push('kongfuChi/chiSound');}
    if(s.elapsed>=timeline.duration){this.change(z,'Walk');s.next=native.zombies.kongfu_chi.ChiInterval;}z.eating=false;return true;
   }
  }
  const target=()=>g.plants.find(p=>p.hp>0&&!p.hidden&&p.sheep===undefined&&p.row===z.row&&!['bambooshoot','iceburg','spikeweed','spikerock','iceweed','goldleaf','lilypad','floawerPot'].includes(p.kind)&&Math.abs(cellX(p.column)-z.x)<50);
  if(z.kind==='kongfu_bomb'){
   if(s.bomb&&z.hp<=native.zombies.kongfu_bomb.Toughness*.5){s.bomb=false;s.ignited=false;}
   if(s.animation==='Walk'&&s.bomb&&s.ignited&&target()){this.change(z,'Explode');g.beach.sounds.push('kongfuBomb/surpriseSounds');}
   if(s.animation==='Explode'){
    if(s.event===0&&s.elapsed>=native.plantAnimations.kongfuBomb.Explode.events.find(e=>e.name==='explode')!.at){s.event=1;if(s.bomb&&s.ignited){
     for(const p of g.plants)if(p.hp>0&&Math.abs(p.row-z.row)<=1&&Math.abs(cellX(p.column)-z.x)<BOARD.cellWidth*(p.row===z.row?3.125:2)/2){const amount=native.zombies.kongfu_bomb.ExplodeDamageToPlants,armor=Math.min(p.armor,amount);p.armor-=armor;p.hp-=amount-armor;}
     for(const other of g.zombies)if(other!==z&&other.hp>0&&!!other.reversed!==!!z.reversed&&Math.abs(other.row-z.row)<=1&&Math.abs(other.x-z.x)<BOARD.cellWidth*(other.row===z.row?3.125:2)/2)g.damage(other,native.zombies.kongfu_bomb.ExplodeDamageToZombies);
     s.bomb=false;g.effects.push({id:g.nextEntityId(),kind:'explode',x:z.x,y:rowY(z.row),age:0});g.damage(z,native.zombies.kongfu_bomb.ExplodeDamageToZombies,'potato');
    }}
    if(s.elapsed>=native.plantAnimations.kongfuBomb.Explode.duration)this.change(z,'Walk');z.eating=false;return true;
   }
  }
  if(z.kind==='kongfu_drink'){
   if(!s.drunk&&s.animation==='Walk'&&z.hp<=native.zombies.kongfu_drink.Toughness*native.zombies.kongfu_drink.DrinkHealthPct)this.change(z,'Drink');
   if(s.animation==='Drink'){for(const e of native.plantAnimations.kongfuDrink.Drink.events.slice(s.event)){
    if(s.elapsed<e.at)break;s.event!++;if(e.name==='drink')g.beach.sounds.push('kongfuDrink/drinkSounds');if(e.name==='change')s.drunk=true;
   }if(s.elapsed>=native.plantAnimations.kongfuDrink.Drink.duration)this.change(z,'Walk');z.eating=false;return true;}
  }
  if(z.kind==='kongfu_gong'&&z.hp>native.zombies.kongfu_gong.Toughness*.5&&z.x<cellX(9)){
   if(s.animation==='Walk'&&s.elapsed>=s.next!){const c=native.zombies.kongfu_gong.SummonCount;s.count=c.Min+Math.floor(g.random()*(c.Max-c.Min+1));this.change(z,'Gong');}
   if(s.animation==='Gong'){
    const events=native.plantAnimations.kongfuGong.Gong.events;
    if(s.event===0&&s.elapsed>=events.find(e=>e.name==='hit')!.at){s.event=1;const distance=native.zombies.kongfu_gong.ZombieSummonDistance;g.spawnZombie('kongfu_bomb',Math.floor(g.random()*5),z.x-(distance.Min+g.random()*(distance.Max-distance.Min))*BOARD.cellWidth,'ground');g.beach.sounds.push('kongfuGong/hitSounds');}
    if(s.event===1&&s.elapsed>=events.find(e=>e.name==='judgeAgain')!.at){s.event=2;s.count!--;if(s.count!>0){this.change(z,'Gong');s.elapsed=.4;s.at=g.time-.4;}}
    if(s.elapsed>=native.plantAnimations.kongfuGong.Gong.duration){this.change(z,'Walk');const t=native.zombies.kongfu_gong.TimeBetweenSummon;s.next=t.Min+g.random()*(t.Max-t.Min);}z.eating=false;return true;
   }
  }else if(z.kind==='kongfu_gong'&&s.animation==='Gong')this.change(z,'Walk');
  if(z.kind==='kongfu_bronze_strong'){
   const prop=native.zombies.kongfu_bronze_strong,anims=native.plantAnimations.kongfuStrong;
   if(s.animation==='Walk'){if(!s.enraged&&z.hp<=prop.Toughness*prop.EnrageHealthPct)this.change(z,'Enrage');else if(target())this.change(z,'Smash');}
   if(s.animation!=='Walk'){
    const a=anims[s.animation as 'Spawn'|'Enrage'|'Smash'];
    while(s.event!<a.events.length&&s.elapsed>=a.events[s.event!].at){const e=a.events[s.event!++].name;
     if(e==='enrage')s.enraged=true;
     if(e==='smash'){const p=target();if(p){const armor=Math.min(p.armor,prop.SmashDamage);p.armor-=armor;p.hp-=prop.SmashDamage-armor;}}
     if(e==='roar')g.beach.sounds.push('kongfuStrong/roarSounds');
    }
    if(s.elapsed>=a.duration)this.change(z,'Walk');z.eating=false;return true;
   }
  }
  return false;
 }
 private catchShot(x:number,y:number,vx:number,damage:number,name:'pea'|'boomerang',powered:boolean){const g=this.g;
  const z=g.zombies.find(z=>z.kind==='kongfu_hammer'&&z.hp>0&&!z.reversed&&g.time>=z.frozenUntil&&g.time>=(z.stunnedUntil??0)&&g.time>=(z.butteredUntil??0)&&Math.abs(z.x-x)<35&&Math.abs(rowY(z.row)-45-y)<40);
  if(!z)return false;const s=z.kongfu!;
  if(s.animation==='Walk'&&vx>0){this.change(z,'RotateStart');return false;}
  if(s.animation!=='RotateLoop')return false;
  this.reflected.push({id:g.nextEntityId(),x,y,vx:-vx,damage:damage*native.zombies.kongfu_hammer.ProjectileDamageMult,name,powered});g.beach.sounds.push('kongfuHammer/hitSounds');return true;
 }
 tip(t:typeof this.tnt[number]){return cellX(t.column)+t.length*BOARD.cellWidth;}
 burningAt(p:Plant,width=BOARD.cellWidth/4){return this.tnt.some(t=>t.lit&&t.row===p.row&&Math.abs(this.tip(t)-cellX(p.column))<width);}
 extinguish(p:Plant,all=false){for(const t of this.tnt)if(all||t.row===p.row&&Math.abs(this.tip(t)-cellX(p.column))<BOARD.cellWidth/2)t.lit=false;}
 tickCombat(dt:number){const g=this.g;
  for(const z of g.zombies)if(z.kind==='kongfu_bronze_statue'&&z.hp>0){const s=z.kongfu!;s.life!-=dt;
   if(s.life!<=0){const fraction=z.hp/native.zombies.kongfu_bronze_statue.Toughness;z.kind=s.awakens!;z.hp=g.props.zombies[z.kind].Toughness*fraction;this.spawn(z);this.change(z,'Spawn');}
   else {const animation='Idle'+Math.min(4,Math.floor(5*(1-s.life!/s.duration!)));if(s.animation!==animation)this.change(z,animation);}
  }
  if(g.zombies.some(z=>z.kind==='kongfu_hammer')){
   g.peas=g.peas.filter(p=>p.vector?.ay!==undefined&&p.vector.ay!==0||!this.catchShot(p.x,p.y,p.vector?.vx??(p.powered?p.speed!:360),p.damage,'pea',p.powered));
   g.cowboy.shots=g.cowboy.shots.filter(p=>!this.catchShot(p.x,rowY(p.row)-45,p.vx,p.damage,'pea',p.mega));
   g.missiles=g.missiles.filter(p=>p.kind!=='boomerang'||!this.catchShot(p.x,p.y,p.dx*656*(p.returning?-1:1),p.damage,'boomerang',p.powered));
  }
  for(const p of this.reflected){p.x+=p.vx*dt;const plant=g.plants.find(t=>t.hp>0&&!t.hidden&&Math.abs(cellX(t.column)-p.x)<25&&Math.abs(rowY(t.row)-45-p.y)<40);if(plant){const armor=Math.min(plant.armor,p.damage);plant.armor-=armor;plant.hp-=(p.damage-armor)*g.future.plantDamageScale(plant);p.x=-200;}}
  this.reflected=this.reflected.filter(p=>p.x>0&&p.x<BOARD.width);
  for(const t of this.tnt){
   if(t.explodeAt!==null){if(g.time-t.explodeAt>=native.plantAnimations.kongfuTNT.Explode.duration&&g.phase==='playing'){
    const config=g.level.tnt!;if(config.DamagesToPlants)for(const p of g.plants)if(Math.abs(p.row-t.row)<=1&&Math.abs(p.column-t.column)<=1)p.hp-=1800;
    if(config.DamagesToZombies)for(const z of g.zombies)if(Math.abs(z.row-t.row)<=1&&Math.abs(z.x-cellX(t.column))<123)g.damage(z,1800);
    g.effects.push({id:g.nextEntityId(),kind:'explode',x:cellX(t.column),y:rowY(t.row),age:0});if(config.TriggerGameLose){g.phase='lost';g.lossReason='tnt';g.events.push({type:'lose'});}
   }continue;}
   if(t.lit){t.length-=t.speed*dt;
    if(g.westFinale.winds.some(w=>w.row===t.row&&w.until>g.time))t.lit=false;
    for(const pea of g.peas)if(pea.snow&&pea.row===t.row&&Math.abs(pea.x-this.tip(t))<25){t.lit=false;pea.x=1300;}
    if(t.length<=0){t.length=0;t.explodeAt=g.time;}
   }else {const z=g.zombies.find(z=>z.hp>0&&z.kongfu?.torch&&z.row===t.row&&z.x-30<=this.tip(t)&&z.x>=cellX(t.column));if(z){t.length=Math.min(t.length,(z.x-30-cellX(t.column))/BOARD.cellWidth);t.lit=true;z.kongfu!.torch=false;g.beach.sounds.push('kongfuTNT/igniteSounds');}}
  }
 }
}
