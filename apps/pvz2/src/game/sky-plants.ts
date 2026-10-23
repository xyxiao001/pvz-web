import {BOARD,cellX,rowY} from './level';
import type {Game,Plant} from './model';
export class SkyPlants {
 clips=new Map<number,number>();
 shots:{id:number;x:number;row:number;fire:number}[]=[];
 rays:{id:number;x:number;toX:number;row:number;toRow:number;food:boolean;at:number}[]=[];
 private serial=0;
 constructor(private g:Game){}
 private floating(p:Plant){return this.g.level.world==='sky'&&p.column>=3;}
 private idle(p:Plant){return p.kind==='skyshooter'&&this.floating(p)?'Idle_Sky':'Idle';}
 private play(p:Plant,animation:string,action:Plant['action']='shoot'){p.animation=animation;p.action=action;p.actionAt=this.g.time;p.eventIndex=0;}
 init(p:Plant){this.play(p,this.idle(p),'idle');if(p.kind==='asparagus')this.clips.set(p.id,this.g.props.plants.asparagus.MaxClips);}
 food(p:Plant){this.play(p,p.kind==='skyshooter'&&this.floating(p)?'Food_Sky':'Food','food');p.burst=0;p.nextBurst=this.g.time;if(p.kind==='asparagus')this.clips.set(p.id,this.g.props.plants.asparagus.MaxClips);}
 private shoot(p:Plant){this.shots.push({id:++this.serial,row:p.row,x:cellX(p.column)+20,fire:0});}
 private ray(p:Plant,toRow:number,toX:number,food:boolean){this.rays.push({id:++this.serial,x:cellX(p.column)+35,toX,row:p.row,toRow,food,at:this.g.time});}
 plant(p:Plant){
  const g=this.g,props=g.props.plants[p.kind],x=cellX(p.column);
  if(p.kind==='skyshooter'&&p.action==='food'){
   while(p.burst<props.PlantfoodPeaCount&&g.time>=p.nextBurst){this.shoot(p);p.burst++;p.nextBurst+=2/props.PlantfoodPeaCount;}
   if(g.time-p.actionAt>=2){this.play(p,this.idle(p),'idle');p.nextAction=g.time+props.ShootInterval;}return;
  }
  if(p.action==='idle'&&g.time>=p.nextAction){
   const targets=g.zombies.filter(z=>z.hp>0&&!z.leap&&(g.inLane(z,p.row)||p.kind==='asparagus'&&Math.abs(z.row-p.row)<=1)&&z.x>=x-15&&z.x<1150).sort((a,b)=>a.x-b.x);
   if(p.kind==='asparagus'&&(this.clips.get(p.id)===0||!targets.length&&this.clips.get(p.id)!<=props.IdleReloadClips)){this.clips.set(p.id,props.MaxClips);this.play(p,'Reload','grow');}
   else if(targets.length){
    this.play(p,p.kind==='skyshooter'?(this.floating(p)?'Shoot_Sky':'Shoot'):'Shoot'+(targets[0].row<p.row?'U':targets[0].row>p.row?'D':'M'));
    p.nextAction=g.time+props.ShootInterval+g.random()*props.ShootIntervalAdditional;
    if(p.kind==='asparagus')this.clips.set(p.id,this.clips.get(p.id)!-1);
   }
  }
  if(p.action==='idle')return;
  const timeline=g.props.plantAnimations[p.kind][p.animation!],elapsed=g.time-p.actionAt;
  while(p.eventIndex!<timeline.events.length&&elapsed>=timeline.events[p.eventIndex!].at){const event=timeline.events[p.eventIndex!++].name;
   if(p.kind==='skyshooter'){if(event==='Shoot')this.shoot(p);if(event==='ShootSound')g.beach.sounds.push('skyshooter/shootSound');continue;}
   if(['reload','rotate','food_shoot'].includes(event))g.beach.sounds.push('asparagus/'+(event==='food_shoot'?'food':event));
   if(event.startsWith('shoot')){
    const row=p.row+(event==='shootU'?-1:event==='shootD'?1:0),z=g.zombies.filter(z=>z.hp>0&&!z.leap&&z.row===row&&z.x>=x-15).sort((a,b)=>a.x-b.x)[0],grave=g.graves.filter(t=>t.hp>0&&t.row===row&&t.column>=p.column).sort((a,b)=>a.column-b.column)[0];
    if(grave&&(!z||cellX(grave.column)<z.x)){grave.hp-=props.Damage;this.ray(p,row,cellX(grave.column),false);}else {if(z)g.damage(z,props.Damage);this.ray(p,row,z?.x??cellX(10),false);}g.beach.sounds.push('asparagus/shoot');
   }
   const food=/^food([UDM])(\d)$/.exec(event);
   if(food){const row=p.row+(food[1]==='U'?-1:food[1]==='D'?1:0),n=Number(food[2]),columns=n===1?[p.column,p.column+1]:[p.column+n];
    for(const column of columns){for(const z of g.zombies)if(z.hp>0&&z.row===row&&Math.abs(z.x-cellX(column))<BOARD.cellWidth/2+18)g.damage(z,props.DamagePlantfood);for(const grave of g.graves)if(grave.row===row&&grave.column===column)grave.hp-=props.DamagePlantfood;if(row>=0&&row<5)this.ray(p,row,cellX(column),true);}
   }
  }
  if(elapsed>=timeline.duration)this.play(p,this.idle(p),'idle');
 }
 tick(dt:number){
  const g=this.g;
  this.rays=this.rays.filter(r=>g.time-r.at<.2);
  for(const s of this.shots){const old=s.x;s.x+=360*dt;
   for(const p of g.plants)if(p.kind==='torchwood'&&p.hp>0&&p.row===s.row&&cellX(p.column)>=old&&cellX(p.column)<s.x)s.fire=g.dino.plants.blue.has(p.id)?3:2;
   const z=g.zombies.filter(z=>z.hp>0&&!g.beach.diving(z)&&g.inLane(z,s.row)&&z.x-18>=old-12&&z.x-18<=s.x+12).sort((a,b)=>a.x-b.x)[0];
   const grave=g.graves.filter(t=>t.hp>0&&t.row===s.row&&cellX(t.column)-25>=old-12&&cellX(t.column)-25<=s.x+12).sort((a,b)=>a.column-b.column)[0];
   const damage=g.props.projectiles.pea_sky.Damage*(s.fire||1);
   if(grave&&(!z||cellX(grave.column)<z.x)){grave.hp-=damage;s.x=1300;}
   else if(z){g.damage(z,damage);if(s.fire){z.frozenUntil=0;z.chilledUntil=0;}if(!g.props.zombies[z.kind].CannotBeKnockedBackByProjectiles&&!z.leap)z.x+=.05*BOARD.cellWidth;g.effects.push({id:g.nextEntityId(),kind:'hit',x:s.x,y:rowY(s.row)-40,age:0});s.x=1300;}
  }
  this.shots=this.shots.filter(s=>s.x<1200);
  for(const id of this.clips.keys())if(!g.plants.some(p=>p.id===id))this.clips.delete(id);
 }
}
