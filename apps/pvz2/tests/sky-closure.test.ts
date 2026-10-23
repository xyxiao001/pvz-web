import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {create,level,read} from './sky-fixture';
import {BATTLE_LEVELS} from '../src/game/levels';
import {ProgressStore,completionEvents} from '../src/shell/progression';
import {islandStates,LEVEL_ROUTES} from '../src/shell/navigation';
import type {WorldMap} from '../src/shell/types';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import type {PlantKind} from '../src/game/level';

test('Sky 1–32 source modes, waves, all actors, effects and narrative voices are present',()=>{
 for(let day=1;day<=32;day++){
  const config=BATTLE_LEVELS[`sky${day}`],raw=read(config.source),l=level(day),bank=raw.objects.find((o:{objclass:string})=>o.objclass==='SeedBankProperties')?.objdata;
  assert.equal(LEVEL_ROUTES[config.id],config.id);assert.equal(l.waves.length,raw.objects.find((o:{objclass:string})=>o.objclass==='WaveManagerProperties').objdata.Waves.length,config.id);
  assert.deepEqual(l.preset,bank?.SelectionMethod==='preset'?bank.PresetPlantList.map((p:{PlantType:string})=>p.PlantType):null,config.id);
  assert.equal(config.mode==='conveyor',!!l.conveyor,config.id);assert.equal(config.mode==='airraid',!!l.airRaid,config.id);
  const catalogs=['battle','campaign',...config.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
  const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...(l.preset??[]),...(l.chooserPlants??[]),...(l.airRaid?.teams.flatMap(t=>t.members.map(m=>m.kind))??[]),...l.protectedPlants.map(p=>p.kind),...l.initialPlants.map(p=>p.kind),...(l.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...l.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
  for(const name of battleActors(l,plants)){const s=actors[name],sk=read(s?`${s.group}/rigs/${s.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(s?sk.armature.some((a:{name:string})=>a.name===s.armature):sk.armature.length,config.id+name);}
  const names=new Set([...Object.keys(read('battle/catalog.json').rigs),...battleEffects(l,plants)]);
  for(const name of battleEffects(l,plants)){assert.ok(rigs[name],name);const s=rigs[name];assert.ok(read(`${s.group}/rigs/${s.rig}/skeleton.json`).armature.some((a:{name:string})=>a.name===s.armature),name);}
  const catalog=read('sky/catalog.json');for(const key of [config.narrative,config.outro].filter(Boolean))for(const line of catalog.narratives[key!]){assert.ok(names.has(line.Character),config.id+line.Character);if(line.Lines)for(const voice of catalog.sounds[line.Voice])assert.ok(readFileSync(new URL('../public/assets/'+voice,import.meta.url)).length);}
 }
 assert.equal(Object.keys(BATTLE_LEVELS).length,458);assert.equal(Object.values(BATTLE_LEVELS).filter(l=>l.world==='sky').length,32);
});
test('Sky 1–32 settle under controlled clear with explicit challenge fixture conditions',()=>{
 for(let day=1;day<=32;day++){const g=create(day);if(g.preparing)g.startLastStand();if(g.level.airRaid)g.sky.airRaid.choose(0);if(day===24)g.sunProduced=7750;if(day===30)for(const p of g.plants)p.hp=100000;
  for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
  assert.equal(g.phase,'won',`sky${day}`);if(day===32)assert.ok(g.boss!.defeated);else assert.equal(g.wave,g.level.waves.length,`sky${day}`);
 }
});
test('Sky 1–32 unlock sequentially, award all plants and upgrades once, and finish return presentation',()=>{
 const map:WorldMap=read('shell/maps/sky.json'),data=new Map<string,string>(),p=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 for(let day=1;day<=32;day++){const id=`sky${day}`,node=map.islands.find(n=>n.levels.includes(id))!;assert.equal(islandStates(map,p.completed(map),p.rewardNodes('sky')).get(node.node),'open',id);p.finish('sky',id);const events=completionEvents(map,id,p.completed(map),p.rewardNodes('sky'));for(const e of events)if(e.action==='reward')p.award('sky',map.islands.find(n=>n.node===e.node)!);p.finishPresentation();const before=JSON.stringify([p.rewards(),p.campaignRewards()]);p.finish('sky',id);for(const e of events)if(e.action==='reward')p.award('sky',map.islands.find(n=>n.node===e.node)!);assert.equal(JSON.stringify([p.rewards(),p.campaignRewards()]),before,id);assert.equal(p.pending(),null);}
 assert.equal(p.completed(map).size,32);assert.deepEqual(p.rewards().map(r=>r.id),[108,13,200,147,201,202,203,204]);assert.deepEqual(p.campaignRewards().map(r=>[r.level,r.id]),[['sky16','worldkey'],['sky20','dangerroom_sky']]);
 const art=read('shell/progression.json');for(const node of map.islands.filter(n=>n.kind===1))for(const draw of art.plants[node.plant])if(draw.kind==='rig'){const a=read(`shell/rigs/${draw.rig}/skeleton.json`).armature.find((a:{name:string})=>a.name===draw.armature);assert.ok(a);assert.ok(a.animation.some((a:{name:string})=>a.name===draw.animation));}
});
test('all Sky and progression provenance outputs match exact sizes and SHA256',()=>{
 for(const name of ['sky','progression']){const p=JSON.parse(readFileSync(new URL(`../${name}-provenance.json`,import.meta.url),'utf8'));assert.equal(p.commit,'0e4a05348b6de328e2902a57afa24a3a454a4205');for(const [path,expected] of Object.entries(p.outputs) as [string,{bytes:number;sha256:string}][]){const bytes=readFileSync(new URL('../public/assets/'+path,import.meta.url));assert.equal(bytes.length,expected.bytes,path);assert.equal(createHash('sha256').update(bytes).digest('hex'),expected.sha256,path);}}
});
