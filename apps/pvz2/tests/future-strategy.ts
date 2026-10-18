import type {Game} from '../src/game/model';
import {cellX,type PlantKind} from '../src/game/level';
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

export function playFutureFourth(g:Game,frame:number){
 for(const s of [...g.suns])if(!s.bomb)g.collect(s.id);
 for(const p of [...g.pickups])g.collectPickup(p.id);
 if(frame%12)return;
 const threats=g.zombies.filter(z=>z.hp>0&&z.kind!=='future_protector_shield').sort((a,b)=>a.x-b.x);
 const occupied=(r:number,c:number)=>g.plants.some(p=>p.hp>0&&p.row===r&&p.column===c);
 const rows=[...new Set([...threats.map(z=>z.row),0,1,2,3,4])];
 if(g.level.day===16){
  for(const packet of [...g.conveyor]){
   if(packet.kind==='powerplant_alpha'){for(let r=0;r<5;r++)if(g.plants.some(p=>p.kind==='citron'&&p.row===r&&p.column===1)&&g.plant(packet.kind,r,1,packet.id))break;continue;}
   if(packet.kind==='blover'){if(threats.some(z=>z.kind==='future_jetpack'))g.plant('blover',4,8,packet.id);continue;}
   if(packet.kind==='empea'){const z=threats.find(z=>['football_mech','mech_cone','future_protector'].includes(z.kind));if(z)g.plant('empea',z.row,Math.min(8,Math.max(0,Math.floor((z.x-190)/82)-1)),packet.id);continue;}
   const cols=packet.kind==='citron'?[1,0,2]:packet.kind==='holonut'?[4,3]:packet.kind==='bonkchoy'?[3,5,2]:[6,7,8];
   let placed=false;for(const c of cols){for(const r of rows)if(!occupied(r,c)&&g.plant(packet.kind,r,c,packet.id)){placed=true;break;}if(placed)break;}
  }
 }else if(g.level.day===17){
  for(const z of threats)if(!g.plants.some(p=>p.kind==='magnifyinggrass'&&p.row===z.row))g.plant('magnifyinggrass',z.row,1);
  for(let r=0;r<5;r++)if(!occupied(r,0))g.plant('sunflower',r,0);
  for(const c of [2,3])for(let r=0;r<5;r++)if(!occupied(r,c))g.plant('twinsunflower',r,c);
  for(const z of threats){
   const p=g.plants.find(p=>p.kind==='magnifyinggrass'&&p.row===z.row);
   if(p&&z.x<cellX(8)&&!g.western.shots.some(s=>s.kind==='magnifying_grass'&&Math.abs(s.y-(240+98*z.row-45))<40))g.western.fire(p.row,p.column);
   if(z.x<cellX(6))g.plant('holonut',z.row,4);
   if(z.kind==='mech_cone'&&(z.future?.empUntil??0)<=g.time)g.plant('empea',z.row,6);
  }
 }else if(g.level.day===18){
  for(const z of threats)if(!g.plants.some(p=>p.kind==='laser_bean'&&p.row===z.row))g.plant('laser_bean',z.row,1);
  for(const c of [0,3])for(let r=0;r<5;r++)if(!occupied(r,c))g.plant('twinsunflower',r,c);
  for(const c of [1,2])for(let r=0;r<5;r++)if(!occupied(r,c))g.plant('laser_bean',r,c);
  for(const z of threats)if(z.x<cellX(6))g.plant('tallnut',z.row,4);
  if(g.food>0&&g.sunProduced<6000){const p=g.plants.find(p=>p.kind==='twinsunflower'&&[1,3].includes(p.row)&&p.column===0&&p.action!=='food');if(p)g.plantFood(p.row,p.column);}
 }else if(g.level.day===19){
  for(const r of rows)if(!g.plants.some(p=>p.kind==='laser_bean'&&p.row===r))g.plant('laser_bean',r,1);
  for(const c of [1,0])for(let r=0;r<5;r++)if(!occupied(r,c))g.plant('laser_bean',r,c);
  for(const z of threats)if(z.x<cellX(5))g.plant('tallnut',z.row,4);
 }else {playFutureNext(g,frame);for(let r=0;r<5;r++)g.plant('tallnut',r,7);}
 if([18,19,20].includes(g.level.day)&&threats.some(z=>['future_jetpack','future_jetpack_disco'].includes(z.kind)||z.kind==='future_imp'&&z.future?.animation==='Fall'))g.plant('blover',4,8);
 for(const z of threats)if(g.food>0&&(z.x<cellX(5)||threats.filter(t=>t.row===z.row).length>=3||z.kind==='future_gargantuar')){
  const p=g.plants.filter(p=>['laser_bean','citron','magnifyinggrass'].includes(p.kind)&&p.row===z.row&&p.action!=='food').sort((a,b)=>Number(g.level.powerTiles.some(t=>t.row===b.row&&t.column===b.column))-Number(g.level.powerTiles.some(t=>t.row===a.row&&t.column===a.column)))[0];if(p)g.plantFood(p.row,p.column);
 }
}

