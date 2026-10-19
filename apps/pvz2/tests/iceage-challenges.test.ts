import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,tick} from './iceage-fixture';
import {ICEAGE_LEVELS} from '../src/game/worlds/iceage';
import {ProgressStore} from '../src/shell/progression';

test('Iceage 24–28 preserve sun target, conveyor, frozen placements, protection and rewards',()=>{
 assert.deepEqual([24,25,26,27,28].map(d=>level(d).waves.length),[10,10,12,20,12]);assert.equal(level(24).targetSun,2500);
 assert.deepEqual(level(25).conveyor!.InitialPlantList.map(p=>p.PlantType),['xshot']);const pepper=level(25).actions.flat().flatMap(a=>a.add??[]).find(p=>p.PlantType==='pepperpult')!;assert.equal(pepper.MaxCount,1);assert.equal(pepper.MaxCountCooldownSeconds,20);
 assert.deepEqual(level(26).chooserPlants,['xshot']);assert.equal(level(26).frozenPlants.length,2);assert.equal(level(26).frozenZombies.length,3);assert.equal(ICEAGE_LEVELS.iceage26.firstReward.plant,'xshot');assert.ok(ICEAGE_LEVELS.iceage26.plants.some(p=>p.id===19));
 assert.equal(level(27).mustProtect,3);assert.ok(level(27).protectedPlants.every(p=>p.kind==='xshot'));assert.deepEqual(level(28).lastStand,{sun:2500,food:4});assert.ok(level(28).blacklist.includes('sunshroom'));
 const data=new Map<string,string>(),store=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});store.finish('iceage','iceage24');store.finish('iceage','iceage24');assert.deepEqual(store.campaignRewards().map(r=>r.id),['spine_iceage']);
});
for(const day of [24,25,26,27,28])test(`iceage${day} controlled-damage wave and settlement smoke`,()=>{
 const g=create(day);
 // Smoke fixture supplies producers; sunlight still comes from their ordinary actions.
 if(day===24){for(let row=0;row<5;row++)g.addPlant('twinsunflower',row,0);for(const row of [0,2,4])g.addPlant('pepperpult',row,1);}
 if(day===28){tick(g,1);assert.equal(g.time,0);assert.equal(g.sun,2500);assert.equal(g.food,4);assert.ok(g.plant('xshot',2,2));g.startLastStand();}
 for(let i=0;i<60000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies){if(day===24&&g.wave===g.level.waves.length&&g.sunProduced<2500)z.stunnedUntil=g.time+100;else g.damage(z,100000,'water');}}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);if(day===24)assert.ok(g.sunProduced>=2500);
});
test('Iceage 26 frozen hoarders release after thaw; Iceage 27 protects all three rotobagas',()=>{
 const g=create(26),b=g.iceage.blocks.find(b=>b.zombie)!;const z=b.zombie!,x=z.x;tick(g,1);assert.equal(z.x,x);assert.ok(g.plant('hotpotato',b.row,b.column));tick(g,4);assert.ok(!g.iceage.blocks.includes(b));g.damage(z,45);tick(g,2.5);assert.ok(g.zombies.some(z=>z.kind==='iceage_weasel'));
 const protect=create(27);protect.plants.find(p=>p.endangered)!.hp=0;tick(protect,.1);assert.equal(protect.phase,'lost');assert.equal(protect.lossReason,'protected');
});
