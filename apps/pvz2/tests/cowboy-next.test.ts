import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,tick,props} from './cowboy-fixture';
import {playCowboyNext} from './cowboy-strategy';
import {ProgressStore,completionEvents} from '../src/shell/progression';
import {readFileSync} from 'node:fs';
import type {WorldMap} from '../src/shell/types';
import {BATTLE_LEVELS} from '../src/game/levels';
import {cellX} from '../src/game/level';

test('West 6–10 preserve last stand, conveyor changes, preset seeds and all authored waves',()=>{
 assert.deepEqual(level(6).lastStand,{sun:2000,food:3});assert.equal(level(6).sunDrops,false);
 assert.equal(level(8).mowers,false);assert.ok(level(8).actions.flat().some(a=>a.add?.some(p=>p.PlantType==='splitpea')));
 assert.deepEqual(level(9).preset,['sunflower','splitpea','chilibean','wallnut','lightningreed','wintermelon']);
 assert.equal(level(10).waves.length,18);
});
test('West giant throws one imp and smashes with splash damage at native events',()=>{
 const g=create(8);g['nextWave']=Infinity;const z=g.spawnZombie('cowboy_gargantuar',2,cellX(7));g.damage(z,1900);tick(g,1);
 assert.equal(z.west!.imp,false);const imps=g.zombies.filter(z=>z.kind==='west_bullrider');assert.equal(imps.length,1);assert.equal(imps[0].leap!.toRow,2);assert.equal(imps[0].leap!.toX,cellX(2));
 const h=create(8);h['nextWave']=Infinity;h.addPlant('wallnut',2,5);h.addPlant('wallnut',2,4);const victim=h.plants[0],near=h.plants[1];h.spawnZombie('cowboy_gargantuar',2,cellX(5)+40);tick(h,1.4);
 assert.equal(victim.hp,0);assert.equal(near.hp,props.plants.wallnut.Toughness-40);
});
test('farmer releases one timed flock across three lanes and cold suppresses release',()=>{
 const g=create(10);g['nextWave']=Infinity;const z=g.spawnZombie('chicken_farmer',2,cellX(7));g.damage(z,40);assert.equal(z.west!.chickens,false);assert.equal(g.cowboy.chickenThrowers.length,1);g.damage(z,1);assert.equal(g.cowboy.chickenThrowers.length,1);tick(g,3.5);
 const flock=g.zombies.filter(z=>z.kind==='chicken'||z.kind==='chicken_pumpkin');assert.ok(flock.length>=3);assert.ok(flock.every(z=>z.row>=1&&z.row<=3&&z.hp===1));assert.equal(g.cowboy.chickenThrowers.length,0);
 const cold=g.spawnZombie('chicken_farmer',0,cellX(7));g['freeze'](cold,5);g.damage(cold,40);assert.equal(cold.west!.chickens,true);
});
test('winter melon chills direct and splash targets, and food launches native ice projectiles',()=>{
 const g=create(9);g['nextWave']=Infinity;g.sun=500;assert.equal(g.plant('wintermelon',2,4),true);const a=g.spawnZombie('cowboy_armor2',2,cellX(7)),b=g.spawnZombie('cowboy_armor2',1,cellX(7));tick(g,4);
 assert.ok(a.chilledUntil>g.time);assert.ok(b.chilledUntil>g.time);assert.ok(a.armor<props.armors.cowboy_armor2.Toughness);assert.ok(b.armor<props.armors.cowboy_armor2.Toughness);
 g.food=1;g.plantFood(2,4);tick(g,.9);assert.ok(g.missiles.some(m=>m.projectile==='winter_melon_pf'));
});
test('Wild West 6–10 clear using legal resources, cooldowns and minecart actions',()=>{
 for(let day=6;day<=10;day++){
  const g=create(day);
  for(let frame=0;frame<60*900&&g.phase==='playing';frame++){playCowboyNext(g,frame);g.tick(1/60);g.events.length=0;}
  console.log(`cowboy${day} ${g.phase} ${g.time.toFixed(1)}s wave ${g.wave}, sun ${g.sun}`);
  assert.equal(g.phase,'won',`cowboy${day}`);assert.equal(g.wave,g.level.waves.length);assert.ok(g.sun>=0);
 }
});

test('West rewards unlock peapod and lightning reed and award one world key',()=>{
 const data=new Map<string,string>(),store=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 const map=JSON.parse(readFileSync(new URL('../public/assets/shell/maps/cowboy.json',import.meta.url),'utf8')) as WorldMap;
 for(let day=1;day<=10;day++){const id=`cowboy${day}`;store.finish('cowboy',id);for(const event of completionEvents(map,id,store.completed(map),new Set(store.rewards().filter(r=>r.world==='cowboy').map(r=>r.node))))if(event.action==='reward')store.award('cowboy',map.islands.find(n=>n.node===event.node)!);store.finishPresentation();}
 assert.ok(store.ownedPlants().has(58));assert.ok(store.ownedPlants().has(29));assert.equal(store.worldKeys(),1);
 store.finish('cowboy','cowboy8');assert.equal(store.worldKeys(),1);assert.ok(store.campaignRewards().some(r=>r.id==='note_cowboy'));
 assert.equal(BATTLE_LEVELS.cowboy9.mode,'preset');assert.ok(BATTLE_LEVELS.cowboy9.plants.some(p=>p.kind==='wintermelon'&&p.id===35));
});
