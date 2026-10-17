import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,tick} from './cowboy-fixture';
import {playCowboyFifth} from './cowboy-fifth-strategy';
import {CowboyBoss} from '../src/game/cowboy-boss';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {ProgressStore,completionEvents} from '../src/shell/progression';
import {readFileSync} from 'node:fs';
import type {WorldMap} from '../src/shell/types';

test('West 21–25 preserve authored objectives, decks and boss instead of dormant challenges',()=>{
 assert.deepEqual([21,22,23,24,25].map(d=>level(d).waves.length),[10,18,18,18,0]);
 assert.equal(level(21).maxSun,1750);assert.equal(level(21).flowerLine,4);assert.equal(level(21).maxPlantsLost,null);assert.equal(level(21).targetSun,null);
 assert.deepEqual(level(22).preset,['sunflower','repeater','bloomerang','iceburg','potatomine','wintermelon']);
 assert.equal(level(23).flowerLine,4);assert.equal(level(23).maxPlantsLost,1);assert.equal(level(23).targetSun,null);assert.equal(level(23).killChallenge,null);
 assert.deepEqual(level(24).protectedPlants,[{kind:'wallnut',column:5,row:1},{kind:'wallnut',column:6,row:2},{kind:'wallnut',column:7,row:3}]);assert.equal(level(24).mustProtect,3);
 assert.equal(level(25).boss!.kind,'zombossmech_cowboy');assert.equal(level(25).boss!.reserved,2);assert.equal(level(25).conveyor!.InitialPlantList.length,7);assert.equal(level(25).corral,false);
});
test('West boss chooses rail salvos with exactly one escape cell, or three distinct plant targets',()=>{
 const g=create(25),b=g.boss!;assert.ok(b instanceof CowboyBoss);
 let rails=0,plants=0;
 for(let i=0;i<100;i++){b['aim']();assert.equal(new Set(b.targets.map(t=>`${t.row},${t.column}`)).size,b.targets.length);if(b.targets.length===4){rails++;assert.ok(b.targets.every(t=>t.column===b.targets[0].column));assert.ok([1,3].includes(b.targets[0].column));}else{plants++;assert.equal(b.targets.length,3);assert.ok(b.targets.every(t=>t.column<=5));}}
 assert.ok(rails>0&&plants>0);
});
test('western fire missiles bypass nut armor, splash horizontally and create no Egyptian bones',()=>{
 const g=create(25),b=g.boss!;g.addPlant('tallnut',2,2);g.addPlant('wallnut',2,3);g.addPlant('wallnut',1,2);const [a,c,d]=g.plants;a.armor=6000;const hp=[a.hp,c.hp,d.hp];
 b.missiles.push({id:1,row:2,column:2,age:1.49});tick(g,.05);
 assert.equal(a.hp,hp[0]-500);assert.equal(a.armor,6000);assert.equal(c.hp,hp[1]-250);assert.equal(d.hp,hp[2]);assert.equal(g.missiles.length,0);assert.equal(g.graves.length,0);
});
test('western boss resources include every summon, its missiles and particle rig',()=>{
 const actors=battleActors(level(25),[]),effects=battleEffects(level(25),[]);
 for(const n of ['boss','cowboy','piano','prospector','poncho','cowboyGargantuar','cowboyImp','chickenFarmer','chicken','chickenPumpkin'])assert.ok(actors.includes(n),n);
 for(const n of ['bossTarget','bossMissile','bossMissileImpact','bossPortal','bossEscape','chickenAsh'])assert.ok(effects.includes(n),n);
});
test('West 22 pinata, 24 wintermelon and 25 trophy are granted once',()=>{
 const data=new Map<string,string>(),store=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 const map=JSON.parse(readFileSync(new URL('../public/assets/shell/maps/cowboy.json',import.meta.url),'utf8')) as WorldMap;
 for(let day=1;day<=25;day++){const id=`cowboy${day}`;store.finish('cowboy',id);for(const event of completionEvents(map,id,store.completed(map),store.rewardNodes('cowboy')))if(event.action==='reward')store.award('cowboy',map.islands.find(n=>n.node===event.node)!);store.finishPresentation();}
 assert.ok(store.ownedPlants().has(35));store.finish('cowboy','cowboy25');assert.equal(store.campaignRewards().filter(r=>r.id==='worldtrophy_cowboy').length,1);assert.equal(store.campaignRewards().filter(r=>r.level==='cowboy22').length,1);
});
for(let day=21;day<=25;day++)test(`West ${day} legal strategy completes the native challenge`,()=>{
 const g=create(day);const stages=new Set<number>(),animations=new Set<string>();
 for(let frame=0;frame<60*1000&&g.phase==='playing';frame++){playCowboyFifth(g,frame);g.tick(1/60);g.events.length=0;if(g.boss){stages.add(g.boss.stage);animations.add(g.boss.animation);}}
 console.log(`cowboy${day} ${g.phase} ${g.time.toFixed(1)}s wave ${g.wave}, spent ${g.sunSpent}, lost ${g.plantsLost}${g.boss?`, boss ${g.boss.zombie.hp} ${[...animations]}`:''}`);
 assert.equal(g.phase,'won',`cowboy${day}: ${g.lossReason}`);assert.equal(g.wave,g.level.waves.length);assert.ok(g.sun>=0);
 if(g.boss){assert.deepEqual([...stages],[0,1,2]);assert.ok(g.boss.defeated);assert.ok(animations.has('Shoot'));assert.ok(animations.has('Summonning'));assert.ok(animations.has('Escape'));}
});
