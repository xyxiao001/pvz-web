import test from 'node:test';import assert from 'node:assert/strict';
import {create,level,props,read,tick} from './kongfu-fixture';
import {cellX,type PlantKind} from '../src/game/level';
import {BATTLE_LEVELS} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
for(const day of [22,23,24,25,26])test(`Kongfu ${day}: controlled damage reaches settlement and resources resolve`,()=>{
 const g=create(day);g.preparing=false;
 for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);
 const config=BATTLE_LEVELS[`kongfu${day}`],l=level(day),catalogs=['battle','campaign',...config.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...(l.preset??[]),...l.protectedPlants.map(p=>p.kind),...l.initialPlants.map(p=>p.kind),...(l.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...l.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 for(const name of battleActors(l,plants)){const spec=actors[name],sk=read(spec?`${spec.group}/rigs/${spec.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(spec?sk.armature.some((a:{name:string})=>a.name===spec.armature):sk.armature.length,name);}
 for(const name of battleEffects(l,plants))assert.ok(rigs[name],name);
});
test('22–26 preserve authored modes, wave counts, narrative and plant pools',()=>{
 assert.deepEqual([22,23,24,25,26].map(d=>level(d).waves.length),[12,24,15,14,15]);
 assert.equal(level(23).lastStand!.sun,2750);assert.equal(level(24).mowers,false);assert.equal(level(26).mowers,false);assert.equal(level(26).tnt!.SpawnData.length,5);
 assert.deepEqual(level(26).preset,['goldleaf','snowpea','bambooshoot','bonkchoy','turnip','stunion']);
 assert.ok(level(22).actions.flat().some(a=>a.add?.some(p=>p.PlantType==='powerlily')));
 assert.equal(level(23).actions.flat().filter(a=>a.mode==='chiHole').length,6);
 for(const day of [22,23,24])assert.ok(read('kongfu/catalog.json').narratives[`KONGFU_${day}_INTRO`].length);
});
test('power lily produces one collectible plant food, then disappears',()=>{
 const g=create(22);g.addPlant('powerlily',2,2);assert.equal(g.plantFood(2,2),false);tick(g,.6);assert.equal(g.plants.length,0);assert.equal(g.pickups.filter(p=>p.kind==='food').length,1);
});
test('linked carts move both plants and preserve separate cart groups',()=>{
 const g=create(24);g.addPlant('snowpea',1,0);g.addPlant('citron',1,1);g.cowboy.select(1,1);assert.equal(g.cowboy.move(0),true);
 assert.deepEqual(g.cowboy.carts.map(c=>c.row),[0,0,3,3]);assert.ok(g.plants.every(p=>p.row===0));assert.equal(g.cowboy.move(2),false);
});
test('chi hole warns, pulls plants, stops at turnip, and releases wave suppression',()=>{
 const g=create(23);g.preparing=false;g.graves=[];g.addPlant('wallnut',0,5);g.addPlant('turnip',1,5);g.addPlant('wallnut',1,4);g.addPlant('wallnut',2,8);
 g.kongfu.holes.spawn(g.level.actions.flat().find(a=>a.mode==='chiHole')!.chiHole!);assert.equal(g.kongfu.holes.suppressesWave,true);tick(g,2.7);assert.equal(g.plants[0].column,5);tick(g,.3);assert.equal(g.plants[0].column,6);assert.equal(g.plants[2].column,4);assert.ok(!g.plants.some(p=>p.row===2));tick(g,3);assert.equal(g.kongfu.holes.suppressesWave,false);assert.equal(g.kongfu.holes.holes.length,0);
});
test('monk drink changes below half health and uses two-hit drunken attack',()=>{
 const g=create(25);g.graves=[];g.addPlant('wallnut',2,2);const p=g.plants[0],z=g.spawnZombie('monk_drink',2,cellX(2)+40);z.hp=250;tick(g,4.4);assert.equal(z.kongfu!.drunk,true);tick(g,2);assert.equal(p.hp,props.plants.wallnut.Toughness-500);
});
test('hook statue awakens, leaps to a least populated lane, and lands',()=>{
 const g=create(24);g.graves=[];const z=g.zombies.find(z=>z.kongfu?.awakens==='kongfu_bronze_hook')!;z.kongfu!.life=0;tick(g,.1);assert.equal(z.kind,'kongfu_bronze_hook');tick(g,3.6);assert.equal(z.kongfu!.animation,'Walk');
 for(let row=0;row<4;row++)g.addPlant('wallnut',row,0);z.kongfu!.next=0;tick(g,2.1);assert.equal(z.kongfu!.flying,true);tick(g,2);assert.equal(z.row,4);tick(g,2);assert.equal(z.kongfu!.flying,false);assert.equal(z.kongfu!.animation,'Walk');
});
