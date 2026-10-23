import source from '../../public/assets/sky/properties.json';
import {BOARD,cellX,rowY} from './level';
import type {Game,Plant,Zombie} from './model';
export interface SkyEnemyState {animation:string;elapsed:number;event:number;cooldown:number;imps:number}
export class SkyEnemies {
 bolts:{id:number;x:number;row:number;sign:number;direction:number}[]=[];
 constructor(private g:Game){}
 private range(r:{Min:number;Max:number}){return r.Min+this.g.random()*(r.Max-r.Min);}
 private play(s:SkyEnemyState,animation:string){s.animation=animation;s.elapsed=0;s.event=0;}
 private targets(z:Zombie){return this.g.plants.filter(p=>p.hp>0&&p.kind!=='bulbkekengi'&&!p.hidden&&!p.leap&&p.sheep===undefined&&p.row===z.row&&!['iceburg','spikeweed','spikerock','iceweed','potatomine','primalpotatomine','goldleaf','goldbloom','stallia','perfumeshroom'].includes(p.kind));}
 private smash(p:Plant){
  const g=this.g;if(p.action==='food'||g.kongfu.peach.protected(p))return;
  if(p.kind==='primalwallnut')g.dino.smashNut(p);
  else if(p.kind==='explodeonut')g.dino.plants.smashNut(p);
  else if(['wallnut','tallnut'].includes(p.kind)&&p.armor>0)p.armor=0;
  else p.hp=0;
 }
 zombie(z:Zombie,dt:number){
  if(z.kind!=='sky_electric'&&z.kind!=='sky_gargantuar')return false;
  const g=this.g,giant=z.kind==='sky_gargantuar',props=g.props.zombies[z.kind],native=source.zombies[z.kind],name=giant?'skyGargantuar':'skyElectric',idle=giant?'Idle':'Walk';
  const s=z.skyEnemy??(z.skyEnemy={animation:idle,elapsed:0,event:0,cooldown:giant?0:this.range(source.zombies.sky_electric.TimeBeforeFirst),imps:0});
  dt*=g.time<z.chilledUntil?.5:1;z.eating=false;
  const direction=z.reversed?-1:1,target=this.targets(z).filter(p=>Math.abs(cellX(p.column)-z.x)<(giant?65:40)).sort((a,b)=>(b.column-a.column)*direction)[0];
  const contact=!z.reversed&&g.level.world==='sky'&&z.x+(s.animation==='FireLoop'?native.SkyCityShipDetectXOffsetFiring:native.SkyCityShipDetectXOffset)*.6<=g.sky.edge;
  const free=[idle,'Eat','FireLoop'].includes(s.animation);
  if(free){
   if(!giant)s.cooldown-=dt;
   const throwImp=giant&&s.imps<2&&z.hp<props.Toughness*(s.imps===0?props.HealthPercentThrowImp0:props.HealthPercentThrowImp1)&&(!z.reversed?z.x>cellX(2):z.x<cellX(6));
   const shoot=!giant&&s.cooldown<=0&&this.targets(z).some(p=>{const c=g.sky.thunder.at(p.row,p.column);return (z.x-cellX(p.column))*direction>0&&!g.props.plants[p.kind].ImmuneToLightningCharge&&!(c&&g.sky.thunder.full(c));});
   if(s.animation==='FireLoop'&&(target||throwImp||shoot||!contact))this.play(s,'FireEnd');
   else if(throwImp){this.play(s,'Throw');g.beach.sounds.push(name+'/ImpThrowSaySounds');}
   else if(giant&&target)this.play(s,'Smash');
   else if(shoot){this.play(s,g.random()<.5?'Shoot_Positive':'Shoot_Negative');s.cooldown=this.range(source.zombies.sky_electric.TimeBetween);}
   else if(!target&&contact&&s.animation!=='FireLoop'){this.play(s,'FireStart');if(giant)g.beach.sounds.push(name+'/fireStartSaySound');}
   else if(s.animation==='FireLoop')g.sky.damageShip(native.ShipDPS*dt);
   else if(target){s.animation='Eat';z.eating=true;if(target.action!=='food'&&!g.kongfu.peach.protected(target))target.hp-=props.EatDPS*dt;}
   else {s.animation=idle;z.x-=props.WalkSPS*BOARD.cellWidth*dt*direction;}
  }
  s.elapsed+=dt;const timeline=g.props.plantAnimations[name][s.animation];
  while(s.event<timeline.events.length&&s.elapsed>=timeline.events[s.event].at){
   const event=timeline.events[s.event++].name;
   if(event==='shoot_positive'||event==='shoot_negative'){this.bolts.push({id:g.nextEntityId(),x:z.x-40*direction,row:z.row,sign:event==='shoot_positive'?1:-1,direction});g.beach.sounds.push(name+'/shootSounds');}
   if(event==='smash'&&target){for(const p of g.plants.filter(p=>p.hp>0&&p.row===target.row&&p.column===target.column))this.smash(p);if(target.column>=3){s.animation='Smash_Empty';}}
   if(event==='impThrow'){
    const column=source.zombies.sky_gargantuar.ImpColumns[Math.floor(g.random()*source.zombies.sky_gargantuar.ImpColumns.length)],imp=g.spawnZombie('sky_imp',z.row,z.x);
    imp.reversed=!z.reversed;imp.leap={fromX:z.x+35*direction,fromY:rowY(z.row)-190,toX:cellX(z.reversed?8-column:column),toRow:z.row,at:g.time,duration:2};s.imps++;
   }
   const sound:Record<string,string>={charge:'chargeSounds',wear_glasses:'wearGlassesSound',fire_on:'fireStartSound',swing:'swingSounds',smash:'smashSounds',afterSmash:'afterSmashSaySounds',impThrow:'ImpThrowSounds',drill_open:'drillOpenSound',drill_away:'drillAwaySound'};
   if(sound[event])g.beach.sounds.push(name+'/'+sound[event]);
   if(event==='fire_on'){this.play(s,'FireLoop');break;}
   if(event==='switchingFalse'){this.play(s,idle);break;}
  }
  if(s.elapsed>=timeline.duration){if([idle,'Eat','FireLoop'].includes(s.animation)){s.elapsed-=timeline.duration;s.event=0;}else this.play(s,idle);}
  return true;
 }
 tick(dt:number){
  const g=this.g;
  for(const b of this.bolts){
   const old=b.x;b.x-=6*BOARD.cellWidth*dt*b.direction;
   const target=g.plants.filter(p=>p.hp>0&&p.kind!=='bulbkekengi'&&!p.hidden&&p.row===b.row&&cellX(p.column)>=Math.min(old,b.x)-20&&cellX(p.column)<=Math.max(old,b.x)+20).sort((a,b)=>b.column-a.column)[0];
   if(target){
    if(!g.props.plants[target.kind].ImmuneToLightningCharge&&target.action!=='food')g.sky.thunder.add(target.row,target.column,b.sign);
    const suffix=b.sign>0?'Positive':'Negative';g.sky.thunder.effects.push({id:g.nextEntityId(),rig:'skyBoltHit'+suffix,animation:'Play',x:b.x,y:rowY(b.row)-40,at:g.time});g.beach.sounds.push('skyBolt'+suffix+'/PopSound');b.x=-1000;
   }
  }
  this.bolts=this.bolts.filter(b=>b.x>-100&&b.x<1300);
 }
}
