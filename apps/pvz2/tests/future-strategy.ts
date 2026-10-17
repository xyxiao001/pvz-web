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
