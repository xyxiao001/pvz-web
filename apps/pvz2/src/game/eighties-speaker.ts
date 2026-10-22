import {BOARD,cellX} from './level';
import type {Game,Grave} from './model';
import native from '../../public/assets/eighties/properties.json';
type SpeakerState={animation:string;at:number;elapsed:number;event:number;charge:boolean};
export class EightiesSpeaker {
 readonly states=new Map<number,SpeakerState>();
 waves:{id:number;row:number;x:number;hits:Set<number>;spent:boolean}[]=[];
 private beat=0;
 private fake=0;
 constructor(private g:Game){}
 spawn(row:number,column:number){
  const g=this.g,old=g.graves.find(t=>t.row===row&&t.column===column&&t.hp>0);if(old)return old;
  const t:Grave={id:g.nextEntityId(),kind:'speaker',row,column,hp:native.tombs.speaker.Toughness,stage:0,spawnAt:g.time};g.graves.push(t);this.play(t,'Spawn');return t;
 }
 private play(t:Grave,animation:string){this.states.set(t.id,{animation,at:this.g.time,elapsed:0,event:0,charge:false});}
 charge(t:Grave){const s=this.states.get(t.id)!;if(s.animation==='Idle')this.play(t,'Charge');else s.charge=true;}
 private invincible(p:Game['plants'][number]){return p.action==='food'||p.sheep!==undefined||!!p.leap||this.g.eighties.carrot.blocked(p)||this.g.kongfu.peach.protected(p);}
 private event(t:Grave,name:string){
  const g=this.g;
  if(name==='smash'){
   for(const p of g.plants)if(p.hp>0&&p.row===t.row&&p.column===t.column&&!this.invincible(p))p.hp=0;
   for(const z of g.westFinale.allies)if(z.hp>0&&z.row===t.row&&Math.abs(z.x-cellX(t.column))<BOARD.cellWidth/2)g.damage(z,Infinity);
   if(g.plants.some(p=>p.hp>0&&p.row===t.row&&p.column===t.column))t.hp=0;
  }
  if(name==='hit'){
   for(const p of g.plants)if(p.hp>0&&p.row===t.row&&p.column<t.column&&p.column>=t.column-2&&!g.props.plants[p.kind].ImmuneToSpeakerHit&&!p.hidden&&!this.invincible(p))p.hp-=native.tombs.speaker.HitDamage*g.future.plantDamageScale(p);
   for(const z of g.westFinale.allies)if(z.hp>0&&z.row===t.row&&z.x<cellX(t.column)&&z.x>cellX(t.column-2))g.damage(z,native.tombs.speaker.HitDamage);
  }
  if(name==='wave')this.waves.push({id:g.nextEntityId(),row:t.row,x:cellX(t.column),hits:new Set(),spent:false});
  if(['smash','wave','hit'].includes(name))g.beach.sounds.push('speaker/'+name+'Sounds');
 }
 damage(t:Grave){t.stage=5-Math.floor(Math.max(0,t.hp)/native.tombs.speaker.Toughness*5);if(t.hp<=0)this.states.delete(t.id);}
 tick(dt:number){
  const g=this.g;this.beat-=dt;
  if(this.beat<=0){this.beat+=.4;this.fake=(this.fake+1)%3;for(const t of g.graves)if(t.kind==='speaker'&&t.hp>0&&this.states.get(t.id)!.animation==='Idle')this.play(t,this.fake===0?'Hit':'Hit_Fake');}
  for(const t of g.graves)if(t.kind==='speaker'&&t.hp>0){
   const s=this.states.get(t.id)!;s.elapsed+=dt;const timeline=g.props.plantAnimations.speaker[s.animation];
   while(s.event<timeline.events.length&&s.elapsed>=timeline.events[s.event].at)this.event(t,timeline.events[s.event++].name);
   if(s.elapsed>=timeline.duration&&s.animation!=='Idle'){const charge=s.charge;this.play(t,charge?'Charge':'Idle');}
  }
  for(const w of this.waves){const old=w.x;w.x-=14*BOARD.cellWidth*dt;
   const plants=g.plants.filter(p=>p.hp>0&&p.row===w.row&&cellX(p.column)<=old+25&&cellX(p.column)>=w.x-25&&!w.hits.has(p.id)).sort((a,b)=>b.column-a.column);
   for(const p of plants){w.hits.add(p.id);if(!this.invincible(p))p.hp=0;if(g.props.plants[p.kind].ImmuneToSpeakerWave){w.spent=true;break;}}
   for(const z of [...g.zombies,...g.westFinale.allies])if(!w.spent&&z!==g.boss?.zombie&&z.hp>0&&z.row===w.row&&z.x<=old+25&&z.x>=w.x-25&&!w.hits.has(z.id)){w.hits.add(z.id);g.damage(z,Infinity,'toss');}
  }
  this.waves=this.waves.filter(w=>!w.spent&&w.x>BOARD.left-100);
  for(const id of this.states.keys())if(!g.graves.some(t=>t.id===id&&t.hp>0))this.states.delete(id);
 }
 finish(){this.g.graves=this.g.graves.filter(t=>t.kind!=='speaker');this.states.clear();this.waves=[];}
}
