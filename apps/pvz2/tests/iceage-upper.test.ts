import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,tick} from './iceage-fixture';
import {cellX} from '../src/game/level';
import {ProgressStore} from '../src/shell/progression';

test('Iceage 14–18 preserve presets, protection, frozen placements, mowers and first rewards',()=>{
 assert.deepEqual([14,15,16,17,18].map(d=>level(d).waves.length),[15,16,16,12,12]);
 assert.equal(level(14).preset!.length,6);assert.equal(level(14).frozenPlants.length,9);assert.equal(level(15).protectedPlants.length,2);
 assert.equal(level(16).mowers,false);assert.equal(level(17).mowers,true);assert.equal(level(17).frozenPlants.length,5);assert.equal(level(18).frozenZombies.length,5);
 const data=new Map<string,string>(),store=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 for(const day of [14,15,16,17]){store.finish('iceage',`iceage${day}`);store.finish('iceage',`iceage${day}`);}
 assert.deepEqual(store.campaignRewards().map(r=>r.id),['spine_iceage','note_iceage','worldkey','spine_iceage']);assert.equal(store.worldKeys(),1);
});
for(const day of [14,15,16,17,18])test(`iceage${day} controlled-damage wave and settlement smoke`,()=>{
 const g=create(day);for(let i=0;i<60000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);
});
test('troglobite pushes a chain of frozen imps, crushes destination plants, and stops at sliders',()=>{
 const g=create(17);g.plants=[];g.iceage.blocks=[];const z=g.spawnZombie('iceage_troglobite',2,cellX(4));assert.equal(g.iceage.blocks.length,3);g.addPlant('wallnut',2,3);z.x=cellX(7);tick(g,2.2);assert.deepEqual(g.iceage.blocks.map(b=>b.column),[3,4,5]);assert.equal(g.plants.length,0);
 const slider=g.level.sliders[0];g.iceage.freeze(slider.row,slider.column+1);assert.equal(g.iceage.canPush(g.iceage.blocks.at(-1)!,-1),false);
 const b=g.iceage.blocks[0];b.hp=0;tick(g,.1);const x=b.zombie!.x;tick(g,1);assert.ok(b.zombie!.x<x);
});
test('stunion stuns its lane and is consumed; plant food reaches three lanes',()=>{
 const g=create(18);g.zombies=[];g.iceage.blocks=[];g.addPlant('stunion',2,3);const z=g.spawnZombie('iceage',2,cellX(4));tick(g,1.2);assert.ok(z.stunnedUntil!>g.time+11);tick(g,2);assert.equal(g.plants.length,0);
 g.addPlant('stunion',2,3);const targets=[1,2,3].map(row=>g.spawnZombie('iceage',row,cellX(5)));g.food=1;g.plantFood(2,3);tick(g,3.2);assert.ok(targets.every(z=>z.stunnedUntil!>g.time+17));
});
