import test from 'node:test';import assert from 'node:assert/strict';
import {create,level,props,read,tick} from './kongfu-fixture';
import {cellX,rowY,type PlantKind} from '../src/game/level';
import {BATTLE_LEVELS} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
for(const day of [17,18,19,20,21])test(`Kongfu ${day}: controlled damage reaches settlement and resources resolve`,()=>{
 const g=create(day);g.preparing=false;
 for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);
 const config=BATTLE_LEVELS[`kongfu${day}`],l=level(day),catalogs=['battle','campaign',...config.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...(l.preset??[]),...l.protectedPlants.map(p=>p.kind),...l.initialPlants.map(p=>p.kind),...(l.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...l.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 for(const name of battleActors(l,plants)){const spec=actors[name],sk=read(spec?`${spec.group}/rigs/${spec.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(spec?sk.armature.some((a:{name:string})=>a.name===spec.armature):sk.armature.length,name);}
 for(const name of battleEffects(l,plants))assert.ok(rigs[name],name);
});
test('17–21 preserve Monk stage, waves, conveyor, racks and peach reward',()=>{
 assert.deepEqual([17,18,19,20,21].map(d=>level(d).waves.length),[12,16,12,18,15]);
 for(const day of [17,18,19,20,21]){assert.equal(level(day).world,'kongfu');assert.equal(level(day).mowers,true);}
 assert.equal(level(19).conveyor!.InitialPlantList[0].PlantType,'peach');assert.equal(BATTLE_LEVELS.kongfu19.firstReward.plant,'peach');assert.ok(BATTLE_LEVELS.kongfu20.plants.some(p=>p.id===76&&p.kind==='peach'));
 assert.ok(level(21).graves.some(t=>t.kind==='kongfu_rack_nunchaku'));assert.equal(level(21).taichiTiles.length,1);
 assert.ok(level(18).actions.flat().some(a=>a.mode==='raid'&&a.zombies.some(z=>z.kind==='kongfu_rocket_imp')));
 for(const name of ['KONGFU_17_INTRO','KONGFU_19_INTRO'])assert.ok(read('kongfu/catalog.json').narratives[name].length);
});
test('monks take blades and nunchaku from racks; blade and torch use native damage',()=>{
 const g=create(21);g.graves=g.graves.filter(t=>t.kind==='kongfu_rack_blade'||t.kind==='kongfu_rack_nunchaku');
 const zombies=g.graves.map(t=>g.spawnZombie('monk',t.row,cellX(t.column)+10));tick(g,.1);
 assert.ok(zombies.some(z=>z.kind==='monk_blade'));assert.ok(zombies.some(z=>z.kind==='monk_nunchaku'));assert.ok(g.graves.every(t=>t.hp<=0));
 const h=create(20);h.graves=[];h.addPlant('wallnut',2,2);const p=h.plants[0];h.spawnZombie('monk_blade',2,cellX(2)+40);tick(h,1.4);assert.equal(p.hp,props.plants.wallnut.Toughness-250);
 const f=create(20);f.graves=[];f.addPlant('wallnut',2,2);const q=f.plants[0],z=f.spawnZombie('monk_torch',2,cellX(2)+40);tick(f,1);assert.ok(q.hp<props.plants.wallnut.Toughness-900&&q.hp>0);f.chill(z,5);assert.equal(z.kongfu!.torch,false);
});
test('peach heals 3x3, protects allies and applies native plant food healing',()=>{
 const g=create(19);g.graves=[];g.addPlant('peach',2,2);g.addPlant('wallnut',2,3);const p=g.plants[0],nut=g.plants[1];nut.hp=1000;tick(g,1.1);assert.equal(nut.hp,1150);assert.ok(g.kongfu.peach.protected(nut));
 g.spawnZombie('monk_blade',2,cellX(3)+40);tick(g,1.4);assert.equal(nut.hp,1150);g.zombies=[];g.food=1;assert.equal(g.plantFood(p.row,p.column),true);tick(g,1);assert.equal(nut.hp,2500);tick(g,8);assert.ok(g.kongfu.peach.protected(nut));tick(g,4);assert.equal(g.kongfu.peach.protected(nut),false);assert.equal(p.action,'idle');
});
test('nunchaku reflects shots and removes plants; monk imp flies and lands at tallnuts',()=>{
 const g=create(21);g.graves=[];const z=g.spawnZombie('monk_nunchaku',2,cellX(5));g.peas.push({id:900,x:z.x-10,y:rowY(2)-45,row:2,damage:20,powered:false,snow:false});
 g.kongfu.tickCombat(1/60);assert.equal(z.kongfu!.animation,'RotateStart');tick(g,.4);assert.equal(z.kongfu!.animation,'RotateLoop');g.peas.push({id:901,x:z.x-10,y:rowY(2)-45,row:2,damage:20,powered:false,snow:false});g.kongfu.tickCombat(1/60);assert.equal(g.kongfu.reflected.at(-1)!.damage,60);
 const h=create(21);h.graves=[];h.addPlant('wallnut',2,2);h.spawnZombie('monk_nunchaku',2,cellX(2)+40);tick(h,2.2);assert.equal(h.plants.length,0);
 const f=create(20);f.graves=[];const imp=f.spawnZombie('monk_imp',2,cellX(8));imp.kongfu!.next=0;tick(f,4.5);assert.equal(imp.kongfu!.animation,'FloatLoop');assert.equal(imp.kongfu!.flying,true);f.addPlant('tallnut',2,5);imp.x=cellX(5)+40;tick(f,.1);assert.equal(imp.kongfu!.animation,'FloatInterupt');tick(f,2.5);assert.equal(imp.kongfu!.flying,false);
});
