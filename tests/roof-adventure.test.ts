import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, type Zombie } from '../src/game/model';
import { LEVEL_IDS, LEVELS, PLANTS, cellX, type LevelId, type PlantKind, type ZombieKind } from '../src/game/config';
import { generateWaves } from '../src/game/waves';
import data from '../src/game/data/portable-adventure.json';
import { animationNames, combatTextureFiles } from '../src/rendering/asset-plan';
import runtime from '../public/assets/runtime/animations.json';
import { GameClock } from '../src/game/clock';
const tick=(g:Game,n:number)=>{for(let i=0;i<n;i++){g.step();g.drainEvents();}};
function game(level:LevelId,seeds:PlantKind[]){const g=new Game(level,123456);for(const k of seeds)g.chooseSeed(k);g.start();g.sun=10000;return g;}
function plant(g:Game,k:PlantKind,c:number,r:number){g.cancelSelection();g.select(k);assert.ok(g.plant(c,r),`${k} ${c},${r}`);return g.plants.at(-1)!;}
const spawn=(g:Game,k:ZombieKind,r:number,x:number)=>(g as unknown as {spawnZombie(k:ZombieKind,r:number,x:number,w:number):Zombie}).spawnZombie(k,r,x,0);
const roof:PlantKind[]=['sunflower','cabbagepult','kernelpult','flowerpot','pumpkin','peashooter'];

