import type {Game} from '../src/game/model';
import {cellX} from '../src/game/level';
export function playCowboy(g:Game,frame:number){
 for(const s of [...g.suns])g.collect(s.id);
 for(const p of [...g.pickups])g.collectPickup(p.id);
 if(g.level.corral){
  const targets=g.zombies.filter(z=>z.hp>0).sort((a,b)=>(a.kind==='prospector'?-10000:0)-(b.kind==='prospector'?-10000:0)+a.x-b.x);
  const carts=[...g.cowboy.carts].sort((a,b)=>(a.end-a.start)-(b.end-b.start));
  const assigned=new Map<number,number>();
  for(const c of carts){
   if(g.plants.some(p=>p.row===c.row&&p.column===c.column&&p.action==='food')){const strongest=targets.filter(z=>z.row>=c.start&&z.row<=c.end&&z.x>cellX(c.column)+40).sort((a,b)=>b.hp+b.armor-a.hp-a.armor)[0];if(strongest){g.cowboy.select(c.row,c.column);g.cowboy.move(strongest.row);}continue;}
   const target=targets.filter(z=>z.row>=c.start&&z.row<=c.end&&z.x>cellX(c.column)+40).sort((a,b)=>{const score=(z:typeof a)=>z.x+(c.end-c.start===1&&z.row===(c.column===0?c.start:c.end)?-30000:0)+(assigned.get(z.row)??0)*5000+(z.row===2?-20000:0)+(z.hp+z.armor)*.1+(z.kind==='prospector'?(assigned.get(z.row)??0)<2?-10000:10000:0);return score(a)-score(b);})[0];
   if(target){g.cowboy.select(c.row,c.column);g.cowboy.move(target.row);if(g.plants.some(p=>p.row===c.row&&p.column===c.column))assigned.set(c.row,(assigned.get(c.row)??0)+1);}
   else if(g.zombies.some(z=>z.row===c.row&&Math.abs(z.x-cellX(c.column))<80)){for(let row=c.start;row<=c.end;row++)if(!g.zombies.some(z=>z.row===row&&Math.abs(z.x-cellX(c.column))<80)){g.cowboy.select(c.row,c.column);g.cowboy.move(row);break;}}
  }
  const packet=g.conveyor[0];
  if(packet){const cart=[...g.cowboy.carts].sort((a,b)=>(b.end-b.start)-(a.end-a.start)||b.column-a.column).find(c=>!g.plants.some(p=>p.row===c.row&&p.column===c.column));if(cart)g.plant(packet.kind,cart.row,cart.column,packet.id);else {const cart=g.cowboy.carts.find(c=>c.column===3)!;g.shovel(cart.row,cart.column);g.plant(packet.kind,cart.row,cart.column,packet.id);}}
  if(g.food>0){const target=g.zombies.find(z=>z.kind==='piano');if(target){const c=g.cowboy.carts.find(c=>c.start===0&&c.end===4&&g.plants.some(p=>p.row===c.row&&p.column===c.column));if(c){g.cowboy.select(c.row,c.column);g.cowboy.move(target.row);g.plantFood(c.row,c.column);}}}
  return;
 }
 if(frame%12)return;
 const occupied=(r:number,c:number)=>g.plants.some(p=>p.row===r&&p.column===c);
 const attackers=(r:number)=>g.plants.filter(p=>p.row===r&&['peashooter','repeater'].includes(p.kind));
 const threats=[...g.zombies].filter(z=>z.hp>0).sort((a,b)=>a.x-b.x);
 for(const z of threats){
  if(z.kind==='prospector'&&z.west!.ignited&&g.sun>=0&&g.cooldowns.iceburg===0){const c=Math.floor((z.x-170)/82);if(c>=0&&c<9)g.plant('iceburg',z.row,c);}
  if(!attackers(z.row).length)for(const c of [3,4,5])if(g.plant('peashooter',z.row,c))break;
  if(z.x<cellX(5))g.plant('wallnut',z.row,5);
  if(g.food>0&&z.x<cellX(5)){const p=attackers(z.row)[0];if(p)g.plantFood(p.row,p.column);}
 }
 for(let r=0;r<5;r++)if(!g.plants.some(p=>p.kind==='sunflower'&&p.row===r))for(const c of [0,1,2])if(g.plant('sunflower',r,c))break;
 for(let r=0;r<5;r++)for(const c of [3,4])if(!occupied(r,c)){if(g.plant(c===3?'peashooter':'repeater',r,c))break;}
 for(let r=0;r<5;r++)if(!occupied(r,2)&&g.sun>=250)g.plant('sunflower',r,2);
 for(const z of threats)if(z.kind==='piano')g.plant('spikeweed',z.row,Math.min(8,Math.max(0,Math.floor((z.x-170)/82))));
}

