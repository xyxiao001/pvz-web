import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {playAudio} from '../src/audio';
import {errorDetails} from '../src/errors';
import {rewardPlantArt} from '../src/shell/reward-art';
import {ProgressStore,completionEvents} from '../src/shell/progression';
import {isWorldMigrated} from '../src/shell/navigation';
import type {Catalog,ProgressionArt,WorldMap} from '../src/shell/types';
const read=<T>(path:string):T=>JSON.parse(readFileSync(new URL('../public/assets/'+path,import.meta.url),'utf8'));
const art=read<ProgressionArt>('shell/progression.json'),catalog=read<Catalog>('shell/catalog.json');
test('All reward plants in the migrated worlds have native map art',()=>{
 for(const {id:world} of catalog.worlds.filter(w=>isWorldMigrated(w.id)))for(const island of read<WorldMap>(`shell/maps/${world}.json`).islands.filter(i=>i.kind===1))assert.ok(art.plants[island.plant]?.length,`${world}: ${island.plant}`);
});
test('Pirate first clear and saved reward can both render the kernel-pult',()=>{
 const map=read<WorldMap>('shell/maps/pirate.json'),data=new Map<string,string>();
 const storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}};
 const progress=new ProgressStore(storage);progress.finish('pirate','pirate1');
 const event=completionEvents(map,'pirate1',progress.completed(map),progress.rewardNodes('pirate')).find(e=>e.action==='reward')!,island=map.islands.find(i=>i.node===event.node)!;
 assert.equal(island.plant,30);assert.ok(rewardPlantArt(island,art,catalog,()=>assert.fail()).length);
 progress.award('pirate',island);progress.finishPresentation();const restored=new ProgressStore(storage);
 assert.ok(restored.rewardNodes('pirate').has(island.node));assert.ok(rewardPlantArt(island,art,catalog,()=>assert.fail()).length);assert.equal(restored.pending(),null);
});
test('Missing reward presentation reports its plant and retains the native card',()=>{
 const island=read<WorldMap>('shell/maps/pirate.json').islands.find(i=>i.kind===1&&i.plant===30)!,errors:Error[]=[];
 const draws=rewardPlantArt(island,{...art,plants:{}},catalog,e=>errors.push(e));
 assert.equal(errors.length,1);assert.match(errors[0].message,/plant=30/);assert.ok(draws.some(d=>d.animation===catalog.plantCards[30].animation));
});
test('Kongfu first clear and restored rewards render native plants without reporting missing art',()=>{
 const map=read<WorldMap>('shell/maps/kongfu.json'),data=new Map<string,string>();
 const storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}};
 const progress=new ProgressStore(storage);progress.finish('kongfu','kongfu1');
 const event=completionEvents(map,'kongfu1',progress.completed(map),progress.rewardNodes('kongfu')).find(e=>e.action==='reward')!,island=map.islands.find(i=>i.node===event.node)!;
 assert.equal(island.node,27);assert.equal(island.plant,156);
 const draws=rewardPlantArt(island,art,catalog,()=>assert.fail('missing Kongfu reward art'));
 assert.ok(draws.some(d=>d.kind==='rig'&&d.armature==='FireGourd'));
 progress.award('kongfu',island);progress.finishPresentation();const restored=new ProgressStore(storage);
 assert.ok(restored.rewardNodes('kongfu').has(27));assert.deepEqual(rewardPlantArt(island,art,catalog,()=>assert.fail()),draws);
 for(const reward of map.islands.filter(i=>i.kind===1))assert.ok(rewardPlantArt(reward,art,catalog,()=>assert.fail(`missing plant ${reward.plant}`)).some(d=>d.kind==='rig'));
});
test('Interrupted audio settles without reporting; other failures are reported without blocking',async()=>{
 const reports:unknown[]=[];
 for(const name of ['AbortError','NotAllowedError','NotSupportedError'])await playAudio({play:()=>Promise.reject(new DOMException(name,name)),currentSrc:'clip.mp3'} as HTMLMediaElement,e=>{reports.push(e);});
 assert.deepEqual(reports.map(e=>(e as Error).name),['NotAllowedError','NotSupportedError']);
 let played=false;await playAudio({play:async()=>{played=true;}} as HTMLMediaElement,()=>assert.fail());assert.ok(played);
});
test('Copied error text retains context, message and stack',()=>{
 const e=new TypeError('missing map');const text=errorDetails(e,'打开海盗地图');assert.ok(text.includes('打开海盗地图'));assert.ok(text.includes(e.stack!));
});
test('Safari stacks without an error header still retain the actual error name and reason',()=>{
 const e=new TypeError('null is not an object (evaluating resource.width)');
 e.stack='resourceWidth@https://example.test/PixiFactory.js:5:5883';
 const text=errorDetails(e,'游戏运行错误');
 assert.ok(text.includes('TypeError: null is not an object (evaluating resource.width)'));
 assert.ok(text.includes(e.stack));
});
