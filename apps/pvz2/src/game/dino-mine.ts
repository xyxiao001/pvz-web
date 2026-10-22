import {BOARD,cellX,rowY} from './level';
import {isFlying} from './pirate';
import type {Game,Plant} from './model';
export class DinoMines {
 constructor(private g:Game){}
 private play(p:Plant,animation:string){p.animation=animation;p.actionAt=this.g.time;p.eventIndex=0;}
 food(p:Plant){p.rootGrown=true;p.fired=true;this.play(p,'Food');}
 tick(p:Plant){
  const g=this.g,prop=g.props.plants.primalpotatomine;
  if(p.leap){if(g.time-p.leap.at<.8)return;delete p.leap;p.rootGrown=true;this.play(p,'Spawn');g.beach.sounds.push('primalpotatomine/landSound');}
  if(!p.animation)this.play(p,'Spawn_Baby');
  if(!p.rootGrown&&p.age>=prop.ChargeTime){p.rootGrown=true;this.play(p,'Grow');g.beach.sounds.push('primalpotatomine/landSound');}
  if(p.fired&&p.action!=='food'&&g.zombies.some(z=>z.hp>0&&!isFlying(z)&&z.row===p.row&&!z.dinoCarry&&Math.abs(z.x-cellX(p.column))<BOARD.cellWidth/2+20)){p.fired=false;p.action='explode';this.play(p,'Charging');}
  const animation=p.animation!,timeline=g.props.plantAnimations.primalpotatomine[animation],age=g.time-p.actionAt;
  while(p.eventIndex!<timeline.events.length&&age>=timeline.events[p.eventIndex!].at){
   const name=timeline.events[p.eventIndex!++].name;
   if(name==='activate')p.fired=true;
   if(name==='foodSound')g.beach.sounds.push('primalpotatomine/foodSound');
   if(name==='throw')this.children(p);
   if(name==='foodEnd')p.action='idle';
   if(name==='explode'){
    for(const z of g.zombies)if(z.hp>0&&!isFlying(z)&&Math.abs(z.row-p.row)<=1&&Math.abs(z.x-cellX(p.column))<1.5*BOARD.cellWidth+20)g.damage(z,prop.Damage,'potato');
    for(const t of g.graves)if(Math.abs(t.row-p.row)<=1&&Math.abs(t.column-p.column)<=1)t.hp-=prop.Damage;
    g.future.visual('spudowPrimal','Explode',cellX(p.column),rowY(p.row));g.events.push({type:'explode'});
   }
   if(name==='die')p.hp=0;
  }
  if(age>=timeline.duration&&p.hp>0&&!animation.startsWith('Idle'))this.play(p,p.rootGrown?'Idle':'Idle_Baby');
 }
 private children(p:Plant){
  const g=this.g,available=Array.from({length:45},(_,i)=>({row:Math.floor(i/9),column:i%9})).filter(c=>!g.plants.some(q=>q.hp>0&&q.row===c.row&&q.column===c.column)&&!g.graves.some(t=>t.hp>0&&t.row===c.row&&t.column===c.column)&&!g.level.mold.some(t=>t.row===c.row&&t.column===c.column));
  const selected:typeof available=[];
  for(const z of g.zombies)if(z.hp>0){const c=available.find(c=>c.row===z.row&&c.column===Math.floor((z.x-BOARD.left)/BOARD.cellWidth));if(c&&!selected.includes(c)&&selected.length<g.props.plants.primalpotatomine.PlantfoodChildrenCount)selected.push(c);}
  while(selected.length<g.props.plants.primalpotatomine.PlantfoodChildrenCount&&selected.length<available.length){const rest=available.filter(c=>!selected.includes(c));selected.push(rest[Math.floor(g.random()*rest.length)]);}
  for(const c of selected){g.addPlant('primalpotatomine',c.row,c.column);const child=g.plants.at(-1)!;child.leap={x:cellX(p.column),y:rowY(p.row),at:g.time,duration:.8};this.play(child,'Flying');}
 }
}
