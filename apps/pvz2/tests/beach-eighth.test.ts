import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,tick} from './beach-fixture';
import {BATTLE_LEVELS} from '../src/game/levels';
import {BOARD,cellX} from '../src/game/level';

test('Beach 36–40 retain native waves, layouts, conveyor, dialogue and trophy',()=>{
 assert.deepEqual([36,37,38,39,40].map(d=>level(d).waves.length),[12,15,16,12,20]);
 assert.deepEqual([36,37,38,39,40].map(d=>level(d).tide!.start),[7,4,8,9,5]);
 assert.deepEqual([36,37,38,39,40].map(d=>level(d).initialPlants.length),[0,6,0,7,0]);
 assert.equal(level(36).conveyor!.InitialPlantList[0].MaxDelivered,4);
 assert.deepEqual(level(36).actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[]),['kernelpult','homingthistle','guacodile']);
 assert.equal(BATTLE_LEVELS.beach36.firstReward.image,'dangerroom_beach2');assert.equal(BATTLE_LEVELS.beach38.narrative,'BEACH_38_INTRO');
 assert.deepEqual(level(39).lastStand,{sun:2700,food:0});assert.equal(level(39).sunDrops,false);
 assert.equal(level(39).protectedPlants.length,5);assert.equal(level(40).mold.length,5);
});
for(const day of [36,37,38,39,40])test(`Beach ${day} wave and settlement smoke with controlled damage`,()=>{
 const g=create(day);if(day===39){g.startLastStand();const spawn=g.spawnZombie.bind(g);g.spawnZombie=(...args)=>{const z=spawn(...args);g.damage(z,100000,'water');return z;};}
 // Protect the thistles from the native rising tide using normal planting and collected sun.
 let pad=0;
 for(let i=0;i<60000&&g.phase==='playing';i++){if(day===40){for(const sun of [...g.suns])g.collect(sun.id);if(pad<3&&g.plant('lilypad',pad*2,4))pad++;}g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);
});
test('Beach 40 preserves the source count and checks protection only on loss',()=>{
 const g=create(40);assert.equal(g.level.mustProtect,5);assert.equal(g.plants.filter(p=>p.endangered).length,3);
 tick(g,.1);assert.equal(g.phase,'playing');g.plants.find(p=>p.endangered)!.hp=0;tick(g,.1);assert.equal(g.phase,'lost');assert.equal(g.lossReason,'protected');
});
test('veteran surfer uses native board health, swim speed, EMP and veteran board debris',()=>{
 const g=create(37),z=g.spawnZombie('beach_surfer_veteran',0,cellX(8)),start=z.x;
 assert.equal(z.surfer!.board,1100);g.beach.surfers.tickZombie(z,1);assert.ok(Math.abs(start-z.x-.15*7*BOARD.cellWidth)<1e-9);
 g.future.emp(z,5);assert.equal(z.surfer!.animation,'Fall');tick(g,2);assert.equal(z.surfer!.surfing,false);
 assert.ok(g.beach.surfers.blockShot(z,300,z.x-100));assert.equal(z.surfer!.board,800);assert.equal(g.beach.surfers.stage(800,true),2);
 z.x=cellX(3);g.damage(z,10000);tick(g,.1);const board=g.graves.find(t=>t.kind==='surfboard')!;assert.equal(board.veteran,true);assert.equal(board.hp,800);
 board.hp=0;g.beach.surfers.damageBoard(board);assert.ok(g.beach.surfers.effects.some(e=>e.name==='surfboardBreakVeteran'));
});
