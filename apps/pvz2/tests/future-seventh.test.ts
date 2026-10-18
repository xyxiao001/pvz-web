import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,props,tick} from './future-fixture';
import {playFutureSeventh} from './future-strategy';
import {cellX,type PlantKind} from '../src/game/level';
import {FutureBoss} from '../src/game/future-boss';
for(const day of [31,32,33,34,35])test(`Future ${day} legal replay${day===33?' with purchased sunflower boost':''}`,()=>{
 const g=create(day,({31:1234,32:2,33:1,34:7,35:3} as Record<number,number>)[day]),used=new Set<PlantKind>(),plant=g.plant.bind(g);g.plant=(kind,r,c,packet)=>{const result=plant(kind,r,c,packet);if(result)used.add(kind);return result;};
 if(day===33)g.boosts=new Set(['sunflower']);
 for(let f=0;f<90000&&g.phase==='playing';f++){playFutureSeventh(g,f);g.tick(1/60);g.events.length=0;}
 console.log('future'+day,g.phase,g.time,g.wave,g.lossReason,g.boss?.zombie.hp,[...used]);assert.equal(g.phase,'won');if(!g.level.conveyor)assert.ok(used.size<=6);assert.ok([...used].every(p=>!g.level.blacklist.includes(p)));
});
const quiet=()=>{const g=create(32);g['nextWave']=Infinity;return g;};
test('Apple Mortar attacks three lanes and plant food stuns the whole board once',()=>{
 const g=quiet();g.addPlant('applemortar',2,1);for(const r of [1,2,3]){const z=g.spawnZombie('future_armor4',r,cellX(7));z.frozenUntil=100;}tick(g,1.3);assert.ok(g.zombies.every(z=>z.armor===2170&&z.stunnedUntil!>g.time));
 g.food=1;assert.ok(g.plantFood(2,1));tick(g,2.4);assert.ok(g.zombies.every(z=>z.armor===1920&&z.stunnedUntil!>g.time));assert.notEqual(g.plants[0].action,'food');g.zombies=[];tick(g,3);assert.equal(g.future.finale.apples.length,0);assert.equal(g.future.visuals.length,0);
});
test('Wasabi Whip strikes both sides, splashes and ends its five-second food loop',()=>{
 const g=quiet();g.addPlant('wasabiwhip',2,4);const left=g.spawnZombie('future_armor4',2,cellX(2)),right=g.spawnZombie('future_armor4',2,cellX(6));tick(g,.3);assert.equal(g.plants[0].animation,'AttackB');assert.equal(left.armor,2160);assert.equal(right.armor,2160);
 g.zombies=[];const z=g.spawnZombie('future_gargantuar',1,cellX(4));z.stunnedUntil=100;const hp=z.hp;g.food=1;g.plantFood(2,4);tick(g,7);assert.ok(Math.abs(hp-z.hp-2000)<15);assert.notEqual(g.plants[0].action,'food');assert.equal(g.future.finale['states'].get(g.plants[0].id)!.foodUntil,0);
});
test('Blueberry cloud locks one zombie, finishes a survivor then retires; food gets three targets',()=>{
 const g=quiet();g.addPlant('electricblueberry',2,0);const z=g.spawnZombie('future_gargantuar',2,cellX(7));z.hp=7000;z.stunnedUntil=100;tick(g,17);assert.ok(z.hp<=0);assert.equal(g.future.finale.clouds.length,0);
 for(const r of [0,2,4]){const z=g.spawnZombie('future_armor4',r,cellX(7));z.stunnedUntil=100;}
 g.food=1;g.plantFood(2,0);tick(g,9);assert.equal(g.zombies.length,0);assert.equal(g.future.finale.clouds.length,0);assert.equal(g.plants[0].action,'idle');
});
test('Future finale uses native challenges, tiles and stronger boss',()=>{
 assert.deepEqual([31,32,33,34,35].map(d=>level(d).waves.length),[15,12,8,9,0]);assert.equal(level(33).flowerLine,6);assert.equal(level(34).powerTiles.length,13);assert.equal(level(34).mold.length,32);assert.ok(level(34).blacklist.includes('sunflower'));
 const g=create(35);assert.ok(g.boss instanceof FutureBoss);assert.equal(g.boss.zombie.hp,74000);assert.equal(props.zombies.zombossmech_future2.ZombossMechLevel,1);assert.equal(level(35).conveyor!.InitialPlantList.find(p=>p.PlantType==='electricblueberry')!.MaxCount,2);
});

import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {FUTURE_LEVELS} from '../src/game/worlds/future';
import {ProgressStore} from '../src/shell/progression';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
test('Finale resources, native reward animations, narratives and first-clear persistence',()=>{
 const read=(p:string)=>JSON.parse(readFileSync(new URL('../'+p,import.meta.url),'utf8'));
 const manifest=read('future-provenance.json'),catalog=read('public/assets/future/catalog.json'),base=read('public/assets/battle/catalog.json');
 for(const day of [31,32,33,34,35]){const path=`future/future${day}.source.json`,bytes=readFileSync(new URL('../public/assets/'+path,import.meta.url));assert.equal(manifest.outputs[path].sha256,createHash('sha256').update(bytes).digest('hex'));assert.equal(FUTURE_LEVELS['future'+day].source,path);}
 const names=battleActors(level(35),[]);for(const n of ['boss','jetpackVeteran','discoMech','discoJetpack','mechCone','futureProtector'])assert.ok(names.includes(n));assert.ok(battleEffects(level(35),[]).includes('futureBricks'));
 for(const p of ['applemortar','wasabiwhip','electricblueberry'] as const){assert.ok(catalog.actors[p]);for(const fx of battleEffects(level(31),[p]))assert.ok(catalog.rigs[fx]||base.rigs[fx]||read('public/assets/campaign/catalog.json').rigs[fx]);}
 for(const name of ['FUTURE_31_INTRO','FUTURE_35_INTRO','FUTURE_35_OUTRO'])assert.ok(catalog.narratives[name].some((s:{Lines?:unknown})=>s.Lines));
 const trophy=base.rigs.reward,skeleton=read(`public/assets/battle/rigs/${trophy.rig}/skeleton.json`),animations=skeleton.armature.find((a:{name:string})=>a.name===trophy.armature).animation.map((a:{name:string})=>a.name);
 for(const day of [25,32,33])assert.ok(animations.includes(FUTURE_LEVELS['future'+day].firstReward.animation));
 const data=new Map<string,string>(),store=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 for(const day of [32,33,34,32,33,34]){store.finish('future','future'+day);store.finishPresentation();}assert.deepEqual(store.campaignRewards().map(r=>r.id),['dangerroom_future2','dangerroom_future_sunbomb','spine_future']);
});

test('Blueberry retries when its target is removed, does not share claims or strike the boss',()=>{
 const g=create(35);g['nextWave']=Infinity;g.conveyor=[];g.addPlant('electricblueberry',0,0);g.addPlant('electricblueberry',4,0);g.food=2;g.plantFood(0,0);g.plantFood(4,0);
 for(const row of [0,2,4]){const z=g.spawnZombie('future_armor4',row,cellX(8));z.stunnedUntil=100;}tick(g,1.6);
 const clouds=g.future.finale.clouds;assert.equal(clouds.length,2);assert.ok(clouds[0].target&&clouds[1].target);assert.notEqual(clouds[0].target!.id,clouds[1].target!.id);const target=clouds[0].target!,left=clouds[0].left;target.hp=0;tick(g,.1);assert.equal(clouds[0].left,left+1);assert.equal(clouds[0].target,null);assert.equal(g.boss!.zombie.hp,74000);
});
