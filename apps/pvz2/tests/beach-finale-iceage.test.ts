import test from 'node:test';
import assert from 'node:assert/strict';
import {create as beach,level as beachLevel,tick} from './beach-fixture';
import {create as iceage,level as iceLevel} from './iceage-fixture';
import {cellX} from '../src/game/level';
import {BATTLE_LEVELS} from '../src/game/levels';

test('Beach finale and first Iceage levels retain native modes and frozen layouts',()=>{
 assert.deepEqual(beachLevel(41).preset,['moonflower','goldleaf','magnifyinggrass']);assert.equal(beachLevel(41).waves.length,18);
 assert.equal(beachLevel(42).conveyor!.InitialPlantList.length,8);assert.equal(beachLevel(42).boss!.kind,'zombossmech_beach2');
 assert.deepEqual([1,2,3].map(d=>iceLevel(d).frozenPlants.length),[2,6,0]);assert.equal(iceLevel(3).frozenZombies.length,2);assert.equal(iceLevel(2).actions.flat().filter(a=>a.mode==='frost').length,3);
 assert.equal(BATTLE_LEVELS.iceage1.firstReward.plant,'hotpotato');
});
for(const [world,day] of [['beach',41],['beach',42],['iceage',1],['iceage',2],['iceage',3]] as const)test(`${world}${day} controlled-damage wave and settlement smoke`,()=>{
 const g=world==='beach'?beach(day):iceage(day);
 for(let i=0;i<60000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);
});
test('moonflowers scale sun and gold tiles produce with an occupant',()=>{
 const g=beach(41);g.addPlant('moonflower',0,0);g.addPlant('moonflower',1,0);g.addPlant('goldleaf',0,0);tick(g,2);assert.equal(g.beachFinale.tiles.length,1);assert.equal(g.seedCost('goldleaf'),75);assert.ok(g.suns.some(s=>s.value===50));
 g.suns=[];tick(g,10);assert.ok(g.suns.some(s=>s.value===50));g.food=1;assert.ok(g.plantFood(0,0));tick(g,2);assert.equal(g.beachFinale.shields.length,4);
});
test('new conveyor plants attack, chill, explode and reflect',()=>{
 const g=beach(42);g.zombies=[];g.boss=null;g.level.boss=null;g.level.tide=null;
 g.addPlant('coldsnapdragon',1,1);const z=g.spawnZombie('beach_armor4',1,cellX(3));tick(g,1.5);assert.ok(z.armor<2200);assert.ok(z.chilledUntil>g.time);
 g.addPlant('seashooter',3,1);const sea=g.spawnZombie('beach_armor4',3,cellX(5));tick(g,3);assert.ok(sea.armor<2200);
 g.addPlant('ghostpepper',1,2);tick(g,13);assert.equal(g.plants.some(p=>p.kind==='ghostpepper'),false);
 g.addPlant('pineapple',4,1);const p=g.plants.at(-1)!;assert.equal(p.hp,6000);assert.ok(g.beachFinale.reflect(p,20));assert.ok(g.beachFinale.shots.some(s=>s.damage===20));
});
test('ice pauses plants, hot potato melts it, frost builds ice and sliders change lanes',()=>{
 const g=iceage(2),p=g.plants.find(p=>p.kind==='repeater')!;assert.ok(g.iceage.blocked(p));assert.ok(g.plant('hotpotato',p.row,p.column));tick(g,5);assert.equal(g.iceage.blocked(p),false);
 g.iceage.wind([{row:p.row,left:false}]);tick(g,2);g.iceage.wind([{row:p.row,left:false}]);tick(g,2);assert.ok(g.iceage.blocked(p));
 const s=g.level.sliders[0],z=g.spawnZombie('iceage',s.row,cellX(s.column));tick(g,1);assert.equal(z.row,s.row+(s.up?-1:1));
});
