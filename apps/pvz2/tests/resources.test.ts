import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { ResourcePool, ResourceScope } from '../src/assets/resource-pool';
import { battleActors, battleEffects } from '../src/rendering/resource-plan';
import { BATTLE_LEVELS } from '../src/game/levels';
import { readLevel, type PlantKind } from '../src/game/level';
const read=(path:string)=>JSON.parse(readFileSync(new URL('../public/assets/'+path,import.meta.url),'utf8'));
test('map and battle share a texture until the last scene releases it',async()=>{
 const calls:string[]=[];const pool=new ResourcePool(async path=>{calls.push('load '+path);return {};},async path=>{calls.push('unload '+path);});
 const map=new ResourceScope(pool),battle=new ResourceScope(pool);
 const shared=await map.load('cards');assert.equal(await battle.load('cards'),shared);assert.equal(await battle.load('cards'),shared);
 await battle.load('lawn');await battle.dispose();assert.deepEqual(calls,['load cards','load lawn','unload lawn']);
 assert.equal(await map.load('cards'),shared);await map.dispose();assert.equal(calls.at(-1),'unload cards');
});
test('reentering a scene during release waits for the old unload before loading again',async()=>{
 let finish!:()=>void;const calls:string[]=[];
 const pool=new ResourcePool(async path=>{calls.push('load');return path;},async()=>{calls.push('unload');await new Promise<void>(resolve=>{finish=resolve;});});
 const old=new ResourceScope(pool),next=new ResourceScope(pool);await old.load('lawn');const released=old.dispose();await Promise.resolve();
 const loaded=next.load('lawn');assert.deepEqual(calls,['load','unload']);finish();await released;await loaded;assert.deepEqual(calls,['load','unload','load']);
});
test('all 35 levels resolve only exported actors and effect rigs, including summoned dependencies',()=>{
 const catalog=read('campaign/catalog.json');
 for(const config of Object.values(BATTLE_LEVELS)){
  const level=readLevel(read(config.source));const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...level.initialPlants.map(p=>p.kind),...level.protectedPlants.map(p=>p.kind),...(level.preset??[]),...(level.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...level.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
  for(const name of battleActors(level,plants)){const spec=catalog.actors[name];assert.ok(read(spec?`campaign/rigs/${spec.rig}/skeleton.json`:`actors/${name}/skeleton.json`).armature.length,config.id+': '+name);}
  for(const name of battleEffects(level,plants))assert.ok(catalog.rigs[name],config.id+': '+name);
 }
 const ordinary=readLevel(read(BATTLE_LEVELS.egypt2.source)),effects=battleEffects(ordinary,['peashooter','sunflower','wallnut','potatomine']);
 for(const unused of ['conveyor','tombBone','flower','mold','bossMissile','sandstorm'])assert.ok(!effects.includes(unused));
 const boss=readLevel(read(BATTLE_LEVELS.egypt35.source));
 for(const name of ['imp','pharaohInner','tombraiser'])assert.ok(battleActors(boss,[]).includes(name));
 for(const name of ['dirtSpawn','grave','bossMissile'])assert.ok(battleEffects(boss,[]).includes(name));
 const match=readLevel(read(BATTLE_LEVELS.egypt23.source));assert.ok(battleEffects(match,[]).includes('dirtSpawn'));
});
