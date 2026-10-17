import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,tick,props,timing} from './future-fixture';
import {Game} from '../src/game/model';
import {cellX} from '../src/game/level';
import {playFutureThird} from './future-strategy';
const quiet=()=>{const g=create(13);g['nextWave']=Infinity;g.level.waves=[[]];return g;};
test('Future 11–15 retain authored waves, last stand, sun cap and protected citrons',()=>{
 assert.deepEqual([11,12,13,14,15].map(d=>level(d).waves.length),[10,18,16,12,16]);
 assert.deepEqual(level(11).lastStand,{sun:2750,food:3});assert.equal(level(11).sunDrops,false);assert.ok(level(11).blacklist.includes('sunflower'));assert.equal(level(14).maxSun,1500);assert.equal(level(13).maxSun,null);assert.equal(level(13).maxPlants,null);
 const g=create(15);assert.equal(g.plants.filter(p=>p.endangered&&p.kind==='citron'&&p.column===6).length,3);
});
test('football pushes a chain left at the native event and EMP interrupts a push',()=>{
 const g=quiet();g.addPlant('wallnut',2,3);g.addPlant('laser_bean',2,2);const z=g.spawnZombie('football_mech',2,cellX(3)+20);tick(g,.5);assert.deepEqual(g.plants.map(p=>p.column),[3,2]);tick(g,.3);assert.deepEqual(g.plants.map(p=>p.column),[2,1]);assert.ok(g.plants.every(p=>p.leap));
 g.future.emp(z,10);const x=z.x;tick(g,8);assert.equal(z.future!.animation,'StunLoop');assert.equal(z.x,x);
});
test('football throws the leftmost plant out and damages an immovable target',()=>{
 const g=quiet();g.addPlant('wallnut',2,0);g.spawnZombie('football_mech',2,cellX(0)+20);tick(g,.8);assert.equal(g.plants.length,0);
 const h=new Game(level(13),{...props,plants:{...props.plants,wallnut:{...props.plants.wallnut,CannotBePushedByFootballMech:true}}},timing,z=>({x:z.x,y:0}));h['nextWave']=Infinity;h.level.waves=[[]];h.addPlant('wallnut',2,3);h.spawnZombie('football_mech',2,cellX(3)+20);tick(h,.8);assert.equal(h.plants[0].column,3);assert.equal(h.plants[0].hp,props.plants.wallnut.Toughness-400);
});
test('infinut fades without dying, regrows after 15 seconds, and repairs by replant',()=>{
 const g=quiet();g.addPlant('holonut',2,2);const p=g.plants[0];p.hp=0;tick(g,.1);assert.equal(p.animation,'Fade');assert.equal(p.hidden,true);assert.equal(g.plantsLost,0);tick(g,14);assert.equal(p.hidden,true);tick(g,1.1);assert.equal(p.hp,2000);assert.equal(p.hidden,false);
 p.hp=1000;tick(g,.1);g.sun=75;assert.equal(g.plant('holonut',2,2),true);assert.equal(p.hp,2000);assert.equal(g.plants.length,1);
});
test('infinut food creates a shared 10000 HP shield, blocks all lanes and refreshes after damage',()=>{
 const g=quiet();g.addPlant('holonut',2,3);const p=g.plants[0];g.food=3;assert.equal(g.plantFood(2,3),true);tick(g,1.5);const s=g.future.holonuts.get(p.id)!;assert.equal(s.shield,10000);assert.equal(g.plantFood(2,3),false);
 const zs=[0,4].map(r=>g.spawnZombie('future',r,cellX(3)+20));tick(g,1);assert.ok(zs.every(z=>z.x===cellX(3)+20));assert.ok(s.shield<10000);assert.equal(p.hp,2000);assert.equal(g.plantFood(2,3),true);tick(g,1.5);g.shovel(2,3);tick(g,.1);assert.equal(g.future.holonuts.size,0);
});
test('football needs three pushes to break an infinut barrier',()=>{
 const g=quiet();g.addPlant('holonut',2,3);g.food=1;g.plantFood(2,3);tick(g,1.5);const s=g.future.holonuts.get(g.plants[0].id)!;g.spawnZombie('football_mech',0,cellX(3)+20);tick(g,.8);assert.ok(Math.abs(s.shield-20000/3)<.01);tick(g,5);assert.equal(s.shield,0);
});
for(const day of [11,12,13,14,15])test(`Future ${day} legal replay`,()=>{
 const g=create(day);for(let f=0;f<60000&&g.phase==='playing';f++){playFutureThird(g,f);g.tick(1/60);g.events.length=0;}
 console.log('future'+day,g.phase,g.time,g.wave,g.lossReason,g.sunSpent);assert.equal(g.phase,'won');
});

import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {FUTURE_LEVELS} from '../src/game/worlds/future';
import {ProgressStore} from '../src/shell/progression';
import {completionEvents} from '../src/shell/progression';
import type {WorldMap} from '../src/shell/types';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
const read=(file:string)=>JSON.parse(readFileSync(new URL('../public/assets/'+file,import.meta.url),'utf8'));
test('Future 11–15 export hashes, native resource plan and map rewards agree',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../future-provenance.json',import.meta.url),'utf8'));
 for(let day=11;day<=15;day++){const path=`future/future${day}.source.json`,bytes=readFileSync(new URL('../public/assets/'+path,import.meta.url));assert.equal(manifest.outputs[path].sha256,createHash('sha256').update(bytes).digest('hex'));assert.equal(FUTURE_LEVELS['future'+day].source,path);}
 assert.ok(battleActors(level(13),[]).includes('footballMech'));assert.ok(battleEffects(level(11),[]).includes('futureNightLawn'));assert.ok(battleEffects(level(14),['holonut']).includes('infinutShield'));
 const data=new Map<string,string>(),store=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}}),map=read('shell/maps/future.json') as WorldMap;
 for(let day=1;day<=15;day++){const id='future'+day;store.finish('future',id);for(const event of completionEvents(map,id,store.completed(map),store.rewardNodes('future')))if(event.action==='reward')store.award('future',map.islands.find(n=>n.node===event.node)!);store.finishPresentation();}
 store.finish('future','future11');store.finish('future','future15');assert.ok(store.ownedPlants().has(96));assert.equal(store.campaignRewards().filter(r=>['future11','future15'].includes(r.level)).length,2);assert.ok(read('shell/progression.json').plants[96].length);
});