export function playCowboyNext(g:Game,frame:number){
 for(const s of [...g.suns])g.collect(s.id);
 for(const p of [...g.pickups])g.collectPickup(p.id);
 if(g.preparing){
  for(const row of [0,1,2,3,4]){g.plant('snapdragon',row,4);g.plant('spikeweed',row,5);g.plant('wallnut',row,6);}
  g.startLastStand();return;
 }
 if(frame%12)return;
 const occupied=(r:number,c:number)=>g.plants.some(p=>p.row===r&&p.column===c);
 const threats=g.zombies.filter(z=>z.hp>0&&!z.leap).sort((a,b)=>a.x-b.x);
 if(g.level.day===8){
  for(const c of g.cowboy.carts){const z=threats.filter(z=>z.row>=c.start&&z.row<=c.end&&z.x>cellX(c.column)).sort((a,b)=>a.x-b.x)[0];if(z){g.cowboy.select(c.row,c.column);g.cowboy.move(z.row);}}
  for(const packet of [...g.conveyor]){
   if(packet.kind==='peapod'){
    const rows=[...new Set([...threats.map(z=>z.row),0,1,2,3,4])];
    const positions=rows.flatMap(row=>[0,1,2,3].map(column=>({row,column,p:g.plants.find(p=>p.row===row&&p.column===column)}))).filter(c=>g.cowboy.canPlant(c.row,c.column)&&(!c.p||c.p.kind==='peapod'&&c.p.heads!<5)).sort((a,b)=>(a.p?.heads??0)-(b.p?.heads??0));
    for(const p of positions)if(g.plant(packet.kind,p.row,p.column,packet.id))break;
   }else if(packet.kind==='wallnut'){for(const row of [...new Set([...threats.map(z=>z.row),0,1,2,3,4])])if(g.plant(packet.kind,row,6,packet.id))break;}
   else if(packet.kind==='chilibean'){const z=threats.find(z=>z.kind!=='cowboy_gargantuar'&&z.kind!=='piano');if(z)g.plant(packet.kind,z.row,Math.max(0,Math.min(8,Math.floor((z.x-190)/82))),packet.id);}
   else {for(let row=0;row<5;row++)if(g.plant(packet.kind,row,3,packet.id))break;}
  }
 }else if(g.level.day===6){
  for(const z of threats)if(z.kind==='piano')g.plant('spikeweed',z.row,Math.min(8,Math.max(0,Math.floor((z.x-190)/82))));
 }else if(g.level.day===9){
  for(const z of threats){
   if(!g.plants.some(p=>p.row===z.row&&p.kind==='splitpea'))for(const c of [3,2,4])if(g.plant('splitpea',z.row,c))break;
   if(z.x<cellX(6))g.plant('wallnut',z.row,6);
   if(z.x<cellX(5))g.plant('chilibean',z.row,Math.max(0,Math.floor((z.x-190)/82)));
  }
  for(let row=0;row<5;row++)for(const c of [0,1])if(!occupied(row,c)&&g.plant('sunflower',row,c))break;
  for(let row=0;row<5;row++)if(!occupied(row,2))g.plant('lightningreed',row,2);
  for(let row=0;row<5;row++)if(!occupied(row,4))g.plant('wintermelon',row,4);
 }else {
  playCowboy(g,frame);
  if(g.level.day===10)for(let row=0;row<5;row++)if(!occupied(row,1))g.plant('lightningreed',row,1);
 }
 if(g.food>0){const target=threats.find(z=>z.kind==='cowboy_gargantuar'||z.x<cellX(5));if(target){const p=g.plants.find(p=>p.row===target.row&&['peapod','splitpea','repeater','snapdragon','lightningreed'].includes(p.kind));if(p)g.plantFood(p.row,p.column);}}
}

