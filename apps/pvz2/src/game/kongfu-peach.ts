import type {Game,Plant} from './model';
import native from '../../public/assets/kongfu/properties.json';
export class KongfuPeach {
 states=new Map<number,{cooldown:number;foodUntil:number}>();
 shields=new Map<number,number>();
 heals:{id:number;row:number;column:number;at:number}[]=[];
 constructor(private g:Game){}
 add(p:Plant){if(p.kind==='peach'){this.states.set(p.id,{cooldown:0,foodUntil:0});p.animation='Idle';}}
 protected(p:Plant){return this.g.time<(this.shields.get(p.id)??0);}
 private nearby(p:Plant){return this.g.plants.filter(q=>q.hp>0&&q.sheep===undefined&&Math.abs(q.row-p.row)<=1&&Math.abs(q.column-p.column)<=1);}
 private protect(p:Plant,duration:number){this.shields.set(p.id,Math.max(this.shields.get(p.id)??0,this.g.time+duration));}
 private heal(p:Plant,amount:number){const g=this.g;for(const q of this.nearby(p)){
  if(q.hp<g.props.plants[q.kind].Toughness){q.hp=Math.min(g.props.plants[q.kind].Toughness,q.hp+amount);this.heals.push({id:g.nextEntityId(),row:q.row,column:q.column,at:g.time});}
  // HeavenlyPeach.ts gives every nearby plant three seconds of protection.
  this.protect(q,3);
 }g.beach.sounds.push('peach/healingSound','peach/healingDripSounds');}
 food(p:Plant){p.animation='FoodStart';p.eventIndex=0;this.states.get(p.id)!.foodUntil=this.g.time+native.plants.peach.PlantfoodDuration;this.g.beach.sounds.push('peach/foodStartSounds');}
 tick(p:Plant,dt:number){const g=this.g,s=this.states.get(p.id)!,prop=native.plants.peach;
  this.heals=this.heals.filter(h=>g.time-h.at<native.plantAnimations.peachHeal.Play.duration);
  if(p.action==='food'&&g.time<s.foodUntil)for(const q of this.nearby(p))this.protect(q,1);
  if(p.animation==='Fooding'){if(g.time>=s.foodUntil){p.animation='FoodEnd';p.actionAt=g.time;p.eventIndex=0;g.beach.sounds.push('peach/foodEndSounds');}return;}
  if(p.animation!=='Idle'){
   const timeline=g.props.plantAnimations.peach[p.animation!],elapsed=g.time-p.actionAt;
   while(p.eventIndex!<timeline.events.length&&elapsed>=timeline.events[p.eventIndex!].at){const e=timeline.events[p.eventIndex!++].name;
    if(e==='heal')this.heal(p,prop.HealthPerHeal);
    if(e==='foodStart'){this.heal(p,3*prop.HealthPlantfoodHeal);g.beach.sounds.push('peach/foodRaySounds');}
    if(e==='foodEnd'){p.action='idle';p.animation='Idle';return;}
   }
   if(elapsed>=timeline.duration){p.animation=p.animation==='FoodStart'?'Fooding':'Idle';p.actionAt=g.time;if(p.animation==='Idle')p.action='idle';}
  }
  if(p.action==='food')return;s.cooldown-=dt;
  if(p.animation==='Idle'&&s.cooldown<=0&&this.nearby(p).some(q=>q.hp<g.props.plants[q.kind].Toughness)){
   s.cooldown=prop.HealInterval;p.animation='Heal';p.action='produce';p.actionAt=g.time;p.eventIndex=0;this.protect(p,3);
  }
 }
}
