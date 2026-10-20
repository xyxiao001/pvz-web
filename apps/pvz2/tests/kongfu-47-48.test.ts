import test from 'node:test';import assert from 'node:assert/strict';
import {create,level,props,read,tick} from './kongfu-fixture';
import {cellX,rowY,type PlantKind} from '../src/game/level';
import {BATTLE_LEVELS} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
for(const day of [47,48])test(`Kongfu ${day}: controlled damage reaches settlement and resources resolve`,()=>{
 const g=create(day);g.preparing=false;
 for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);
 const config=BATTLE_LEVELS[`kongfu${day}`],l=level(day),catalogs=['battle','campaign',...config.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 if(day===48)actors.boss=actors.bossChi;
 const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...(l.preset??[]),...l.protectedPlants.map(p=>p.kind),...l.initialPlants.map(p=>p.kind),...(l.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...l.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 for(const name of battleActors(l,plants)){const spec=actors[name],sk=read(spec?`${spec.group}/rigs/${spec.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(spec?sk.armature.some((a:{name:string})=>a.name===spec.armature):sk.armature.length,name);}
 for(const name of battleEffects(l,plants))assert.ok(rigs[name],name);
});

import {KongfuChiBoss} from '../src/game/kongfu-chi-boss';
test('47 and 48 preserve protection, TNT, dialogue, reward and conveyor',()=>{
 const l=level(47);assert.equal(l.waves.length,20);assert.equal(l.protectedPlants.length,5);assert.ok(l.protectedPlants.every(p=>p.kind==='iceburg'));
 assert.equal(level(47).tnt!.SpawnData.length,5);assert.equal(BATTLE_LEVELS.kongfu47.firstReward!.image,'dangerroom_kongfu3');assert.ok(BATTLE_LEVELS.kongfu47.plants.some(p=>p.id===164&&p.kind==='cantaloupe'));
 const boss=create(48).boss!;assert.ok(boss instanceof KongfuChiBoss);assert.equal(boss.zombie.hp,36000);assert.equal(level(48).conveyor!.InitialPlantList.length,8);
 const c=read('kongfu/catalog.json');assert.equal(c.narratives.KONGFU_INTRO_BOSS3.length,10);assert.equal(c.narratives.KONGFU_OUTRO_BOSS3.length,11);
});
test('47 bronze variant summons from its pool without torches',()=>{
 const g=create(47);Object.assign(g,{nextWave:Infinity});g.graves=[];const z=g.spawnZombie('kongfu_bronze_chi_without_torch',2,cellX(7));z.kongfu!.next=0;z.kongfu!.count=0;tick(g,4.4);
 const summoned=g.zombies.filter(a=>a!==z);assert.equal(summoned.length,3);assert.ok(summoned.every(a=>!a.kind.includes('torch')));
});
const setup=()=>{const g=create(48);g.graves=[];return {g,b:g.boss as KongfuChiBoss};};
const action=(b:KongfuChiBoss,animation:string)=>Object.assign(b,{animation,elapsed:0,cursor:0});
test('chi boss summons, launches racks and grants stage shield',()=>{
 const {g,b}=setup();Object.assign(b,{previous:b.current.Actions.find(a=>a.actionName==='summon')});action(b,'Summon');tick(g,2.7);assert.ok(g.zombies.length>1);
 b.targets=[{row:0,column:1}];action(b,'Shoot');tick(g,4.4);assert.ok(g.graves.some(t=>t.column===1&&t.row===0&&t.kind!.startsWith('kongfu_rack')));
 action(b,'Idle');b.hit(100000);assert.equal(b.stage,1);action(b,'StunEnd');tick(g,.5);assert.ok(b.shieldLeft>0);const hp=b.zombie.hp;b.hit(100000);assert.equal(b.zombie.hp,hp);
});
test('chi ray damages its nearest plant; roar pauses plants and damages racks',()=>{
 const {g,b}=setup();g.addPlant('tallnut',b.zombie.row,4);const p=g.plants[0],hp=p.hp;action(b,'RushStart');tick(g,2.2);assert.equal(b.animation,'RushLoop');assert.ok(p.hp<hp);
 g.graves.push({id:g.nextEntityId(),row:0,column:0,hp:2000,stage:0,kind:'kongfu_rack_torch'});action(b,'Roar');tick(g,2.8);assert.equal(g.graves[0].hp,1000);assert.equal(b.plantStunned(p),true);
});
test('chi absorption pulls plants and turnip blocks the path',()=>{
 const {g,b}=setup();g.addPlant('wallnut',b.zombie.row,1);const p=g.plants[0];action(b,'HoleStart');tick(g,2.2);assert.ok(p.column>1);
 const other=setup();other.g.addPlant('wallnut',other.b.zombie.row,1);other.g.addPlant('turnip',other.b.zombie.row,3);action(other.b,'HoleStart');tick(other.g,2.2);assert.equal(other.g.plants[0].column,1);
});

test('48 cart carries a plant along the authored rail',()=>{
 const g=create(48);g.addPlant('cantaloupe',2,1);assert.equal(g.cowboy.select(2,1),true);assert.equal(g.cowboy.move(4),true);assert.equal(g.plants[0].row,4);assert.equal(g.cowboy.carts[0].row,4);
});
