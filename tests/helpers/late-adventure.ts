// Integration player: uses only public select/plant/dig/collect/pause commands.
import { Game, headless } from '../../src/game/model';
import { cellX, type LevelId, type PlantKind } from '../../src/game/config';
const loadouts:Record<number,PlantKind[]>={
 26:['sunflower','lilypad','peashooter','squash','cherrybomb','jalapeno'],
 27:['sunflower','lilypad','peashooter','spikeweed','squash','jalapeno'],
 28:['sunflower','lilypad','peashooter','torchwood','squash','tanglekelp'],
 29:['sunflower','lilypad','peashooter','squash','spikeweed','tallnut'],
 31:['sunshroom','puffshroom','fumeshroom','seashroom','lilypad','doomshroom'],
 32:['sunshroom','puffshroom','fumeshroom','seashroom','lilypad','doomshroom'],
 33:['sunshroom','puffshroom','cactus','seashroom','lilypad','doomshroom'],
 34:['sunshroom','puffshroom','fumeshroom','blover','lilypad','seashroom'],
 39:['sunshroom','puffshroom','fumeshroom','blover','lilypad','seashroom'],
};
export function playLate(level:LevelId,seed:number,observe?: (g:Game)=>void){
 const g=new Game(level,seed);if(g.needsSeedChoice)for(const kind of loadouts[level])g.chooseSeed(kind);g.start();g.autoCollectSun=true;
 const place=(kind:PlantKind,col:number,row:number)=>{
  if(!g.seeds.includes(kind))return false;
  if(g.waterRow(row)&&!['lilypad','seashroom','tanglekelp'].includes(kind)&&!g.plants.some(p=>p.kind==='lilypad'&&p.column===col&&p.row===row)){
   if(g.canPlant('lilypad',col,row)){g.cancelSelection();g.select('lilypad');g.plant(col,row);}return false;
  }
  if(!g.canPlant(kind,col,row))return false;g.cancelSelection();g.select(kind);return g.plant(col,row);
 };
 for(let t=0;t<220000&&g.phase==='playing';t++){
  if(t%10===0){
   const enemies=g.zombies.filter(z=>!z.hypnotized&&!headless(z)).sort((a,b)=>a.x-b.x);
   const land=g.config.rows.filter(r=>!g.waterRow(r));
   if(level===39)land.sort((a,b)=>{const score=(r:number)=>g.plants.filter(p=>p.row===r&&p.kind==='puffshroom').length*500+(enemies.find(z=>z.row===r)?.x??1000);return score(a)-score(b);});
   const rows=[...g.config.rows].sort((a,b)=>{
    const score=(r:number)=>g.plants.filter(p=>p.row===r&&['peashooter','repeater','fumeshroom','cactus','threepeater'].includes(p.kind)).length*800+(enemies.find(z=>z.row===r)?.x??1000);return score(a)-score(b);
   });
   if(g.hasConveyor){
    for(const packet of [...g.conveyor]){
     g.selectPacket(packet.id);let done=false;
     if(packet.kind==='lilypad'){for(const col of [0,1,2,3,4,5,6,7,8]){for(const row of [2,3])if(g.plant(col,row)){done=true;break;}if(done)break;}}
     else if(packet.kind==='jalapeno'){for(const z of enemies)if(z.x<450||z.kind==='zomboni'&&z.x<650||enemies.filter(e=>e.row===z.row).length>5){for(const c of [8,7,6,5,4,3,2,1,0])if(g.plant(c,z.row)){done=true;break;}if(done)break;}}
     else if(packet.kind==='tanglekelp'){for(const z of enemies)if(g.waterRow(z.row)&&z.x<740&&z.x>150)for(let c=8;c>=1;c--)if(Math.abs(cellX(c)-z.x)<55&&g.plant(c,z.row)){done=true;break;}}
     else if(packet.kind==='squash'){for(const z of enemies)if(z.x<600&&z.x>100){for(let c=1;c<8;c++)if(Math.abs(cellX(c)-z.x)<90&&g.plant(c,z.row)){done=true;break;}if(done)break;}}
     else {const columns=packet.kind==='threepeater'?[0,1,2,3,4]:packet.kind==='torchwood'?[5,6]:packet.kind==='spikeweed'?[8,7,6]:[7,8,6];for(const row of rows){for(const col of columns)if(g.plant(col,row)){done=true;break;}if(done)break;}}
     if(!done)g.cancelSelection();
    }
   }else if(level<30){
    for(const z of enemies){
     if(z.kind==='zomboni'&&z.x<740&&g.seeds.includes('spikeweed'))for(let c=8;c>=2;c--)if(cellX(c)<z.x&&z.x-cellX(c)<120&&place('spikeweed',c,z.row))break;
     if(g.waterRow(z.row)&&z.x<700&&z.x>180&&g.seeds.includes('tanglekelp'))for(let c=8;c>=1;c--)if(Math.abs(cellX(c)-z.x)<55&&place('tanglekelp',c,z.row))break;
     if(z.x<450||z.kind==='zomboni'&&z.x<660){for(let c=1;c<8;c++)if(Math.abs(cellX(c)-z.x)<90&&place('squash',c,z.row))break;}
     if(z.kind==='zomboni'&&z.x<600||z.kind==='bobsled'&&z.x<650||z.x<300||enemies.filter(e=>e.row===z.row&&e.x<620).length>=5){
      let done=false;for(let c=8;c>=0;c--)if(place('jalapeno',c,z.row)){done=true;break;}
      if(!done&&g.sun>=125&&g.cooldowns.jalapeno===0&&g.seeds.includes('jalapeno')){g.cancelSelection();g.toggleShovel();g.dig(1,z.row);place('jalapeno',1,z.row);}
     }
    }
    const shooter='peashooter';
    for(const z of enemies)if(z.x<670&&!g.plants.some(p=>p.row===z.row&&p.kind===shooter))place(shooter,2,z.row);
    for(const col of [0,1])for(const row of land)if(place('sunflower',col,row))break;
    for(const row of rows)place(shooter,2,row);
    if(g.plants.filter(p=>p.kind==='sunflower').length>=5 && (level!==26||g.wave<9||g.sun>=225)){
     for(const row of rows){for(const col of [3,4,5])if(place(shooter,col,row))break;}
     if(level===28||level===29)for(const row of rows)place('torchwood',6,row);
     if(level===29)for(const row of rows)place('tallnut',7,row);
    }
    for(const z of enemies)if(z.x<330||enemies.filter(e=>Math.abs(e.row-z.row)<=1&&Math.abs(e.x-z.x)<100).length>5)for(let c=1;c<8;c++)if(Math.abs(cellX(c)-z.x)<110&&place('cherrybomb',c,z.row))break;
   }else{
    if((level===34||level===39)&&enemies.some(z=>z.flying&&z.x<760))for(const row of land)if(place('blover',8,row))break;
    if(level===33)for(const z of enemies.filter(z=>z.flying))if(!g.plants.some(p=>p.kind==='cactus'&&p.row===z.row))place('cactus',2,z.row);
    for(const row of land)for(const col of (level===34||level===39)?[6,5,7,4]:[6,5,7,4,8])if(place('puffshroom',col,row))break;
    for(const row of [2,3])for(const col of level===39?[7,6,8]:[7,6,5,4,8])if(place('seashroom',col,row))break;
    const producer='sunshroom';
    if(level!==33||!enemies.some(z=>z.flying&&!g.plants.some(p=>p.kind==='cactus'&&p.row===z.row))||g.sun>=175)for(const col of [0,1])for(const row of land)if(place(producer,col,row))break;
    if(g.plants.filter(p=>p.kind===producer).length>=4){

     if((level===34||level===39))for(const row of [2,3])if(!g.plants.some(p=>p.row===row&&p.kind==='fumeshroom'))place('fumeshroom',3,row);
     for(const row of rows)if((level!==34&&level!==39)||g.sun>=175)for(const col of level===39&&g.waterRow(row)?[4,3,2,5]:[3,2,4])if(place('fumeshroom',col,row))break;
    }
    if((level===34||level===39)&&enemies.some(z=>z.flying&&z.x<650))for(const row of land)if(place('blover',8,row))break;
    if((level===34||level===39))for(const z of enemies)if(g.waterRow(z.row)&&z.x<700&&z.x>180)for(let c=8;c>=1;c--)if(Math.abs(cellX(c)-z.x)<55&&place('tanglekelp',c,z.row))break;
    for(const z of enemies)if((level!==33||!enemies.some(o=>o.flying&&!g.plants.some(p=>p.kind==='cactus'&&p.row===o.row)))&&(z.x<320||enemies.filter(o=>Math.abs(o.row-z.row)<=2&&Math.abs(o.x-z.x)<150).length>8))for(let c=1;c<9;c++)if(Math.abs(cellX(c)-z.x)<180&&place('doomshroom',c,z.row))break;
   }
  }
  g.step();g.drainEvents();if(t%100===0)observe?.(g);
 }
 return g;
}

