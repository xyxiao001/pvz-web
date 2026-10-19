import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,tick,props} from './lostcity-fixture';
import {create as ice,level as iceLevel} from './iceage-fixture';
import {cellX} from '../src/game/level';
import {BATTLE_LEVELS} from '../src/game/levels';
import {IceageBoss} from '../src/game/iceage-boss';

test('Iceage finale and Lost City opening preserve their authored configuration',()=>{
 assert.equal(iceLevel(39).targetSun,2750);assert.equal(iceLevel(39).frozenPlants.length,5);assert.equal(iceLevel(39).mowers,false);
 assert.deepEqual(iceLevel(40).conveyor!.InitialPlantList.map(p=>p.PlantType),['lavaguava','shadowshroom','hotpotato','firepeashooter','gatling']);
 assert.deepEqual([1,2,3].map(d=>level(d).goldTiles.length),[6,5,0]);assert.ok([1,2,3].every(d=>level(d).mowers));
 assert.deepEqual(level(2).initialPlants.map(p=>p.column),[1,4,7]);assert.deepEqual(level(2).chooserPlants,['redstinger']);assert.equal(level(2).frozenPlants.length,0);
 assert.ok(level(2).actions.flat().some(a=>a.mode==='parachute'));assert.ok(level(3).actions.flat().some(a=>a.add?.some(p=>p.PlantType==='redstinger')));
 assert.equal(BATTLE_LEVELS.lostcity1.firstReward.plant,'redstinger');assert.equal(BATTLE_LEVELS.lostcity3.night,true);
});
for(const [world,day] of [['iceage',39],['iceage',40],['lostcity',1],['lostcity',2],['lostcity',3]] as const)test(`${world}${day} controlled-damage settlement smoke`,()=>{
 const g=world==='iceage'?ice(day):create(day);
 if(world==='iceage'&&day===39)for(const row of [0,1,2,3,4]){g.addPlant('sunflower',row,0);g.addPlant('sunflower',row,8);}
 for(let i=0;i<60000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)if(g.level.targetSun!==null&&g.sunProduced<g.level.targetSun&&g.wave===g.level.waves.length)z.stunnedUntil=g.time+100;else g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');if(g.boss)assert.ok(g.boss.defeated);else assert.equal(g.wave,g.level.waves.length);
});
test('Gold tiles produce sun on planting and again after twenty seconds',()=>{
 const g=create(1);g.addPlant('wallnut',1,0);tick(g,.1);assert.equal(g.sunProduced,50);tick(g,20);assert.equal(g.sunProduced,100);
});
test('Parachutists hang, eat on the landing square and then drop to walking',()=>{
 const g=create(2);g.plants=[];const z=g.spawnZombie('lostcity_lostpilot',1,cellX(2),'parachute');z.pilot!.fallTime=1.5;g.addPlant('wallnut',1,2);
 tick(g,3);assert.ok(z.pilot!.hanging);assert.ok(g.plants[0].hp<4000);g.plants=[];tick(g,9);assert.equal(z.pilot!.hanging,false);assert.equal(z.pilot!.animation,'Walk');assert.ok(z.x<cellX(2));
});
test('Lava Guava explodes, leaves damaging lava and uses a plant-food crack',()=>{
 const g=create(3);g.addPlant('lavaguava',2,2);const z=g.spawnZombie('lostcity_armor2',2,cellX(2)+20),hp=z.armor;
 tick(g,4);assert.ok(z.armor<hp-200);assert.ok(g.expedition.lava.length);assert.equal(g.plants.filter(p=>p.kind==='lavaguava').length,0);
 g.addPlant('lavaguava',1,1);const far=g.spawnZombie('lostcity_armor2',1,cellX(6));g.food=1;assert.ok(g.plantFood(1,1));tick(g,3);assert.ok(g.expedition.cracks.size);assert.ok(far.armor<props.armors.lostcity_armor2.Toughness);
});
test('Gatling shoots four peas and upgrades to three-lane plant food; final boss uses stronger shield',()=>{
 const g=ice(40),boss=g.boss as IceageBoss;assert.equal(boss.shield,2250);assert.equal(boss.zombie.hp,18000);
 g.addPlant('gatling',2,0);g.spawnZombie('iceage_armor4',2,cellX(8));tick(g,1.5);assert.equal(g.peas.length,4);
 g.food=1;assert.ok(g.plantFood(2,0));tick(g,3);const p=g.plants.find(p=>p.kind==='gatling')!;assert.ok(g.expedition.gunned.has(p.id));assert.equal(p.burst,0);assert.notEqual(p.action,'food');
});
