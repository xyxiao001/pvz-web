import {BOARD,cellX,rowY} from './level';
import type {Game,Plant,Zombie} from './model';
export interface FisherState {animation:string;at:number;elapsed:number;event:number;cooldown:number;hook?:{x:number;target:number|null;arrive:number;phase:'out'|'reel'|'back'};deathAnimation?:string}
export class BeachFishers {
  constructor(private readonly g:Game){}
  spawn(z:Zombie){if(z.kind!=='beach_fisherman')return;z.x=cellX(8);z.entry='walk';z.fisher={animation:this.g.beach.inWater(z)?'Spawn':'Idle',at:this.g.time,elapsed:0,event:0,cooldown:0};}
  private play(z:Zombie,animation:string){const s=z.fisher!;s.animation=animation;s.at=this.g.time;s.elapsed=0;s.event=0;}
  private candidates(z:Zombie){return this.g.plants.filter(p=>p.hp>0&&p.row===z.row&&cellX(p.column)<=z.x&&!p.hidden&&!p.leap&&p.sheep===undefined&&p.action!=='food'&&!['lilypad','potatomine','spikeweed','spikerock','iceweed','tanglekelp'].includes(p.kind)).sort((a,b)=>b.column-a.column);}
  private pull(p:Plant):boolean{
    const g=this.g,plants=g.plants.filter(q=>q.hp>0&&q.row===p.row&&q.column===p.column&&!q.kind.startsWith('powerplant'));
    if(plants.some(q=>q.action==='food'||q.leap||g.props.plants[q.kind].CannotBePushedByFootballMech))return false;
    let column=p.column+1;while(column<BOARD.columns&&(g.level.mold.some(t=>t.row===p.row&&t.column===column)||g.graves.some(t=>t.hp>0&&t.row===p.row&&t.column===column)))column++;
    const ahead=g.plants.find(q=>q.hp>0&&q.row===p.row&&q.column===column);
    if(column>=BOARD.columns||ahead&&!this.pull(ahead)){for(const q of plants)q.hp=0;return true;}
    for(const q of plants){q.leap={x:cellX(q.column),y:rowY(q.row),at:g.time,pushed:true};q.column=column;}return true;
  }
  tickZombie(z:Zombie,dt:number){
    const s=z.fisher;if(!s)return false;
    const g=this.g,prop=g.props.zombies.beach_fisherman,step=dt*(g.time<z.chilledUntil?.5:1);z.eating=false;
    if(s.hook){const h=s.hook;
      if(h.phase==='out'){
        h.x-=8*BOARD.cellWidth*dt;const plant=this.candidates(z).find(p=>cellX(p.column)>=h.x),grave=g.graves.filter(t=>t.hp>0&&t.row===z.row&&cellX(t.column)>=h.x&&cellX(t.column)<z.x).sort((a,b)=>b.column-a.column)[0];
        if(grave&&(!plant||grave.column>plant.column)){grave.hp-=40;h.phase='back';this.play(z,'AttackEnd');}
        else if(plant){h.x=cellX(plant.column);h.target=plant.id;h.phase='reel';h.arrive=g.time+prop.DelayBeforeReeling;}
        else if(h.x<BOARD.left){h.phase='back';this.play(z,'AttackEnd');}
      }else if(h.phase==='reel'&&g.time>=h.arrive){const p=g.plants.find(p=>p.id===h.target&&p.hp>0);if(p)this.pull(p);h.phase='back';this.play(z,'AttackEnd');}
      else if(h.phase==='back'){h.x+=600*dt;if(h.x>=z.x)delete s.hook;}
    }
    if(s.animation==='Idle'){
      s.cooldown-=step;const p=this.candidates(z)[0];
      if(s.cooldown<=0&&p){this.play(z,p.column>=7?'Attack':'AttackStart');s.cooldown=prop.DelayBetweenCasting;}
      return true;
    }
    s.elapsed+=step;const timeline=g.props.plantAnimations.beachFisher[s.animation];
    while(s.event<timeline.events.length&&s.elapsed>=timeline.events[s.event].at){const event=timeline.events[s.event++].name;
      if(event==='Shoot')s.hook={x:z.x-20,target:null,arrive:0,phase:'out'};
      if(event==='hit'){for(const p of this.candidates(z).filter(p=>p.column>=7)){if(g.props.plants[p.kind].CannotBePushedByFootballMech)p.hp-=40;else p.hp=0;}}
      if(event==='splash'){for(const p of g.plants)if(p.hp>0&&p.row===z.row&&p.column===8&&!prop.PlantablePlants.includes(p.kind)&&p.action!=='food')p.hp=0;}
      if(event==='attackLP'){this.play(z,'AttackLoop');return true;}
      if(event==='switchingFalse'){this.play(z,'Idle');return true;}
    }
    return true;
  }
  die(z:Zombie){if(z.fisher){delete z.fisher.hook;z.fisher.deathAnimation=this.g.beach.inWater(z)?'Death_Water':'Death';}}
}
