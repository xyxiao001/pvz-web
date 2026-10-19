import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,tick,props} from './beach-fixture';
import {cellX} from '../src/game/level';
import {BATTLE_LEVELS} from '../src/game/levels';
import {ProgressStore} from '../src/shell/progression';

test('Beach 6–10 preserve modes, presets, bowling line, mold and rewards',()=>{
 assert.deepEqual([6,7,8,9,10].map(d=>BATTLE_LEVELS['beach'+d].mode),['seedbank','seedbank','conveyor','seedbank','conveyor']);
 assert.deepEqual(level(6).chooserPlants,['sunflower','wallnut','peashooter','lilypad','tanglekelp']);
 assert.equal(BATTLE_LEVELS.beach6.firstReward.plant,'tanglekelp');
 assert.equal(level(8).bowlingLine,3);assert.equal(level(8).tide!.showMarker,false);
 assert.equal(level(8).conveyor!.InitialPlantList.length,4);assert.equal(level(9).mold.length,10);
 assert.ok(level(10).actions[4].some(a=>a.add?.some(p=>p.PlantType==='tanglekelp')));
 const data=new Map<string,string>(),store=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 store.finish('beach','beach8');assert.equal(store.campaignRewards()[0].id,'spine_beach');
});
for(const day of [6,7,8,9,10])test(`Beach ${day} wave and settlement smoke with controlled damage`,()=>{
 const g=create(day);
 for(let i=0;i<60000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000);}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);
});
test('bowling tools obey the foul line, disappear on placement and bounce with source damage',()=>{
 const g=create(8),kind='tool_projectile_bowlingbulb2';
 g.conveyor.push({id:9999,kind,lane:0,position:0});
 assert.equal(g.plant(kind,2,3,9999),false);assert.ok(g.plant(kind,2,1,9999));assert.equal(g.conveyor.length,0);assert.ok(!g.plants.some(p=>p.kind===kind));
 const z=g.spawnZombie('beach',2,cellX(2));const hp=z.hp;tick(g,.2);
 assert.equal(hp-z.hp,props.projectiles.bowling1.Damage);assert.notEqual(g.beach.bowling.balls[0].direction,0);
 const ball=g.beach.bowling.balls[0],nextRow=2+ball.direction;
 const next=g.spawnZombie('beach',nextRow,ball.x+82);tick(g,.25);assert.ok(next.hp<props.zombies.beach.Toughness);
});
test('bowling bulb shoots, reloads and emits three food balls',()=>{
 const g=create(10);g.addPlant('bowlingbulb',2,1);const plant=g.plants.at(-1)!;
 const z=g.spawnZombie('beach_armor2',2,cellX(8));z.stunnedUntil=100;
 tick(g,1);assert.equal(g.beach.bowling.states.get(plant.id)!.loaded[0],false);
 tick(g,5);assert.ok(g.beach.bowling.states.get(plant.id)!.loaded[0]);
 g.beach.bowling.balls=[];g.food=1;assert.ok(g.plantFood(2,1));tick(g,2.4);
 assert.equal(g.beach.bowling.balls.filter(b=>b.kind==='bowling_pf').length,3);assert.notEqual(plant.action,'food');
});
test('snorkel dives in water and surfaces to eat; giant survives kelp and throws a beach imp',()=>{
 const g=create(6),z=g.spawnZombie('beach_snorkel',2,cellX(7));assert.ok(g.beach.diving(z));
 g.addPlant('lilypad',2,7);g.addPlant('wallnut',2,7);tick(g,.1);assert.equal(g.beach.diving(z),false);
 const giant=g.spawnZombie('beach_gargantuar',3,cellX(7));g.addPlant('tanglekelp',3,7);tick(g,3);
 assert.equal(giant.hp,props.zombies.beach_gargantuar.Toughness-props.plants.tanglekelp.DamageWhenDragFailed);
 g.damage(giant,1600);tick(g,2);assert.ok(g.zombies.some(z=>z.kind==='beach_imp'));
 const land=g.spawnZombie('beach_gargantuar',4,cellX(0)),hp=land.hp;g.damage(land,100);assert.equal(hp-land.hp,90);
});
