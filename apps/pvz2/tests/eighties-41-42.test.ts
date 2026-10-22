import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,props,read,tick} from './eighties-fixture';
import {cellX,type PlantKind} from '../src/game/level';
import {BATTLE_LEVELS} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {LEVEL_ROUTES} from '../src/shell/navigation';
import {EightiesBoss} from '../src/game/eighties-boss';

for(const day of [41,42])test(`Eighties ${day}: route and all referenced rigs`,()=>{
 assert.equal(LEVEL_ROUTES[`eighties${day}`],`eighties${day}`);
 const config=BATTLE_LEVELS[`eighties${day}`],l=level(day),catalogs=['battle','campaign',...config.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 if(day===42)actors.boss=actors.eightiesBoss;
 const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...l.initialPlants.map(p=>p.kind),...l.conveyor!.InitialPlantList.map(p=>p.PlantType),...l.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 for(const name of battleActors(l,plants)){const spec=actors[name],sk=read(spec?`${spec.group}/rigs/${spec.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(spec?sk.armature.some((a:{name:string})=>a.name===spec.armature):sk.armature.length,name);}
 for(const name of battleEffects(l,plants)){assert.ok(rigs[name],name);const spec=rigs[name],sk=read(`${spec.group}/rigs/${spec.rig}/skeleton.json`);assert.ok(sk.armature.some((a:{name:string})=>a.name===spec.armature),name);}
});
test('41–42 are the last two conveyors, retain native dialogue and no extra permanent rewards',()=>{
 assert.equal(Object.values(BATTLE_LEVELS).filter(l=>l.world==='eighties').length,42);assert.equal(BATTLE_LEVELS.eighties43,undefined);
 const a=level(41),b=level(42);assert.equal(a.initialPlants.length,35);assert.equal(a.conveyor!.InitialPlantList.length,0);assert.equal(a.mowers,false);assert.equal(b.mowers,false);assert.equal(b.graves.length,0);assert.equal(b.boss!.kind,'zombossmech_eighties2');assert.equal(b.waves.length,0);
 assert.deepEqual(b.conveyor!.InitialPlantList.map(p=>p.PlantType),['strawburst','hollyknight','phatbeet','sporeshroom','loquat']);
 for(const day of [41,42]){assert.equal(BATTLE_LEVELS[`eighties${day}`].mode,'conveyor');assert.ok(read('eighties/catalog.json').narratives[`EIGHTIES_${day}_INTRO`].length);assert.equal(BATTLE_LEVELS[`eighties${day}`].firstReward.label,'');}
 assert.equal(BATTLE_LEVELS.eighties42.outro,'EIGHTIES_42_OUTRO');assert.ok(read('eighties/catalog.json').narratives.EIGHTIES_42_OUTRO.length);
});
test('41 clears the authored board once and carrots restore its exact plant types at half health',()=>{
 const g=create(41);assert.equal(g.plants.length,35);tick(g,.5);assert.equal(g.plants.length,0);assert.equal(g.eighties.carrot.cells.size,35);
 for(const c of [0,1,2,3,4,5,6])g.addPlant('intensivecarrot',2,c);
 assert.deepEqual(g.plants.map(p=>p.kind),['puffshroom','phatbeet','gumnut','puffshroom','celerystalker','coconutcannon','spikerock']);
 for(const p of g.plants)assert.equal(p.hp,props.plants[p.kind].Toughness*.5);tick(g,1);assert.equal(g.plants.length,7);
});
test('41 retains four delayed reinforcement groups and wave carrot allotments',()=>{
 const l=level(41);assert.deepEqual(l.actions.flat().filter(a=>a.delay).map(a=>a.delay),[{Max:5,Min:3.5},{Max:7,Min:7},{Max:20,Min:18},{Max:8,Min:8}]);
 assert.ok(l.actions.flat().filter(a=>a.delay).every(a=>a.zombies.length>0));assert.ok(l.actions.flat().filter(a=>a.mode==='conveyor').every(a=>a.add!.every(p=>p.PlantType==='intensivecarrot')));
 const g=create(41);tick(g,.5);g.wave=2;Object.assign(g,{nextWave:g.time});tick(g,.1);const before=g.zombies.length;tick(g,3);assert.equal(g.zombies.length,before);tick(g,2);assert.ok(g.zombies.length>before);
});
test('41 controlled settlement reaches victory after all waves and delayed reinforcements',()=>{
 const g=create(41);for(let i=0;i<40000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);
});
const isolated=()=>{const g=create(40);g.startLastStand();Object.assign(g,{nextWave:Infinity});g.plants=[];g.sun=5000;return g;};
test('gumnut traps on its native frame, gum health uses base toughness and zombies chew it free',()=>{
 const g=isolated();g.addPlant('gumnut',2,3);const p=g.plants[0],z=g.spawnZombie('eighties_armor4',2,cellX(3)+25);tick(g,1.4);assert.equal(g.eighties.finale.gums.size,0);tick(g,.3);assert.equal(p.hp,0);const gum=g.eighties.finale.gums.get(z.id)!;assert.ok(gum);assert.equal(gum.max,4570);assert.ok(gum.hp<gum.max);const x=z.x;tick(g,1);assert.equal(z.x,x);gum.hp=1;tick(g,.1);assert.equal(g.eighties.finale.gums.size,0);
});
test('gumnut food keeps the plant and gums five distant eligible targets',()=>{
 const g=isolated();g.addPlant('gumnut',0,0);for(let i=0;i<6;i++)g.spawnZombie('eighties',i%5,cellX(7));g.food=1;g.plantFood(0,0);tick(g,3);assert.equal(g.eighties.finale.gums.size,5);assert.ok(g.plants[0].hp>0);assert.equal(g.plants[0].action,'idle');
});
test('strawburst grows, fires by click, rests and regrows; ripe splash excludes the direct target',()=>{
 const g=isolated();g.addPlant('strawburst',2,0);const p=g.plants[0],s=g.eighties.finale.states.get(p.id)!;tick(g,25.2);assert.equal(s.stage,2);tick(g,1);
 const z=g.spawnZombie('eighties_armor4',2,cellX(7)),near=g.spawnZombie('eighties_armor4',1,cellX(7));z.frozenUntil=near.frozenUntil=100;
 assert.equal(g.eighties.finale.click(2,0),true);tick(g,.9);assert.equal(z.armor,1300);assert.equal(near.armor,1300);tick(g,.3);assert.equal(s.stage,-1);assert.equal(g.eighties.finale.click(2,0),false);tick(g,8);assert.equal(s.stage,0);
});
test('strawburst eaten while ripe explodes; food readies a large berry and deals 400 board damage',()=>{
 const g=isolated();g.addPlant('strawburst',2,2);const p=g.plants[0],z=g.spawnZombie('eighties_armor4',2,cellX(2)+25);tick(g,.7);assert.equal(p.hp,0);assert.equal(z.armor,2000);
 g.plants=[];g.zombies=[];g.addPlant('strawburst',0,0);const distant=g.spawnZombie('eighties_armor4',4,cellX(7));distant.frozenUntil=100;g.food=1;g.plantFood(0,0);tick(g,2.4);assert.equal(distant.armor,1800);assert.equal(g.eighties.finale.states.get(g.plants[0].id)!.stage,2);
});
test('holly manual aim spends three leaves, spawns barriers and can be replanted to reload',()=>{
 const g=isolated();g.addPlant('hollyknight',2,0);const p=g.plants[0];for(let i=0;i<3;i++){assert.ok(g.eighties.finale.click(2,0));assert.ok(g.eighties.finale.fire(i,4));tick(g,1.6);}
 assert.equal(g.eighties.finale.states.get(p.id)!.ammo,0);assert.equal(g.plants.filter(p=>p.kind==='hollybarrierleaf').length,3);assert.equal(g.eighties.finale.click(2,0),false);
 assert.equal(g.plant('hollyknight',2,0),true);assert.equal(g.eighties.finale.states.get(p.id)!.ammo,3);
});
test('holly food restores ammunition, launches four strong leaves and barriers stab without food',()=>{
 const g=isolated();g.addPlant('hollyknight',0,0);const p=g.plants[0];g.eighties.finale.states.get(p.id)!.ammo=0;g.food=2;g.plantFood(0,0);tick(g,3);assert.equal(g.eighties.finale.states.get(p.id)!.ammo,3);const barriers=g.plants.filter(p=>p.kind==='hollybarrierleafplantfood');assert.equal(barriers.length,4);
 const b=barriers[0],z=g.spawnZombie('eighties_armor4',b.row,cellX(b.column)+65);z.frozenUntil=100;tick(g,1.1);assert.ok(z.armor<2200);assert.equal(g.plantFood(b.row,b.column),false);
});
test('loquat draws adjacent lanes toward its cell, stuns and expires without food',()=>{
 const g=isolated();g.addPlant('loquat',2,3);const z=g.spawnZombie('eighties_armor4',1,cellX(4));assert.equal(g.plantFood(2,3),false);tick(g,1.5);assert.equal(z.row,2);assert.ok(Math.abs(z.x-cellX(3))<10);assert.ok(z.stunnedUntil!>g.time);tick(g,3);assert.equal(g.eighties.finale.tornadoes.length,0);assert.equal(g.plants.length,0);
});
test('42 controlled boss settlement preserves all six genres, 23000 HP and death sequence',()=>{
 const g=create(42),boss=g.boss as EightiesBoss;assert.ok(boss instanceof EightiesBoss);assert.equal(boss.zombie.hp,23000);tick(g,8);
 for(const [i,jam] of ['jam_pop','jam_punk','jam_8bit','jam_rap','jam_punk','jam_metal'].entries()){assert.equal(boss.stage,i);assert.equal(g.eighties.jam,jam);boss.hit(100000);for(const z of g.zombies)if(z!==boss.zombie)g.damage(z,100000,'water');if(i<5)tick(g,boss.current.StunTime+.1);}
 tick(g,20);assert.equal(g.phase,'won');assert.equal(boss.defeated,true);
});
test('42 uses authored summon column offsets, including the arcade column',()=>{
 const g=create(42),boss=g.boss as EightiesBoss;tick(g,4);
 const summon=(arcade=false)=>{Object.assign(boss,{previous:boss.current.Actions.find(a=>a.actionName==='summon'&&(!arcade||a.summonProps.columnOffset===0)),repeatLeft:1,restLeft:0,shotLeft:0});tick(g,1.2);};
 summon();assert.ok(g.zombies.some(z=>z!==boss.zombie&&z.entryX===cellX(5)));
 boss.hit(100000);tick(g,2.6);boss.hit(100000);tick(g,2.6);summon(true);assert.ok(g.zombies.some(z=>z.kind==='eighties_arcade'&&z.entryX===cellX(8)));
});
