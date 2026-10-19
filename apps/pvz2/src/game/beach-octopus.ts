import {cellX,rowY} from './level';
import type {Game,Plant,Grave,Zombie} from './model';
import properties from '../../public/assets/beach/octopus.json';
export interface OctopusState {animation:'Walk'|'Throw';at:number;elapsed:number;event:number;cooldown:number;target:number|null}
export class BeachOctopuses {
  shots:{id:number;fromX:number;fromY:number;row:number;column:number;at:number;duration:number}[]=[];
  released:{id:number;row:number;column:number;at:number}[]=[];
  constructor(private readonly g:Game){}
  spawn(z:Zombie){if(z.kind==='beach_octopus'){const p=this.g.props.zombies.beach_octopus;z.octopus={animation:'Walk',at:this.g.time,elapsed:0,event:0,cooldown:p.TimeBeforeFirst+this.g.random()*p.TimeBeforeFirstAdditional,target:null};}}
  private eligible(p:Plant){return p.hp>0&&p.sheep===undefined&&p.action!=='food'&&!p.hidden&&!p.leap&&(p.kind==='lilypad'||!this.g.props.plants[p.kind].CannotBeSheepenedByWizard);}
  private targets(z:Zombie){const g=this.g;return g.plants.filter(p=>this.eligible(p)&&cellX(p.column)<=z.x&&!g.plants.some(q=>q.hp>0&&q.row===p.row&&q.column===p.column&&!this.eligible(q))).sort((a,b)=>Math.abs(a.row-z.row)-Math.abs(b.row-z.row)||b.column-a.column);}
  tickZombie(z:Zombie,dt:number){
    const s=z.octopus;if(!s)return false;
    const g=this.g,prop=g.props.zombies.beach_octopus,step=dt*(g.time<z.chilledUntil?.5:1);
    if(s.animation==='Walk'){
      if(z.x>cellX(9))return false;
      s.cooldown-=step;const targets=this.targets(z),p=targets.find(p=>p.row===z.row&&z.x-cellX(p.column)<38)??(s.cooldown<=0?targets[0]:undefined);
      if(!p)return false;
      s.animation='Throw';s.at=g.time;s.elapsed=0;s.event=0;s.target=p.id;z.eating=false;
    }
    s.elapsed+=step;const timeline=g.props.plantAnimations.beachOctopus.Throw;
    while(s.event<timeline.events.length&&s.elapsed>=timeline.events[s.event].at){const event=timeline.events[s.event++].name;
      if(event==='throw'){
        const p=g.plants.find(p=>p.id===s.target&&this.eligible(p))??this.targets(z)[0];
        if(p)this.shots.push({id:g.nextEntityId(),fromX:z.x-20,fromY:rowY(z.row)-115,row:p.row,column:p.column,at:g.time,duration:.8});
        s.cooldown=prop.TimeBetween+g.random()*prop.TimeBetweenAdditional;
      }
      if(event==='switchingFalse'){s.animation='Walk';s.at=g.time;return true;}
    }
    return true;
  }
  release(grave:Grave){for(const p of this.g.plants)if(p.sheep===grave.id)delete p.sheep;this.released.push({id:grave.id,row:grave.row,column:grave.column,at:this.g.time});this.g.beach.sounds.push('octopus/explSounds','octopus/dropSounds');}
  tick(){
    const g=this.g;
    for(const shot of this.shots)if(g.time-shot.at>=shot.duration){
      const plants=g.plants.filter(p=>p.hp>0&&p.row===shot.row&&p.column===shot.column);
      if(plants.length&&plants.every(p=>this.eligible(p))){const id=g.nextEntityId();g.graves.push({id,kind:'octopus',row:shot.row,column:shot.column,hp:properties.Toughness,stage:0,spawnAt:g.time});for(const p of plants)p.sheep=id;g.beach.sounds.push('octopus/tieSounds');}
      g.beach.sounds.push('octopusShot/PopSound');
    }
    this.shots=this.shots.filter(s=>g.time-s.at<s.duration);
    for(const grave of g.graves)if(grave.kind==='octopus'&&!g.plants.some(p=>p.hp>0&&p.sheep===grave.id))grave.hp=0;
    // A tide, moving plant or another board obstacle can remove the covered cell.
    for(const p of g.plants)if(p.sheep!==undefined&&!g.dark.sheep.some(s=>s.plant===p)&&!g.graves.some(t=>t.kind==='octopus'&&t.id===p.sheep&&t.row===p.row&&t.column===p.column))delete p.sheep;
    this.released=this.released.filter(r=>g.time-r.at<g.props.plantAnimations.octopus.Die.duration);
  }
}