export function playVases(seed:number){
 const g=new Game(35,seed);g.start();let nextOpen=0;
 for(let t=0;t<160000 && g.phase!=='won'&&g.phase!=='lost';t++){
  if(g.phase==='intermission'){g.nextVaseStage();g.start();nextOpen=t+100;}
  if(t%10===0){
   const foes=g.zombies.filter(z=>!z.hypnotized&&!headless(z)).sort((a,b)=>a.x-b.x);
   for(const drop of [...g.seedDrops]){
    let done=false;g.selectDrop(drop.id);
    if(drop.kind==='squash'||drop.kind==='hypnoshroom'){
     for(const z of foes)if(z.x<650 && (z.armor>0||z.kind==='dancer'||z.x<420||drop.remaining<500)){
      for(let c=0;c<9;c++)if(z.x-cellX(c)>0 && z.x-cellX(c)<(drop.kind==='squash'?90:35)&&g.plant(c,z.row)){done=true;break;}
      if(done)break;
     }
     if(!done&&drop.remaining<300){const rows=[...g.config.rows].sort((a,b)=>g.plants.filter(p=>p.row===a).length-g.plants.filter(p=>p.row===b).length);for(const row of rows){for(const col of [3,2,4,5])if(g.plant(col,row)){done=true;break;}if(done)break;}}
    }else{
     const rows=[...g.config.rows].sort((a,b)=>{const score=(r:number)=>g.plants.filter(p=>p.row===r&&['peashooter','snowpea'].includes(p.kind)).length*1000+(foes.find(z=>z.row===r)?.x??900);return score(a)-score(b);});
     for(const row of rows){for(const col of [1,0,2,3])if(g.plant(col,row)){done=true;break;}if(done)break;}
    }
    if(!done)g.cancelSelection();
   }
   if(t>=nextOpen){
    const pots=[...g.vases].sort((a,b)=>Number(b.green)-Number(a.green)||a.column-b.column||g.zombies.filter(z=>!z.hypnotized&&z.row===a.row).length-g.zombies.filter(z=>!z.hypnotized&&z.row===b.row).length);
    if(pots.length && (foes.length<3 || g.seedDrops.length===0&&g.plants.length<5)){
     g.cancelSelection();g.openVase(pots[0].column,pots[0].row);nextOpen=t+(foes.length?400:50);
    }
   }
  }
  g.step();g.drainEvents();
 }
 return g;
}
