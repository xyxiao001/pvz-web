import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,tick,props} from './future-fixture';
import {BOARD,cellX,rowY} from '../src/game/level';
import {FUTURE_LEVELS} from '../src/game/worlds/future';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
function quiet(day=1){const g=create(day);g['nextWave']=Infinity;g.level.waves=[[]];g.sun=9999;return g;}
test('Future 1–5 preserve waves, power tiles, sun bombs and active objectives',()=>{
 assert.deepEqual([1,2,3,4,5].map(d=>level(d).waves.length),[10,12,10,16,12]);
 assert.ok([1,2,3,4,5].every(d=>level(d).mowers&&level(d).maxPlants===null));
 assert.deepEqual(level(1).powerTiles.map(t=>[t.column,t.row,t.delay]),[[1,0,.2],[1,2,.2],[1,4,.2]]);
 assert.equal(level(4).sunDropper!.SunCountdownBase,4);assert.equal(level(4).blacklist.includes('sunflower'),true);
 assert.equal(FUTURE_LEVELS.future4.night,true);assert.equal(level(5).waves.flat().includes('mech_cone'),true);
 assert.equal(level(3).actions.flat().filter(a=>a.mode==='spider').reduce((n,a)=>n+a.zombies.length,0),12);
});
test('matching power tiles propagate once, after delay and travel, spending just one bean',()=>{
 const g=quiet();for(const row of [0,2,4])g.addPlant('peashooter',row,1);g.food=1;
 assert.equal(g.plantFood(0,1),true);tick(g,.25);assert.equal(g.plants[1].action,'idle');tick(g,.1);assert.equal(g.plants[1].action,'food');assert.equal(g.plants[2].action,'idle');tick(g,.12);assert.equal(g.plants[2].action,'food');assert.equal(g.food,0);tick(g,4);assert.equal(g.future.links.length,0);
});
test('laser damages all lane targets through shields; its native food sweep hits each target once',()=>{
 const g=quiet(2);g.addPlant('laser_bean',2,0);const a=g.spawnZombie('future_armor2',2,cellX(4)),b=g.spawnZombie('future_armor2',2,cellX(6)),off=g.spawnZombie('future',1,cellX(5));
 tick(g,1);assert.equal(a.armor,1060);assert.equal(b.armor,1060);assert.equal(off.hp,190);
 const mech=g.spawnZombie('mech_cone',2,cellX(8));g.food=1;g.plantFood(2,0);g.plants[0].nextAction=Infinity;tick(g,1);assert.equal(mech.hp,2500);tick(g,3);assert.equal(mech.hp,700);assert.equal(g.plants[0].action,'idle');
});
test('protector shares 1200 shield HP over three rows and recovers after stun and walking delay',()=>{
 const g=quiet(2),z=g.spawnZombie('future_protector',2,cellX(7));tick(g,.02);const shields=g.zombies.filter(z=>z.kind==='future_protector_shield');assert.equal(shields.length,3);
 g.damage(shields[0],400);assert.ok(shields.every(s=>s.hp===800));g.damage(shields[2],800);tick(g,.02);assert.equal(g.zombies.filter(z=>z.kind==='future_protector_shield').length,0);assert.equal(g.kills,0);
 tick(g,6.8);assert.equal(g.zombies.filter(z=>z.kind==='future_protector_shield').length,0);tick(g,.4);assert.equal(g.zombies.filter(z=>z.kind==='future_protector_shield').length,3);
 g.damage(z,500);tick(g,.1);assert.equal(g.zombies.length,0);assert.equal(g.kills,1);
});
test('peas hit the shield before its owner while laser leaves shield health intact',()=>{
 const g=quiet(2),z=g.spawnZombie('future_protector',2,cellX(6));g.addPlant('peashooter',1,1);g.addPlant('laser_bean',2,1);tick(g,3.4);
 assert.equal(z.hp,420);const shield=g.zombies.find(z=>z.kind==='future_protector_shield')!;assert.ok(shield.hp<1200&&shield.hp>1100);
});
test('jetpack flies over normal plants, tallnut blocks it, and blover removes airborne targets only',()=>{
 const g=quiet();g.addPlant('wallnut',2,4);const flying=g.spawnZombie('future_jetpack',2,cellX(4)+45),ground=g.spawnZombie('future',1,cellX(6));tick(g,2);assert.ok(flying.future!.high);assert.equal(g.plants[0].hp,props.plants.wallnut.Toughness);
 g.addPlant('blover',4,0);g.food=1;assert.equal(g.plantFood(4,0),false);tick(g,.6);assert.ok(!g.zombies.includes(flying));assert.equal(flying.deathCause,'blow');assert.ok(g.zombies.includes(ground));tick(g,4);assert.ok(!g.plants.some(p=>p.kind==='blover'));
});
test('future imp drops, lands and hops at the source walk events',()=>{
 const g=quiet(3),z=g.spawnZombie('future_imp',2,cellX(5),'spider'),x=z.x;tick(g,.5);assert.equal(z.future!.animation,'Fall');tick(g,1);assert.equal(z.future!.animation,'Land');assert.equal(z.x,x);tick(g,3);assert.ok(z.x<x-15);
});
test('sun bombs land as 50 sun; clicking in air blasts only at the native explosion event',()=>{
 const g=quiet(4);g['nextSun']=Infinity;g.dropSun(cellX(4),rowY(2)-45,50,'sky');const sun=g.suns[0];sun.targetY=sun.y;tick(g,.02);assert.equal(sun.bomb,false);const balance=g.sun;g.collect(sun.id);assert.equal(g.sun,balance+50);
 g.addPlant('wallnut',2,4);const z=g.spawnZombie('mech_cone',2,cellX(4));g.dropSun(cellX(4),rowY(2)-40,50,'sky');const bomb=g.suns[0];g.collect(bomb.id);tick(g,1.2);assert.equal(z.hp,2500);tick(g,.1);assert.equal(z.hp,2000);assert.ok(g.plants[0].hp<=3000);assert.equal(g.sun,balance+50);tick(g,2);assert.equal(g.future.visuals.length,0);
});
test('future resource plan includes native actors, power tiles, lasers and sunbomb assets',()=>{
 const actors=battleActors(level(2),['laser_bean']);assert.ok(actors.includes('futureShield'));
 const effects=battleEffects(level(4),['laser_bean','blover']);for(const n of ['futureNightLawn','tile_alpha','tile_deltaFlash','sunbombBlast','laserBeam'])assert.ok(effects.includes(n));
});
import {playFuture} from './future-strategy';
for(const day of [1,2,3,4,5])test(`Future ${day} legal inputs replay`,()=>{
 const g=create(day);for(let f=0;f<60000&&g.phase==='playing';f++){playFuture(g,f);g.tick(1/60);g.events.length=0;}
 console.log(`future${day}`,g.phase,g.time.toFixed(1),'wave',g.wave,'sun',g.sun,'lost',g.plantsLost);
 assert.equal(g.phase,'won');
});
test('shield segments disappear in the same frame their owner is killed by a laser',()=>{
 const g=quiet(2);const z=g.spawnZombie('future_protector',2,cellX(5));tick(g,.1);z.hp=40;g.addPlant('laser_bean',2,0);for(let f=0;f<120&&z.hp>0;f++)tick(g,1/60);assert.equal(z.hp,0);assert.equal(g.zombies.length,0);assert.equal(g.kills,1);
});

