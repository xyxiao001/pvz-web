import {ProgressStore} from '../src/shell/progression';
import {battleEffects} from '../src/rendering/resource-plan';
import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,tick} from './cowboy-fixture';
import {playCowboySixth} from './cowboy-sixth-strategy';
import {cellX} from '../src/game/level';

test('West 26–30 preserve normal waves, conveyor additions, preset and protected sun objective',()=>{
 assert.deepEqual([26,27,28,29,30].map(d=>level(d).waves.length),[12,10,8,9,12]);
 assert.equal(level(27).flowerLine,5);assert.ok(level(27).actions[1].some(a=>a.add?.some(p=>p.PlantType==='tallnut'&&p.MinCount===5)));
 assert.deepEqual(level(28).lastStand,{sun:600,food:0});assert.deepEqual(level(28).preset,['electricpeashooter','magnetshroom']);assert.equal(level(28).sunDrops,false);
 assert.equal(level(29).targetSun,7500);assert.equal(level(29).mustProtect,5);assert.deepEqual(level(29).protectedPlants,Array.from({length:5},(_,row)=>({kind:'magnifyinggrass',row,column:5})));
 assert.ok(level(30).waves.flat().includes('cowboy_armor4'));
});
test('magnet takes metal bucket and concealed plate, retains cone and bricks, recovers after ten seconds',()=>{
 const g=create(28);g.preparing=false;g['nextWave']=Infinity;g.addPlant('magnetshroom',2,3);
 const bucket=g.spawnZombie('cowboy_armor2',2,cellX(6)),cone=g.spawnZombie('cowboy_armor1',2,cellX(6)),brick=g.spawnZombie('cowboy_armor4',2,cellX(6));
 tick(g,.3);assert.equal(bucket.armor,0);assert.equal(bucket.magnetized,true);assert.ok(cone.armor>0);assert.equal(brick.armor,2200);assert.equal(g.western.metals.length,1);
 const plate=g.spawnZombie('poncho_plate',2,cellX(6));tick(g,9);assert.ok(plate.west!.plate!>0);tick(g,2);assert.equal(plate.west!.plate,0);assert.ok(plate.west!.poncho!>0);
});
test('magnet food strips the board, throws 300 damage armor and returns to idle',()=>{
 const g=create(28);g.preparing=false;g['nextWave']=Infinity;g.addPlant('magnetshroom',2,1);g.food=1;
 const far=g.spawnZombie('cowboy_armor2',0,cellX(8));g.spawnZombie('poncho_plate',4,cellX(8));const victim=g.spawnZombie('cowboy_armor4',2,cellX(6));
 assert.equal(g.plantFood(2,1),true);tick(g,.1);assert.equal(far.armor,0);tick(g,4);assert.equal(victim.armor,1600);assert.equal(g.plants[0].action,'idle');assert.equal(g.western.metals.length,0);
});
test('electric balls pierce and shock adjacent rows; food creates five balls and six children per impact',()=>{
 const g=create(28);g.preparing=false;g['nextWave']=Infinity;g.addPlant('electricpeashooter',2,1);
 const a=g.spawnZombie('cowboy_armor4',2,cellX(4)),b=g.spawnZombie('cowboy_armor4',1,cellX(4));tick(g,3);assert.ok(a.armor<2200);assert.ok(b.armor<2200);
 g.food=1;g.plantFood(2,1);tick(g,1.2);assert.equal(g.western.shots.filter(s=>s.kind==='electricpea_pf').length,5);tick(g,.3);assert.ok(g.western.shots.some(s=>s.kind==='electricpea_small'));
});
test('protected magnifying grass uses manual 50 sun shots, and food duration counts producers then cleans up',()=>{
 const g=create(29);g['nextWave']=Infinity;g.sun=100;const z=g.spawnZombie('cowboy_armor4',2,cellX(7));tick(g,2);assert.equal(z.armor,2200);
 assert.equal(g.western.fire(2,5),true);assert.equal(g.sun,50);assert.equal(g.western.fire(2,5),false);tick(g,1);assert.equal(z.armor,1650);
 g.addPlant('sunflower',0,0);g.addPlant('twinsunflower',1,0);g.food=1;g.plantFood(2,5);assert.ok(Math.abs(g.western.beams[0].until-g.time-3.3)<.001);tick(g,4);assert.equal(g.western.beams.length,0);assert.equal(g.plants.find(p=>p.row===2&&p.kind==='magnifyinggrass')!.action,'idle');
});
for(const day of [26,27,28,29,30])test(`West ${day}: legal resources and player inputs finish all waves`,()=>{
 const g=create(day);if(day===26)g.boosts=new Set(['lightningreed']);if(day===30)g.boosts=new Set(['lightningreed','sunflower']);if(day===27)g.boosts=new Set(['tallnut']);for(let f=0;f<60000&&g.phase==='playing';f++){playCowboySixth(g,f);g.tick(1/60);g.events.length=0;}
 console.log(`cowboy${day}`,g.phase,g.time.toFixed(1),'wave',g.wave,'sun',g.sun,'produced',g.sunProduced,'lost',g.plantsLost);
 assert.equal(g.phase,'won');assert.equal(g.usedBoosts.size,day===30?2:[26,27].includes(day)?1:0);if(day===28)assert.equal(g.sunSpent,600);if(day===29)assert.ok(g.sunProduced>=7500);
});

test('new plant effects release their owners after death and no longer retain charge light',()=>{
 const g=create(29);g['nextWave']=Infinity;g.addPlant('magnetshroom',2,3);g.spawnZombie('cowboy_armor2',2,cellX(6));tick(g,.4);
 g.food=1;g.plantFood(2,5);tick(g,.2);assert.equal(g.western.beams.length,1);assert.equal(g.western.metals.length,1);
 g.plants.find(p=>p.kind==='magnetshroom')!.hp=0;g.plants.find(p=>p.kind==='magnifyinggrass'&&p.row===2)!.hp=0;
 g.western.tick(1/60);assert.equal(g.western.beams.length,0);assert.equal(g.western.metals.length,0);assert.equal(g.western.magnets.size,0);
});

test('new preset/protected plants request their effects, and 26/30 pinatas are granted only once',()=>{
 const effects=battleEffects(level(28),level(28).preset!);for(const n of ['electricpea','electricpea_pf','electricpea_small','electricLink','cowboyBucket','plateDrop'])assert.ok(effects.includes(n));
 const protectedEffects=battleEffects(level(29),level(29).protectedPlants.map(p=>p.kind));for(const n of ['grassRay','grassHit','grassFrom','cowboyBricks'])assert.ok(protectedEffects.includes(n));
 const data=new Map<string,string>(),store=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 for(const day of [26,30]){store.finish('cowboy',`cowboy${day}`);store.finish('cowboy',`cowboy${day}`);assert.equal(store.campaignRewards().filter(r=>r.level===`cowboy${day}`&&r.id==='spine_cowboy').length,1);}
});
