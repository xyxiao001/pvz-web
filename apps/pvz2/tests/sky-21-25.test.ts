import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,props,read,tick} from './sky-fixture';
import {cellX,type PlantKind} from '../src/game/level';
import {BATTLE_LEVELS,availablePlants} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {LEVEL_ROUTES} from '../src/shell/navigation';
for(const day of [21,22,23,24,25])test(`Sky ${day}: controlled settlement and referenced resources`,()=>{
 const g=create(day);if(day===24)g.sunProduced=7750;
 for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);assert.equal(LEVEL_ROUTES[`sky${day}`],`sky${day}`);
 const config=BATTLE_LEVELS[`sky${day}`],l=level(day),catalogs=['battle','campaign',...config.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...(l.airRaid?.teams.flatMap(t=>t.members.map(m=>m.kind))??[]),...(l.chooserPlants??[]),...l.protectedPlants.map(p=>p.kind),...l.initialPlants.map(p=>p.kind),...(l.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...l.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 for(const name of battleActors(l,plants)){const spec=actors[name],sk=read(spec?`${spec.group}/rigs/${spec.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(spec?sk.armature.some((a:{name:string})=>a.name===spec.armature):sk.armature.length,name);}
 for(const name of battleEffects(l,plants)){assert.ok(rigs[name],name);const spec=rigs[name],sk=read(`${spec.group}/rigs/${spec.rig}/skeleton.json`);assert.ok(sk.armature.some((a:{name:string})=>a.name===spec.armature),name);}
});
const isolated=(day=22)=>{const g=create(day);Object.assign(g,{nextWave:Infinity});g.plants=[];return g;};
test('Sky 21–25 native modes, cards, bare references and sun target',()=>{
 assert.deepEqual([21,22,23,24,25].map(n=>level(n).waves.length),[13,16,10,14,15]);
 assert.deepEqual(level(21).actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[]),['floawerPot','tallnut','anthurium','bonkchoy','floawerPot','cherry_bomb','lychee']);
 assert.deepEqual(level(23).preset,['sunflower','goldleaf','firegourd','pineapple','loquat']);assert.equal(level(24).targetSun,7750);
 assert.deepEqual(level(25).conveyor!.InitialPlantList.map(p=>p.PlantType),['peacommando']);assert.ok(level(25).actions.flat().some(a=>a.add?.some(p=>p.PlantType==='snowpea')));
 assert.ok(availablePlants(BATTLE_LEVELS.sky23,new Set([202])).includes('bulbkekengi'));assert.equal(BATTLE_LEVELS.sky22.firstReward.plant,'bulbkekengi');assert.equal(BATTLE_LEVELS.sky23.firstReward.plant,'loquat');
});
test('Flying pots support ground plants beyond the ship and loss removes the occupant',()=>{
 const g=isolated();g.sun=10000;assert.equal(g.plant('repeater',2,5),false);assert.ok(g.plant('floawerPot',2,5));assert.ok(g.plant('repeater',2,5));tick(g,.1);const p=g.plants.find(p=>p.kind==='repeater')!;assert.ok(p.hp>0);
 g.plants.find(p=>p.kind==='floawerPot')!.hp=0;tick(g,.1);assert.ok(p.hp<=0);
});
test('Arbiter covers three lanes, emits fading fog, and crashes into ship once',()=>{
 const g=isolated(),z=g.spawnZombie('sky_arbiterx',0,cellX(4));assert.equal(z.row,1);assert.ok([0,1,2].every(row=>g.inLane(z,row)));assert.equal(g.inLane(z,3),false);tick(g,4);
 const fog=g.sky.special.fog;assert.ok(fog.some(f=>f.alpha>0));assert.ok(fog.find(f=>f.row===1)!.life>fog.find(f=>f.row===0)!.life);z.hp=0;tick(g,12);assert.equal(g.sky.special.fog.length,0);
 const crash=g.spawnZombie('sky_arbiterx',2,g.sky.edge+50);tick(g,1);assert.ok(crash.hp<=0);assert.equal(g.sky.health,18000);
});
test('Arbiter rams adjacent-row plants for 2000 and ignores Glowkengi',()=>{
 const g=isolated();g.addPlant('tallnut',1,2);const p=g.plants[0],z=g.spawnZombie('sky_arbiterx',2,cellX(2)+55);g.sky.shield=10000;z.x=cellX(4);g.addPlant('floawerPot',1,4);p.column=4;tick(g,1);assert.equal(p.hp,props.plants.tallnut.Toughness-2000);
 const h=isolated();h.addPlant('bulbkekengi',2,4);const lamp=h.plants[0];h.spawnZombie('sky',2,cellX(4));tick(h,3);assert.equal(lamp.hp,300);
});
test('Glowkengi clears near fog, dims outer fog and expands light for 15 seconds',()=>{
 const g=isolated(),fog=g.sky.special;g.spawnZombie('sky_arbiterx',2,cellX(1));tick(g,4);g.zombies=[];g.addPlant('bulbkekengi',2,5);const p=g.plants[0];tick(g,1);assert.ok(fog.fog.filter(f=>Math.max(Math.abs(f.row-2),Math.abs(f.column-5))<=1).every(f=>f.alpha===0));
 const outer=fog.fog.find(f=>f.row===0&&f.column===5)!;assert.ok(outer.alpha>0);g.food=1;assert.ok(g.plantFood(2,5));tick(g,2);assert.ok(outer.alpha<1e-8);assert.equal(g.food,0);assert.ok(p.hp>0);
});
test('Commando launches three heads with two explosive shots each, returns and rests',()=>{
 const g=isolated();g.addPlant('peacommando',2,3);const p=g.plants[0],z=g.spawnZombie('sky_armor2',2,cellX(7));z.armor=0;z.hp=10000;z.frozenUntil=Infinity;tick(g,1.2);assert.equal(g.sky.special.troopers.length,3);
 tick(g,6);assert.equal(z.hp,10000-6*225);assert.equal(g.sky.special.troopers.length,0);assert.equal(p.animation,'Idle');assert.ok(p.nextAction>g.time);
});
test('Commando food launches six heads and deals twelve 600-damage rays',()=>{
 const g=isolated();g.addPlant('peacommando',2,3);const z=g.spawnZombie('sky_armor2',2,cellX(7));z.armor=0;z.hp=20000;z.frozenUntil=Infinity;g.food=1;assert.ok(g.plantFood(2,3));tick(g,1);assert.equal(g.sky.special.troopers.length,6);tick(g,5);assert.equal(z.hp,20000-12*600);assert.equal(g.food,0);
});
test('Sky 24 rejects insufficient produced sun at controlled final settlement',()=>{
 const g=create(24);g.sun=10000;g.sunProduced=7749;for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}assert.equal(g.phase,'lost');assert.equal(g.lossReason,'sunProduced');
});
test('Sky map through 25 awards both new rewards once with native display rigs',async()=>{
 const {ProgressStore,completionEvents}=await import('../src/shell/progression'),{islandStates}=await import('../src/shell/navigation');const map=read('shell/maps/sky.json'),store=new Map<string,string>(),p=new ProgressStore({getItem:k=>store.get(k)??null,setItem:(k,v)=>{store.set(k,v);},removeItem:k=>{store.delete(k);}});
 for(let day=1;day<=25;day++){const id=`sky${day}`,node=map.islands.find((n:{levels:string[]})=>n.levels.includes(id))!;assert.equal(islandStates(map,p.completed(map),p.rewardNodes('sky')).get(node.node),'open');p.finish('sky',id);for(const e of completionEvents(map,id,p.completed(map),p.rewardNodes('sky')))if(e.action==='reward')p.award('sky',map.islands.find((n:{node:number})=>n.node===e.node)!);p.finishPresentation();const before=JSON.stringify(p.rewards());p.finish('sky',id);assert.equal(JSON.stringify(p.rewards()),before);}
 for(const id of [202,203]){assert.ok(p.ownedPlants().has(id));const draws=read('shell/progression.json').plants[id];assert.ok(draws.length);for(const d of draws)if(d.kind==='rig')assert.ok(read(`shell/rigs/${d.rig}/skeleton.json`).armature.some((a:{name:string})=>a.name===d.armature));}
 assert.equal(Object.keys(BATTLE_LEVELS).length,451);
});

test('Arbiter cannot be carried by Loquanado',()=>{
 const g=isolated();const z=g.spawnZombie('sky_arbiterx',2,cellX(5));z.frozenUntil=Infinity;g.addPlant('loquat',2,4);tick(g,2);assert.equal(z.x,cellX(5));assert.equal(z.loquatY,undefined);
});
