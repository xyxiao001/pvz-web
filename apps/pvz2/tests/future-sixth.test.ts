import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,props,tick} from './future-fixture';
import {playFutureSixth} from './future-strategy';
import {cellX,type PlantKind} from '../src/game/level';
for(const day of [26,27,28,29,30])test(`Future ${day} legal replay`,()=>{
 const g=create(day),used=new Set<PlantKind>(),plant=g.plant.bind(g);g.plant=(kind,r,c,packet)=>{const result=plant(kind,r,c,packet);if(result)used.add(kind);return result;};
 for(let f=0;f<60000&&g.phase==='playing';f++){playFutureSixth(g,f);g.tick(1/60);g.events.length=0;}
 console.log('future'+day,g.phase,g.time,g.wave,g.lossReason,g.sunSpent,[...used]);assert.equal(g.phase,'won');assert.ok(used.size<=6);if(g.level.preset)assert.ok([...used].every(p=>g.level.preset!.includes(p)));assert.ok([...used].every(p=>!g.level.blacklist.includes(p)));
});

test('Future 26–30 use active native modules, cards, waves and spawn sources',()=>{
 assert.deepEqual([26,27,28,29,30].map(d=>level(d).waves.length),[8,12,8,12,12]);
 assert.deepEqual(level(27).lastStand,{sun:2000,food:1});assert.equal(level(27).sunDrops,false);
 assert.deepEqual(level(28).preset,['sunflower','pinkstarfruit','redstinger','holonut','powerplant']);assert.equal(props.plants.pinkstarfruit.SunCost,225);
 assert.equal(level(29).protectedPlants.length,5);assert.equal(level(29).mustProtect,5);assert.equal(level(29).mold.length,5);
 const spawns=level(29).actions.flat().filter(a=>a.mode==='graveZombies');assert.equal(spawns.length,6);assert.ok(spawns.every(a=>a.wait===1&&a.gridTypes!.includes('sap')));
 assert.ok(level(30).blacklist.includes('blover'));assert.ok(level(30).blacklist.includes('hurrikale'));assert.equal(level(30).sunDropper!.SunCountdownBase,4);
});
const quiet=(day=28)=>{const g=create(day);g['nextWave']=Infinity;return g;};
test('Pink Starfruit chooses forward or rear five-star fans and emits 200 food stars',()=>{
 for(const [column,animation] of [[7,'Shoot2'],[1,'Shoot0']] as const){const g=quiet();g.addPlant('pinkstarfruit',2,4);const z=g.spawnZombie('future_armor4',2,cellX(column));z.frozenUntil=100;tick(g,.8);assert.equal(g.plants[0].animation,animation);assert.equal(g.future.stars.filter(s=>s.style==='pink').length,5);}
 const g=quiet();g.addPlant('pinkstarfruit',2,4);g.food=1;let count=0;const shoot=g.future['pinkStars'].bind(g.future);g.future['pinkStars']=(p,food,offset)=>{if(food)count+=5;shoot(p,food,offset);};assert.ok(g.plantFood(2,4));tick(g,4);assert.equal(count,200);assert.equal(g.plants[0].action,'idle');tick(g,4);assert.equal(g.future.stars.length,0);
});
test('Red Stinger keeps three column forms, damage resistance, repair and finite food beam',()=>{
 const g=quiet();for(const [r,c] of [[0,1],[1,4],[2,7]])g.addPlant('redstinger',r,c);
 tick(g,.1);assert.deepEqual(g.plants.map(p=>p.animation),['Idle','Idle_Scared','Idle_Hide_0']);assert.deepEqual(g.plants.map(p=>g.future.plantDamageScale(p)),[1,.3333333,.2]);
 const hidden=g.plants[2];for(const [hp,stage] of [[225,0],[224,1],[150,1],[149,2],[75,2],[74,3]]){hidden.hp=hp;tick(g,.1);assert.equal(hidden.animation,`Idle_Hide_${stage}`);}hidden.hp=100;tick(g,.1);assert.equal(hidden.animation,'Idle_Hide_2');g.sun=150;assert.ok(g.plant('redstinger',2,7));assert.equal(hidden.hp,300);
 const z=g.spawnZombie('future_armor4',0,cellX(8));z.frozenUntil=100;g.food=1;g.plantFood(0,1);const health=z.hp+z.armor;tick(g,7.5);assert.ok(Math.abs((health-z.hp-z.armor)-1000)<5);assert.equal(g.future.redStates.get(g.plants[0].id)!.rayUntil,0);assert.notEqual(g.plants[0].action,'food');assert.equal(g.future.visuals.filter(v=>v.name==='redRay').length,0);
});
test('Sap spawns use living sap cells, respect the wait and skip brick food carriers',()=>{
 const g=quiet(29);g.sap=[{id:900,row:0,column:4,until:100,powered:false},{id:901,row:1,column:5,until:100,powered:true}];g.wave=2;g['startWave']();const original=g['pending'].length;
 tick(g,.5);assert.equal(g.zombies.filter(z=>z.entry==='ground').length,0);tick(g,.6);const spawned=g.zombies.filter(z=>z.entry==='ground');assert.equal(spawned.length,2);assert.ok(spawned.every(z=>g.sap.some(s=>s.row===z.row&&cellX(s.column)===z.entryX)));assert.equal(spawned.filter(z=>z.food).length,1);assert.equal(spawned.find(z=>z.kind==='future_armor4')!.food,false);assert.ok(original>0);assert.equal(g.sap.length,2);
});
test('Future 27 air drops never appear outside the native lawn and stop at their time limit',()=>{
 const g=quiet(27);g.startLastStand();g.wave=3;g['startWave']();const pending=g['pending'].filter(p=>p.mode==='spider');assert.ok(pending.length>0&&pending.length<=6);assert.ok(pending.every(p=>p.x===cellX(0)&&p.at-g.time<1));
});
test('Veteran jetpacks retain native health and speed, fly over short plants and stop at tall nuts',()=>{
 const g=quiet(30),z=g.spawnZombie('future_jetpack_veteran',2,cellX(4)+40);assert.equal(z.hp,390);assert.equal(props.zombies[z.kind].WalkSPS,.75);g.addPlant('peashooter',2,4);tick(g,.1);assert.equal(z.future!.animation,'Rise');g.plants=[];g.addPlant('tallnut',2,4);tick(g,3.5);assert.equal(z.future!.high,false);assert.ok(g.plants[0].hp<8000);g.addPlant('blover',0,0);tick(g,1);assert.equal(z.hp,0);
});

