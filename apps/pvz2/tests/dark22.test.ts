import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {create} from './dark-fixture';
import {playDark22} from './dark22-strategy';
import {readLevel,type SourceLevel,type PlantKind} from '../src/game/level';
import {DARK_LEVELS} from '../src/game/worlds/dark';
const source=():SourceLevel=>JSON.parse(readFileSync(new URL('../public/assets/dark/dark22.source.json',import.meta.url),'utf8'));

test('Dark 22 skips only its absent BeatTheLevel challenge',()=>{
 const original=source();assert.equal(readLevel(original).maxPlantsLost,5);
 for(const change of ['day','world','reference','other challenge']){
  const s=source(),definition=s.objects.find(o=>o.objclass==='LevelDefinition')!.objdata;
  const challenges=s.objects.find(o=>o.objclass==='StarChallengeModuleProperties')!.objdata.Challenges as string[][];
  if(change==='day')definition.LevelNumber=23;
  if(change==='world')definition.StageModule='RTID(EgyptStage@LevelModules)';
  if(change==='reference')challenges[0][0]='RTID(BeatTheLevel@LevelModules)';
  if(change==='other challenge')challenges[0].push('RTID(Missing@CurrentLevel)');
  assert.throws(()=>readLevel(s),TypeError,change);
 }
 const restored=source();restored.objects.push({aliases:['BeatTheLevel'],objclass:'StarChallengeSunProducedProps',objdata:{TargetSun:123}});
 assert.equal(readLevel(restored).targetSun,123);
});

test('Dark 22 still loses on the sixth lost plant',()=>{
 const g=create(22);g['nextWave']=Infinity;g.graves=[];
 for(let n=0;n<6;n++){g.addPlant('sunshroom',0,0);g.plants.at(-1)!.hp=0;g.tick(1/60);g.tick(1/60);assert.equal(g.phase,n<5?'playing':'lost');}
 assert.equal(g.lossReason,'plantsLost');assert.equal(g.plantsLost,6);
});

test('Dark 22 garden-assisted six-card replay with Wall-nut First Aid',()=>{
 const g=create(22,1234);g.wallnutFirstAid=true;
 for(const kind of ['sunshroom','cabbagepult','wallnut','laser_bean','magnetshroom'] as const)g.boosts.add(kind);
 const used=new Set<PlantKind>(),plant=g.plant.bind(g);
 g.plant=(kind,r,c,p)=>{const ok=plant(kind,r,c,p);if(ok)used.add(kind);return ok;};
 for(let f=0;f<90000&&g.phase==='playing';f++){playDark22(g,f);g.tick(1/60);g.events.length=0;}
 console.log('dark22',g.phase,g.time,g.wave,g.plantsLost);
 assert.equal(g.phase,'won');assert.equal(g.wave,15);assert.ok(g.plantsLost<=5);assert.ok(used.size<=6);
 for(const kind of used)assert.ok(DARK_LEVELS.dark22.plants.some(p=>p.kind===kind));
});