test('new ten adventures retain extracted wave tables and first-adventure enemy eligibility',()=>{
 assert.deepEqual(LEVEL_IDS.slice(35,45),[36,37,38,39,40,41,42,43,44,45]);
 assert.deepEqual(data.waveCounts.slice(35,45),[10,20,10,20,20,10,20,20,30,20]);
 for(const l of LEVEL_IDS.slice(35,45)){
  assert.equal(LEVELS[l].waveCount,data.waveCounts[l-1]);
  for(const k of generateWaves(l,()=>.5).flat().filter(k=>!(l===45&&k==='bungee')))assert.equal(data.zombies[k].allowedLevels[l-1],1,`${l}:${k}`);
 }
 for(const [l,k] of [[36,'digger'],[38,'pogo'],[41,'bungee'],[43,'ladder']] as const)assert.ok(generateWaves(l,()=>.5).at(-1)!.includes(k));
 assert.deepEqual(generateWaves(45,()=>.5)[9],Array(5).fill('bungee'));
 assert.equal(generateWaves(45,()=>.5)[19].filter(k=>k==='bungee').length,5);
 assert.ok(generateWaves(36,()=>.5)[6].includes('digger'));
 assert.deepEqual(data.conveyorForty.map(p=>[p.kind,p.weight]),[['lilypad',25],['seashroom',10],['magnetshroom',5],['blover',5],['cactus',15],['starfruit',25],['splitpea',5],['pumpkin',10]]);
 assert.deepEqual(data.conveyorFortyFive.map(p=>[p.kind,p.weight]),[['flowerpot',50],['chomper',25],['pumpkin',15],['cherrybomb',10]]);
});
test('new seed costs, recharge and defenses match the source definitions',()=>{
 assert.deepEqual(['splitpea','starfruit','pumpkin','magnetshroom','cabbagepult','flowerpot','kernelpult','coffeebean','garlic'].map(k=>{const p=PLANTS[k as PlantKind];return[p.cost,p.cooldown,p.health];}),[[125,750,300],[125,750,300],[125,3000,4000],[100,750,300],[100,750,300],[25,750,300],[100,750,300],[75,750,300],[50,750,400]]);
});
test('roof starts with 25/20/15 pots; sloped hit testing and planting preserve the base layer',()=>{
 for(const l of [41,42,43,44,45] as const){const g=new Game(l,1);assert.equal(g.plants.length,l===41?25:l===42?20:15);for(const p of g.plants)assert.equal(g.rowAt(g.rowY(p.row,cellX(p.column))-30,cellX(p.column)),p.row);}
 const g=game(43,roof);assert.equal(g.canPlant('cabbagepult',6,0),false);plant(g,'flowerpot',6,0);plant(g,'cabbagepult',6,0);plant(g,'pumpkin',6,0);
 const z=spawn(g,'normal',0,cellX(6)+30);tick(g,5);assert.ok(g.plants.find(p=>p.kind==='pumpkin')!.health<4000);assert.equal(g.plants.find(p=>p.kind==='cabbagepult')!.health,300);
 g.toggleShovel();g.dig(6,0);assert.equal(g.plants.filter(p=>p.column===6).length,2);g.toggleShovel();g.dig(6,0);assert.equal(g.plants.filter(p=>p.column===6)[0].kind,'flowerpot');assert.ok(z.health>0);
});
test('split pea rear double shot stops a miner after it surfaces, but cannot hit it underground',()=>{
 const g=game(36,['sunshroom','puffshroom','splitpea','lilypad','seashroom','squash']);const p=plant(g,'splitpea',2,0);p.actionIn=1;const z=spawn(g,'digger',0,180);z.speed=0;tick(g,30);assert.equal(z.health,270);assert.equal(g.peas.length,0);
 z.x=44;tick(g,1);assert.ok(z.backwards);assert.equal(z.emergingIn,230);tick(g,230);p.actionIn=1;tick(g,26);assert.equal(g.peas.filter(p=>p.vx!<0).length,2);tick(g,60);assert.ok(z.armor<100);assert.ok(z.x>44);
});
test('starfruit fires five directions and damages an enemy in an adjacent lane',()=>{
 const g=game(37,['sunshroom','puffshroom','starfruit','lilypad','seashroom','splitpea']);const p=plant(g,'starfruit',2,0);p.actionIn=1;const z=spawn(g,'normal',1,cellX(2));z.speed=0;tick(g,1);assert.equal(g.peas.length,5);tick(g,30);assert.ok(z.health<270);
});
test('pogo bypasses ordinary plants; tallnut and magnet remove its jump',()=>{
 const g=game(39,['sunshroom','puffshroom','magnetshroom','tallnut','lilypad','seashroom']);plant(g,'puffshroom',4,0);const z=spawn(g,'pogo',0,cellX(4)+30);tick(g,150);assert.ok(z.x<cellX(4));assert.equal(z.eating,false);plant(g,'tallnut',2,0);z.x=cellX(2)+50;tick(g,1);assert.equal(z.pogo,false);
 const magnet=plant(g,'magnetshroom',2,1);magnet.actionIn=0;const another=spawn(g,'pogo',1,400);tick(g,1);assert.equal(another.pogo,false);assert.equal(magnet.actionIn,1500);
});
test('magnet pulls bucket, pickaxe and placed ladders with a recharge between uses',()=>{
 const g=game(39,['sunshroom','puffshroom','magnetshroom','tallnut','lilypad','seashroom']);const p=plant(g,'magnetshroom',2,0);p.actionIn=0;const bucket=spawn(g,'bucket',0,400);tick(g,1);assert.equal(bucket.armor,0);
 const miner=spawn(g,'digger',0,400);miner.speed=0;tick(g,1);assert.ok(miner.underground);p.actionIn=0;tick(g,1);assert.equal(miner.underground,false);assert.ok(miner.emergingIn!>0);assert.equal(miner.backwards,false);
 p.actionIn=0;g.ladders=[{column:2,row:0}];tick(g,1);assert.equal(g.ladders.length,0);
});
test('coffee wakes a daytime mushroom after 100 ticks and consumes only the coffee',()=>{
 const g=game(44,['sunflower','cabbagepult','flowerpot','coffeebean','magnetshroom','pumpkin']);const p=plant(g,'magnetshroom',2,0);assert.equal(g.sleeping(p),true);assert.equal(g.canPlant('coffeebean',1,0),false);plant(g,'coffeebean',2,0);tick(g,99);assert.equal(g.sleeping(p),true);tick(g,1);assert.equal(g.sleeping(p),false);assert.ok(!g.plants.some(p=>p.kind==='coffeebean'));assert.ok(g.plants.some(p=>p.kind==='flowerpot'&&p.row===0&&p.column===2));
});
test('roof slope blocks peas while cabbage lobs bypass the ladder shield',()=>{
 const g=game(43,roof);const p=plant(g,'cabbagepult',0,0);p.actionIn=1;const z=spawn(g,'ladder',0,700);z.speed=0;tick(g,101);assert.equal(z.health,460);assert.equal(z.shield,500);
 const shooter=plant(g,'peashooter',0,1);shooter.actionIn=1;const normal=spawn(g,'normal',1,700);normal.speed=0;tick(g,200);assert.equal(normal.health,270);assert.ok(!g.peas.some(p=>p.row===1));
});
test('kernel butter hits for 40 and freezes movement and biting for 400 ticks',()=>{
 const g=game(43,roof);const p=plant(g,'kernelpult',2,0);const z=spawn(g,'normal',0,700);z.speed=0;
 for(let i=0;i<30&&!g.peas.some(p=>p.lob?.kind==='butter');i++){p.actionIn=1;tick(g,1);}
 const butter=g.peas.find(p=>p.lob?.kind==='butter');assert.ok(butter);g.peas=[butter];p.actionIn=1000;tick(g,100);assert.equal(z.health,230);assert.ok(z.butterIn!>390);z.speed=.3;const x=z.x;tick(g,390);assert.equal(z.x,x);tick(g,20);assert.ok(z.x<x);
});
test('ladder is placed on pumpkin and lets walkers pass; breaking a carried ladder slows its owner',()=>{
 const g=game(43,roof);plant(g,'pumpkin',2,0);const z=spawn(g,'ladder',0,cellX(2)+30);tick(g,101);assert.deepEqual(g.ladders,[{column:2,row:0}]);assert.equal(z.shield,0);tick(g,500);assert.ok(z.x<cellX(2));assert.equal(g.plants.find(p=>p.kind==='pumpkin')!.health,4000);
 const another=spawn(g,'ladder',1,650);(g as any).damageZombie(another,500);assert.equal(another.shield,0);assert.equal(another.speed,.3);
});
test('bungee descends then steals the plant but leaves the pot; a carrier drops its actual wave enemy',()=>{
 const g=game(41,['sunflower','cabbagepult','pumpkin','squash','cherrybomb','tallnut']);const p=plant(g,'sunflower',2,0);const z=spawn(g,'bungee',0,cellX(2));z.row=0;z.x=cellX(2);z.bungee={phase:'down',remaining:375,column:2};tick(g,374);assert.ok(g.plants.includes(p));tick(g,1);assert.equal(z.bungee.phase,'wait');g.pause();tick(g,100);assert.equal(z.bungee.remaining,300);g.resume();tick(g,300);assert.ok(!g.plants.includes(p));assert.ok(g.plants.some(p=>p.kind==='flowerpot'&&p.column===2&&p.row===0));tick(g,100);assert.ok(!g.zombies.includes(z));
 const drop=spawn(g,'bungee',0,600);drop.row=0;drop.x=600;drop.bungee={phase:'down',remaining:1,column:6,drop:'bucket'};tick(g,1);assert.ok(g.zombies.some(z=>z.kind==='bucket'&&z.row===0&&z.armor===1100));
});
test('garlic bite redirects the zombie to an adjacent roof lane',()=>{
 const g=game(44,['sunflower','cabbagepult','flowerpot','coffeebean','magnetshroom','pumpkin']);g.seeds[5]='garlic';const p=plant(g,'garlic',2,0);const z=spawn(g,'normal',0,cellX(2)+30);tick(g,4);assert.equal(p.health,396);tick(g,100);assert.equal(z.row,1);
});
test('new actor downloads follow selected cards and enemies, keeping first level lean',()=>{
 const names=Object.keys(runtime.animations),early=animationNames(new Game(1,1),names);
 for(const root of ['digger','pogo','bungee','ladder','cabbagepult','kernelpult'])assert.ok(!early.some(n=>n.startsWith(root)));
 for(const l of [36,38,41,43,45] as const){const g=new Game(l,1);g.seeds=[...g.config.seeds];const selected=animationNames(g,names);for(const k of l===36?['digger-dig','splitpea']:l===38?['pogo-bounce','pumpkin']:l===41?['bungee-drop','flowerpot','cabbagepult-attack']:l===43?['ladder-place','kernelpult-attack']:['bungee-idle','chomper-bite'])assert.ok(selected.includes(k),k);}
 const g=game(43,roof);assert.ok(combatTextureFiles(g).butter);assert.ok(combatTextureFiles(g).bungeeTarget);assert.equal(combatTextureFiles(new Game(1,1)).cabbage,undefined);
});
test('storm, projectiles and miners remain frame-rate independent; pause freezes storm time',()=>{
 const results=[];for(const fps of [30,60,144]){const g=game(40,[]),c=new GameClock();for(let f=0;f<fps*8;f++)c.advance(g,1000/fps,()=>{});c.advance(g,.001,()=>{});assert.equal(g.ticks,800);g.pause();const before=g.stormIn;tick(g,100);assert.equal(g.stormIn,before);results.push(g.snapshot());}assert.deepEqual(results[0],results[1]);assert.deepEqual(results[1],results[2]);
});

test('new roof shots and underground movement agree at 30, 60 and 144 Hz',()=>{
 const results=[];
 for(const fps of [30,60,144]){const g=game(43,roof);plant(g,'cabbagepult',1,0);spawn(g,'ladder',0,750);spawn(g,'digger',1,700);const c=new GameClock();for(let f=0;f<fps*6;f++)c.advance(g,1000/fps,()=>{});c.advance(g,.001,()=>{});assert.equal(g.ticks,600);results.push(g.snapshot());}
 assert.deepEqual(results[0],results[1]);assert.deepEqual(results[1],results[2]);
});
import { playRoofAdventure } from './helpers/roof-adventure';
for(const level of LEVEL_IDS.slice(35,45))test(`adventure ${LEVELS[level].label} finishes using normal six-slot/conveyor commands`,()=>{
 const g=playRoofAdventure(level,123456);assert.equal(g.phase,'won',`wave ${g.wave}, tick ${g.ticks}`);assert.equal(g.wave,g.config.waveCount);
});
