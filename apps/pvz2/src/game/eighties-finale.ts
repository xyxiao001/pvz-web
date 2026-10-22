import {BOARD,cellX,rowY,type PlantKind} from './level';
import type {Game,Plant,Zombie} from './model';
import {isFlying} from './pirate';

type Shot={id:number;kind:'gum'|'straw'|'holly'|'clear';stage:number;food:boolean;row:number;column:number;target:number;at:number;duration:number;fromX:number;fromY:number;x:number;y:number;toX:number;toY:number};
/** The two final Eighties conveyors: resurrection, manual artillery and gum. */
export class EightiesFinale {
 readonly states=new Map<number,{stage:number;grow:number;ammo:number;target:{row:number;column:number}|null;foodCells:Set<string>}>();
 readonly gums=new Map<number,{z:Zombie;x:number;row:number;hp:number;max:number;at:number}>();
 readonly shots:Shot[]=[];
 readonly berries:{at:number;fired:boolean;charged:boolean}[]=[];
 readonly tornadoes:{row:number;column:number;until:number}[]=[];
 selected:number|null=null;
 private cleared=false;
 constructor(private g:Game){}
 handles(kind:PlantKind){return ['gumnut','strawburst','hollyknight','loquat','hollybarrierleaf','hollybarrierleafplantfood'].includes(kind);}
 private play(p:Plant,animation:string,action:Plant['action']='idle'){p.animation=animation;p.action=action;p.actionAt=this.g.time;p.eventIndex=0;}
 private idle(p:Plant){const s=this.states.get(p.id)!;this.play(p,p.kind==='strawburst'?(s.stage<0?'Idle_Resting':`Idle${s.stage}0`):'Idle');}
 add(p:Plant){this.states.set(p.id,{stage:0,grow:this.g.props.plants.strawburst.GrowTime1,ammo:this.g.props.plants.hollyknight.MaxProjectileCount,target:null,foodCells:new Set()});this.play(p,p.kind==='strawburst'?'Idle00':p.kind==='loquat'?'Attack':'Idle',p.kind==='loquat'?'explode':'idle');p.nextAction=this.g.time;}
 repair(p:Plant){p.hp=this.g.props.plants.hollyknight.Toughness;this.states.get(p.id)!.ammo=this.g.props.plants.hollyknight.MaxProjectileCount;}
 needsReload(p:Plant){return this.states.get(p.id)!.ammo<this.g.props.plants.hollyknight.MaxProjectileCount||p.hp<=this.g.props.plants.hollyknight.Toughness*.75;}
 cancel(){const p=this.g.plants.find(p=>p.id===this.selected);if(p)this.idle(p);this.selected=null;}
 click(row:number,column:number){
  const p=this.g.plants.find(p=>p.hp>0&&p.row===row&&p.column===column&&['strawburst','hollyknight'].includes(p.kind));
  if(!p||p.sheep!==undefined||p.action==='food'||p.action==='shoot'||p.action==='explode'||this.g.eighties.carrot.blocked(p)||this.g.eighties.boombox.blocked(p)||this.g.eighties.skunk.blocked(p))return false;
  const s=this.states.get(p.id)!;
  if(p.kind==='strawburst'){if(s.stage<0)return false;this.play(p,`Shoot${s.stage}`,'shoot');return true;}
  if(s.ammo===0)return false;this.selected=p.id;this.play(p,'Ready');this.g.beach.sounds.push('hollyknight/readySounds');return true;
 }
 fire(row:number,column:number){
  const p=this.g.plants.find(p=>p.id===this.selected&&p.hp>0);
  if(!p||row<0||row>=5||column<0||column>=9)return false;
  this.states.get(p.id)!.target={row,column};this.selected=null;this.play(p,'Shoot','shoot');return true;
 }
 food(p:Plant){if(this.selected===p.id)this.cancel();const s=this.states.get(p.id)!;if(p.kind==='strawburst')s.stage=2;if(p.kind==='hollyknight'){s.ammo=this.g.props.plants.hollyknight.MaxProjectileCount;s.foodCells.clear();this.g.beach.sounds.push('hollyknight/foodSounds');}this.play(p,'Food','food');}
 private canGum(z:Zombie){return z.hp>0&&z!==this.g.boss?.zombie&&!isFlying(z)&&!this.g.props.zombies[z.kind].CannotBeGummedByGumnut;}
 gum(z:Zombie){if(!this.canGum(z))return;const p=this.g.props.plants.gumnut,max=p.BaseGumHealth+p.ZombieGumHealthMult*this.g.props.zombies[z.kind].Toughness;this.gums.set(z.id,{z,x:z.x,row:z.row,hp:max,max,at:this.g.time});}
 chew(z:Zombie,dt:number){
  const gum=[...this.gums.values()].find(s=>s.row===z.row&&z.x>=s.x-22&&z.x<=s.x+38);
  if(!gum)return false;z.eating=true;gum.hp-=this.g.props.zombies[z.kind].EatDPS*dt*(this.g.time<z.chilledUntil?.5:1);
  if(gum.hp<=0){this.gums.delete(gum.z.id);this.g.future.visual('gum','Die',gum.x,rowY(gum.row));}return true;
 }
 eaten(p:Plant){if(p.kind!=='strawburst'||p.action==='shoot'||p.action==='food'||p.action==='grow'||p.action==='explode')return false;const s=this.states.get(p.id)!;if(s.stage<0)return false;this.play(p,`Death${s.stage}`,'explode');return true;}
 private launch(kind:Shot['kind'],p:Plant,row:number,column:number,target=-1,stage=0,food=false){
  const g=this.g,toX=target<0?cellX(column):g.zombies.find(z=>z.id===target)!.x,toY=rowY(row),above=kind==='holly'||kind==='clear';
  this.shots.push({id:g.nextEntityId(),kind,stage,food,row,column,target,at:g.time,duration:kind==='gum'?.2222:kind==='clear'?.3333:.4444,fromX:above?toX:cellX(p.column),fromY:above?toY-1000:rowY(p.row)-30,x:above?toX:cellX(p.column),y:above?toY-1000:rowY(p.row)-30,toX,toY});
 }
 private area(row:number,x:number,range:number,damage:number,knockback=0){
  const g=this.g;
  for(const z of g.zombies)if(z.hp>0&&(z===g.boss?.zombie||Math.abs(z.row-row)<range/2)&&Math.abs(z.x-x)<range/2*BOARD.cellWidth+22){g.damage(z,damage);if(knockback&&z.hp>0&&z!==g.boss?.zombie&&!g.props.zombies[z.kind].CannotBeKnockedBackByProjectiles)z.leap={fromX:z.x,fromY:rowY(z.row),toX:z.x+knockback*BOARD.cellWidth,toRow:z.row,at:g.time,duration:.5};}
  for(const t of g.graves)if(t.hp>0&&Math.abs(t.row-row)<range/2&&Math.abs(cellX(t.column)-x)<range/2*BOARD.cellWidth)t.hp-=damage;
 }
 private holly(p:Plant,food:boolean){
  const s=this.states.get(p.id)!,g=this.g;let cell=s.target!;
  if(food){const enemies=g.zombies.filter(z=>z.hp>0&&z!==g.boss?.zombie&&z.x>=BOARD.left&&z.x<cellX(9)).map(z=>({row:z.row,column:Math.floor((z.x-BOARD.left)/BOARD.cellWidth)})),all=Array.from({length:45},(_,i)=>({row:i%5,column:Math.floor(i/5)}));let pool=enemies.filter(c=>!s.foodCells.has(`${c.row}:${c.column}`));if(!pool.length)pool=all.filter(c=>!s.foodCells.has(`${c.row}:${c.column}`));cell=pool[Math.floor(g.random()*pool.length)];s.foodCells.add(`${cell.row}:${cell.column}`);}else s.ammo--;
  this.launch('holly',p,cell.row,cell.column,-1,0,food);g.beach.sounds.push('hollyknight/shootSounds');
 }
 plant(p:Plant,dt:number){
  const g=this.g,s=this.states.get(p.id)!,prop=g.props.plants[p.kind];
  if(p.kind==='strawburst'&&p.action!=='food'&&p.action!=='shoot'&&p.action!=='explode'&&s.stage<2){s.grow-=dt;if(s.grow<=0){s.stage++;s.grow=s.stage===0?prop.GrowTime1:s.stage===1?prop.GrowTime2:Infinity;this.play(p,`Grow${s.stage}`,'grow');}}
  if(p.kind==='gumnut'&&p.action==='idle'&&g.zombies.some(z=>this.canGum(z)&&z.row===p.row&&Math.abs(z.x-cellX(p.column))<60))this.play(p,'Death','explode');
  if(p.kind.startsWith('holly')&&p.action!=='food'&&g.time>=p.nextAction&&(p.kind==='hollyknight'||p.animation!=='Spawn')){
   if(g.zombies.some(z=>z.hp>0&&z.row===p.row&&Math.abs(z.x-cellX(p.column))<BOARD.cellWidth+22)){
    p.nextAction=g.time+(p.kind==='hollyknight'?prop.AttackInterval:prop.StabInterval);
    for(const z of g.zombies)if(z.hp>0&&z.row===p.row&&Math.abs(z.x-cellX(p.column))<BOARD.cellWidth+22)g.damage(z,p.kind==='hollyknight'?prop.AttackDamage:prop.StabDamage);
    g.future.visual('hollyStab','Play',cellX(p.column),rowY(p.row));g.beach.sounds.push(p.kind==='hollyknight'?'hollyknight/stabSounds':p.kind+'/stabSounds');
    if(p.kind!=='hollyknight')this.play(p,'Attack','shoot');
   }
  }
  if(p.action==='idle')return;
  const timeline=g.props.plantAnimations[p.kind][p.animation!],elapsed=g.time-p.actionAt;
  while(p.eventIndex!<timeline.events.length&&elapsed>=timeline.events[p.eventIndex!].at){
   const event=timeline.events[p.eventIndex!++].name;
   if(p.kind==='gumnut'){
    if(event==='charge'||event==='water')g.beach.sounds.push('gumnut/'+event);
    if(event==='expl'||event==='expl_food'){
     const food=event==='expl_food';for(const z of g.zombies)if(this.canGum(z)&&Math.abs(z.row-p.row)<(food?1.5:.5)&&Math.abs(z.x-cellX(p.column))<(food?1.5:1)*BOARD.cellWidth+22)this.gum(z);
     g.beach.sounds.push(food?'gumnut/explodeFood':'gumnut/explode');
     if(food){const pool=g.zombies.filter(z=>this.canGum(z));for(let i=0;i<prop.PlantfoodGumProjectileCount&&pool.length;i++){const z=pool.splice(Math.floor(g.random()*pool.length),1)[0];this.launch('gum',p,z.row,0,z.id);}}else p.hp=0;
    }
   }
   if(p.kind==='strawburst'){
    if(/^throw[012]$/.test(event)){
     const z=g.zombies.filter(z=>z.hp>0&&g.inLane(z,p.row)&&z.x>=cellX(p.column)).sort((a,b)=>a.x-b.x)[0],t=g.graves.filter(t=>t.hp>0&&t.row===p.row&&t.column>=p.column).sort((a,b)=>b.column-a.column)[0];this.launch('straw',p,p.row,t?.column??10,z?.id??-1,Number(event.at(-1)));g.beach.sounds.push('strawburst/fire');
    }
    if(event==='foodSay')g.beach.sounds.push('strawburst/foodLaugh');
    if(event.startsWith('growSay'))g.beach.sounds.push('strawburst/grow','strawburst/'+event);
    if(event.startsWith('throwSay'))g.beach.sounds.push('strawburst/fireSay'+event.at(-1));
    if(event==='restStart'){s.stage=-1;s.grow=prop.GrowTime0;}
    if(event==='foodSummon'){this.berries.push({at:g.time,fired:false,charged:false});g.future.visual('strawFood','Play',cellX(4),rowY(2));g.beach.sounds.push('strawburst/foodSummon');}
    if(event.startsWith('explode')){this.area(p.row,cellX(p.column),s.stage===0?1:3,[prop.Damage0,prop.Damage1,prop.Damage2][s.stage]);g.future.visual('strawExpl'+s.stage,'Play',cellX(p.column),rowY(p.row));g.beach.sounds.push('strawburst/hit'+s.stage);p.hp=0;}
   }
   if(p.kind==='hollyknight'&&(event==='shoot'||event==='shoot_pf'))this.holly(p,event==='shoot_pf');
   if(p.kind==='loquat'&&event==='ro'){this.tornadoes.push({row:p.row,column:p.column,until:g.time+prop.TornadoDuration});g.beach.sounds.push('loquat/rotateSounds');}
   if(event==='die')p.hp=0;
   if(event==='foodEnd'){this.idle(p);return;}
  }
  if(elapsed>=timeline.duration&&p.hp>0)this.idle(p);
 }
 tick(dt:number){
  const g=this.g;
  if(g.level.world==='eighties'&&g.level.day===41&&!this.cleared){this.cleared=true;const p=g.plants[0];for(let i=0;i<3;i++)this.launch('clear',p,Math.floor(g.random()*5),Math.floor(g.random()*9));}
  for(const [id,s] of this.gums){if(s.z.hp<=0){this.gums.delete(id);g.future.visual('gum','Die',s.x,rowY(s.row));}else if(!s.z.leap){s.z.x=s.x;s.z.row=s.row;}}
  for(const shot of this.shots){
   const t=Math.min(1,(g.time-shot.at)/shot.duration);shot.x=shot.fromX+(shot.toX-shot.fromX)*t;shot.y=shot.fromY+(shot.toY-shot.fromY)*t-(shot.kind==='gum'||shot.kind==='straw'?Math.sin(t*Math.PI)*160:0);if(t<1)continue;
   if(shot.kind==='clear'){for(const p of g.plants){p.hp-=12000;p.armor=0;}g.effects.push({id:g.nextEntityId(),kind:'explode',x:shot.x,y:shot.y,age:0});}
   if(shot.kind==='gum'){const z=g.zombies.find(z=>z.id===shot.target);if(z)this.gum(z);}
   if(shot.kind==='straw'){
    const prop=g.props.projectiles['strawburst'+shot.stage],z=g.zombies.find(z=>z.id===shot.target&&z.hp>0),tomb=g.graves.find(t=>t.hp>0&&t.row===shot.row&&t.column===shot.column);
    if(z)g.damage(z,prop.Damage);else if(tomb)tomb.hp-=prop.Damage;
    // Native splash excludes the direct-hit target.
    if(shot.stage>0){for(const other of g.zombies)if(other!==z&&other.hp>0&&Math.abs(other.row-shot.row)<=1&&Math.abs(other.x-shot.x)<1.5*BOARD.cellWidth+22)g.damage(other,prop.SplashDamage[0].Damage!);for(const other of g.graves)if(other!==tomb&&other.hp>0&&Math.abs(other.row-shot.row)<=1&&Math.abs(cellX(other.column)-shot.x)<1.5*BOARD.cellWidth)other.hp-=prop.SplashDamage[0].Damage!;}
    g.future.visual('strawExpl'+shot.stage,'Play',shot.x,shot.y);g.beach.sounds.push('strawburst/hit'+shot.stage);
   }
   if(shot.kind==='holly'){
    const prop=g.props.projectiles[shot.food?'hollyleaf_pf':'hollyleaf'];this.area(shot.row,shot.x,3,prop.Damage,prop.KnockbackDistance);
    const occupants=g.plants.filter(p=>p.hp>0&&p.row===shot.row&&p.column===shot.column),replace=occupants.filter(p=>p.kind==='hollybarrierleaf'||shot.food&&p.kind==='hollybarrierleafplantfood');
    if(occupants.length===replace.length&&!g.graves.some(t=>t.hp>0&&t.row===shot.row&&t.column===shot.column)&&(!g.level.boss||shot.column<9-g.level.boss.reserved)){
     for(const p of replace){p.hp=0;p.transformed=true;}g.addPlant(shot.food?'hollybarrierleafplantfood':'hollybarrierleaf',shot.row,shot.column);this.play(g.plants.at(-1)!,'Spawn','grow');
    }
   }
  }
  this.shots.splice(0,this.shots.length,...this.shots.filter(s=>g.time-s.at<s.duration));
  for(const b of this.berries){const age=g.time-b.at;if(!b.charged&&age>=g.props.plantAnimations.strawFood.Play.events.find(e=>e.name==='charge')!.at){b.charged=true;g.beach.sounds.push('strawFood/chargeSound','strawFood/chargeSaySound');}if(!b.fired&&age>=g.props.plantAnimations.strawFood.Play.events.find(e=>e.name==='explode')!.at){b.fired=true;for(const z of g.zombies)g.damage(z,g.props.plants.strawburst.DamagePlantfood);for(const t of g.graves)t.hp-=g.props.plants.strawburst.DamagePlantfood;g.beach.sounds.push('strawFood/explodeSounds');}}
  this.berries.splice(0,this.berries.length,...this.berries.filter(b=>!b.fired));
  for(const t of this.tornadoes)for(const z of g.zombies)if(z.hp>0&&z!==g.boss?.zombie&&!g.props.zombies[z.kind].CannotBeKnockedBackByProjectiles&&Math.abs(z.row-t.row)<=1&&Math.abs(z.x-cellX(t.column))<1.5*BOARD.cellWidth+22){z.x+=(cellX(t.column)-z.x)*g.props.plants.loquat.ZombieDraggingFactor*dt;z.loquatY=(z.loquatY??rowY(z.row))+(rowY(t.row)-(z.loquatY??rowY(z.row)))*g.props.plants.loquat.ZombieDraggingFactor*dt;z.row=Math.round((z.loquatY-rowY(0))/BOARD.cellHeight);z.stunnedUntil=g.time+.5;}
  this.tornadoes.splice(0,this.tornadoes.length,...this.tornadoes.filter(t=>g.time<t.until));
  if(!this.tornadoes.length)for(const z of g.zombies)delete z.loquatY;
  if(this.selected!==null&&!g.plants.some(p=>p.id===this.selected&&p.hp>0))this.selected=null;
  for(const id of this.states.keys())if(!g.plants.some(p=>p.id===id))this.states.delete(id);
 }
}
