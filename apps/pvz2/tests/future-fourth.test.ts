import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,tick,props} from './future-fixture';
import {cellX,type PlantKind} from '../src/game/level';
import {playFutureFourth} from './future-strategy';
const quiet=()=>{const g=create(20);g.plants=[];g['nextWave']=Infinity;g.level.waves=[[]];g.level.mustProtect=0;return g;};
test('Future 16–20 retain native modes, waves, objectives and tile tools',()=>{
 assert.deepEqual([16,17,18,19,20].map(d=>level(d).waves.length),[16,12,16,18,18]);
 const belt=level(16);assert.equal(belt.sunDrops,false);assert.equal(belt.mowers,true);assert.ok(belt.conveyor!.InitialPlantList.some(p=>p.PlantType==='powerplant_alpha'&&p.MaxCount===4));assert.equal(belt.actions[4][1].add![0].PlantType,'blover');assert.equal(belt.actions[5][1].add![0].PlantType,'empea');
 assert.deepEqual(level(17).preset,['sunflower','twinsunflower','magnifyinggrass','holonut','empea','iceburg']);assert.equal(level(18).targetSun,6000);assert.equal(level(19).sunDropper!.SunCountdownBase,4);assert.ok(level(19).blacklist.includes('sunflower'));assert.equal(level(20).mustProtect,5);assert.ok(create(20).plants.every(p=>p.endangered&&p.kind==='starfruit'&&p.column===5));
});
test('Starfruit emits five native directions at Shoot and its rear projectile damages a zombie',()=>{
 const g=quiet();g.addPlant('starfruit',2,4);const z=g.spawnZombie('future_armor2',2,cellX(2));z.frozenUntil=100;const before=z.armor;tick(g,.65);assert.equal(g.future.stars.length,0);tick(g,.05);assert.equal(g.future.stars.length,5);assert.equal(g.future.stars.filter(s=>s.vx<0).length,1);assert.equal(g.future.stars.filter(s=>s.vx===0).length,2);assert.equal(g.future.stars.filter(s=>s.vx>0).length,2);tick(g,.25);assert.equal(z.armor,before-props.projectiles.star.Damage);
});
test('Starfruit does not shoot straight ahead, detects diagonals and completes 30 five-shot food volleys',()=>{
 const g=quiet();g.addPlant('starfruit',2,4);const p=g.plants[0],z=g.spawnZombie('future',2,cellX(8));z.frozenUntil=100;tick(g,1.5);assert.equal(p.action,'idle');z.row=1;z.x=cellX(4)+1.732*82;tick(g,.1);assert.equal(p.action,'shoot');z.hp=0;tick(g,.1);
 let shots=0;// Count emitted shots independently of off-board expiry.
 const emit=g.future['shootStars'].bind(g.future);g.future['shootStars']=(plant,food)=>{if(food)shots+=5;emit(plant,food);};
 g.food=1;g.plantFood(2,4);tick(g,3);assert.equal(shots,150);assert.equal(p.action,'idle');assert.equal(g.future['starFood'].size,0);tick(g,2);assert.equal(g.future.stars.length,0);
});
for(const day of [16,17,18,19,20])test(`Future ${day} legal replay`,()=>{
 const g=create(day),used=new Set<PlantKind>(),plant=g.plant.bind(g);g.plant=(kind,r,c,packet)=>{const result=plant(kind,r,c,packet);if(result)used.add(kind);return result;};
 for(let f=0;f<60000&&g.phase==='playing';f++){playFutureFourth(g,f);g.tick(1/60);g.events.length=0;}
 console.log('future'+day,g.phase,g.time,g.wave,g.lossReason,g.sunProduced,[...used]);assert.equal(g.phase,'won');if(!g.level.conveyor)assert.ok(used.size<=6);if(g.level.preset)assert.ok([...used].every(k=>g.level.preset!.includes(k)));if(day===18)assert.ok(g.sunProduced>=6000);
});

import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {FUTURE_LEVELS} from '../src/game/worlds/future';
import {ProgressStore,completionEvents} from '../src/shell/progression';
import type {WorldMap} from '../src/shell/types';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
const read=(file:string)=>JSON.parse(readFileSync(new URL('../public/assets/'+file,import.meta.url),'utf8'));
test('Future 16–20 source hashes, resource plans and map rewards agree',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../future-provenance.json',import.meta.url),'utf8'));
 for(let day=16;day<=20;day++){const path=`future/future${day}.source.json`,bytes=readFileSync(new URL('../public/assets/'+path,import.meta.url));assert.equal(manifest.outputs[path].sha256,createHash('sha256').update(bytes).digest('hex'));assert.equal(FUTURE_LEVELS['future'+day].source,path);}
 assert.ok(battleEffects(level(16),['powerplant_alpha']).includes('futureNightLawn'));assert.ok(battleEffects(level(20),['starfruit']).includes('starFoodHit'));assert.ok(battleActors(level(20),['starfruit']).includes('starfruit'));
 const data=new Map<string,string>(),store=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}}),map=read('shell/maps/future.json') as WorldMap;
 for(let day=1;day<=20;day++){const id='future'+day;store.finish('future',id);for(const event of completionEvents(map,id,store.completed(map),store.rewardNodes('future')))if(event.action==='reward')store.award('future',map.islands.find(n=>n.node===event.node)!);store.finishPresentation();}
 assert.ok(store.ownedPlants().has(69));assert.ok(store.ownedUpgrades().has(11));assert.equal(store.battleBonuses().manualMowers,1);assert.ok(read('shell/progression.json').plants[69].length);assert.equal(FUTURE_LEVELS.future20.firstReward.image,'upgrade_manual_mowers_1');
});
test('Future 18 fails without produced sun and Future 20 fails if a protected starfruit dies',()=>{
 const g=create(18);g.wave=g.level.waves.length;g['nextWave']=Infinity;tick(g,.1);assert.equal(g.phase,'lost');assert.equal(g.lossReason,'sunProduced');
 const h=create(20);h.plants[0].hp=0;tick(h,.1);assert.equal(h.phase,'lost');assert.equal(h.lossReason,'protected');
});
test('Starfruit food uses 200 damage and is intercepted by a protector shield',()=>{
 const g=quiet();g.addPlant('starfruit',2,2);const master=g.spawnZombie('future_protector',2,cellX(7));master.frozenUntil=0;tick(g,.1);const shield=g.zombies.find(z=>z.kind==='future_protector_shield'&&z.row===2)!;const hp=master.hp;
 g.future.stars.push({id:10000,x:shield.x-40,y:240+98*2-33,vx:500,vy:0,food:true,dead:false});tick(g,.05);assert.equal(master.hp,hp);assert.equal(shield.hp,props.zombies.future_protector_shield.Toughness-200);assert.equal(g.future.stars.length,0);
});
