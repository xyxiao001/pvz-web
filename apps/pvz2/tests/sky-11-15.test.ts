import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,props,read,tick} from './sky-fixture';
import {cellX,type PlantKind} from '../src/game/level';
import {BATTLE_LEVELS,availablePlants} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {LEVEL_ROUTES} from '../src/shell/navigation';
for(const day of [11,12,13,14,15])test(`Sky ${day}: controlled settlement and referenced resources`,()=>{
 const g=create(day);if(g.preparing)g.startLastStand();
 for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);assert.equal(LEVEL_ROUTES[`sky${day}`],`sky${day}`);
 const config=BATTLE_LEVELS[`sky${day}`],l=level(day),catalogs=['battle','campaign',...config.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...(l.airRaid?.teams.flatMap(t=>t.members.map(m=>m.kind))??[]),...(l.chooserPlants??[]),...l.protectedPlants.map(p=>p.kind),...l.initialPlants.map(p=>p.kind),...(l.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...l.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 for(const name of battleActors(l,plants)){const spec=actors[name],sk=read(spec?`${spec.group}/rigs/${spec.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(spec?sk.armature.some((a:{name:string})=>a.name===spec.armature):sk.armature.length,name);}
 for(const name of battleEffects(l,plants)){assert.ok(rigs[name],name);const spec=rigs[name],sk=read(`${spec.group}/rigs/${spec.rig}/skeleton.json`);assert.ok(sk.armature.some((a:{name:string})=>a.name===spec.armature),name);}
});


const isolated=(day=14)=>{const g=create(day);Object.assign(g,{nextWave:Infinity});g.plants=[];return g;};
test('Sky 11–15 native modes, challenges, music and reward',()=>{
 assert.deepEqual(level(11).chooserPlants,['anthurium']);assert.equal(BATTLE_LEVELS.sky11.firstReward.plant,'anthurium');
 assert.ok(availablePlants(BATTLE_LEVELS.sky12,new Set([201])).includes('anthurium'));
 assert.deepEqual(level(12).lastStand,{sun:3750,food:1});
 for(const kind of ['sunflower','sunshroom','twinsunflower','sunbean','toadstool','goldleaf','primalsunflower','moonbean','goldbloom','solarsage'] as PlantKind[])assert.ok(level(12).blacklist.includes(kind),kind);
 assert.equal(level(13).maxPlantsLost,5);assert.deepEqual(level(14).preset,['sunshroom','asparagus','skyshooter','pineapple','anthurium','moonbean']);assert.equal(BATTLE_LEVELS.sky14.presentation.music,'sky/ultimate.mp3');
 assert.equal(level(15).mustProtect,4);assert.deepEqual(level(15).protectedPlants.map(p=>[p.kind,p.row,p.column]),[['skyshooter',0,4],['skyshooter',1,3],['skyshooter',3,3],['skyshooter',4,4]]);
});
test('Last stand plants spend the authored budget and waves begin on request',()=>{
 const g=create(12);tick(g,5);assert.equal(g.wave,0);assert.equal(g.sun,3750);assert.equal(g.food,1);
 assert.equal(g.plant('sunshroom',1,1),false);assert.equal(g.plant('skyshooter',1,1),true);assert.equal(g.sun,3750-props.plants.skyshooter.SunCost);
 g.startLastStand();tick(g,10);assert.ok(g.wave>0);
});
test('Five losses are allowed on sky13; losing a protected shooter fails sky15',()=>{
 const g=isolated(13);g.plantsLost=5;tick(g,.02);assert.equal(g.phase,'playing');g.plantsLost=6;tick(g,.02);assert.equal(g.lossReason,'plantsLost');assert.equal(g.phase,'lost');
 const p=create(15);p.plants[0].hp=0;tick(p,.1);assert.equal(p.phase,'lost');assert.equal(p.lossReason,'protected');
});
test('Electric zombies shoot at native frame and charge plants without direct damage',()=>{
 const g=isolated(11);g.addPlant('wallnut',2,2);const p=g.plants[0],z=g.spawnZombie('sky_electric',2,cellX(5));tick(g,.02);z.skyEnemy!.cooldown=0;
 tick(g,.6);assert.equal(g.sky.enemies.bolts.length,0);tick(g,.05);assert.equal(g.sky.enemies.bolts.length,1);
 tick(g,.6);assert.equal(g.sky.thunder.charges.length,1);assert.equal(p.hp,props.plants.wallnut.Toughness);assert.ok(Math.abs(g.sky.thunder.charges[0].value)===1);
});
test('Electric zombies skip fully charged targets and retain 100 DPS ship fire',()=>{
 const g=isolated(11);g.addPlant('wallnut',2,2);g.sky.thunder.add(2,2,-1);g.sky.thunder.add(2,2,-1);const z=g.spawnZombie('sky_electric',2,cellX(6));tick(g,.02);z.skyEnemy!.cooldown=0;tick(g,1);assert.equal(g.sky.enemies.bolts.length,0);
 g.plants=[];z.x=g.sky.edge+15;tick(g,1.5);const hp=g.sky.health;tick(g,1);assert.ok(Math.abs(g.sky.health-(hp-100))<.01);
});
test('Gargantuar releases two reverse parachuting imps below 70% and 30%',()=>{
 const g=isolated(),z=g.spawnZombie('sky_gargantuar',2,cellX(7));z.hp=2520;tick(g,.1);assert.equal(z.skyEnemy!.imps,0);
 z.hp=2519;tick(g,1.1);assert.equal(z.skyEnemy!.imps,1);const imp=g.zombies.find(z=>z.kind==='sky_imp')!;assert.ok(imp.reversed);assert.ok(imp.leap);assert.ok([0,1,2].some(c=>cellX(c)===imp.leap!.toX));
 tick(g,1);z.hp=1079;tick(g,1.1);assert.equal(z.skyEnemy!.imps,2);tick(g,5);assert.equal(z.skyEnemy!.imps,2);
});
test('Gargantuar smashes a plant on the native hit event and burns the ship at 300 DPS',()=>{
 const g=isolated();g.addPlant('skyshooter',2,4);const p=g.plants[0],z=g.spawnZombie('sky_gargantuar',2,cellX(4)+50);tick(g,.9);assert.ok(p.hp>0);tick(g,.2);assert.equal(p.hp,0);
 assert.equal(z.skyEnemy!.animation,'Smash_Empty');tick(g,2);z.x=g.sky.edge+25;tick(g,4);const hp=g.sky.health;tick(g,1);assert.ok(Math.abs(g.sky.health-(hp-300))<.01);
});
test('Sky map unlocks through fifteen and grants native Anthurium display exactly once',async()=>{
 const {ProgressStore,completionEvents}=await import('../src/shell/progression'),{islandStates}=await import('../src/shell/navigation');
 const map=read('shell/maps/sky.json'),data=new Map<string,string>(),p=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 for(let day=1;day<=15;day++){
  const id=`sky${day}`,node=map.islands.find((n:{levels:string[]})=>n.levels.includes(id))!;
  assert.equal(islandStates(map,p.completed(map),p.rewardNodes('sky')).get(node.node),'open',id);p.finish('sky',id);
  const events=completionEvents(map,id,p.completed(map),p.rewardNodes('sky'));
  for(const e of events)if(e.action==='reward')p.award('sky',map.islands.find((n:{node:number})=>n.node===e.node)!);
  p.finishPresentation();const rewards=JSON.stringify(p.rewards());p.finish('sky',id);
  for(const e of events)if(e.action==='reward')p.award('sky',map.islands.find((n:{node:number})=>n.node===e.node)!);
  assert.equal(JSON.stringify(p.rewards()),rewards);
 }
 assert.ok(p.ownedPlants().has(201));assert.ok(read('shell/progression.json').plants[201].some((d:{kind:string})=>d.kind==='rig'));assert.equal(Object.keys(BATTLE_LEVELS).length,456);
});
