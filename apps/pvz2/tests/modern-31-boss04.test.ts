import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {create,level,read,tick} from './modern-fixture';
import {BATTLE_LEVELS} from '../src/game/levels';
import {cellX,type PlantKind} from '../src/game/level';
import {EgyptBoss} from '../src/game/egypt-boss';
import {PirateBoss} from '../src/game/pirate-boss';
import {CowboyBoss} from '../src/game/cowboy-boss';
import {FutureBoss} from '../src/game/future-boss';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {ProgressStore} from '../src/shell/progression';
import {islandStates,levelRoute} from '../src/shell/navigation';
import type {WorldMap} from '../src/shell/types';
const ids=['modern_zomboss_01_egypt','modern_zomboss_02_pirate','modern_zomboss_03_cowboy','modern_zomboss_04_future'];
const store=()=>{const data=new Map<string,string>();return new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});};
test('Modern 31 and four boss configurations retain map ownership and native stage data',()=>{
 assert.equal(Object.keys(BATTLE_LEVELS).length,498);const l=level(31);assert.equal(l.waves.length,10);assert.deepEqual(l.chooserPlants,['escaperoot']);assert.deepEqual(l.sliders.map(t=>[t.column,t.row,t.up]),[[6,1,true],[5,2,true],[4,3,true]]);
 const classes=[EgyptBoss,PirateBoss,CowboyBoss,FutureBoss],hp=[22500,31500,45000,39000];
 ids.forEach((id,i)=>{const c=BATTLE_LEVELS[id],g=create(id);assert.equal(c.world,'modern');assert.equal(c.day,i<3?32:33);assert.equal(g.level.world,['egypt','pirate','west','future'][i]);assert.ok(g.boss instanceof classes[i]);assert.equal(g.boss!.zombie.hp,hp[i]);assert.equal(g.level.sunDrops,false);assert.equal(g.level.mowers,true);assert.equal(g.level.conveyor!.InitialPlantList.length,[7,7,3,5][i]);assert.equal(g.level.boss!.kind,['zombossmech_egypt','zombossmech_pirate','zombossmech_cowboy','zombossmech_future'][i]);assert.equal(c.firstReward.image,'');});
 assert.equal(create(ids[0]).graves.length,3);assert.equal(create(ids[2]).cowboy.carts.length,2);assert.deepEqual(level(ids[1]).planks,[0,1,2,3,4]);
});
test('Modern boss bundles select the correct native mech, stage effects, tool cards and NPC assets',()=>{
 for(const id of ['modern31',...ids]){
  const c=BATTLE_LEVELS[id],l=level(id),catalogs=['battle','campaign',...c.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs)),narratives=Object.assign({},...catalogs.map(c=>c.narratives)),sounds=Object.assign({},...catalogs.map(c=>c.sounds));
  const plants:PlantKind[]=l.conveyor?l.conveyor.InitialPlantList.map(p=>p.PlantType):['escaperoot','peashooter','sunflower'];
  for(const name of battleActors(l,plants)){const s=actors[name],sk=read(s?`${s.group}/rigs/${s.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(s?sk.armature.some((a:{name:string})=>a.name===s.armature):sk.armature.length,`${id}: ${name}`);}
  const effects=battleEffects(l,plants);for(const name of effects){const s=rigs[name];assert.ok(s,`${id}: ${name}`);assert.ok(read(`${s.group}/rigs/${s.rig}/skeleton.json`).armature.some((a:{name:string})=>a.name===s.armature),name);}
  if(l.boss){const group=id.endsWith('egypt')?'campaign':id.split('_').at(-1);assert.equal(actors.boss.group,group);assert.ok(effects.includes('zombossicon'));const native=read(`modern/boss-${id.split('_').at(-1)}/properties.json`).zombies[l.boss.kind];assert.deepEqual(create(id).props.zombies[l.boss.kind].ZombossStages,native.ZombossStages);}
  for(const key of [c.narrative,c.outro].filter(Boolean) as string[])for(const line of narratives[key]){assert.ok(effects.includes(line.Character)||Object.hasOwn(read('battle/catalog.json').rigs,line.Character),line.Character);if(line.Lines)for(const voice of sounds[line.Voice])assert.ok(readFileSync(new URL('../public/assets/'+voice,import.meta.url)).length);}
 }
});
test('Modern 31 settles under controlled clear',()=>{const g=create(31);for(let i=0;i<40000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies){z.hp=0;z.deathCause='swallow';}}assert.equal(g.phase,'won');assert.equal(g.wave,10);});
for(const id of ids)test(`${id} runs native actions then clears all three phases and escape`,()=>{
 const g=create(id),boss=g.boss! as EgyptBoss;const seen=new Set<string>();for(let i=0;i<1800&&g.phase==='playing';i++){g.tick(1/60);seen.add(boss.animation);for(const z of g.zombies)if(z!==boss.zombie){z.hp=0;z.deathCause='swallow';}}
 assert.ok(seen.has('Spawn'));assert.ok(seen.has('SummonStart')||seen.has('Shoot')||seen.has('WalkU')||seen.has('WalkD'));assert.equal(g.phase,'playing');
 for(let i=0;i<6000&&g.phase==='playing';i++){g.tick(1/60);boss.hit(100000);for(const z of g.zombies)if(z!==boss.zombie){z.hp=0;z.deathCause='swallow';}}
 assert.equal(boss.stage,2);assert.equal(boss.defeated,true);assert.equal(g.phase,'won');
});
test('Modern future conveyor gamma tool creates a purple tile and leaves its occupant intact',()=>{
 const g=create(ids[3]);g.boss!.zombie.x=cellX(8);g.addPlant('fumeshroom',2,2);const occupant=g.plants[0];g.addPlant('powerplant_gamma',2,2);tick(g,2);assert.ok(g.level.powerTiles.some(t=>t.group==='gamma'&&t.row===2&&t.column===2));assert.ok(g.plants.includes(occupant));assert.ok(!g.plants.some(p=>p.kind==='powerplant_gamma'));assert.ok(battleEffects(g.level,['powerplant_gamma']).includes('tile_gammaFlash'));
});
test('Modern future purple power links cancel the matching boss targets',()=>{
 const g=create(ids[3]),boss=g.boss! as FutureBoss;g.level.powerTiles=[{group:'gamma',row:1,column:1,delay:1},{group:'gamma',row:3,column:3,delay:1}];g.addPlant('fumeshroom',1,1);g.addPlant('fumeshroom',3,3);boss.animation='Shoot_gamma';boss.targets=[{row:1,column:1},{row:3,column:3}];g.food=1;assert.ok(g.plantFood(1,1));assert.equal(boss.targets.length,0);tick(g,1.4);assert.equal(g.plants.find(p=>p.row===3)!.action,'food');
});
test('Modern multi-config map node randomly selects every available variant and shares completion',()=>{
 const map:WorldMap=read('shell/maps/modern.json'),node=map.islands.find(n=>n.levels.includes(ids[0]))!,next=map.islands.find(n=>n.levels.includes(ids[3]))!,p=store();assert.deepEqual([0,.4,.9].map(r=>levelRoute(node,()=>r)),ids.slice(0,3));assert.equal(levelRoute(next,()=>.9),'modern_zomboss_06_beach');p.finish('modern','modern31');p.finishPresentation();assert.equal(islandStates(map,p.completed(map)).get(node.node),'open');p.finish('modern',ids[1]);p.finishPresentation();for(const id of node.levels)assert.ok(p.isComplete(id));assert.equal(p.isComplete(ids[3]),false);assert.equal(islandStates(map,p.completed(map)).get(next.node),'open');const before=JSON.stringify(p.campaignRewards());p.finish('modern',ids[0]);assert.equal(JSON.stringify(p.campaignRewards()),before);assert.equal(p.pending(),null);
});
test('Modern outputs and fonts retain pinned hashes',()=>{for(const name of ['modern','shell','outer']){const p=JSON.parse(readFileSync(new URL(`../${name}-provenance.json`,import.meta.url),'utf8'));assert.equal(p.commit,'0e4a05348b6de328e2902a57afa24a3a454a4205');for(const [path,e] of Object.entries(p.outputs) as [string,{bytes:number;sha256:string}][]){if(name!=='modern'&&!path.endsWith('.woff2'))continue;const bytes=readFileSync(new URL('../public/assets/'+path,import.meta.url));assert.equal(bytes.length,e.bytes,path);assert.equal(createHash('sha256').update(bytes).digest('hex'),e.sha256,path);}}});
