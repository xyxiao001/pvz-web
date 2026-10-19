import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,tick} from './beach-fixture';
import {cellX} from '../src/game/level';
import {BATTLE_LEVELS} from '../src/game/levels';
import {ProgressStore} from '../src/shell/progression';
test('Beach 16–20 retain native waves, conveyors, chooser and first rewards',()=>{
 assert.deepEqual([16,17,18,19,20].map(d=>level(d).waves.length),[18,14,18,15,18]);
 assert.deepEqual([16,17,18,19,20].map(d=>BATTLE_LEVELS['beach'+d].mode),['conveyor','seedbank','conveyor','seedbank','seedbank']);
 assert.equal(level(16).mowers,false);assert.equal(level(16).sunDrops,false);
 assert.deepEqual(level(18).conveyor!.InitialPlantList.map(p=>p.PlantType),['guacodile','tanglekelp']);
 assert.deepEqual(level(19).chooserPlants,['sunshroom','lilypad','iceburg','kernelpult','guacodile']);
 assert.equal(BATTLE_LEVELS.beach19.firstReward.plant,'guacodile');
 const data=new Map<string,string>(),store=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 for(const d of [16,17,20]){store.finish('beach','beach'+d);store.finish('beach','beach'+d);}
 assert.deepEqual(store.campaignRewards().map(r=>r.id),['worldkey','spine_beach','dangerroom_beach']);
});
for(const day of [16,17,18,19,20])test(`Beach ${day} wave and settlement smoke with controlled damage`,()=>{
 const g=create(day);
 for(let i=0;i<60000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000);}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);
 if(day===18)for(const kind of ['lilypad','magnetshroom'])assert.ok(g.conveyorPlants.some(p=>p.PlantType===kind));
});
test('octopus disables every plant in the target cell, survives its thrower, and can be shot off',()=>{
 const g=create(17);g.addPlant('wallnut',2,4);const pad=g.plants.find(p=>p.kind==='lilypad'&&p.row===2)!,nut=g.plants.find(p=>p.kind==='wallnut')!;
 const z=g.spawnZombie('beach_octopus',2,cellX(7));z.octopus!.cooldown=0;tick(g,2.4);
 const cover=g.graves.find(t=>t.kind==='octopus')!;assert.ok(cover);assert.equal(cover.hp,400);
 assert.equal(pad.sheep,cover.id);assert.equal(nut.sheep,cover.id);
 g.damage(z,10000);tick(g,.1);assert.equal(nut.sheep,cover.id);
 g.addPlant('peashooter',2,3);tick(g,1);assert.ok(cover.hp<400);
 g.beach.bowling.roll('bowling_pf',2,cellX(3),6);tick(g,.4);
 assert.equal(nut.sheep,undefined);assert.equal(pad.sheep,undefined);assert.ok(!g.graves.includes(cover));
});
test('octopus respects immune cells and guacodile can use the all-water conveyor stage',()=>{
 const g=create(17);g.addPlant('wallnut',2,4);const nut=g.plants.find(p=>p.kind==='wallnut')!;nut.action='food';const z=g.spawnZombie('beach_octopus',2,cellX(7));z.octopus!.cooldown=0;
 g.beach.octopuses.tickZombie(z,.1);const target=g.plants.find(p=>p.id===z.octopus!.target)!;assert.ok(target.row!==nut.row||target.column!==nut.column);
 const water=create(18);tick(water,3.1);const packet=water.conveyor.find(p=>p.kind==='guacodile')!;assert.ok(packet);
 assert.ok(water.plant('guacodile',2,3,packet.id));const p=water.plants.find(p=>p.kind==='guacodile')!;
 water.spawnZombie('beach',2,cellX(3)+20);tick(water,.5);assert.ok(!water.plants.includes(p));assert.ok(water.darkFinale.runners.length>0);
});
