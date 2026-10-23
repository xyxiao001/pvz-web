import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,props,read,tick} from './sky-fixture';
import {cellX,type PlantKind} from '../src/game/level';
import {BATTLE_LEVELS,availablePlants} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {LEVEL_ROUTES} from '../src/shell/navigation';
for(const day of [1,2,3,4,5])test(`Sky ${day}: controlled settlement and referenced resources`,()=>{
 const g=create(day);
 for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);assert.equal(LEVEL_ROUTES[`sky${day}`],`sky${day}`);
 const config=BATTLE_LEVELS[`sky${day}`],l=level(day),catalogs=['battle','campaign',...config.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...(l.chooserPlants??[]),...l.protectedPlants.map(p=>p.kind),...l.initialPlants.map(p=>p.kind),...(l.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...l.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 for(const name of battleActors(l,plants)){const spec=actors[name],sk=read(spec?`${spec.group}/rigs/${spec.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(spec?sk.armature.some((a:{name:string})=>a.name===spec.armature):sk.armature.length,name);}
 for(const name of battleEffects(l,plants)){assert.ok(rigs[name],name);const spec=rigs[name],sk=read(`${spec.group}/rigs/${spec.rig}/skeleton.json`);assert.ok(sk.armature.some((a:{name:string})=>a.name===spec.armature),name);}
});

test('Sky authored modes, rewards and native deck boundary',()=>{
 assert.deepEqual([1,2,3,4,5].map(d=>level(d).sunDrops),[true,true,false,true,false]);
 assert.ok([1,2,3,4,5].every(d=>!level(d).mowers));
 assert.equal(BATTLE_LEVELS.sky1.firstReward.plant,'skyshooter');
 assert.equal(BATTLE_LEVELS.sky3.firstReward.animation,'Shield');
 assert.deepEqual(level(3).conveyor!.InitialPlantList.map(p=>p.PlantType),['asparagus']);
 assert.deepEqual(level(5).conveyor!.InitialPlantList.map(p=>p.PlantType),['pineapple']);
 assert.equal(level(2).actions.flat().filter(a=>a.dropShip).length,3);
 assert.ok(!availablePlants(BATTLE_LEVELS.sky1,new Set([108])).includes('skyshooter'));
 assert.ok(availablePlants(BATTLE_LEVELS.sky2,new Set([108])).includes('skyshooter'));
 const g=create(2);g.sun=10000;
 assert.ok(g.plant('sunflower',1,2));assert.equal(g.plant('sunflower',2,3),false);assert.ok(g.plant('skyshooter',2,3));assert.ok(g.plant('asparagus',1,4));assert.ok(g.plant('pineapple',3,4));
 assert.equal(g.plants.find(p=>p.kind==='skyshooter')!.animation,'Idle_Sky');
});
const isolated=(day=2)=>{const g=create(day);Object.assign(g,{nextWave:Infinity});g.plants=[];return g;};
test('Ship takes native damage, absorbs shield hits without overflow and loses at zero hull',()=>{
 const g=isolated();assert.equal(g.sky.health,20000);assert.equal(g.sky.shield,0);
 g.sky.setShield(true);g.sky.damageShip(10001);assert.equal(g.sky.health,20000);assert.equal(g.sky.shield,-1);
 g.sky.damageShip(100);assert.equal(g.sky.health,19900);
 g.sky.setShield(true);g.sky.damageShip(3500,true);assert.equal(g.sky.shield,10000);assert.equal(g.sky.health,16400);
 g.sky.damageShip(20000,true);assert.equal(g.phase,'lost');assert.equal(g.lossReason,'ship');
});
test('Sky basic zombie fires at the ship after the native animation event',()=>{
 const g=isolated();const z=g.spawnZombie('sky',2,g.sky.edge+20);
 tick(g,.1);assert.equal(z.sky!.animation,'FireStart');assert.equal(g.sky.health,20000);
 tick(g,3);assert.equal(z.sky!.animation,'FireLoop');assert.ok(g.sky.health<20000);assert.ok(z.x>cellX(2));
});
test('Transport fixes its position to column 7 and delivers all authored parachutists',()=>{
 const g=isolated();const action=level(2).actions.flat().find(a=>a.dropShip)!.dropShip!;g.sky.addDropShip(action);
 assert.equal(g.sky.drops[0].x,cellX(7));assert.equal(g.sky.drops[0].row,1);
 let delivered=0;const ids=new Set<number>();
 for(let i=0;i<60*40;i++){g.tick(1/60);for(const z of g.zombies)if(z.kind==='sky_imp'&&!ids.has(z.id)){ids.add(z.id);delivered++;assert.equal(z.reversed,true);assert.equal(z.leap!.toX,cellX(1));}}
 assert.equal(delivered,2);assert.equal(g.sky.drops.length,0);
});
test('Asparagus fires four shots per clip into adjacent lanes and reloads after seven clips',()=>{
 const g=isolated();g.addPlant('asparagus',2,1);const p=g.plants[0],z=g.spawnZombie('sky_armor2',1,cellX(6));z.hp=100000;z.armor=0;z.frozenUntil=Infinity;
 tick(g,1.2);assert.equal(z.hp,100000-4*20);assert.equal(g.sky.plants.clips.get(p.id),6);
 tick(g,12);assert.equal(p.animation,'Reload');assert.equal(g.sky.plants.clips.get(p.id),7);
 tick(g,6.1);assert.notEqual(p.animation,'Reload');
});
test('Skyshooter fires on its native Shoot frame and 75 food peas',()=>{
 const g=isolated();g.addPlant('skyshooter',2,3);const p=g.plants[0];const z=g.spawnZombie('sky_armor2',2,cellX(8));z.frozenUntil=Infinity;
 tick(g,.05);assert.equal(g.sky.plants.shots.length,0);tick(g,.95);assert.equal(g.sky.plants.shots.length,1);
 g.food=1;g.sky.plants.shots=[];g.zombies=[];assert.ok(g.plantFood(2,3));tick(g,2.05);assert.equal(p.burst,75);assert.equal(p.action,'idle');
});
test('Sky exported files match the pinned provenance',async()=>{
 const {readFileSync}=await import('node:fs'),{createHash}=await import('node:crypto');
 const manifest=JSON.parse(readFileSync(new URL('../sky-provenance.json',import.meta.url),'utf8'));
 assert.equal(manifest.commit,'0e4a05348b6de328e2902a57afa24a3a454a4205');
 for(const [path,entry] of Object.entries(manifest.outputs) as [string,{sha256:string;bytes:number}][]){const data=readFileSync(new URL('../public/assets/'+path,import.meta.url));assert.equal(data.length,entry.bytes,path);assert.equal(createHash('sha256').update(data).digest('hex'),entry.sha256,path);}
});
test('Battleplane shoots, retreats to a new lane, and crashes after losing its pilot',()=>{
 const g=isolated(4),z=g.spawnZombie('sky_battleplane',2,cellX(7));
 tick(g,2);assert.ok(g.sky.bullets.length>0||g.sky.health<20000);assert.equal(z.sky!.animation,'Walk_Shoot');
 z.x=g.sky.edge+20;tick(g,.1);assert.equal(z.sky!.animation,'FleeStart');tick(g,8);assert.ok(z.x>cellX(7));
 assert.equal(g.sky.damagePilot(z,400),10);assert.equal(z.sky!.impHealth,0);z.x=g.sky.edge+20;
 tick(g,.1);assert.ok(g.sky.health<=18800);assert.equal(g.zombies.includes(z),false);
});
test('Sky first five map nodes advance, award the plant and shield only once',async()=>{
 const {ProgressStore,completionEvents}=await import('../src/shell/progression'),{islandStates}=await import('../src/shell/navigation');
 const map=read('shell/maps/sky.json'),data=new Map<string,string>(),p=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 for(let day=1;day<=5;day++){
  const id=`sky${day}`,node=map.islands.find((n:{levels:string[]})=>n.levels.includes(id))!;
  assert.equal(islandStates(map,p.completed(map),p.rewardNodes('sky')).get(node.node),'open',id);
  p.finish('sky',id);const events=completionEvents(map,id,p.completed(map),p.rewardNodes('sky'));
  for(const e of events)if(e.action==='reward')p.award('sky',map.islands.find((n:{node:number})=>n.node===e.node)!);
  p.finishPresentation();const rewards=JSON.stringify(p.rewards());p.finish('sky',id);
  for(const e of events)if(e.action==='reward')p.award('sky',map.islands.find((n:{node:number})=>n.node===e.node)!);
  assert.equal(JSON.stringify(p.rewards()),rewards);
 }
 assert.equal(p.completed(map).size,5);assert.ok(p.ownedPlants().has(108));assert.ok(p.ownedUpgrades().has(13));
 assert.ok(read('shell/progression.json').plants[108].some((d:{kind:string})=>d.kind==='rig'));
});

test('Battleplane child armatures resolve within the exported skeleton',()=>{
 const spec=read('sky/catalog.json').actors.skyBattlePlane,sk=read(`sky/rigs/${spec.rig}/skeleton.json`);
 const names=new Set(sk.armature.map((a:{name:string})=>a.name));
 for(const arm of sk.armature)for(const skin of arm.skin)for(const slot of skin.slot)for(const d of slot.display??[])if(d.type==='armature')assert.ok(names.has(d.path??d.name),d.path??d.name);
});

test('Day 5 pineapple reflects battleplane bullets back toward zombies',()=>{
 const g=isolated(5);g.addPlant('pineapple',2,3);const p=g.plants[0],hp=p.hp;
 g.sky.bullets.push({id:1,x:cellX(3)+30,row:2});tick(g,.1);
 assert.equal(p.hp,hp);assert.equal(g.sky.bullets.length,0);assert.ok(g.beachFinale.shots.some(s=>s.dx>0&&s.damage===30));
});
