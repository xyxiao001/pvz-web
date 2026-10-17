import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,tick,props} from './future-fixture';
import {FutureBoss} from '../src/game/future-boss';
import {playFutureFifth} from './future-strategy';
import {type PlantKind} from '../src/game/level';
const quiet=()=>{const g=create(23);g['nextWave']=Infinity;g.level.waves=[[]];g.level.maxPlants=null;g.level.maxSun=null;return g;};
test('Future 21–25 preserve native dual objectives, last stand, bombs and boss deck',()=>{
 console.log([21,22,23,24,25].map(d=>{const l=level(d);return {day:d,waves:l.waves.length,max:l.maxPlants,sun:l.maxSun,target:l.targetSun,last:l.lastStand};}));
 assert.equal(level(21).targetSun,5000);assert.equal(level(21).maxPlants,16);assert.equal(level(23).maxPlants,15);assert.equal(level(23).maxSun,2250);
 assert.equal(level(22).lastStand!.sun,2250);assert.equal(level(22).lastStand!.food,4);assert.equal(level(22).sunDrops,false);
 assert.ok(level(24).sunBomb);assert.equal(level(24).sunDropper!.SunCountdownBase,4);
 assert.equal(level(25).boss!.kind,'zombossmech_future');assert.equal(level(25).boss!.reserved,2);assert.deepEqual(level(25).conveyor!.InitialPlantList.map(p=>p.PlantType),['powerplant_alpha','powerplant_beta','blover','citron','holonut','laser_bean']);
});
test('Tile Turnip shares a plant cell, digs an epsilon tile, scales cost and links food',()=>{
 const g=quiet();g.level.powerTiles=[];g.sun=10000;g.cooldowns.powerplant=0;g.addPlant('peashooter',0,0);assert.equal(g.seedCost('powerplant'),0);assert.ok(g.plant('powerplant',0,0));assert.equal(g.seedCost('powerplant'),250);assert.equal(g.plantFood(0,0),false);tick(g,2);assert.equal(g.plants.length,1);assert.deepEqual(g.level.powerTiles,[{group:'epsilon',row:0,column:0,delay:1}]);assert.equal(g.seedCost('powerplant'),250);
 g.cooldowns.powerplant=0;assert.equal(g.plant('powerplant',0,0),false);assert.ok(g.plant('powerplant',2,0));assert.equal(g.sun,9750);tick(g,2);assert.equal(g.seedCost('powerplant'),500);g.addPlant('peashooter',2,0);g.food=1;assert.ok(g.plantFood(0,0));tick(g,1.3);assert.equal(g.plants.find(p=>p.row===2)!.action,'food');
 for(let row=0;row<5;row++)g.level.powerTiles.push({group:'epsilon',row,column:4,delay:1});assert.equal(g.seedCost('powerplant'),8000);
});
test('Future boss targets largest color, food cancels every locator without stunning, missiles destroy only impact cells',()=>{
 const g=create(25),boss=g.boss as FutureBoss;assert.ok(boss instanceof FutureBoss);assert.equal(boss.zombie.hp,54000);
 g.level.powerTiles=[{group:'alpha',row:0,column:0,delay:1},{group:'beta',row:1,column:1,delay:1},{group:'beta',row:2,column:1,delay:1}];g.random=()=>.1;boss['aim']();assert.equal(boss['shootAnimation'],'Shoot_beta');assert.deepEqual(boss.targets,[{row:1,column:1},{row:2,column:1}]);
 boss.animation='Shoot_beta';g.addPlant('laser_bean',1,1);g.food=1;g.plantFood(1,1);assert.equal(boss.targets.length,0);assert.equal(boss.animation,'Shoot_beta');assert.equal(boss.canceledTargets.length,2);boss['fire']();assert.equal(boss.missiles.length,0);
 g.addPlant('wallnut',2,1);const nut=g.plants.at(-1)!;nut.armor=8000;g.addPlant('peashooter',2,0);const neighbor=g.plants.at(-1)!;boss['impact']({row:2,column:1});assert.equal(nut.hp,0);assert.equal(neighbor.hp,props.plants.peashooter.Toughness);assert.equal(g.level.powerTiles.length,2);assert.ok(g.level.powerTiles.some(t=>t.group==='alpha'));assert.equal(g.future.links.length,0);tick(g,1);assert.equal(boss.canceledTargets.length,0);
});
for(const day of [21,22,23,24,25])test(`Future ${day} legal replay`,()=>{
 const g=create(day),used=new Set<PlantKind>(),plant=g.plant.bind(g);g.plant=(kind,r,c,packet)=>{const result=plant(kind,r,c,packet);if(result)used.add(kind);return result;};
 for(let f=0;f<60000&&g.phase==='playing';f++){playFutureFifth(g,f);g.tick(1/60);g.events.length=0;}
 console.log('future'+day,g.phase,g.time,g.wave,g.lossReason,g.sunProduced,g.sunSpent,[...used]);assert.equal(g.phase,'won');if(!g.level.conveyor)assert.ok(used.size<=6);if(day===21)assert.ok(g.sunProduced>=5000);if(day===23)assert.ok(g.sunSpent<=2250);
});

