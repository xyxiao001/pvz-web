import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,read,tick} from './dino-fixture';
import {type PlantKind} from '../src/game/level';
import {BATTLE_LEVELS} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {LEVEL_ROUTES} from '../src/shell/navigation';
for(const day of [26,27,28,29,30])test(`Dino ${day}: controlled settlement and referenced resources`,()=>{
 const g=create(day);if(day===27)g.startLastStand();
 for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);assert.equal(LEVEL_ROUTES[`dino${day}`],`dino${day}`);
 const config=BATTLE_LEVELS[`dino${day}`],l=level(day),catalogs=['battle','campaign',...config.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...(l.chooserPlants??[]),...(l.preset??[]),...l.protectedPlants.map(p=>p.kind),...l.initialPlants.map(p=>p.kind),...(l.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...l.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 for(const name of battleActors(l,plants)){const spec=actors[name],sk=read(spec?`${spec.group}/rigs/${spec.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(spec?sk.armature.some((a:{name:string})=>a.name===spec.armature):sk.armature.length,name);}
 for(const name of battleEffects(l,plants)){assert.ok(rigs[name],name);const spec=rigs[name],sk=read(`${spec.group}/rigs/${spec.rig}/skeleton.json`);assert.ok(sk.armature.some((a:{name:string})=>a.name===spec.armature),name);}
});
test('Dino 26–30 retain waves, modes, source dinosaur schedules and rewards',()=>{
 assert.deepEqual([26,27,28,29,30].map(d=>level(d).waves.length),[8,9,10,12,12]);assert.deepEqual([26,27,28,29,30].map(d=>level(d).flagInterval),[4,9,5,4,3]);
 assert.deepEqual([26,27,28,29,30].map(d=>BATTLE_LEVELS[`dino${d}`].mode),['seedbank','seedbank','seedbank','preset','seedbank']);
 assert.deepEqual(level(29).preset,['primalsunflower','primalpeashooter','primalpotatomine']);assert.equal(BATTLE_LEVELS.dino29.firstReward.image,'spine_dino');
 for(const day of [26,27,28,29,30]){
  const config=BATTLE_LEVELS[`dino${day}`],l=level(day);assert.equal(config.narrative,null);assert.equal(l.mowers,true);assert.equal(l.sunDrops,day!==27);assert.equal(config.presentation.music,`dino/${day===27||day===29?'minigame':'music'}.mp3`);
  const source=read(`dino/dino${day}.source.json`),sourceWaves=source.objects.find((o:{objclass:string})=>o.objclass==='WaveManagerProperties').objdata.Waves;
  for(let i=0;i<sourceWaves.length;i++){
   const expected=sourceWaves[i].map((ref:string)=>source.objects.find((o:{aliases?:string[]})=>o.aliases?.includes(ref.slice(5,ref.indexOf('@'))))).filter((o:{objclass:string})=>o.objclass==='DinoWaveActionProps').map((o:{objdata:{DinoType:string;DinoRow:string|number;DinoWaveDuration:string|number}})=>({kind:o.objdata.DinoType,row:Number(o.objdata.DinoRow),delay:Number(o.objdata.DinoWaveDuration)}));
   assert.deepEqual(l.actions[i].filter(a=>a.dinosaur).map(a=>a.dinosaur),expected,`${day} wave ${i+1}`);
  }
 }
 assert.equal(Object.values(BATTLE_LEVELS).filter(l=>l.world==='dino'&&l.day<=30).length,30);assert.ok(Object.keys(BATTLE_LEVELS).length>=414);
});
test('Dino 26 forbids its first two columns without consuming sun; nearby ground remains usable',()=>{
 const g=create(26);g.sun=500;assert.equal(g.level.mold.length,10);assert.ok(g.level.mold.every(c=>c.column<2));
 for(let row=0;row<5;row++)for(let column=0;column<2;column++)assert.equal(g.plant('peashooter',row,column),false);
 assert.equal(g.sun,500);assert.equal(g.plant('peashooter',2,2),true);assert.equal(g.sun,400);
});
test('Dino 27 keeps 3000 sun, four food, its blacklist and frozen preparation until started',()=>{
 const g=create(27);assert.equal(g.preparing,true);assert.equal(g.sun,3000);assert.equal(g.food,4);tick(g,2);assert.equal(g.time,0);
 for(const kind of ['sunflower','primalsunflower','iceburg','melonpult'] as const)assert.equal(g.plant(kind,0,0),false);
 assert.ok(g.plant('primalpotatomine',0,0));assert.ok(g.plant('primalpotatomine',1,0));assert.equal(g.sun,2900);g.shovel(1,0);assert.equal(g.sun,2950);g.startLastStand();tick(g,.1);assert.ok(g.time>0);assert.equal(g.preparing,false);
});
test('First thirty map levels unlock in order and day 29 pinata is awarded once',async()=>{
 const {ProgressStore,completionEvents}=await import('../src/shell/progression'),{islandStates}=await import('../src/shell/navigation');const map=read('shell/maps/dino.json'),data=new Map<string,string>(),p=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 for(let day=1;day<=30;day++){const id=`dino${day}`,node=map.islands.find((n:{levels:string[]})=>n.levels.includes(id))!;assert.equal(islandStates(map,p.completed(map),p.rewardNodes('dino')).get(node.node),'open',id);p.finish('dino',id);const events=completionEvents(map,id,p.completed(map),p.rewardNodes('dino'));for(const e of events)if(e.action==='reward')p.award('dino',map.islands.find((n:{node:number})=>n.node===e.node)!);p.finishPresentation();const before=JSON.stringify([p.rewards(),p.campaignRewards()]);p.finish('dino',id);for(const e of events)if(e.action==='reward')p.award('dino',map.islands.find((n:{node:number})=>n.node===e.node)!);assert.equal(JSON.stringify([p.rewards(),p.campaignRewards()]),before);}
 assert.equal(p.completed(map).size,30);assert.equal(p.campaignRewards().filter(r=>r.level==='dino29'&&r.id==='spine_dino').length,1);assert.deepEqual(p.rewards().map(r=>r.id),[18,41,160,146,54]);
});
