import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,props,read,tick} from './eighties-fixture';
import {cellX,type PlantKind} from '../src/game/level';
import {BATTLE_LEVELS} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {LEVEL_ROUTES} from '../src/shell/navigation';
for(const day of [16,17,18,19,20])test(`Eighties ${day}: controlled settlement and referenced resources`,()=>{
 const g=create(day);if(g.preparing)g.startLastStand();
 for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);assert.equal(LEVEL_ROUTES[`eighties${day}`],`eighties${day}`);
 const config=BATTLE_LEVELS[`eighties${day}`],l=level(day),catalogs=['battle','campaign',...config.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...l.protectedPlants.map(p=>p.kind),...l.initialPlants.map(p=>p.kind),...(l.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...l.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 for(const name of battleActors(l,plants)){const spec=actors[name],sk=read(spec?`${spec.group}/rigs/${spec.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(spec?sk.armature.some((a:{name:string})=>a.name===spec.armature):sk.armature.length,name);}
 for(const name of battleEffects(l,plants)){assert.ok(rigs[name],name);const spec=rigs[name],sk=read(`${spec.group}/rigs/${spec.rig}/skeleton.json`);assert.ok(sk.armature.some((a:{name:string})=>a.name===spec.armature),name);}
});

import {ProgressStore} from '../src/shell/progression';
test('authored conveyor changes, garlic unlock, narratives and one-time trophies',()=>{
 assert.deepEqual([16,17,18,19,20].map(d=>level(d).waves.length),[9,10,10,12,10]);
 assert.equal(level(16).mowers,false);assert.equal(level(19).mowers,true);assert.equal(level(16).sunDrops,false);
 for(const d of [16,19])assert.equal(BATTLE_LEVELS[`eighties${d}`].mode,'conveyor');
 assert.deepEqual(level(16).conveyor!.InitialPlantList.map(p=>p.PlantType),['phatbeet']);
 assert.deepEqual(level(16).actions[4].flatMap(a=>a.add??[]).map(p=>[p.PlantType,p.MaxDelivered]),[['thymewarp',2]]);
 assert.equal(level(19).conveyor!.InitialPlantList[0].PlantType,'electricblueberry');
 assert.equal(level(19).actions[1].flatMap(a=>a.add??[])[0].PlantType,'garlic');
 assert.equal(BATTLE_LEVELS.eighties17.firstReward.plant,'garlic');assert.equal(BATTLE_LEVELS.eighties17.plants.some(p=>p.kind==='garlic'),false);assert.ok(BATTLE_LEVELS.eighties18.plants.some(p=>p.kind==='garlic'&&p.id===142));
 assert.ok(battleEffects(level(16),[]).includes('zombossicon'));
 assert.equal(BATTLE_LEVELS.eighties16.narrative,'EIGHTIES_16_INTRO');assert.equal(BATTLE_LEVELS.eighties20.outro,'EIGHTIES_OUTRO_DANGER_ROOM_KEY');
 const narratives=read('eighties/catalog.json').narratives;assert.equal(narratives.EIGHTIES_17_INTRO[3].Character,'winnie');
 const data=new Map<string,string>(),store=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 for(const d of [16,20]){store.finish('eighties',`eighties${d}`,0);store.finish('eighties',`eighties${d}`,0);}
 assert.deepEqual(store.campaignRewards().map(r=>r.id),['worldkey','dangerroom_eighties']);
});
const isolated=()=>{const g=create(18);Object.assign(g,{nextWave:Infinity});g.plants=[];g.graves=[];return g;};
test('breakdancer only kicks during rap, moves companions once and completes rotation after music stops',()=>{
 const g=isolated(),z=g.spawnZombie('eighties_breakdancer',2,cellX(6)),other=g.spawnZombie('eighties_armor2',2,cellX(6)-20),side=g.spawnZombie('eighties',1,cellX(6));
 tick(g,.1);assert.equal(g.eighties.spins.size,0);assert.equal(g.eighties.speed(z),1);
 g.eighties.jam='jam_rap';assert.equal(g.eighties.speed(z),1.5);tick(g,.5);assert.equal(!!other.leap,false);tick(g,.1);
 assert.equal(g.eighties.spins.get(z.id)!.animation,'RotateLoop');assert.ok(other.leap);assert.equal(side.leap,null);assert.equal(other.leap.fromX-other.leap.toX,1.5625*82);
 g.eighties.jam='jam_pop';tick(g,1.6);assert.equal(g.eighties.spins.has(z.id),false);assert.equal(other.leap,null);
});
test('garlic bite costs 150 health, pauses then changes one lane, and damaged garlic can be replanted',()=>{
 const g=isolated();g.addPlant('garlic',2,3);const p=g.plants[0];assert.equal(p.animation,'Idle00');const z=g.spawnZombie('eighties',2,cellX(3)+30);tick(g,.1);
 assert.equal(p.hp,750);assert.equal(Number(z.row),2);assert.ok(z.garlicLane);tick(g,1.2);assert.equal(Number(z.row),2);tick(g,1);assert.ok(z.row===1||z.row===3);assert.equal(z.garlicLane,undefined);assert.equal(p.hp,750);
 p.hp=600;tick(g,.1);assert.equal(p.animation,'Idle10');g.sun=1000;assert.ok(g.plant('garlic',2,3));assert.equal(p.hp,900);
});
test('garlic plant food moves forward targets with six-second stun and respects lane edges',()=>{
 const g=isolated();g.addPlant('garlic',0,2);const ahead=g.spawnZombie('eighties',0,cellX(6)),behind=g.spawnZombie('eighties',0,cellX(0)),side=g.spawnZombie('eighties',1,cellX(6));g.food=1;assert.ok(g.plantFood(0,2));tick(g,1.1);
 assert.ok(ahead.garlicLane);assert.equal(ahead.garlicLane.to,1);assert.equal(behind.garlicLane,undefined);assert.equal(side.garlicLane,undefined);assert.ok(ahead.stunnedUntil!>g.time+5.8);tick(g,2.2);assert.equal(ahead.row,1);assert.equal(g.plants[0].action,'idle');
});
