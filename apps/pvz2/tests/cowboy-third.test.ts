import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,tick,props} from './cowboy-fixture';
import {playCowboyThird} from './cowboy-strategy';
import {cellX} from '../src/game/level';
import {ProgressStore,completionEvents} from '../src/shell/progression';
import {readFileSync} from 'node:fs';
import type {WorldMap} from '../src/shell/types';
import {BATTLE_LEVELS} from '../src/game/levels';
import {battleActors} from '../src/rendering/resource-plan';

test('West 11–15 retain active challenges, native corral deck and bull dependencies',()=>{
 assert.equal(level(11).maxSun,500);assert.equal(level(11).mold.length,0);
 assert.equal(level(15).maxPlantsLost,2);assert.equal(level(15).mold.length,0);
 assert.equal(level(12).corral,true);assert.equal(level(12).mowers,false);
 assert.deepEqual(level(12).conveyor!.InitialPlantList.map(p=>p.PlantType),['bloomerang']);
 assert.ok(battleActors(level(13),[]).includes('bull'));assert.ok(battleActors(level(13),[]).includes('cowboyImp'));
 assert.equal(BATTLE_LEVELS.cowboy12.mode,'conveyor');
});
test('corral alternates authored bloomerang and reed packets across all ten waves',()=>{
 const g=create(12);
 for(let wave=1;wave<=10;wave++){
  tick(g,1);assert.equal(g.wave,wave);assert.equal(g.corralWaiting,true);assert.equal(g.conveyor.length,1);
  const packet=g.conveyor[0];assert.equal(packet.kind,wave%2?'bloomerang':'lightningreed');
  const c=g.cowboy.carts[0];g.shovel(c.row,c.column);assert.equal(g.plant(packet.kind,c.row,c.column,packet.id),true);
  for(const z of g.zombies)g.damage(z,100000);tick(g,.1);
 }
 assert.equal(g.phase,'won');
});
test('bull charges once, brakes without ramming, and throws one rider four columns',()=>{
 const g=create(13);g['nextWave']=Infinity;g.addPlant('wallnut',2,4);const nut=g.plants[0],z=g.spawnZombie('west_bull',2,cellX(7));
 tick(g,5.1);assert.equal(z.west!.animation,'RushStart');assert.equal(z.hp,1300);
 tick(g,6);assert.ok(['Rush','RushEnd'].includes(z.west!.animation!));
 for(let n=0;n<1200&&z.west!.imp;n++)g.tick(1/60);
 const imp=g.zombies.find(z=>z.kind==='west_bullrider')!;
 assert.equal(z.west!.imp,false);assert.ok(imp.leap);assert.equal(imp.leap.duration,.7);
 assert.ok(Math.abs(imp.leap.toX-Math.max(cellX(0),imp.leap.fromX-props.zombies.west_bull.ImpThrowDistance*82))<.001);
 assert.equal(nut.hp,props.plants.wallnut.Toughness);
 tick(g,10);assert.equal(z.west!.animation,undefined);assert.equal(g.zombies.filter(z=>z.kind==='west_bullrider').length,1);
});
test('bull charge pauses under ice and its mechanical body does not receive chili poison',()=>{
 const g=create(13);g['nextWave']=Infinity;const z=g.spawnZombie('west_bull',2,cellX(7));g['freeze'](z,4);tick(g,3);assert.equal(z.west!.bull!.delay,5);
 g.addPlant('chilibean',2,5);g.cowboy.eaten(g.plants[0],z);assert.equal(z.west!.poisonAt,undefined);
});
test('first aid repairs a damaged nut in place at full cost with its existing armor',()=>{
 const g=create(15);g.sun=1000;g.plant('wallnut',2,4);const nut=g.plants[0];nut.hp=props.plants.wallnut.Toughness*.75;nut.armor=100;g.cooldowns.wallnut=0;
 assert.equal(g.plant('wallnut',2,4),false);g.wallnutFirstAid=true;const before=g.sun;
 assert.equal(g.plant('wallnut',2,4),true);assert.equal(g.sun,before-50);assert.equal(nut.hp,props.plants.wallnut.Toughness);assert.equal(nut.armor,100);assert.equal(g.plants[0].id,nut.id);assert.equal(g.plantsLost,0);assert.ok(g.cooldowns.wallnut>0);
 g.cooldowns.wallnut=0;assert.equal(g.plant('wallnut',2,4),false);
});
test('West 11–15 reward shovel level two, melon, pinata and first aid once',()=>{
 const data=new Map<string,string>(),store=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 const map=JSON.parse(readFileSync(new URL('../public/assets/shell/maps/cowboy.json',import.meta.url),'utf8')) as WorldMap;
 for(let day=1;day<=15;day++){const id=`cowboy${day}`;store.finish('cowboy',id);for(const event of completionEvents(map,id,store.completed(map),store.rewardNodes('cowboy')))if(event.action==='reward')store.award('cowboy',map.islands.find(n=>n.node===event.node)!);store.finishPresentation();}
 assert.ok(store.ownedPlants().has(34));assert.ok(store.ownedUpgrades().has(7));assert.ok(store.battleBonuses().wallnutFirstAid);
 store.finish('cowboy','cowboy14');assert.equal(store.campaignRewards().filter(r=>r.level==='cowboy14').length,1);
});
test('lightning reed kills bulls through the native shock death and removes their rider',()=>{
 const g=create(13);g['nextWave']=Infinity;g.addPlant('lightningreed',2,4);const z=g.spawnZombie('west_bull',2,cellX(7));z.hp=1;tick(g,3);assert.ok(g.deaths.some(d=>d.zombie.id===z.id&&d.cause==='electric'));assert.equal(z.west!.imp,false);
});
for(let day=11;day<=15;day++)test(`West ${day} clears with legal resources, deck packets and minecart movement`,()=>{
  const g=create(day);
  // The corral replay consumes one matured garden reed boost, as the battle UI does.
  if(day===12)g.boosts=new Set(['lightningreed']);
  for(let frame=0;frame<60*900&&g.phase==='playing';frame++){playCowboyThird(g,frame);g.tick(1/60);g.events.length=0;}
  console.log(`cowboy${day} ${g.phase} ${g.time.toFixed(1)}s wave ${g.wave}, spent ${g.sunSpent}, lost ${g.plantsLost}`);
  assert.equal(g.phase,'won',`cowboy${day}: ${g.lossReason}`);assert.equal(g.wave,g.level.waves.length);assert.ok(g.sun>=0);
});
