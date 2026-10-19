import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,tick,props} from './beach-fixture';
import {BATTLE_LEVELS} from '../src/game/levels';
import {BeachBoss} from '../src/game/beach-boss';
import {cellX} from '../src/game/level';

test('Beach 31–35 retain native layouts, seeds, rails, dialogue and rewards',()=>{
 assert.deepEqual([31,32,33,34,35].map(d=>level(d).waves.length),[16,0,12,15,18]);
 assert.deepEqual(level(31).preset,['lilypad','homingthistle','wallnut','tanglekelp','sunbean']);
 assert.deepEqual(level(35).preset,['sunflower','lilypad','missiletoe','chilibean']);
 assert.equal(BATTLE_LEVELS.beach31.firstReward.plant,'seashroom');assert.equal(BATTLE_LEVELS.beach32.firstReward.image,'worldtrophy_beach');
 assert.equal(BATTLE_LEVELS.beach32.firstReward.animation,'beach');
 assert.equal(BATTLE_LEVELS.beach33.narrative,'BEACH_33_INTRO');
 assert.equal(level(34).rails!.Rails.length,4);assert.deepEqual(level(34).rails!.Railcarts,[]);assert.deepEqual(level(34).graves,[]);
 assert.equal(level(32).conveyor!.InitialPlantList.find(p=>p.PlantType==='lilypad')!.ForceBoosted,true);
});
for(const day of [31,32,33,34,35])test(`Beach ${day} entry, waves and settlement smoke with controlled damage`,()=>{
 const g=create(day);for(let i=0;i<60000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000);}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);
});
test('missiletoe manually targets, damages, freezes nearby lanes and reloads',()=>{
 const g=create(35);g.addPlant('missiletoe',1,1);const p=g.plants.at(-1)!,target=g.spawnZombie('beach_armor4',1,cellX(6)),near=g.spawnZombie('beach',2,cellX(6));
 assert.equal(target.armor,2200);assert.ok(g.westFinale.select(1,1));assert.ok(g.westFinale.fire(1,6));tick(g,1.5);
 assert.equal(target.armor,1000);assert.ok(target.frozenUntil>g.time);assert.ok(near.frozenUntil>g.time);assert.equal(near.hp,190);assert.ok(p.nextAction>g.time);assert.equal(g.westFinale.select(1,1),false);
});
test('sea-shroom survives twice as long in open water, shoots and refreshes on plant food',()=>{
 const g=create(31);g.plants=[];g.addPlant('seashroom',0,8);const water=g.plants.at(-1)!;g.addPlant('seashroom',0,0);const land=g.plants.at(-1)!;g.spawnZombie('beach_armor4',0,cellX(8)+110);tick(g,5);
 assert.ok(g.westFinale.states.get(water.id)!.life>g.westFinale.states.get(land.id)!.life);assert.equal(land.animation,'Idle_Sad');
 assert.ok(g.zombies[0].armor<2200);g.food=1;assert.ok(g.plantFood(0,0));assert.equal(g.westFinale.states.get(water.id)!.life,props.plants.seashroom.LifeSpan);
});
test('Beach boss summons, sends sharks, coughs on kelp and accepts stage damage',()=>{
 const g=create(32),boss=g.boss as BeachBoss;boss.stages.forEach(s=>{s.Actions=structuredClone(s.Actions);});tick(g,7);
 // Isolate each native action; no strategy or balance run.
 const choose=(name:string)=>{boss.current.Actions.forEach(a=>{a.weight=a.actionName===name?1:0;});boss.animation='Idle';};
 g.addPlant('lilypad',0,5);g.addPlant('wallnut',0,5);choose('shoot');tick(g,8);assert.equal(g.plants.some(p=>p.kind==='wallnut'),false);
 choose('summon');tick(g,10);assert.ok(g.zombies.length>1);
 choose('rush');g.addPlant('tanglekelp',boss.zombie.row,5);const kelp=g.plants.at(-1)!;tick(g,4);assert.ok(kelp.hp<=0);assert.ok(boss.animation.startsWith('Cough'));
 const hp=boss.zombie.hp;boss.hit(100);assert.ok(boss.zombie.hp<hp);
});
