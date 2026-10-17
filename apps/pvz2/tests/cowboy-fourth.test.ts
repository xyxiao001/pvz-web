import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,tick,props} from './cowboy-fixture';
import {playCowboyFourth} from './cowboy-fourth-strategy';
import {cellX,rowY} from '../src/game/level';
import {ProgressStore,completionEvents} from '../src/shell/progression';
import {readFileSync} from 'node:fs';
import type {WorldMap} from '../src/shell/types';

test('West 16–20 preserve only active modules and authored challenges',()=>{
 assert.deepEqual([16,17,18,19,20].map(d=>level(d).waves.length),[16,16,10,18,10]);
 assert.deepEqual(level(16).protectedPlants,[{kind:'wallnut',row:3,column:6}]);assert.equal(level(16).mustProtect,1);
 assert.equal(level(17).flowerLine,4);assert.equal(level(17).maxPlants,null);assert.equal(level(17).maxSun,null);
 assert.deepEqual(level(18).lastStand,{sun:1500,food:3});assert.equal(level(18).sunDrops,false);assert.deepEqual(level(18).initialPlants,[]);
 assert.equal(level(19).maxPlantsLost,2);assert.equal(level(19).maxSun,2000);assert.equal(level(19).mold.length,0);assert.equal(level(19).killChallenge,null);
 assert.equal(level(20).corral,true);assert.equal(level(20).mowers,false);assert.equal(level(20).rails!.Railcarts.length,9);
});
test('protected cart nut retains identity and protection after movement and first aid',()=>{
 const g=create(16);g.wallnutFirstAid=true;g.sun=100;const p=g.plants[0],id=p.id;g.cowboy.select(3,6);g.cowboy.move(1);p.hp=100;g.cooldowns.wallnut=0;
 g.shovel(1,6);assert.ok(g.plants.includes(p));assert.equal(g.plant('wallnut',1,6),true);assert.equal(p.id,id);assert.ok(p.endangered);assert.equal(p.row,1);assert.equal(g.plantsLost,0);
});
test('tallnut food instantly restores health and armor; first aid preserves its armor',()=>{
 const g=create(19);g['nextWave']=Infinity;g.addPlant('tallnut',2,4);const p=g.plants[0];p.hp=1000;g.food=2;
 assert.equal(g.plantFood(2,4),true);assert.equal(p.hp,8000);assert.equal(p.armor,6000);assert.equal(p.action,'idle');assert.equal(g.plantFood(2,4),false);assert.equal(g.food,1);
 g.wallnutFirstAid=true;g.sun=1000;p.hp=8000*2/3;g.cooldowns.tallnut=0;assert.equal(g.plant('tallnut',2,4),true);assert.equal(p.armor,6000);assert.equal(p.hp,8000);assert.equal(g.sun,875);
});
test('bull riders collide with tallnut while ordinary thrown imps keep their flight',()=>{
 const g=create(19);g['nextWave']=Infinity;g.addPlant('tallnut',2,4);
 const rider=g.spawnZombie('west_bullrider',2,cellX(5));rider.west!.bullThrown=true;rider.leap={fromX:rider.x,fromY:rowY(2)-40,toX:cellX(3),toRow:2,at:g.time,duration:.7};
 tick(g,.6);assert.equal(rider.west!.blockedByTallnut,true);assert.equal(rider.west!.animation,'Blocked');assert.ok(rider.x>cellX(4));tick(g,3);assert.equal(rider.leap,null);assert.equal(rider.west!.animation,undefined);
 const imp=g.spawnZombie('west_bullrider',2,cellX(5));imp.leap={fromX:imp.x,fromY:rowY(2)-40,toX:cellX(3),toRow:2,at:g.time,duration:.7};tick(g,.8);assert.equal(imp.west!.blockedByTallnut,undefined);assert.ok(imp.x<=cellX(3));
});
test('native corral 20 changes its single packet on authored waves without orphan modifiers',()=>{
 const g=create(20),expected=['peashooter','wallnut','potatomine','chilibean','repeater','potatomine','wallnut','coconutcannon','chilibean','chilibean'];
 assert.equal(g.props.plants.peashooter.ShootInterval,props.plants.peashooter.ShootInterval);
 for(const kind of expected){tick(g,1);assert.equal(g.conveyor.length,1);assert.equal(g.conveyor[0].kind,kind);const c=g.cowboy.carts[0];g.shovel(c.row,c.column);assert.ok(g.plant(g.conveyor[0].kind,c.row,c.column,g.conveyor[0].id));for(const z of g.zombies)g.damage(z,100000);g.cowboy.chickenThrowers.length=0;tick(g,.1);}
 assert.equal(g.phase,'won');
});
test('plantfood refresh consumes exactly one bean for a cooling seed after upgrade',()=>{
 const g=create(19);g.food=2;g.cooldowns.wallnut=15;const sun=g.sun;
 assert.equal(g.refreshSeed('wallnut'),false);g.plantfoodRefresh=true;assert.ok(g.refreshSeed('wallnut'));assert.equal(g.food,1);assert.equal(g.cooldowns.wallnut,0);assert.equal(g.sun,sun);assert.equal(g.refreshSeed('wallnut'),false);assert.equal(g.food,1);
 g.cooldowns.wallnut=15;g.preparing=true;assert.equal(g.refreshSeed('wallnut'),false);
});
test('West 17, 18 and 20 award one pinata, tallnut and seed-refresh upgrade',()=>{
 const data=new Map<string,string>(),store=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 const map=JSON.parse(readFileSync(new URL('../public/assets/shell/maps/cowboy.json',import.meta.url),'utf8')) as WorldMap;
 for(let day=1;day<=20;day++){const id=`cowboy${day}`;store.finish('cowboy',id);for(const event of completionEvents(map,id,store.completed(map),store.rewardNodes('cowboy')))if(event.action==='reward')store.award('cowboy',map.islands.find(n=>n.node===event.node)!);store.finishPresentation();}
 assert.ok(store.ownedPlants().has(63));assert.ok(store.battleBonuses().plantfoodRefresh);store.finish('cowboy','cowboy17');assert.equal(store.campaignRewards().filter(r=>r.level==='cowboy17').length,1);
});
for(let day=16;day<=20;day++)test(`West ${day} legal strategy completes its native challenge`,()=>{
 const g=create(day);
 for(let frame=0;frame<60*900&&g.phase==='playing';frame++){playCowboyFourth(g,frame);g.tick(1/60);g.events.length=0;}
 console.log(`cowboy${day} ${g.phase} ${g.time.toFixed(1)}s wave ${g.wave}, spent ${g.sunSpent}, lost ${g.plantsLost}`);
 assert.equal(g.phase,'won',`cowboy${day}: ${g.lossReason}`);assert.equal(g.wave,g.level.waves.length);assert.ok(g.sun>=0);
});
