import {BOARD,cellX,rowY,type PlantProperties} from './level';
import type {Game,Plant,Zombie} from './model';
type Range={Min:number;Max:number};
type Props=Omit<PlantProperties,'AttackCooldownStart'|'AttackCooldownBetween'>&{AttackCooldownStart:Range;AttackCooldownBetween:Range};
/** Original recharge stages, weighted target categories and five plant-food flicks. */
export class EightiesCaulipower {
 shots:{id:number;x:number;y:number;angle:number;target:Zombie}[]=[];
 private states=new Map<number,{rest:number;detect:number;flicks:number}>();
 constructor(private g:Game){}
 private get props(){return this.g.props.plants.caulipower as unknown as Props;}
 private range(r:Range){return r.Min+(r.Max-r.Min)*this.g.random();}
 private play(p:Plant,animation:string,action:Plant['action']='idle'){p.animation=animation;p.action=action;p.actionAt=this.g.time;p.eventIndex=0;}
 add(p:Plant){const rest=this.range(this.props.AttackCooldownStart);this.states.set(p.id,{rest,detect:0,flicks:0});p.nextAction=this.g.time+rest;this.play(p,'Idle0');}
 food(p:Plant){this.states.get(p.id)!.flicks=this.props.PlantfoodFlickCount;p.nextAction=this.g.time;this.play(p,'FoodStart','food');this.g.beach.sounds.push('caulipower/foodStart');}
 private eligible(z:Zombie){const g=this.g,sort=g.props.zombies[z.kind].ZombieSort;return z.hp>0&&z!==g.boss?.zombie&&z.x>=BOARD.left&&z.x<cellX(9)&&!g.iceage.blocks.some(b=>b.zombie===z)&&!g.dark.invisible(z)&&!g.props.zombies[z.kind].CannotBeHypnotizedByProjectiles&&(!sort||['Normal','Gargantuar','Other'].includes(sort));}
 target(){
  const g=this.g,p=this.props,targets=g.zombies.filter(z=>this.eligible(z)).sort((a,b)=>a.x-b.x);
  // ZombieProps uses Other when no ZombieSort is authored.
  const groups=[{sort:'Normal',weight:p.WeightTargetNormalZombie},{sort:'Gargantuar',weight:p.WeightTargetGargantuarZombie},{sort:'Other',weight:p.WeightTargetOtherZombie}].map(group=>({...group,target:targets.find(z=>(g.props.zombies[z.kind].ZombieSort||'Other')===group.sort)})).filter(group=>group.target);
  let choice=g.random()*groups.reduce((sum,group)=>sum+group.weight,0);
  for(const group of groups){choice-=group.weight;if(choice<=0)return group.target;}
 }
 plant(p:Plant){
  const g=this.g,s=this.states.get(p.id)!;
  if(p.action==='idle'){
   const stage=Math.max(0,Math.min(3,3-Math.ceil((p.nextAction-g.time)/s.rest*3))),animation='Idle'+stage;
   if(p.animation!==animation)this.play(p,animation);
   if(g.time<p.nextAction||g.time<s.detect)return;
   if(!g.zombies.some(z=>this.eligible(z))){s.detect=g.time+this.range(this.props.DetectInterval);return;}
   s.rest=this.range(this.props.AttackCooldownBetween);this.play(p,'Attack','shoot');g.beach.sounds.push('caulipower/attack');
  }
  const timeline=g.props.plantAnimations.caulipower[p.animation!],elapsed=g.time-p.actionAt;
  while(p.eventIndex!<timeline.events.length&&elapsed>=timeline.events[p.eventIndex!].at){
   const event=timeline.events[p.eventIndex!++].name;
   if(event==='attack'){const target=this.target();if(target)this.shots.push({id:g.nextEntityId(),x:cellX(p.column),y:rowY(p.row)-90,angle:0,target});else s.rest*=5/8;}
   if(event==='flick'){
    g.beach.sounds.push('caulipower/flick');const z=this.target();
    if(z){if(g.props.zombies[z.kind].CannotBeFlickedByPowerToss)z.leap={fromX:z.x,fromY:rowY(z.row),toX:z.x+this.props.PlantfoodFlickDistance*BOARD.cellWidth,toRow:z.row,at:g.time,duration:1};else {z.hp=0;z.deathCause='toss';}}
   }
   if(event==='judgeFoodEnd'){
    if(--s.flicks>0)this.play(p,'FoodLoop'+Math.floor(g.random()*2),'food');
    else {p.nextAction=g.time;this.play(p,'Idle3');g.beach.sounds.push('caulipower/foodEnd');}return;
   }
  }
  if(elapsed>=timeline.duration){if(p.animation==='FoodStart')this.play(p,'FoodLoop'+Math.floor(g.random()*2),'food');else {p.nextAction=g.time+s.rest;this.play(p,'Idle0');}}
 }
 tick(dt:number){
  const g=this.g;
  this.shots=this.shots.filter(s=>{
   if(!g.zombies.includes(s.target)||!this.eligible(s.target)){const target=this.target();if(!target)return false;s.target=target;}
   const z=s.target,dx=z.x-s.x,dy=rowY(z.row)-50-s.y,distance=Math.hypot(dx,dy),step=8*BOARD.cellWidth*dt;s.angle=Math.atan2(dy,dx);
   if(distance>step+20){s.x+=dx/distance*step;s.y+=dy/distance*step;return true;}
   g.kills++;if(z.food){g.pickups.push({id:-100000-z.id,kind:'food',x:z.x,y:rowY(z.row)-45,age:0});z.food=false;}
   z.reversed=true;z.eating=false;g.westFinale.adopt(z);return false;
  });
  for(const id of this.states.keys())if(!g.plants.some(p=>p.id===id))this.states.delete(id);
 }
}
