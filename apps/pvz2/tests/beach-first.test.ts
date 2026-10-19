import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,tick} from './beach-fixture';
import {cellX} from '../src/game/level';
import {BATTLE_LEVELS} from '../src/game/levels';
import {ProgressStore} from '../src/shell/progression';

test('Beach 1–5 retain source modes, tides, preplanted pads, reward and low-tide spawns',()=>{
 assert.deepEqual([1,2,3,4,5].map(d=>BATTLE_LEVELS['beach'+d].mode),['seedbank','seedbank','conveyor','seedbank','conveyor']);
 assert.deepEqual([1,2,3,4,5].map(d=>level(d).tide!.start),[4,9,7,6,6]);
 assert.equal(level(1).initialPlants.length,3);assert.deepEqual(level(1).chooserPlants,['lilypad']);
 assert.equal(level(4).actions.flat().filter(a=>a.lowTide).flatMap(a=>a.zombies).length,9);
 assert.equal(level(5).actions.flat().filter(a=>a.lowTide).flatMap(a=>a.zombies).length,12);
 const data=new Map<string,string>(),store=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 store.finish('beach','beach4');assert.equal(store.campaignRewards()[0].id,'spine_beach');
});
for(const day of [1,2,3,4,5])test(`Beach ${day} wave and settlement smoke with controlled damage`,()=>{
 const g=create(day);
 for(let i=0;i<60000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000);}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);assert.equal(g.mowers.length,5);
});
test('pads support water planting, tide drowns unprotected plants, shovel removes occupant first',()=>{
 const g=create(1);g.sun=10000;
 assert.equal(g.plant('peashooter',1,5),false);assert.ok(g.plant('lilypad',1,5));assert.ok(g.plant('peashooter',1,5));
 assert.equal(g.plant('potatomine',1,5),false);assert.equal(g.plant('lilypad',1,0),false);
 g.shovel(1,5);assert.ok(g.plants.some(p=>p.kind==='lilypad'&&p.row===1));
 g.addPlant('peashooter',2,3);g.beach.change(3);tick(g,3.1);
 assert.ok(!g.plants.some(p=>p.kind==='peashooter'&&p.row===2));
 assert.ok(g.plants.some(p=>p.kind==='lilypad'&&p.row===1));
});
test('kelp uses native drag event and food drags five water zombies',()=>{
 const g=create(5);g.addPlant('tanglekelp',2,7);const z=g.spawnZombie('beach_armor2',2,cellX(7)+10);tick(g,3);
 assert.ok(z.hp<=0);assert.ok(!g.plants.some(p=>p.kind==='tanglekelp'));assert.equal(z.deathCause,'water');
 const f=create(5);f.addPlant('tanglekelp',2,7);const targets=Array.from({length:5},(_,row)=>f.spawnZombie('beach_fem_armor2',row,cellX(8)));f.food=1;assert.ok(f.plantFood(2,7));tick(f,2.5);assert.ok(targets.every(z=>z.hp<=0));
});
