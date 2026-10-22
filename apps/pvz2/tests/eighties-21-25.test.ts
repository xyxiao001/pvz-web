import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,props,read,tick} from './eighties-fixture';
import {cellX,type PlantKind} from '../src/game/level';
import {BATTLE_LEVELS} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {LEVEL_ROUTES} from '../src/shell/navigation';
for(const day of [21,22,23,24,25])test(`Eighties ${day}: controlled settlement and referenced resources`,()=>{
 const g=create(day);if(g.preparing)g.startLastStand();
 for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);assert.equal(LEVEL_ROUTES[`eighties${day}`],`eighties${day}`);
 const config=BATTLE_LEVELS[`eighties${day}`],l=level(day),catalogs=['battle','campaign',...config.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...l.protectedPlants.map(p=>p.kind),...l.initialPlants.map(p=>p.kind),...(l.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...l.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 for(const name of battleActors(l,plants)){const spec=actors[name],sk=read(spec?`${spec.group}/rigs/${spec.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(spec?sk.armature.some((a:{name:string})=>a.name===spec.armature):sk.armature.length,name);}
 for(const name of battleEffects(l,plants)){assert.ok(rigs[name],name);const spec=rigs[name],sk=read(`${spec.group}/rigs/${spec.rig}/skeleton.json`);assert.ok(sk.armature.some((a:{name:string})=>a.name===spec.armature),name);}
});

import {ProgressStore} from '../src/shell/progression';
test('native flower line, conveyor additions, last stand, unlock and pinata',()=>{
 assert.equal(Object.keys(BATTLE_LEVELS).length,367);
 assert.deepEqual([21,22,23,24,25].map(d=>level(d).waves.length),[10,10,10,12,10]);
 assert.equal(level(21).flowerLine,3);assert.equal(create(24).sun,2000);assert.equal(create(24).food,2);assert.equal(create(24).preparing,true);
 assert.equal(BATTLE_LEVELS.eighties22.mode,'conveyor');assert.equal(level(22).sunDrops,false);assert.equal(level(22).conveyor!.InitialPlantList[0].PlantType,'sporeshroom');
 assert.equal(level(22).actions[4].flatMap(a=>a.add??[])[0].PlantType,'cherry_bomb');
 assert.equal(BATTLE_LEVELS.eighties23.mode,'seedbank');assert.equal(BATTLE_LEVELS.eighties21.firstReward.plant,'sporeshroom');assert.ok(!BATTLE_LEVELS.eighties21.plants.some(p=>p.kind==='sporeshroom'));assert.ok(BATTLE_LEVELS.eighties22.plants.some(p=>p.kind==='sporeshroom'&&p.id===144));
 assert.equal(read('eighties/catalog.json').narratives.EIGHTIES_22_INTRO[4].Character,'crazydave');
 const data=new Map<string,string>(),store=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 store.finish('eighties','eighties24',0);store.finish('eighties','eighties24',0);assert.deepEqual(store.campaignRewards().map(r=>r.id),['spine_eighties']);
});
const isolated=()=>{const g=create(23);Object.assign(g,{nextWave:Infinity});g.plants=[];g.graves=[];return g;};
test('spore lob marks a survivor, whose later death spawns one mushroom after .3 seconds',()=>{
 const g=isolated();g.addPlant('sporeshroom',2,1);const z=g.spawnZombie('eighties',2,cellX(6));z.frozenUntil=100;
 tick(g,1.8);assert.equal(z.hp,140);assert.ok(g.eighties.spores.has(z.id));assert.equal(g.plants.length,1);
 g.damage(z,200);tick(g,.2);assert.equal(g.plants.length,1);tick(g,.2);
 assert.equal(g.plants.length,2);assert.equal(g.plants[1].kind,'sporeshroom');assert.equal(g.plants[1].column,6);assert.equal(g.plants[1].animation,'Spawn');tick(g,1);assert.equal(g.plants[1].animation,'Idle');
});
test('spore plant food sends three 1800-damage lobs and does not overwrite occupied cells',()=>{
 const g=isolated();g.addPlant('sporeshroom',2,1);g.addPlant('wallnut',3,7);const z=g.spawnZombie('eighties_armor2',3,cellX(7));z.frozenUntil=100;g.food=1;g.plantFood(2,1);
 tick(g,.7);assert.equal(g.missiles.length,1);assert.equal(g.missiles[0].damage,1800);assert.equal(g.missiles[0].targetId,z.id);
 tick(g,1);assert.ok(z.hp<=0);assert.equal(g.missiles.length,2);tick(g,1.5);assert.equal(g.plants.length,2);assert.equal(g.plants[1].kind,'wallnut');assert.equal(g.plants[0].action,'idle');
});
test('arcade pushes cabinet one cell, crushes destination plants and stops at the lawn edge',()=>{
 const g=isolated(),z=g.spawnZombie('eighties_arcade',2,cellX(6)),t=g.graves[0];assert.equal(t.hp,600);assert.equal(z.x,cellX(8));z.x=cellX(6)+65;g.addPlant('wallnut',2,5);
 tick(g,1.9);assert.equal(t.column,6);tick(g,.7);assert.equal(t.column,5);assert.equal(g.plants.length,0);tick(g,1);assert.equal(g.eighties.arcade.pushes.size,0);
 t.column=0;z.x=cellX(0)+65;tick(g,.1);assert.equal(g.eighties.arcade.pushes.size,0);
});
test('cabinet music clock pauses off-jam and during EMP, then summons weighted 8-bit armor',()=>{
 const g=isolated(),z=g.spawnZombie('eighties_arcade',2,cellX(7)),t=g.graves[0],state=g.eighties.arcade.cabinets.get(t.id)!;z.frozenUntil=100;state.left=.1;
 tick(g,.2);assert.equal(state.left,.1);g.eighties.jam='jam_8bit';tick(g,.2);assert.equal(g.zombies.length,2);assert.match(g.zombies[1].kind,/^eighties_8bit/);assert.ok(state.left>9.8&&state.left<=12);
 g.addPlant('empea',2,6);tick(g,1);assert.ok(state.empUntil>g.time);const left=state.left;tick(g,2);assert.equal(state.left,left);
 state.empUntil=g.time;state.left=.01;g.random=()=>.95;tick(g,.1);assert.equal(g.zombies.at(-1)!.kind,'eighties_8bit_armor2');assert.equal(g.zombies.at(-1)!.armor,1100);
});
test('cabinet takes plant damage, cannot be eaten by gravebuster, and clears at victory',()=>{
 const g=isolated();g.spawnZombie('eighties_arcade',2,cellX(6));const t=g.graves[0];g.sun=1000;assert.equal(g.plant('gravebuster',2,6),false);
 g.addPlant('sporeshroom',2,1);g.zombies=[];tick(g,1.8);assert.equal(t.hp,550);t.hp=190;tick(g,.1);assert.equal(t.stage,4);t.hp=0;tick(g,.1);assert.equal(g.graves.length,0);assert.equal(g.eighties.arcade.cabinets.size,0);
 g.spawnZombie('eighties_arcade',2,cellX(7));g.zombies=[];Object.assign(g,{wave:g.level.waves.length});tick(g,.1);assert.equal(g.phase,'won');assert.equal(g.graves.length,0);
});
