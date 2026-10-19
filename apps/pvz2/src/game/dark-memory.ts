import {cellX} from './level';
import type {Game} from './model';

/** Dark 29's authored grave patterns, reveal window and limited gravebuster cards. */
export class DarkMemory {
  complete=false;
  markers:{id:number;row:number;column:number}[]=[];
  private began=-Infinity;
  private revealed=false;
  private delivered=false;
  private attacked=false;
  private cleared=false;
  constructor(private g:Game){}
  tick(){
    const g=this.g,c=g.level.memory;if(!c||this.complete)return;
    if(g.wave===0){if(g.time<1)return;this.begin();}
    const age=g.time-this.began,round=c.rounds[g.wave-1];
    if(!this.revealed&&age>=c.showAt){this.revealed=true;this.markers=g.graves.filter(t=>t.kind==='gravestone_spawn').map(t=>({id:t.id,row:t.row,column:t.column}));}
    if(!this.delivered&&age>=c.hideAt){this.delivered=true;this.markers=[];for(let i=0;i<round.count;i++)g.conveyor.push({id:g.nextEntityId(),kind:'gravebuster',lane:i,position:0});}
    if(!this.attacked&&age>=c.attackAt){this.attacked=true;for(const t of g.graves.filter(t=>t.hp>0&&t.kind==='gravestone_spawn')){const z=g.spawnZombie('dark_imp',t.row,cellX(t.column),'ground');z.hp=c.enemyHP;z.armor=g.props.armors.dark_armor3.Toughness;z.knighted=true;z.memoryRunner=true;}}
    if(!this.cleared&&age>=c.clearAt){this.cleared=true;for(const t of g.graves)t.hp=0;}
    if(this.cleared&&age>=c.clearAt+4&&!g.zombies.length){if(g.wave===c.rounds.length)this.complete=true;else this.begin();}
  }
  private begin(){
    const g=this.g,round=g.level.memory!.rounds[g.wave];
    const cells=round.positions.map(p=>({...p}));
    for(let i=cells.length-1;i>0;i--){const j=Math.floor(g.random()*(i+1));[cells[i],cells[j]]=[cells[j],cells[i]];}
    g.graves=cells.map((p,i)=>({...p,id:g.nextEntityId(),hp:g.props.grave.Toughness,stage:0,kind:i<round.count?'gravestone_spawn':'gravestone_dark'}));
    g.conveyor=[];g.wave++;g.events.push({type:'wave'});this.began=g.time;
    this.revealed=this.delivered=this.attacked=this.cleared=false;
  }
}
