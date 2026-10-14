import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/model';
import { BOSS_HEALTH, createBoss, damageBoss, stepBoss, bossVulnerable } from '../src/game/boss';
import { LEVEL_IDS, LEVELS, SURVIVAL_SCENES, type PlantKind } from '../src/game/config';
import { GameClock } from '../src/game/clock';
import { survivalRoster, generateSurvivalWaves } from '../src/game/survival';
import { animationNames, combatTextureFiles } from '../src/rendering/asset-plan';
import data from '../src/game/data/portable-adventure.json';
import clips from '../src/game/data/boss-clips.json';
const tick=(g:Game,n:number)=>{for(let i=0;i<n;i++){g.step();g.drainEvents();}};
const packet=(g:Game,kind:PlantKind,column:number,row:number)=>{const id=10000+g.ticks;g.conveyor.push({id,kind,x:0});g.selectPacket(id);assert.ok(g.plant(column,row));};
test('adventure finale uses a boss controller and source conveyor, with no ordinary wave victory',()=>{
 assert.equal(LEVEL_IDS.at(-1),50);assert.equal(LEVELS[50].waveCount,0);
 const g=new Game(50,1);g.start();assert.deepEqual(g.waves,[]);assert.equal(g.boss!.health,40000);assert.equal(g.needsSeedChoice,false);
 assert.deepEqual(data.conveyorFifty.map(p=>p.weight),[55,10,12,10,5,8]);
 tick(g,1000);assert.equal(g.phase,'playing');assert.equal(g.wave,0);assert.ok(g.zombies.length>0);assert.equal(g.sun,0);
 assert.ok(g.conveyor.every(p=>LEVELS[50].seeds.includes(p.kind)));assert.equal(g.canPlant('flowerpot',8,0),false);
});
test('boss is vulnerable only while its head is down, freezes in place, then completes death before awarding victory',()=>{
 const b=createBoss();damageBoss(b,1800,0);assert.equal(b.health,BOSS_HEALTH);
 b.phase='headBefore';b.clip='anim_head_idle';b.duration=500;b.elapsed=0;damageBoss(b,1800,10);assert.equal(b.health,38200);
 b.frozenIn=20;const elapsed=b.elapsed;for(let i=0;i<20;i++)stepBoss(b,()=>.5,[],true);assert.equal(b.elapsed,elapsed);
 const g=new Game(50,1);g.start();g.boss!.phase='headAfter';damageBoss(g.boss!,40000,0);
 g.step();assert.equal(g.boss!.phase,'death');assert.equal(g.phase,'playing');tick(g,Math.ceil(clips.anim_death[1]*100/18));assert.equal(g.phase,'won');
});
test('night roof ice mushroom wakes without coffee; ice and fire cancel only the matching boss ball',()=>{
 for(const type of ['fire','ice'] as const){
  const g=new Game(50,1);g.start();g.boss!.ball={kind:type,row:1,x:600,age:100};packet(g,'iceshroom',0,0);assert.equal(g.sleeping(g.plants.at(-1)!),false);tick(g,100);
  assert.equal(g.boss!.ball===null,type==='fire');
 }
 for(const row of [0,1]){
  const g=new Game(50,1);g.start();g.boss!.ball={kind:'ice',row:1,x:600,age:100};packet(g,'jalapeno',0,row);tick(g,100);assert.equal(g.boss!.ball===null,row===1);
 }
 const g=new Game(50,1);g.start();g.boss!.ball={kind:'fire',row:1,x:600,age:100};packet(g,'jalapeno',0,1);tick(g,100);assert.ok(g.boss!.ball);
});
test('boss ball crushes both pot and plant; RV crush footprint remains two rows by three columns',()=>{
 const g=new Game(50,1);g.start();packet(g,'cabbagepult',1,2);g.boss!.ball={kind:'ice',row:2,x:160,age:100};g.step();assert.ok(!g.plants.some(p=>p.row===2&&p.column===1));assert.ok(g.plants.some(p=>p.row===1&&p.column===1));
 g.boss!.ball=null;Object.assign(g.boss!,{phase:'rv',clip:'anim_RV_1',row:1,column:0,elapsed:64,duration:100});g.step();
 assert.ok(!g.plants.some(p=>[1,2].includes(p.row)&&p.column<3));assert.ok(g.plants.some(p=>p.row===0));
});
test('boss health stages trigger bungees and RV, and head attack produces a ball',()=>{
 const b=createBoss();Object.assign(b,{phase:'idle',duration:1,health:26000});assert.equal(stepBoss(b,()=>.5,[],true).length,0);assert.equal(b.phase,'bungee');
 Object.assign(b,{phase:'idle',duration:1,elapsed:0,health:13000});stepBoss(b,()=>.5,[],true);assert.equal(b.phase,'rv');
 Object.assign(b,{phase:'idle',duration:1,elapsed:0,headIn:0,stompIn:-1,bungeeIn:-1});stepBoss(b,()=>.5,[],true);assert.equal(b.phase,'headEnter');
 for(let i=0;i<1400&&!b.ball;i++)stepBoss(b,()=>.5,[],true);assert.ok(b.ball);assert.ok(bossVulnerable(b));
});
test('boss simulation is refresh-rate independent and pause freezes every boss timer',()=>{
 const run=(hz:number,speed:1|2|4)=>{const g=new Game(50,123);g.start();const c=new GameClock();c.speed=speed;for(let i=0;i<hz*16/speed;i++)c.advance(g,1000/hz,()=>{});c.advance(g,.001,()=>{});g.drainEvents();return g;};
 const expected=run(60,1).snapshot();for(const hz of [30,60,144])for(const speed of [1,2,4] as const)assert.deepEqual(run(hz,speed).snapshot(),expected);
 const g=run(60,1);g.pause();const before=g.snapshot();tick(g,100);assert.deepEqual(g.snapshot(),before);
});
test('all five survival scenes expose late plants and source-compatible enemy pools',()=>{
 assert.equal(SURVIVAL_SCENES.length,5);const seen=new Set<string>();
 for(const scene of SURVIVAL_SCENES){
  const g=new Game(9,1,'endless',scene);for(const k of ['melonpult','umbrella','pumpkin','blover','coffeebean'] as const)assert.ok(g.config.seeds.includes(k));
  assert.equal(g.config.seeds.includes('flowerpot'),scene==='roof');
  for(let seed=1;seed<=100;seed++){let state=seed;const rng=()=>((state=(Math.imul(state,1664525)+1013904223)>>>0)/2**32);const roster=survivalRoster(10,rng,scene);assert.equal(roster.length,11);assert.equal(new Set(roster).size,11);
   for(const kind of roster)seen.add(kind);if(scene==='roof')assert.ok(!roster.some(k=>['digger','dancer','dolphin','snorkel'].includes(k)));if(scene==='night')assert.ok(!roster.includes('zomboni'));
   assert.ok(generateSurvivalWaves(10,roster,rng).every(w=>w.length<=50));
  }
 }
 for(const k of ['gargantuar','catapult','balloon','digger','bungee','dolphin'])assert.ok(seen.has(k));
});
test('roof survival retains six slots and damaged defenses; saved continuation is deterministic',()=>{
 const g=new Game(9,4,'endless','roof');const loadout:PlantKind[]=['sunflower','flowerpot','melonpult','umbrella','cherrybomb','blover'];for(const k of loadout)g.chooseSeed(k);g.start();
 assert.equal(g.plants.length,15);assert.equal(g.mowers.length,0);g.plants[0].health=20;g.wave=20;g.step();assert.equal(g.phase,'intermission');const plants=structuredClone(g.plants);
 g.nextSurvivalStage();assert.deepEqual(g.seeds,loadout);assert.deepEqual(g.plants,plants);assert.equal(g.phase,'ready');
 const copy=Game.restore(JSON.parse(JSON.stringify(g.snapshot())));g.start();copy.start();tick(g,900);tick(copy,900);assert.deepEqual(g.snapshot(),copy.snapshot());
});
test('lazy asset plans include boss summons and late enemies in non-roof survival',()=>{
 const boss=new Game(50,1);assert.ok(animationNames(boss,['gargantuar-walk','imp-walk','catapult-shoot','dolphin-walk']).includes('imp-walk'));assert.ok(combatTextureFiles(boss).basketball);
 const g=new Game(9,1,'endless','day');g.waves=[['ladder','bungee','catapult','gargantuar']];const files=combatTextureFiles(g);for(const k of ['ladder','bungeeCord','bungeeTarget','basketball'])assert.ok(files[k]);assert.ok(animationNames(g,['imp-walk']).includes('imp-walk'));
});

import { playBoss } from './helpers/boss-play';
test('5–10 can be won using conveyor cards and shovel commands, without changing combat state',()=>{const g=playBoss(23);assert.equal(g.phase,'won');assert.equal(g.boss!.health,0);assert.equal(g.sun,0);assert.ok(g.planted>100);});
