import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {read} from './eighties-fixture';
import {BATTLE_LEVELS} from '../src/game/levels';
import {ProgressStore,completionEvents} from '../src/shell/progression';
import {islandStates,LEVEL_ROUTES} from '../src/shell/navigation';
import type {WorldMap} from '../src/shell/types';
import {seedCardAnimation} from '../src/rendering/presentation';

test('Eighties 1–42 follow the map, award all six plants and eight campaign rewards once',()=>{
 const map:WorldMap=read('shell/maps/eighties.json'),data=new Map<string,string>();
 const p=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 for(let day=1;day<=42;day++){
  const id=`eighties${day}`,node=map.islands.find(n=>n.levels.includes(id))!;
  assert.equal(LEVEL_ROUTES[id],id);assert.ok(BATTLE_LEVELS[id]);
  assert.equal(islandStates(map,p.completed(map),p.rewardNodes('eighties')).get(node.node),'open',id);
  p.finish('eighties',id);const events=completionEvents(map,id,p.completed(map),p.rewardNodes('eighties'));
  for(const e of events)if(e.action==='reward')p.award('eighties',map.islands.find(n=>n.node===e.node)!);
  p.finishPresentation();
  const rewards=JSON.stringify([p.rewards(),p.campaignRewards()]);p.finish('eighties',id);
  for(const e of events)if(e.action==='reward')p.award('eighties',map.islands.find(n=>n.node===e.node)!);
  assert.equal(JSON.stringify([p.rewards(),p.campaignRewards()]),rewards,id);assert.equal(p.pending(),null);
 }
 assert.equal(p.completed(map).size,42);
 assert.deepEqual(p.rewards().map(r=>r.id),[137,70,139,142,144,145]);
 assert.deepEqual(p.campaignRewards().map(r=>[r.level,r.id]),[['eighties12','spine_eighties'],['eighties14','spine_eighties'],['eighties16','worldkey'],['eighties20','dangerroom_eighties'],['eighties24','spine_eighties'],['eighties29','spine_eighties'],['eighties32','worldtrophy_eighties'],['eighties38','dangerroom_eighties2']]);
 assert.equal(Object.values(BATTLE_LEVELS).filter(l=>l.world==='eighties').length,42);
});
test('Eighties exported assets match the pinned provenance hashes',()=>{
 const provenance=JSON.parse(readFileSync(new URL('../eighties-provenance.json',import.meta.url),'utf8'));
 assert.equal(provenance.commit,'0e4a05348b6de328e2902a57afa24a3a454a4205');
 for(const [path,record] of Object.entries(provenance.outputs) as [string,{bytes:number;sha256:string}][]){
  const bytes=readFileSync(new URL('../public/assets/'+path,import.meta.url));
  assert.equal(bytes.length,record.bytes,path);assert.equal(createHash('sha256').update(bytes).digest('hex'),record.sha256,path);
 }
});
test('all six map reward plants have native display rigs and animations',()=>{
 const map:WorldMap=read('shell/maps/eighties.json'),art=read('shell/progression.json');
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
 for(const kind of ['gumnut','strawburst','hollyknight','loquat'] as const)assert.ok(arm.animation.some((a:{name:string})=>a.name===seedCardAnimation(kind)),kind);
 assert.equal(seedCardAnimation('hollyknight'),'hollybarrier');
});
