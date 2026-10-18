import {cellX,BOARD} from '../src/game/level';
import type {Game} from '../src/game/model';
export function playDarkFifth(g:Game,frame:number){
 for(const s of [...g.suns])g.collect(s.id);for(const p of [...g.pickups])g.collectPickup(p.id);if(frame%12)return;
 const occupied=(r:number,c:number)=>g.plants.some(p=>p.row===r&&p.column===c&&p.kind!=='floawerPot'),threats=g.zombies.filter(z=>z.hp>0).sort((a,b)=>a.x-b.x);
 if(g.level.conveyor){
  for(const p of [...g.plants])if(p.kind==='chomper'&&p.sheep===undefined&&g.darkPlants.states.get(p.id)!.chews.length>=2&&p.action!=='food')g.shovel(p.row,p.column);
  for(const packet of [...g.conveyor]){
   if(packet.kind==='chomper'){let placed=false;for(const z of threats){const c=Math.max(0,Math.min(8,Math.floor((z.x-BOARD.left)/BOARD.cellWidth)-1));if(z.x<cellX(7)&&g.plant('chomper',z.row,c,packet.id)){placed=true;break;}}if(placed)continue;}
   const columns=packet.kind==='chomper'?[1,2,3,4,5]:packet.kind==='fumeshroom'?[1,0,2,3]:[0,1,2,3];
   const rows=[0,1,2,3,4].sort((a,b)=>g.plants.filter(p=>p.row===a&&p.kind===packet.kind).length-g.plants.filter(p=>p.row===b&&p.kind===packet.kind).length);
   let done=false;for(const r of rows){for(const c of columns)if(g.plant(packet.kind,r,c,packet.id)){done=true;break;}if(done)break;}
  }
  if(g.food>0){for(const z of threats){if(z.x>cellX(5)&&g.food<3)continue;const p=g.plants.filter(p=>p.row===z.row&&p.sheep===undefined&&p.action!=='food'&&(p.kind==='fumeshroom'||p.kind==='chomper')&&cellX(p.column)<z.x+20).sort((a,b)=>Number(b.kind==='fumeshroom')-Number(a.kind==='fumeshroom')||a.column-b.column)[0];if(p&&g.plantFood(p.row,p.column))break;}}
  return;
 }
 const preset=g.level.day===23,attack=preset||g.level.day===25?'scaredyshroom':'wintermelon',sun=preset?'sunflower':'sunshroom';
 for(const t of [...g.graves].sort((a,b)=>Number(b.kind==='gravestoneSunOnDestruction')-Number(a.kind==='gravestoneSunOnDestruction')||Number(b.kind==='gravestonePlantfoodOnDestruction')-Number(a.kind==='gravestonePlantfoodOnDestruction')||a.column-b.column))if(g.plant('gravebuster',t.row,t.column))break;
 if(g.level.day===21&&g.food>0&&threats.filter(z=>z.armor>=1000).length>=3){const m=g.plants.find(p=>p.kind==='magnetshroom'&&p.sheep===undefined&&p.action!=='food');if(m)g.plantFood(m.row,m.column);}
 for(let r=0;r<5;r++)if(!occupied(r,0))g.plant(sun,r,0);
 if(!preset&&g.plants.filter(p=>p.kind===sun).length>=3)for(const r of [1,3])if(!g.plants.some(p=>p.kind==='magnetshroom'&&p.row===r))for(const c of [1,2,0])if(g.plant('magnetshroom',r,c))break;
 for(const z of threats)if(!g.plants.some(p=>p.row===z.row&&p.kind===attack))for(const c of [2,1,3,0])if(g.plant(attack,z.row,c))break;
 for(const c of [0,1])for(let r=0;r<5;r++)if(!occupied(r,c))g.plant(sun,r,c);
 if(g.level.day===25&&threats.some(z=>z.kind.includes('wizard')))for(const p of [...g.plants])if((p.kind===attack||p.kind==='magnetshroom')&&!g.plants.some(q=>q.kind==='floawerPot'&&q.row===p.row&&q.column===p.column))g.plant('floawerPot',p.row,p.column);
 for(const c of (preset?[2,3,4]:[3,4,2,5]))for(let r=0;r<5;r++)if(!occupied(r,c))g.plant(attack,r,c);
 if(attack==='scaredyshroom'&&g.food>0&&(threats.some(z=>z.x<cellX(5.8))||g.food>=3&&threats.length>8)){const ps=g.plants.filter(p=>p.kind==='scaredyshroom'&&p.action!=='food'&&p.sheep===undefined).map(p=>({p,score:g.plants.filter(q=>q.kind===p.kind&&q.action!=='food'&&q.sheep===undefined&&Math.abs(q.row-p.row)<=1&&Math.abs(q.column-p.column)<=1).reduce((n,q)=>n+threats.filter(z=>z.row===q.row).length,0)})).sort((a,b)=>b.score-a.score);if(ps[0])g.plantFood(ps[0].p.row,ps[0].p.column);}

 if(preset){for(const r of [1,3,0,2,4])g.plant('magnetshroom',r,5);for(let r=0;r<5;r++){const p=g.plants.find(p=>p.kind==='sunflower'&&p.row===r&&p.column===1);if(p&&g.sun>500)g.shovel(r,1);if(!occupied(r,1)&&g.sun>300)g.plant('scaredyshroom',r,1);}}
 for(const z of threats){
  if(preset&&z.x<cellX(7))g.plant('iceburg',z.row,Math.max(0,Math.min(8,Math.floor((z.x-BOARD.left)/BOARD.cellWidth))));
  if(!preset&&z.x<cellX(4)){for(const c of [0,1,2,3,4,5,6,7,8])if(g.plant('hurrikale',z.row,c))break;}
  if(attack!=='scaredyshroom'&&g.food>0&&(z.x<cellX(5)||threats.filter(t=>t.row===z.row).length>=4)){const p=g.plants.find(p=>p.kind===attack&&p.row===z.row&&p.action!=='food'&&p.sheep===undefined);if(p)g.plantFood(p.row,p.column);}
 }
}
