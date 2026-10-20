import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {create,level,tick} from './lostcity-fixture';
import {BOARD,cellX,type PlantKind} from '../src/game/level';
import {BATTLE_LEVELS} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {ProgressStore} from '../src/shell/progression';
import {LostCityBoss} from '../src/game/lostcity-boss';
const days=[29,30,31,32,33];
const read=(path:string)=>JSON.parse(readFileSync(new URL('../public/assets/'+path,import.meta.url),'utf8'));
test('Lost City 29–33 native configuration, narratives and rewards',()=>{
 assert.deepEqual(days.map(d=>level(d).waves.length),[12,10,10,0,12]);assert.deepEqual(days.map(d=>level(d).goldTiles.length),[5,13,10,0,8]);
 assert.equal(level(30).mold.length,15);assert.equal(level(32).trapTiles.length,8);assert.equal(level(32).boss!.reserved,3);
 assert.deepEqual(level(31).preset,['sunshroom','stallia','akee','endurian','magnifyinggrass','toadstool']);
 assert.deepEqual(level(32).conveyor!.InitialPlantList.map(p=>p.PlantType),['akee','bonkchoy','endurian','redstinger','stallia']);
 const catalog=read('lostcity/catalog.json');for(const key of ['LOSTCITY_INTRO_ZOMBOSS','LOSTCITY_OUTRO_ZOMBOSS','LOSTCITY_33_INTRO'])assert.ok(catalog.narratives[key].length);
 const data=new Map<string,string>(),p=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 for(const d of [30,32,33]){p.finish('lostcity','lostcity'+d);p.finish('lostcity','lostcity'+d);}assert.deepEqual(p.campaignRewards().map(r=>r.id),['spine_lostcity','worldtrophy_lostcity','spine_lostcity']);
});
for(const day of days)test(`Lost City ${day} controlled-damage settlement smoke`,()=>{
 const g=create(day);for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);
});
test('Lost City 30 mold blocks the first three columns',()=>{const g=create(30);assert.equal(g.plant('sunflower',2,0),false);assert.equal(g.plant('sunflower',2,3),true);});
test('Airship summons, parachutes and triggers flame tiles through sandbags',()=>{
 const g=create(32),boss=g.boss as LostCityBoss,actions=new Set<string>();let parachute=false,flame=false;
 for(let i=0;i<6000&&g.phase==='playing';i++){g.tick(1/60);actions.add(boss.animation);parachute ||= g.zombies.some(z=>z.entry==='parachute');flame ||=g.lostcity.flames.length>0;for(const z of g.zombies)if(z!==boss.zombie)g.damage(z,100000,'water');}
 assert.ok(actions.has('SummonLoop'));assert.ok(actions.has('Drop'));assert.ok(actions.has('Shoot'));assert.ok(parachute);assert.ok(flame);assert.equal(boss.zombie.hp,26000);
});
test('Airship passes through all three stages and finishes its death animation',()=>{
 const g=create(32),boss=g.boss!;tick(g,4);assert.equal(boss.zombie.hp,26000);
 g.damage(boss.zombie,6000);assert.equal(boss.stage,1);tick(g,5);g.damage(boss.zombie,10000);assert.equal(boss.stage,2);tick(g,5);g.damage(boss.zombie,10000);assert.equal(boss.zombie.hp,0);assert.equal(g.phase,'playing');tick(g,20);assert.equal(g.phase,'won');assert.ok(boss.defeated);
});
for(const day of days)test(`Lost City ${day} required resource smoke`,()=>{
 const config=BATTLE_LEVELS[`lostcity${day}`],l=level(day),catalogs=['campaign',...config.bundles!].map(b=>read(b+'/catalog.json'));
 const actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...(l.preset??[])])];
 for(const name of battleActors(l,plants)){const spec=actors[name],sk=read(spec?`${spec.group}/rigs/${spec.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(sk.armature.length,name);}
 for(const name of battleEffects(l,plants))assert.ok(rigs[name],name);
});
