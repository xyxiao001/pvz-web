import {BOARD,cellX,rowY} from './level';
import type {Game,Plant,Zombie} from './model';
type Singing={animation:'SingStart'|'SingLoop'|'SingEnd';at:number;elapsed:number;until:number;targets:Set<number>};

/** One ballad per zombie; plants are captured at the ballad animation event. */
export class EightiesBoomBox {
 readonly states=new Map<number,Singing>();
 readonly hearts=new Map<number,number>();
 private boomed=new Set<number>();
 musicUntil=0;
 constructor(private g:Game){}
 blocked(p:Plant){return this.g.time<(this.hearts.get(p.id)??0);}
 zombie(z:Zombie){
  const g=this.g,prop=g.props.zombies.eighties_boombox,column=Math.floor((z.x-BOARD.left)/BOARD.cellWidth);
  if(!this.boomed.has(z.id)&&!g.westFinale.allies.includes(z)&&(z.reversed?column>=8-prop.BoomBoxColumn:column<=prop.BoomBoxColumn)){
   this.boomed.add(z.id);this.states.set(z.id,{animation:'SingStart',at:g.time,elapsed:0,until:Infinity,targets:new Set()});z.eating=false;
  }
  return this.states.has(z.id);
 }
 private end(s:Singing){s.animation='SingEnd';s.at=this.g.time;s.elapsed=0;s.targets.clear();this.g.beach.sounds.push('eightiesBoomBox/powerDownSounds');}
 tick(dt:number){
  const g=this.g;
  for(const [id,s] of this.states){
   const z=g.zombies.find(z=>z.id===id)||g.westFinale.allies.find(z=>z.id===id);
   if(!z||z.hp<=0){this.states.delete(id);continue;}
   const stopped=g.time<z.frozenUntil||g.time<(z.stunnedUntil??0)||g.time<(z.butteredUntil??0)||g.eighties.warps.has(id);
   if(s.until!==Infinity&&s.animation!=='SingEnd'){
    this.musicUntil=g.time+.5;
    for(const target of s.targets){
     const p=g.plants.find(p=>p.id===target);
     if(!p||p.hp<=0||p.action==='food'||p.sheep!==undefined||p.leap||g.iceage.blocked(p)||g.kongfu.peach.protected(p)||g.eighties.carrot.blocked(p)){s.targets.delete(target);this.hearts.delete(target);}else this.hearts.set(target,g.time+.5);
    }
    if(g.time>=s.until||stopped||g.westFinale.allies.includes(z)){this.end(s);continue;}
   }
   if(stopped)continue;
   s.elapsed+=dt*(g.time<z.chilledUntil?.5:1);
   const timeline=g.props.plantAnimations.eightiesBoomBox[s.animation];
   if(s.animation==='SingStart'&&s.until===Infinity&&s.elapsed>=timeline.events.find(e=>e.name==='ballad')!.at){
    for(const p of g.plants)if(p.hp>0&&!g.props.plants[p.kind].ImmuneToBoomBox&&Math.hypot(cellX(p.column)-z.x,rowY(p.row)-rowY(z.row))<g.props.zombies.eighties_boombox.PlantFreezeRadius*BOARD.cellWidth){s.targets.add(p.id);this.hearts.set(p.id,g.time+.5);}
    s.until=g.time+g.props.zombies.eighties_boombox.BoomBoxDuration;this.musicUntil=g.time+.5;g.beach.sounds.push('eightiesBoomBox/powerUpSounds');
   }
   if(s.animation==='SingStart'&&s.elapsed>=timeline.duration){s.animation='SingLoop';s.elapsed=0;s.at=g.time;}
   else if(s.animation==='SingEnd'&&s.elapsed>=timeline.events[0].at)this.states.delete(id);
  }
  for(const [id,until] of this.hearts)if(g.time>=until||!g.plants.some(p=>p.id===id&&p.hp>0))this.hearts.delete(id);
 }
}
