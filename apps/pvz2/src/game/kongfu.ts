import {KongfuBamboo} from './kongfu-bamboo';
import {KongfuCombat,isRack} from './kongfu-combat';
import {BOARD,cellX,rowY,type ZombieKind} from './level';
import type {Game,Plant} from './model';
import native from '../../public/assets/kongfu/properties.json';
export const kongfuArmor=(kind:ZombieKind)=>kind==='kongfu_armor3'?'kongfu_armor3':kind==='kongfu_armor1'?'kongfu_armor1':kind==='kongfu_armor2'?'kongfu_armor2':null;
export class KongfuBattle extends KongfuCombat {
 bamboo=new KongfuBamboo(this.g);
 tiles:{row:number;column:number;left:number;lit:boolean;rate:number;deadAt:number|null}[]=[];
 gourds=new Map<number,{sleep:number;charge:number;distance:number;left:number;flame:boolean;food:boolean}>();
 constructor(g:Game){super(g);}
 init(){this.initCombat();this.tiles=this.g.level.taichiTiles.map(t=>({...t,left:native.tiles.taichitile.LifeSpan,lit:false,rate:1,deadAt:null}));}
 tick(dt:number){const g=this.g;this.tickCombat(dt);
  for(const t of this.tiles){if(t.deadAt!==null)continue;const cost=g.plants.filter(p=>p.hp>0&&p.row===t.row&&p.column===t.column).reduce((n,p)=>n+g.props.plants[p.kind].SunCost,0);t.lit=cost>0;t.rate=Math.log(cost*native.tiles.taichitile.SunCostFactor+1);
   if(t.lit){t.left-=dt*t.rate;if(t.left<=0){t.deadAt=g.time;g.pickups.push({id:g.nextEntityId(),kind:'food',x:cellX(t.column),y:rowY(t.row)-45,age:0});g.beach.sounds.push('taichi/produceSounds');}}
  }
 }
 addTiles(cells:{row:number;column:number}[]){for(const c of cells)if(!this.tiles.some(t=>t.row===c.row&&t.column===c.column&&t.deadAt===null))this.tiles.push({...c,left:native.tiles.taichitile.LifeSpan,lit:false,rate:1,deadAt:null});}
 add(p:Plant){this.bamboo.add(p);if(p.kind==='firegourd'){this.gourds.set(p.id,{sleep:0,charge:0,distance:0,left:0,flame:false,food:false});p.animation='Idle1';}}
 fire(row:number,column:number){const p=this.g.plants.find(p=>p.kind==='firegourd'&&p.row===row&&p.column===column&&p.hp>0);if(!p||p.sheep!==undefined)return false;const s=this.gourds.get(p.id)!;if(s.sleep>0||p.action!=='idle')return false;this.start(p,false);return true;}
 start(p:Plant,food:boolean){const g=this.g,s=this.gourds.get(p.id)!,prop=g.props.plants.firegourd;
  s.distance=food?prop.PlantfoodDistance:prop.AttackDistanceMin+(prop.AttackDistanceMax-prop.AttackDistanceMin)*(1-Math.min(1,s.charge/prop.ChargingTime))+.2;
  s.sleep=0;s.left=food?prop.PlantfoodDuration:prop.AttackDuration;s.food=food;s.flame=false;p.action=food?'food':'shoot';p.animation=food||s.charge<=0?'Attack_Start1':'Attack_Start0';p.actionAt=g.time;p.eventIndex=0;s.charge=0;
 }
 plant(p:Plant,dt:number){const g=this.g,s=this.gourds.get(p.id)!,prop=g.props.plants.firegourd;
  if(p.animation==='Attack_Loop'){
   s.left-=dt;const start=cellX(p.column)+30,end=start+s.distance*BOARD.cellWidth;
   for(const z of g.zombies)if(z.hp>0&&g.inLane(z,p.row)&&z.x>=start-20&&z.x<=end){z.frozenUntil=0;z.chilledUntil=0;this.heat(z);if(z.kind==='lostcity_gargantuar')g.lostcity.torches.set(z.id,true);g.damage(z,(s.food?prop.PlantfoodDPS:prop.AttackDPS)*dt);}
   for(const t of g.graves)if(t.hp>0&&t.row===p.row&&cellX(t.column)>=start&&cellX(t.column)<=end)t.hp-=(s.food?prop.PlantfoodDPS:prop.AttackDPS)*dt*(isRack(t.kind)?prop.DamageScaleToRacks:1);
   if(s.left<=0){s.flame=false;s.food=false;s.sleep=prop.ReloadingTime;s.charge=prop.ChargingTime;p.action='idle';p.animation='Attack_End';p.actionAt=g.time;g.beach.sounds.push('firegourd/attackEnd');}return;
  }
  if(p.animation!.startsWith('Attack_Start')){
   const timeline=g.props.plantAnimations.firegourd[p.animation!],elapsed=g.time-p.actionAt;
   while(p.eventIndex!<timeline.events.length&&elapsed>=timeline.events[p.eventIndex!].at){const e=timeline.events[p.eventIndex!++].name;
    if(e==='attackSound'){s.flame=true;g.beach.sounds.push('firegourd/attackStart');}
    if(e==='breathe')g.beach.sounds.push('firegourd/breathe');
    if(e==='attackLoop'){p.animation='Attack_Loop';p.actionAt=g.time;return;}
   }return;
  }
  if(s.sleep>0){s.sleep-=dt;if(s.sleep<=0){p.animation='Wake';p.actionAt=g.time;g.beach.sounds.push('firegourd/wake');}else if(p.animation==='Attack_End'&&g.time-p.actionAt>=g.props.plantAnimations.firegourd.Attack_End.duration)p.animation='Rest';return;}
  if(s.charge>0){s.charge-=dt;if(p.animation==='Wake'&&g.time-p.actionAt>=g.props.plantAnimations.firegourd.Wake.duration)p.animation='Idle0';if(s.charge<=0)p.animation='Idle1';}
 }
}
