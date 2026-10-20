import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BATTLE_LEVELS} from '../src/game/levels';
import {readLevel,type SourceLevel} from '../src/game/level';

const source=(id:string):SourceLevel=>JSON.parse(readFileSync(new URL('../public/assets/'+BATTLE_LEVELS[id].source,import.meta.url),'utf8'));

test('every migrated battle preserves native forced choices, fixed decks and conveyor plants',()=>{
 assert.equal(Object.keys(BATTLE_LEVELS).length,342);
 for(const config of Object.values(BATTLE_LEVELS)){
  const raw=source(config.id),level=readLevel(raw);
  const bank=raw.objects.find(o=>o.objclass==='SeedBankProperties')?.objdata;
  const plants=bank?.PresetPlantList as {PlantType:string}[]|undefined;
  assert.deepEqual(level.chooserPlants??[],bank?.SelectionMethod==='chooser'?(plants??[]).map(p=>p.PlantType):[],config.id);
  assert.deepEqual(level.preset,bank?.SelectionMethod==='preset'?plants!.map(p=>p.PlantType):null,config.id);
  const conveyor=raw.objects.find(o=>o.objclass==='ConveyorSeedBankProperties');
  assert.equal(config.mode==='conveyor',!!conveyor,config.id);
  if(conveyor){
   const aliases:Record<string,string>={tool_powertile_alpha:'powerplant_alpha',tool_powertile_beta:'powerplant_beta',tool_powertile_epsilon:'powerplant_epsilon'};
   const bowling=raw.objects.some(o=>o.objclass==='BowlingMinigameProperties');
   const expected=(conveyor.objdata.InitialPlantList as {PlantType:string;Weight:number}[]).filter(p=>!bowling||p.Weight>0).map(p=>({...p,PlantType:aliases[p.PlantType]??p.PlantType}));
   assert.deepEqual(level.conveyor?.InitialPlantList,expected,config.id);
  }
  if(config.mode==='seedbank')assert.equal(bank?.SelectionMethod,'chooser',config.id);
  if(config.mode==='preset')assert.equal(bank?.SelectionMethod,'preset',config.id);
 }
});

test('Frostbite Caves forced choices include the potato tutorial and the five-plant sixth day',()=>{
 assert.deepEqual(readLevel(source('iceage2')).chooserPlants,['hotpotato']);
 assert.deepEqual(readLevel(source('iceage6')).chooserPlants,['sunflower','pepperpult','hotpotato','tallnut','spikeweed']);
});

test('ordinary first days do not invent a world-specific default deck',()=>{
 for(const id of ['egypt1','pirate1','cowboy1','future1','iceage1','lostcity1','kongfu1'])assert.deepEqual(readLevel(source(id)).chooserPlants??[],[],id);
 assert.deepEqual(readLevel(source('dark1')).chooserPlants,['sunshroom']);
 assert.deepEqual(readLevel(source('beach1')).chooserPlants,['lilypad']);
});
