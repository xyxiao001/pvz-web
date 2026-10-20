import test from 'node:test';import assert from 'node:assert/strict';
import {create,level,props,read,tick} from './kongfu-fixture';
import {cellX,rowY,type PlantKind} from '../src/game/level';
import {BATTLE_LEVELS} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
for(const day of [42,43,44,45,46])test(`Kongfu ${day}: controlled damage reaches settlement and resources resolve`,()=>{
 const g=create(day);g.preparing=false;
 for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);
 const config=BATTLE_LEVELS[`kongfu${day}`],l=level(day),catalogs=['battle','campaign',...config.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...(l.preset??[]),...l.protectedPlants.map(p=>p.kind),...l.initialPlants.map(p=>p.kind),...(l.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...l.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 for(const name of battleActors(l,plants)){const spec=actors[name],sk=read(spec?`${spec.group}/rigs/${spec.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(spec?sk.armature.some((a:{name:string})=>a.name===spec.armature):sk.armature.length,name);}
 for(const name of battleEffects(l,plants))assert.ok(rigs[name],name);
});
test('42–46 preserve authored modes, objectives, dialogue and reward',()=>{
 assert.deepEqual([42,43,44,45,46].map(d=>level(d).waves.length),[18,16,15,18,14]);
 assert.deepEqual(level(42).lastStand,{sun:2250,food:2});assert.equal(level(43).graves.filter(t=>t.kind==='kongfu_rack_3section_staff').length,3);
 assert.equal(level(44).conveyor!.InitialPlantList.length,0);assert.ok(read('kongfu/catalog.json').narratives.KONGFU_44_INTRO.length);
 assert.deepEqual(level(46).preset,['goldleaf','solarsage','cantaloupe','bamboozle','turnip','iceburg']);assert.equal(BATTLE_LEVELS.kongfu46.firstReward!.plant,'cantaloupe');
});
test('44 grants two independently capped cantaloupe deliveries',()=>{
 const g=create(44);Object.assign(g,{nextWave:Infinity});g.conveyorPlants=g.level.actions.flat().flatMap(a=>a.add??[]).filter(p=>p.PlantType==='cantaloupe');assert.equal(g.conveyorPlants.length,2);
 tick(g,35);assert.equal(g.conveyor.filter(c=>c.kind==='cantaloupe').length,2);
});
test('cantaloupe splashes three lanes without reflection and plant food throws across the board',()=>{
 const g=create(46);Object.assign(g,{nextWave:Infinity});g.graves=[];g.addPlant('cantaloupe',2,1);
 const targets=[1,2,3].map(row=>g.spawnZombie('abbot_3section_staff',row,cellX(5)));for(const z of targets){Object.assign(z.kongfu!,{animation:'RotateLoop',elapsed:0});z.frozenUntil=100;}
 tick(g,2);assert.ok(targets.every(z=>z.hp===800));assert.equal(g.kongfu.reflected.length,0);
 g.food=1;assert.equal(g.plantFood(2,1),true);tick(g,3);assert.ok(targets.every(z=>z.hp<=0));assert.equal(g.plants[0].action,'idle');
});
test('staff rack equips an abbot, reflects peas, strikes, leaps and breaks at half health',()=>{
 const g=create(43);Object.assign(g,{nextWave:Infinity});g.graves=[];g.graves.push({id:g.nextEntityId(),row:2,column:6,hp:1000,kind:'kongfu_rack_3section_staff'} as typeof g.graves[number]);
 const z=g.spawnZombie('abbot',2,cellX(6));tick(g,.1);assert.equal(z.kind,'abbot_3section_staff');
 const pea={id:g.nextEntityId(),x:z.x-50,y:rowY(2)-45,row:2,damage:20,powered:false,age:0};g.peas.push(pea as typeof g.peas[number]);g.kongfu.staff.tick();assert.equal(z.kongfu!.animation,'RotateStart');
 g.peas=[];tick(g,1);assert.equal(z.kongfu!.animation,'RotateLoop');g.peas.push({...pea,id:g.nextEntityId()});g.kongfu.staff.tick();assert.equal(g.peas.length,0);assert.ok(g.kongfu.reflected[0].vx<0);g.kongfu.reflected=[];
 tick(g,5);g.addPlant('wallnut',2,5);z.x=cellX(5)+35;tick(g,1.4);assert.equal(g.plants[0].hp,3600);tick(g,2.6);assert.ok(z.x<cellX(5)-60);
 g.damage(z,500);tick(g,6);assert.equal(g.kongfu.staff.states.get(z.id)!.broken,true);assert.ok(['Walk_B','Attack_B'].includes(z.kongfu!.animation));
});
