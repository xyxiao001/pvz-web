import {BOARD,cellX,rowY} from './level';
import {isFlying} from './pirate';
import type {Game,Plant,Zombie} from './model';
interface State {left:number;powered:boolean;reload:number;success:boolean}
interface Catch {id:number;plant:Plant;zombie:Zombie;at:number;arrived:boolean;hit:boolean;ended:number|null}
export class ModernGrimrose {
 readonly states=new Map<number,State>();
 catches:Catch[]=[];
 readonly sinking=new Map<number,number>();
 constructor(private g:Game){}
 init(p:Plant){this.states.set(p.id,{left:1,powered:false,reload:this.g.props.plants.grimrose.ReloadInterval,success:false});}
 private play(p:Plant,name:string,food=false){p.animation=name;p.action=name==='Idle'?'idle':food?'food':'shoot';p.actionAt=this.g.time;p.eventIndex=0;}
 private targets(p:Plant,food:boolean){return this.g.zombies.filter(z=>z.hp>0&&!z.reversed&&!isFlying(z)&&z.x>=BOARD.left&&z.x<cellX(9)&&(food||z.row===p.row)&&!this.sinking.has(z.id)&&!this.catches.some(c=>c.zombie===z&&c.ended===null)).sort((a,b)=>a.x-b.x).slice(0,food?this.g.props.plants.grimrose.KillCountPlantfood:this.g.props.plants.grimrose.KillCountPerAttack);}
 private cancel(p:Plant){for(const c of this.catches)if(c.plant===p&&c.ended===null)c.ended=this.g.time;}
 food(p:Plant){this.cancel(p);const s=this.states.get(p.id)!;s.left=this.g.modern.powered(p)?this.g.props.plants.grimrose.MaxKillsPowered:this.g.props.plants.grimrose.MaxKills;s.success=false;this.play(p,'FoodStart',true);}
 plant(p:Plant,dt:number){
  const g=this.g,s=this.states.get(p.id)!,prop=g.props.plants.grimrose,powered=g.modern.powered(p);
  if(s.powered!==powered){s.powered=powered;s.left=powered?prop.MaxKillsPowered:prop.MaxKills;}
  s.reload-=dt;
  if(p.action==='idle'){
   if(s.left>0&&this.targets(p,false).length){s.success=false;this.play(p,'AttackStart');}
   else if(s.reload<=0&&powered&&s.left<prop.MaxKillsPowered){s.reload=prop.ReloadInterval;this.play(p,'Reload');}
   else return;
  }
  const food=p.action==='food',timeline=g.props.plantAnimations.grimrose[p.animation!],elapsed=g.time-p.actionAt;
  if(p.animation==='AttackLoop'||p.animation==='FoodLoop'){
   const caught=this.catches.filter(c=>c.plant===p&&c.ended===null);
   if(!caught.length||caught.every(c=>c.hit)){s.success=caught.some(c=>c.hit);this.cancel(p);g.beach.sounds.push('grimrose/'+(s.success?'attackEnd':'attackVoid'));this.play(p,food?'FoodEnd':'AttackEnd',food);}return;
  }
  while(p.eventIndex!<timeline.events.length&&elapsed>=timeline.events[p.eventIndex!].at){
   const event=timeline.events[p.eventIndex!++].name;
   if(event==='attackSound')g.beach.sounds.push('grimrose/attackStart');
   if(event==='reload'){s.left=Math.min(prop.MaxKillsPowered,s.left+1);g.beach.sounds.push('grimrose/reload');}
   if(event==='consume'&&s.success){s.left--;g.future.visual('grimFade','Play',cellX(p.column),rowY(p.row)-70);}
   if(event==='attackLP'||event==='foodLP'){
    const targets=this.targets(p,food);for(const z of targets)this.catches.push({id:g.nextEntityId(),plant:p,zombie:z,at:g.time,arrived:false,hit:false,ended:null});
    if(targets.length)this.play(p,food?'FoodLoop':'AttackLoop',food);else {g.beach.sounds.push('grimrose/attackVoid');this.play(p,food?'FoodEnd':'AttackEnd',food);}return;
   }
  }
  if(elapsed>=timeline.duration){if(s.left<=0)p.hp=0;else this.play(p,'Idle');}
 }
 tick(){
  const g=this.g;
  // Effects exist only once this plant has acquired targets.
  for(const c of this.catches){
   if(c.ended!==null)continue;
   const arrive=g.props.plantAnimations.grimBeam.Spawn.events.find(e=>e.name==='arrive')!.at;
   if(!g.plants.includes(c.plant)||c.plant.hp<=0||c.zombie.hp<=0||isFlying(c.zombie)){c.ended=g.time;continue;}
   c.zombie.stunnedUntil=g.time+.1;
   if(g.time-c.at>=arrive)c.arrived=true;
   if(!c.hit&&g.time-c.at>=arrive+g.props.plantAnimations.grimFoot.Spawn.events.find(e=>e.name==='drag')!.at){
    c.hit=true;
    if(g.props.zombies[c.zombie.kind].CannotBeDraggedByTangleKelp)g.damage(c.zombie,g.props.plants.grimrose.SlapDamage);
    else {this.sinking.set(c.zombie.id,g.time);c.zombie.stunnedUntil=g.time+50;}
   }
  }
  for(const [id,at] of this.sinking){const z=g.zombies.find(z=>z.id===id);if(!z||z.hp<=0){this.sinking.delete(id);continue;}if(g.time-at>=.8){z.hp=0;z.deathCause='swallow';this.sinking.delete(id);}}
  this.catches=this.catches.filter(c=>c.ended===null||g.time-c.ended<g.props.plantAnimations.grimBeam.Die.duration);
 }
}
