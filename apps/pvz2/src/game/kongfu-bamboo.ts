import {BOARD,cellX} from './level';
import type {Game,Plant} from './model';
import {isFlying} from './pirate';
import native from '../../public/assets/kongfu/properties.json';
export class KongfuBamboo {
 states=new Map<number,{x:number;age:number;food:boolean;moving:boolean;returning:boolean;hits:Set<number>}>();
 constructor(private g:Game){}
 add(p:Plant){if(p.kind==='bambooshoot')this.states.set(p.id,{x:cellX(p.column),age:0,food:false,moving:false,returning:false,hits:new Set()});}
 start(p:Plant,food:boolean){const s=this.states.get(p.id)!;Object.assign(s,{food,moving:false,returning:false,age:0,x:cellX(p.column)});s.hits.clear();p.action=food?'food':'shoot';p.animation='AttackStart';p.actionAt=this.g.time;}
 tick(p:Plant,dt:number){const g=this.g,s=this.states.get(p.id)!,prop=native.plants.bambooshoot,start=cellX(p.column),distance=Math.min(s.food?prop.PlantfoodDistance:prop.AttackDistance,9-p.column)*BOARD.cellWidth;
  if(p.action==='idle'){
   if(p.animation==='AttackEnd'&&g.time-p.actionAt>=native.plantAnimations.bambooshoot.AttackEnd.duration)p.animation='Idle';
   if(g.time>=p.nextAction&&(g.zombies.some(z=>z.hp>0&&!z.reversed&&!isFlying(z)&&g.inLane(z,p.row)&&z.x>=start-40&&z.x<=start+distance)||g.graves.some(t=>t.hp>0&&t.row===p.row&&t.column>=p.column&&cellX(t.column)<=start+distance)))this.start(p,false);
   return;
  }
  if(!s.moving){if(g.time-p.actionAt<native.plantAnimations.bambooshoot.AttackStart.events.find(e=>e.name==='attack')!.at)return;s.moving=true;p.animation='AttackLoop';p.actionAt=g.time;g.beach.sounds.push('bambooshoot/'+(s.food?'foodStart':'attackStart'));}
  s.age+=dt;if(s.age>=1&&!s.returning){s.returning=true;s.hits.clear();g.beach.sounds.push('bambooshoot/'+(s.food?'foodEnd':'attackEnd'));}
  const t=Math.min(1,s.returning?s.age-1:s.age),ease=t<.5?2*t*t:1-(-2*t+2)**2/2,old=s.x;s.x=start+distance*(s.returning?1-ease:ease);
  for(const z of g.zombies)if(z.hp>0&&!z.reversed&&!isFlying(z)&&g.inLane(z,p.row)&&!s.hits.has(z.id)&&z.x>=Math.min(old,s.x)-25&&z.x<=Math.max(old,s.x)+25){
   s.hits.add(z.id);g.damage(z,s.food?prop.DamagePlantfood:prop.Damage);g.beach.sounds.push('bambooshoot/hit');
   if(s.food&&!s.returning&&z.kind!=='kongfu_bronze_statue'){if(!g.props.zombies[z.kind].CannotBeTossedByCitron&&g.random()<prop.PlantfoodTossChance)g.damage(z,z.hp+z.armor,'blow');else z.x+=prop.PlantfoodKnockBackDistance*BOARD.cellWidth;}
  }
  for(const grave of g.graves)if(grave.hp>0&&grave.row===p.row&&!s.hits.has(grave.id)&&cellX(grave.column)>=Math.min(old,s.x)-25&&cellX(grave.column)<=Math.max(old,s.x)+25){s.hits.add(grave.id);grave.hp-=s.food?prop.DamagePlantfood:prop.Damage;}
  if(s.age>=2){s.moving=false;p.action='idle';p.animation='AttackEnd';p.actionAt=g.time;p.nextAction=g.time+prop.AttackInterval;}
 }
}
