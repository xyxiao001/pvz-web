// A normal-input integration player: no resource, wave, health or cooldown edits.
import { playLate } from './late-adventure';
import { Game, headless } from '../../src/game/model';
import { cellX, type LevelId, type PlantKind } from '../../src/game/config';
const loadouts:Record<number,PlantKind[]>={
36:['sunshroom','puffshroom','splitpea','seashroom','lilypad','fumeshroom'],
37:['sunshroom','puffshroom','fumeshroom','seashroom','lilypad','doomshroom'],
38:['sunshroom','puffshroom','fumeshroom','seashroom','lilypad','tallnut'],
41:['sunflower','cabbagepult','cherrybomb','squash','tallnut','pumpkin'],
42:['sunflower','cabbagepult','flowerpot','cherrybomb','squash','tallnut'],
43:['sunflower','cabbagepult','flowerpot','kernelpult','cherrybomb','tallnut'],
44:['sunflower','cabbagepult','flowerpot','squash','cherrybomb','tallnut'],
};
export function playRoofAdventure(level:LevelId,seed:number,observe?:(g:Game)=>void){
 if(level===39)return playLate(level,seed,observe);
 const g=new Game(level,seed);for(const k of loadouts[level]??[])g.chooseSeed(k);g.start();g.autoCollectSun=true;
 const place=(kind:PlantKind,c:number,r:number)=>{
  if(!g.seeds.includes(kind))return false;
  if(g.waterRow(r)&&!['lilypad','seashroom'].includes(kind)&&!g.plants.some(p=>p.column===c&&p.row===r&&p.kind==='lilypad')){if(g.canPlant('lilypad',c,r)){g.cancelSelection();g.select('lilypad');g.plant(c,r);}return false;}
  if(g.config.environment==='roof'&&kind!=='flowerpot'&&!g.plants.some(p=>p.column===c&&p.row===r&&p.kind==='flowerpot')){if(g.canPlant('flowerpot',c,r)){g.cancelSelection();g.select('flowerpot');g.plant(c,r);}return false;}
  if(!g.canPlant(kind,c,r))return false;g.cancelSelection();g.select(kind);return g.plant(c,r);
 };
 for(let t=0;t<250000&&g.phase==='playing';t++){
  if(t%10===0){
   const foes=g.zombies.filter(z=>!z.hypnotized&&!headless(z)&&!z.underground&&!z.emergingIn).sort((a,b)=>a.x-b.x);
   const land=g.config.rows.filter(r=>!g.waterRow(r));
   const rows=[...g.config.rows].sort((a,b)=>{const score=(r:number)=>g.plants.filter(p=>p.row===r&&['cabbagepult','kernelpult','splitpea','fumeshroom','cactus','starfruit','chomper'].includes(p.kind)).length*900+(foes.find(z=>z.row===r)?.x??1000);return score(a)-score(b);});
   if(g.hasConveyor){
    for(const card of [...g.conveyor]){
     g.selectPacket(card.id);let done=false;
     const tryCells=(cs:number[],rs:readonly number[])=>{for(const r of rs){for(const c of cs)if(g.plant(c,r))return true;}return false;};
     if(card.kind==='lilypad')done=tryCells([0,1,2,3,4,5,6,7,8],[2,3]);
     else if(card.kind==='flowerpot')done=tryCells([3,4,5,6,7,8,2,1,0],rows);
     else if(card.kind==='blover'){if(foes.some(z=>z.flying&&z.x<700))done=tryCells([8,7,6,5,4,3,2,1,0],land);}
     else if(card.kind==='cherrybomb'){
      for(const z of foes.filter(z=>!z.bungee))if(z.x<300||foes.filter(o=>!o.bungee&&Math.abs(o.row-z.row)<=1&&Math.abs(o.x-z.x)<115).length>=3){for(const c of [5,4,3,2,1,6,7,8,0])if(Math.abs(cellX(c)-z.x)<110&&g.plant(c,z.row)){done=true;break;}if(done)break;}
     }else if(card.kind==='pumpkin'){
      const targets=g.plants.filter(p=>!['flowerpot','lilypad','pumpkin'].includes(p.kind)).sort((a,b)=>(foes.find(z=>z.row===a.row)?.x??1000)-(foes.find(z=>z.row===b.row)?.x??1000));
      for(const p of targets)if(g.plant(p.column,p.row)){done=true;break;}
     }else{const cols=card.kind==='seashroom'?[7,6,5,4,3,8]:card.kind==='magnetshroom'?[4,3,2,5]:card.kind==='chomper'?[3,2,4,1,5,0,6]:card.kind==='starfruit'?[3,4,2,5,1,6,0]:[2,1,3,0,4,5,6];done=tryCells(cols,rows);}
     if(!done)g.cancelSelection();
    }
   }else if(level<40){
    for(const r of land)for(const c of [6,5,7,4,8])if(place('puffshroom',c,r))break;
    for(const r of [2,3])for(const c of [7,6,5,4,8])if(place('seashroom',c,r))break;
    for(const c of [0,1])for(const r of land)if(place('sunshroom',c,r))break;
    if(g.plants.filter(p=>p.kind==='sunshroom').length>=4){
     for(const r of rows){const k=level===38||level===37||g.waterRow(r)?'fumeshroom':'splitpea';for(const c of [2,3,4])if(place(k,c,r))break;}
    }
    if(level===38)for(const r of land)place('tallnut',3,r);
    for(const z of foes)if(z.x<300||foes.filter(o=>Math.abs(o.row-z.row)<=2&&Math.abs(o.x-z.x)<150).length>8)for(let c=1;c<9;c++)if(Math.abs(cellX(c)-z.x)<180&&place('doomshroom',c,z.row))break;
   }else{
    for(const z of foes)if(!z.bungee&&z.x<750&&!g.plants.some(p=>p.row===z.row&&p.kind==='cabbagepult'))place('cabbagepult',2,z.row);
    if(!foes.some(z=>!z.bungee&&z.x<750&&!g.plants.some(p=>p.row===z.row&&p.kind==='cabbagepult'))||g.sun>=150)for(const c of [0,1])for(const r of land)if(place('sunflower',c,r))break;
    for(const r of rows)place('cabbagepult',2,r);
    if(g.plants.filter(p=>p.kind==='sunflower').length>=5){for(const r of rows)for(const c of [3,4])if(place('cabbagepult',c,r))break;for(const r of rows)place('kernelpult',6,r);}
    for(const z of foes)if(!z.bungee&&(z.x<420||z.kind==='football'&&z.x<600||z.pogo&&z.x<650)){
     for(const c of [4,3,2,1,5,6,7])if(z.x-cellX(c)>0&&z.x-cellX(c)<100&&place('squash',c,z.row))break;
     for(const c of [4,3,5,2])if(cellX(c)<z.x&&place('tallnut',c,z.row))break;
    }
    for(const z of foes)if(!z.bungee&&(z.x<270||foes.filter(o=>!o.bungee&&Math.abs(o.row-z.row)<=1&&Math.abs(o.x-z.x)<115).length>=5)){let done=false;for(const c of [5,4,3,2,1,6,7,0])if(Math.abs(cellX(c)-z.x)<110&&place('cherrybomb',c,z.row)){done=true;break;}if(!done&&g.sun>=150&&g.cooldowns.cherrybomb===0){const c=Math.max(0,Math.min(8,Math.round((z.x-80)/80)));if(g.plants.some(p=>p.kind==='flowerpot'&&p.column===c&&p.row===z.row)){g.cancelSelection();g.toggleShovel();g.dig(c,z.row);place('cherrybomb',c,z.row);}}}
   }
  }
  g.step();g.drainEvents();if(t%100===0)observe?.(g);
 }
 return g;
}
