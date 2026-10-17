import type {Game} from '../src/game/model';
import {cellX} from '../src/game/level';
export function playFuture(g:Game,frame:number){
 for(const s of [...g.suns])if(!s.bomb)g.collect(s.id);
 for(const p of [...g.pickups])g.collectPickup(p.id);
 if(frame%12)return;
 const threats=g.zombies.filter(z=>z.hp>0&&z.kind!=='future_protector_shield').sort((a,b)=>a.x-b.x);
 const occupied=(row:number,column:number)=>g.plants.some(p=>p.row===row&&p.column===column);
 const attack=g.level.day===1?'repeater':'laser_bean';
 for(const z of threats)if(!g.plants.some(p=>p.row===z.row&&p.kind===attack))for(const c of [1,2,3])if(g.plant(attack,z.row,c))break;
 if(g.level.day!==4)for(let row=0;row<5;row++)if(!occupied(row,0))g.plant('sunflower',row,0);
 for(const c of [1,2])for(let row=0;row<5;row++)if(!occupied(row,c))g.plant(attack,row,c);
 for(const z of threats){
  if(z.x<cellX(5))g.plant('tallnut',z.row,4);
  if(g.food>0&&(z.x<cellX(5)||threats.filter(t=>t.row===z.row).length>=3)){
   const p=g.plants.filter(p=>p.kind===attack&&p.row===z.row&&p.action!=='food').sort((a,b)=>Number(g.level.powerTiles.some(t=>t.row===b.row&&t.column===b.column))-Number(g.level.powerTiles.some(t=>t.row===a.row&&t.column===a.column)))[0];if(p)g.plantFood(p.row,p.column);
  }
 }
 if(g.level.day>=4&&threats.some(z=>z.kind==='future_jetpack'||z.kind==='future_imp'&&z.future?.animation==='Fall'))for(let row=0;row<5;row++)if(g.plant('blover',row,8))break;
 if(g.level.day!==4&&g.plants.filter(p=>p.kind==='sunflower').length===5)for(let row=0;row<5;row++)if(!occupied(row,3))g.plant('sunflower',row,3);
}

export function playFutureNext(g:Game,frame:number){
 for(const s of [...g.suns])if(!s.bomb)g.collect(s.id);
 for(const p of [...g.pickups])g.collectPickup(p.id);
 if(frame%12)return;
 const threats=g.zombies.filter(z=>z.hp>0&&z.kind!=='future_protector_shield').sort((a,b)=>a.x-b.x);
 const occupied=(r:number,c:number)=>g.plants.some(p=>p.hp>0&&p.row===r&&p.column===c);
 if(g.level.conveyor){
  for(const packet of [...g.conveyor]){
   if(packet.kind==='powerplant_alpha'||packet.kind==='powerplant_beta'){for(let row=0;row<5;row++)if(!g.level.powerTiles.some(t=>t.row===row&&t.column===7)&&g.plant(packet.kind,row,7,packet.id))break;continue;}
   if(packet.kind==='blover'){if(threats.some(z=>z.kind==='future_jetpack'||z.kind==='future_imp'&&z.future?.animation==='Fall'))g.plant('blover',4,8,packet.id);continue;}
   const rows=[...new Set([...threats.map(z=>z.row),0,1,2,3,4])];
   const columns=packet.kind==='wallnut'?[5,6,4]:packet.kind==='snapdragon'?[4,3,5]:packet.kind==='citron'?[0,1,2]:[1,2,0,3];
   let placed=false;for(const c of columns){for(const r of rows)if(!occupied(r,c)&&g.plant(packet.kind,r,c,packet.id)){placed=true;break;}if(placed)break;}
  }
 }else{
  const limited=g.level.maxPlants!==null;
  const canAdd=()=>!limited||g.plants.length<g.level.maxPlants!;
  for(const z of threats)if(!g.plants.some(p=>p.row===z.row&&p.kind==='laser_bean'))for(const c of [1,2])if(canAdd()&&g.plant('laser_bean',z.row,c))break;
  for(let r=0;r<5;r++)if(canAdd()&&!occupied(r,0))g.plant('sunflower',r,0);
  for(const c of [1,2])for(let r=0;r<5;r++)if(canAdd()&&!occupied(r,c))g.plant('laser_bean',r,c);
  if(!limited){
   for(const z of threats)if(z.x<cellX(5))g.plant(g.level.day===6?'wallnut':'tallnut',z.row,4);
   if(g.plants.filter(p=>p.kind==='sunflower').length>=5)for(let r=0;r<5;r++)if(!occupied(r,3))g.plant('sunflower',r,3);
  }
  if(!limited&&threats.some(z=>z.kind==='future_jetpack'||z.kind==='future_jetpack_disco'||z.kind==='future_imp'&&z.future?.animation==='Fall'))for(let r=0;r<5;r++)if(g.plant('blover',r,8))break;
  if(g.level.day===10)for(const z of threats)if(z.kind==='disco_mech'&&(z.future?.empUntil??0)<=g.time)g.plant('empea',z.row,Math.min(8,Math.floor((z.x-190)/82)-1));
 }
 for(const z of threats)if(g.food>0&&(z.x<cellX(5)||threats.filter(t=>t.row===z.row).length>=3||z.kind==='future_gargantuar')){
  const plant=g.plants.filter(p=>p.row===z.row&&['laser_bean','citron'].includes(p.kind)&&p.action!=='food').sort((a,b)=>Number(g.level.powerTiles.some(t=>t.row===b.row&&t.column===b.column))-Number(g.level.powerTiles.some(t=>t.row===a.row&&t.column===a.column)))[0];if(plant)g.plantFood(plant.row,plant.column);
 }
}

