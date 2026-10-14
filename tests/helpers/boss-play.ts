import { Game } from '../../src/game/model';
import { bossVulnerable } from '../../src/game/boss';
export function playBoss(seed:number){
 const g=new Game(50,seed);g.start();
 for(let i=0;i<300000&&g.phase==='playing';i++){
  for(const packet of [...g.conveyor]){
   const kind=packet.kind;
   if(kind==='iceshroom'&&g.plants.some(p=>p.kind==='iceshroom'))continue;
   if(kind==='jalapeno'){const row=g.boss!.ball?.kind==='ice'?g.boss!.ball.row:g.zombies.filter(z=>!z.bungee&&z.x<450).sort((a,b)=>a.x-b.x)[0]?.row;if(row!==undefined&&!g.plants.some(p=>p.kind==='flowerpot'&&p.row===row&&!g.plants.some(t=>t!==p&&t.row===p.row&&t.column===p.column))){const victim=g.plants.find(p=>p.row===row&&p.kind!=='flowerpot');if(victim){g.cancelSelection();g.toggleShovel();g.dig(victim.column,row);}}}
   if(kind==='melonpult'&&!g.plants.some(p=>p.kind==='flowerpot'&&p.column<5&&!g.plants.some(t=>t!==p&&t.row===p.row&&t.column===p.column))){const victim=g.plants.filter(p=>['kernelpult','cabbagepult'].includes(p.kind)&&p.column<5).sort((a,b)=>Number(a.kind==='cabbagepult')-Number(b.kind==='cabbagepult'))[0];if(victim){g.cancelSelection();g.toggleShovel();g.dig(victim.column,victim.row);}}
   if(['iceshroom','jalapeno'].includes(kind)&&!g.plants.some(p=>p.kind==='flowerpot'&&!g.plants.some(t=>t!==p&&t.column===p.column&&t.row===p.row))){const victim=g.plants.find(p=>p.column===0&&p.kind!=='flowerpot'&&(kind==='iceshroom'||p.row===g.boss!.ball?.row||g.zombies.some(z=>z.row===p.row&&z.x<400)));if(victim){g.cancelSelection();g.toggleShovel();g.dig(victim.column,victim.row);}}
   let cells:{c:number,r:number,score:number}[]=[];
   for(const r of g.config.rows)for(let c=0;c<8;c++){
    g.selectPacket(packet.id);if(!g.canPlant(kind,c,r))continue;
    let score=0;
    if(kind==='flowerpot')score=200-c*5-g.plants.filter(p=>p.row===r&&p.kind==='flowerpot').length*20;
    else if(kind==='iceshroom'){
     if(g.boss!.ball?.kind==='fire'&&g.boss!.ball.x>150||bossVulnerable(g.boss!)&&g.boss!.frozenIn<50&&g.boss!.elapsed>100||g.zombies.some(z=>!z.bungee&&!z.frozenIn&&z.x<300))score=100-c;
    }else if(kind==='jalapeno'){
     if(g.plants.some(p=>p.kind==='jalapeno'&&p.row===r))continue;
     if(g.boss!.ball?.kind==='ice'&&g.boss!.ball.row===r)score=1000-c;
     else if(g.zombies.some(z=>z.row===r&&!z.bungee&&(z.x<450||z.kind==='gargantuar'&&z.x<620)))score=150-c;
     else if(bossVulnerable(g.boss!)&&g.boss!.frozenIn<100&&g.conveyor.filter(p=>p.kind==='jalapeno').length>1)score=100-c;
    }else{
     if(c>=5)continue;
     const defense=g.plants.filter(p=>p.row===r&&['cabbagepult','kernelpult','melonpult'].includes(p.kind)).reduce((sum,p)=>sum+(p.kind==='melonpult'?2:1),0);
     score=100-defense*20-c*2+Math.max(0,700-Math.min(700,...g.zombies.filter(z=>z.row===r&&!z.bungee).map(z=>z.x)))/10;
    }
    if(score>0)cells.push({c,r,score});
   }
   cells.sort((a,b)=>b.score-a.score);if(cells.length){g.selectPacket(packet.id);g.plant(cells[0].c,cells[0].r);}
  }
  g.step();g.drainEvents();
 }
 return g;
}

