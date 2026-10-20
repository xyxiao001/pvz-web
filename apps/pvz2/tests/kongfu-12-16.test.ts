import test from 'node:test';import assert from 'node:assert/strict';
import {create,level,props,read,tick} from './kongfu-fixture';
import {cellX,type PlantKind} from '../src/game/level';
import {KongfuBoss} from '../src/game/kongfu-boss';
import {BATTLE_LEVELS} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {ProgressStore} from '../src/shell/progression';
test('12–16 preserve conveyor, preset, mold, protection, boss and rewards',()=>{
 assert.deepEqual([12,13,14,15,16].map(d=>level(d).waves.length),[12,14,16,18,0]);
 assert.ok(level(12).actions.flat().some(a=>a.add?.some(p=>p.PlantType==='turnip')));
 assert.deepEqual(level(13).preset,['sunflower','bambooshoot','turnip','magnetshroom','iceburg','potatomine']);
 assert.equal(level(14).mold.length,10);assert.equal(level(15).protectedPlants.length,3);assert.ok(level(15).protectedPlants.every(p=>p.kind==='firegourd'));
 assert.equal(level(16).world,'kongfu');assert.equal(level(16).boss!.kind,'kongfu_boss_explode');assert.equal(level(16).mowers,true);
 assert.equal(BATTLE_LEVELS.kongfu13.firstReward.plant,'turnip');assert.ok(BATTLE_LEVELS.kongfu14.plants.some(p=>p.kind==='turnip'));
 const data=new Map<string,string>(),store=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v)},removeItem:k=>{data.delete(k)}});store.finish('kongfu','kongfu14');assert.ok(store.campaignRewards().some(r=>r.id==='dangerroom_kongfu'));
 for(const name of ['KONGFU_12_INTRO','KONGFU_INTRO_BOSS1','KONGFU_OUTRO_BOSS1'])assert.ok(read('kongfu/catalog.json').narratives[name].length);
});
for(const day of [12,13,14,15,16])test(`Kongfu ${day}: controlled damage reaches settlement and resources resolve`,()=>{
 const g=create(day);g.preparing=false;
 for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);
 const config=BATTLE_LEVELS[`kongfu${day}`],l=level(day),catalogs=['battle','campaign',...config.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...(l.preset??[]),...l.protectedPlants.map(p=>p.kind),...l.initialPlants.map(p=>p.kind),...(l.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...l.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 for(const name of battleActors(l,plants)){const spec=actors[name],sk=read(spec?`${spec.group}/rigs/${spec.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(spec?sk.armature.some((a:{name:string})=>a.name===spec.armature):sk.armature.length,name);}
 for(const name of battleEffects(l,plants))assert.ok(rigs[name],name);
});
test('chi pulls plants toward itself, stopping at a turnip',()=>{
 const g=create(13);g.graves=[];g.addPlant('sunflower',2,1);g.addPlant('turnip',2,3);g.addPlant('wallnut',2,5);const z=g.spawnZombie('kongfu_chi',2,cellX(7));tick(g,6.2);
 assert.equal(g.plants.find(p=>p.kind==='wallnut')!.column,6);assert.equal(g.plants.find(p=>p.kind==='sunflower')!.column,1);assert.equal(g.plants.find(p=>p.kind==='turnip')!.column,3);assert.ok(g.kongfu.turnip.states.get(g.plants.find(p=>p.kind==='turnip')!.id)!.blocked>0);assert.equal(z.kongfu!.animation,'Absorb');
});
test('turnip food creates four children; injured turnips can be replanted',()=>{
 const g=create(13);g.graves=[];g.addPlant('turnip',2,3);const p=g.plants[0];p.hp=500;tick(g,.1);g.sun=100;g.cooldowns.turnip=0;assert.equal(g.plant('turnip',2,3),true);assert.equal(p.hp,props.plants.turnip.Toughness);
 g.food=1;assert.equal(g.plantFood(2,3),true);tick(g,4);assert.equal(g.plants.filter(p=>p.kind==='turnip').length,5);assert.equal(p.action,'idle');assert.ok(g.plants.every(p=>!p.leap));
});
test('Kongfu boss attacks, ignores cold and explodes over planted targets',()=>{
 const g=create(16),boss=g.boss as KongfuBoss;g.graves=[];g.addPlant('turnip',2,2);g.addPlant('sunflower',2,1);tick(g,4);
 g.chill(boss.zombie,10);g.freeze(boss.zombie,10);assert.equal(boss.zombie.chilledUntil,0);assert.equal(boss.zombie.frozenUntil,0);
 boss.missiles.push({id:900,row:2,column:2,age:1.49});tick(g,.1);assert.equal(g.plants.length,0);assert.equal(boss.blasts[0].big,true);
 const actions=new Set<string>();for(let i=0;i<60*45;i++){g.tick(1/60);actions.add(boss.animation);for(const z of g.zombies)if(z!==boss.zombie)g.damage(z,100000,'water');}
 assert.ok(actions.has('Summon'));assert.ok(actions.has('LeapLoop')||actions.has('Throw'));assert.equal(g.phase,'playing');
});
