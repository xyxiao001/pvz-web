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
