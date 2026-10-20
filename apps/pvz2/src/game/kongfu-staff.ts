import {BOARD,cellX,rowY} from './level';
import type {Game,Zombie} from './model';
import native from '../../public/assets/kongfu/properties.json';
const prop=native.zombies.abbot_3section_staff;
export class KongfuStaff {
 states=new Map<number,{broken:boolean;hop:null|{from:number;to:number;elapsed:number;duration:number}}>();
 constructor(private g:Game){}
 spawn(z:Zombie){this.states.set(z.id,{broken:false,hop:null});}
 private change(z:Zombie,animation:string){Object.assign(z.kongfu!,{animation,at:this.g.time,elapsed:0,event:0});}
 private target(z:Zombie){return this.g.plants.filter(p=>!z.reversed&&p.hp>0&&!p.hidden&&!p.leap&&p.row===z.row&&!['bambooshoot','iceburg','spikeweed','spikerock','iceweed','goldleaf','lilypad','floawerPot'].includes(p.kind)&&Math.abs(cellX(p.column)-z.x)<65).sort((a,b)=>b.column-a.column||Number(b.kind==='bamboobusket')-Number(a.kind==='bamboobusket'))[0];}
 height(z:Zombie){const hop=this.states.get(z.id)!.hop;return hop?90*Math.sin(Math.min(1,hop.elapsed/hop.duration)*Math.PI):0;}
 zombie(z:Zombie,dt:number){const g=this.g,s=z.kongfu!,state=this.states.get(z.id)!,step=dt*(g.time<z.chilledUntil?.5:1);s.elapsed+=step;
  const walk=()=>state.broken?'Walk_B':'Walk';
  if(!state.broken&&z.hp<=prop.Toughness/2&&(s.animation==='Walk'||s.animation==='RotateLoop')){state.broken=true;this.change(z,'Break');}
  if(state.hop){const h=state.hop;h.elapsed+=dt;z.x=h.from+(h.to-h.from)*Math.min(1,h.elapsed/h.duration);
   if(s.animation==='Leap'&&(this.target(z)?.kind==='tallnut'||g.future.shieldAt(z))){state.hop=null;s.flying=false;this.change(z,'Fall');}
   else if(h.elapsed>=h.duration){state.hop=null;s.flying=false;}
  }
  if(s.animation===walk()&&this.target(z))this.change(z,state.broken?'Attack_B':'Attack');
  if(s.animation===walk())return false;
  z.eating=false;
  if(s.animation==='RotateLoop'){if(s.elapsed>=prop.HammerDuration)this.change(z,'RotateEnd');return true;}
  const timeline=g.props.plantAnimations.abbotStaff[s.animation];
  while(s.event!<timeline.events.length&&s.elapsed>=timeline.events[s.event!].at){const event=timeline.events[s.event!++].name;
   if(['place','step','grab','break','spin4','spin2','spin1','stab','chain','impact'].includes(event))g.beach.sounds.push('abbotStaff/'+event+'Sounds');
   if(event==='hit1'||event==='hit2'){const p=this.target(z);if(p&&!g.kongfu.peach.protected(p)&&p.action!=='food'){const damage=(event==='hit1'?prop.Hit1Damage:prop.Hit2Damage)*g.future.plantDamageScale(p),armor=Math.min(p.armor,damage);p.armor-=armor;p.hp-=damage-armor;}}
   if(event==='judgeLeap'){this.change(z,this.target(z)&&this.target(z)!.kind!=='tallnut'&&!g.future.shieldAt(z)?'Leap':'Pick');return true;}
   if(event==='leap'||event==='backward'){const forward=event==='leap',direction=z.reversed?-1:1;state.hop={from:z.x,to:z.x+direction*(forward?-prop.LeapForwardDistance:prop.BlockBackwardDistance)*BOARD.cellWidth,elapsed:0,duration:(forward?22:19)/30};s.flying=true;g.beach.sounds.push('abbotStaff/'+(forward?'leapSounds':'stabSounds'));}
   if(event==='land'){state.hop=null;s.flying=false;}
   if(event==='rotateStart'){this.change(z,'RotateLoop');return true;}
   if(event==='switchingFalse'||event==='rest'){this.change(z,walk());return true;}
  }
  return true;
 }
 private intercept(x:number,y:number,vx:number,damage:number,name:'pea'|'boomerang',powered:boolean){const g=this.g;
  const z=g.zombies.find(z=>z.kind==='abbot_3section_staff'&&z.hp>0&&!z.reversed&&!this.states.get(z.id)!.broken&&g.time>=z.frozenUntil&&g.time>=(z.stunnedUntil??0)&&g.time>=(z.butteredUntil??0)&&Math.hypot(z.x-x,rowY(z.row)-45-y)<prop.ProjectileDetectRadius*.51);
  if(!z)return false;const s=z.kongfu!;
  if(s.animation==='Walk'){this.change(z,'RotateStart');return false;}
  if(s.animation!=='RotateLoop')return false;
  g.kongfu.reflected.push({id:g.nextEntityId(),x,y,vx:-vx,damage:damage*prop.ProjectileDamageMult,name,powered});g.beach.sounds.push('abbotStaff/hitSounds');return true;
 }
 tick(){const g=this.g;
  g.peas=g.peas.filter(p=>!this.intercept(p.x,p.y,p.vector?.vx??(p.powered?p.speed!:360),p.damage,'pea',p.powered));
  g.cowboy.shots=g.cowboy.shots.filter(p=>!this.intercept(p.x,rowY(p.row)-45,p.vx,p.damage,'pea',p.mega));
  g.missiles=g.missiles.filter(p=>p.projectile==='cantaloupe'||p.projectile==='cantaloupe_pf'||p.kind!=='boomerang'&&p.kind!=='cabbage'||!this.intercept(p.x,p.y,p.kind==='boomerang'?p.dx*656*(p.returning?-1:1):(p.targetX-p.startX)/p.duration,p.damage,p.kind==='boomerang'?'boomerang':'pea',p.powered));
 }
}
