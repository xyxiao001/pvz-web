import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, headless, type Zombie } from '../src/game/model';
import { cellX, LEVEL_IDS, LEVELS, PLANTS, type PlantKind, type LevelId, type ZombieKind } from '../src/game/config';
import { generateWaves } from '../src/game/waves';
import data from '../src/game/data/portable-adventure.json';
import { animationNames, combatTextureFiles } from '../src/rendering/asset-plan';
import runtime from '../public/assets/runtime/animations.json';
import { GameClock } from '../src/game/clock';

function game(level:LevelId, seeds:PlantKind[]) { const g=new Game(level,1234); for(const kind of seeds)g.chooseSeed(kind);g.start();return g; }
const tick=(g:Game,n:number)=>{for(let i=0;i<n;i++){g.step();g.drainEvents();}};
const spawn=(g:Game,kind:ZombieKind,row:number,x:number)=> (g as unknown as {spawnZombie(kind:ZombieKind,row:number,x:number,wave:number):Zombie}).spawnZombie(kind,row,x,0);
function plant(g:Game,kind:PlantKind,column:number,row:number) {g.select(kind);assert.ok(g.plant(column,row),`${kind} at ${column},${row}`);return g.plants.at(-1)!;}
const pool:PlantKind[]=['sunflower','peashooter','lilypad','jalapeno','spikeweed','tallnut'];

test('ten consecutive adventures use extracted waves, eligibility and 3–10 packet weights',()=>{
 assert.equal(LEVEL_IDS.length,49); assert.deepEqual(LEVEL_IDS.slice(25,35),[26,27,28,29,30,31,32,33,34,35]);
 assert.deepEqual(data.waveCounts.slice(25,35),[20,30,20,30,30,10,20,10,20,20]);
 assert.deepEqual(data.conveyorThirty.map(p=>[p.kind,p.weight]),[['lilypad',25],['squash',5],['threepeater',25],['tanglekelp',5],['jalapeno',10],['spikeweed',10],['torchwood',10],['tallnut',10]]);
 for(const level of LEVEL_IDS.slice(25,34)){
  assert.equal(LEVELS[level].waveCount,data.waveCounts[level-1]);
  const waves=generateWaves(level,()=>.5);
  for(const kind of waves.flat())assert.equal(data.zombies[kind].allowedLevels[level-1],1,`${level}:${kind}`);
 }
 for(const [level,kind] of [[26,'zomboni'],[28,'dolphin'],[31,'jack'],[33,'balloon']] as const){const waves=generateWaves(level,()=>.5);assert.ok(waves[Math.floor(waves.length/2)].includes(kind));assert.ok(waves.at(-1)!.includes(kind));}
 assert.deepEqual(generateWaves(35,()=>.5),[[],[],[]]);
});

test('new plant costs, recharge times and tallnut health match Plant.cpp',()=>{
 assert.deepEqual(['jalapeno','spikeweed','torchwood','tallnut','seashroom','cactus','blover'].map(k=>{const p=PLANTS[k as PlantKind];return [p.cost,p.cooldown,p.health];}),[[125,5000,300],[100,750,300],[175,750,300],[125,3000,8000],[0,3000,300],[125,750,300],[100,750,300]]);
});

test('ice car crushes plants, lays persistent unplantable ice; spikeweed pops its tires',()=>{
 const g=game(29,pool);g.sun=2000;const nut=plant(g,'tallnut',5,0);const car=spawn(g,'zomboni',0,cellX(5)+50);tick(g,1);
 assert.equal(nut.health,0);assert.equal(car.health,1350);assert.equal(headless(car),false);assert.ok(g.iceTrails.length);assert.equal(g.canPlant('peashooter',8,0),false);
 const thorn=plant(g,'spikeweed',3,0);car.x=cellX(3)+50;tick(g,1);assert.equal(thorn.health,0);assert.equal(car.health,0);
 const ice=g.iceTrails[0];ice.remaining=2;tick(g,2);assert.equal(g.iceTrails.length,0);
});

test('spikeweed is not eaten and pulses 20 ground damage; water rejects it even on a pad',()=>{
 const g=game(29,pool);g.sun=2000;plant(g,'lilypad',4,2);assert.equal(g.canPlant('spikeweed',4,2),false);
 const thorn=plant(g,'spikeweed',4,0);thorn.actionIn=1;const z=spawn(g,'normal',0,cellX(4));z.speed=0;tick(g,101);assert.equal(z.health,230);assert.equal(thorn.health,300);assert.equal(z.eating,false);
});

