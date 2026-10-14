// Normal gameplay commands only: no injected sun, entities, damage or wave skipping.
import {Game} from '../../src/game/model';
import {cellX,type PlantKind,type LevelId,type SurvivalScene} from '../../src/game/config';
export function run(level:LevelId,seed:number,scene?:SurvivalScene){
const g=new Game(level,seed,scene?'endless':'adventure',scene);const night=g.config.environment==='night'||g.config.environment==='fog',pool=g.config.rows.length===6;
const choices:PlantKind[]=night?(pool?['puffshroom','sunshroom','fumeshroom','lilypad','iceshroom','doomshroom']:['puffshroom','sunshroom','fumeshroom','gravebuster','hypnoshroom',level===18?'iceshroom':'doomshroom']):['sunflower','peashooter','lilypad','repeater','wallnut','cherrybomb'];
if(!pool&&!night)choices[2]='snowpea';
if(level===24){choices[3]='wallnut';choices[4]='tanglekelp';}
if(g.needsSeedChoice)for(const p of choices)g.chooseSeed(p);g.start();g.autoCollectSun=true;
const place=(kind:PlantKind,col:number,row:number)=>{if(g.waterRow(row)&&kind!=='lilypad'&&kind!=='tanglekelp'&&!g.plants.some(p=>p.row===row&&p.column===col&&p.kind==='lilypad')){if(g.canPlant('lilypad',col,row)){g.cancelSelection();g.select('lilypad');g.plant(col,row);}return false;}if(!g.canPlant(kind,col,row))return false;g.cancelSelection();g.select(kind);return g.plant(col,row);};
for(let t=0;t<160000&&g.phase==='playing';t++){
const enemies=g.zombies.filter(z=>!z.hypnotized&&z.health>=90).sort((a,b)=>a.x-b.x);
const rows=[...g.config.rows].sort((a,b)=>{const priority=(r:number)=>g.plants.filter(p=>p.row===r&&['puffshroom','peashooter','repeater','fumeshroom'].includes(p.kind)).length*500+(enemies.find(z=>z.row===r)?.x??900);return priority(a)-priority(b);});
if(g.hasConveyor){
 for(const packet of [...g.conveyor]){
  g.selectPacket(packet.id);let done=false;
  if(packet.kind==='gravebuster'){for(const grave of g.graves)if(g.plant(grave.column,grave.row)){done=true;break;}}
  else if(packet.kind==='iceshroom'||packet.kind==='doomshroom'||packet.kind==='hypnoshroom'){
   for(const z of enemies)if(z.x<670){for(let c=8;c>=0;c--)if(Math.abs(cellX(c)-z.x)<(packet.kind==='iceshroom'?800:packet.kind==='doomshroom'?180:60)&&g.plant(c,z.row)){done=true;break;}if(done)break;}
  }else for(const row of rows){for(const col of [3,2,1,0,4,5,6,7,8])if(g.plant(col,row)){done=true;break;}if(done)break;}
  if(!done)g.cancelSelection();
 }
}else if(night){
 for(const z of enemies)if((z.kind==='football'&&z.armor>0||z.kind==='dancer')&&z.x<640&&z.x>250)place('hypnoshroom',Math.floor((z.x-80)/80),z.row);
 for(const row of rows.filter(r=>!g.waterRow(r))){let done=false;for(const col of [6,5,7,4,8])if(place('puffshroom',col,row)){done=true;break;}if(done)break;}
 for(const col of pool?[0,1]:[0])for(const row of g.config.rows.filter(r=>!g.waterRow(r)))if(place('sunshroom',col,row))break;
 if(g.plants.filter(p=>p.kind==='sunshroom').length>=4){
  for(const row of rows)if(place('fumeshroom',pool?4:1,row))break;
  for(const row of rows)if(place('fumeshroom',2,row))break;
  for(const row of rows)if(place('fumeshroom',3,row))break;
  for(const grave of g.graves)if(place('gravebuster',grave.column,grave.row))break;
 }
 for(const z of enemies)if(z.x<300||enemies.filter(o=>Math.abs(o.row-z.row)<=2&&Math.abs(o.x-z.x)<150).length>10){for(let col=1;col<8;col++)if(Math.abs(cellX(col)-z.x)<180){if(g.sun>=125&&g.cooldowns.doomshroom===0&&g.plants.some(p=>p.column===col&&p.row===z.row&&p.kind!=='lilypad')){g.cancelSelection();g.toggleShovel();g.dig(col,z.row);}if(place('doomshroom',col,z.row))break;}}
 if((level===18||pool)&&enemies.some(z=>z.x<300))for(const row of rows)if(place('iceshroom',8,row))break;
}else{
 if(level===24)for(const z of enemies)if(!g.waterRow(z.row)&&z.x<650)place('wallnut',5,z.row);
 if(level===24)for(const z of enemies)if(g.waterRow(z.row)&&z.x<700&&z.x>200)for(let c=8;c>=0;c--)if(Math.abs(cellX(c)-z.x)<55&&place('tanglekelp',c,z.row))break;
 for(const z of enemies)if(z.x<650&&!g.plants.some(p=>p.row===z.row&&p.kind==='peashooter'))place('peashooter',2,z.row);
 if(g.plants.filter(p=>p.kind==='sunflower').length<10)for(const c of [0,1])for(const row of g.config.rows.filter(r=>!g.waterRow(r)))if(place('sunflower',c,row))break;
 for(const row of rows)if(!g.plants.some(p=>p.row===row&&p.kind==='peashooter'))place('peashooter',2,row);
 if(g.plants.filter(p=>p.kind==='peashooter').length>=g.config.rows.length){for(const row of rows){for(const c of [3,4,5,6])if(place(level===24?'peashooter':'repeater',c,row))break;place('wallnut',7,row);}}
 for(const z of enemies)if(z.x<330||z.x<610&&enemies.filter(o=>Math.abs(o.row-z.row)<=1&&Math.abs(o.x-z.x)<100).length>=5)for(let c=1;c<8;c++)if(Math.abs(cellX(c)-z.x)<110){if(g.sun>=150&&g.cooldowns.cherrybomb===0&&g.plants.some(p=>p.column===c&&p.row===z.row&&p.kind!=='lilypad')){g.cancelSelection();g.toggleShovel();g.dig(c,z.row);}if(place('cherrybomb',c,z.row))break;}
}
g.step();g.drainEvents();
}
return g;
}
