import {playCowboy} from './cowboy-strategy';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {create,level,tick,props} from './cowboy-fixture';
import {cellX,rowY} from '../src/game/level';
import {ProgressStore,completionEvents} from '../src/shell/progression';
import type {WorldMap} from '../src/shell/types';

test('Wild West 1–30 use pinned native waves, rails and manual corral packets',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../cowboy-provenance.json',import.meta.url),'utf8'));
 for(let day=1;day<=35;day++){
  const name=`cowboy/cowboy${day}.source.json`,bytes=readFileSync(new URL('../public/assets/'+name,import.meta.url));
  assert.equal(createHash('sha256').update(bytes).digest('hex'),manifest.outputs[name].sha256);
  assert.equal(level(day).world,'west');assert.ok(level(day).rails!.Railcarts.length>0);
 }
 assert.equal(level(4).corral,true);assert.equal(level(4).mowers,false);assert.equal(level(5).waves.length,16);
});
test('cart planting and dragging preserve the plant action, cooldown and rail boundaries',()=>{
 const g=create(1);g.sun=1000;
 assert.equal(g.plant('peashooter',0,0),false);assert.equal(g.plant('peashooter',1,0),true);
 const p=g.plants[0],cooldown=g.cooldowns.peashooter;p.action='shoot';p.actionAt=2;
 assert.equal(g.cowboy.select(1,0),true);assert.equal(g.cowboy.move(4),true);
 assert.equal(p.row,4);assert.equal(p.actionAt,2);assert.equal(g.cooldowns.peashooter,cooldown);
 assert.equal(g.cowboy.move(5),false);assert.equal(g.cowboy.canPlant(1,0),false);assert.equal(g.cowboy.canPlant(4,0),true);
});
test('corral pauses each wave until its single seed is planted and never draws timed packets',()=>{
 const g=create(4);tick(g,1);assert.equal(g.wave,1);assert.equal(g.corralWaiting,true);assert.equal(g.conveyor.length,1);
 const time=g.time,positions=g.zombies.map(z=>z.x);tick(g,60);assert.equal(g.time,time);assert.deepEqual(g.zombies.map(z=>z.x),positions);
 const packet=g.conveyor[0];assert.equal(g.plant('peashooter',0,0,packet.id),true);assert.equal(g.corralWaiting,false);tick(g,1);assert.equal(g.conveyor.length,0);
 for(const z of g.zombies)g.damage(z,100000);tick(g,1);assert.equal(g.wave,2);assert.equal(g.corralWaiting,true);assert.equal(g.conveyor.length,1);
});
test('prospector leaps to the rear and reverses; ice permanently extinguishes the fuse',()=>{
 const g=create(2);g['nextWave']=Infinity;const z=g.spawnZombie('prospector',2,cellX(7));tick(g,10.3);assert.ok(z.leap);assert.equal(z.west!.dirty,true);
 tick(g,1.1);assert.equal(z.reversed,true);assert.equal(z.x,cellX(0));tick(g,3);assert.ok(z.x>cellX(0));
 const cold=g.spawnZombie('prospector',0,cellX(7));g['chill'](cold,1);tick(g,13);assert.equal(cold.west!.ignited,false);assert.equal(cold.leap,null);assert.ok(!cold.reversed);
});
test('poncho and hidden plate absorb damage in source order, with overkill reaching the body',()=>{
 const g=create(5);const z=g.spawnZombie('poncho_plate',2,cellX(6));g.damage(z,100);
 assert.equal(z.west!.poncho,0);assert.equal(z.west!.plate,1060);assert.equal(z.hp,190);
 g.damage(z,1100);assert.equal(z.west!.plate,0);assert.equal(z.hp,150);assert.deepEqual(g.cowboy.effects.map(e=>e.kind),['ponchoBreak','plateDrop']);
 const plain=g.spawnZombie('poncho_no_plate',1,cellX(6));assert.equal(plain.west!.plate,0);
});
test('piano drives native dance cadence and adjacent-row changes, and spikeweed destroys it',()=>{
 const g=create(3);g['nextWave']=Infinity;const piano=g.spawnZombie('piano',2,cellX(6)),cowboy=g.spawnZombie('cowboy',1,cellX(6));tick(g,7.5);
 assert.equal(g.cowboy.pianoPlaying,true);assert.equal(cowboy.west!.dance,true);assert.ok(cowboy.west!.lane||cowboy.row!==1);
 g['freeze'](piano,10);tick(g,1);assert.equal(g.cowboy.pianoPlaying,false);assert.equal(cowboy.west!.dance,false);
 const h=create(3);h['nextWave']=Infinity;h.sun=999;h.plant('spikeweed',2,4);const target=h.spawnZombie('piano',2,cellX(4));tick(h,2);assert.ok(target.hp<=0);assert.equal(h.plants.length,0);
});
test('split pea fires front once and rear twice, then its food ends with a backward mega pea',()=>{
 const g=create(2);g['nextWave']=Infinity;g.sun=999;g.plant('splitpea',2,4);const p=g.plants[0];
 const a=g.spawnZombie('cowboy_armor2',2,cellX(1)),b=g.spawnZombie('cowboy_armor2',2,cellX(8));a.frozenUntil=b.frozenUntil=100;
 tick(g,1.85);assert.equal(a.armor,props.armors.cowboy_armor2.Toughness-40);assert.equal(b.armor,props.armors.cowboy_armor2.Toughness-20);
 g.food=1;assert.equal(g.plantFood(2,4),true);tick(g,2.1);assert.equal(p.action,'food');assert.equal(p.animation,'ShootL');tick(g,.42);assert.equal(p.action,'idle');assert.ok(g.cowboy.shots.some(s=>s.mega&&s.vx<0));
});
test('chili poisons its eater, stuns zombies behind it and spawns three food children',()=>{
 const g=create(5);g['nextWave']=Infinity;g.sun=999;g.plant('chilibean',2,4);
 const eater=g.spawnZombie('cowboy',2,cellX(4)),behind=g.spawnZombie('cowboy',2,cellX(6)),ahead=g.spawnZombie('cowboy',2,cellX(1));
 tick(g,6.1);assert.ok(eater.hp<=0);assert.ok(behind.stunnedUntil!>g.time);assert.equal(ahead.stunnedUntil,undefined);assert.ok(g.cowboy.effects.some(e=>e.kind==='chiliFart'));
 g.cooldowns.chilibean=0;g.plant('chilibean',0,0);g.food=1;g.plantFood(0,0);tick(g,1.3);assert.equal(g.plants.filter(p=>p.kind==='chilibean').length,4);assert.equal(g.plants.filter(p=>p.leap).length,3);tick(g,1.5);assert.ok(g.plants.every(p=>!p.leap));
});
test('Cowboy map grants its authored plants, pinata and endless key only once',()=>{
 const data=new Map<string,string>(),store=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 const map=JSON.parse(readFileSync(new URL('../public/assets/shell/maps/cowboy.json',import.meta.url),'utf8')) as WorldMap;
 for(let day=1;day<=5;day++){const id=`cowboy${day}`;store.finish('cowboy',id);const events=completionEvents(map,id,store.completed(map),new Set(store.rewards().filter(r=>r.world==='cowboy').map(r=>r.node)));for(const event of events)if(event.action==='reward')store.award('cowboy',map.islands.find(n=>n.node===event.node)!);store.finishPresentation();}
 assert.ok(store.ownedPlants().has(61));assert.ok(store.ownedPlants().has(62));store.finish('cowboy','cowboy2');assert.equal(store.campaignRewards().filter(r=>r.level==='cowboy2').length,1);
});

test('Wild West 1–5 can clear through legal seed, sun, cooldown and cart actions',()=>{
 for(let day=1;day<=5;day++){
  const g=create(day);
  // A matured garden Peashooter boost is consumed by the corral run, as in the battle UI.
  if(day===4)g.boosts=new Set(['peashooter']);
  for(let frame=0;frame<60*600&&g.phase==='playing';frame++){playCowboy(g,frame);g.tick(1/60);g.events.length=0;}
  assert.equal(g.phase,'won',`cowboy${day}`);assert.equal(g.wave,g.level.waves.length);assert.ok(g.sun>=0);
  if(day===4)assert.deepEqual([...g.usedBoosts],['peashooter']);
 }
});
