import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {create,level,read,tick} from './modern-fixture';
import {BATTLE_LEVELS,availablePlants} from '../src/game/levels';
import {ENDLESS_LEVELS} from '../src/game/endless';
import {cellX,type PlantKind} from '../src/game/level';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {ProgressStore,completionEvents} from '../src/shell/progression';
import {islandStates,LEVEL_ROUTES} from '../src/shell/navigation';
import type {WorldMap} from '../src/shell/types';
const quiet=()=>{const g=create(17);Object.assign(g,{nextWave:Infinity});return g;};
test('Modern 16–20 preserve conveyor changes, portals, night, gold tiles and rewards',()=>{
 assert.equal(Object.keys(BATTLE_LEVELS).length,488);
 for(let day=16;day<=20;day++)assert.equal(LEVEL_ROUTES[`modern${day}`],`modern${day}`);
 assert.deepEqual([16,17,18,19,20].map(n=>level(n).waves.length),[12,10,10,10,10]);
 assert.equal(level(16).mowers,false);assert.deepEqual(level(16).conveyor!.InitialPlantList.map(p=>p.PlantType),['primalpotatomine','wintermelon']);assert.equal(BATTLE_LEVELS.modern16.night,true);assert.equal(BATTLE_LEVELS.modern19.night,true);
 assert.deepEqual(level(17).chooserPlants,['dusklobber']);assert.deepEqual(level(19).conveyor!.InitialPlantList.map(p=>p.PlantType),['escaperoot','laser_bean','primalpeashooter']);
 assert.equal(level(17).actions.flat().find(a=>a.portal)!.portal!.kind,'egypt');assert.equal(level(19).actions.flat().find(a=>a.portal)!.portal!.kind,'beach');
 assert.deepEqual(level(20).goldTiles.map(t=>[t.column,t.row]),[[7,0],[6,1],[8,2],[6,3],[7,4]]);assert.equal(BATTLE_LEVELS.modern17.firstReward.plant,'dusklobber');assert.equal(BATTLE_LEVELS.modern20.firstReward.image,'dangerroom_modern');
});
test('Modern 16–20 preload authored cards, cross-world actors, effects and dialogue',()=>{
 for(let day=16;day<=20;day++){
  const c=BATTLE_LEVELS[`modern${day}`],l=level(day),catalogs=['battle','campaign',...c.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
  const plants:PlantKind[]=[...l.chooserPlants??[],...l.conveyor?.InitialPlantList.map(p=>p.PlantType)??[],...l.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[]),'peashooter','sunflower'];
  for(const name of battleActors(l,plants)){const s=actors[name],sk=read(s?`${s.group}/rigs/${s.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(s?sk.armature.some((a:{name:string})=>a.name===s.armature):sk.armature.length,name);}
  const effects=battleEffects(l,plants);for(const name of effects){const s=rigs[name];assert.ok(s,`${day}: ${name}`);assert.ok(read(`${s.group}/rigs/${s.rig}/skeleton.json`).armature.some((a:{name:string})=>a.name===s.armature),name);}
  const catalog=read('modern/catalog.json'),loaded=new Set([...effects,...Object.keys(read('battle/catalog.json').rigs)]);for(const key of [c.narrative,c.outro])if(key)for(const line of catalog.narratives[key]){assert.ok(loaded.has(line.Character),line.Character);if(line.Lines)for(const voice of catalog.sounds[line.Voice])assert.ok(readFileSync(new URL('../public/assets/'+voice,import.meta.url)).length);}
 }
});
for(let day=16;day<=20;day++)test(`Modern ${day} settles under controlled clear`,()=>{const g=create(day);let cannon=false;for(let i=0;i<40000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'swallow');cannon ||=g.conveyorPlants.some(p=>p.PlantType==='coconutcannon');}assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);assert.equal(g.modern.pending,false);if(day===16){assert.ok(cannon);assert.ok(g.conveyorPlants.some(p=>p.PlantType==='peashooter'));assert.ok(!g.conveyorPlants.some(p=>p.PlantType==='repeater'));}if(day===19)assert.ok(cannon);});
test('Dusk lobber shoots its lane, uses native direct and delayed splash damage',()=>{const g=quiet();g.addPlant('dusklobber',2,1);const a=g.spawnZombie('tutorial',2,cellX(5)),b=g.spawnZombie('tutorial',1,cellX(5));a.frozenUntil=b.frozenUntil=100;const hp=a.hp;tick(g,1.6);assert.equal(g.modern.dusk.splats.length,1);assert.equal(a.hp,hp-5);assert.equal(b.hp,hp);tick(g,.7);assert.equal(a.hp,hp-30);assert.equal(b.hp,hp-25);assert.ok(g.beach.sounds.includes('duskSplat/rainSounds'));});
test('Moonflower powers dusk lobber to target each adjacent lane',()=>{const g=quiet();g.addPlant('moonflower',2,0);g.addPlant('dusklobber',2,1);for(const row of [1,2,3])g.spawnZombie('tutorial',row,cellX(6)).frozenUntil=100;tick(g,1);assert.deepEqual(g.modern.dusk.shots.map(s=>s.row),[1,2,3]);assert.ok(g.modern.powered(g.plants[1]));});
test('Dusk lobber detects adjacent targets only while shadow-powered',()=>{const g=quiet();g.addPlant('dusklobber',2,1);g.spawnZombie('tutorial',1,cellX(6)).frozenUntil=100;tick(g,1);assert.equal(g.modern.dusk.shots.length,0);g.addPlant('moonflower',2,0);tick(g,.6);assert.equal(g.modern.dusk.shots.length,1);assert.equal(g.modern.dusk.shots[0].row,1);});
test('Dusk plant food selects four distinct cells and applies both timed splashes',()=>{const g=quiet();g.addPlant('dusklobber',2,1);g.food=1;assert.ok(g.plantFood(2,1));tick(g,.8);assert.equal(g.modern.dusk.shots.length,4);assert.equal(new Set(g.modern.dusk.shots.map(s=>`${s.row}:${s.toX}`)).size,4);const shot=g.modern.dusk.shots[0];g.modern.dusk.shots=[shot];const z=g.spawnZombie('tutorial_gargantuar',shot.row,shot.toX);z.frozenUntil=100;const hp=z.hp;tick(g,2.8);assert.equal(z.hp,hp);tick(g,.2);assert.equal(z.hp,hp-210);tick(g,.7);assert.equal(z.hp,hp-310);});
test('Dusk lobber can target tombstones',()=>{const g=quiet();g.addPlant('dusklobber',2,1);g.graves.push({id:90001,row:2,column:5,hp:1000,stage:0,kind:'gravestone'});tick(g,2.3);assert.equal(g.graves[0].hp,970);});
test('Modern 1–20 map rewards unlock dusk lobber and standard endless once',()=>{const map:WorldMap=read('shell/maps/modern.json'),data=new Map<string,string>(),storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}},p=new ProgressStore(storage);
 for(let day=1;day<=20;day++){const id=`modern${day}`,node=map.islands.find(n=>n.levels.includes(id))!;assert.equal(islandStates(map,p.completed(map),p.rewardNodes('modern')).get(node.node),'open');assert.equal(p.endlessUnlocked('modern'),false);p.finish('modern',id);for(const e of completionEvents(map,id,p.completed(map),p.rewardNodes('modern')))if(e.action==='reward')p.award('modern',map.islands.find(n=>n.node===e.node)!);p.finishPresentation();const before=JSON.stringify([p.rewards(),p.campaignRewards()]);p.finish('modern',id);assert.equal(JSON.stringify([p.rewards(),p.campaignRewards()]),before);}
 assert.ok(p.ownedPlants().has(150));assert.ok(availablePlants(BATTLE_LEVELS.modern18,p.ownedPlants()).includes('dusklobber'));assert.ok(read('shell/progression.json').plants[150].length);assert.ok(p.endlessUnlocked('modern'));assert.ok(availablePlants(ENDLESS_LEVELS.endless_modern,p.ownedPlants()).includes('dusklobber'));assert.ok(new ProgressStore(storage).endlessUnlocked('modern'));assert.equal(p.campaignRewards().filter(r=>r.id==='dangerroom_modern').length,1);assert.equal(p.campaignRewards().filter(r=>r.level==='modern16'&&r.id==='worldkey').length,1);assert.equal(p.pending(),null);assert.equal(p.startEndless('modern',1234).round,1);
});
test('Modern and reward exports retain pinned hashes',()=>{for(const name of ['modern','progression']){const p=JSON.parse(readFileSync(new URL(`../${name}-provenance.json`,import.meta.url),'utf8'));for(const [path,e] of Object.entries(p.outputs) as [string,{bytes:number;sha256:string}][]){const bytes=readFileSync(new URL('../public/assets/'+path,import.meta.url));assert.equal(bytes.length,e.bytes,path);assert.equal(createHash('sha256').update(bytes).digest('hex'),e.sha256,path);}}});
