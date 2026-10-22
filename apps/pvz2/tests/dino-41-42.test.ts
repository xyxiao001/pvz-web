import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,read,tick} from './dino-fixture';
import {type PlantKind} from '../src/game/level';
import {BATTLE_LEVELS} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {DinoBoss} from '../src/game/dino-boss';
import {cellX,rowY} from '../src/game/level';
import {LEVEL_ROUTES} from '../src/shell/navigation';
for(const day of [41,42])test(`Dino ${day}: controlled settlement and referenced resources`,()=>{
 const g=create(day);if(g.preparing)g.startLastStand();
 for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');if(day!==42)assert.equal(g.wave,g.level.waves.length);else assert.equal(g.boss!.defeated,true);assert.equal(LEVEL_ROUTES[`dino${day}`],`dino${day}`);
 const config=BATTLE_LEVELS[`dino${day}`],l=level(day),catalogs=['battle','campaign',...config.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...(l.chooserPlants??[]),...(l.preset??[]),...l.protectedPlants.map(p=>p.kind),...l.initialPlants.map(p=>p.kind),...(l.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...l.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 for(const name of battleActors(l,plants)){const spec=actors[name],sk=read(spec?`${spec.group}/rigs/${spec.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(spec?sk.armature.some((a:{name:string})=>a.name===spec.armature):sk.armature.length,name);}
 for(const name of battleEffects(l,plants)){assert.ok(rigs[name],name);const spec=rigs[name],sk=read(`${spec.group}/rigs/${spec.rig}/skeleton.json`);assert.ok(sk.armature.some((a:{name:string})=>a.name===spec.armature),name);}
});
test('Dino 41 keeps its last stand budget, flower line, blacklist and dinosaur schedule',()=>{
 const g=create(41),l=g.level;assert.equal(l.waves.length,9);assert.equal(l.flagInterval,3);assert.equal(l.flowerLine,3);assert.equal(l.sunDrops,false);assert.equal(l.mowers,false);assert.equal(g.sun,2500);assert.equal(g.food,4);assert.equal(g.preparing,true);tick(g,1);assert.equal(g.time,0);
 assert.deepEqual(l.blacklist,['sunflower','twinsunflower','iceburg','gravebuster','sunshroom','puffshroom','sunbean','melonpult','toadstool','goldleaf','stallia','primalsunflower','goldbloom']);
 assert.equal(g.plant('sunflower',0,0),false);assert.ok(g.plant('primalpeashooter',0,0));assert.equal(g.sun,2325);g.shovel(0,0);assert.equal(g.sun,2500);g.startLastStand();tick(g,.1);assert.ok(g.time>0);g.spawnZombie('dino',0,cellX(2.5));tick(g,.1);assert.equal(g.lossReason,'flowers');
 const source=read('dino/dino41.source.json'),waves=source.objects.find((o:{objclass:string})=>o.objclass==='WaveManagerProperties').objdata.Waves;
 for(let i=0;i<waves.length;i++){const expected=waves[i].map((ref:string)=>source.objects.find((o:{aliases?:string[]})=>o.aliases?.includes(ref.slice(5,ref.indexOf('@'))))).filter((o:{objclass:string})=>o.objclass==='DinoWaveActionProps').map((o:{objdata:{DinoType:string;DinoRow:string|number;DinoWaveDuration:string|number}})=>({kind:o.objdata.DinoType,row:Number(o.objdata.DinoRow),delay:Number(o.objdata.DinoWaveDuration)}));assert.deepEqual(l.actions[i].filter(a=>a.dinosaur).map(a=>a.dinosaur),expected);}
});
test('Dino 42 uses the second mech stages, conveyor, dialogue and complete resource plan',()=>{
 const g=create(42),b=g.boss as DinoBoss,l=g.level;assert.ok(b instanceof DinoBoss);assert.equal(b.zombie.hp,28000);assert.deepEqual(b.stages.map(s=>s.HitPoints),[9000,10000,9000]);assert.deepEqual(b.stages.map(s=>s.AnimRateModifier),[1.2,1.5,1.8]);assert.deepEqual(b.stages.map(s=>s.MissileCount),[{Min:2,Max:3},{Min:2,Max:3},{Min:3,Max:3}]);assert.equal(l.boss!.reserved,3);assert.equal(l.sunDrops,false);assert.equal(l.mowers,false);
 const plants=l.conveyor!.InitialPlantList.map(p=>p.PlantType);assert.deepEqual(plants,['endurian','primalpeashooter','guacodile','perfumeshroom','parsnip']);assert.equal(l.conveyor!.InitialPlantList[3].MaxCount,1);
 const actors=battleActors(l,plants);assert.ok(actors.includes('dinoBullyVeteran'));for(const stage of b.stages)for(const action of stage.Actions)for(const kind of action.summonProps.zombieList)assert.ok(g.props.zombies[kind]);
 const catalog=read('dino/catalog.json');for(const [key,count] of [['DINO_42_INTRO',3],['DINO_42_OUTRO',3]] as const){const lines=catalog.narratives[key].filter((s:{Lines?:unknown})=>s.Lines);assert.equal(lines.length,count);for(const line of lines)assert.ok(catalog.sounds[line.Voice].length>0);}
 for(const day of [41,42]){const c=BATTLE_LEVELS[`dino${day}`],d=read(`dino/dino${day}.source.json`).objects.find((o:{objclass:string})=>o.objclass==='LevelDefinition').objdata;assert.equal(c.narrative,d.FirstIntroNarrative??null);assert.equal(c.outro,d.FirstOutroNarrative);assert.equal(c.presentation.music,'dino/minigame.mp3');}
 assert.equal(BATTLE_LEVELS.dino41.firstReward.image,'spine_dino');assert.equal(BATTLE_LEVELS.dino42.firstReward.image,'');
});
test('Dino 42 honors the ankylosaurus summon budget and ends after all three stages',()=>{
 const g=create(42),b=g.boss as DinoBoss;tick(g,10);g.zombies=g.zombies.filter(z=>z===b.zombie);b.stage=2;b.zombie.hp=9000;b.zombie.x=cellX(6);const action=b.current.Actions.find(a=>a.summonProps.dinoType==='ankylo')!;Object.assign(b,{previous:action,repeatLeft:1,motion:null,restLeft:0,animation:'Idle'});tick(g,1.6);assert.equal(g.dino.ankylo.items.length,1);const spawned=g.zombies.filter(z=>z!==b.zombie);assert.equal(action.summonProps.pointMin,800);assert.equal(g.props.zombies.dino_bully_veteran.WavePointCost,1000);assert.equal(spawned.length,0);
 const h=create(42),boss=h.boss as DinoBoss;tick(h,10);boss.hit(100000);assert.equal(boss.stage,1);boss.hit(100000);assert.equal(boss.stage,2);boss.hit(100000);assert.equal(boss.defeated,false);tick(h,18);assert.equal(boss.defeated,true);assert.equal(h.phase,'won');
});
test('Dino 1–42 unlock sequentially and the final pinata cannot be collected twice',async()=>{
 const {ProgressStore,completionEvents}=await import('../src/shell/progression'),{islandStates}=await import('../src/shell/navigation');const map=read('shell/maps/dino.json'),data=new Map<string,string>(),p=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 for(let day=1;day<=42;day++){const id=`dino${day}`,node=map.islands.find((n:{levels:string[]})=>n.levels.includes(id))!;assert.equal(islandStates(map,p.completed(map),p.rewardNodes('dino')).get(node.node),'open',id);p.finish('dino',id);for(const e of completionEvents(map,id,p.completed(map),p.rewardNodes('dino')))if(e.action==='reward')p.award('dino',map.islands.find((n:{node:number})=>n.node===e.node)!);p.finishPresentation();const before=JSON.stringify(p.campaignRewards());p.finish('dino',id);assert.equal(JSON.stringify(p.campaignRewards()),before);}
 assert.equal(p.completed(map).size,42);assert.deepEqual(p.campaignRewards().filter(r=>['dino41','dino42'].includes(r.level)),[{level:'dino41',type:'pinata',id:'spine_dino',count:1}]);assert.equal(Object.values(BATTLE_LEVELS).filter(l=>l.world==='dino').length,42);assert.equal(Object.keys(BATTLE_LEVELS).length,426);
});