export function playFutureThird(g:Game,frame:number){
 if(g.level.day===11){
  if(g.preparing){for(let r=0;r<5;r++){g.plant('laser_bean',r,0);g.plant('laser_bean',r,1);g.plant('tallnut',r,4);}g.startLastStand();}
  for(const p of [...g.pickups])g.collectPickup(p.id);
  if(frame%12)return;
  const threats=g.zombies.filter(z=>z.hp>0&&z.kind!=='future_protector_shield');
  if(threats.filter(z=>z.kind==='future_jetpack').length>=2&&g.sun>=50)g.plant('blover',4,8);
  for(const z of threats)if(g.food>0&&(z.x<cellX(4)||threats.filter(q=>q.row===z.row).length>=4)){const p=g.plants.find(p=>p.kind==='laser_bean'&&p.row===z.row&&p.action!=='food');if(p)g.plantFood(p.row,p.column);}
  return;
 }
 if(g.level.day===14){
  for(const s of [...g.suns])g.collect(s.id);for(const p of [...g.pickups])g.collectPickup(p.id);if(frame%12)return;
  const threats=g.zombies.filter(z=>z.hp>0&&z.kind!=='future_protector_shield').sort((a,b)=>a.x-b.x);
  for(let r=0;r<5;r++)if(!g.plants.some(p=>p.row===r&&p.column===0)&&g.sunSpent+50<=1500)g.plant('sunflower',r,0);
  for(const r of [...new Set([...threats.map(z=>z.row),0,1,2,3,4])])if(!g.plants.some(p=>p.row===r&&p.kind==='laser_bean')&&g.sunSpent+200<=1500)g.plant('laser_bean',r,r===0?2:r===4?3:1);
  if(threats.some(z=>z.kind==='future_jetpack'&&z.x<cellX(5))&&g.sunSpent+50<=1500)g.plant('blover',4,8);
  for(const z of threats)if(g.food>0&&(z.x<cellX(5)||threats.filter(q=>q.row===z.row).length>=3)){const p=g.plants.find(p=>p.kind==='laser_bean'&&p.row===z.row&&p.action!=='food');if(p)g.plantFood(p.row,p.column);}
  return;
 }
 playFutureNext(g,frame);
 if(g.level.day===15&&frame%12===0)for(const r of [1,2,3])g.plant('tallnut',r,7);
}
