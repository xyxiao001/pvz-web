import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, headless, type Zombie } from '../src/game/model';
import { cellX, PLANTS, LEVEL_IDS, LEVELS } from '../src/game/config';
import { walkingCycleTicks, walkingSpeed } from '../src/game/zombie-motion';
import { generateWaves } from '../src/game/waves';
import data from '../src/game/data/portable-adventure.json';
import { run } from './helpers/scenes-play';
const step=(g:Game,n:number)=>{for(let i=0;i<n;i++){g.step();g.drainEvents();}};
const z=(kind:Zombie['kind'],x:number):Zombie=>({id:999,kind,row:2,x,health:270,armor:0,shield:0,speed:.3,biteIn:4,eating:false,wave:0,hitAt:-100,chillIn:0,hasPole:false,vaultIn:0,animationTime:0,rageIn:0,riseIn:0});
function kelpGame(){const g=new Game(24,1);for(const p of ['tanglekelp','lilypad','sunflower','peashooter','wallnut','cherrybomb'] as const)g.chooseSeed(p);g.start();g.sun=200;return g;}
test('3–4 and 3–5 use original wave counts and Little Trouble conveyor weights',()=>{
 assert.deepEqual(LEVEL_IDS,Object.keys(LEVELS).map(Number));assert.equal(LEVEL_IDS.at(-1),25);
 assert.deepEqual(data.waveCounts.slice(23),[30,20]);assert.deepEqual(data.conveyorTwentyFive,[{kind:'lilypad',weight:25},{kind:'wallnut',weight:15},{kind:'peashooter',weight:25},{kind:'cherrybomb',weight:35}]);
 assert.equal(PLANTS.tanglekelp.cost,25);assert.equal(PLANTS.tanglekelp.cooldown,3000);
 const waves=generateWaves(25,()=>.5);assert.equal(waves[0].reduce((n,k)=>n+data.zombies[k].value,0),4);assert.ok(waves.flat().every(k=>['normal','cone','flag','football','snorkel'].includes(k)));
});
test('kelp uses bare water, grabs submerged targets, freezes their movement and removes them after 100 ticks',()=>{
 const g=kelpGame();assert.equal(g.canPlant('tanglekelp',4,0),false);g.select('lilypad');g.plant(3,2);assert.equal(g.canPlant('tanglekelp',3,2),false);
 g.select('tanglekelp');assert.ok(g.plant(4,2));const target=z('snorkel',cellX(4)+35);g.zombies=[target];step(g,1);const x=target.x;assert.equal(g.plants.find(p=>p.kind==='tanglekelp')!.kelp!.remaining,100);
 step(g,50);assert.equal(target.x,x);assert.equal(target.eating,false);g.pause();step(g,100);assert.equal(target.x,x);g.resume();step(g,50);assert.equal(g.zombies.length,0);assert.ok(!g.plants.some(p=>p.kind==='tanglekelp'));
});
test('shoveling a grabbing kelp kills its held target as in Plant::Die',()=>{
 const g=kelpGame();g.select('tanglekelp');g.plant(4,2);const target=z('bucket',cellX(4));target.armor=1100;g.zombies=[target];step(g,1);g.toggleShovel();g.dig(4,2);step(g,1);assert.equal(g.zombies.length,0);
});
test('Little Trouble quarter health does not spawn headless zombies; half size speeds poses but not travel',()=>{
 const g=new Game(25,1);g.start();step(g,1801);assert.ok(g.zombies.length>0);
 for(const a of g.zombies){assert.equal(a.mini,true);assert.equal(a.health,67);assert.equal(headless(a),false);assert.equal(walkingCycleTicks(a),walkingCycleTicks({...a,mini:false})/2);assert.equal(walkingSpeed(a),walkingSpeed({...a,mini:false}));}
});
test('3–4 clears 30 waves with normal six-slot commands for two seeds',()=>{for(const seed of [1,123456]){const g=run(24,seed);assert.equal(g.phase,'won',`${seed} wave ${g.wave}`);}});

export function littleRun(seed:number){
 const g=new Game(25,seed);g.start();
 for(let t=0;t<160000&&g.phase==='playing';t++){
  const enemies=g.zombies.filter(z=>!headless(z)).sort((a,b)=>a.x-b.x);
  const rows=[...g.config.rows].sort((a,b)=>g.plants.filter(p=>p.row===a&&p.kind==='peashooter').length-g.plants.filter(p=>p.row===b&&p.kind==='peashooter').length);
  for(const packet of [...g.conveyor]){
   g.selectPacket(packet.id);let done=false;
   if(packet.kind==='lilypad'){for(const col of [0,1,2,3,4,5,6,7,8]){for(const row of [2,3])if(g.plant(col,row)){done=true;break;}if(done)break;}}
   else if(packet.kind==='cherrybomb'){for(const enemy of enemies)if(enemy.x<620){for(let col=0;col<9;col++)if(Math.abs(cellX(col)-enemy.x)<100){if(g.plants.some(p=>p.column===col&&p.row===enemy.row&&p.kind!=='lilypad')){g.toggleShovel();g.dig(col,enemy.row);g.selectPacket(packet.id);}if(g.plant(col,enemy.row)){done=true;break;}}if(done)break;}}
   else for(const row of rows){for(const col of packet.kind==='wallnut'?[7,8,6]:[0,1,2,3,4,5])if(g.plant(col,row)){done=true;break;}if(done)break;}
   if(!done)g.cancelSelection();
  }
  g.step();g.drainEvents();
 }
 return g;
}
test('3–5 clears with supplied conveyor packets only for two seeds',()=>{for(const seed of [1,123456]){const g=littleRun(seed);assert.equal(g.phase,'won',`${seed} wave ${g.wave}`);assert.equal(g.collected,0);}});
