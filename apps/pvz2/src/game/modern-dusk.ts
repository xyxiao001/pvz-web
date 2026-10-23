import {BOARD,cellX,rowY} from './level';
import type {Game,Plant} from './model';
interface Lob {id:number;row:number;target:number|null;grave:boolean;food:boolean;fromX:number;fromY:number;toX:number;toY:number;x:number;y:number;age:number;duration:number}
interface Splat {id:number;row:number;x:number;food:boolean;animation:string;age:number;event:number}
export class ModernDusk {
 shots:Lob[]=[];splats:Splat[]=[];
 constructor(private g:Game){}
 private targets(p:Plant,row:number){
  const g=this.g,inside=(x:number)=>x>=cellX(p.column)-BOARD.cellWidth/2&&x<cellX(9);
  const zombies=g.zombies.filter(z=>z.hp>0&&z.row===row&&inside(z.x)).sort((a,b)=>a.x-b.x);
  const graves=g.graves.filter(t=>t.hp>0&&t.row===row&&inside(cellX(t.column))).sort((a,b)=>a.column-b.column);
  return zombies.length?{id:zombies[0].id,x:zombies[0].x,grave:false}:graves.length?{id:graves[0].id,x:cellX(graves[0].column),grave:true}:null;
 }
 private rows(p:Plant){return this.g.modern.powered(p)?[p.row-1,p.row,p.row+1].filter(r=>r>=0&&r<5):[p.row];}
 private launch(p:Plant,row:number,x:number,target:number|null,grave:boolean,food:boolean){
  const fromX=cellX(p.column),fromY=rowY(p.row)-80;
  this.shots.push({id:this.g.nextEntityId(),row,target,grave,food,fromX,fromY,toX:x,toY:rowY(row)-30,x:fromX,y:fromY,age:0,duration:food?2:.6666});
 }
 private food(p:Plant){
  const g=this.g,cells=Array.from({length:45},(_,i)=>({row:Math.floor(i/9),column:i%9})),chosen:typeof cells=[];
  const pick=<T>(items:T[])=>items[Math.floor(g.random()*items.length)];
  const pool=[...g.zombies.filter(z=>z.hp>0&&z.x>=BOARD.left&&z.x<BOARD.left+9*BOARD.cellWidth)];
  while(chosen.length<g.props.plants.dusklobber.PlantfoodProjectilesToFire){
   if(pool.length){const z=pool.splice(Math.floor(g.random()*pool.length),1)[0],cell={row:z.row,column:Math.floor((z.x-BOARD.left)/BOARD.cellWidth)};if(!chosen.some(c=>c.row===cell.row&&c.column===cell.column))chosen.push(cell);continue;}
   const empty=cells.filter(c=>!chosen.some(q=>q.row===c.row&&q.column===c.column));
   const nearby=empty.filter(c=>chosen.some(q=>Math.abs(q.row-c.row)<=1&&Math.abs(q.column-c.column)<=1));
   chosen.push(pick(nearby.length?nearby:empty));
  }
  for(const cell of chosen)this.launch(p,cell.row,cellX(cell.column),null,false,true);
 }
 plant(p:Plant){
  const g=this.g,props=g.props.plants.dusklobber;
  if(p.action==='idle'&&g.time>=p.nextAction&&this.rows(p).some(r=>this.targets(p,r))){p.action='shoot';p.animation='Lob';p.actionAt=g.time;p.eventIndex=0;p.nextAction=g.time+props.ThrowInterval+g.random()*props.ThrowIntervalAdditional;}
  if(p.action==='idle')return;
  const timeline=g.props.plantAnimations.dusklobber[p.animation!],elapsed=g.time-p.actionAt;
  while(p.eventIndex!<timeline.events.length&&elapsed>=timeline.events[p.eventIndex!].at){
   const event=timeline.events[p.eventIndex!++].name;
   if(event==='lob')for(const row of this.rows(p)){const t=this.targets(p,row);if(t)this.launch(p,row,t.x,t.id,t.grave,false);}
   if(event==='food_lob')this.food(p);
   if(event==='foodEnd'){p.action='idle';p.animation='Idle';return;}
   const sound={reload:'reload',food_sound:'food',food_lob_sound:'lobFood',lob_sound:'lob'}[event];
   if(sound)g.beach.sounds.push('dusklobber/'+sound);if(event==='lob_sound')g.beach.sounds.push('dusklobber/lobSay');
  }
  if(elapsed>=timeline.duration){p.action='idle';p.animation='Idle';}
 }
 private splash(s:Splat,damage:number){
  const g=this.g;for(const z of g.zombies)if(z.hp>0&&Math.abs(z.row-s.row)<=1&&Math.abs(z.x-s.x)<1.5*BOARD.cellWidth+20)g.damage(z,damage);
  for(const t of g.graves)if(t.hp>0&&Math.abs(t.row-s.row)<=1&&Math.abs(cellX(t.column)-s.x)<1.5*BOARD.cellWidth+25)t.hp-=damage;
 }
 tick(dt:number){
  const g=this.g;
  for(const shot of this.shots){
   shot.age+=dt;const t=Math.min(1,shot.age/shot.duration);shot.x=shot.fromX+(shot.toX-shot.fromX)*t;shot.y=shot.fromY+(shot.toY-shot.fromY)*t-160*4*t*(1-t);
   if(t===1){
    const props=g.props.projectiles[shot.food?'dusklobber_pf':'dusklobber'];
    if(shot.target!==null){if(shot.grave){const target=g.graves.find(t=>t.id===shot.target);if(target)target.hp-=props.Damage;}else{const target=g.zombies.find(z=>z.id===shot.target&&z.hp>0);if(target)g.damage(target,props.Damage);}}
    this.splats.push({id:g.nextEntityId(),row:shot.row,x:shot.x,food:shot.food,animation:g.random()<.5?'Play':'Play2',age:0,event:0});
   }
  }
  this.shots=this.shots.filter(s=>s.age<s.duration);
  for(const s of this.splats){
   const name=s.food?'duskFoodSplat':'duskSplat',timeline=g.props.plantAnimations[name][s.animation];s.age+=dt;
   while(s.event<timeline.events.length&&s.age>=timeline.events[s.event].at){const event=timeline.events[s.event++].name;
    // DuskLobber assigns a separate 210-damage hit splash to food projectiles.
    if(event==='hit'){if(s.food)this.splash(s,210);g.beach.sounds.push(name+'/explSounds');}
    if(event==='attack'){this.splash(s,g.props.projectiles[s.food?'dusklobber_pf':'dusklobber'].SplashDamage[0].Damage!);g.beach.sounds.push(name+'/rainSounds');}
   }
  }
  this.splats=this.splats.filter(s=>s.age<g.props.plantAnimations[s.food?'duskFoodSplat':'duskSplat'][s.animation].duration);
 }
}
