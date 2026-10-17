import type {Game} from '../src/game/model';
import {cellX,type PlantKind} from '../src/game/level';
export function setupCowboySeventh(g:Game){
 if(g.level.day===31)g.boosts=new Set(['shadowshroom']);
 if(g.level.day===32)g.boosts=new Set(['lightningreed']);
 if(g.level.day===33)g.boosts=new Set(['sunflower','lightningreed','iceburg']);
 if(g.level.day===34)g.boosts=new Set(['sunshroom','puffshroom']);
 if(g.level.day===35)g.boosts=new Set(['hypnoshroom','iceburg','electriccurrant']);
}
export function playCowboySeventh(g:Game,frame:number){
 if(frame%6)return;
 for(const s of [...g.suns])g.collect(s.id);for(const p of [...g.pickups])g.collectPickup(p.id);
 const day=g.level.day,live=g.zombies.filter(z=>z.hp>0),empty=(r:number,c:number)=>!g.plants.some(p=>p.hp>0&&p.row===r&&p.column===c),plant=(k:PlantKind,r:number,c:number)=>g.plant(k,r,c);
 if(day===31){
  for(const card of [...g.conveyor]){
   if(card.kind==='hurrikale'){
    const z=live.filter(z=>z.x<cellX(6)).sort((a,b)=>a.x-b.x)[0];if(z)for(const c of [8,0,4,5])if(g.plant(card.kind,z.row,c,card.id))break;continue;
   }
   const rows=[0,1,2,3,4].sort((a,b)=>live.filter(z=>z.row===b).length-live.filter(z=>z.row===a).length);
   for(const row of rows){let used=false;for(const col of card.kind==='shadowshroom'?[0,8,4,5]:card.kind==='celerystalker'?[8,5,4]:[8,4,5])if(g.plant(card.kind,row,col,card.id)){used=true;break;}if(used)break;}
  }
  if(g.food>0){const p=g.plants.find(p=>p.kind==='shadowshroom'&&p.action!=='food');if(p&&live.length)g.plantFood(p.row,p.column);}
 }else if(day===32){
  if(g.preparing)g.startLastStand();
  if(live.length&&frame%360===0)for(const [row,col] of [...g.cowboy.carts.filter(c=>c.column===0||c.column===2).map(c=>[c.row,c.column]),[1,4],[3,4],[2,4],[0,4],[4,4],[1,5],[3,5],[2,5],[0,5],[4,5]])if(plant('lightningreed',row,col))break;
  for(const c of g.cowboy.carts){if(!g.plants.some(p=>p.row===c.row&&p.column===c.column))continue;const z=live.filter(z=>z.x>cellX(c.column)&&z.row>=c.start&&z.row<=c.end).sort((a,b)=>a.x-b.x)[0];if(z){g.cowboy.select(c.row,c.column);g.cowboy.move(z.row);}}
  if(g.food>0&&live.some(z=>z.x<cellX(4))&&frame%480===0){const p=g.plants.find(p=>p.kind==='lightningreed'&&p.action!=='food');if(p)g.plantFood(p.row,p.column);}
 }else if(day===33){
  if(!g.plants.some(p=>p.kind==='sunflower'))plant('sunflower',2,0);
  for(const [r,c] of [[1,2],[3,2]])if(empty(r,c))plant('lightningreed',r,c);
  for(let r=0;r<5;r++)if(empty(r,0))plant('sunflower',r,0);
  for(const [r,c] of [[1,2],[3,2],[1,5],[3,5]])if(empty(r,c))plant('lightningreed',r,c);
  for(const z of live.filter(z=>z.x<cellX(6)))plant('iceburg',z.row,Math.min(8,Math.max(0,Math.floor((z.x-190)/82))));
  for(const row of [1,3,2,0,4])for(const col of [3,4,5,6,7])if(empty(row,col)&&live.length)plant('lightningreed',row,col);
  if(g.food>0&&live.some(z=>z.x<cellX(5))){const p=g.plants.find(p=>p.kind==='lightningreed'&&p.action!=='food');if(p)g.plantFood(p.row,p.column);}
 }else if(day===34){
  for(const c of g.cowboy.carts){const p=g.plants.find(p=>p.column===c.column&&p.row===c.row);if(p?.endangered){const unsafe=live.some(z=>z.row===c.row&&Math.abs(z.x-cellX(c.column))<220);if(unsafe){const safe=Array.from({length:c.end-c.start+1},(_,i)=>c.start+i).find(r=>!live.some(z=>z.row===r&&Math.abs(z.x-cellX(c.column))<240));if(safe!==undefined){g.cowboy.select(c.row,c.column);g.cowboy.move(safe);}}}}
  for(const row of [0,4,1,3,2])for(const col of [7,6])if(empty(row,col))plant('sunshroom',row,col);
  for(const row of [0,1,2,3,4])if(empty(row,8))plant('puffshroom',row,8);
  for(const c of g.cowboy.carts)if(empty(c.row,c.column))plant(c.column===0?'banana':'wintermelon',c.row,c.column);
  for(let r=0;r<5;r++)if(empty(r,5))plant('wintermelon',r,5);
  for(const p of g.plants.filter(p=>p.kind==='banana')){if(g.westFinale.select(p.row,p.column)){const z=live.sort((a,b)=>a.x-b.x)[0];if(z)g.westFinale.fire(z.row,Math.max(0,Math.min(8,Math.floor((z.x-190)/82))));else g.westFinale.cancel();}}
  if(g.food>0&&(live.some(z=>z.x<cellX(2))||g.food>1&&live.length>4)){const p=g.plants.find(p=>p.kind==='wintermelon'&&p.action!=='food');if(p)g.plantFood(p.row,p.column);}
 }else{
  for(const card of [...g.conveyor]){
   const rows=[0,1,2,3,4].sort((a,b)=>live.filter(z=>z.row===b&&z!==g.boss?.zombie).length-live.filter(z=>z.row===a&&z!==g.boss?.zombie).length);
   for(const row of rows){let used=false;for(const col of card.kind==='electriccurrant'?[0,6,4,1]:card.kind==='hypnoshroom'?[4,6,1,0]:card.kind==='wallnut'?[6,4,0,1]:card.kind==='spikeweed'?[1,4,6,0]:[6,4,1,0])if(g.plant(card.kind,row,col,card.id)){used=true;break;}if(used)break;}
  }
  if(g.food>0&&live.length>2){const p=g.plants.find(p=>p.kind==='iceburg'&&p.action!=='food');if(p)g.plantFood(p.row,p.column);}
 }
}