import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {FUTURE_LEVELS} from '../src/game/worlds/future';
import {ProgressStore} from '../src/shell/progression';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
test('Future 26–30 sources, resource plans and one-time rewards agree with the exported catalog',()=>{
 const read=(name:string)=>JSON.parse(readFileSync(new URL('../'+name,import.meta.url),'utf8'));
 const manifest=read('future-provenance.json'),catalog=read('public/assets/future/catalog.json');
 for(let day=26;day<=30;day++){const path=`future/future${day}.source.json`,bytes=readFileSync(new URL('../public/assets/'+path,import.meta.url));assert.equal(manifest.outputs[path].sha256,createHash('sha256').update(bytes).digest('hex'));assert.equal(FUTURE_LEVELS['future'+day].source,path);}
 assert.equal(FUTURE_LEVELS.future26.narrative,'FUTURE_26_INTRO');assert.equal(catalog.narratives.FUTURE_26_INTRO.filter((s:{Lines?:unknown})=>s.Lines).length,4);
 for(const p of ['pinkstarfruit','redstinger'])assert.ok(catalog.actors[p]);assert.ok(battleActors(level(30),[]).includes('jetpackVeteran'));assert.ok(battleEffects(level(27),[]).includes('futureNightLawn'));for(const rig of ['pinkShot','pinkFood','redRay'])assert.ok(battleEffects(level(28),level(28).preset!).includes(rig));
 const data=new Map<string,string>(),store=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 for(const d of [27,30,27,30]){store.finish('future','future'+d);store.finishPresentation();}assert.deepEqual(store.campaignRewards().map(r=>r.level),['future27','future30']);
});

test('Football mech contact with a hypnotized ally never selects a missing Eat animation',()=>{const g=quiet(29),ally=g.spawnZombie('future_armor4',2,cellX(4)),mech=g.spawnZombie('football_mech',2,cellX(4)+30);g.westFinale.adopt(ally);tick(g,2);assert.ok(ally.hp+ally.armor<2390);assert.ok(props.plantAnimations.footballMech[mech.future!.animation]);});

test('Removing Red Stinger during its beam retires the beam state without advancing a dead plant',()=>{const g=quiet();g.addPlant('redstinger',2,1);g.food=1;g.plantFood(2,1);tick(g,2);g.plants[0].hp=0;tick(g,.1);assert.equal(g.future.redStates.size,0);assert.equal(g.plants.length,0);});
