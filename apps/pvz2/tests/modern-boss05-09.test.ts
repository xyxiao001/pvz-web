import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {create,level,read,tick} from './modern-fixture';
import {BATTLE_LEVELS} from '../src/game/levels';
import {DarkBoss} from '../src/game/dark-boss';
import {BeachBoss} from '../src/game/beach-boss';
import {IceageBoss} from '../src/game/iceage-boss';
import {LostCityBoss} from '../src/game/lostcity-boss';
import {EightiesBoss} from '../src/game/eighties-boss';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {ProgressStore} from '../src/shell/progression';
import {islandStates,levelRoute} from '../src/shell/navigation';
import type {WorldMap} from '../src/shell/types';
const worlds=['dark','beach','iceage','lostcity','eighties'];
const ids=worlds.map((w,i)=>`modern_zomboss_0${i+5}_${w}`);
const store=()=>{const data=new Map<string,string>();return new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});};
test('Modern boss 05–09 retain native stages, conveyors, board modules and map ownership',()=>{
 assert.equal(Object.keys(BATTLE_LEVELS).length,509);
 const classes=[DarkBoss,BeachBoss,IceageBoss,LostCityBoss,EightiesBoss],hp=[39000,25000,13000,26000,24000];
 ids.forEach((id,i)=>{const c=BATTLE_LEVELS[id],g=create(id);assert.equal(c.world,'modern');assert.equal(c.day,i<2?33:34);assert.equal(g.level.world,worlds[i]);assert.ok(g.boss instanceof classes[i]);assert.equal(g.boss!.zombie.hp,hp[i]);assert.equal(g.level.sunDrops,false);assert.equal(g.level.conveyor!.InitialPlantList.length,[3,6,6,4,4][i]);assert.equal(c.night,i===0||i===4);assert.equal(g.level.mowers,i!==3);});
 assert.equal(create(ids[0]).graves.length,10);assert.deepEqual(create(ids[1]).plants.filter(p=>p.kind==='lilypad').map(p=>[p.row,p.column]),[[0,2],[2,2],[4,2]]);assert.equal(level(ids[3]).trapTiles.length,8);assert.equal((create(ids[2]).boss as IceageBoss).shield,1750);
});
test('Modern boss resources include conveyor actors, stage effects, voices and the native Modern trophy',()=>{
 for(const id of ids){const c=BATTLE_LEVELS[id],l=level(id),catalogs=['battle','campaign',...c.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs)),narratives=Object.assign({},...catalogs.map(c=>c.narratives)),sounds=Object.assign({},...catalogs.map(c=>c.sounds));
 if(l.boss!.kind==='zombossmech_eighties')actors.boss=actors.eightiesBoss;
 const plants=l.conveyor!.InitialPlantList.map(p=>p.PlantType);
 for(const name of battleActors(l,plants)){const s=actors[name],sk=read(s?`${s.group}/rigs/${s.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(sk.armature.length,`${id}: ${name}`);}
 for(const name of battleEffects(l,plants)){assert.ok(rigs[name],`${id}: ${name}`);}
 assert.equal(actors.boss.group,id.endsWith('eighties')?'eighties':id.split('_').at(-1));
 for(const key of [c.narrative!,c.outro!])for(const line of narratives[key]){if(line.Lines)for(const voice of sounds[line.Voice])assert.ok(readFileSync(new URL('../public/assets/'+voice,import.meta.url)).length);}
 }
 const catalog=read('battle/catalog.json'),sk=read('battle/rigs/'+catalog.rigs.reward.rig+'/skeleton.json');assert.ok(sk.armature.find((a:{name:string})=>a.name==='Zomboss').animation.some((a:{name:string})=>a.name==='modern'));
});
for(const id of ids)test(`${id} runs native actions and settles every boss phase under controlled damage`,()=>{
 const g=create(id),boss=g.boss!,seen=new Set<string>();let summoned=false;
 for(let i=0;i<5400&&g.phase==='playing';i++){g.tick(1/60);seen.add(boss.animation);summoned ||=g.zombies.some(z=>z!==boss.zombie);for(const z of g.zombies)if(z!==boss.zombie)g.damage(z,100000,'swallow');}
 assert.equal(g.phase,'playing');assert.ok(boss instanceof EightiesBoss?summoned:seen.size>=3,`${id}: ${[...seen]}`);
 for(let i=0;i<9000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'swallow');}
 assert.equal(boss.stage,boss.stages.length-1);assert.equal(boss.defeated,true);assert.equal(g.phase,'won');
});
test('Modern beach forced-boost conveyor lily expands without consuming stored food',()=>{
 const g=create(ids[1]);assert.equal(g.level.conveyor!.InitialPlantList.find(p=>p.PlantType==='lilypad')!.ForceBoosted,true);g.conveyor=[{id:900,kind:'lilypad',lane:0,position:5,forceBoosted:true}];const food=g.food;assert.ok(g.plant('lilypad',1,3,900));tick(g,3);assert.equal(g.food,food);assert.ok(g.plants.filter(p=>p.kind==='lilypad').length>4);
});
test('Modern ice shield and glacier blocks retain the variant data',()=>{
 const g=create(ids[2]),boss=g.boss as IceageBoss;tick(g,8);boss.hit(1750);assert.equal(boss.shield,0);assert.equal(boss.zombie.hp,13000);boss.block(0,4);assert.ok(g.iceage.blocks.some(b=>b.row===0&&b.column===4&&b.release?.includes('iceage_hunter')));
});
test('Modern airship sandbags trigger native flame tiles and its parachutes spawn',()=>{
 const g=create(ids[3]),boss=g.boss as LostCityBoss;let parachute=false,flame=false;
 for(let i=0;i<6000&&g.phase==='playing';i++){g.tick(1/60);parachute ||= g.zombies.some(z=>z.entry==='parachute');flame ||=g.lostcity.flames.length>0;for(const z of g.zombies)if(z!==boss.zombie)g.damage(z,100000,'swallow');}
 assert.ok(parachute);assert.ok(flame);assert.equal(boss.zombie.hp,26000);
});
test('Modern music boss switches through all five native genres',()=>{
 const g=create(ids[4]),boss=g.boss as EightiesBoss;tick(g,8);
 for(const [i,jam] of ['jam_punk','jam_pop','jam_rap','jam_8bit','jam_metal'].entries()){assert.equal(boss.stage,i);assert.equal(g.eighties.jam,jam);boss.hit(100000);tick(g,4);}
});
test('Modern map nodes 33 and 34 select available variants and award one shared trophy',()=>{
 const map:WorldMap=read('shell/maps/modern.json'),node=map.islands.find(n=>n.levels.includes(ids[0]))!,last=map.islands.find(n=>n.levels.includes(ids[2]))!,p=store();assert.deepEqual([0,.4,.9].map(r=>levelRoute(node,()=>r)),['modern_zomboss_04_future',...ids.slice(0,2)]);assert.deepEqual([0,.3,.6,.9].map(r=>levelRoute(last,()=>r)),[...ids.slice(2),'modern_zomboss_10_dino']);p.finish('modern',ids[1]);p.finishPresentation();assert.equal(islandStates(map,p.completed(map)).get(last.node),'open');p.finish('modern',ids[3]);p.finishPresentation();for(const id of ids.slice(2)){assert.ok(p.isComplete(id));p.finish('modern',id);}assert.deepEqual(p.campaignRewards(),[{level:ids[3],type:'worldtrophy',id:'worldtrophy_modern',count:1}]);assert.equal(p.pending(),null);
});
test('Modern boss outputs and fonts retain their pinned hashes',()=>{
 for(const name of ['modern','shell','outer']){const p=JSON.parse(readFileSync(new URL(`../${name}-provenance.json`,import.meta.url),'utf8'));assert.equal(p.commit,'0e4a05348b6de328e2902a57afa24a3a454a4205');for(const [path,e] of Object.entries(p.outputs) as [string,{bytes:number;sha256:string}][]){if(name!=='modern'&&!path.endsWith('.woff2'))continue;const bytes=readFileSync(new URL('../public/assets/'+path,import.meta.url));assert.equal(bytes.length,e.bytes,path);assert.equal(createHash('sha256').update(bytes).digest('hex'),e.sha256,path);}}
});
