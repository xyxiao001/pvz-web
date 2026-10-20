import {BOARD,cellX,rowY} from './level';
import type {Game,Plant,Zombie} from './model';
import native from '../../public/assets/kongfu/properties.json';
export class KongfuTurnip {
 states=new Map<number,{stage:number;hp:number;blocked:number;round:number}>();
 constructor(private g:Game){}
 add(p:Plant){if(p.kind==='turnip'){this.states.set(p.id,{stage:0,hp:p.hp,blocked:0,round:0});p.animation='Idle0';}}
 food(p:Plant){const s=this.states.get(p.id)!;s.stage=0;s.blocked=0;s.round=0;p.animation='Food';p.eventIndex=0;}
 tick(p:Plant,dt:number){const g=this.g,s=this.states.get(p.id)!,animations=native.plantAnimations.turnip;
  if(p.leap){if(g.time-p.leap.at<.8)return;delete p.leap;p.animation='LeapEnd';p.actionAt=g.time;g.beach.sounds.push('turnip/landSound');}
  if(p.hp!==s.hp){s.stage=p.hp<=native.plants.turnip.Toughness/3?2:p.hp<=native.plants.turnip.Toughness*2/3?1:0;s.hp=p.hp;}
  s.blocked=Math.max(0,s.blocked-dt);
  if(p.action==='food'){
   const elapsed=g.time-p.actionAt,timeline=animations.Food;
   while(p.eventIndex!<timeline.events.length&&elapsed>=timeline.events[p.eventIndex!].at){const e=timeline.events[p.eventIndex!++].name;
    if(e==='foodSound')g.beach.sounds.push('turnip/foodSound');
    if(e==='throw'){
     const cells=Array.from({length:45},(_,i)=>({row:i%5,column:Math.floor(i/5)})).filter(c=>c.column<9-(g.level.boss?.reserved??0)&&!g.plants.some(q=>q.hp>0&&q.row===c.row&&q.column===c.column)&&!g.graves.some(t=>t.hp>0&&t.row===c.row&&t.column===c.column)&&!g.level.mold.some(t=>t.row===c.row&&t.column===c.column));
     // Turnip.ts: two children per throw, two Food animation loops.
     for(let i=0;i<2&&cells.length;i++){const c=cells.splice(Math.floor(g.random()*cells.length),1)[0];g.addPlant('turnip',c.row,c.column);const child=g.plants.at(-1)!;child.leap={x:cellX(p.column),y:rowY(p.row),at:g.time};child.animation='Flying';}
    }
   }
   if(elapsed>=timeline.duration){if(++s.round<2){p.actionAt=g.time;p.eventIndex=0;}else {p.action='idle';p.animation='Idle'+s.stage;}}return;
  }
  if(p.animation==='LeapEnd'&&g.time-p.actionAt<animations.LeapEnd.duration)return;
  if(p.animation!.startsWith('BlockStart')&&g.time-p.actionAt<animations[p.animation as 'BlockStart0'].duration)return;
  p.animation=(s.blocked>0?'BlockLoop':'Idle')+s.stage;
 }
 chi(z:Zombie){const g=this.g;
  for(let column=Math.min(8,Math.floor((z.x-BOARD.left)/BOARD.cellWidth));column>=0;column--){
   const plants=g.plants.filter(p=>p.hp>0&&p.row===z.row&&p.column===column),turnip=plants.find(p=>p.kind==='turnip');
   if(turnip){const s=this.states.get(turnip.id)!;if(s.blocked<=0&&turnip.action!=='food'){turnip.animation='BlockStart'+s.stage;turnip.actionAt=g.time;}s.blocked=3;break;}
   if(plants.length)this.push(plants[0]);
  }
 }
 private push(p:Plant):boolean {const g=this.g,plants=g.plants.filter(q=>q.hp>0&&q.row===p.row&&q.column===p.column&&!['powerplant','powerplant_alpha','powerplant_beta'].includes(q.kind));
  if(plants.some(q=>q.action==='food'||q.leap||g.props.plants[q.kind].CannotBePushedByFootballMech))return false;
  let column=p.column+1;while(column<9&&(g.level.mold.some(c=>c.row===p.row&&c.column===column)||g.graves.some(t=>t.hp>0&&t.row===p.row&&t.column===column)||g.level.boss&&column>=9-g.level.boss.reserved))column++;
  const ahead=g.plants.find(q=>q.hp>0&&q.row===p.row&&q.column===column);
  if(column>=9||ahead&&!this.push(ahead)){for(const q of plants)q.hp=0;return true;}
  for(const q of plants){q.leap={x:cellX(q.column),y:rowY(q.row),at:g.time,pushed:true};q.column=column;}return true;
 }
}
