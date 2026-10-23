import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {create,level,read,tick} from './modern-fixture';
import {BATTLE_LEVELS} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {ProgressStore,completionEvents} from '../src/shell/progression';
import {islandStates,LEVEL_ROUTES} from '../src/shell/navigation';
import type {WorldMap} from '../src/shell/types';
import type {PlantKind} from '../src/game/level';
test('Modern 6–10 preserve modes, authored grids, objectives, portals and rewards',()=>{
 assert.equal(Object.keys(BATTLE_LEVELS).length,473);
 for(let day=6;day<=10;day++)assert.equal(LEVEL_ROUTES[`modern${day}`],`modern${day}`);
 assert.deepEqual([6,7,8,9,10].map(n=>level(n).waves.length),[10,12,0,12,12]);
 assert.equal(level(6).targetSun,4000);assert.equal(level(6).goldTiles.length,7);assert.equal(level(8).beghouled!.MatchesToWin,100);assert.equal(level(8).mowers,false);assert.equal(BATTLE_LEVELS.modern8.night,true);assert.equal(level(9).graves.length,8);assert.deepEqual(level(9).preset,['moonflower','nightshade','gravebuster','thymewarp']);assert.equal(level(10).powerTiles.length,6);assert.equal(BATTLE_LEVELS.modern10.firstReward.plant,'shadowshroom');
 assert.deepEqual(level(6).actions.flat().flatMap(a=>a.portal?[a.portal.kind]:[]),['dark','dark']);assert.equal(level(9).actions.flat().find(a=>a.portal)!.portal!.kind,'iceage');assert.deepEqual(level(10).actions.flat().flatMap(a=>a.portal?[a.portal.kind]:[]),['future','dino']);
});
test('Modern 6–10 preload authored actors, effects, upgrades and dialogue',()=>{
 for(let day=6;day<=10;day++){
  const c=BATTLE_LEVELS[`modern${day}`],l=level(day),catalogs=['battle','campaign',...c.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
  const plants=[...new Set<PlantKind>([...c.plants.map(p=>p.kind),...(l.preset??[]),...(l.beghouled?[...l.beghouled.InitialPlants,...l.beghouled.UpgradeMap.map(u=>u.UpgradedPlant)]:[])])];
  for(const name of battleActors(l,plants)){const s=actors[name],sk=read(s?`${s.group}/rigs/${s.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(s?sk.armature.some((a:{name:string})=>a.name===s.armature):sk.armature.length,name);}
  for(const name of battleEffects(l,plants)){const s=rigs[name];assert.ok(s,name);assert.ok(read(`${s.group}/rigs/${s.rig}/skeleton.json`).armature.some((a:{name:string})=>a.name===s.armature),name);}
  if(c.narrative)for(const line of read('modern/catalog.json').narratives[c.narrative])if(line.Lines)for(const voice of read('modern/catalog.json').sounds[line.Voice])assert.ok(readFileSync(new URL('../public/assets/'+voice,import.meta.url)).length);
 }
});
for(const day of [6,7,9,10])test(`Modern ${day} controlled settlement waits for portals`,()=>{const g=create(day);if(day===6)g.dropSun(0,0,4000,'plant');for(let i=0;i<40000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'swallow');}assert.equal(g.phase,'won');assert.equal(g.modern.pending,false);assert.equal(g.wave,g.level.waves.length);});
test('Beghouled starts with forty plants, no matches and no premature win',()=>{const g=create(8);assert.equal(g.plants.length,40);assert.equal(g.beghouled.groups().length,0);tick(g,1);assert.equal(g.phase,'playing');assert.equal(g.zombies.length,0);assert.ok(g.beghouled.moves().length>0);tick(g,4.1);assert.equal(g.zombies.length,1);});
test('Beghouled invalid swap preserves cells and valid swaps produce sun and refill',()=>{const g=create(8);tick(g,.6);const b=g.beghouled,pair=b.moves()[0];assert.ok(b.swap(...pair));assert.ok(b.matches>0);assert.ok(g.sunProduced>=50);assert.ok(g.plants.length<40);tick(g,.6);assert.equal(g.plants.length,40);
 const a=g.plants.find(p=>p.column===0&&p.row===0)!,far=g.plants.find(p=>p.column===7&&p.row===4)!;const pos=[a.row,a.column,far.row,far.column];assert.equal(b.swap(a,far),false);assert.deepEqual([a.row,a.column,far.row,far.column],pos);
});
test('Beghouled upgrades all matching plants and exposes second-tier choices',()=>{const g=create(8),b=g.beghouled;assert.equal(b.cost('repeater'),2000);assert.equal(b.upgrade('repeater'),false);g.sun=6000;assert.ok(b.upgrade('repeater'));assert.equal(g.sun,4000);assert.ok(!b.current.includes('peashooter'));assert.ok(b.upgrades.includes('threepeater'));assert.ok(!b.upgrades.includes('firepeashooter'));assert.ok(!g.plants.some(p=>p.kind==='peashooter'));assert.ok(b.upgrade('threepeater'));assert.equal(g.sun,0);assert.ok(b.current.includes('threepeater'));});
test('Eaten Beghouled plants leave holes until shoveled; shuffle retains holes',()=>{const g=create(8),p=g.plants[0];p.hp=0;tick(g,.1);assert.ok(g.beghouled.holes.has(`${p.row}:${p.column}`));tick(g,1);assert.equal(g.beghouled.at(p.row,p.column),undefined);g.beghouled.shuffle();assert.equal(g.beghouled.at(p.row,p.column),undefined);g.beghouled.shovel(p.row,p.column);tick(g,1);assert.ok(g.beghouled.at(p.row,p.column));});
test('Beghouled controlled matching reaches 100 and uses original stage boundaries',()=>{const g=create(8),b=g.beghouled;let reached1=false,reached2=false;for(let i=0;i<2000&&g.phase==='playing';i++){tick(g,.55);for(const z of g.zombies)g.damage(z,100000,'swallow');const move=b.moves()[0];if(move)b.swap(...move);assert.equal(b.stage,b.matches>70?2:b.matches>30?1:0);reached1 ||=b.stage===1;reached2 ||=b.stage===2;}assert.equal(g.phase,'won');assert.equal(b.matches,100);assert.ok(reached1&&reached2);});
test('Beghouled newspaper keeps its 325 body and 600 newspaper health',()=>{const g=create(8),z=g.spawnZombie('beghouled_newspaper',2,1000);assert.equal(z.hp,325);g.damage(z,650);assert.equal(z.hp,275);assert.equal(g.modern.papers.get(z.id)!.hp,0);assert.equal(g.modern.animation(z),'GetAngry');});
test('Modern 6–10 sequential map rewards are claimed once',()=>{const map:WorldMap=read('shell/maps/modern.json'),data=new Map<string,string>(),p=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 for(let day=1;day<=10;day++){const id=`modern${day}`,node=map.islands.find(n=>n.levels.includes(id))!;assert.equal(islandStates(map,p.completed(map),p.rewardNodes('modern')).get(node.node),'open');p.finish('modern',id);for(const e of completionEvents(map,id,p.completed(map),p.rewardNodes('modern')))if(e.action==='reward')p.award('modern',map.islands.find(n=>n.node===e.node)!);p.finishPresentation();const before=JSON.stringify([p.rewards(),p.campaignRewards()]);p.finish('modern',id);assert.equal(JSON.stringify([p.rewards(),p.campaignRewards()]),before);}
 assert.ok(p.ownedPlants().has(84));assert.equal(p.campaignRewards().filter(r=>r.id==='spine_modern').length,2);assert.ok(read('shell/progression.json').plants[84].length);
});
test('Modern resource exports retain pinned hashes',()=>{for(const name of ['modern','progression']){const p=JSON.parse(readFileSync(new URL(`../${name}-provenance.json`,import.meta.url),'utf8'));for(const [path,e] of Object.entries(p.outputs) as [string,{bytes:number;sha256:string}][]){const bytes=readFileSync(new URL('../public/assets/'+path,import.meta.url));assert.equal(bytes.length,e.bytes,path);assert.equal(createHash('sha256').update(bytes).digest('hex'),e.sha256,path);}}});

test('Modern authored grids load with only basic owned seeds',()=>{const tiles=battleEffects(level(10),['peashooter','sunflower']);for(const name of ['tile_alpha','tile_beta','tile_alphaFlash','tile_betaDot'])assert.ok(tiles.includes(name),name);assert.ok(battleEffects(level(6),['peashooter']).includes('goldtile'));});
