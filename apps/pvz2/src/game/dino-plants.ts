import {BOARD,cellX,rowY} from './level';
import type {Game,Plant,Pea} from './model';

export class DinoPlants {
 blue=new Set<number>();
 private deaths:{row:number;column:number;at:number;fired:boolean}[]=[];
 fires:{id:number;row:number;column:number;until:number;hit:Set<number>}[]=[];
 constructor(private g:Game){}
 food(p:Plant){this.blue.add(p.id);p.animation='Food';this.g.beach.sounds.push('torchwood/foodSounds');}
 plant(p:Plant){
  const g=this.g,prop=g.props.plants[p.kind];
  if(p.kind==='goldbloom'){
   const age=g.time-p.actionAt,timeline=g.props.plantAnimations.goldbloom.Attack;
   while(p.eventIndex!<timeline.events.length&&age>=timeline.events[p.eventIndex!].at){const name=timeline.events[p.eventIndex!++].name;if(name.startsWith('produce')){g.dropSun(cellX(p.column),rowY(p.row)-70,[prop.ProduceValue0,prop.ProduceValue1,prop.ProduceValue2][Number(name.at(-1))],'plant');g.beach.sounds.push('goldbloom/produce');}if(name==='jump')g.beach.sounds.push('goldbloom/jump');if(name==='die'){p.transformed=true;p.hp=0;}}
   return;
  }
  if(p.action==='food'){if(g.time-p.actionAt>=g.props.plantAnimations.torchwood.Food.duration)p.animation='Idle_Blue';if(g.time-p.actionAt>=prop.PlantfoodDuration)p.action='idle';}
  if(g.time>=p.nextAction){const targets=g.zombies.filter(z=>z.hp>0&&g.inLane(z,p.row)&&Math.abs(z.x-cellX(p.column))<BOARD.cellWidth/2+20);if(targets.length){for(const z of targets){g.damage(z,prop.Damage*(this.blue.has(p.id)?prop.DamageScalePlantfooded:prop.DamageScale));g.future.visual(this.blue.has(p.id)?'torchBlue':'torchYellow','Play',z.x,rowY(z.row)-45);}p.nextAction=g.time+prop.DamageInterval;g.beach.sounds.push('torchwood/attackSounds');}}
 }
 ignite(pea:{row:number;x:number;y:number;fire?:Pea['fire'];damage?:number;snow?:boolean},oldX:number){
  const g=this.g;
  for(const p of g.plants)if(p.hp>0&&p.kind==='torchwood'&&p.sheep===undefined&&p.row===pea.row&&Math.abs(pea.y-(rowY(p.row)-48))<52&&Math.min(oldX,pea.x)<=cellX(p.column)&&Math.max(oldX,pea.x)>=cellX(p.column)){
   const next=this.blue.has(p.id)?'bluePea':'firePea';if(pea.fire==='bluePea'||pea.fire===next)continue;
   if(pea.damage!==undefined)pea.damage=pea.damage/(pea.fire==='firePea'?2:1)*(next==='bluePea'?3:2);
   pea.fire=next;pea.snow=false;g.beach.sounds.push('torchwood/igniteSounds');
  }
 }
 removed(p:Plant){this.deaths.push({row:p.row,column:p.column,at:this.g.time,fired:false});this.blue.delete(p.id);this.g.beach.sounds.push('torchwood/deadSound');}
 tick(){
  const g=this.g,prop=g.props.plants.torchwood;
  for(const d of this.deaths)if(!d.fired&&g.time-d.at>=g.props.plantAnimations.torchwood.Death.events.find(e=>e.name==='explode')!.at){d.fired=true;const hit=new Set<number>();for(let row=0;row<5;row++)for(let column=0;column<9;column++)if(row===d.row||column===d.column)this.fires.push({id:g.nextEntityId(),row,column,until:g.time+prop.DeathFireDuration,hit});}
  this.deaths=this.deaths.filter(d=>!d.fired);this.fires=this.fires.filter(f=>g.time<f.until);
  for(const f of this.fires){for(const z of g.zombies)if(z.hp>0&&g.inLane(z,f.row)&&Math.abs(z.x-cellX(f.column))<41&&!f.hit.has(z.id)){g.damage(z,prop.DeathDamage,'potato');f.hit.add(z.id);}for(const t of g.graves)if(t.hp>0&&t.row===f.row&&t.column===f.column&&!f.hit.has(-t.id)){t.hp-=prop.DeathDamage;f.hit.add(-t.id);}}
 }
}
