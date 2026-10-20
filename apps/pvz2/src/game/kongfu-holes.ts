import {cellX,rowY,type ChiHoleProps} from './level';
import type {Game} from './model';
import native from '../../public/assets/kongfu/properties.json';
export class KongfuHoles {
 holes:{id:number;props:ChiHoleProps;at:number;animation:'Spawn'|'Idle'|'Die';closeAt:number;loopAt:number;warned:boolean}[]=[];
 constructor(private g:Game){}
 spawn(props:ChiHoleProps){this.holes.push({id:this.g.nextEntityId(),props,at:this.g.time,animation:'Spawn',closeAt:Infinity,loopAt:0,warned:false});this.g.beach.sounds.push('chiHole/OpenSounds');}
 get suppressesWave(){return this.holes.some(h=>h.props.SuppressesNextWave&&h.animation!=='Die');}
 tick(){const g=this.g;
  for(const h of this.holes){
   if(h.animation==='Die')continue;
   const age=g.time-h.at,start=native.plantAnimations.chiHole.Spawn.events[0].at;
   if(age>=start&&!h.warned){h.warned=true;g.beach.sounds.push('chiHole/WarnSounds');}
   if(age>=native.plantAnimations.chiHole.Spawn.duration)h.animation='Idle';
   if(h.warned&&g.time>=h.loopAt){h.loopAt=g.time+2/3;g.beach.sounds.push('chiHole/LoopSounds');}
   if(age<start+h.props.TimeBeforeAbsorbing)continue;
   if(age>=start+h.props.TimeBeforeAbsorbing+h.props.LifeSpan){h.animation='Die';h.closeAt=g.time;g.beach.sounds.push('chiHole/CloseSounds');continue;}
   for(const row of h.props.LanesToAffect){
    // This batch's holes pull right from column 8. Turnips stop the pull.
    for(const p of g.plants)if(p.hp>0&&p.row===row&&p.column===h.props.Column&&p.kind!=='turnip'&&p.action!=='food'&&p.action!=='explode'&&!p.leap&&!g.props.plants[p.kind].CannotBePushedByFootballMech){
     p.hp=0;g.effects.push({id:g.nextEntityId(),kind:'plant',x:cellX(p.column),y:rowY(p.row),age:0});
    }
    g.kongfu.turnip.chiLine(row,h.props.Column,h.props.PlantMovingTimeBetweenSquares);
   }
  }
  this.holes=this.holes.filter(h=>g.time-h.closeAt<native.plantAnimations.chiHole.Die.events[0].at);
 }
}