import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {FUTURE_LEVELS} from '../src/game/worlds/future';
import {ProgressStore,completionEvents} from '../src/shell/progression';
import type {WorldMap} from '../src/shell/types';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
const read=(file:string)=>JSON.parse(readFileSync(new URL('../public/assets/'+file,import.meta.url),'utf8'));
test('Future 21–25 source hashes, boss assets and first-clear rewards agree',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../future-provenance.json',import.meta.url),'utf8'));
 for(let day=21;day<=25;day++){const path=`future/future${day}.source.json`,bytes=readFileSync(new URL('../public/assets/'+path,import.meta.url));assert.equal(manifest.outputs[path].sha256,createHash('sha256').update(bytes).digest('hex'));assert.equal(FUTURE_LEVELS['future'+day].source,path);}
 const actors=battleActors(level(25),[]),effects=battleEffects(level(25),['powerplant']);for(const a of ['boss','futureGargantuar','futureImp','futureProtector','futureShield','footballMech'])assert.ok(actors.includes(a));for(const e of ['futureNightLawn','bossMissileImpact','bossTarget','tile_epsilon','gargRay'])assert.ok(effects.includes(e));
 const catalog=read('future/catalog.json');for(const animation of ['Shoot_alpha','Shoot_beta','Shoot_gamma','Shoot_delta','Shoot_epsilon','Escape'])assert.ok(props.plantAnimations.boss[animation]);assert.equal(catalog.actors.boss.group,'future');
 const data=new Map<string,string>(),store=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}}),map=read('shell/maps/future.json') as WorldMap;
 for(let day=1;day<=25;day++){const id='future'+day;store.finish('future',id);for(const event of completionEvents(map,id,store.completed(map),store.rewardNodes('future')))if(event.action==='reward')store.award('future',map.islands.find(n=>n.node===event.node)!);store.finishPresentation();}
 assert.ok(store.ownedPlants().has(97));assert.ok(read('shell/progression.json').plants[97].length);assert.ok(store.campaignRewards().some(r=>r.level==='future22'&&r.type==='pinata'));assert.ok(store.campaignRewards().some(r=>r.id==='worldtrophy_future'));assert.equal(FUTURE_LEVELS.future25.outro,'FUTURE_OUTRO_ZOMBOSS');
});
test('Future 21 and 23 enforce both challenge conditions',()=>{
 const g=create(21);g.wave=g.level.waves.length;g['nextWave']=Infinity;tick(g,.1);assert.equal(g.lossReason,'sunProduced');
 const h=create(21);for(let i=0;i<17;i++)h.addPlant('peashooter',i%5,Math.floor(i/5));tick(h,.1);assert.equal(h.phase,'lost');
 const j=create(23);j.sunSpent=2251;tick(j,.1);assert.equal(j.phase,'lost');
 const k=create(23);for(let i=0;i<16;i++)k.addPlant('peashooter',i%5,Math.floor(i/5));tick(k,.1);assert.equal(k.phase,'lost');
});

test('Future missiles burn a holo-nut projector permanently, but cannot burn digging turnips',()=>{
 const g=create(25),boss=g.boss as FutureBoss;g.addPlant('holonut',0,0);const nut=g.plants.at(-1)!;g.future.holonuts.get(nut.id)!.shield=500;g.addPlant('powerplant_alpha',0,0);const tool=g.plants.at(-1)!;
 boss['impact']({row:0,column:0});assert.equal(nut.hp,0);assert.equal(g.future.holonuts.has(nut.id),false);assert.ok(tool.hp>0);assert.equal(g.future.visuals.filter(v=>v.name==='infinutShield'&&v.animation==='Death').length,5);tick(g,1);assert.ok(!g.plants.includes(nut));
});
