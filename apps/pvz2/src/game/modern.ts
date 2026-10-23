import {ModernGrimrose} from './modern-grimrose';
import {ModernDusk} from './modern-dusk';
import {ModernEnemies} from './modern-enemies';
import {BOARD,cellX,rowY,type SpawnAction,type ZombieKind} from './level';
import type {Game,Plant,Zombie} from './model';
import {modernPortals as portalProps} from './modern-portals';
export const modernArmor=(kind:ZombieKind)=>kind==='tutorial_armor4'?'modern_armor4':kind==='tutorial_armor1'?'modern_armor1':kind==='tutorial_armor2'?'modern_armor2':null;
interface Portal {kind:NonNullable<SpawnAction['portal']>['kind'];id:number;row:number;column:number;born:number;next:number;ended:number|null;queue:ZombieKind[]}
interface Leaves {left:number;reload:number;fooded:boolean;cycles:number}
export class ModernBattle {
 readonly grimrose:ModernGrimrose;
 readonly dusk:ModernDusk;
 readonly leaves=new Map<number,Leaves>();
 readonly papers=new Map<number,{hp:number;angryAt:number;elapsed:number;sounded:boolean}>();
 readonly shrunk=new Map<number,{at:number;duration:number;damage:number;speed:number}>();
 readonly shadows=new Map<string,number>();
 portals:Portal[]=[];
 shots:{id:number;row:number;x:number;name:string;damage:number}[]=[];
 readonly enemies:ModernEnemies;
 constructor(private g:Game){this.grimrose=new ModernGrimrose(g);this.dusk=new ModernDusk(g);this.enemies=new ModernEnemies(g);}
 shadowPlant(p:Plant){return ['moonflower','nightshade','shadowshroom','dusklobber','grimrose'].includes(p.kind);}
 powered(p:Plant){return p.kind==='moonflower'?this.g.plants.filter(q=>q.hp>0&&this.shadowPlant(q)&&Math.abs(q.row-p.row)<=1&&Math.abs(q.column-p.column)<=1).length>=4:this.g.time<(this.shadows.get(`${p.row}:${p.column}`)??0);}
 init(p:Plant){p.animation='Idle';p.eventIndex=0;if(p.kind==='grimrose')this.grimrose.init(p);if(p.kind==='nightshade')this.leaves.set(p.id,{left:this.g.props.plants.nightshade.MaxProjectiles,reload:0,fooded:false,cycles:0});}
 private play(p:Plant,animation:string,action:Plant['action']){p.animation=animation;p.action=action;p.actionAt=this.g.time;p.eventIndex=0;}
 food(p:Plant){if(p.kind==='grimrose'){this.grimrose.food(p);return;}this.play(p,'Food','food');if(p.kind==='nightshade'){const s=this.leaves.get(p.id)!;s.fooded=true;s.left=this.g.props.plants.nightshade.MaxProjectiles;s.cycles=0;}}
 private shoot(p:Plant,mega:boolean){const g=this.g,s=this.leaves.get(p.id)!;if(!s.left)return;const prop=g.props.plants.nightshade,key=s.fooded?(mega?'nightshade_pf_mega':'nightshade_pf'):(mega?'nightshade_mega':'nightshade');if(!mega)s.left--;this.shots.push({id:g.nextEntityId(),row:p.row,x:cellX(p.column)+20,name:s.fooded?(mega?'nightshadeFoodMega':'nightshadeFood'):(mega?'nightshadeMega':'nightshadeShot'),damage:g.props.projectiles[key].Damage*(this.powered(p)&&!mega?prop.ShadowPoweredDamageScale:1)});}
 private shrink(p:Plant,all:boolean){const g=this.g,prop=g.props.plants.shrinkingviolet;for(const z of g.zombies)if(z.hp>0&&!this.shrunk.has(z.id)&&!g.props.zombies[z.kind].ImmuneToShrinkingViolet&&(all||Math.abs(z.row-p.row)<=1&&Math.abs(z.x-cellX(p.column))<1.5*BOARD.cellWidth+20)){this.shrunk.set(z.id,{at:g.time,duration:prop.ShrinkTime,damage:prop.DamageMultiplier,speed:prop.SpeedScale});z.stunnedUntil=g.time+prop.ShrinkTime;if(g.props.zombies[z.kind].KilledByShrinkingViolet){z.hp=0;z.deathCause='toss';}g.future.visual('violetShrink','Play',z.x,rowY(z.row));}for(const sound of ['explode','shrink','wisp'])g.beach.sounds.push('shrinkingviolet/'+sound);}
 plant(p:Plant,dt:number){
  const g=this.g,props=g.props.plants[p.kind];
  if(p.kind==='grimrose'){this.grimrose.plant(p,dt);return;}
  if(p.kind==='dusklobber'){this.dusk.plant(p);return;}
  if(p.kind==='nightshade'){
   const s=this.leaves.get(p.id)!;
   if(p.action!=='food'){
    if(s.left<props.MaxProjectiles){s.reload-=dt;if(s.reload<=0&&this.powered(p)){s.reload=props.LeafRespawnCooldown;s.left++;}}
    const range=(this.powered(p)?props.DetectDistanceShadow:props.DetectDistanceNormal)*BOARD.cellWidth;
    if(p.action==='idle'&&s.left>0&&g.time>=p.nextAction&&(g.zombies.some(z=>z.hp>0&&g.inLane(z,p.row)&&z.x>=cellX(p.column)-20&&z.x<=cellX(p.column)+range)||g.graves.some(t=>t.hp>0&&t.row===p.row&&t.column>=p.column&&cellX(t.column)<=cellX(p.column)+range))){this.play(p,'Attack','shoot');p.nextAction=g.time+props.ShootInterval;}
   }
  }else if(p.action==='idle'&&g.zombies.some(z=>z.hp>0&&z.row===p.row&&!this.shrunk.has(z.id)&&!g.props.zombies[z.kind].ImmuneToShrinkingViolet&&Math.abs(z.x-cellX(p.column))<BOARD.cellWidth*.7))this.play(p,'Attack','explode');
  if(p.action==='idle')return;
  const timeline=g.props.plantAnimations[p.kind][p.animation!],elapsed=g.time-p.actionAt;
  while(p.eventIndex!<timeline.events.length&&elapsed>=timeline.events[p.eventIndex!].at){const event=timeline.events[p.eventIndex!++].name;
   if(p.kind==='nightshade'){if(event==='shoot'||event==='foodShoot')this.shoot(p,event==='foodShoot');const sound={attack:'rotate',fire:'shoot',food:'food'}[event];if(sound)g.beach.sounds.push('nightshade/'+sound);}
   else {if(event==='shrink'||event==='shrink_food')this.shrink(p,event==='shrink_food');if(event==='grow'||event==='open')g.beach.sounds.push('shrinkingviolet/'+event);if(event==='kill'){p.hp=0;return;}}
  }
  if(elapsed>=timeline.duration){if(p.kind==='nightshade'&&p.action==='food'&&++this.leaves.get(p.id)!.cycles<props.PlantfoodTime)this.play(p,'Food','food');else this.play(p,'Idle','idle');}
 }
 spawn(z:Zombie){this.enemies.spawn(z);if((z.kind==='newspaper_veteran'||z.kind==='modern_newspaper'||z.kind==='beghouled_newspaper'))this.papers.set(z.id,{hp:this.g.props.zombies[z.kind].NewspaperHealth,angryAt:Infinity,elapsed:0,sounded:false});}
 paperDamage(z:Zombie,amount:number){const s=this.papers.get(z.id);if(!s||s.hp<=0)return amount;const hit=Math.min(s.hp,amount);s.hp-=hit;this.g.beach.sounds.push((z.kind==='newspaper_veteran'?'modernNewspaperVeteran':'modernNewspaper')+'/hitSounds');if(s.hp===0){s.angryAt=this.g.time;this.g.future.visual('paperDestroy','Play',z.x,rowY(z.row));this.g.beach.sounds.push((z.kind==='newspaper_veteran'?'modernNewspaperVeteran':'modernNewspaper')+'/destroySounds');}return amount-hit;}
 zombie(z:Zombie,dt:number){if(this.enemies.tick(z,dt))return true;const s=this.papers.get(z.id);if(!s||s.hp>0)return false;const t=this.g.props.plantAnimations[z.kind==='newspaper_veteran'?'modernNewspaperVeteran':'modernNewspaper'].GetAngry;if(s.elapsed>=t.events.find(e=>e.name==='switchingFalse')!.at)return false;s.elapsed+=dt;z.eating=false;if(!s.sounded&&s.elapsed>=t.events.find(e=>e.name==='speedup')!.at){s.sounded=true;this.g.beach.sounds.push((z.kind==='newspaper_veteran'?'modernNewspaperVeteran':'modernNewspaper')+'/speedupSounds',(z.kind==='newspaper_veteran'?'modernNewspaperVeteran':'modernNewspaper')+'/angrySounds');}return true;}
 animation(z:Zombie){const special=this.enemies.animation(z);if(special)return special;const s=this.papers.get(z.id);return s&&s.hp<=0?(s.elapsed<this.g.props.plantAnimations[z.kind==='newspaper_veteran'?'modernNewspaperVeteran':'modernNewspaper'].GetAngry.events.find(e=>e.name==='switchingFalse')!.at?'GetAngry':z.eating?'Eat_Angry':'Walk_Angry'):null;}
 speed(z:Zombie){return this.enemies.speed(z)*(this.shrunk.get(z.id)?.speed??1)*(this.papers.get(z.id)?.hp===0?this.g.props.zombies[z.kind].EnragedSpeedScale:1);}
 bite(z:Zombie){return this.papers.get(z.id)?.hp===0?this.g.props.zombies[z.kind].EnragedDamageScale:1;}
 damageScale(z:Zombie){return this.shrunk.get(z.id)?.damage??1;}
 scale(z:Zombie){const s=this.shrunk.get(z.id);return s?1-.5*Math.min(1,(this.g.time-s.at)/s.duration):1;}
 get pending(){return this.portals.some(p=>p.ended===null);}
 blocked(row:number,column:number){return this.portals.some(p=>p.row===row&&p.column===column&&p.ended===null);}
 portal(action:NonNullable<SpawnAction['portal']>){
  const g=this.g,props=portalProps[action.kind],pool=[...props.ZombieTypesToSpawn],queue:ZombieKind[]=[];
  while(pool.length){let roll=g.random()*pool.reduce((n,z)=>n+z.Weight,0),index=0;for(;index<pool.length-1;index++){roll-=pool[index].Weight;if(roll<0)break;}queue.push(pool.splice(index,1)[0].ZombieTypeName as ZombieKind);}
  if(action.count!==undefined)queue.length=action.count;
  this.portals.push({kind:action.kind,id:g.nextEntityId(),row:action.row,column:action.column,born:g.time,next:g.time+props.TimeBeforeFirst.Min+g.random()*(props.TimeBeforeFirst.Max-props.TimeBeforeFirst.Min),ended:null,queue});
  for(const p of g.plants.filter(p=>p.hp>0&&p.row===action.row&&p.column===action.column)){
   const candidates=Array.from({length:45},(_,i)=>({row:Math.floor(i/9),column:i%9})).filter(c=>!this.blocked(c.row,c.column)&&!g.plants.some(q=>q.hp>0&&q.row===c.row&&q.column===c.column)&&!g.graves.some(t=>t.hp>0&&t.row===c.row&&t.column===c.column)).sort((a,b)=>Math.max(Math.abs(a.row-p.row),Math.abs(a.column-p.column))-Math.max(Math.abs(b.row-p.row),Math.abs(b.column-p.column)));
   if(candidates.length){const c=candidates[0];p.leap={x:cellX(p.column),y:rowY(p.row),at:g.time,duration:.5,pushed:true};p.row=c.row;p.column=c.column;}else p.hp=0;
  }
  g.beach.sounds.push('portal/start');
 }
 tick(dt:number){
  const g=this.g;this.dusk.tick(dt);this.grimrose.tick();
  for(const p of g.plants)if(p.hp>0&&p.kind==='moonflower')for(let r=Math.max(0,p.row-1);r<=Math.min(4,p.row+1);r++)for(let c=Math.max(0,p.column-1);c<=Math.min(8,p.column+1);c++)this.shadows.set(`${r}:${c}`,g.time+20*dt);
  for(const p of this.portals)if(p.ended===null&&g.time>=p.next){const props=portalProps[p.kind];p.next=g.time+props.TimeBetween.Min+g.random()*(props.TimeBetween.Max-props.TimeBetween.Min);if(p.queue.length){const z=g.spawnZombie(p.queue.shift()!,p.row,cellX(p.column));z.landUntil=g.time+1;}else {p.ended=g.time;g.beach.sounds.push('portal/end');}}
  this.portals=this.portals.filter(p=>p.ended===null||g.time-p.ended<g.props.plantAnimations.portal.Die.duration);
  for(const shot of this.shots){const previous=shot.x;shot.x+=8*BOARD.cellWidth*dt;const z=g.zombies.filter(z=>z.hp>0&&g.inLane(z,shot.row)&&z.x+20>=previous&&z.x-20<=shot.x).sort((a,b)=>a.x-b.x)[0],t=g.graves.find(t=>t.hp>0&&t.row===shot.row&&cellX(t.column)+25>=previous&&cellX(t.column)-25<=shot.x);if(z&&(!t||z.x<cellX(t.column))){g.damage(z,shot.damage);shot.x=1400;}else if(t){t.hp-=shot.damage;shot.x=1400;}}
  this.shots=this.shots.filter(s=>s.x<1300);
 }
}
