import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,tick,props} from './beach-fixture';
import {cellX} from '../src/game/level';
import {BATTLE_LEVELS} from '../src/game/levels';
import {ProgressStore} from '../src/shell/progression';
test('Beach 21–25 preserve native waves, objectives, conveyor and rewards',()=>{
 assert.deepEqual([21,22,23,24,25].map(d=>level(d).waves.length),[18,16,16,14,18]);
 assert.deepEqual([21,22,23,24,25].map(d=>BATTLE_LEVELS['beach'+d].mode),['conveyor','seedbank','seedbank','conveyor','seedbank']);
 assert.deepEqual(level(21).conveyor!.InitialPlantList.map(p=>p.PlantType),['homingthistle','iceburg','lilypad']);
 assert.equal(level(23).protectedPlants.length,3);assert.ok(level(23).blacklist.includes('banana'));
 assert.equal(level(24).bowlingLine,3);assert.equal(level(25).maxSun,3000);assert.deepEqual(level(25).killChallenge,{count:10,seconds:5});
 const data=new Map<string,string>(),store=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 for(const d of [22,24,25]){store.finish('beach','beach'+d);store.finish('beach','beach'+d);}
 assert.deepEqual(store.campaignRewards().map(r=>r.id),['spine_beach','dangerroom_beach_minigame','spine_beach']);
});
for(const day of [21,22,23,24,25])test(`Beach ${day} wave and settlement smoke with controlled damage`,()=>{
 const g=create(day);
 for(let i=0;i<60000&&g.phase==='playing';i++){
  g.tick(1/60);
  if(day===25&&!g.killChallengeComplete&&g.zombies.length<10){for(const z of g.zombies)z.stunnedUntil=g.time+1;continue;}
  for(const z of g.zombies)g.damage(z,100000);
 }
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);
});
test('homing thistle attacks across lanes and emits native plant food burst',()=>{
 const g=create(21);g.addPlant('homingthistle',0,0);const z=g.spawnZombie('beach_snorkel',4,cellX(6)),hp=z.hp;
 tick(g,3);assert.ok(z.hp<hp);
 g.food=1;assert.ok(g.plantFood(0,0));tick(g,2.5);const p=g.plants.find(p=>p.kind==='homingthistle')!;assert.notEqual(p.action,'food');
 assert.equal(props.projectiles.homing_thistle.Damage,40);assert.equal(props.projectiles.homing_thistle_pf.Damage,240);
});
test('fisher pulls the rightmost plant one cell and releases hook on death',()=>{
 const g=create(22);g.addPlant('wallnut',0,0);g.addPlant('sunflower',0,1);const nut=g.plants.find(p=>p.kind==='wallnut')!,sunflower=g.plants.find(p=>p.kind==='sunflower')!;
 const z=g.spawnZombie('beach_fisherman',0,cellX(8));tick(g,4.5);
 assert.equal(sunflower.column,2);assert.equal(nut.column,0);assert.equal(z.x,cellX(8));
 g.damage(z,10000);tick(g,.1);assert.equal(z.fisher!.hook,undefined);assert.equal(z.fisher!.deathAnimation,'Death_Water');
});
test('fisher can drag unsupported plants into water and strike nearby plants',()=>{
 const g=create(22);g.addPlant('wallnut',2,2);const nut=g.plants.find(p=>p.kind==='wallnut')!;
 g.spawnZombie('beach_fisherman',2,cellX(8));tick(g,5);assert.equal(nut.column,3);assert.ok(!g.plants.includes(nut));
 const near=create(22),z=near.spawnZombie('beach_fisherman',1,cellX(8));tick(near,2);near.addPlant('lilypad',1,7);near.addPlant('wallnut',1,7);const target=near.plants.find(p=>p.kind==='wallnut')!;tick(near,2);assert.ok(!near.plants.includes(target));assert.equal(z.x,cellX(8));
});
test('Beach 23 keeps banana aiming and protected plant failure',()=>{
 const g=create(23);assert.ok(g.westFinale.select(1,1));const z=g.spawnZombie('beach',1,cellX(4));assert.ok(g.westFinale.fire(1,4));tick(g,2);assert.ok(z.hp<=0);
 g.plants.find(p=>p.kind==='banana')!.hp=0;tick(g,.1);assert.equal(g.phase,'lost');assert.equal(g.lossReason,'protected');
});