export function playFutureFifth(g:Game,frame:number){
 for(const s of [...g.suns])if(!s.bomb)g.collect(s.id);
 for(const p of [...g.pickups])g.collectPickup(p.id);
 if(frame%12)return;
 const threats=g.zombies.filter(z=>z.hp>0&&z!==g.boss?.zombie&&z.kind!=='future_protector_shield').sort((a,b)=>a.x-b.x);
 const occupied=(r:number,c:number)=>g.plants.some(p=>p.hp>0&&p.row===r&&p.column===c);
 const rows=[...new Set([...threats.map(z=>z.row),0,1,2,3,4])];
 if(g.level.day===25){
  for(const packet of [...g.conveyor]){
   if(packet.kind==='powerplant_alpha'||packet.kind==='powerplant_beta'){
    const col=packet.kind==='powerplant_alpha'?0:1;for(let row=0;row<5;row++)if(g.plant(packet.kind,row,col,packet.id))break;continue;
   }
   if(packet.kind==='blover'){if(threats.some(z=>['future_jetpack','future_jetpack_disco'].includes(z.kind)||z.kind==='future_imp'&&z.future?.animation==='Fall'))g.plant('blover',4,6,packet.id);continue;}
   const cols=packet.kind==='holonut'?[4,3,5]:packet.kind==='citron'?[0,1,2,3]:[1,0,2,3,5];
   let placed=false;for(const c of cols){for(const r of rows)if(!occupied(r,c)&&g.plant(packet.kind,r,c,packet.id)){placed=true;break;}if(placed)break;}
  }
  if(g.food>0){const target=g.boss!.targets.find(t=>g.level.powerTiles.some(q=>q.row===t.row&&q.column===t.column)&&g.plants.some(p=>p.row===t.row&&p.column===t.column&&p.action!=='food'));if(target)g.plantFood(target.row,target.column);}
 }else if(g.level.day===22){
  if(g.preparing){for(let r=0;r<5;r++){g.plant('laser_bean',r,[1,3].includes(r)?2:0);g.plant('snapdragon',r,3);g.plant('wallnut',r,4);}g.startLastStand();}
  if(threats.some(z=>['future_jetpack','future_jetpack_disco'].includes(z.kind)&&z.x<cellX(6)))g.plant('blover',4,8);
 }else if(g.level.day===21){
  const canAdd=()=>g.plants.length<16;
  for(const r of rows)if(canAdd()&&!g.plants.some(p=>p.kind==='laser_bean'&&p.row===r))g.plant('laser_bean',r,2);
  for(let r=0;r<5;r++)if(canAdd()&&!occupied(r,0))g.plant('twinsunflower',r,0);
  for(let r=0;r<5;r++)if(r!==2&&canAdd()&&!occupied(r,1))g.plant('laser_bean',r,1);
  if(canAdd()&&!occupied(2,4))g.plant('holonut',2,4);
  if(g.food>0&&threats.some(z=>z.x<cellX(6))){const p=g.plants.find(p=>p.kind==='holonut'&&p.action!=='food'&&!g.future.holonuts.get(p.id)?.shield);if(p)g.plantFood(p.row,p.column);}
  if(g.food>0&&g.sunProduced<5000){const p=g.plants.find(p=>p.kind==='twinsunflower'&&p.row===2&&p.column===0&&p.action!=='food');if(p)g.plantFood(p.row,p.column);}
  if(canAdd()&&threats.some(z=>['future_jetpack','future_jetpack_disco'].includes(z.kind)||z.kind==='future_imp'&&z.future?.animation==='Fall'))g.plant('blover',4,8);
 }else if(g.level.day===23){
  for(let r=0;r<5;r++)if(g.sunSpent+50<=2250&&!occupied(r,0))g.plant('sunflower',r,0);
  for(const r of rows)if(g.sunSpent+200<=2250&&!g.plants.some(p=>p.kind==='laser_bean'&&p.row===r))g.plant('laser_bean',r,2);
  if(g.sunSpent+200<=2000)for(const r of rows)if(!occupied(r,1))g.plant('laser_bean',r,1);
  if(g.sunSpent+50<=2250&&g.plants.length<15&&threats.some(z=>['future_jetpack','future_jetpack_disco'].includes(z.kind)||z.kind==='future_imp'&&z.future?.animation==='Fall'))g.plant('blover',4,8);
 }else{
  for(const r of rows)if(!g.plants.some(p=>p.kind==='laser_bean'&&p.row===r))g.plant('laser_bean',r,1);
  for(const c of [1,0,2])for(let r=0;r<5;r++)if(!occupied(r,c))g.plant('laser_bean',r,c);
  for(const z of threats)if(z.x<cellX(5))g.plant('tallnut',z.row,4);
  if(threats.some(z=>['future_jetpack','future_jetpack_disco'].includes(z.kind)||z.kind==='future_imp'&&z.future?.animation==='Fall'))g.plant('blover',4,8);
 }
 for(const z of threats)if(g.food>0&&(g.level.day===22?z.x<cellX(3):(z.x<cellX(5)||threats.filter(t=>t.row===z.row).length>=3||z.kind==='future_gargantuar'))){
  const p=g.plants.filter(p=>['laser_bean','citron','snapdragon'].includes(p.kind)&&p.row===z.row&&p.action!=='food').sort((a,b)=>Number(g.level.powerTiles.some(t=>t.row===b.row&&t.column===b.column))-Number(g.level.powerTiles.some(t=>t.row===a.row&&t.column===a.column)))[0];if(p)g.plantFood(p.row,p.column);
 }
}