import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {ProgressStore,completionEvents} from '../src/shell/progression';
import type {WorldMap} from '../src/shell/types';
test('Future assets match the pinned export and jetpack fragment sockets resolve',()=>{
 const read=(path:string)=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
 const manifest=read('../future-provenance.json');assert.equal(manifest.commit,'0e4a05348b6de328e2902a57afa24a3a454a4205');
 for(const [name,entry] of Object.entries(manifest.outputs) as [string,{sha256:string}][])assert.equal(createHash('sha256').update(readFileSync(new URL('../public/assets/'+name,import.meta.url))).digest('hex'),entry.sha256,name);
 const catalog=read('../public/assets/future/catalog.json');
 const basic=read(`../public/assets/future/rigs/${catalog.actors.future.rig}/skeleton.json`),jet=read(`../public/assets/future/rigs/${catalog.actors.futureJetpack.rig}/skeleton.json`);
 assert.ok(basic.armature.some((a:{name:string})=>a.name==='arm'));assert.ok(basic.armature.some((a:{name:string})=>a.name==='head'));
 assert.ok(jet.armature.find((a:{name:string})=>a.name==='JetpackZombie').bone.some((b:{name:string})=>b.name==='armRoot_here'));
});
test('Future map grants laser bean, blover and first-clear rewards only once',()=>{
 const data=new Map<string,string>(),store=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 const map=JSON.parse(readFileSync(new URL('../public/assets/shell/maps/future.json',import.meta.url),'utf8')) as WorldMap;
 for(let day=1;day<=5;day++){const id=`future${day}`;store.finish('future',id);for(const e of completionEvents(map,id,store.completed(map),store.rewardNodes('future')))if(e.action==='reward')store.award('future',map.islands.find(n=>n.node===e.node)!);store.finishPresentation();}
 assert.ok(store.ownedPlants().has(89));assert.ok(store.ownedPlants().has(36));for(const day of [4,5])store.finish('future',`future${day}`);
 assert.deepEqual(store.campaignRewards().map(r=>r.id),['dangerroom_future','spine_future']);
});
test('Future map reward displays have exported native idle animations',()=>{
 const art=JSON.parse(readFileSync(new URL('../public/assets/shell/progression.json',import.meta.url),'utf8'));
 for(const id of [89,36]){assert.ok(art.plants[id].length>0);for(const draw of art.plants[id])if(draw.kind==='rig'){
  const sk=JSON.parse(readFileSync(new URL(`../public/assets/shell/rigs/${draw.rig}/skeleton.json`,import.meta.url),'utf8'));
  assert.ok(sk.armature.find((a:{name:string})=>a.name===draw.armature).animation.some((a:{name:string})=>a.name===draw.animation));
 }}
});
