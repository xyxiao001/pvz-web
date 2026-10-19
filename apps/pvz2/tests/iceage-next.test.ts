import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,tick} from './iceage-fixture';
import {cellX} from '../src/game/level';
import {BATTLE_LEVELS} from '../src/game/levels';

test('Iceage 4–8 retain native waves, conveyors, frozen placements and rewards',()=>{
 assert.deepEqual([4,5,6,7,8].map(d=>level(d).waves.length),[14,14,10,12,10]);
 assert.equal(level(5).frozenPlants.length,8);assert.equal(level(7).frozenZombies.length,2);
 assert.equal(level(8).conveyor!.InitialPlantList.length,5);
 assert.equal(BATTLE_LEVELS.iceage6.firstReward.plant,'pepperpult');
 assert.equal(BATTLE_LEVELS.iceage4.firstReward.image,'spine_iceage');
});
for(const day of [4,5,6,7,8])test(`iceage${day} controlled-damage wave and settlement smoke`,()=>{
 const g=create(day);for(let i=0;i<60000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);
});
test('pepperpult warms frozen neighbours and damages enemies with peppers and plant food',()=>{
 const g=create(5);g.zombies=[];const p=g.plants[0];g.addPlant('pepperpult',p.row,1);tick(g,4);assert.equal(g.iceage.blocked(p),false);
 const z=g.spawnZombie('iceage_armor3',p.row,cellX(7));tick(g,4);assert.ok(z.armor<1600);g.food=1;assert.ok(g.plantFood(p.row,1));tick(g,4);assert.ok(z.armor<1200);
});
test('hunter throws three snowballs that freeze a plant then waits between barrages',()=>{
 const g=create(4);g.addPlant('wallnut',2,2);const z=g.spawnZombie('iceage_hunter',2,cellX(6));tick(g,18);assert.ok(g.iceage.blocked(g.plants[0]));const s=g.iceageCombat.hunters.get(z.id)!;assert.equal(s.left,0);assert.ok(s.next>g.time);
});
