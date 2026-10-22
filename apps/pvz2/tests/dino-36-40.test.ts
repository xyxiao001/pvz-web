import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,read,tick} from './dino-fixture';
import {cellX,type PlantKind} from '../src/game/level';
import {BATTLE_LEVELS} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {LEVEL_ROUTES} from '../src/shell/navigation';
for(const day of [36,37,38,39,40])test(`Dino ${day}: controlled settlement and referenced resources`,()=>{
 const g=create(day);
 for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);assert.equal(LEVEL_ROUTES[`dino${day}`],`dino${day}`);
 const config=BATTLE_LEVELS[`dino${day}`],l=level(day),catalogs=['battle','campaign',...config.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...(l.chooserPlants??[]),...(l.preset??[]),...l.protectedPlants.map(p=>p.kind),...l.initialPlants.map(p=>p.kind),...(l.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...l.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 for(const name of battleActors(l,plants)){const spec=actors[name],sk=read(spec?`${spec.group}/rigs/${spec.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(spec?sk.armature.some((a:{name:string})=>a.name===spec.armature):sk.armature.length,name);}
 for(const name of battleEffects(l,plants)){assert.ok(rigs[name],name);const spec=rigs[name],sk=read(`${spec.group}/rigs/${spec.rig}/skeleton.json`);assert.ok(sk.armature.some((a:{name:string})=>a.name===spec.armature),name);}
});
test('Dino 36–40 retain source modes, dinosaur waves, objectives and rewards',()=>{
 assert.deepEqual([36,37,38,39,40].map(d=>level(d).waves.length),[9,10,9,12,9]);assert.deepEqual([36,37,38,39,40].map(d=>level(d).flagInterval),[3,5,3,4,3]);
 assert.deepEqual([36,37,38,39,40].map(d=>BATTLE_LEVELS[`dino${d}`].mode),['seedbank','seedbank','preset','conveyor','seedbank']);
 assert.deepEqual(level(38).preset,['primalsunflower','primalpeashooter','primalpotatomine','perfumeshroom','stallia','threepeater']);assert.equal(level(36).maxSun,3500);assert.equal(level(36).mustProtect,3);assert.equal(level(39).maxPlants,15);
 assert.deepEqual(level(39).conveyor!.InitialPlantList.map(p=>p.PlantType),['explodeonut']);assert.deepEqual(level(39).actions[4].find(a=>a.add)?.add?.map(p=>p.PlantType),['banana']);
 for(const day of [36,37,38,39,40]){
  const c=BATTLE_LEVELS[`dino${day}`],l=level(day),source=read(`dino/dino${day}.source.json`);assert.equal(c.narrative,null);assert.equal(c.outro,undefined);assert.equal(l.mowers,false);assert.equal(l.sunDrops,day!==39);assert.equal(c.presentation.music,`dino/${[36,38,39].includes(day)?'minigame':'music'}.mp3`);
  const waves=source.objects.find((o:{objclass:string})=>o.objclass==='WaveManagerProperties').objdata.Waves;
  for(let i=0;i<waves.length;i++){const expected=waves[i].map((ref:string)=>source.objects.find((o:{aliases?:string[]})=>o.aliases?.includes(ref.slice(5,ref.indexOf('@'))))).filter((o:{objclass:string})=>o.objclass==='DinoWaveActionProps').map((o:{objdata:{DinoType:string;DinoRow:string|number;DinoWaveDuration?:string|number}})=>({kind:o.objdata.DinoType,row:Number(o.objdata.DinoRow),delay:Number(o.objdata.DinoWaveDuration??0)}));assert.deepEqual(l.actions[i].filter(a=>a.dinosaur).map(a=>a.dinosaur),expected);}
 }
 assert.equal(BATTLE_LEVELS.dino36.firstReward.image,'dangerroom_dino2');assert.equal(BATTLE_LEVELS.dino36.firstReward.animation,'dangerroom_dino');assert.equal(BATTLE_LEVELS.dino37.firstReward.image,'spine_dino');assert.equal(BATTLE_LEVELS.dino39.firstReward.image,'');
 assert.equal(Object.values(BATTLE_LEVELS).filter(l=>l.world==='dino'&&l.day<=40).length,40);assert.ok(Object.keys(BATTLE_LEVELS).length>=424);
});
test('Dino 36 sun budget and protected toadstools, Dino 38 mold and Dino 39 plant cap',()=>{
 const a=create(36);assert.deepEqual(a.level.protectedPlants,[{kind:'toadstool',column:3,row:1},{kind:'toadstool',column:2,row:2},{kind:'toadstool',column:3,row:3}]);a.sunSpent=3500;tick(a,.1);assert.equal(a.phase,'playing');a.sunSpent++;tick(a,.1);assert.equal(a.lossReason,'sun');
 const b=create(36);b.plants.find(p=>p.endangered)!.hp=0;tick(b,.1);assert.equal(b.lossReason,'protected');
 const c=create(38);c.sun=1000;assert.ok(c.level.mold.length>0);for(const m of c.level.mold)assert.equal(c.plant('primalpeashooter',m.row,m.column),false);assert.equal(c.sun,1000);
 const d=create(39);for(let i=0;i<15;i++)d.addPlant('explodeonut',i%5,Math.floor(i/5));tick(d,.1);assert.equal(d.phase,'playing');d.addPlant('explodeonut',0,4);tick(d,.1);assert.equal(d.lossReason,'plants');
});
test('Dino heavy armor and veteran health retain their authored values and primal knockback immunity',()=>{
 const g=create(38);Object.assign(g,{nextWave:Infinity});const a=g.spawnZombie('dino_armor4',0,cellX(6));assert.equal(a.hp,190);assert.equal(a.armor,2200);g.damage(a,2200);assert.equal(a.armor,0);assert.equal(a.hp,190);
 const b=g.spawnZombie('dino_bully_veteran',2,cellX(5));assert.equal(b.hp,2470);g.iceageCombat.primalPeas.push({id:g.nextEntityId(),row:2,x:b.x-25,y:400,kind:'pea_primal_kb'});tick(g,.1);assert.ok(b.hp<2470);assert.equal(b.leap,null);
 g.dino.add({kind:'ankylo',row:2,delay:0});tick(g,.1);const d=g.dino.ankylo.items[0];b.x=d.x-310.2935*.6;tick(g,6.5);assert.ok(b.x<cellX(4));
});
test('Veteran bully smashes a plant and leaves a 25 second crack; protected nut survives',()=>{
 const g=create(38);Object.assign(g,{nextWave:Infinity});g.addPlant('primalpeashooter',2,3);const z=g.spawnZombie('dino_bully_veteran',2,cellX(3)+30);tick(g,.85);assert.equal(g.plants.length,1);tick(g,.1);assert.equal(g.plants.length,0);assert.equal(g.dino.bully.cracks.length,1);g.sun=500;assert.equal(g.plant('primalpeashooter',2,3),false);g.damage(z,100000);tick(g,25.1);assert.equal(g.dino.bully.cracks.length,0);assert.ok(g.plant('primalpeashooter',2,3));
 const h=create(38);Object.assign(h,{nextWave:Infinity});h.addPlant('primalwallnut',2,3);const p=h.plants[0],hp=p.hp;h.spawnZombie('dino_bully_veteran',2,cellX(3)+30);tick(h,1);assert.equal(p.hp,hp*.75);assert.equal(h.dino.bully.cracks.length,0);
});
test('Explode-o-nut body and food armor each explode for 1800 without losing the armored body',()=>{
 const g=create(39);Object.assign(g,{nextWave:Infinity});g.addPlant('explodeonut',2,3);const p=g.plants[0],z=g.spawnZombie('dino_gargantuar',2,cellX(4));g.food=2;assert.ok(g.plantFood(2,3));tick(g,1);assert.equal(p.armor,4000);assert.equal(g.plantFood(2,3),false);const hp=z.hp;p.armor=0;tick(g,.02);assert.equal(z.hp,hp-1800);assert.equal(p.hp,3000);p.hp=0;tick(g,.02);assert.equal(z.hp,hp-3600);assert.equal(g.plants.length,0);assert.equal(g.plantsLost,1);
});
test('Explode-o-nut armor absorbs a giant smash and its body explodes on the next smash',()=>{
 const g=create(39);Object.assign(g,{nextWave:Infinity});g.addPlant('explodeonut',2,3);const p=g.plants[0];g.food=1;g.plantFood(2,3);tick(g,1);g.spawnZombie('dino_gargantuar',2,cellX(3)+30);tick(g,1.5);assert.equal(p.armor,0);assert.equal(p.hp,3000);tick(g,4);assert.equal(p.hp,0);assert.equal(g.plants.length,0);
});
test('Dino 1–40 map sequence and new trophy/pinata are awarded once',async()=>{
 const {ProgressStore,completionEvents}=await import('../src/shell/progression'),{islandStates}=await import('../src/shell/navigation');const map=read('shell/maps/dino.json'),data=new Map<string,string>(),p=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 for(let day=1;day<=40;day++){const id=`dino${day}`,node=map.islands.find((n:{levels:string[]})=>n.levels.includes(id))!;assert.equal(islandStates(map,p.completed(map),p.rewardNodes('dino')).get(node.node),'open',id);p.finish('dino',id);for(const e of completionEvents(map,id,p.completed(map),p.rewardNodes('dino')))if(e.action==='reward')p.award('dino',map.islands.find((n:{node:number})=>n.node===e.node)!);p.finishPresentation();const before=JSON.stringify(p.campaignRewards());p.finish('dino',id);assert.equal(JSON.stringify(p.campaignRewards()),before);}
 assert.equal(p.completed(map).size,40);assert.deepEqual(p.campaignRewards().filter(r=>['dino36','dino37','dino39'].includes(r.level)),[{level:'dino36',type:'worldtrophy',id:'dangerroom_dino2',count:1},{level:'dino37',type:'pinata',id:'spine_dino',count:1}]);
});
