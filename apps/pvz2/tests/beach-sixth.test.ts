import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,tick} from './beach-fixture';
import {BATTLE_LEVELS} from '../src/game/levels';
import {ProgressStore} from '../src/shell/progression';
test('Beach 26–30 retain native modes, tide layouts, objectives and rewards',()=>{
 assert.deepEqual([26,27,28,29,30].map(d=>level(d).waves.length),[15,18,18,12,20]);
 assert.deepEqual([26,27,28,29,30].map(d=>level(d).tide!.start),[2,0,2,0,2]);
 assert.deepEqual([26,27,28,29,30].map(d=>level(d).initialPlants.length),[7,5,6,6,5]);
 assert.equal(BATTLE_LEVELS.beach26.mode,'conveyor');assert.equal(level(26).sunDrops,false);
 assert.deepEqual(level(26).conveyor!.InitialPlantList.map(p=>p.PlantType),['banana','lilypad','wallnut']);
 assert.deepEqual(level(27).chooserPlants,['twinsunflower','lilypad','wallnut','bonkchoy','banana']);
 assert.equal(BATTLE_LEVELS.beach27.firstReward.plant,'banana');
 assert.equal(level(28).maxPlantsLost,5);assert.deepEqual(level(29).lastStand,{sun:2500,food:4});assert.equal(level(29).sunDrops,false);
 assert.ok(level(29).blacklist.includes('sunshroom'));assert.ok(level(29).blacklist.includes('iceburg'));
 assert.deepEqual(level(30).protectedPlants,Array.from({length:5},(_,row)=>({kind:'guacodile',row,column:0})));
 const data=new Map<string,string>(),store=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 store.finish('beach','beach30');store.finish('beach','beach30');assert.deepEqual(store.campaignRewards().map(r=>r.id),['spine_beach']);
});
for(const day of [26,27,28,29,30])test(`Beach ${day} wave and settlement smoke with controlled damage`,()=>{
 const g=create(day);
 if(day===29){tick(g,1);assert.equal(g.time,0);assert.equal(g.sun,2500);assert.equal(g.food,4);assert.ok(g.plant('banana',0,0));assert.equal(g.plant('wallnut',2,0),false);g.startLastStand();}
 for(let i=0;i<60000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000);}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);
 if(day===30)assert.equal(g.plants.filter(p=>p.endangered).length,5);
});
test('Beach 28 permits five losses and fails on the sixth',()=>{
 const g=create(28);for(const p of g.plants.slice(0,5))p.hp=0;tick(g,.1);assert.equal(g.plantsLost,5);assert.equal(g.phase,'playing');
 g.plants[0].hp=0;tick(g,.1);assert.equal(g.plantsLost,6);assert.equal(g.phase,'lost');assert.equal(g.lossReason,'plantsLost');
});
test('Beach 30 fails if any protected guacodile dies',()=>{
 const g=create(30);g.plants.find(p=>p.endangered)!.hp=0;tick(g,.1);assert.equal(g.phase,'lost');assert.equal(g.lossReason,'protected');
});
