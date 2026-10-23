import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,read,tick} from './modern-fixture';
import {BATTLE_LEVELS} from '../src/game/levels';
import {MODERN_LEVELS,MODERN_BOSS_GROUPS} from '../src/game/worlds/modern';
import {DinoBoss} from '../src/game/dino-boss';
import {FutureBoss} from '../src/game/future-boss';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {islandStates} from '../src/shell/navigation';
import type {WorldMap} from '../src/shell/types';
import {ProgressStore,completionEvents} from '../src/shell/progression';
const ids=['modern_zomboss_10_dino',...Array.from({length:10},(_,i)=>`modern${i+35}`)];
const game=(id:string)=>create(id.startsWith('modern_zomboss')?id:Number(id.slice(6)));
test('Modern completes exactly 44 nodes and 51 source configurations',()=>{
 assert.equal(Object.keys(BATTLE_LEVELS).length,509);assert.equal(Object.keys(MODERN_LEVELS).length,51);assert.equal(new Set(Object.values(MODERN_LEVELS).map(l=>l.day)).size,44);
 const map=read('shell/maps/modern.json');for(const node of map.islands)for(const id of node.levels.filter((id:string)=>id.startsWith('modern')))assert.ok(MODERN_LEVELS[id],id);
 for(const id of ids){const c=BATTLE_LEVELS[id],g=game(id);assert.equal(g.level.day,c.day);assert.equal(c.world,'modern');assert.ok(g.phase==='playing');}
});
test('Modern 35–43 preserve challenges, night planning, protection, preset cards and sun production',()=>{
 assert.deepEqual(level(36).mold.map(c=>c.column).filter((v,i,a)=>a.indexOf(v)===i),[0,1,2]);
 assert.deepEqual(level(37).lastStand,{sun:1700,food:2});assert.equal(create(37).preparing,true);assert.equal(BATTLE_LEVELS.modern37.night,true);
 assert.equal(level(38).flowerLine,1);assert.equal(create(39).plants.filter(p=>p.endangered).length,3);assert.equal(create(39).graves.length,15);
 assert.equal(level(41).maxPlantsLost,5);assert.equal(level(41).mowers,false);
 assert.deepEqual(level(42).preset,['twinsunflower','chilibean','chardguard','snapdragon','wintermelon']);assert.equal(level(42).mowers,false);
 assert.equal(level(43).targetSun,3500);assert.equal(create(43).plants.filter(p=>p.kind==='twinsunflower').length,5);
});
test('Modern late portal variants use native queues and timing',()=>{
 const g=create(35);g.modern.portal({kind:'future_2',row:2,column:4});assert.deepEqual([...g.modern.portals[0].queue].sort(),['future_armor1','future_jetpack','mech_cone']);tick(g,7);assert.equal(g.modern.portals[0].queue.length,2);
 const h=create(40);h.modern.portal({kind:'egypt_2',row:2,column:4});assert.deepEqual(h.modern.portals[0].queue,['explorer','explorer','explorer']);
});
test('Modern veteran newspaper and brick armor keep independent native health and rage',()=>{
 const g=create(39),z=g.spawnZombie('newspaper_veteran',0,950),brick=g.spawnZombie('tutorial_armor4',4,950);assert.equal(z.hp,490);assert.equal(g.modern.papers.get(z.id)!.hp,1800);assert.equal(brick.armor,g.props.armors.modern_armor4.Toughness);
 g.damage(z,1800);assert.equal(z.hp,490);assert.equal(g.modern.papers.get(z.id)!.hp,0);assert.equal(g.modern.speed(z),4);assert.equal(g.modern.bite(z),10);tick(g,3);assert.equal(g.modern.animation(z),'Walk_Angry');
});
test('Modern Dino and final mech retain stages and native class',()=>{
 const d=create(ids[0]),f=create(44);assert.ok(d.boss instanceof DinoBoss);assert.equal(d.boss.zombie.hp,28500);assert.ok(f.boss instanceof FutureBoss);assert.equal(f.boss.zombie.hp,48000);assert.equal(f.level.boss!.kind,'zombossmech_modern1');assert.equal(f.level.conveyor!.InitialPlantList.length,8);assert.equal(f.level.sunDrops,false);assert.equal(f.level.mowers,false);
});
for(const id of ids)test(`${id} reaches controlled settlement without skipping native wave or boss clocks`,()=>{
 const g=game(id);if(g.preparing)g.startLastStand();
 for(let i=0;i<60000&&g.phase==='playing';i++){g.tick(1/30);for(const z of g.zombies)g.damage(z,100000,'swallow');if(g.level.targetSun)g.sunProduced=g.level.targetSun;}
 assert.equal(g.phase,'won');
});
test('Modern final resources resolve every summon, selected plant and effect',()=>{
 for(const id of ids){const c=BATTLE_LEVELS[id],l=game(id).level,catalogs=['battle','campaign',...c.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));const plants=l.conveyor?.InitialPlantList.map(p=>p.PlantType)??l.preset??c.plants.map(p=>p.kind);
 for(const name of battleActors(l,plants)){const a=actors[name];assert.ok(a||['peashooter','sunflower','wallnut','potatomine','mummy','ra'].includes(name),`${id} actor ${name}`);if(a)assert.ok(read(`${a.group}/rigs/${a.rig}/skeleton.json`).armature.length);}
 for(const name of battleEffects(l,plants))assert.ok(rigs[name],`${id} effect ${name}`);
 }
});
test('Modern final pinatas and shared boss trophy are only awarded once',()=>{
 const data=new Map<string,string>(),p=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 for(const id of ['modern36','modern39','modern43',...MODERN_BOSS_GROUPS[2],'modern44']){p.finish('modern',id);p.finishPresentation();p.finish('modern',id);p.finishPresentation();}
 assert.equal(p.campaignRewards().filter(r=>r.type==='pinata').length,3);assert.equal(p.campaignRewards().filter(r=>r.type==='worldtrophy').length,1);assert.equal(p.pending(),null);
});
test('Modern final mech runs summon, movement, targeting and every native stage',()=>{
 const g=create(44),boss=g.boss!,seen=new Set<string>(),kinds=new Set<string>();
 for(let stage=0;stage<3;stage++){
  for(let i=0;i<7200&&g.phase==='playing';i++){g.tick(1/60);seen.add(boss.animation);for(const z of g.zombies)if(z!==boss.zombie){kinds.add(z.kind);g.damage(z,100000,'swallow');}}
  assert.equal(g.phase,'playing');assert.equal(boss.stage,stage);for(let i=0;i<900&&boss.stage===stage&&!boss.defeated;i++){g.tick(1/60);boss.hit(100000);for(const z of g.zombies)if(z!==boss.zombie)g.damage(z,100000,'swallow');}tick(g,6);
 }
 assert.ok(kinds.has('tutorial_armor1'));assert.ok([...kinds].some(k=>['newspaper_veteran','modern_allstar','lostcity_jane','lostcity_crystalskull'].includes(k)));assert.ok(seen.has('Shoot'));assert.ok(seen.has('Summonning'));
});
test('All 51 Modern configurations settle under controlled damage and resolve resource plans',()=>{
 for(const id of Object.keys(MODERN_LEVELS)){
  const g=game(id);g.startLastStand();
  for(let i=0;i<60000&&g.phase==='playing';i++){g.tick(1/30);for(const z of g.zombies)g.damage(z,100000,'swallow');if(g.level.targetSun)g.sunProduced=g.level.targetSun;if(g.level.beghouled&&g.time>=g.beghouled.settleAt){const move=g.beghouled.moves()[0];if(move)g.beghouled.swap(...move);}}
  assert.equal(g.phase,'won',id);
  const c=MODERN_LEVELS[id],catalogs=['battle','campaign',...c.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs)),plants=g.level.conveyor?.InitialPlantList.map(p=>p.PlantType)??g.level.preset??c.plants.map(p=>p.kind);
  for(const n of battleActors(g.level,plants))assert.ok(actors[n]||['peashooter','sunflower','wallnut','potatomine','mummy','ra'].includes(n),`${id}: ${n}`);
  for(const n of battleEffects(g.level,plants))assert.ok(rigs[n],`${id}: ${n}`);
 }
});
test('All 44 Modern map nodes unlock sequentially and all first rewards survive reload without duplicates',()=>{
 const map:WorldMap=read('shell/maps/modern.json'),data=new Map<string,string>(),storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}},p=new ProgressStore(storage);
 for(let day=1;day<=44;day++){
  const id=day>=32&&day<=34?MODERN_BOSS_GROUPS[day-32][0]:`modern${day}`,node=map.islands.find(n=>n.levels.includes(id))!;assert.equal(islandStates(map,p.completed(map),p.rewardNodes('modern')).get(node.node),'open',id);
  p.finish('modern',id);for(const event of completionEvents(map,id,p.completed(map),p.rewardNodes('modern')))if(event.action==='reward')p.award('modern',map.islands.find(n=>n.node===event.node)!);p.finishPresentation();
  const before=JSON.stringify([...data]);for(const variant of node.levels)p.finish('modern',variant);assert.equal(JSON.stringify([...data]),before,id);
 }
 const restored=new ProgressStore(storage);for(const id of Object.keys(MODERN_LEVELS))assert.ok(restored.isComplete(id),id);assert.equal(restored.pending(),null);assert.equal(restored.campaignRewards().filter(r=>r.type==='pinata').length,9);assert.equal(restored.campaignRewards().filter(r=>r.id==='dangerroom_modern').length,1);for(const id of [27,149,84,150,151])assert.ok(restored.ownedPlants().has(id));
});

test('Every authored Modern first reward has its native presentation and ledger entry',()=>{
 const data=new Map<string,string>(),p=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 for(const [id,c] of Object.entries(MODERN_LEVELS)){const source=read(c.source).objects[0].objdata,type=source.FirstRewardType,param=source.FirstRewardParam;if(!type||type==='giftbox')continue;
 if(type==='unlock_plant')assert.equal(c.firstReward.plant,param,id);else assert.equal(c.firstReward.image,param,id);p.finish('modern',id);p.finishPresentation();
 if(type==='worldtrophy'&&!id.includes('zomboss'))assert.ok(p.campaignRewards().some(r=>r.id===param),id);
 }
 assert.equal(p.campaignRewards().filter(r=>r.id==='dangerroom_modern2').length,1);assert.equal(MODERN_LEVELS.modern40.firstReward.animation,'dangerroom_modern');
});
