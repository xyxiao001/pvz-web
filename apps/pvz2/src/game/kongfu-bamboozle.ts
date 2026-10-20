import {BOARD,cellX,rowY} from './level';
import type {Game,Plant} from './model';
import native from '../../public/assets/kongfu/properties.json';
export class KongfuBamboozle {
 selected:number|null=null;
 states=new Map<number,{left:number;target:{row:number;column:number}|null}>();
 shots:{id:number;fromX:number;fromY:number;row:number;column:number;age:number}[]=[];
 constructor(private g:Game){}
 add(p:Plant){if(p.kind==='bamboozle'){this.states.set(p.id,{left:native.plants.bamboozle.MaxProjectileCount,target:null});p.animation='Idle';}if(p.kind==='bamboobusket'){p.animation='Spawn0';p.actionAt=this.g.time;}}
 private play(p:Plant,animation:string,action:Plant['action']='idle'){p.animation=animation;p.action=action;p.actionAt=this.g.time;p.eventIndex=0;}
 select(row:number,column:number){const p=this.g.plants.find(p=>p.hp>0&&p.kind==='bamboozle'&&p.row===row&&p.column===column&&p.action==='idle'&&this.states.get(p.id)!.left>0);if(!p)return false;this.cancel();this.selected=p.id;this.play(p,'TakeAim','shoot');return true;}
 cancel(){const p=this.g.plants.find(p=>p.id===this.selected);if(p)this.play(p,'Idle');this.selected=null;}
 fire(row:number,column:number){const p=this.g.plants.find(p=>p.id===this.selected);if(!p||p.hp<=0||row<0||row>=5||column<0||column>=9)return false;this.states.get(p.id)!.target={row,column};this.selected=null;this.play(p,'Launch','shoot');return true;}
 needsReload(p:Plant){return this.states.get(p.id)!.left<native.plants.bamboozle.MaxProjectileCount;}
 repair(p:Plant){p.hp=native.plants.bamboozle.Toughness;this.states.get(p.id)!.left=native.plants.bamboozle.MaxProjectileCount;}
 food(p:Plant){this.selected=null;this.states.get(p.id)!.left=native.plants.bamboozle.MaxProjectileCount;this.play(p,'Food','food');}
 private launch(p:Plant,row:number,column:number){this.shots.push({id:this.g.nextEntityId(),fromX:cellX(p.column),fromY:rowY(p.row)-60,row,column,age:0});this.g.beach.sounds.push('bamboozle/shootSounds','bamboozle/shootSaySounds');}
 plant(p:Plant){const g=this.g;
  if(p.kind==='bamboobusket'){const stage=Math.min(2,Math.floor(3*(1-p.hp/native.plants.bamboobusket.Toughness)));p.animation=(g.time-p.actionAt<native.plantAnimations.bamboobusket.Spawn0.duration?'Spawn':'Idle')+stage;return;}
  if(p.animation==='Idle'||p.animation==='Steady')return;
  const a=g.props.plantAnimations.bamboozle[p.animation!],elapsed=g.time-p.actionAt,s=this.states.get(p.id)!;
  while(p.eventIndex!<a.events.length&&elapsed>=a.events[p.eventIndex!].at){const e=a.events[p.eventIndex!++].name;
   if(e==='say_aim')g.beach.sounds.push('bamboozle/aimSaySounds');
   if(e==='shoot'){s.left--;this.launch(p,s.target!.row,s.target!.column);}
   if(e==='shoot_food')for(let row=0;row<5;row++){const cells=Array.from({length:9},(_,column)=>column).reverse().filter(column=>!g.graves.some(t=>t.hp>0&&t.row===row&&t.column===column)&&!g.level.mold.some(t=>t.row===row&&t.column===column));const occupied=cells.find(column=>g.plants.some(q=>q.hp>0&&q.row===row&&q.column===column));this.launch(p,row,occupied??cells[0]??Math.floor(g.random()*9));}
  }
  if(elapsed>=a.duration)this.play(p,p.animation==='TakeAim'?'Steady':'Idle',p.animation==='TakeAim'?'shoot':'idle');
 }
 tick(dt:number){const g=this.g;
  if(this.selected!==null&&!g.plants.some(p=>p.id===this.selected&&p.hp>0))this.selected=null;
  for(const s of this.shots){s.age+=dt;if(s.age<.444)continue;
   for(const z of g.zombies)if(z.hp>0&&g.inLane(z,s.row)&&Math.abs(z.x-cellX(s.column))<BOARD.cellWidth/2)g.damage(z,native.projectiles.bamboozle.Damage);
   const grave=g.graves.find(t=>t.hp>0&&t.row===s.row&&t.column===s.column);if(grave){grave.hp-=native.projectiles.bamboozle.Damage;continue;}
   if(g.level.mold.some(t=>t.row===s.row&&t.column===s.column))continue;
   const basket=g.plants.find(p=>p.hp>0&&p.kind==='bamboobusket'&&p.row===s.row&&p.column===s.column);
   if(basket){basket.hp=native.plants.bamboobusket.Toughness;basket.actionAt=g.time;}else g.addPlant('bamboobusket',s.row,s.column);
  }this.shots=this.shots.filter(s=>s.age<.444);
 }
}
