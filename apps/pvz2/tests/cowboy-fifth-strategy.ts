import type {Game} from '../src/game/model';
import {cellX} from '../src/game/level';
import {playCowboyThird} from './cowboy-strategy';
export function playCowboyFifth(g:Game,frame:number){
 for(const s of [...g.suns])g.collect(s.id);
 for(const p of [...g.pickups])g.collectPickup(p.id);
 if(g.level.day===24){
  playCowboyThird(g,frame);
  if(g.level.day===24)for(const c of g.cowboy.carts){const p=g.plants.find(p=>p.endangered&&p.column===c.column);if(p){g.wallnutFirstAid=true;g.plant('wallnut',p.row,p.column);if(g.zombies.some(z=>z.hp>0&&z.row===c.row&&Math.abs(z.x-cellX(c.column))<130)){const row=Array.from({length:c.end-c.start+1},(_,i)=>c.start+i).find(r=>!g.zombies.some(z=>z.hp>0&&z.row===r&&Math.abs(z.x-cellX(c.column))<180));if(row!==undefined){g.cowboy.select(c.row,c.column);g.cowboy.move(row);}}}}
  return;
 }
 if(frame%12)return;
 const threats=g.zombies.filter(z=>z.hp>0&&!z.leap&&z!==g.boss?.zombie).sort((a,b)=>a.x-b.x);
 if(g.level.day===23){
  g.wallnutFirstAid=true;
  for(const z of threats){if(!g.plants.some(p=>p.row===z.row&&p.kind==='lightningreed'))for(const c of [3,2,0])if(g.plant('lightningreed',z.row,c))break;if(z.x<cellX(7))g.plant('tallnut',z.row,6);}
  for(let r=0;r<5;r++)if(!g.plants.some(p=>p.row===r&&p.kind==='sunflower'))for(const c of [0,1,2])if(g.plant('sunflower',r,c))break;
  for(const p of g.plants)if(p.kind==='tallnut')g.plant('tallnut',p.row,p.column);
  for(let r=0;r<5;r++)g.plant('melonpult',r,4);
  for(let r=0;r<5;r++)g.plant('repeater',r,5);
  if(g.food>0&&threats.some(z=>z.x<cellX(6)||z.kind==='piano')){const p=g.plants.find(p=>p.kind==='lightningreed'&&p.action!=='food');if(p)g.plantFood(p.row,p.column);}
 }else if(g.level.day===21){
  const plant=(kind:Parameters<Game['plant']>[0],r:number,c:number)=>g.sunSpent+g.seedCost(kind)<=1750&&g.plant(kind,r,c);
  for(const z of threats){if(!g.plants.some(p=>p.row===z.row&&p.kind==='lightningreed'))plant('lightningreed',z.row,3);if(z.x<cellX(7))plant('wallnut',z.row,6);}
  for(let r=0;r<5;r++)if(!g.plants.some(p=>p.row===r&&p.kind==='sunflower'))plant('sunflower',r,0);
  for(let r=0;r<5;r++)plant('splitpea',r,4);
  if(g.food>0&&threats.some(z=>z.x<cellX(6))){const p=g.plants.find(p=>p.kind==='lightningreed'&&p.action!=='food');if(p)g.plantFood(p.row,p.column);}
 }else if(g.level.day===22){
  for(const z of threats){
   if(!g.plants.some(p=>p.row===z.row&&p.kind==='repeater'))for(const c of [3,4])if(g.plant('repeater',z.row,c))break;
   if(z.x<cellX(6))g.plant('iceburg',z.row,Math.max(0,Math.min(8,Math.floor((z.x-190)/82))));
   if(z.x>cellX(6))g.plant('potatomine',z.row,5);
  }
  for(let r=0;r<5;r++)for(const c of [0,1,2])if(!g.plants.some(p=>p.kind==='sunflower'&&p.row===r)&&g.plant('sunflower',r,c))break;
  for(let r=0;r<5;r++)g.plant('wintermelon',r,4);
  for(let r=0;r<5;r++)g.plant('bloomerang',r,2);
  if(g.food>0&&threats.some(z=>z.x<cellX(5))){const p=g.plants.find(p=>p.kind==='wintermelon'&&p.action!=='food')??g.plants.find(p=>p.row===threats[0].row&&p.kind==='repeater');if(p)g.plantFood(p.row,p.column);}
 }else if(g.level.day===25){
  const boss=g.boss!;
  for(const c of g.cowboy.carts){
   const danger=[...boss.targets,...boss.missiles.filter(m=>m.age<1.5)];
   const safe=Array.from({length:5},(_,row)=>row).filter(row=>!danger.some(t=>t.column===c.column&&t.row===row));
   const row=safe.find(row=>boss.covers(row))??safe[0];if(row!==undefined){g.cowboy.select(c.row,c.column);g.cowboy.move(row);}
  }
  for(const packet of [...g.conveyor]){
   const rows=[...new Set([...threats.map(z=>z.row),boss.zombie.row,boss.zombie.row-1,0,1,2,3,4])];
   if(packet.kind==='chilibean'){const z=threats.find(z=>!['cowboy_gargantuar','piano'].includes(z.kind));if(z)g.plant(packet.kind,z.row,Math.max(0,Math.min(6,Math.floor((z.x-190)/82))),packet.id);}
   else {const columns=packet.kind==='tallnut'?[6,5]:packet.kind==='wintermelon'?[3,2,0,4]:packet.kind==='melonpult'?[1,2,0,4]:packet.kind==='peapod'?[1,3,2,0,4]:[4,2,0,5];
    let planted=false;for(const row of rows){for(const col of columns)if(g.plant(packet.kind,row,col,packet.id)){planted=true;break;}if(planted)break;}
   }
  }
  if(g.food>0){const p=g.plants.filter(p=>p.action!=='food'&&['wintermelon','melonpult','peapod'].includes(p.kind)).sort((a,b)=>(a.kind==='wintermelon'?-100:0)-(b.kind==='wintermelon'?-100:0))[0];if(p)g.plantFood(p.row,p.column);}
 }
}
