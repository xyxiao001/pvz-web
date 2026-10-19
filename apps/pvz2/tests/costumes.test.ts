import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {ProgressStore} from '../src/shell/progression';
import {availableCostumes,applyCostume,type CostumePlant} from '../src/shell/costumes';
import {islandStates} from '../src/shell/navigation';
import type {WorldMap} from '../src/shell/types';
const read=(path:string)=>JSON.parse(readFileSync(new URL('../public/assets/'+path,import.meta.url),'utf8'));
const plants:CostumePlant[]=read('shell/costumes.json');
function profile(){const data=new Map<string,string>();const storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}};return {storage,progress:new ProgressStore(storage)};}

test('gift grants one unowned costume for an owned plant and persists automatic equipment',()=>{
 const {storage,progress}=profile(),wallet=progress.shop().read();
 const first=progress.openGift('egypt',30,plants,()=>0)!;
 assert.equal(first.plant,'peashooter');assert.equal(first.costume,0);
 assert.deepEqual(progress.openGift('egypt',30,plants,()=>.9),first);
 const next=progress.openGift('egypt',33,plants,()=>0)!;assert.equal(next.costume,1);
 const restored=new ProgressStore(storage);assert.equal(restored.equippedCostumes().peashooter,1);
 assert.equal(restored.costumeRewards().length,2);assert.deepEqual(restored.shop().read(),wallet);
 assert.deepEqual([...restored.ownedPlants()],[0,1,2,3]);assert.equal(restored.ownedUpgrades().size,0);
});

test('exhausted costumes keep the gift unclaimed until a new plant is owned, without replacement currency',()=>{
 const {progress}=profile(),wallet=progress.shop().read();
 const count=availableCostumes(plants,progress.ownedPlants(),[]).length;
 for(let node=0;node<count;node++)assert.ok(progress.openGift('egypt',node,plants,()=>0));
 assert.equal(progress.openGift('egypt',1000,plants),null);assert.ok(!progress.rewardNodes('egypt').has(1000));
 assert.deepEqual(progress.shop().read(),wallet);
 const map:WorldMap=read('shell/maps/egypt.json');progress.award('egypt',map.islands.find(n=>n.kind===1&&n.plant===4)!);
 assert.equal(progress.openGift('egypt',1000,plants,()=>0)!.plant,'cabbagepult');
});

test('Egypt gift becomes reachable after day 7 and does not block day 8',()=>{
 const map:WorldMap=read('shell/maps/egypt.json'),gift=map.islands.find(n=>n.kind===2&&n.name==='7')!;
 assert.equal(islandStates(map,new Set(),new Set(),true).get(gift.node),'locked');
 const states=islandStates(map,new Set(['egypt7']));assert.equal(states.get(gift.node),'finished');
 assert.equal(states.get(map.islands.find(n=>n.kind===0&&n.levels.includes('egypt8'))!.node),'open');
});

test('every exported costume has native slots and only the chosen costume is visible',()=>{
 for(const plant of plants){
  const armature=read(plant.path+'/skeleton.json').armature.find((a:{name:string})=>a.name===plant.armature);
  for(let costume=0;costume<plant.count;costume++){
   const slots=armature.slot.map((s:{name:string})=>({name:s.name,displayIndex:0}));applyCostume(slots,costume);
   assert.ok(slots.some((s:{name:string;displayIndex:number})=>s.name.startsWith('COS')&&s.displayIndex===0),`${plant.kind} ${costume}`);
   assert.ok(slots.filter((s:{name:string})=>s.name.startsWith('COS')).every((s:{name:string;displayIndex:number})=>s.displayIndex===(new RegExp(`^COS${costume}(?:_|$)`).test(s.name)?0:-1)));
  }
 }
});
