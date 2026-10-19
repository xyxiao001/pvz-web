import {BOARD,cellX,rowY} from './level';
import type {Game,Plant} from './model';
import {isFlying} from './pirate';
import iceProps from '../../public/assets/iceage/properties.json';

/** Plants required by the Iceage finale and the first Lost City conveyor. */
export class ExpeditionPlants {
 gunned=new Set<number>();
 cracks=new Map<number,{row:number;column:number;until:number}>();
 lava:{id:number;row:number;column:number;at:number;until:number}[]=[];
 constructor(private g:Game){}
 init(p:Plant){if(p.kind==='lavaguava'||p.kind==='gatling')p.animation='Idle';}
 private play(p:Plant,animation:string,action:Plant['action']='idle'){p.animation=animation;p.action=action;p.actionAt=this.g.time;p.eventIndex=0;}
 food(p:Plant){
  if(p.kind==='lavaguava'){this.play(p,'FoodStart','food');this.g.iceageCombat.heat.set(p.id,this.g.time+this.g.props.plants.lavaguava.WarmingRadiusPlantfood!.PulseInitialDelay);}
  else {const upgraded=this.gunned.has(p.id);this.gunned.add(p.id);this.play(p,upgraded?'Food':'FoodStart','food');p.burst=this.g.props.plants.gatling.PlantfoodPeaCount;p.nextBurst=this.g.time;this.g.beach.sounds.push('gatling/'+(upgraded?'foodSound':'upgradeSound'));}
 }
 private pea(p:Plant,kind='pea',dy=0,curve=false){
  const g=this.g,prop=g.props.projectiles[kind],row=p.row+(curve?Math.sign(dy):0),vy=dy*BOARD.cellHeight;
  g.peas.push({id:g.nextEntityId(),row,x:cellX(p.column)+38,y:rowY(p.row)-48,damage:prop.Damage*(kind==='pea'?1:prop.DamageScale),powered:false,fire:kind==='pea'?undefined:kind==='pea_flame_blue'?'bluePea':'firePea',vector:{vx:8*BOARD.cellWidth,vy,ay:curve?-Math.sign(dy)*vy*vy/(2*BOARD.cellHeight):0,...(curve?{stopY:rowY(row)-48}:{})}});
 }
 private burn(p:{row:number;column:number},damage:number,range:number){
  const g=this.g;
  for(const z of g.zombies)if(z.hp>0&&!isFlying(z)&&Math.abs(z.row-p.row)<=range&&Math.abs(z.x-cellX(p.column))<(range+.5)*BOARD.cellWidth){g.damage(z,damage);z.chilledUntil=0;z.frozenUntil=0;}
  for(const b of [...g.graves,...g.iceage.blocks])if(b.hp>0&&Math.abs(b.row-p.row)<=range&&Math.abs(b.column-p.column)<=range)b.hp-=damage;
 }
 plant(p:Plant,dt:number){
  const g=this.g,prop=g.props.plants[p.kind];
  if(p.kind==='gatling'){
   if(p.action==='idle'&&g.time>=p.nextAction&&(g.zombies.some(z=>z.hp>0&&g.inLane(z,p.row)&&z.x>=cellX(p.column))||g.iceage.blocks.some(b=>b.hp>0&&b.row===p.row&&b.column>p.column))){this.play(p,'Shoot','shoot');p.nextAction=g.time+prop.ShootInterval+g.random()*prop.ShootIntervalAdditional;}
   if(p.animation==='Food'){
    while(p.burst>0&&g.time>=p.nextBurst){const kind=prop.PeaTypesPlantfood[Math.floor(g.random()*prop.PeaTypesPlantfood.length)];this.pea(p,kind);if(p.row>0)this.pea(p,kind,-9,true);if(p.row<4)this.pea(p,kind,9,true);p.burst--;p.nextBurst+=2/prop.PlantfoodPeaCount;}
    if(!p.burst){this.play(p,'Idle');p.nextAction=g.time;g.beach.sounds.push('gatling/foodEndSound');}return;
   }
  }else {
   if(p.action==='idle'&&g.zombies.some(z=>z.hp>0&&!isFlying(z)&&g.inLane(z,p.row)&&g.time>=z.frozenUntil&&g.time>=(z.stunnedUntil??0)&&Math.abs(z.x-cellX(p.column))<BOARD.cellWidth/2+18))this.play(p,'Death','explode');
   const crack=this.cracks.get(p.id);
   if(crack){for(const z of g.zombies)if(z.hp>0&&!isFlying(z)&&g.inLane(z,p.row)&&z.x>=cellX(p.column)-BOARD.cellWidth/2){g.damage(z,prop.PlantFoodDPS*dt);z.chilledUntil=0;z.frozenUntil=0;}for(const b of [...g.graves,...g.iceage.blocks])if(b.hp>0&&b.row===p.row&&b.column>=p.column)b.hp-=prop.PlantFoodDPS*dt;
    if(g.time>=crack.until){this.cracks.delete(p.id);this.play(p,'FoodEnd','grow');g.beach.sounds.push('lavaguava/melt');this.g.iceageCombat.heat.set(p.id,g.time+prop.WarmingRadius!.PulseInitialDelay);}
   }
  }
  if(p.action==='idle'||p.animation==='FoodLoop')return;
  const animation=p.animation!,timeline=g.props.plantAnimations[p.kind][animation],elapsed=(g.time-p.actionAt)*(animation==='Death'?1.2:1);
  while(p.eventIndex!<timeline.events.length&&elapsed>=timeline.events[p.eventIndex!].at){const event=timeline.events[p.eventIndex!++].name;
   if(p.kind==='gatling'){
    if(event==='Shoot'){this.pea(p);g.beach.sounds.push('gatling/shootSound');}
    if(event==='ShootSide'&&this.gunned.has(p.id))for(const dy of [-1.2,-.5,.5,1.2])this.pea(p,'pea',8*dy);
    if(event==='foodStart'){this.play(p,'Food','food');p.nextBurst=g.time;g.beach.sounds.push('gatling/foodSound');return;}
   }else {
    if(event==='damage')this.burn(p,prop.ExplosionDamage,1);
    if(event==='lava')this.lava.push({id:g.nextEntityId(),row:p.row,column:p.column,at:g.time,until:g.time+prop.LavaLifeSpan});
    if(event==='die'){p.hp=0;return;}
    if(event==='foodHit')this.cracks.set(p.id,{row:p.row,column:p.column,until:g.time+prop.PlantFoodDurationSeconds});
    if(['ready','shoot','pour','blop','foodSay','foodHit'].includes(event))g.beach.sounds.push('lavaguava/'+event);
    if(event==='shoot')g.beach.sounds.push('lavaguava/shootSay');
   }
  }
  if(elapsed>=timeline.duration)this.play(p,animation==='FoodStart'?'FoodLoop':'Idle',animation==='FoodStart'?'food':'idle');
 }
 tick(dt:number){
  const g=this.g,prop=iceProps.lava;
  for(const t of this.lava)if(g.time<t.until){this.burn(t,prop.DPS*dt,0);for(const z of g.zombies)if(z.hp>0&&!isFlying(z)&&z.row===t.row&&Math.abs(z.x-cellX(t.column))<BOARD.cellWidth/2)z.sappedUntil=g.time+prop.SapflingDuration;for(const p of g.plants)if(p.hp>0&&p.kind!=='lavaguava'&&p.row===t.row&&p.column===t.column&&p.action!=='food')p.hp-=prop.DPS*dt;}
  this.lava=this.lava.filter(t=>g.time<t.until+g.props.plantAnimations.lava.Fade.duration);
  for(const id of this.gunned)if(!g.plants.some(p=>p.id===id))this.gunned.delete(id);
  for(const [id] of this.cracks)if(!g.plants.some(p=>p.id===id&&p.hp>0))this.cracks.delete(id);
 }
}