test('jalapeno burns only its row, removes the ice there, and is consumed',()=>{
 const g=game(29,pool);g.sun=2000;plant(g,'jalapeno',1,0);const car=spawn(g,'zomboni',0,650),other=spawn(g,'normal',1,650);g.iceTrails=[{row:0,x:500,remaining:3000},{row:1,x:500,remaining:3000}];tick(g,120);
 assert.ok(!g.zombies.includes(car));assert.equal(other.health,270);assert.deepEqual(g.iceTrails.map(i=>i.row),[1]);assert.ok(!g.plants.length);
});

test('torchwood converts each projectile once; snow first melts, another torch ignites; fire hits nearby enemies',()=>{
 const g=game(29,['sunflower','lilypad','torchwood','snowpea','peashooter','tallnut']);g.sun=2000;plant(g,'torchwood',3,0);g.cooldowns.torchwood=0;plant(g,'torchwood',5,0);
 const snow={id:999,row:0,x:cellX(3)-13,age:0,ice:true,puff:false};g.peas=[snow];tick(g,8);assert.equal(snow.ice,false);assert.equal(g.peas[0].fire,undefined);
 tick(g,45);assert.equal(g.peas[0].fire,true);
 const a=spawn(g,'normal',0,cellX(5)+35),b=spawn(g,'normal',0,cellX(5)+60);tick(g,20);assert.equal(a.health,230);assert.equal(b.health,230);
});

test('tallnuts block pole and dolphin vaults; ordinary nuts can be jumped',()=>{
 for(const kind of ['pole','dolphin'] as const){
  const row=kind==='pole'?0:2,g=game(29,pool);g.sun=2000;if(row===2)plant(g,'lilypad',4,row);plant(g,'tallnut',4,row);const z=spawn(g,kind,row,cellX(4)+80);tick(g,3);assert.equal(z.vaultIn,0);assert.ok(z.eating);assert.ok(z.x>cellX(4));
 }
 const g=game(28,['sunflower','lilypad','wallnut','peashooter','tanglekelp','torchwood']);g.sun=1000;plant(g,'lilypad',4,2);plant(g,'wallnut',4,2);const d=spawn(g,'dolphin',2,cellX(4)+80);tick(g,1);assert.equal(d.vaultIn,120);tick(g,120);assert.ok(d.x<cellX(4));assert.equal(d.dolphin,false);
});

test('bobsled wave without ice uses source-defined four normals; on ice it forms a four-member team',()=>{
 for(const icy of [false,true]){const g=game(27,pool.slice(0,5).concat('squash'));g.waves[0]=['bobsled'];if(icy)g.iceTrails=[{row:0,x:500,remaining:3000}];
 (g as unknown as {spawnWave():void}).spawnWave();assert.equal(g.zombies.length,4);assert.ok(g.zombies.every(z=>z.kind===(icy?'bobsled':'normal')));
 if(icy){assert.ok(g.zombies.every(z=>z.row===0));assert.equal(g.zombies[0].armor,300);g.phase='playing';g.sun=200;plant(g,'spikeweed',1,1);g.iceTrails=[];tick(g,1);assert.ok(g.zombies.every(z=>!z.sled&&z.crashIn));}
 }
});

test('sea mushrooms live directly in water, fire short-range spores at night, and sleep in daylight',()=>{
 const g=game(31,['sunshroom','puffshroom','seashroom','lilypad','fumeshroom','doomshroom']);assert.equal(g.canPlant('seashroom',2,0),false);const p=plant(g,'seashroom',2,2);p.actionIn=1;spawn(g,'normal',2,cellX(2)+200);tick(g,1);assert.equal(g.peas.length,1);assert.ok(g.peas[0].puff);assert.equal(g.sleeping(p),false);
 const day=new Game(30,1);assert.equal(day.sleeping(p),true);
});

test('jack explosion waits 110 ticks after opening and destroys nearby plants',()=>{
 const g=game(31,['sunshroom','puffshroom','seashroom','lilypad','fumeshroom','doomshroom']);const p=plant(g,'puffshroom',4,0);const jack=spawn(g,'jack',0,cellX(4)+60);jack.jackIn=1;tick(g,1);assert.equal(jack.jackOpening,true);const x=jack.x;tick(g,109);assert.ok(g.plants.includes(p));assert.equal(jack.x,x);tick(g,1);assert.ok(!g.plants.includes(p));assert.ok(!g.zombies.includes(jack));
});

test('balloons bypass ground shots and plants; cactus pops them and water landings sink',()=>{
 const g=game(33,['sunshroom','cactus','lilypad','puffshroom','wallnut','seashroom']);g.sun=1000;plant(g,'lilypad',2,2);const cactus=plant(g,'cactus',2,2);const z=spawn(g,'balloon',2,cellX(2)+150);g.peas=[{id:999,row:2,x:z.x-20,age:0,ice:false,puff:false}];tick(g,3);assert.equal(z.health,270);assert.equal(z.flying,true);cactus.actionIn=1;tick(g,100);assert.ok(!g.zombies.includes(z));
});

