// Integration player uses selected cards, real produced sun, planting and the shovel only.
import { Game, headless } from '../../src/game/model';
import { cellX, isNight, type PlantKind, type SurvivalMode, type SurvivalScene } from '../../src/game/config';
export function playFinite(mode: Exclude<SurvivalMode,'endless'>, scene: SurvivalScene, seed: number) {
  const g=new Game(9,seed,mode,scene), night=isNight(scene), roof=scene==='roof', pool=scene==='pool'||scene==='fog';
  const producer:PlantKind=night?'sunshroom':'sunflower', shooter:PlantKind=roof?'cabbagepult':night?'fumeshroom':'peashooter';
  const loadout:PlantKind[]=[producer,shooter,'melonpult','wintermelon','cherrybomb','jalapeno','blover',night?'hypnoshroom':'squash'];
  if(pool)loadout.push('lilypad',night?'puffshroom':'tallnut');
  else if(roof)loadout.push('flowerpot','umbrella');
  else if(night)loadout.push('puffshroom','gravebuster');
  else loadout.push('snowpea','tallnut');
  for(const kind of loadout)g.chooseSeed(kind);g.start();g.autoCollectSun=true;
  const occupied=(c:number,r:number)=>g.plants.find(p=>p.column===c&&p.row===r&&!['lilypad','flowerpot','pumpkin'].includes(p.kind));
  const place=(kind:PlantKind,c:number,r:number)=>{
    if(!g.seeds.includes(kind)||g.cooldown(kind)>0)return false;
    if(kind!=='blover'&&g.zombies.some(z=>z.flying&&z.x<650)&&g.sun<g.plantCost(kind)+100)return false;
    if(roof&&['melonpult','wintermelon','umbrella'].includes(kind)&&g.survivalEnemies.includes('jack')&&g.sun<g.plantCost(kind)+150)return false;
    if(['melonpult','wintermelon','tallnut'].includes(kind)&&g.survivalEnemies.includes('balloon')&&g.sun<g.plantCost(kind)+100)return false;
    const base=roof?'flowerpot':g.waterRow(r)?'lilypad':null;
    if(base&&!g.plants.some(p=>p.kind===base&&p.column===c&&p.row===r)){
      if(g.sun<g.plantCost(kind)+g.plantCost(base)||!g.canPlant(base,c,r))return false;
      g.cancelSelection();g.select(base);g.plant(c,r);
    }
    if(!g.canPlant(kind,c,r))return false;g.cancelSelection();g.select(kind);return g.plant(c,r);
  };
  const clear=(c:number,r:number)=>{if(occupied(c,r)){g.cancelSelection();g.toggleShovel();g.dig(c,r);}};
  let transitions=0;
  for(let t=0;t<650000&&g.phase!=='won'&&g.phase!=='lost';t++){
    if(g.phase==='intermission'){transitions++;g.nextSurvivalStage();g.start();}
    if(t%10===0){
      const enemies=g.zombies.filter(z=>!z.hypnotized&&!headless(z)&&!z.bungee&&!z.flight&&!z.underground).sort((a,b)=>a.x-b.x);
      const rows=[...g.config.rows].sort((a,b)=>{
        const value=(r:number)=>g.plants.filter(p=>p.row===r&&[shooter,'melonpult','wintermelon','snowpea'].includes(p.kind)).reduce((n,p)=>n+(p.kind==='wintermelon'?4:p.kind==='melonpult'?3:1),0)*1000+(enemies.find(z=>z.row===r)?.x??1000);
        return value(a)-value(b);
      });
      if(enemies.some(z=>z.flying&&z.x<450))for(const r of rows)for(const c of [8,7,6,5])if(place('blover',c,r))break;
      for(const z of enemies){
        if(night&&['football','dancer','bucket'].includes(z.kind)&&!z.hypnotized&&z.x<600&&z.x>160&&g.sun>=75&&g.cooldown('hypnoshroom')===0){const c=Math.floor((z.x-80)/80);if(g.plants.some(p=>p.column===c&&p.row===z.row&&p.kind==='puffshroom'))clear(c,z.row);place('hypnoshroom',c,z.row);}
        const heavy=['gargantuar','zomboni','catapult','jack'].includes(z.kind),crowd=enemies.filter(o=>Math.abs(o.row-z.row)<=1&&Math.abs(o.x-z.x)<115).length;
        if(heavy&&z.x<720||z.x<300||crowd>=6&&z.x<500){
          if(g.sun>=125&&g.cooldown('jalapeno')===0){let done=false;for(const c of [8,7,6,5,4,3,2,1,0])if(place('jalapeno',c,z.row)){done=true;break;}if(!done){clear(0,z.row);place('jalapeno',0,z.row);}}
          if(g.sun>=150&&g.cooldown('cherrybomb')===0){let done=false;for(const r of rows.filter(r=>Math.abs(r-z.row)<=1)){for(const c of [6,5,4,3,2,1,7,8,0])if(Math.abs(cellX(c)-z.x)<110&&place('cherrybomb',c,r)){done=true;break;}if(done)break;}if(!done){const c=Math.max(0,Math.min(8,Math.round((z.x-80)/80)));clear(c,z.row);place('cherrybomb',c,z.row);}}
        }
        if(z.x<400||heavy&&z.x<700)for(const c of [6,5,4,3,2,1,0])if(Math.abs(cellX(c)-z.x)<85&&place('squash',c,z.row))break;
      }
      if(night)for(const r of rows.filter(r=>!g.waterRow(r)))for(const c of [6,7,5,8])if(place('puffshroom',c,r))break;
      for(const z of enemies)if(scene!=='fog'&&z.x<700&&!g.plants.some(p=>p.row===z.row&&p.kind===shooter))place(shooter,2,z.row);
      const unguarded=enemies.some(z=>z.x<650&&!g.plants.some(p=>p.row===z.row&&[shooter,'melonpult','wintermelon'].includes(p.kind)));
      if(scene==='fog'||!unguarded||g.sun>=150)for(const c of [0,1])for(const r of rows.filter(r=>!g.waterRow(r))){if(roof&&c===1&&[1,3].includes(r))continue;place(producer,c,r);}
      for(const r of rows){if(scene!=='fog'||g.plants.filter(p=>p.kind===producer).length>=4)place(shooter,scene==='fog'?4:2,r);if(night&&g.plants.filter(p=>p.kind===producer).length>=4)place(shooter,3,r);}
      if(g.plants.filter(p=>p.kind===producer).length>=4){
        if(roof&&g.wave>=5)for(const r of [1,3])place('umbrella',1,r);
        if(scene==='night'&&g.sun>=150)for(const grave of g.graves)if(place('gravebuster',grave.column,grave.row))break;
        for(const r of rows){
          if(g.plants.some(p=>p.kind==='melonpult'&&p.row===r&&p.column===(night?4:3)))place('wintermelon',night?4:3,r);
          for(const c of night?[4,5]:[3,4,5])place('melonpult',c,r);
          if(!night&&!roof)place('tallnut',7,r);
        }
      }
    }
    g.step();g.drainEvents();
  }
  return { game:g, transitions };
}