export function playFutureSixth(g:Game,frame:number){
 for(const s of [...g.suns])if(!s.bomb)g.collect(s.id);
 for(const p of [...g.pickups])g.collectPickup(p.id);
 if(frame%12)return;
 if(g.level.day===29){playFutureSapProtection(g);return;}
 const threats=g.zombies.filter(z=>z.hp>0&&z.kind!=='future_protector_shield').sort((a,b)=>a.x-b.x);
 const occupied=(r:number,c:number)=>g.plants.some(p=>p.hp>0&&p.row===r&&p.column===c);
 const plant=(kind:PlantKind,r:number,c:number)=>g.level.day===26&&g.time>20&&g.sun-g.seedCost(kind)<50?false:g.plant(kind,r,c);
 const rows=[...new Set([...threats.map(z=>z.row),0,1,2,3,4])];
 if([26,27].includes(g.level.day)&&threats.some(z=>z.kind==='future_imp'&&z.future?.animation==='Fall'||['future_jetpack','future_jetpack_disco'].includes(z.kind)&&z.x<cellX(3)))g.plant('blover',4,8);
 if([26,30].includes(g.level.day))for(const z of threats){
  const c=Math.max(0,Math.min(8,Math.floor((z.x-190)/82)));
  if(z.x<cellX(7))g.plant('iceburg',z.row,c);
  if(z.x<cellX(5)&&threats.filter(q=>Math.abs(q.row-z.row)<=1&&Math.abs(q.x-z.x)<140).length>=3)for(const col of [c,c-1,c+1])if(col>=0&&col<9&&g.plant('cherry_bomb',z.row,col))break;
 }
 if(g.level.day===27){
  if(g.preparing){for(let r=0;r<5;r++){g.plant('citron',r,0);}g.startLastStand();}

 }else if(g.level.day===28){
  for(const r of rows)if(!g.plants.some(p=>p.row===r&&p.kind==='redstinger'))g.plant('redstinger',r,1);
  for(let r=0;r<5;r++)if(!occupied(r,0))plant('sunflower',r,0);
  for(const c of [2,3,4])for(let r=0;r<5;r++)if(!occupied(r,c))g.plant(c===2?'redstinger':'pinkstarfruit',r,c);
  if(!occupied(2,5))g.plant('holonut',2,5);
 }else{
  const first=0,attack=1;
  if(g.level.day===30)for(const z of threats)if(z.x<cellX(6))g.plant('tallnut',z.row,4);
  const attacker=g.level.day===30?'lightningreed':'electricpeashooter';
  for(const r of rows)if(threats.some(z=>z.row===r)&&!g.plants.some(p=>p.kind===attacker&&p.row===r))plant(attacker,r,attack);
  if(g.level.day!==30)for(let r=0;r<5;r++)if(!occupied(r,first))plant('sunflower',r,first);
  if(g.level.day!==30)for(let r=0;r<5;r++)if(!occupied(r,first+3))plant('sunflower',r,first+3);
  if(g.sun>=(g.level.day===30?125:250))for(const c of [attack,attack+1,attack+2])for(let r=0;r<5;r++)if(!occupied(r,c))plant(attacker,r,c);
  if(g.level.day===30&&g.food>0&&!occupied(2,3))g.plant('holonut',2,3);

 }
 if(g.level.day===26&&g.food>0&&g.sun<200){const p=g.plants.find(p=>p.kind==='sunflower'&&p.action!=='food');if(p)g.plantFood(p.row,p.column);}
 if(g.food>0&&threats.some(z=>z.x<cellX(7))){const p=g.plants.find(p=>p.kind==='holonut'&&p.action!=='food'&&!g.future.holonuts.get(p.id)?.shield);if(p)g.plantFood(p.row,p.column);}
 for(const z of threats)if(g.food>0&&(z.x<cellX(4)||threats.filter(q=>q.row===z.row).length>=4||z.kind==='future_gargantuar')){
  const p=g.plants.find(p=>['citron','electricpeashooter','lightningreed','redstinger','pinkstarfruit'].includes(p.kind)&&p.row===z.row&&p.action!=='food');if(p)g.plantFood(p.row,p.column);
 }
}

