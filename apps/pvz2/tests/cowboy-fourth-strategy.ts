import type {Game} from '../src/game/model';
import {cellX} from '../src/game/level';
import {playCowboyThird} from './cowboy-strategy';
export function playCowboyFourth(g:Game,frame:number){
 for(const s of [...g.suns])g.collect(s.id);
 for(const p of [...g.pickups])g.collectPickup(p.id);
 if(g.level.day===18){
  if(g.preparing){for(let r=0;r<5;r++){g.plant('splitpea',r,4);g.plant('lightningreed',r,5);g.plant('wallnut',r,6);}g.startLastStand();}
  if(g.food>0&&g.zombies.some(z=>z.hp>0&&(z.x<cellX(5)||z.kind==='chicken_farmer'))){const p=g.plants.find(p=>p.kind==='lightningreed'&&p.action!=='food');if(p)g.plantFood(p.row,p.column);}
  return;
 }
 if(g.level.day===20){
  const threats=g.zombies.filter(z=>z.hp>0&&!z.leap).sort((a,b)=>a.x-b.x);
  const packet=g.conveyor[0];
  if(packet){const preferred=packet.kind==='peashooter'?0:packet.kind==='repeater'?1:packet.kind==='coconutcannon'?2:packet.kind==='wallnut'?3:packet.kind==='potatomine'?4:5;const c=g.cowboy.carts[preferred];g.shovel(c.row,c.column);g.plant(packet.kind,c.row,c.column,packet.id);}
  for(const c of g.cowboy.carts){
   const p=g.plants.find(p=>p.row===c.row&&p.column===c.column);if(!p)continue;
   const target=threats.filter(z=>z.x>cellX(c.column)-15).sort((a,b)=>(p.kind==='potatomine'||p.kind==='chilibean'||p.kind==='wallnut'||p.kind==='coconutcannon'?(b.hp+b.armor)-(a.hp+a.armor):(a.hp+a.armor)-(b.hp+b.armor))||a.x-b.x)[0];
   if(target){g.cowboy.select(c.row,c.column);g.cowboy.move(target.row);if(p.kind==='coconutcannon')g.pirate.fire(p.row,p.column);}
   if(g.food>0&&target&&target.x<cellX(4)&&['peashooter','repeater'].includes(p.kind))g.plantFood(c.row,c.column);
  }
  return;
 }
 if(g.level.day===19){
  if(frame%12)return;
  const plant=(kind:Parameters<Game['plant']>[0],r:number,c:number)=>g.sunSpent+g.seedCost(kind)<=2000&&g.plant(kind,r,c);
  const threats=g.zombies.filter(z=>z.hp>0&&!z.leap).sort((a,b)=>a.x-b.x);
  for(const z of threats){
   if(!g.plants.some(p=>p.row===z.row&&p.kind==='lightningreed'))plant('lightningreed',z.row,3);
   if(z.x<cellX(7))plant('wallnut',z.row,6);
  }
  for(let r=0;r<5;r++)if(!g.plants.some(p=>p.row===r&&p.kind==='sunflower'))plant('sunflower',r,0);
  for(let r=0;r<5;r++)plant('splitpea',r,4);
  if(g.food>0&&threats.some(z=>z.x<cellX(6))){const p=g.plants.find(p=>p.kind==='lightningreed'&&p.action!=='food');if(p)g.plantFood(p.row,p.column);}
  return;
 }
 playCowboyThird(g,frame);
 if(g.level.day===16){const c=g.cowboy.carts[0],p=g.plants.find(p=>p.endangered)!;g.wallnutFirstAid=true;if(p){g.plant('wallnut',p.row,p.column);if(g.zombies.some(z=>z.hp>0&&z.row===c.row&&Math.abs(z.x-cellX(c.column))<100)){const row=[0,1,2,3,4].find(r=>!g.zombies.some(z=>z.hp>0&&z.row===r&&Math.abs(z.x-cellX(c.column))<150));if(row!==undefined){g.cowboy.select(c.row,c.column);g.cowboy.move(row);}}}}
}
