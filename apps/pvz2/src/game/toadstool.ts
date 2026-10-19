import type {Game,Plant} from './model';
import {BOARD,cellX,rowY} from './level';
interface State {chews:number[];produce:number;food:boolean;wait:number;event:number;elapsed:number;catchAt:number;target:number|null;targetTomb:boolean;tongue?:{x:number;y:number;at:number}}
export class ToadstoolBattle {
 states=new Map<number,State>();
 constructor(private g:Game){}
 init(p:Plant){this.states.set(p.id,{chews:[],produce:0,food:false,wait:0,event:0,elapsed:0,catchAt:Infinity,target:null,targetTomb:false});p.animation='Idle';}
 private play(p:Plant,animation:string){const s=this.states.get(p.id)!;p.animation=animation;p.action=s.food?'food':['Idle','Chew'].includes(animation)?'idle':'grow';p.actionAt=this.g.time;s.event=0;s.elapsed=0;}
 food(p:Plant){const s=this.states.get(p.id)!;s.chews=[];s.food=true;s.wait=this.g.props.plants.toadstool.WaitTimePF;s.catchAt=Infinity;s.target=null;delete s.tongue;this.play(p,'Idle');}
 private target(p:Plant){const g=this.g,s=this.states.get(p.id)!,prop=g.props.plants.toadstool,x=cellX(p.column),range=(s.food?4:prop.TongueDistance)*BOARD.cellWidth;
 const z=g.zombies.filter(z=>z.hp>0&&!z.reversed&&(s.food?Math.abs(z.row-p.row)<=2&&g.inLane(z,z.row):g.inLane(z,p.row))&&z.x>=x-20&&z.x<=x+range).sort((a,b)=>a.x-b.x)[0];
 if(z)return {id:z.id,x:z.x,y:rowY(z.row)-35,tomb:false};
 const t=g.graves.filter(t=>t.hp>0&&(s.food?Math.abs(t.row-p.row)<=2:t.row===p.row)&&cellX(t.column)>=x-20&&cellX(t.column)<=x+range).sort((a,b)=>a.column-b.column)[0];
 return t?{id:t.id,x:cellX(t.column),y:rowY(t.row)-35,tomb:true}:null;
 }
 tick(p:Plant,dt:number){const g=this.g,s=this.states.get(p.id)!,prop=g.props.plants.toadstool;
 if(g.time>=s.catchAt){
  if(s.targetTomb){const t=g.graves.find(t=>t.id===s.target&&t.hp>0);if(t)t.hp-=s.food?prop.TongueSlapDamagePF:prop.TongueSlapDamage;}
  else {const z=g.zombies.find(z=>z.id===s.target&&z.hp>0);if(z){const zp=g.props.zombies[z.kind];if(zp.CannotBeSwallowedByChomper)g.damage(z,s.food?prop.TongueSlapDamagePF:prop.TongueSlapDamage);else {z.hp=0;z.armor=0;z.deathCause='swallow';if(!zp.CanBeEasilySwallowedByChomper)s.chews.push(s.food?prop.ChewTimePF:prop.ChewTime);}}}
  s.catchAt=Infinity;s.target=null;delete s.tongue;this.play(p,'AttackEnd');
 }
 if(s.catchAt===Infinity){const before=s.chews.length;s.chews=s.chews.map(t=>t-dt);const done=s.chews.filter(t=>t<=0).length;s.produce+=done;s.chews=s.chews.filter(t=>t>0);if(before>0&&!s.chews.length)this.play(p,'ChewEnd');}
 if(['Idle','Chew'].includes(p.animation!)){
  if(s.chews.length+s.produce<(s.food?prop.MaxZombieChewCountPF:prop.MaxZombieChewCount)&&this.target(p))this.play(p,'AttackStart');
  else if(s.food&&!s.chews.length&&!s.produce){s.wait-=dt;if(s.wait<=0){s.food=false;p.action='idle';}}
 }
 s.elapsed+=dt;const timeline=g.props.plantAnimations.toadstool[p.animation!];
 while(s.event<timeline.events.length&&s.elapsed>=timeline.events[s.event].at){const e=timeline.events[s.event++].name;
  if(e==='attack'){const target=this.target(p);if(target){s.target=target.id;s.targetTomb=target.tomb;s.catchAt=g.time+.6667;s.tongue={x:target.x,y:target.y,at:g.time};const z=g.zombies.find(z=>z.id===target.id);if(z&&!g.props.zombies[z.kind].CannotBeSwallowedByChomper)z.stunnedUntil=g.time+1;}else this.play(p,'AttackEnd');g.beach.sounds.push('toadstool/'+(s.food?'tongueFood':'tongue'));}
  if(e==='foodEnd'&&s.food){s.food=false;p.action='grow';}
  if(e==='produce'){for(let i=0;i<s.produce;i++)g.dropSun(cellX(p.column),rowY(p.row)-65,s.food?prop.SunProducePerZombiePF:prop.SunProducePerZombie,'plant');s.produce=0;g.beach.sounds.push('toadstool/'+(s.food?'produceFood':'produce'));}
  if(['chew','swallow','stomach','open'].includes(e))g.beach.sounds.push('toadstool/'+e);
  if(e==='tongue_back')g.beach.sounds.push('toadstool/'+(s.food?'tongueBackFood':'tongueBack'),'toadstool/grab');
 }
 if(s.elapsed>=timeline.duration){if(p.animation==='AttackStart')this.play(p,s.catchAt<Infinity?'AttackLoop':'AttackEnd');else if(['AttackEnd','ChewEnd'].includes(p.animation!))this.play(p,s.chews.length?'Chew':'Idle');else if(['Idle','Chew','AttackLoop'].includes(p.animation!)){s.elapsed=0;s.event=0;}}
 }
}
