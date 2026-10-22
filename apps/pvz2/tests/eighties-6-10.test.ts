import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,props,read,tick} from './eighties-fixture';
import {cellX,type PlantKind} from '../src/game/level';
import {BATTLE_LEVELS,availablePlants} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {LEVEL_ROUTES} from '../src/shell/navigation';
for(const day of [6,7,8,9,10])test(`Eighties ${day}: controlled settlement and referenced resources`,()=>{
 const g=create(day);if(day===9)g.dropSun(400,200,2000,'plant');
 for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);assert.equal(LEVEL_ROUTES[`eighties${day}`],`eighties${day}`);
 const config=BATTLE_LEVELS[`eighties${day}`],l=level(day),catalogs=['battle','campaign',...config.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...l.protectedPlants.map(p=>p.kind),...l.initialPlants.map(p=>p.kind),...(l.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...l.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 for(const name of battleActors(l,plants)){const spec=actors[name],sk=read(spec?`${spec.group}/rigs/${spec.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(spec?sk.armature.some((a:{name:string})=>a.name===spec.armature):sk.armature.length,name);}
 for(const name of battleEffects(l,plants)){assert.ok(rigs[name],name);const spec=rigs[name],sk=read(`${spec.group}/rigs/${spec.rig}/skeleton.json`);assert.ok(sk.armature.some((a:{name:string})=>a.name===spec.armature),name);}
});
test('authored decks, conveyors, sun goal, music and unlock',()=>{
 assert.deepEqual([6,7,8,9,10].map(d=>level(d).waves.length),[10,12,12,12,12]);
 assert.deepEqual([6,7,8,9,10].map(d=>level(d).sunDrops),[false,true,true,true,false]);
 assert.deepEqual(level(7).chooserPlants,['celerystalker','magnetshroom']);
 assert.equal(BATTLE_LEVELS.eighties9.mode,'preset');
 assert.deepEqual(level(9).preset,['peashooter','phatbeet','celerystalker','iceburg','stunion']);
 assert.equal(level(9).targetSun,2000);assert.equal(level(9).initialPlants.length,10);assert.ok(level(9).initialPlants.every(p=>p.kind==='sunflower'&&[7,8].includes(p.column)));
 assert.deepEqual(level(6).actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[]),['fumeshroom','phatbeet']);
 assert.deepEqual(level(10).actions.flatMap((w,i)=>w.flatMap(a=>a.add?.map(p=>[i+1,p.PlantType])??[])),[[2,'thymewarp'],[3,'phatbeet'],[10,'spikerock']]);
 assert.deepEqual(level(10).actions.flatMap((w,i)=>w.flatMap(a=>a.jams?.map(j=>[i+1,j])??[])),[[2,'jam_punk'],[9,'jam_rap'],[11,'jam_punk']]);
 assert.equal(BATTLE_LEVELS.eighties9.firstReward.plant,'thymewarp');assert.ok(availablePlants(BATTLE_LEVELS.eighties10,new Set([139])).includes('thymewarp'));
});
const isolated=()=>{const g=create(8);Object.assign(g,{nextWave:Infinity});g.plants=[];g.graves=[];return g;};
test('Glitter protects its rear lane during pop, clears control, and crushes plants',()=>{
 const g=isolated(),leader=g.spawnZombie('eighties_glitter',2,cellX(4)),rear=g.spawnZombie('eighties',2,cellX(6)),front=g.spawnZombie('eighties',2,cellX(3)),side=g.spawnZombie('eighties',1,cellX(6));
 rear.frozenUntil=100;rear.poison={until:100,dps:20};g.eighties.jam='jam_pop';tick(g,.1);
 assert.ok(g.eighties.protected(rear));assert.equal(rear.frozenUntil,0);assert.equal(rear.poison,undefined);g.damage(rear,100);g.freeze(rear,5);assert.equal(rear.hp,190);assert.equal(rear.frozenUntil,0);
 assert.equal(g.eighties.protected(leader),false);assert.equal(g.eighties.protected(front),false);assert.equal(g.eighties.protected(side),false);
 g.addPlant('wallnut',2,4);assert.ok(g.eighties.crush(leader,g.plants[0]));assert.equal(g.plants[0].hp,0);
 g.eighties.jam='jam_punk';tick(g,.4);g.damage(rear,20);assert.equal(rear.hp,170);assert.equal(g.eighties.protected(rear),false);
});
test('MC rap attack uses the native event and skips ground plants',()=>{
 const g=isolated();g.addPlant('wallnut',2,4);g.addPlant('wallnut',1,5);g.addPlant('spikerock',3,5);const z=g.spawnZombie('eighties_mc',2,cellX(5));
 assert.equal(g.eighties.zombie(z,.1),false);g.eighties.jam='jam_rap';g.eighties.zombie(z,.7);assert.equal(g.plants[0].hp,4000);g.eighties.zombie(z,.11);assert.equal(g.plants[0].hp,1999);assert.equal(g.plants[1].hp,1999);assert.equal(g.plants[2].hp,props.plants.spikerock.Toughness);
 g.eighties.zombie(z,2);assert.equal(g.eighties.mc.has(z.id),false);
});
test('Thyme Warp restores health and surviving armor, disappears and returns zombies to the last column',()=>{
 const g=isolated(),z=g.spawnZombie('eighties_armor2',2,cellX(3)),bare=g.spawnZombie('eighties_armor1',1,cellX(4));z.hp=80;z.armor=20;z.frozenUntil=100;bare.hp=40;bare.armor=0;
 g.addPlant('thymewarp',0,1);assert.equal(z.hp,props.zombies.eighties_armor2.Toughness);assert.equal(z.armor,props.armors.eighties_armor2.Toughness);assert.equal(bare.armor,0);assert.equal(z.frozenUntil,0);g.food=1;assert.equal(g.plantFood(0,1),false);
 tick(g,1.2);assert.equal(g.eighties.warpScale(z),0);g.damage(z,1000);assert.equal(z.hp,190);tick(g,4.9);assert.equal(z.x,cellX(8));assert.ok(g.eighties.warps.has(z.id));tick(g,1.3);assert.equal(g.eighties.warps.has(z.id),false);assert.ok(!g.plants.some(p=>p.kind==='thymewarp'));assert.ok(z.x<cellX(8));
});
test('Magnet-shroom removes Punk heads and consumes them five times faster',()=>{
 const g=isolated();g.addPlant('magnetshroom',2,3);const p=g.plants[0],z=g.spawnZombie('eighties_punk',2,cellX(5));tick(g,.4);assert.equal(z.hp,0);assert.ok(z.magnetized);assert.equal(g.western.metals[0].name,'punkHead');const state=g.western.magnets.get(p.id)!;assert.ok(state.restUntil-g.time<=props.plants.magnetshroom.RestTime/5);tick(g,props.plants.magnetshroom.RestTime/5+1);assert.equal(g.western.metals.length,0);
});
