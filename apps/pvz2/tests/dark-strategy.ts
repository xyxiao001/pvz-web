import type {Game} from '../src/game/model';
import {cellX} from '../src/game/level';
export function playDark(g:Game,frame:number){
 for(const s of [...g.suns])g.collect(s.id);
 for(const p of [...g.pickups])g.collectPickup(p.id);
 if(g.preparing){for(const c of [0,1])for(let r=0;r<5;r++)g.plant('laser_bean',r,c);if(g.level.day===15)for(let r=0;r<4;r++)g.plant('wallnut',r,3);g.startLastStand();}
 if(frame%12)return;
 const threats=g.zombies.filter(z=>z.hp>0).sort((a,b)=>a.x-b.x),occupied=(r:number,c:number)=>g.plants.some(p=>p.row===r&&p.column===c);
 if(g.level.day===12){
  const puff=g.plants.find(p=>p.kind==='puffshroom'&&p.sheep===undefined&&p.action!=='food');
  if(puff&&g.food>0&&g.westFinale.states.get(puff.id)!.life<15)g.plantFood(puff.row,puff.column);
  for(const t of [...g.graves].sort((a,b)=>Number(b.kind==='gravestonePlantfoodOnDestruction')-Number(a.kind==='gravestonePlantfoodOnDestruction')||a.column-b.column))if(g.plant('gravebuster',t.row,t.column))break;
 }
 if(g.level.day===11)for(const t of [...g.graves].sort((a,b)=>a.column-b.column))if(g.plant('gravebuster',t.row,t.column))break;
 if(g.level.day===14){
  for(const t of [...g.graves].sort((a,b)=>a.column-b.column))if(g.plant('gravebuster',t.row,t.column))break;
  for(const z of threats.filter(z=>!z.dark?.bean&&z.x<cellX(8))){const c=Math.floor((z.x-190)/82);if(c>=0&&c<9&&g.plant('sunbean',z.row,c)){if(g.food>0&&(z.armor>=1000||z.kind==='dark_gargantuar'))g.plantFood(z.row,c);break;}}
 }
 if(g.level.conveyor){
  for(const packet of [...g.conveyor]){
   if(packet.kind==='gravebuster'){for(const t of [...g.graves].sort((a,b)=>a.column-b.column))if(g.plant(packet.kind,t.row,t.column,packet.id))break;continue;}
   const rows=packet.kind==='hypnoshroom'?[...new Set(threats.filter(z=>z.x<cellX(7)).map(z=>z.row))]:[0,1,2,3,4].sort((a,b)=>g.plants.filter(p=>p.row===a&&p.kind===packet.kind).length-g.plants.filter(p=>p.row===b&&p.kind===packet.kind).length),columns=packet.kind==='hypnoshroom'?[4,3,5,2,6,1]:packet.kind==='puffshroom'?[4,3,5,2,6]:packet.kind==='peanut'?[4,5,6,3,7]:packet.kind==='wallnut'?[4,5,3,6]:packet.kind==='potatomine'?[5,6,4,7]:[0,1,2,3];
   let ok=false;for(const c of columns){for(const r of rows)if(g.plant(packet.kind,r,c,packet.id)){ok=true;break;}if(ok)break;}
  }
  if([10,13].includes(g.level.day)&&g.food>0){const z=threats.find(z=>z.x<cellX(4)||z.kind==='dark_gargantuar'&&z.x<cellX(6));if(z){const p=g.plants.find(p=>p.row===z.row&&p.kind==='fumeshroom'&&p.action!=='food');if(p)g.plantFood(p.row,p.column);}}
  for(const z of threats)if(g.food>0&&g.level.day===4){const p=g.plants.find(p=>p.kind==='hypnoshroom'&&!g.westFinale.states.get(p.id)!.empowered);if(p)g.plantFood(p.row,p.column);}
  return;
 }
 const attack=[6,11,15].includes(g.level.day)?'laser_bean':g.level.day>=5?'fumeshroom':'laser_bean';
 if(g.level.day<=3)for(let r=0;r<5;r++)if(!occupied(r,0))g.plant('sunflower',r,0);
 for(const z of threats)if(!g.plants.some(p=>p.row===z.row&&p.kind===attack))for(const c of [1,2,3])if(g.plant(attack,z.row,c))break;
 for(let r=0;r<5;r++)if(![6,14,15].includes(g.level.day)&&!occupied(r,0))g.plant(g.level.day<=3?'sunflower':'sunshroom',r,0);
 if(g.level.day===8){for(const t of [...g.graves].sort((a,b)=>a.column-b.column))if(g.plant('gravebuster',t.row,t.column))break;for(const z of threats)if(z.x<cellX(6)&&!z.dark?.bean)g.plant('sunbean',z.row,Math.max(3,Math.floor((z.x-190)/82)-1));}
 for(const c of (g.level.day===12?[2,3,4]:[1,2,3]))for(let r=0;r<5;r++)if(!occupied(r,c))g.plant(attack,r,c);
 for(const z of threats){
  if(z.x<cellX(5))g.plant('wallnut',z.row,4);
  if(g.level.day!==12&&g.level.day!==14&&g.food>0&&(z.x<cellX(5)||threats.filter(t=>t.row===z.row).length>=3)){const p=g.plants.find(p=>p.row===z.row&&p.kind===attack&&p.action!=='food');if(p)g.plantFood(p.row,p.column);}
 }
}
