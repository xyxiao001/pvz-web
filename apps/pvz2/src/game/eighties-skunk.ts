import {BOARD,cellX,rowY} from './level';
import type {Game,Plant,Zombie} from './model';
type Follower={parent:Zombie;x:number;y:number};
/** Veteran summons eight surrounding followers, releasing them during punk music. */
export class EightiesSkunk {
 readonly followers=new Map<number,Follower>();
 readonly lanes=new Map<number,{from:number;to:number;at:number}>();
 readonly dancing=new Set<number>();
 readonly stunned=new Map<number,number>();
 private veterans=new Map<number,{next:number;spawnAt:number|null}>();
 private farts=new Map<number,number>();
 constructor(private g:Game){}
 spawn(z:Zombie){if(z.kind==='eighties_punk_veteran')this.veterans.set(z.id,{next:this.g.time,spawnAt:null});if(z.kind==='eighties_skunk')this.farts.set(z.id,this.g.time+1);}
 y(z:Zombie){const lane=this.lanes.get(z.id);if(!lane)return rowY(z.row);const t=Math.min(1,(this.g.time-lane.at)/.5);return rowY(lane.from)+(rowY(lane.to)-rowY(lane.from))*(1-(1-t)**2);}
 blocked(p:Plant){return p.action!=='food'&&this.g.time<(this.stunned.get(p.id)??0);}
 speed(z:Zombie){const p=this.g.props.zombies.eighties_skunk;return z.kind==='eighties_skunk'&&!this.dancing.has(z.id)?p.RunSPS/p.WalkSPS:1;}
 private release(z:Zombie,f:Follower){if(this.g.westFinale.allies.includes(z)===this.g.westFinale.allies.includes(f.parent))z.reversed=f.parent.reversed;this.followers.delete(z.id);this.dancing.delete(z.id);}
 private fart(z:Zombie){
  const g=this.g,duration=g.props.zombies.eighties_skunk.FartStunDuration;
  g.future.visual('skunkFart','Play',z.x,rowY(z.row));g.beach.sounds.push('eightiesSkunk/fartSounds');
  for(const p of g.plants)if(p.hp>0&&p.row===z.row&&Math.abs(cellX(p.column)-z.x)<BOARD.cellWidth/4+20&&p.action!=='food'&&!g.kongfu.peach.protected(p))this.stunned.set(p.id,g.time+duration);
  for(const other of g.westFinale.allies.includes(z)?g.zombies:g.westFinale.allies)if(other.hp>0&&other.row===z.row&&Math.abs(other.x-z.x)<BOARD.cellWidth/4+22)other.stunnedUntil=Math.max(other.stunnedUntil??0,g.time+duration);
 }
 die(z:Zombie){
  if(z.kind==='eighties_skunk'&&this.farts.delete(z.id))this.fart(z);
  if(z.kind==='eighties_punk_veteran'&&this.veterans.delete(z.id)){
   for(const [id,f] of this.followers)if(f.parent===z){const child=[...this.g.zombies,...this.g.westFinale.allies].find(c=>c.id===id);if(child)this.release(child,f);}
   for(const dx of [-20,20])this.g.future.visual('skunkDeath','Play',z.x+dx,rowY(z.row)-60);
   this.g.beach.sounds.push('eightiesPunkVeteran/skunkBlopSounds','eightiesPunkVeteran/skunkDeathSaySounds');
  }
  this.followers.delete(z.id);this.dancing.delete(z.id);this.lanes.delete(z.id);
 }
 zombie(z:Zombie,dt:number){
  const f=this.followers.get(z.id);if(!f||z.eating||z.leap)return false;
  const g=this.g,target=f.parent.x+f.x*BOARD.cellWidth,row=f.parent.row+f.y;
  if(z.row!==row&&!this.lanes.has(z.id))this.lanes.set(z.id,{from:z.row,to:row,at:g.time});
  // Let the normal eating path handle a plant or an opposing zombie in reach.
  if((!g.westFinale.allies.includes(z)&&g.plants.some(p=>p.hp>0&&p.row===z.row&&!p.hidden&&Math.abs(cellX(p.column)-z.x)<45))||(g.westFinale.allies.includes(z)?g.zombies:g.westFinale.allies).some(q=>q.hp>0&&q.row===z.row&&Math.abs(q.x-z.x)<50))return false;
  const distance=target-z.x,step=g.props.zombies.eighties_skunk.WalkSPS*this.speed(z)*g.props.zombies.eighties_punk_veteran.SkunkChasingSpeedMult*BOARD.cellWidth*dt*(g.time<z.chilledUntil?.5:1);
  z.x+=Math.sign(distance)*Math.min(Math.abs(distance),step);
  if(Math.abs(distance)<20){this.dancing.add(z.id);z.reversed=f.parent.reversed;}else {this.dancing.delete(z.id);z.reversed=distance>0;}
  return true;
 }
 tick(dt:number){
  const g=this.g,all=[...g.zombies,...g.westFinale.allies],prop=g.props.zombies.eighties_punk_veteran;
  for(const [id,lane] of this.lanes){const z=all.find(z=>z.id===id);if(!z||z.hp<=0)this.lanes.delete(id);else {z.row=Math.round((this.y(z)-rowY(0))/BOARD.cellHeight);if(g.time-lane.at>=.5){z.row=lane.to;this.lanes.delete(id);}}}
  for(const [id,f] of this.followers){const z=all.find(z=>z.id===id);if(!z||z.hp<=0){this.followers.delete(id);this.dancing.delete(id);}else if(f.parent.hp<=0||!all.includes(f.parent)||g.eighties.jam==='jam_punk'||g.westFinale.allies.includes(z)!==g.westFinale.allies.includes(f.parent))this.release(z,f);}
  for(const z of all){
   if(z.hp<=0)continue;
   const stopped=g.time<z.frozenUntil||g.time<(z.stunnedUntil??0)||g.time<(z.butteredUntil??0)||g.eighties.warps.has(z.id);
   const s=this.veterans.get(z.id);
   if(s){
    if(stopped){s.next+=dt;if(s.spawnAt!==null)s.spawnAt+=dt;continue;}
    const empty=prop.SkunkPositionList.filter(pos=>z.row+pos.y>=0&&z.row+pos.y<5&&![...this.followers.values()].some(f=>f.parent===z&&f.x===pos.x&&f.y===pos.y));
    if(s.spawnAt!==null&&g.time>=s.spawnAt){s.spawnAt=null;if(empty.length){const pos=empty[Math.floor(g.random()*empty.length)],child=g.spawnZombie(prop.SkunkType,z.row,z.x);child.reversed=z.reversed;if(g.westFinale.allies.includes(z))g.westFinale.adopt(child);if(g.eighties.jam==='jam_punk')this.lanes.set(child.id,{from:z.row,to:z.row+pos.y,at:g.time});else this.followers.set(child.id,{parent:z,...pos});}}
    if(z.x<cellX(9)&&s.spawnAt===null&&g.time>=s.next&&empty.length){s.next=g.time+prop.SkunkCooldown;s.spawnAt=g.time+.5;g.future.visual('punkRotate','Play',z.x,rowY(z.row));g.beach.sounds.push('eightiesPunkVeteran/rotateSounds','eightiesPunkVeteran/skunksSounds');}
   }
   const fart=this.farts.get(z.id);if(fart!==undefined){if(stopped)this.farts.set(z.id,fart+dt);else if(g.time>=fart){this.fart(z);this.farts.set(z.id,g.time+g.props.zombies.eighties_skunk.FartInterval);}}
  }
  for(const [id,until] of this.stunned)if(g.time>=until||!g.plants.some(p=>p.id===id&&p.hp>0))this.stunned.delete(id);
 }
}
