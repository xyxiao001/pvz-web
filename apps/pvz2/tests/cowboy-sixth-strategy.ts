import type {Game} from '../src/game/model';
import {cellX} from '../src/game/level';
export function playCowboySixth(g:Game,frame:number){
 for(const s of [...g.suns])g.collect(s.id);
 for(const p of [...g.pickups])g.collectPickup(p.id);
 const threats=g.zombies.filter(z=>z.hp>0&&!z.leap).sort((a,b)=>a.x-b.x);
 if(g.level.day===28){
  if(g.preparing){for(const c of g.cowboy.carts.slice(0,2))g.plant('electricpeashooter',c.row,c.column);for(const c of g.cowboy.carts.slice(2))g.plant('magnetshroom',c.row,c.column);g.startLastStand();}
  for(const [i,c] of g.cowboy.carts.entries()){
   const targets=threats.filter(z=>z.x>cellX(c.column)+100&&!threats.some(q=>q.row===z.row&&Math.abs(q.x-cellX(c.column))<100));
   const target=targets[i%Math.min(targets.length,2)];
   const row=target?.row??[0,1,2,3,4].find(row=>!threats.some(z=>z.row===row&&Math.abs(z.x-cellX(c.column))<110));
   if(row!==undefined){g.cowboy.select(c.row,c.column);g.cowboy.move(row);}

  }
  if(g.food>0&&(threats.length>=4||threats.some(z=>z.x<cellX(5)))){const p=g.plants.find(p=>p.kind==='electricpeashooter'&&p.action!=='food');if(p)g.plantFood(p.row,p.column);}
  return;
 }
 if(frame%12)return;
 if(g.level.day===27){
  for(const c of g.cowboy.carts.filter(c=>c.column<3)){const z=threats.find(z=>z.kind!=='chicken_farmer'&&z.row>=c.start&&z.row<=c.end&&z.x>cellX(c.column)+100&&!threats.some(q=>q.row===z.row&&Math.abs(q.x-cellX(c.column))<100));if(z){g.cowboy.select(c.row,c.column);g.cowboy.move(z.row);}else{const row=[0,1,2,3,4].find(r=>!threats.some(z=>z.row===r));if(row!==undefined){g.cowboy.select(c.row,c.column);g.cowboy.move(row);}}}
  for(const packet of [...g.conveyor]){
   if(packet.kind==='chilibean'){const z=[...threats].sort((a,b)=>(a.kind==='chicken_farmer'?-10000:0)-(b.kind==='chicken_farmer'?-10000:0)).find(z=>!['cowboy_gargantuar','piano','west_bull'].includes(z.kind)&&z.west?.poisonAt===undefined);if(z)g.plant(packet.kind,z.row,Math.max(6,Math.min(8,Math.floor((z.x-190)/82))),packet.id);}
   else if(packet.kind==='tallnut'){for(const row of [...new Set([...threats.map(z=>z.row),0,1,2,3,4])])if(g.plant(packet.kind,row,6,packet.id))break;}
   else{
    const positions=g.cowboy.carts.filter(c=>c.column<3).map(c=>({...c,p:g.plants.find(p=>p.column===c.column&&p.row===c.row)})).sort((a,b)=>(a.p?.heads??0)-(b.p?.heads??0));
    let planted=false;for(const c of positions)if(g.plant(packet.kind,c.row,c.column,packet.id)){planted=true;break;}
    if(!planted)for(let r=0;r<5;r++)if(g.plant(packet.kind,r,3,packet.id))break;
   }
  }
  if(g.food>0&&threats.some(z=>z.kind==='cowboy_gargantuar'||z.x<cellX(5.5))){const p=g.plants.find(p=>p.kind==='peapod'&&p.action!=='food'&&p.row===threats[0].row);if(p)g.plantFood(p.row,p.column);}
 }else if(g.level.day===29){
  for(const z of [...threats].sort((a,b)=>(a.kind==='prospector'?-1000:0)-(b.kind==='prospector'?-1000:0))){
   if(z.kind==='prospector'&&z.west!.ignited)g.plant('iceburg',z.row,Math.max(0,Math.min(8,Math.floor((z.x-190)/82))));
   if(z.x>cellX(5)&&z.x<cellX(z.kind==='prospector'?10:7)&&!g.western.shots.some(s=>s.kind==='magnifying_grass'&&Math.abs(s.y-(160+z.row*98+32))<10))g.western.fire(z.row,5);
   if(z.x<cellX(5))for(const c of [3,2,1])if(g.plant('splitpea',z.row,c))break;
  }
  for(const z of threats)if(z.x<cellX(7))g.plant('wallnut',z.row,6);
  for(let r=0;r<5;r++)for(const c of [0,1,2,3])if(g.plants.filter(p=>p.kind==='sunflower').length<5)g.plant('sunflower',r,c);
  for(let r=0;r<5;r++)for(const c of [0,1,2,3])g.plant('twinsunflower',r,c);
  if(g.food>0){const p=g.plants.find(p=>p.kind==='twinsunflower'&&p.action!=='food');if(p)g.plantFood(p.row,p.column);}
  for(const z of threats)if(z.kind==='piano')g.plant('spikeweed',z.row,Math.max(6,Math.min(8,Math.floor((z.x-190)/82))));

 }else {
  const columns=g.level.day===30?[3,4,5]:[1,3,4];
  if(!g.plants.some(p=>p.kind==='sunflower'))g.plant('sunflower',0,columns[0]);
  for(const r of [1,3])if(!g.plants.some(p=>p.row===r&&p.kind==='lightningreed'))g.plant('lightningreed',r,3);
  for(const z of threats){
   if(z.kind==='prospector'&&z.west!.ignited)g.plant('iceburg',z.row,Math.max(0,Math.min(8,Math.floor((z.x-190)/82))));
   if(z.kind==='piano')g.plant('spikeweed',z.row,Math.max(0,Math.min(8,Math.floor((z.x-190)/82))));
   if((z.kind==='cowboy_gargantuar'||z.x<cellX(3))&&z.x<cellX(8))g.plant('cherry_bomb',z.row,Math.max(0,Math.min(8,Math.floor((z.x-190)/82))));
  }
  for(const c of columns)for(let row=0;row<5;row++)if(g.plants.filter(p=>p.kind==='sunflower').length<5)g.plant('sunflower',row,c);
  for(const c of g.cowboy.carts){const z=threats.find(z=>z.x>cellX(c.column)+80);if(z){g.cowboy.select(c.row,c.column);g.cowboy.move(z.row);}if(c.column<5)g.plant(c.column===0?'lightningreed':'wintermelon',c.row,c.column);}
  for(const c of columns)for(let row=0;row<5;row++)if(g.plants.filter(p=>p.kind==='twinsunflower').length<3)g.plant('twinsunflower',row,c);
  if(g.food>0&&threats.length){const p=g.plants.find(p=>p.kind==='lightningreed'&&p.action!=='food');if(p)g.plantFood(p.row,p.column);}
 }
}