export function playCowboyThird(g:Game,frame:number){
 for(const s of [...g.suns])g.collect(s.id);
 for(const p of [...g.pickups])g.collectPickup(p.id);
 const threats=g.zombies.filter(z=>z.hp>0&&!z.leap).sort((a,b)=>a.x-b.x);
 if(g.level.day===11){
  const cart=g.cowboy.carts[0],target=threats[0];
  if(target){g.cowboy.select(cart.row,cart.column);g.cowboy.move(target.row);}
  if(g.sunSpent<500)g.plant('peapod',cart.row,cart.column);
  if(target&&g.food>0&&(target.x<cellX(5)||threats.filter(z=>z.row===cart.row).length>=3))g.plantFood(cart.row,cart.column);
  return;
 }
 if(g.level.corral){
  for(const c of g.cowboy.carts){
   const plant=g.plants.find(p=>p.row===c.row&&p.column===c.column);
   const z=threats.filter(z=>z.row>=c.start&&z.row<=c.end&&z.x>cellX(c.column)+40).sort((a,b)=>a.x-b.x+(a.row===2?-10000:0)-(b.row===2?-10000:0))[0];
   if(plant?.kind==='lightningreed'){
    g.cowboy.select(c.row,c.column);g.cowboy.move(c.start===0?1:3);
   }else if(z){g.cowboy.select(c.row,c.column);g.cowboy.move(z.row);}
   if(threats.some(z=>z.row===c.row&&Math.abs(z.x-cellX(c.column))<75)){
    for(let row=c.start;row<=c.end;row++)if(!threats.some(z=>z.row===row&&Math.abs(z.x-cellX(c.column))<75)){g.cowboy.select(c.row,c.column);g.cowboy.move(row);break;}
   }
  }
  const packet=g.conveyor[0];
  if(packet){
   const preferred=g.cowboy.carts.filter(c=>packet.kind==='lightningreed'?c.column===0:c.column!==0);
   const ordered=[...preferred].sort((a,b)=>(b.end-b.start)-(a.end-a.start));
   const empty=ordered.find(c=>!g.plants.some(p=>p.row===c.row&&p.column===c.column)),c=empty??ordered[0];
   if(!empty)g.shovel(c.row,c.column);
   g.plant(packet.kind,c.row,c.column,packet.id);
  }
  return;
 }
 if(frame%12)return;
 const occupied=(r:number,c:number)=>g.plants.some(p=>p.row===r&&p.column===c);
 for(const z of threats){
  if(!g.plants.some(p=>p.row===z.row&&p.kind==='lightningreed'))for(const c of [3,2,1,0])if(g.plant('lightningreed',z.row,c))break;
  if(z.x<cellX(6))g.plant('wallnut',z.row,6);
  if(z.kind==='prospector'&&z.west!.ignited)g.plant('iceburg',z.row,Math.max(0,Math.min(8,Math.floor((z.x-170)/82))));
  if(z.kind==='piano')g.plant('spikeweed',z.row,Math.max(0,Math.min(8,Math.floor((z.x-170)/82))));
 }
 for(let row=0;row<5;row++)for(const c of [0,1,2])if(!g.plants.some(p=>p.kind==='sunflower'&&p.row===row)&&g.plant('sunflower',row,c))break;
 for(let row=0;row<5;row++)if(!occupied(row,4))g.plant('melonpult',row,4);
 for(let row=0;row<5;row++)if(!occupied(row,5))g.plant('repeater',row,5);
 if(g.food>0&&threats.some(z=>z.kind==='west_bull'||z.x<cellX(5))){const p=g.plants.find(p=>p.kind==='lightningreed'&&p.action!=='food');if(p)g.plantFood(p.row,p.column);}
}
