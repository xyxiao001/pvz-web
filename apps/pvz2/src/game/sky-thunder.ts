import {BOARD,cellX,rowY,type ThunderWave,type Level} from './level';
import type {Game,Plant} from './model';
export interface SkyCharge {row:number;column:number;value:number;at:number;elapsed:number;event:number;animation:string}
export class SkyThunder {
 charges:SkyCharge[]=[];
 pending:{at:number;sign:number;count:number}[]=[];
 effects:{id:number;rig:string;animation:string;x:number;y:number;toX?:number;toY?:number;at:number}[]=[];
 bolts:{id:number;x:number;row:number;big:boolean}[]=[];
 moonDeaths:{plant:Plant;at:number;fired:boolean}[]=[];
 private foodExtra=new Map<number,number>();
 constructor(private g:Game){}
 private range(r:{Min:number;Max:number}){return r.Min+this.g.random()*(r.Max-r.Min);}
 private sample<T>(list:T[]){return list[Math.floor(this.g.random()*list.length)];}
 private effect(rig:string,x:number,y:number,toX?:number,toY?:number,animation=rig==='anthuriumLink'?'i':'Play'){this.effects.push({id:this.g.nextEntityId(),rig,animation,x,y,toX,toY,at:this.g.time});}
 queue(p:ThunderWave){let at=this.g.time+this.range(p.TimeBeforeFirst);for(const thunder of p.Thunders){this.pending.push({at,sign:thunder.Sign,count:thunder.LinkedPlantCount});at+=this.range(p.TimeBetween);}}
 at(row:number,column:number){return this.charges.find(c=>c.row===row&&c.column===column);}
 full(c:SkyCharge){return c.value===0||Math.abs(c.value)===2;}
 add(row:number,column:number,sign:number){
  const old=this.at(row,column);if(old&&this.full(old))return;
  const value=old?Math.max(-2,Math.min(2,old.value+sign)):sign;
  const c:SkyCharge=old??{row,column,value,at:0,elapsed:0,event:0,animation:''};
  c.value=value;c.at=this.g.time;c.elapsed=0;c.event=0;c.animation=Math.abs(value)===1?`Idle_${value>0?'Positive':'Negative'}_1`:`Combine_${value>0?'Positive':value<0?'Negative':'Mixed'}_2`;
  if(!old)this.charges.push(c);
 }
 remove(c:SkyCharge){this.charges=this.charges.filter(q=>q!==c);this.effect('skyCharge',cellX(c.column),rowY(c.row),undefined,undefined,`Die_${c.value>0?'Positive':c.value<0?'Negative':'Mixed'}_${Math.abs(c.value)===1?1:2}`);this.g.beach.sounds.push('skyCharge/deathSounds');}
 strike(sign:number,count:number){
  const g=this.g,chain:{row:number;column:number}[]=[],live=g.plants.filter(p=>p.hp>0);
  let p=this.sample(live);const suffix=sign>0?'Positive':'Negative';
  if(p)this.effect('skyThunder'+suffix,cellX(p.column),rowY(p.row),undefined,undefined,'Play0');
  while(p&&chain.length<count){
   chain.push({row:p.row,column:p.column});this.add(p.row,p.column,sign);
   p=this.sample(live.filter(q=>Math.abs(q.row-p.row)<=1&&Math.abs(q.column-p.column)<=1&&!chain.some(c=>c.row===q.row&&c.column===q.column)&&!(this.at(q.row,q.column)&&this.full(this.at(q.row,q.column)!))&&q.action!=='food'));
  }
  for(let i=1;i<chain.length;i++){const a=chain[i-1],b=chain[i];this.effect('skyThunderLink'+suffix,cellX(a.column),rowY(a.row),cellX(b.column),rowY(b.row),'Play0');this.effect('skyThunderHit'+suffix,cellX(b.column),rowY(b.row));}
 }
 slow(p:Plant,dt:number){const c=this.at(p.row,p.column);if(!c||p.action==='food')return false;const lost=c.value===-2?dt:c.value===0?dt*.5:0;p.actionAt+=lost;p.nextAction+=lost;p.nextBurst+=lost;return c.value===-2;}
 private play(p:Plant,animation:string,action:Plant['action']){p.animation=animation;p.action=action;p.actionAt=this.g.time;p.eventIndex=0;}
 food(p:Plant){this.foodExtra.set(p.id,0);this.play(p,'Food','food');}
 moonBomb(x:number,y:number,food:boolean){
  const g=this.g,p=g.props.plants.moonbean,suffix=food?'Plantfood':'';
  const props:NonNullable<Level['sunBomb']>={PlantBombExplosionRadius:p[`PlantBombExplosionRadius${suffix}`],ZombieBombExplosionRadius:p[`ZombieBombExplosionRadius${suffix}`],PlantDamage:p[`PlantDamage${suffix}`],ZombieDamage:p[`ZombieDamage${suffix}`]};
  g.dropSun(x,y-70,50,'plant');const sun=g.suns.at(-1)!;sun.bomb=true;sun.bombProps=props;sun.vx=0;sun.vy=15;sun.targetY=y;sun.floatingBomb=true;
  if(food)this.effect('moonRay',x,y);
 }
 moonDied(p:Plant){this.moonDeaths.push({plant:{...p},at:this.g.time,fired:false});}
 plant(p:Plant){
  const g=this.g,props=g.props.plants[p.kind];
  if(p.kind==='anthurium'&&p.action==='idle'){
   const charge=this.sample(this.charges.filter(c=>Math.abs(c.row-p.row)<=1&&Math.abs(c.column-p.column)<=1));
   if(charge||g.time>=p.nextAction&&(g.zombies.some(z=>z.hp>0&&z.row===p.row&&z.x>=cellX(p.column)-15)||g.graves.some(t=>t.hp>0&&t.row===p.row&&t.column>=p.column))){
    if(charge){this.effect('anthuriumLink',cellX(charge.column),rowY(charge.row)-30,cellX(p.column),rowY(p.row)-40);this.remove(charge);}
    this.play(p,charge?'Shoot2':'Shoot','shoot');p.nextAction=g.time+props.ShootInterval+g.random()*props.ShootIntervalAdditional;
   }
  }
  if(p.action==='idle')return;
  const timeline=g.props.plantAnimations[p.kind][p.animation!],elapsed=g.time-p.actionAt;
  while(p.eventIndex!<timeline.events.length&&elapsed>=timeline.events[p.eventIndex!].at){const event=timeline.events[p.eventIndex!++].name;
   if(event==='charge')g.beach.sounds.push('anthurium/charge');
   if(event==='shoot'||event==='shoot2')this.bolts.push({id:g.nextEntityId(),x:cellX(p.column)+25,row:p.row,big:event==='shoot2'});
   if(event==='food_charge'){g.beach.sounds.push('anthurium/food');this.foodExtra.set(p.id,this.charges.length);for(const c of [...this.charges]){this.effect('anthuriumLink',cellX(c.column),rowY(c.row),cellX(p.column),rowY(p.row));this.remove(c);}}
   if(event==='food_lightning'){
    const targets=[...g.zombies.filter(z=>z.hp>0).map(z=>({x:z.x,row:z.row,z})),...g.graves.filter(t=>t.hp>0).map(t=>({x:cellX(t.column),row:t.row,t}))];
    for(let n=0;n<props.PlantfoodLightningCount+this.foodExtra.get(p.id)!;n++){
     const target=targets.length?targets.splice(Math.floor(g.random()*targets.length),1)[0]:{x:cellX(Math.floor(g.random()*9)),row:Math.floor(g.random()*5)};
     if('z' in target)g.damage(target.z,props.PlantfoodDamage,'electric');if('t' in target)target.t.hp-=props.PlantfoodDamage;
     for(const z of g.zombies)if(z.hp>0&&Math.abs(z.row-target.row)<=1&&Math.abs(z.x-target.x)<BOARD.cellWidth*1.5)g.damage(z,props.PlantfoodSplashDamage,'electric');
     for(const t of g.graves)if(t.hp>0&&Math.abs(t.row-target.row)<=1&&Math.abs(cellX(t.column)-target.x)<BOARD.cellWidth*1.5)t.hp-=props.PlantfoodSplashDamage;
     this.effect('anthuriumLightning',target.x,rowY(target.row));
    }
   }
   if(event==='foodSun'){
    const targets=[...g.zombies.filter(z=>z.hp>0).map(z=>({x:z.x,y:rowY(z.row)})),...g.graves.filter(t=>t.hp>0).map(t=>({x:cellX(t.column),y:rowY(t.row)}))];
    for(let n=0;n<props.PlantfoodSunbombCount;n++){const target=targets.length?targets.splice(Math.floor(g.random()*targets.length),1)[0]:{x:cellX(Math.floor(g.random()*9)),y:rowY(Math.floor(g.random()*5))};this.moonBomb(target.x,target.y,true);}g.beach.sounds.push('moonbean/foodShoot');
   }
  }
  if(elapsed>=timeline.duration)this.play(p,'Idle','idle');
 }
 tick(dt:number){
  const g=this.g;
  for(const p of this.pending.filter(p=>p.at<=g.time))this.strike(p.sign,p.count);this.pending=this.pending.filter(p=>p.at>g.time);
  for(const c of [...this.charges]){
   const plants=g.plants.filter(p=>p.hp>0&&p.row===c.row&&p.column===c.column);
   if(g.time-c.at>=60||!plants.length||plants.some(p=>g.props.plants[p.kind].ImmuneToLightningCharge||p.action==='food')){this.remove(c);continue;}
   c.elapsed+=dt;const timeline=g.props.plantAnimations.skyCharge[c.animation];
   while(c.event<timeline.events.length&&c.elapsed>=timeline.events[c.event].at){c.event++;for(const p of plants)p.hp-=10;}
   if(c.elapsed>=timeline.duration){c.elapsed-=timeline.duration;c.event=0;if(c.animation.startsWith('Combine'))c.animation=c.animation.replace('Combine','Idle');}
  }
  for(const b of this.bolts){const old=b.x;b.x+=5*BOARD.cellWidth*dt;const z=g.zombies.filter(z=>z.hp>0&&g.inLane(z,b.row)&&z.x>=old-20&&z.x<=b.x+20).sort((a,b)=>a.x-b.x)[0],grave=g.graves.find(t=>t.hp>0&&t.row===b.row&&cellX(t.column)>=old-25&&cellX(t.column)<=b.x+25),damage=g.props.projectiles[b.big?'anthurium_bolt_big':'anthurium_bolt'].Damage;if(grave&&(!z||cellX(grave.column)<z.x)){grave.hp-=damage;b.x=1300;}else if(z){g.damage(z,damage,'electric');b.x=1300;}}
  this.bolts=this.bolts.filter(b=>b.x<1200);
  for(const d of this.moonDeaths)if(!d.fired&&g.time-d.at>=g.props.plantAnimations.moonbean.Death.events.find(e=>e.name==='explode')!.at){d.fired=true;this.moonBomb(cellX(d.plant.column),rowY(d.plant.row),false);g.beach.sounds.push('moonbean/shoot');}
  this.moonDeaths=this.moonDeaths.filter(d=>g.time-d.at<g.props.plantAnimations.moonbean.Death.duration);
  this.effects=this.effects.filter(e=>g.time-e.at<g.props.plantAnimations[e.rig][e.animation].duration);
 }
}
