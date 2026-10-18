import {cellX} from '../src/game/level';
import type {Game} from '../src/game/model';

export function playDarkFourth(g:Game,frame:number){
  for(const s of [...g.suns])g.collect(s.id);
  for(const p of [...g.pickups])g.collectPickup(p.id);
  if(frame%12)return;
  const occupied=(r:number,c:number)=>g.plants.some(p=>p.row===r&&p.column===c),threats=g.zombies.filter(z=>z.hp>0).sort((a,b)=>a.x-b.x);
  if(g.level.conveyor){
    for(const p of [...g.plants])if(p.kind==='magnetshroom'&&p.action!=='food')g.shovel(p.row,p.column);
    for(const packet of [...g.conveyor]){
      if(packet.kind==='magnetshroom'&&!['Summon','RushStart','FireStart','FireLoop'].includes(g.boss!.animation))continue;
      const columns=packet.kind==='fumeshroom'?[3,4,2,1,5]:packet.kind==='peanut'?[4,2,1,0]:packet.kind==='kernelpult'?[0,1,2]:packet.kind==='magnetshroom'?[0,1,2,3]:[5,4,3,2];
      const rows=[0,1,2,3,4].sort((a,b)=>g.plants.filter(p=>p.kind===packet.kind&&p.row===a).length-g.plants.filter(p=>p.kind===packet.kind&&p.row===b).length);
      let placed=false;for(const c of columns){for(const r of rows)if(g.plant(packet.kind,r,c,packet.id)){placed=true;break;}if(placed)break;}
    }
    if(g.food>0){
      const candidates=g.plants.filter(p=>p.kind==='fumeshroom'&&p.action!=='food'&&p.sheep===undefined).map(p=>({p,foes:threats.filter(z=>z!==g.boss!.zombie&&z.row===p.row&&z.x>cellX(p.column)-20)}));
      candidates.sort((a,b)=>b.foes.reduce((n,z)=>n+(z.hp+z.armor)*(z.x<cellX(5)?2:1),0)-a.foes.reduce((n,z)=>n+(z.hp+z.armor)*(z.x<cellX(5)?2:1),0));
      const best=candidates[0];if(best&&(best.foes.length>=3||best.foes.some(z=>z.x<cellX(best.p.column+1)||z.kind==='dark_gargantuar')||g.food>=3))g.plantFood(best.p.row,best.p.column);
    }
    return;
  }
  const preset=g.level.day===18,attack='fumeshroom';
  if(!preset){for(const z of threats){const near=threats.filter(t=>Math.abs(t.row-z.row)<=1&&Math.abs(t.x-z.x)<120);if(near.length>=4||z.x<cellX(4)||g.level.day===19&&[0,2,4].includes(z.row)&&z.x<cellX(7)){for(const c of [Math.floor((z.x-190)/82),Math.floor((z.x-190)/82)-1])if(c>=0&&c<9&&g.plant('cherry_bomb',z.row,c))break;}}}
  for(const z of threats)if(z.x<cellX(g.level.day===19?7:5))g.plant('iceburg',z.row,Math.max(0,Math.min(8,Math.floor((z.x-190)/82))));
  if(g.level.day===19)for(const z of threats)if([0,2,4].includes(z.row))g.plant('wallnut',z.row,6);
  if(!preset)for(const t of [...g.graves].sort((a,b)=>a.column-b.column))if(g.plant('gravebuster',t.row,t.column))break;
  for(const z of threats)if(!g.plants.some(p=>p.row===z.row&&p.kind===attack))for(const c of [2,3,4])if(g.plant(attack,z.row,c))break;
  for(const c of [0,1])for(let r=0;r<5;r++)if(!occupied(r,c))g.plant('sunshroom',r,c);
  for(const c of [2,3,4,5,6])for(let r=0;r<5;r++)if(!occupied(r,c))g.plant(attack,r,c);
  for(const z of threats){
    if(z.x<cellX(6)){if(preset)g.plant('peanut',z.row,5);else g.plant('wallnut',z.row,g.level.day===19?6:5);}
    if(g.food>0&&(z.x<cellX(5)||threats.filter(t=>t.row===z.row).length>=3||z.kind==='dark_king')){const p=g.plants.find(p=>p.row===z.row&&p.kind===attack&&p.action!=='food'&&p.sheep===undefined);if(p)g.plantFood(p.row,p.column);}
  }
}
