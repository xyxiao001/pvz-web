import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,tick,props} from './future-fixture';
import {cellX,rowY} from '../src/game/level';
import {playFutureNext} from './future-strategy';
const quiet=(day=10)=>{const g=create(day);g['nextWave']=Infinity;g.level.waves=[[]];return g;};
test('Future 6–10 retain fixed cards, night conveyor, active limit and native waves',()=>{
 assert.deepEqual([6,7,8,9,10].map(d=>level(d).waves.length),[16,18,18,16,16]);
 assert.deepEqual(level(6).preset,['sunflower','peashooter','laser_bean','blover','bonkchoy','wallnut']);
 assert.equal(level(8).mowers,false);assert.equal(level(8).sunDrops,false);assert.equal(level(8).conveyor!.InitialPlantList.length,5);
 assert.equal(level(9).maxPlants,15);assert.equal(level(7).maxPlants,null);assert.equal(level(10).maxPlants,null);
});
test('citron charges, shoots 800 damage plasma and restarts its charge cycle',()=>{
 const g=quiet();const p=g.addPlant('citron',2,0),z=g.spawnZombie('mech_cone',2,cellX(7));tick(g,4);assert.equal(z.hp,2500);tick(g,3);assert.equal(z.hp,1700);assert.equal(g.plants[0].animation,'Charge');
});
test('citron food tosses regular targets but hits and stops at mechanical heavies',()=>{
 const g=quiet();g.addPlant('citron',2,0);g.food=1;const regular=g.spawnZombie('future_armor2',2,cellX(3)),heavy=g.spawnZombie('future_gargantuar',2,cellX(5)),behind=g.spawnZombie('future_armor2',2,cellX(8));g.plantFood(2,0);tick(g,2);assert.equal(regular.deathCause,'toss');assert.equal(heavy.hp,1100);assert.equal(behind.hp,190);assert.equal(g.future.shots.length,0);
});
test('EMP only disables mechanical zombies in the authored cross, then recovers',()=>{
 const g=quiet();const mech=g.spawnZombie('mech_cone',2,cellX(4)),normal=g.spawnZombie('future',2,cellX(4)),outside=g.spawnZombie('disco_mech',4,cellX(6));g.addPlant('empea',2,3);tick(g,.4);assert.equal(mech.future!.animation,'StunStart');assert.equal(normal.future,undefined);assert.equal(outside.future!.empUntil,undefined);const x=mech.x;tick(g,8);assert.equal(mech.x,x);assert.equal(mech.future!.animation,'StunLoop');tick(g,4);assert.ok(mech.x<x);assert.equal(g.plants.length,0);
});
test('disco summons four dancers; EMP cancels active summons and recovers',()=>{
 const g=quiet();const z=g.spawnZombie('disco_mech',2,cellX(7));tick(g,7);assert.equal(g.zombies.filter(z=>z.kind==='future_jetpack_disco').length,4);g.future.emp(z,10);tick(g,.1);assert.equal(g.zombies.filter(z=>z.kind==='future_jetpack_disco').length,0);tick(g,13);assert.ok(z.x<cellX(7));
});
test('gargantuar throws one imp below half HP, fires a beam, and EMP cancels it',()=>{
 const g=quiet(8);const z=g.spawnZombie('future_gargantuar',2,cellX(7));z.hp=1700;tick(g,1.5);assert.equal(g.zombies.filter(z=>z.kind==='future_imp').length,1);assert.equal(z.future!.imp,false);tick(g,16);assert.ok(z.future!.beam||z.future!.animation==='ShootEnd');g.future.emp(z,10);assert.equal(z.future!.beam,undefined);assert.equal(z.future!.animation,'StunStart');
});
for(const day of [6,7,8,9,10])test(`Future ${day} legal replay`,()=>{
 const g=create(day);for(let f=0;f<60000&&g.phase==='playing';f++){playFutureNext(g,f);g.tick(1/60);g.events.length=0;}
 console.log('future'+day,g.phase,g.time,g.wave,g.lossReason);assert.equal(g.phase,'won');
});

