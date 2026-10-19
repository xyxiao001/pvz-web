import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {create,level,tick} from './lostcity-fixture';
import {cellX,type PlantKind} from '../src/game/level';
import {BATTLE_LEVELS} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {ProgressStore} from '../src/shell/progression';
const days=[14,15,16,17,18];
const read=(path:string)=>JSON.parse(readFileSync(new URL('../public/assets/'+path,import.meta.url),'utf8'));
test('Lost City 14–18 retain native modes, challenges, narratives and rewards',()=>{
 assert.deepEqual(days.map(d=>level(d).waves.length),[12,12,12,12,10]);
 assert.deepEqual(days.map(d=>level(d).goldTiles.length),[5,5,0,6,0]);
 assert.deepEqual(level(14).preset,['sunflower','lavaguava','akee']);
 assert.deepEqual(level(15).protectedPlants,[{kind:'akee',row:0,column:2},{kind:'akee',row:4,column:3}]);assert.equal(level(15).mustProtect,2);
 assert.equal(level(16).mowers,false);assert.equal(level(18).flagInterval,5);assert.deepEqual(level(18).initialPlants,[{kind:'stallia',row:2,column:6}]);
 const catalog=read('lostcity/catalog.json');assert.ok(catalog.ui['note-lostcity']);
 for(const day of [16,17])assert.ok(catalog.narratives[BATTLE_LEVELS[`lostcity${day}`].narrative!].length);
 const data=new Map<string,string>(),p=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 for(const day of [14,15,16,17]){p.finish('lostcity','lostcity'+day);p.finish('lostcity','lostcity'+day);}
 assert.deepEqual(p.campaignRewards().map(r=>r.id),['spine_lostcity','note_lostcity','worldkey','spine_lostcity']);
});
for(const day of days)test(`Lost City ${day} controlled-damage settlement smoke`,()=>{
 const g=create(day);for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);
});
test('Lost City 15 fails when either protected AKEE dies',()=>{const g=create(15);g.plants.find(p=>p.endangered)!.hp=0;tick(g,.1);assert.equal(g.phase,'lost');assert.equal(g.lossReason,'protected');});
test('Porter pitches a 700-HP tent on gold; tent summons and stops after destruction',()=>{
 const g=create(17),tile=g.level.goldTiles[0],z=g.spawnZombie('lostcity_impporter',tile.row,cellX(tile.column));
 tick(g,1.6);assert.ok(!g.zombies.includes(z));const tent=g.graves.find(t=>t.kind==='tent')!;assert.equal(tent.hp,700);
 tick(g,12.1);assert.equal(g.zombies.filter(z=>z.tentSpawnAt!==undefined).length,1);
 tent.hp=0;tick(g,12.1);assert.equal(g.zombies.filter(z=>z.tentSpawnAt!==undefined).length,1);assert.equal(g.lostcity.tents.size,0);
});
test('Ordinary porter death leaves a 500-HP backpack; AKEE damages it',()=>{
 const g=create(17),z=g.spawnZombie('lostcity_impporter',1,cellX(4));g.damage(z,400);tick(g,1.2);
 const bag=g.graves.find(t=>t.kind==='backpack')!;assert.equal(bag.hp,500);g.addPlant('akee',1,0);tick(g,4);assert.ok(bag.hp<500);
 g.sun=1000;assert.equal(g.plant('gravebuster',1,4),false);
 bag.hp=0;tick(g,.1);assert.ok(!g.graves.includes(bag));
});
for(const day of days)test(`Lost City ${day} required resource smoke`,()=>{
 const config=BATTLE_LEVELS[`lostcity${day}`],l=level(day),catalogs=['campaign',...config.bundles!].map(b=>read(b+'/catalog.json'));
 const actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...(l.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...l.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 for(const name of battleActors(l,plants)){const spec=actors[name],sk=read(spec?`${spec.group}/rigs/${spec.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(sk.armature.length,name);}
 for(const name of battleEffects(l,plants))assert.ok(rigs[name],name);
 if(day===16)assert.ok(battleEffects(l,plants).includes('zombossicon'));
 if(day>=17){assert.ok(battleActors(l,plants).includes('lostcity'));assert.ok(battleEffects(l,plants).includes('lostTent'));}
});
