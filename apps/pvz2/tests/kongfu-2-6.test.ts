import test from 'node:test';import assert from 'node:assert/strict';
import {create,level,props,read,tick} from './kongfu-fixture';
import {cellX,rowY,type PlantKind} from '../src/game/level';
import {BATTLE_LEVELS} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
test('five native configurations, challenges, raid and reward',()=>{
 assert.deepEqual([2,3,4,5,6].map(d=>level(d).waves.length),[16,12,15,14,16]);
 assert.deepEqual([3,6].map(d=>BATTLE_LEVELS[`kongfu${d}`].mode),['conveyor','conveyor']);
 assert.equal(level(5).targetSun,2750);assert.equal(level(5).maxPlantsLost,2);assert.equal(level(6).mowers,false);
 assert.deepEqual(level(6).tnt!.SpawnData.map(t=>t.WireLength),[6,7,7,7,6]);
 assert.equal(level(4).actions.flat().filter(a=>a.mode==='raid').flatMap(a=>a.zombies).length,13);
 assert.ok(level(4).waves.flat().includes('kongfu_rocket_imp'));assert.equal(BATTLE_LEVELS.kongfu6.firstReward!.plant,'snowpea');
 for(const d of [2,4,6])assert.ok(read('kongfu/catalog.json').narratives[`KONGFU_${d}_INTRO`].length);
});
for(const day of [2,3,4,5,6])test(`Kongfu ${day}: controlled-damage settlement and required resources`,()=>{
 const g=create(day);if(day===5)g.dropSun(cellX(0),rowY(0),2750,'plant');
 for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);
 const config=BATTLE_LEVELS[`kongfu${day}`],l=level(day),catalogs=['campaign',...config.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...l.initialPlants.map(p=>p.kind),...(l.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...l.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 for(const name of battleActors(l,plants)){const spec=actors[name],sk=read(spec?`${spec.group}/rigs/${spec.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(spec?sk.armature.some((a:{name:string})=>a.name===spec.armature):sk.armature.length,name);}
 for(const name of battleEffects(l,plants))assert.ok(rigs[name],name);
});
test('conehead picks up torch, replaces its armor, burns plants and can be extinguished',()=>{
 const g=create(2),rack=g.graves[0];assert.equal(rack.hp,800);const z=g.spawnZombie('kongfu_armor1',rack.row,cellX(rack.column));tick(g,.1);assert.equal(z.kind,'kongfu_torch');assert.equal(z.armor,0);assert.equal(g.graves.length,0);
 g.addPlant('wallnut',z.row,rack.column);tick(g,.1);assert.equal(g.plants.length,0);
 g.chill(z,5);assert.equal(z.kongfu!.torch,false);g.kongfu.heat(z);assert.equal(z.kongfu!.torch,true);
});
test('hammer reflects repeaters during rotation and rests before walking',()=>{
 const g=create(3);g.graves=[];const z=g.spawnZombie('kongfu_hammer',2,cellX(4));
 g.cowboy.shots.push({id:g.nextEntityId(),row:2,x:z.x-25,vx:360,damage:20,mega:false});tick(g,.3);assert.equal(z.kongfu!.animation,'RotateLoop');
 g.cowboy.shots.push({id:g.nextEntityId(),row:2,x:z.x-25,vx:360,damage:20,mega:false});tick(g,.02);assert.equal(g.kongfu.reflected[0].damage,60);assert.ok(g.kongfu.reflected[0].vx<0);
 g.missiles.push({id:g.nextEntityId(),kind:'boomerang',row:2,x:z.x-25,y:rowY(2)-45,startX:0,startY:rowY(2)-45,targetX:1200,targetY:rowY(2)-45,targetId:0,age:0,duration:3,damage:20,powered:false,returning:false,hits:[],dx:1,dy:0});tick(g,.02);assert.equal(g.kongfu.reflected.find(p=>p.name==='boomerang')!.vx,-656);
 tick(g,4);assert.equal(z.kongfu!.animation,'Resting');tick(g,3);assert.equal(z.kongfu!.animation,'Walk');
});
test('rocket raids fly, land at plants and can be chilled',()=>{
 const g=create(4);g.graves=[];const z=g.spawnZombie('kongfu_rocket_imp',2,cellX(7),'raid'),x=z.x;tick(g,.5);assert.ok(x-z.x>100);assert.equal(z.kongfu!.flying,true);
 g.chill(z,5);assert.equal(z.kongfu!.animation,'Drop');assert.equal(z.kongfu!.flying,false);tick(g,2);assert.equal(z.kongfu!.animation,'Walk');
 const other=g.spawnZombie('kongfu_rocket_imp',1,cellX(3)+50,'raid');g.addPlant('wallnut',1,3);tick(g,.2);assert.equal(other.kongfu!.animation,'Drop');assert.equal(other.kongfu!.rocket,false);
});
test('TNT torch ignition, iceburg extinction and explosion loss',()=>{
 const g=create(6),t=g.kongfu.tnt[2],z=g.spawnZombie('kongfu_torch',2,g.kongfu.tip(t));tick(g,.02);assert.equal(t.lit,true);assert.equal(z.kongfu!.torch,false);
 tick(g,3);assert.equal(t.lit,false);assert.equal(g.phase,'playing');assert.ok(!g.plants.some(p=>p.kind==='iceburg'));
 const other=g.kongfu.tnt[0];other.lit=true;other.length=.05;tick(g,.5);assert.equal(g.phase,'lost');assert.equal(g.lossReason,'tnt');
});
test('wave taichi is a tile and keeps plants; sun and loss objectives fail correctly',()=>{
 const g=create(6);g.addPlant('bonkchoy',1,1);g.wave=7;for(let i=0;i<3600&&g.wave===7;i++)g.tick(1/60);assert.ok(g.kongfu.tiles.some(t=>t.column===1&&t.row===1));assert.ok(g.plants.some(p=>p.row===1&&p.column===1));assert.ok(!g.graves.some(t=>t.kind==='taichitile'));
 const a=create(5);a.wave=a.level.waves.length;tick(a,.1);assert.equal(a.lossReason,'sunProduced');
 const b=create(5);for(let row=0;row<3;row++){b.addPlant('peashooter',row,0);b.plants.at(-1)!.hp=0;}tick(b,.1);assert.equal(b.lossReason,'plantsLost');
});
