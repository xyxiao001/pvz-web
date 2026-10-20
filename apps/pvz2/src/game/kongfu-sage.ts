import {BOARD,cellX,rowY} from './level';
import type {Game,Plant,Zombie} from './model';
import native from '../../public/assets/kongfu/properties.json';
const prop=native.plants.solarsage;
export class KongfuSage {
 spirits:{id:number;x:number;row:number;animation:string;at:number;event:number;left:number}[]=[];
 private spent=new Set<number>();
 constructor(private g:Game){}
 add(p:Plant){if(p.kind==='solarsage')p.animation='Idle';}
 private eligible(z:Zombie){return z.hp>0&&!z.reversed&&z!==this.g.boss?.zombie&&!this.g.props.zombies[z.kind].CannotBeEnlightenedBySolarSage;}
 private convert(z:Zombie){const g=this.g;z.hp=0;z.armor=0;z.deathCause='swallow';this.spirits.push({id:g.nextEntityId(),x:z.x,row:z.row,animation:'Spawn',at:g.time,event:0,left:6});g.beach.sounds.push('sageSpirit/spawnSounds');}
 food(p:Plant){this.start(p,true);}
 private start(p:Plant,food:boolean){p.action=food?'food':'shoot';p.animation='Attack';p.actionAt=this.g.time;p.eventIndex=0;}
 plant(p:Plant){const g=this.g;
  if(p.action==='idle'){if(g.zombies.some(z=>this.eligible(z)&&z.row===p.row&&Math.abs(z.x-cellX(p.column))<BOARD.cellWidth/2))this.start(p,false);return;}
  const a=native.plantAnimations.solarsage.Attack,elapsed=g.time-p.actionAt;
  while(p.eventIndex!<a.events.length&&elapsed>=a.events[p.eventIndex!].at){const name=a.events[p.eventIndex!++].name;
   if(name==='charge')g.beach.sounds.push('solarsage/'+(p.action==='food'?'chargePF':'charge'));
   if(name==='shrink')g.beach.sounds.push('solarsage/death');
   if(name==='attack'){
    const targets=g.zombies.filter(z=>this.eligible(z)&&(p.action==='food'||z.row===p.row&&Math.abs(z.x-cellX(p.column))<BOARD.cellWidth/2));
    if(p.action==='food'){for(let n=0;n<prop.PlantfoodEnlightenCount&&targets.length;n++)this.convert(targets.splice(Math.floor(g.random()*targets.length),1)[0]);}
    else if(targets.length){for(const z of targets)this.convert(z);this.spent.add(p.id);}
   }
  }
  if(elapsed>=a.duration){p.action='idle';p.animation='Idle';if(this.spent.has(p.id))p.hp=0;}
 }
 tick(dt:number){const g=this.g;
  for(const s of [...this.spirits]){
   if(s.animation==='Idle'){s.x+=prop.EnlightenWalkSPS*BOARD.cellWidth*dt;s.left-=dt;if(s.left<=0){s.animation='Produce';s.at=g.time;s.event=0;s.left=prop.EnlightenProduceInterval.Min+g.random()*(prop.EnlightenProduceInterval.Max-prop.EnlightenProduceInterval.Min);g.beach.sounds.push('sageSpirit/chargeSounds');}}
   else {const a=g.props.plantAnimations.sageSpirit[s.animation],elapsed=g.time-s.at;
    while(s.event<a.events.length&&elapsed>=a.events[s.event].at){if(a.events[s.event++].name==='produce'){g.dropSun(s.x,rowY(s.row)-45,prop.EnlightenSunValue,'plant');g.beach.sounds.push('sageSpirit/produceSounds');for(const z of g.zombies)if(this.eligible(z)&&z.row===s.row&&Math.abs(z.x-s.x)<BOARD.cellWidth/4&&g.random()<prop.EnlightenChanceToInfect)this.convert(z);}}
    if(elapsed>=a.duration){s.animation='Idle';s.at=g.time;}
   }
  }this.spirits=this.spirits.filter(s=>s.x<cellX(10));
 }
}
