import {cellX} from './level';
import type {Game,Plant,Zombie} from './model';

export class DinoBully {
 states=new Map<number,{at:number;elapsed:number;event:number}>();
 cracks:{id:number;row:number;column:number;at:number;until:number}[]=[];
 constructor(private g:Game){}
 tick(){this.cracks=this.cracks.filter(c=>this.g.time<c.until);for(const id of this.states.keys())if(!this.g.zombies.some(z=>z.id===id&&z.hp>0))this.states.delete(id);}
 private target(z:Zombie){return this.g.plants.filter(p=>p.hp>0&&p.row===z.row&&p.sheep===undefined&&!p.leap&&!p.hidden&&p.action!=='explode'&&!['goldbloom','perfumeshroom','grapeshot','cherry_bomb','jalapeno','stallia','iceburg'].includes(p.kind)&&!(p.kind==='primalpotatomine'&&p.rootGrown)&&Math.abs(cellX(p.column)-z.x)<65).sort((a,b)=>b.column-a.column)[0];}
 private smash(p:Plant){
  const g=this.g;if(p.action==='food'||g.kongfu.peach.protected(p))return;
  if(p.kind==='primalwallnut')g.dino.smashNut(p);
  else if(p.kind==='explodeonut')g.dino.plants.smashNut(p);
  else if(['wallnut','tallnut'].includes(p.kind)&&p.armor>0)p.armor=0;
  else if(p.kind==='spikerock'){p.spikes!--;if(p.spikes===0)p.hp=0;}
  else p.hp=0;
  if(!g.plants.some(v=>v.hp>0&&v.row===p.row&&v.column===p.column))this.cracks.push({id:g.nextEntityId(),row:p.row,column:p.column,at:g.time,until:g.time+g.props.zombies.dino_bully_veteran.CraterLifetime});
 }
 zombie(z:Zombie,dt:number){
  if(z.kind!=='dino_bully_veteran')return false;
  const g=this.g,foe=g.westFinale.allies.find(a=>a.hp>0&&a.row===z.row&&Math.abs(a.x-z.x)<65),target=this.target(z);let state=this.states.get(z.id);
  if(!state){if(!target&&!foe)return false;state={at:g.time,elapsed:0,event:0};this.states.set(z.id,state);}
  z.eating=false;state.elapsed+=dt*(g.time<z.chilledUntil?.5:1);const timeline=g.props.plantAnimations.dinoBullyVeteran.Smash;
  while(state.event<timeline.events.length&&state.elapsed>=timeline.events[state.event].at){const name=timeline.events[state.event++].name;
   if(name==='smash_say')g.beach.sounds.push('dinoBullyVeteran/smashSaySounds');
   if(name==='smash'){if(foe)g.damage(foe,g.props.zombies.dino_bully_veteran.SmashDamage);else if(target)this.smash(target);g.beach.sounds.push('dinoBullyVeteran/smashSounds');}
   if(name==='switchingFalse'){this.states.delete(z.id);return true;}
  }
  return true;
 }
}
