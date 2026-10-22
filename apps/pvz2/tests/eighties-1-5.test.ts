import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,props,read,tick} from './eighties-fixture';
import {cellX,type PlantKind} from '../src/game/level';
import {BATTLE_LEVELS,availablePlants} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {LEVEL_ROUTES} from '../src/shell/navigation';
for(const day of [1,2,3,4,5])test(`Eighties ${day}: controlled settlement and referenced resources`,()=>{
 const g=create(day);
 for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);assert.equal(LEVEL_ROUTES[`eighties${day}`],`eighties${day}`);
 const config=BATTLE_LEVELS[`eighties${day}`],l=level(day),catalogs=['battle','campaign',...config.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...l.protectedPlants.map(p=>p.kind),...l.initialPlants.map(p=>p.kind),...(l.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...l.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 for(const name of battleActors(l,plants)){const spec=actors[name],sk=read(spec?`${spec.group}/rigs/${spec.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(spec?sk.armature.some((a:{name:string})=>a.name===spec.armature):sk.armature.length,name);}
 for(const name of battleEffects(l,plants)){assert.ok(rigs[name],name);const spec=rigs[name],sk=read(`${spec.group}/rigs/${spec.rig}/skeleton.json`);assert.ok(sk.armature.some((a:{name:string})=>a.name===spec.armature),name);}
});
test('authored music, sun, conveyor, preplants and rewards remain intact',()=>{
 assert.deepEqual([1,2,3,4,5].map(d=>level(d).waves.length),[10,10,12,12,12]);
 assert.deepEqual([1,2,3,4,5].map(d=>level(d).sunDrops),[true,true,false,true,true]);
 assert.ok([1,2,3,4,5].every(d=>level(d).mowers));
 assert.deepEqual(level(1).actions.flatMap((w,i)=>w.flatMap(a=>a.jams?.map(j=>[i+1,j])??[])),[[1,'jam_rap'],[5,'jam_punk'],[8,'jam_pop']]);
 assert.deepEqual(level(2).initialPlants,[{kind:'phatbeet',row:1,column:5}]);
 assert.deepEqual(level(2).chooserPlants,['phatbeet']);
 assert.deepEqual(level(4).chooserPlants,['phatbeet','sunflower','spikeweed']);
 assert.deepEqual(level(3).conveyor!.InitialPlantList.map(p=>p.PlantType),['cactus']);
 assert.deepEqual(level(3).actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[]),['stallia','chardguard']);
 assert.equal(level(5).mustProtect,4);assert.equal(level(5).protectedPlants.length,4);
 assert.equal(BATTLE_LEVELS.eighties1.firstReward.plant,'phatbeet');assert.equal(BATTLE_LEVELS.eighties5.firstReward.plant,'celerystalker');
 assert.ok(!availablePlants(BATTLE_LEVELS.eighties1,new Set([137])).includes('phatbeet'));assert.ok(availablePlants(BATTLE_LEVELS.eighties2,new Set([137])).includes('phatbeet'));
 const narratives=read('eighties/catalog.json').narratives;for(const d of [1,2,3])assert.ok(narratives[`EIGHTIES_${d}_INTRO`].some((s:{Lines?:unknown})=>s.Lines));
});
const isolated=()=>{const g=create(4);Object.assign(g,{nextWave:Infinity});g.plants=[];g.graves=[];return g;};
test('Phat Beet damages adjacent rows, alternates heavy hits, and uses near/far food damage',()=>{
 const g=isolated();g.addPlant('phatbeet',2,4);const a=g.spawnZombie('eighties',1,cellX(5)),b=g.spawnZombie('eighties',4,cellX(6));a.frozenUntil=b.frozenUntil=Infinity;
 tick(g,1);assert.equal(a.hp,190-15);assert.equal(b.hp,190);tick(g,1);assert.equal(a.hp,190-15-45);
 a.hp=b.hp=2000;g.food=1;assert.ok(g.plantFood(2,4));tick(g,1.3);assert.equal(a.hp,1200);assert.equal(b.hp,1800);
});
test('Cactus pierces, hides without being eaten, and retains the plant-food upgrade',()=>{
 const g=isolated();g.addPlant('cactus',2,1);const p=g.plants[0],targets=[3,4,5].map(c=>g.spawnZombie('eighties',2,cellX(c)));for(const z of targets)z.frozenUntil=Infinity;
 tick(g,1);assert.ok(targets.every(z=>z.hp===160));
 const close=g.spawnZombie('eighties',2,cellX(1)+15);const hp=p.hp;tick(g,1.2);assert.equal(p.hidden,true);assert.equal(p.hp,hp);assert.ok(close.hp<190);
 g.food=1;assert.ok(g.plantFood(2,1));tick(g,3);assert.ok(g.eighties.lit.has(p.id));g.food=1;assert.equal(g.plantFood(2,1),false);
 g.zombies=[];tick(g,1);assert.equal(p.hidden,false);assert.equal(p.animation,'Idle');
});
test('Punk kicks only during punk music, skips occupied cells and respects unpushable plants',()=>{
 const g=isolated();g.addPlant('wallnut',2,4);g.addPlant('wallnut',2,3);const p=g.plants[0],z=g.spawnZombie('eighties_punk',2,cellX(4)+25);
 assert.equal(g.eighties.kick(z,p),false);g.eighties.jam='jam_punk';assert.equal(g.eighties.kick(z,p),true);assert.equal(p.column,2);assert.equal(p.leap!.duration,.5);assert.equal(g.plants[1].column,3);
 assert.equal(g.eighties.kick(z,p),false);g.time+=props.zombies.eighties_punk.PushCooldown;p.leap=undefined;
 g.addPlant('turnip',1,3);assert.equal(g.eighties.kick(z,g.plants[2]),false);
 g.addPlant('wallnut',0,0);assert.equal(g.eighties.kick(z,g.plants[3]),true);assert.equal(g.plants[3].hp,0);
});

test('a kicked Phat Beet lands and resumes attacking',()=>{
 const g=isolated();g.addPlant('phatbeet',2,4);const p=g.plants[0],z=g.spawnZombie('eighties_punk',2,cellX(4)+25);g.eighties.jam='jam_punk';assert.ok(g.eighties.kick(z,p));assert.equal(p.column,3);tick(g,.6);assert.equal(p.leap,undefined);tick(g,1);assert.ok(z.hp<250);
});