test('wave-three power tile packets use native weights, dig event and shared squares',()=>{
 const g=quiet(8);const action=g.level.actions.flat().find(a=>a.mode==='conveyor')!;
 assert.deepEqual(action.add!.map(p=>[p.PlantType,p.MaxCount,p.Weight]),[['powerplant_alpha',3,50],['powerplant_beta',3,50]]);
 g.addPlant('laser_bean',2,1);g.conveyor.push({id:900,kind:'powerplant_alpha',lane:0,position:0});assert.equal(g.plant('powerplant_alpha',2,1,900),true);
 tick(g,1.7);assert.equal(g.level.powerTiles.length,0);tick(g,.2);assert.deepEqual(g.level.powerTiles,[{group:'alpha',row:2,column:1,delay:1}]);assert.equal(g.plants.length,1);
 g.conveyor.push({id:901,kind:'powerplant_beta',lane:0,position:0});assert.equal(g.plant('powerplant_beta',2,1,901),false);assert.ok(g.conveyor.some(p=>p.id===901));
});
test('EMP and freeze release giant beam; disco dancers survive completed summoning',()=>{
 const g=quiet(10),z=g.spawnZombie('disco_mech',2,cellX(7));tick(g,11);const dancers=g.zombies.filter(z=>z.kind==='future_jetpack_disco');assert.equal(dancers.length,4);g.future.emp(z,2);tick(g,.1);assert.ok(dancers.every(z=>z.hp>0));
 const giant=g.spawnZombie('future_gargantuar',4,cellX(8));tick(g,14.3);assert.ok(giant.future!.beam);g['freeze'](giant,2);tick(g,.1);assert.equal(giant.future!.beam,undefined);
});

import {readFileSync} from 'node:fs';
import {ProgressStore,completionEvents} from '../src/shell/progression';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {FUTURE_LEVELS} from '../src/game/worlds/future';
import {seedCardAnimation} from '../src/rendering/presentation';
import type {WorldMap} from '../src/shell/types';
const read=(path:string)=>JSON.parse(readFileSync(new URL('../public/assets/'+path,import.meta.url),'utf8'));
test('Future 6–10 rewards persist exactly once and display native cards and map rigs',()=>{
 const data=new Map<string,string>(),store=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}}),map=read('shell/maps/future.json') as WorldMap;
 for(let day=1;day<=10;day++){const id=`future${day}`;store.finish('future',id);for(const event of completionEvents(map,id,store.completed(map),store.rewardNodes('future')))if(event.action==='reward')store.award('future',map.islands.find(n=>n.node===event.node)!);store.finishPresentation();}
 for(const day of [7,8])store.finish('future',`future${day}`);
 assert.ok(store.ownedPlants().has(88));assert.ok(store.ownedPlants().has(87));assert.equal(store.worldKeys(),1);assert.equal(store.campaignRewards().filter(r=>r.id==='note_future').length,1);
 const cards=read('shell/rigs/91731241-49e8-4db3-bb69-f04d4f4762d6/skeleton.json').armature.find((a:{name:string})=>a.name==='plants');
 for(const kind of ['citron','empea','powerplant_alpha','powerplant_beta'] as const)assert.ok(cards.animation.some((a:{name:string})=>a.name===seedCardAnimation(kind)));
 const displays=read('shell/progression.json');for(const id of [87,88])assert.ok(displays.plants[id].length);
 assert.ok(read('future/catalog.json').ui.note_future.image);
});
test('Future conveyor resource plan includes tool plants and all summoned actors',()=>{
 const config=FUTURE_LEVELS.future8,l=level(8),plants=[...config.plants.map(p=>p.kind),...l.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])];
 const actors=battleActors(l,plants),effects=battleEffects(l,plants);
 for(const name of ['futureGargantuar','futureImp','powerplant_alpha','powerplant_beta'])assert.ok(actors.includes(name));
 for(const name of ['futureNightLawn','gargEye','gargHit','gargRay','tile_alpha','tile_beta','zombossicon'])assert.ok(effects.includes(name));
 assert.ok(battleActors(level(10),[]).includes('discoJetpack'));
});
test('protector shield consumes citron food through its native projectile interception',()=>{
 const g=quiet();const owner=g.spawnZombie('future_protector',2,cellX(6));tick(g,.1);g.addPlant('citron',2,1);g.food=1;g.plantFood(2,1);tick(g,2);assert.equal(owner.hp,props.zombies.future_protector.Toughness-props.projectiles.citron_pf.SplashDamage[0].Damage!);assert.equal(g.zombies.filter(z=>z.kind==='future_protector_shield').length,0);assert.equal(g.future.shots.length,0);
});

test('digging tile tools remain undetectable and invincible to the mechanical giant',()=>{
 const g=quiet(8);g.addPlant('powerplant_alpha',2,2);const p=g.plants[0],z=g.spawnZombie('future_gargantuar',2,cellX(2)+20),hp=p.hp;
 g.future.tickZombie(z,.1);assert.equal(z.future!.animation,'Walk');
 Object.assign(z.future!,{animation:'Smash',elapsed:0,event:0});g.future.tickZombie(z,1);assert.equal(p.hp,hp);
 const point={x:cellX(2),y:rowY(2)-40};Object.assign(z.future!,{animation:'ShootLoop',elapsed:0,event:0,beam:{from:point,to:point,...point}});g.future.tickZombie(z,.1);assert.equal(p.hp,hp);
 tick(g,2);assert.ok(g.level.powerTiles.some(t=>t.row===2&&t.column===2&&t.group==='alpha'));
});
