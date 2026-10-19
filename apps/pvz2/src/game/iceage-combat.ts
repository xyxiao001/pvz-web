import {BOARD,cellX,rowY} from './level';
import type {Game,Plant,Zombie} from './model';

export class IceageCombat {
  heat=new Map<number,number>();
  hunters=new Map<number,{at:number;next:number;left:number;event:number;throwing:boolean}>();
  snowballs:{id:number;row:number;x:number}[]=[];
  peppers:{id:number;row:number;fromX:number;fromY:number;x:number;y:number;toX:number;toY:number;at:number;food:boolean}[]=[];
  chilled=new Map<string,number>();
  constructor(private g:Game){}
  init(p:Plant){if(p.kind==='pepperpult'){this.heat.set(p.id,this.g.time+this.g.props.plants.pepperpult.WarmingRadius!.PulseInitialDelay);p.animation='Idle';}}
  spawn(z:Zombie){if(z.kind==='iceage_hunter'){const g=this.g,p=g.props.zombies.iceage_hunter;this.hunters.set(z.id,{at:0,next:g.time+p.TimeBeforeFirst+g.random()*p.TimeBeforeFirstAddtional,left:p.SnowballsPerBarrage,event:0,throwing:false});}}
  food(p:Plant){p.animation='Food';p.actionAt=this.g.time;p.eventIndex=0;}
  cold(row:number,column:number,amount:number){const g=this.g,plants=g.plants.filter(p=>p.hp>0&&p.row===row&&p.column===column);if(!plants.length||plants.some(p=>p.action==='food'||g.props.plants[p.kind].ImmuneToIceblock))return;const key=row+':'+column,ice=g.iceage.blocks.find(b=>b.hp>0&&b.row===row&&b.column===column);if(ice){ice.hp=Math.min(600,ice.hp+150*amount);return;}const level=(g.iceage.cold.get(key)??0)+amount;if(level>2){g.iceage.freeze(row,column);g.iceage.cold.delete(key);}else g.iceage.cold.set(key,level);}
  private lob(p:Plant,row:number,x:number,food:boolean){this.peppers.push({id:this.g.nextEntityId(),row,fromX:cellX(p.column),fromY:rowY(p.row)-80,x:cellX(p.column),y:rowY(p.row)-80,toX:x,toY:rowY(row)-25,at:this.g.time,food});}
  tickPlant(p:Plant){const g=this.g,prop=g.props.plants.pepperpult;
    if(p.action==='idle'&&g.time>=p.nextAction&&g.zombies.some(z=>z.hp>0&&z.row===p.row&&z.x>=cellX(p.column))){p.action='shoot';p.animation='Lob';p.actionAt=g.time;p.eventIndex=0;p.nextAction=g.time+prop.ThrowInterval+g.random()*prop.ThrowIntervalAdditional;}
    if(p.action==='idle')return;
    const timeline=g.props.plantAnimations.pepperpult[p.animation!];
    while(p.eventIndex!<timeline.events.length&&g.time-p.actionAt>=timeline.events[p.eventIndex!].at){const e=timeline.events[p.eventIndex!++].name;
      if(e==='Lob'){const target=g.zombies.filter(z=>z.hp>0&&z.row===p.row&&z.x>=cellX(p.column)).sort((a,b)=>a.x-b.x)[0];if(target)this.lob(p,target.row,target.x,false);}
      if(e.startsWith('foodLob')){const [lo,hi]=e==='foodLobL'?[-1,3]:e==='foodLobR'?[5,9]:[2,6],targets=g.zombies.filter(z=>z.hp>0&&z.x>=cellX(lo)&&z.x<=cellX(hi));for(let i=0;i<3;i++){const z=targets.splice(Math.floor(g.random()*targets.length),1)[0];this.lob(p,z?z.row:Math.floor(g.random()*5),z?z.x:cellX(Math.max(0,lo)+Math.floor(g.random()*(Math.min(8,hi)-Math.max(0,lo)+1))),true);}}
      if(['LobSound','reload','foodSound'].includes(e))g.beach.sounds.push('pepperpult/'+({LobSound:'lobSound',reload:'reload',foodSound:'foodSound'}[e]));
    }
    if(g.time-p.actionAt>=timeline.duration){p.action='idle';p.animation='Idle';}
  }
  hunter(z:Zombie,dt:number){const s=this.hunters.get(z.id);if(!s)return false;const g=this.g,prop=g.props.zombies.iceage_hunter;
    const target=()=>g.plants.some(p=>p.hp>0&&p.row===z.row&&!g.iceage.blocked(p)&&p.sheep===undefined&&!['potatomine','spikeweed','spikerock','puffshroom','iceburg','hotpotato'].includes(p.kind)&&z.x-cellX(p.column)>=prop.NearAttackRange*BOARD.cellWidth&&z.x-cellX(p.column)<=prop.FarAttackRange*BOARD.cellWidth);
    if(!s.throwing&&g.time>=s.next&&target()){if(!s.left)s.left=prop.SnowballsPerBarrage;s.throwing=true;s.at=g.time;s.event=0;}
    if(!s.throwing)return false;
    if(g.time<z.chilledUntil)s.at+=dt*.5;
    const timeline=g.props.plantAnimations.iceageHunter.Throw;
    while(s.event<timeline.events.length&&g.time-s.at>=timeline.events[s.event].at){const e=timeline.events[s.event++].name;
      if(e==='throw'){this.snowballs.push({id:g.nextEntityId(),row:z.row,x:z.x-25});s.left--;if(!s.left)s.next=g.time+prop.TimeBetweenBarrages+g.random()*prop.TimeBetweenBarragesAddtional;}
      if(e==='throwSound'){g.beach.sounds.push('iceageHunter/swingSounds','iceageHunter/cluckSounds');}
      if(e==='judgeSwitching'){if(s.left&&target()){s.at=g.time;s.event=0;}else s.throwing=false;break;}
    }
    return s.throwing;
  }
  tick(dt:number){const g=this.g;
    for(const p of g.plants){const warm=g.props.plants[p.kind].WarmingRadius;if(!warm||p.kind!=='pepperpult'||p.hp<=0)continue;if(g.time>=this.heat.get(p.id)!){let hit=false;for(const b of g.iceage.blocks)if(b.hp>0&&Math.abs(b.row-p.row)<=1&&Math.abs(b.column-p.column)<=1){b.hp-=warm.GridItemDamage;hit=true;}for(const [key,value] of g.iceage.cold){const [row,col]=key.split(':').map(Number);if(Math.abs(row-p.row)<=1&&Math.abs(col-p.column)<=1){if(value===1)g.iceage.cold.delete(key);else g.iceage.cold.set(key,value-1);hit=true;}}for(const z of g.zombies)if(z.kind==='iceage_armor3'&&z.armor>0&&Math.abs(z.row-p.row)<=1&&Math.abs(z.x-cellX(p.column))<=1.5*BOARD.cellWidth){z.armor=0;hit=true;}if(hit){this.heat.set(p.id,g.time+warm.PulseCooldown);g.iceage.effects.push({id:g.nextEntityId(),name:'plantHeat',animation:'Play',row:p.row,column:p.column,at:g.time});}}}
    for(const b of this.snowballs){const old=b.x;b.x-=8*BOARD.cellWidth*dt;const p=g.plants.filter(p=>p.hp>0&&p.row===b.row&&!['spikeweed','spikerock','potatomine','hotpotato'].includes(p.kind)&&cellX(p.column)>=b.x-25&&cellX(p.column)<=old+25).sort((a,b)=>b.column-a.column)[0];if(p){const prop=g.props.projectiles.hunter_snowball;this.cold(p.row,p.column,prop.IceBlockLevel);this.chilled.set(p.row+':'+p.column,g.time+prop.ChillDuration);b.x=-100;}}
    this.snowballs=this.snowballs.filter(b=>b.x>BOARD.left-50);
    for(const b of this.peppers){const t=Math.min(1,(g.time-b.at)/.8);b.x=b.fromX+(b.toX-b.fromX)*t;b.y=b.fromY+(b.toY-b.fromY)*t-150*4*t*(1-t);if(t===1){const prop=g.props.projectiles[b.food?'pepper_pf':'pepper'],direct=g.zombies.filter(z=>z.hp>0&&z.row===b.row&&Math.abs(z.x-b.toX)<45).sort((a,c)=>Math.abs(a.x-b.toX)-Math.abs(c.x-b.toX))[0];for(const z of g.zombies)if(z.hp>0&&Math.abs(z.row-b.row)<=1&&Math.abs(z.x-b.toX)<1.5*BOARD.cellWidth){g.damage(z,(z===direct?prop.Damage:0)+prop.SplashDamage[0].Damage!);z.frozenUntil=0;z.chilledUntil=0;}for(const ice of g.iceage.blocks)if(Math.abs(ice.row-b.row)<=1&&Math.abs(cellX(ice.column)-b.toX)<1.5*BOARD.cellWidth)ice.hp-=prop.SplashDamage[0].Damage!;}}
    this.peppers=this.peppers.filter(b=>g.time-b.at<.8);
    for(const p of g.plants)if((this.chilled.get(p.row+':'+p.column)??0)>g.time&&!g.iceage.blocked(p)&&!g.props.plants[p.kind].ImmuneToIceblock){p.actionAt+=dt*.5;p.nextAction+=dt*.5;p.nextBurst+=dt*.5;}
    for(const [id] of this.hunters)if(!g.zombies.some(z=>z.id===id))this.hunters.delete(id);
    for(const [id] of this.heat)if(!g.plants.some(p=>p.id===id))this.heat.delete(id);
  }
}
