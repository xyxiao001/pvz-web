import {BOARD,cellX,rowY} from './level';
import type {Game,Plant,Zombie} from './model';
import {isFlying} from './pirate';

/** Native Eighties music cues, punk kicks, Phat Beet and Cactus. */
export class EightiesBattle {
 jam='jam_clear';
 lit=new Set<number>();
 heavy=new Map<number,number>();
 kicks=new Map<number,number>();
 shots:{id:number;row:number;x:number;y:number;food:boolean;left:number;hits:Set<number>}[]=[];
 constructor(private g:Game){}
 private play(p:Plant,animation:string,action:Plant['action']='idle'){p.animation=animation;p.action=action;p.actionAt=this.g.time;p.eventIndex=0;}
 add(p:Plant){if(p.kind==='phatbeet'){this.heavy.set(p.id,2);p.nextAction=this.g.time;this.play(p,'Idle');}if(p.kind==='cactus'){p.nextAction=this.g.time;this.play(p,'Idle');}}
 spawn(z:Zombie){if(z.kind==='eighties_punk')this.kicks.set(z.id,0);}
 food(p:Plant){this.play(p,'Food','food');}
 private enemies(p:Plant,range:number){return this.g.zombies.filter(z=>z.hp>0&&Math.abs(z.row-p.row)<=range&&Math.abs(z.x-cellX(p.column))<(range+.5)*BOARD.cellWidth);}
 private thump(p:Plant,food:boolean,heavy=false){
  const g=this.g,prop=g.props.plants.phatbeet,near=new Set(this.enemies(p,1).map(z=>z.id));
  for(const z of this.enemies(p,food?2:1)){
   g.damage(z,food?(near.has(z.id)?prop.PlantfoodDamageNear:prop.PlantfoodDamageFar):heavy?prop.DamageHeavy:prop.Damage);
   g.future.visual('phatHit','Play',z.x,rowY(z.row)-35);
  }
  for(const t of g.graves)if(t.hp>0&&Math.abs(t.row-p.row)<=(food?2:1)&&Math.abs(t.column-p.column)<=(food?2:1))t.hp-=food?(Math.abs(t.row-p.row)<=1&&Math.abs(t.column-p.column)<=1?prop.PlantfoodDamageNear:prop.PlantfoodDamageFar):heavy?prop.DamageHeavy:prop.Damage;
  g.beach.sounds.push('phatbeet/hit');
 }
 private shoot(p:Plant){
  const prop=this.g.props.plants.cactus;
  this.shots.push({id:this.g.nextEntityId(),row:p.row,x:cellX(p.column)+25,y:rowY(p.row)-48,food:this.lit.has(p.id),left:prop.PierceCount+Math.floor(this.g.random()*(prop.PierceCountAdditional+1)),hits:new Set()});
 }
 plant(p:Plant){
  const g=this.g,prop=g.props.plants[p.kind];
  if(p.kind==='phatbeet'){
   if(p.action==='idle'&&g.time>=p.nextAction&&(this.enemies(p,1).length||g.graves.some(t=>t.hp>0&&Math.abs(t.row-p.row)<=1&&Math.abs(t.column-p.column)<=1))){this.play(p,'Attack','shoot');p.nextAction=g.time+prop.AttackInterval;}
  }else if(p.action!=='food'){
   const hide=g.zombies.some(z=>z.hp>0&&z.row===p.row&&Math.abs(z.x-cellX(p.column))<BOARD.cellWidth+22);
   if(hide!==!!p.hidden){p.hidden=hide;this.play(p,hide?'Hide':'Recover_Hidden','grow');}
   if(p.action==='idle'&&g.time>=p.nextAction){
    if(p.hidden){
     if(g.zombies.some(z=>z.hp>0&&!isFlying(z)&&z.row===p.row&&Math.abs(z.x-cellX(p.column))<BOARD.cellWidth/2+22)){this.play(p,'Attack_Hidden','shoot');p.nextAction=g.time+prop.StabInterval;}
    }else if(g.zombies.some(z=>z.hp>0&&g.inLane(z,p.row)&&z.x>=cellX(p.column))||g.graves.some(t=>t.hp>0&&t.row===p.row&&t.column>=p.column)){
     this.play(p,'Shoot','shoot');p.nextAction=g.time+prop.ShootInterval+g.random()*prop.ShootIntervalAdditional;
    }
   }
  }
  if(p.action==='idle')return;
  const animation=p.animation!,timeline=g.props.plantAnimations[p.kind][animation],elapsed=g.time-p.actionAt;
  while(p.eventIndex!<timeline.events.length&&elapsed>=timeline.events[p.eventIndex!].at){
   const event=timeline.events[p.eventIndex!++].name;
   if(p.kind==='phatbeet'){
    if(event==='attack'){
     let left=this.heavy.get(p.id)!-1;const heavy=left<=0;
     if(heavy)left=prop.TimesHeavy+Math.floor(g.random()*(prop.TimesHeavyAdditional+1));this.heavy.set(p.id,left);
     this.thump(p,false,heavy);g.future.visual('phatWave',heavy?'Play_Heavy':'Play',cellX(p.column),rowY(p.row));
    }
    if(event==='foodAttack')this.thump(p,true);
    if(event==='foodWave'){g.future.visual('phatWave','Play_PF',cellX(p.column),rowY(p.row));g.beach.sounds.push('phatbeet/impactPF');}
    if(event==='attackStart')g.beach.sounds.push('phatbeet/attack');
    if(event==='foodStart')g.beach.sounds.push('phatbeet/attackPF');
   }else {
    if(event==='Shoot')this.shoot(p);
    if(event==='Attack'){
     for(const z of g.zombies)if(z.hp>0&&!isFlying(z)&&z.row===p.row&&Math.abs(z.x-cellX(p.column))<BOARD.cellWidth/2+22)g.damage(z,this.lit.has(p.id)?prop.StabDamagePlantfood:prop.StabDamage);
     g.beach.sounds.push('cactus/shakeSound');
    }
    if(event==='light')this.lit.add(p.id);
    if(event==='shootSound')g.beach.sounds.push('cactus/'+(this.lit.has(p.id)?'shootFoodSounds':'shootSounds'));
    if(event==='hideSound')g.beach.sounds.push('cactus/hideSounds');
    if(event==='hideEndSound')g.beach.sounds.push('cactus/blopSounds');
    if(event==='attackSound')g.beach.sounds.push('cactus/stabSound');
    if(event==='foodSound'){g.beach.sounds.push('cactus/foodShootSound');g.beach.sounds.push('cactus/foodShoutSound');}
   }
   if(event==='foodEnd'){if(p.kind==='cactus')this.lit.add(p.id);this.play(p,p.hidden?'Idle_Hidden':'Idle');return;}
  }
  if(elapsed>=timeline.duration)this.play(p,p.hidden?'Idle_Hidden':'Idle');
 }
 kick(z:Zombie,p:Plant){
  const g=this.g;
  if(z.kind!=='eighties_punk'||this.jam!=='jam_punk'||g.time<this.kicks.get(z.id)!||p.action==='food')return false;
  const stack=g.plants.filter(q=>q.hp>0&&q.row===p.row&&q.column===p.column);
  if(stack.some(q=>g.props.plants[q.kind].CannotBePushedByFootballMech)||g.kongfu.peach.protected(p))return false;
  this.kicks.set(z.id,g.time+g.props.zombies.eighties_punk.PushCooldown);
  let column=p.column+(z.reversed?1:-1);
  while(column>=0&&column<BOARD.columns&&(g.plants.some(q=>q.hp>0&&q.row===p.row&&q.column===column)||g.graves.some(t=>t.hp>0&&t.row===p.row&&t.column===column)||g.level.mold.some(t=>t.row===p.row&&t.column===column)))column+=z.reversed?1:-1;
  if(column<0||column>=BOARD.columns)p.hp=0;
  else {p.leap={x:cellX(p.column),y:rowY(p.row),at:g.time,duration:.5,pushed:true};p.column=column;}
  z.eating=false;g.beach.sounds.push('eightiesPunk/kickSounds');return true;
 }
 tick(dt:number){
  const g=this.g;
  for(const s of this.shots){
   const from=s.x;s.x+=11*BOARD.cellWidth*dt;
   const targets=[...g.zombies.filter(z=>z.hp>0&&g.inLane(z,s.row)).map(z=>({id:z.id,x:z.x,z})),...g.graves.filter(t=>t.hp>0&&t.row===s.row).map(t=>({id:t.id,x:cellX(t.column),t}))].filter(t=>t.x>=from-22&&t.x<=s.x+22&&!s.hits.has(t.id)).sort((a,b)=>a.x-b.x);
   for(const t of targets){if(s.left===0)break;s.hits.add(t.id);s.left--;const damage=g.props.projectiles[s.food?'cactus_pf':'cactus'].Damage;if('z' in t)g.damage(t.z,damage);else t.t.hp-=damage;g.effects.push({id:g.nextEntityId(),kind:'hit',x:t.x,y:s.y,age:0});}
  }
  this.shots=this.shots.filter(s=>s.left>0&&s.x<BOARD.width+50);
  for(const id of this.heavy.keys())if(!g.plants.some(p=>p.id===id))this.heavy.delete(id);
  for(const id of this.lit)if(!g.plants.some(p=>p.id===id))this.lit.delete(id);
  for(const id of this.kicks.keys())if(!g.zombies.some(z=>z.id===id))this.kicks.delete(id);
 }
}
