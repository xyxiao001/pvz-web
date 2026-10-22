import test from 'node:test';
import assert from 'node:assert/strict';
import {read} from './dino-fixture';
import {BATTLE_LEVELS} from '../src/game/levels';
import {ProgressStore,completionEvents} from '../src/shell/progression';
import {islandStates,LEVEL_ROUTES} from '../src/shell/navigation';
import type {WorldMap} from '../src/shell/types';
import {readLevel} from '../src/game/level';
import {battleEffects} from '../src/rendering/resource-plan';
import {seedCardAnimation} from '../src/rendering/presentation';

test('Dino 1–42 follow the map, award all five plants and eleven campaign rewards once',()=>{
 const map:WorldMap=read('shell/maps/dino.json'),data=new Map<string,string>();
 const p=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 for(let day=1;day<=42;day++){
  const id=`dino${day}`,node=map.islands.find(n=>n.levels.includes(id))!;
  assert.equal(LEVEL_ROUTES[id],id);assert.ok(BATTLE_LEVELS[id]);
  assert.equal(islandStates(map,p.completed(map),p.rewardNodes('dino')).get(node.node),'open',id);
  p.finish('dino',id);const events=completionEvents(map,id,p.completed(map),p.rewardNodes('dino'));
  for(const e of events)if(e.action==='reward')p.award('dino',map.islands.find(n=>n.node===e.node)!);
  p.finishPresentation();
  const rewards=JSON.stringify([p.rewards(),p.campaignRewards()]);p.finish('dino',id);
  for(const e of events)if(e.action==='reward')p.award('dino',map.islands.find(n=>n.node===e.node)!);
  assert.equal(JSON.stringify([p.rewards(),p.campaignRewards()]),rewards,id);assert.equal(p.pending(),null);
 }
 assert.equal(p.completed(map).size,42);
 assert.deepEqual(p.rewards().map(r=>r.id),[18,41,160,146,54]);
 assert.deepEqual(p.campaignRewards().map(r=>[r.level,r.id]),[['dino12','spine_dino'],['dino14','spine_dino'],['dino16','worldkey'],['dino20','dangerroom_dino'],['dino24','spine_dino'],['dino29','spine_dino'],['dino32','worldtrophy_dino'],['dino33','spine_dino'],['dino36','dangerroom_dino2'],['dino37','spine_dino'],['dino41','spine_dino']]);
 assert.equal(Object.values(BATTLE_LEVELS).filter(l=>l.world==='dino').length,42);
});
test('all five map reward plants have native display rigs and animations',()=>{
 const map:WorldMap=read('shell/maps/dino.json'),art=read('shell/progression.json');
 for(const node of map.islands.filter(n=>n.kind===1)){
  const draws=art.plants[node.plant];assert.ok(draws?.length,`plant ${node.plant}`);
  for(const draw of draws)if(draw.kind==='rig'){
   const skeleton=read(`shell/rigs/${draw.rig}/skeleton.json`),arm=skeleton.armature.find((a:{name:string})=>a.name===draw.armature);
   assert.ok(arm,draw.armature);assert.ok(arm.animation.some((a:{name:string})=>a.name===draw.animation),`${node.plant}: ${draw.animation}`);
  }
 }
});
test('the finale plant cards use the exact seed packet animations',()=>{
 const cards=read('battle/catalog.json').rigs.cards;
 const arm=read(`${cards.group}/rigs/${cards.rig}/skeleton.json`).armature.find((a:{name:string})=>a.name==='plants');
 for(const kind of ['primalpeashooter','primalwallnut','perfumeshroom','primalsunflower','primalpotatomine','explodeonut','endurian','guacodile','parsnip'] as const)assert.ok(arm.animation.some((a:{name:string})=>a.name===seedCardAnimation(kind)),kind);
});

test('Dino 1–42 source seed modes and narrative actors are complete',()=>{
 for(const config of Object.values(BATTLE_LEVELS).filter(c=>c.world==='dino')){
  const raw=read(config.source),level=readLevel(raw),bank=raw.objects.find((o:{objclass:string})=>o.objclass==='SeedBankProperties')?.objdata;
  assert.deepEqual(level.chooserPlants??[],bank?.SelectionMethod==='chooser'?(bank.PresetPlantList??[]).map((p:{PlantType:string})=>p.PlantType):[],config.id);
  assert.deepEqual(level.preset,bank?.SelectionMethod==='preset'?bank.PresetPlantList.map((p:{PlantType:string})=>p.PlantType):null,config.id);
  const conveyor=raw.objects.find((o:{objclass:string})=>o.objclass==='ConveyorSeedBankProperties');assert.equal(config.mode==='conveyor',!!conveyor,config.id);
  if(conveyor)assert.deepEqual(level.conveyor?.InitialPlantList,conveyor.objdata.InitialPlantList,config.id);
  const catalog=read('dino/catalog.json'),names=new Set([...Object.keys(read('battle/catalog.json').rigs),...battleEffects(level,config.plants.map(p=>p.kind))]);
  for(const key of [config.narrative,config.outro].filter(Boolean))for(const line of catalog.narratives[key!])assert.ok(names.has(line.Character),config.id+': '+line.Character);
 }
});
