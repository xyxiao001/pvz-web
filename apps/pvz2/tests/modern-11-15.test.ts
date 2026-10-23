import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {create,level,read,tick} from './modern-fixture';
import {BATTLE_LEVELS} from '../src/game/levels';
import {cellX,type PlantKind} from '../src/game/level';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {ProgressStore,completionEvents} from '../src/shell/progression';
import {islandStates,LEVEL_ROUTES} from '../src/shell/navigation';
import type {WorldMap} from '../src/shell/types';

test('Modern 11–15 retain original chooser, modes, waves, dinosaurs and objectives',()=>{
 assert.equal(Object.keys(BATTLE_LEVELS).length,478);
 for(let day=11;day<=15;day++){assert.equal(LEVEL_ROUTES[`modern${day}`],`modern${day}`);assert.ok(BATTLE_LEVELS[`modern${day}`].plants.some(p=>p.kind==='shadowshroom'));}
 assert.deepEqual([11,12,13,14,15].map(n=>level(n).waves.length),[10,10,0,10,10]);
 assert.deepEqual(level(11).chooserPlants,['shadowshroom','garlic']);assert.equal(level(12).maxPlantsLost,10);
 assert.deepEqual(level(12).actions.flat().flatMap(a=>a.dinosaur?[a.dinosaur]:[]),[{kind:'raptor',row:2,delay:0},{kind:'stego',row:4,delay:0},{kind:'tyranno',row:1,delay:0}]);
 assert.equal(BATTLE_LEVELS.modern13.mode,'beghouled');assert.equal(BATTLE_LEVELS.modern13.night,true);
 assert.deepEqual(level(14).preset,['moonflower','nightshade','shadowshroom','garlic','shrinkingviolet']);
 assert.deepEqual(level(15).protectedPlants,[{kind:'primalwallnut',row:1,column:4},{kind:'primalwallnut',row:3,column:4}]);assert.equal(level(15).mustProtect,2);
 assert.equal(BATTLE_LEVELS.modern15.outro,'MODERN_15_OUTRO');assert.equal(BATTLE_LEVELS.modern15.firstReward.image,'note_modern');assert.equal(BATTLE_LEVELS.modern15.firstReward.textOnly,true);
});
test('Modern 11–15 load required actors, effects and dialogue with authored or basic cards',()=>{
 for(let day=11;day<=15;day++){
  const c=BATTLE_LEVELS[`modern${day}`],l=level(day),catalogs=['battle','campaign',...c.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
  const plants:PlantKind[]=l.beghouled?[...l.beghouled.InitialPlants,...l.beghouled.UpgradeMap.map(u=>u.UpgradedPlant)]:l.preset??[...l.chooserPlants??[], 'peashooter','sunflower'];
  for(const name of battleActors(l,plants)){const s=actors[name],sk=read(s?`${s.group}/rigs/${s.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(s?sk.armature.some((a:{name:string})=>a.name===s.armature):sk.armature.length,name);}
  const effects=battleEffects(l,plants);
  for(const name of effects){const s=rigs[name];assert.ok(s,`${day}: ${name}`);assert.ok(read(`${s.group}/rigs/${s.rig}/skeleton.json`).armature.some((a:{name:string})=>a.name===s.armature),name);}
  const catalog=read('modern/catalog.json'),loaded=new Set([...effects,...Object.keys(read('battle/catalog.json').rigs)]);for(const key of [c.narrative,c.outro])if(key)for(const line of catalog.narratives[key]){assert.ok(loaded.has(line.Character),line.Character);if(line.Lines)for(const voice of catalog.sounds[line.Voice])assert.ok(readFileSync(new URL('../public/assets/'+voice,import.meta.url)).length);}
 }
});
for(const day of [11,12,14,15])test(`Modern ${day} controlled settlement reaches all waves`,()=>{const g=create(day);for(let i=0;i<40000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'swallow');}assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);if(day===15)assert.equal(g.plants.filter(p=>p.endangered&&p.hp>0).length,2);});
test('Modern 12 starts cross-world dinosaurs and enforces the ten-loss boundary',()=>{const g=create(12);Object.assign(g,{nextWave:Infinity});for(const a of g.level.actions.flat())if(a.dinosaur)g.dino.add(a.dinosaur);tick(g,.1);assert.equal(g.dino.raptors[0].row,2);assert.equal(g.dino.visitors.items[0].row,4);assert.equal(g.dino.tyranno.items[0].row,1);g.plantsLost=10;tick(g,.1);assert.equal(g.phase,'playing');g.plantsLost=11;tick(g,.1);assert.equal(g.phase,'lost');assert.equal(g.lossReason,'plantsLost');});
test('Modern 15 loses when one of its two protected nuts is destroyed',()=>{const g=create(15);g.plants.find(p=>p.endangered)!.hp=0;tick(g,.1);assert.equal(g.phase,'lost');assert.equal(g.lossReason,'protected');});
test('Modern 13 uses authored upgrade branches and native Beghouled prices',()=>{const g=create(13),b=g.beghouled;assert.equal(b.config.MatchesToWin,150);assert.ok(b.current.includes('puffshroom'));g.sun=10000;assert.ok(b.upgrade('firepeashooter'));assert.ok(b.upgrades.includes('primalpeashooter'));assert.equal(b.cost('primalpeashooter'),3000);assert.ok(b.upgrade('primalpeashooter'));assert.equal(b.cost('fumeshroom'),500);assert.ok(b.upgrade('fumeshroom'));assert.ok(b.upgrade('laser_bean'));assert.equal(b.cost('electricblueberry'),500);assert.ok(b.upgrade('electricblueberry'));assert.equal(g.sun,2000);for(const k of ['primalpeashooter','fumeshroom','electricblueberry'])assert.ok(g.plants.some(p=>p.kind===k));});
test('Modern 13 controlled matching reaches 150 across the 25 and 100 stage boundaries',()=>{const g=create(13),b=g.beghouled;let middle=false,last=false;for(let i=0;i<2500&&g.phase==='playing';i++){tick(g,.55);for(const z of g.zombies)g.damage(z,100000,'swallow');const move=b.moves()[0];if(move)b.swap(...move);assert.equal(b.stage,b.matches>100?2:b.matches>25?1:0);middle ||=b.stage===1;last ||=b.stage===2;}assert.equal(g.phase,'won');assert.equal(b.matches,150);assert.ok(middle&&last);});
test('Shadow-powered poison spreads only on same-lane contact and preserves its expiry',()=>{const g=create(11);Object.assign(g,{nextWave:Infinity});g.addPlant('moonflower',2,1);g.addPlant('shadowshroom',2,2);tick(g,.1);const p=g.plants.find(p=>p.kind==='shadowshroom')!,a=g.spawnZombie('tutorial_armor2',2,cellX(5)),b=g.spawnZombie('tutorial',2,cellX(5)+30),far=g.spawnZombie('tutorial',2,cellX(6)),otherLane=g.spawnZombie('tutorial',1,cellX(5));g.westFinale.eaten(p,a);assert.ok(a.poison!.infective);const until=a.poison!.until,armor=a.armor,hp=a.hp;g.westFinale.tick(.1);assert.equal(b.poison!.until,until);assert.ok(b.poison!.infective);assert.equal(far.poison,undefined);assert.equal(otherLane.poison,undefined);assert.equal(a.armor,armor);assert.ok(a.hp<hp);g.time=until+1;g.westFinale.tick(.1);assert.equal(a.poison,undefined);assert.equal(b.poison,undefined);});
test('Unpowered shadowshroom poison does not spread',()=>{const g=create(11);g.addPlant('shadowshroom',2,2);const a=g.spawnZombie('tutorial',2,cellX(5)),b=g.spawnZombie('tutorial',2,cellX(5)+10);g.westFinale.eaten(g.plants[0],a);g.westFinale.tick(.1);assert.equal(a.poison!.infective,false);assert.equal(b.poison,undefined);});
test('Modern map unlocks through 15 and records pinatas and the note once',()=>{const map:WorldMap=read('shell/maps/modern.json'),data=new Map<string,string>(),p=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 for(let day=1;day<=15;day++){const id=`modern${day}`,node=map.islands.find(n=>n.levels.includes(id))!;assert.equal(islandStates(map,p.completed(map),p.rewardNodes('modern')).get(node.node),'open');p.finish('modern',id);for(const e of completionEvents(map,id,p.completed(map),p.rewardNodes('modern')))if(e.action==='reward')p.award('modern',map.islands.find(n=>n.node===e.node)!);p.finishPresentation();const before=JSON.stringify([p.rewards(),p.campaignRewards()]);p.finish('modern',id);assert.equal(JSON.stringify([p.rewards(),p.campaignRewards()]),before);}
 assert.equal(p.campaignRewards().filter(r=>r.id==='spine_modern').length,4);assert.equal(p.campaignRewards().filter(r=>r.id==='note_modern').length,1);assert.equal(p.pending(),null);
});
test('Modern batch exports match pinned resource hashes',()=>{const p=JSON.parse(readFileSync(new URL('../modern-provenance.json',import.meta.url),'utf8'));assert.equal(p.commit,'0e4a05348b6de328e2902a57afa24a3a454a4205');for(const [path,e] of Object.entries(p.outputs) as [string,{bytes:number;sha256:string}][]){const bytes=readFileSync(new URL('../public/assets/'+path,import.meta.url));assert.equal(bytes.length,e.bytes,path);assert.equal(createHash('sha256').update(bytes).digest('hex'),e.sha256,path);}});
