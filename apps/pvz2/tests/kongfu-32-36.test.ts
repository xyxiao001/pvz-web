import test from 'node:test';import assert from 'node:assert/strict';
import {create,level,props,read,tick} from './kongfu-fixture';
import {cellX,type PlantKind} from '../src/game/level';
import {BATTLE_LEVELS} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
for(const day of [32,33,34,35,36])test(`Kongfu ${day}: controlled damage reaches settlement and resources resolve`,()=>{
 const g=create(day);g.preparing=false;
 for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);
 const config=BATTLE_LEVELS[`kongfu${day}`],l=level(day),catalogs=['battle','campaign',...config.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 if(day===32)actors.boss=actors.bossBlade;
 const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...(l.preset??[]),...l.protectedPlants.map(p=>p.kind),...l.initialPlants.map(p=>p.kind),...(l.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...l.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 for(const name of battleActors(l,plants)){const spec=actors[name],sk=read(spec?`${spec.group}/rigs/${spec.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(spec?sk.armature.some((a:{name:string})=>a.name===spec.armature):sk.armature.length,name);}
 for(const name of battleEffects(l,plants))assert.ok(rigs[name],name);
});
test('32–36 retain native modes, rails, narrative, reward and delayed qigong strikes',()=>{
 assert.deepEqual([32,33,34,35,36].map(d=>level(d).waves.length),[0,14,16,18,18]);
 assert.equal(level(32).boss!.kind,'kongfu_boss_blade');assert.equal(level(32).graves.length,0);assert.ok(level(32).rails);
 assert.deepEqual(level(34).preset,['sunshroom','threepeater','citron','wallnut','iceburg','solarsage']);
 assert.equal(BATTLE_LEVELS.kongfu34.firstReward!.plant,'solarsage');assert.ok(BATTLE_LEVELS.kongfu35.plants.some(p=>p.kind==='solarsage'&&p.id===161));
 for(const d of [33,34,35,36])assert.equal(level(d).world,'kongfu');
 for(const key of ['KONGFU_INTRO_BOSS2','KONGFU_OUTRO_BOSS2','KONGFU_33_INTRO','KONGFU_34_INTRO','KONGFU_35_INTRO'])assert.ok(read('kongfu/catalog.json').narratives[key].length);
 assert.deepEqual(level(35).actions.flat().find(a=>a.mode==='qigong')!.qigong,[{Type:'abbot_imp',Delay:2,Rows:[1],Columns:[5]}]);
});
test('Solar Sage converts a nearby enemy into a sun producer, and food converts three without consuming the plant',()=>{
 const g=create(34);g.graves=[];g.zombies=[];g.addPlant('solarsage',2,4);const p=g.plants[0],z=g.spawnZombie('abbot_armor2',2,cellX(4));tick(g,2.3);
 assert.ok(z.hp<=0);assert.ok(p.hp<=0);assert.equal(g.kongfu.sage.spirits.length,1);tick(g,7);assert.equal(g.sunProduced,50);
 g.addPlant('solarsage',2,1);const foodPlant=g.plants.find(p=>p.kind==='solarsage')!;
 for(const row of [0,1,3,4])g.spawnZombie('abbot',row,cellX(7));g.food=1;assert.equal(g.plantFood(2,1),true);tick(g,2.3);
 assert.equal(g.kongfu.sage.spirits.length,4);assert.ok(foodPlant.hp>0);assert.equal(foodPlant.action,'idle');
});
test('abbots equip racks; torch breath burns plants and cold extinguishes it',()=>{
 const g=create(33);g.graves=[];g.zombies=[];g.graves.push({id:g.nextEntityId(),row:2,column:5,hp:1000,kind:'kongfu_rack_torch'} as typeof g.graves[number]);const z=g.spawnZombie('abbot',2,cellX(5)+10);g.addPlant('wallnut',2,3);tick(g,1.2);
 assert.equal(z.kind,'abbot_torch');assert.ok(g.plants[0].hp<props.plants.wallnut.Toughness);g.chill(z,10);const hp=g.plants[0].hp;tick(g,.2);assert.equal(g.plants[0].hp,hp);
});
test('qigong imp lands and shields; chi abbot stays in place and pushes a plant',()=>{
 const g=create(36);g.graves=[];g.zombies=[];const imp=g.spawnZombie('abbot_imp',0,cellX(5),'ground');tick(g,2);
 assert.equal(imp.kongfu!.animation,'ShieldLoop');const hp=imp.hp;g.damage(imp,100);assert.equal(imp.hp,hp-40);
 g.addPlant('wallnut',2,5);const p=g.plants[0],chi=g.spawnZombie('abbot_chi',2,cellX(10));tick(g,11);
 assert.equal(chi.x,cellX(8));assert.equal(p.column,4);assert.equal(p.hp,props.plants.wallnut.Toughness-200);
 assert.equal(g.kongfu.abbots.canPlant('wallnut',2,8),false);assert.equal(g.kongfu.abbots.canPlant('solarsage',2,8),true);
});
