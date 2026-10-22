import {BOARD,cellX,rowY,type ZombieKind} from './level';
import type {Game,Grave,Plant,Zombie} from './model';
import native from '../../public/assets/eighties/properties.json';

/** The native cabinet is a pushable tomb, with a music-gated summon clock. */
export class EightiesArcade {
 cabinets=new Map<number,{left:number;empUntil:number;move?:{from:number;to:number;at:number}}>();
 pushes=new Map<number,{at:number;elapsed:number;event:number}>();
 constructor(private g:Game){}
 spawn(z:Zombie){
  if(z.kind!=='eighties_arcade')return;
  const g=this.g,column=Math.floor((z.x-BOARD.left)/BOARD.cellWidth),previous=g.graves.find(t=>t.hp>0&&t.row===z.row&&t.column===column);
  let t=previous;
  if(!t){t={id:g.nextEntityId(),kind:'eightiesarcadecabinet',row:z.row,column,hp:native.tombs.eightiesarcadecabinet.Toughness,stage:0,spawnAt:g.time};g.graves.push(t);this.cabinets.set(t.id,{left:1+2*g.random(),empUntil:0});}
  z.x=cellX(t.column)+2*BOARD.cellWidth;z.entryX=z.x;
 }
 private canPush(t:Grave,direction:number):boolean{
  const g=this.g,state=this.cabinets.get(t.id)!,to=t.column+direction;
  if(state.move||to<0||direction>0&&to>=9)return false;
  const other=g.graves.find(o=>o!==t&&o.hp>0&&o.row===t.row&&o.column===to);
  if(other)return other.kind===t.kind&&this.canPush(other,direction);
  return !g.plants.some(p=>p.hp>0&&p.row===t.row&&p.column===to&&(p.action==='food'||g.kongfu.peach.protected(p)));
 }
 private target(z:Zombie){return this.g.graves.find(t=>t.hp>0&&t.kind==='eightiesarcadecabinet'&&t.row===z.row&&(z.x-cellX(t.column))*(z.reversed?-1:1)>=0&&(z.x-cellX(t.column))*(z.reversed?-1:1)<BOARD.cellWidth*1.5&&this.canPush(t,z.reversed?1:-1));}
 private push(t:Grave,direction:number){
  const g=this.g,to=t.column+direction,other=g.graves.find(o=>o!==t&&o.hp>0&&o.row===t.row&&o.column===to);
  if(other)this.push(other,direction);
  for(const p of g.plants)if(p.hp>0&&p.row===t.row&&p.column===to){p.hp=0;p.armor=0;}
  this.cabinets.get(t.id)!.move={from:t.column,to,at:g.time};
 }
 zombie(z:Zombie,dt:number){
  if(z.kind!=='eighties_arcade')return false;
  const g=this.g;
  if(!this.pushes.has(z.id)&&this.target(z)){this.pushes.set(z.id,{at:g.time,elapsed:0,event:0});z.eating=false;}
  const state=this.pushes.get(z.id);if(!state)return false;
  state.elapsed+=dt*(g.time<z.chilledUntil?.5:1);
  const timeline=g.props.plantAnimations.eightiesArcade.Push;
  while(state.event<timeline.events.length&&state.elapsed>=timeline.events[state.event].at){
   const name=timeline.events[state.event++].name;
   if(name==='pushSound')g.beach.sounds.push('eightiesArcade/pushSaySounds');
   if(name==='push'){const t=this.target(z);if(t){this.push(t,z.reversed?1:-1);g.beach.sounds.push('eightiesArcade/pushSounds','eightiesArcade/pushChargeSounds');}}
   if(name==='switchingFalse'){this.pushes.delete(z.id);break;}
  }
  return true;
 }
 emp(p:Plant,duration:number){for(const t of this.g.graves)if(t.kind==='eightiesarcadecabinet'){
  const dx=Math.abs(t.column-p.column),dy=Math.abs(t.row-p.row);
  if(dy<=1&&dx<=2.5||dy<=2&&dx<=1.5)this.cabinets.get(t.id)!.empUntil=this.g.time+duration;
 }}
 damage(t:Grave){
  const g=this.g,stage=5-Math.floor(Math.max(0,t.hp)/native.tombs.eightiesarcadecabinet.Toughness*5);
  if(t.hp<=0||stage!==t.stage&&stage>1){g.future.visual('arcadeBreak','Play'+(t.hp<=0?5:stage-1),cellX(t.column),rowY(t.row));g.beach.sounds.push('arcadeCabinet/'+(t.hp<=0?'destructSounds':'breakSounds'));}
  t.stage=stage;if(t.hp<=0)this.cabinets.delete(t.id);
 }
 tick(dt:number){
  const g=this.g,prop=native.tombs.eightiesarcadecabinet;
  for(const t of g.graves)if(t.kind==='eightiesarcadecabinet'&&t.hp>0){
   const s=this.cabinets.get(t.id)!;
   if(s.move){const age=Math.min(1,(g.time-s.move.at)/.5);t.column=s.move.from+(s.move.to-s.move.from)*(1-(1-age)**2);if(age===1){t.column=s.move.to;delete s.move;}}
   if(g.preparing||g.eighties.jam!==prop.JamStyle||g.time<s.empUntil||t.column<0||t.column>=9)continue;
   s.left-=dt;
   if(s.left<=0){
    s.left=prop.SummonInterval.Min+g.random()*(prop.SummonInterval.Max-prop.SummonInterval.Min);
    let weight=g.random()*prop.SummonnedZombies.reduce((sum,z)=>sum+z.Weight,0);
    const kind=prop.SummonnedZombies.find(z=>(weight-=z.Weight)<0)!.Type as ZombieKind,z=g.spawnZombie(kind,t.row,cellX(Math.floor(t.column))-.2*BOARD.cellWidth);
    z.tentSpawnAt=g.time;z.landUntil=g.time+.5;g.beach.sounds.push('arcadeCabinet/spawnSounds');
   }
  }
  for(const id of this.pushes.keys())if(!g.zombies.some(z=>z.id===id&&z.hp>0))this.pushes.delete(id);
 }
 finish(){this.g.graves=this.g.graves.filter(t=>t.kind!=='eightiesarcadecabinet');this.cabinets.clear();}
}
