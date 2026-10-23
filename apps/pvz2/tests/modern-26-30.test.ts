import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {create,level,read,tick} from './modern-fixture';
import {BATTLE_LEVELS} from '../src/game/levels';
import {BOARD,cellX,type PlantKind} from '../src/game/level';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {ProgressStore,completionEvents} from '../src/shell/progression';
import {islandStates,LEVEL_ROUTES} from '../src/shell/navigation';
import type {WorldMap} from '../src/shell/types';

test('Modern 26–30 preserve authored modes, jams, dinosaurs, grids and targets',()=>{
 assert.equal(Object.keys(BATTLE_LEVELS).length,509);
 for(let day=26;day<=30;day++)assert.equal(LEVEL_ROUTES[`modern${day}`],`modern${day}`);
 assert.deepEqual([26,27,28,29,30].map(n=>level(n).waves.length),[12,0,10,12,12]);
 assert.equal(create(26).eighties.jam,'jam_metal');assert.equal(create(29).eighties.jam,'jam_rap');
 assert.equal(level(26).actions.flat().filter(a=>a.dinosaur).length,2);assert.equal(level(29).actions.flat().filter(a=>a.dinosaur).length,1);
 assert.equal(BATTLE_LEVELS.modern27.mode,'beghouled');assert.equal(BATTLE_LEVELS.modern27.night,true);assert.equal(level(27).beghouled!.MatchesToWin,150);
 assert.equal(level(28).targetSun,3000);assert.deepEqual(level(28).goldTiles,[{row:1,column:6},{row:2,column:4},{row:3,column:6}]);
 assert.equal(level(29).graves.length,9);assert.equal(BATTLE_LEVELS.modern29.firstReward.image,'spine_modern');assert.equal(level(30).flowerLine,5.5);
 assert.deepEqual(level(30).rails!.Rails,[{Column:4,RowStart:0,RowEnd:4}]);assert.equal(create(30).cowboy.carts[0].row,0);
});
test('Modern 26–30 preload actual upgrades and cross-world actors and effects',()=>{
 for(let day=26;day<=30;day++){
  const c=BATTLE_LEVELS[`modern${day}`],l=level(day),catalogs=['battle','campaign',...c.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
  const plants:PlantKind[]=['peashooter','sunflower',...l.beghouled?.InitialPlants??[],...l.beghouled?.UpgradeMap.map(p=>p.UpgradedPlant)??[]];
  for(const name of battleActors(l,plants)){const s=actors[name],sk=read(s?`${s.group}/rigs/${s.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(s?sk.armature.some((a:{name:string})=>a.name===s.armature):sk.armature.length,name);}
  const effects=battleEffects(l,plants);for(const name of effects){const s=rigs[name];assert.ok(s,`${day}: ${name}`);assert.ok(read(`${s.group}/rigs/${s.rig}/skeleton.json`).armature.some((a:{name:string})=>a.name===s.armature),name);}
  for(const name of day===30?['rail','cart','prospectorSmoke','prospectorTail']:day===29?['raptor']:day===28?['goldtile','wizardSheep','wizardLink','wizardHit']:day===26?['metalWave','metalHit','raptor','dirtSpawn']:['appleShot','appleHit'])assert.ok(effects.includes(name),`${day}: ${name}`);
 }
 const r=read('cowboy/catalog.json').rigs.rail,sk=read(`${r.group}/rigs/${r.rig}/skeleton.json`);for(const [armature,animations] of [['Rail',['UpFrontyard','MidFrontyard','DownFrontyard']],['Cart',['Frontyard']]] as const)for(const name of animations)assert.ok(sk.armature.find((a:{name:string})=>a.name===armature).animation.some((a:{name:string})=>a.name===name));
});
for(const day of [26,28,29,30])test(`Modern ${day} settles under controlled clear`,()=>{const g=create(day);if(day===28)g.dropSun(0,0,3000,'plant');for(let i=0;i<40000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies){z.hp=0;z.deathCause='swallow';}}assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);assert.equal(g.modern.pending,false);});
test('Modern 27 upgrades kernel-pults to apple mortars for the native 2500 price',()=>{const g=create(27),b=g.beghouled;assert.deepEqual(b.upgrades,['firepeashooter','repeater','tallnut','endurian','coldsnapdragon','applemortar','laser_bean']);const count=g.plants.filter(p=>p.kind==='kernelpult').length;assert.ok(count>0);assert.equal(b.cost('applemortar'),2500);g.sun=2500;assert.ok(b.upgrade('applemortar'));assert.equal(g.sun,0);assert.equal(g.plants.filter(p=>p.kind==='applemortar').length,count);assert.ok(!b.current.includes('kernelpult'));assert.ok(!g.plants.some(p=>p.kind==='kernelpult'));});
test('Modern 27 passes all four authored spawn phases and wins at 150 controlled matches',()=>{const g=create(27),b=g.beghouled,stages=new Set<number>();let guard=0;while(g.phase==='playing'&&guard++<20000){for(const z of g.zombies)z.hp=0;if(g.time>=b.settleAt){const move=b.moves()[0];if(move)b.swap(...move);}g.tick(.05);assert.equal(b.stage,b.matches>110?3:b.matches>70?2:b.matches>30?1:0);stages.add(b.stage);}assert.equal(g.phase,'won');assert.equal(b.matches,150);assert.deepEqual([...stages],[0,1,2,3]);assert.deepEqual(b.config.Stages.map(s=>s.SpawnDelay),[2,2,2,1.5]);});
test('Modern 28 gold tiles produce sun toward the objective',()=>{const g=create(28);Object.assign(g,{nextWave:Infinity});g.addPlant('wallnut',2,4);tick(g,25);assert.ok(g.sunProduced>0);assert.ok(g.sunProduced<3000);assert.equal(g.phase,'playing');});
test('Modern 30 cart carries its plant while empty rails cannot be planted',()=>{const g=create(30);Object.assign(g,{nextWave:Infinity});g.addPlant('peashooter',0,4);assert.equal(g.cowboy.canPlant(4,4),false);assert.ok(g.cowboy.select(0,4));assert.ok(g.cowboy.move(4));assert.equal(g.plants[0].row,4);assert.equal(g.cowboy.carts[0].row,4);assert.equal(g.cowboy.canPlant(0,4),false);assert.equal(g.cowboy.canPlant(4,4),true);assert.ok(g.cowboy.sounds.includes('cart/moveSounds'));});
test('Modern 30 loses when a forward zombie steps onto the flower line',()=>{const g=create(30);Object.assign(g,{nextWave:Infinity});g.spawnZombie('tutorial',2,BOARD.left+5.5*BOARD.cellWidth+5);tick(g,.1);assert.equal(g.phase,'lost');assert.equal(g.lossReason,'flowers');});
test('Modern 30 prospector produces its launch effects before jumping across the flowers',()=>{const g=create(30);Object.assign(g,{nextWave:Infinity});const z=g.spawnZombie('prospector',2,cellX(8));z.west!.fuse=0;let smoke=false,tail=false;for(let i=0;i<120;i++){g.tick(1/60);smoke ||=g.cowboy.effects.some(e=>e.kind==='prospectorSmoke');tail ||=g.cowboy.effects.some(e=>e.kind==='prospectorTail');}assert.ok(smoke);assert.ok(tail);assert.equal(g.phase,'playing');assert.ok(z.leap||z.reversed);});
test('Modern 1–30 map unlocks sequentially and day 29 pinata is credited only once',()=>{const map:WorldMap=read('shell/maps/modern.json'),data=new Map<string,string>(),p=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 for(let day=1;day<=30;day++){const id=`modern${day}`,node=map.islands.find(n=>n.levels.includes(id))!;assert.equal(islandStates(map,p.completed(map),p.rewardNodes('modern')).get(node.node),'open');p.finish('modern',id);for(const e of completionEvents(map,id,p.completed(map),p.rewardNodes('modern')))if(e.action==='reward')p.award('modern',map.islands.find(n=>n.node===e.node)!);p.finishPresentation();const before=JSON.stringify([p.rewards(),p.campaignRewards()]);p.finish('modern',id);assert.equal(JSON.stringify([p.rewards(),p.campaignRewards()]),before);}
 assert.equal(p.campaignRewards().filter(r=>r.level==='modern29'&&r.type==='pinata').length,1);assert.equal(p.pending(),null);
});
test('Modern and reward outputs retain pinned hashes',()=>{for(const name of ['modern','progression']){const p=JSON.parse(readFileSync(new URL(`../${name}-provenance.json`,import.meta.url),'utf8'));assert.equal(p.commit,'0e4a05348b6de328e2902a57afa24a3a454a4205');for(const [path,e] of Object.entries(p.outputs) as [string,{bytes:number;sha256:string}][]){const bytes=readFileSync(new URL('../public/assets/'+path,import.meta.url));assert.equal(bytes.length,e.bytes,path);assert.equal(createHash('sha256').update(bytes).digest('hex'),e.sha256,path);}}});