function playFutureSapProtection(g:Game){
 const threats=g.zombies.filter(z=>z.hp>0&&z.kind!=='future_protector_shield').sort((a,b)=>a.x-b.x),occupied=(r:number,c:number)=>g.plants.some(p=>p.row===r&&p.column===c),rows=[...new Set([...threats.map(z=>z.row),0,1,2,3,4])];
 if(threats.some(z=>['future_jetpack','future_jetpack_disco'].includes(z.kind)&&z.x<cellX(3)||z.kind==='future_imp'&&z.future?.animation==='Fall'))g.plant('blover',4,8);
 for(const z of threats){
  const c=Math.max(2,Math.min(8,Math.floor((z.x-190)/82)));
  if(z.x<cellX(5))for(const col of [8,7,6])if(g.plant('hurrikale',z.row,col))break;
  if(['football_mech','mech_cone'].includes(z.kind)&&(z.future?.empUntil??0)<=g.time&&z.x<cellX(8))g.plant('empea',z.row,c);
  if(z.x<cellX(5)&&threats.filter(q=>Math.abs(q.row-z.row)<=1&&Math.abs(q.x-z.x)<140).length>=3)for(const col of [c,c-1,c+1])if(col>=2&&col<9&&g.plant('cherry_bomb',z.row,col))break;
 }
 for(let r=0;r<5;r++)if(!occupied(r,3))g.plant('sunflower',r,3);
 for(const r of rows)if(!g.plants.some(p=>p.kind==='electricpeashooter'&&p.row===r))g.plant('electricpeashooter',r,2);
 for(let r=0;r<5;r++)if(!occupied(r,4))g.plant('sunflower',r,4);
 if(g.sun>=250)for(const c of [2,4,6])for(const r of rows)if(!occupied(r,c))g.plant('electricpeashooter',r,c);
 if(g.food>0){const p=g.time<130?g.plants.find(p=>p.kind==='sunflower'&&p.action!=='food'):g.plants.find(p=>p.kind==='electricpeashooter'&&p.action!=='food'&&threats.some(z=>z.row===p.row&&z.x<cellX(6)));if(p)g.plantFood(p.row,p.column);}
}