test('blover blows flying balloons away, leaves walkers, clears fog for 4000 ticks and pauses with the game',()=>{
 const g=game(34,['sunshroom','blover','lilypad','puffshroom','wallnut','seashroom']);g.sun=1000;plant(g,'blover',2,0);const air=spawn(g,'balloon',1,600),ground=spawn(g,'normal',1,600);tick(g,50);assert.ok(g.fogBlownIn>3900);const remaining=g.fogBlownIn;g.pause();tick(g,100);assert.equal(g.fogBlownIn,remaining);g.resume();tick(g,101);assert.ok(!g.zombies.includes(air));assert.ok(g.zombies.includes(ground));
});

test('vase stage recipes, green markers, card expiry/free planting and stage cleanup follow Challenge.cpp',()=>{
 const g=new Game(35,100);g.start();assert.equal(g.vases.length,15);assert.equal(g.graves.length,0);assert.equal(g.mowers.length,0);assert.ok(g.vases.every(v=>v.column>=6));
 const v=g.vases.find(v=>v.content.type==='seed')!;g.openVase(v.column,v.row);assert.equal(g.seedDrops.length,1);assert.equal(g.canPlant(g.seedDrops[0].kind,0,0),false);g.selectDrop(g.seedDrops[0].id);assert.ok(g.plant(0,0));assert.equal(g.sun,0);assert.equal(g.seedDrops.length,0);
 const another=g.vases.find(v=>v.content.type==='seed')!;g.openVase(another.column,another.row);tick(g,1500);assert.equal(g.seedDrops.length,0);
 g.vases=[];g.zombies=[];tick(g,1);assert.equal(g.phase,'intermission');g.nextVaseStage();assert.equal(g.plants.length,0);assert.equal(g.vases.length,20);assert.equal(g.vases.filter(v=>v.green).length,2);assert.ok(g.vases.filter(v=>v.green).every(v=>v.content.type==='seed'));
 g.start();g.vases=[];tick(g,1);g.nextVaseStage();assert.equal(g.vases.length,25);assert.equal(g.vases.filter(v=>v.green).length,3);g.start();g.vases=[];tick(g,1);assert.equal(g.phase,'won');
});

test('vase jack opens neighboring pots and content stays on the board',()=>{
 const g=new Game(35,1);g.start();const v=g.vases.find(v=>v.content.type==='seed')!;const jack=spawn(g,'jack',v.row,cellX(v.column));const before=g.vases.length;tick(g,120);assert.ok(g.vases.length<before);assert.equal(jack.health,0);assert.ok(g.seedDrops.length>0);
});

test('new actors remain lazy, including all three vase stages and spawned forms',()=>{
 const available=Object.keys(runtime.animations),old=new Game(1,1),late=new Game(34,1),vases=new Game(35,1);
 assert.ok(!animationNames(old,available).some(n=>/^(balloon|zomboni|blover|dolphin)/.test(n)));
 const required=animationNames(vases,available);for(const n of ['jack-open','jack-die','dancer-walk','backup-walk','hypnoshroom','squash-attack'])assert.ok(required.includes(n),n);
 late.seeds=['cactus','blover','seashroom','plantern','lilypad','sunshroom'];for(const n of ['cactus-tall','blover-loop','balloon-pop','dolphin-swim','seashroom'])assert.ok(animationNames(late,available).includes(n),n);
 assert.ok(combatTextureFiles(late).spike);assert.equal(combatTextureFiles(old).spike,undefined);
});

test('new mechanics share the same fixed simulation at 30, 60 and 144 Hz',()=>{
 const results=[];
 for(const fps of [30,60,144]) {const g=game(34,['sunshroom','blover','lilypad','puffshroom','wallnut','seashroom']);g.sun=1000;plant(g,'blover',2,0);spawn(g,'balloon',0,650);const c=new GameClock();for(let f=0;f<fps*3;f++)c.advance(g,1000/fps,()=>{});c.advance(g,.001,()=>{});assert.equal(g.ticks,300);results.push(g.snapshot());}
 assert.deepEqual(results[0],results[1]);assert.deepEqual(results[1],results[2]);
});

// End-to-end simulation uses collected sunlight and normal player commands only.
import { playLate, playVases } from './helpers/late-adventure';
for(const level of LEVEL_IDS.slice(25,34)) test(`adventure ${LEVELS[level].label} can be completed through normal play`,()=>{
 const g=playLate(level,123456);assert.equal(g.phase,'won');assert.equal(g.wave,g.config.waveCount);
});
for(const seed of [1,123456]) test(`all three vase stages can be completed through normal play (${seed})`,()=>{
 const g=playVases(seed);assert.equal(g.phase,'won');assert.equal(g.vaseStage,2);
});
