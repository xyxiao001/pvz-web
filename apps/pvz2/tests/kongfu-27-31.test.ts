import test from 'node:test';import assert from 'node:assert/strict';
import {create,level,props,read,tick} from './kongfu-fixture';
import {cellX,type PlantKind} from '../src/game/level';
import {BATTLE_LEVELS} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
for(const day of [27,28,29,30,31])test(`Kongfu ${day}: controlled damage reaches settlement and resources resolve`,()=>{
 const g=create(day);g.preparing=false;
 for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);
 const config=BATTLE_LEVELS[`kongfu${day}`],l=level(day),catalogs=['battle','campaign',...config.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...(l.preset??[]),...l.protectedPlants.map(p=>p.kind),...l.initialPlants.map(p=>p.kind),...(l.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...l.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 for(const name of battleActors(l,plants)){const spec=actors[name],sk=read(spec?`${spec.group}/rigs/${spec.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(spec?sk.armature.some((a:{name:string})=>a.name===spec.armature):sk.armature.length,name);}
 for(const name of battleEffects(l,plants))assert.ok(rigs[name],name);
});
test('27–31 preserve source modes, challenges, narratives and rewards',()=>{
 assert.deepEqual([27,28,29,30,31].map(d=>level(d).waves.length),[12,18,20,18,16]);
 assert.equal(level(27).conveyor!.InitialPlantList[0].PlantType,'lychee');
 assert.equal(level(28).flowerLine,3);assert.equal(level(28).maxPlants,12);
 assert.equal(level(29).mustProtect,5);assert.equal(level(29).protectedPlants.length,5);assert.ok(level(29).protectedPlants.every(p=>p.kind==='lychee'));
 assert.equal(level(30).maxSun,2850);assert.equal(level(30).mold.length,10);
 assert.deepEqual(level(31).preset,['sunshroom','akee','iceburg','powerlily','lychee','turnip']);
 for(const day of [27,29])assert.ok(read('kongfu/catalog.json').narratives[`KONGFU_${day}_INTRO`].length);
 assert.equal(BATTLE_LEVELS.kongfu29.firstReward!.plant,'lychee');assert.equal(BATTLE_LEVELS.kongfu30.firstReward!.image,'dangerroom_kongfu2');
 assert.ok(BATTLE_LEVELS.kongfu30.plants.some(p=>p.kind==='lychee'&&p.id===159));
});
test('lychee retaliates in three lanes, damages racks, and retaliates on lethal damage',()=>{
 const g=create(28);g.graves=[];g.zombies=[];g.addPlant('lychee',2,4);const p=g.plants[0];
 const near=g.spawnZombie('monk',1,cellX(5)),far=g.spawnZombie('monk',4,cellX(4));
 g.graves.push({id:g.nextEntityId(),row:2,column:5,hp:1000,kind:'kongfu_rack_blade'} as typeof g.graves[number]);
 p.hp-=200;g.kongfu.lychee.settle();assert.equal(near.hp,props.zombies.monk.Toughness-40);assert.equal(far.hp,props.zombies.monk.Toughness);assert.equal(g.graves[0].hp,960);
 p.hp=0;g.kongfu.lychee.settle();assert.ok(near.hp<=0);assert.equal(g.graves[0].hp,400);
});
test('lychee food restores health, halves incoming damage and strengthens retaliation; damaged shells can be repaired',()=>{
 const g=create(28);g.graves=[];g.zombies=[];g.addPlant('lychee',2,4);const p=g.plants[0];p.hp=2400;g.kongfu.lychee.settle();g.sun=1000;
 assert.equal(g.plant('lychee',2,4),true);assert.equal(p.hp,3000);assert.equal(g.plants.length,1);
 p.hp=1000;g.food=2;assert.equal(g.plantFood(2,4),true);assert.equal(p.hp,3000);assert.equal(g.future.plantDamageScale(p),.5);assert.equal(g.plantFood(2,4),false);assert.equal(g.food,1);
 const z=g.spawnZombie('monk',2,cellX(4)+30);tick(g,.1);assert.ok(p.hp>2990&&p.hp<3000);assert.equal(z.hp,props.zombies.monk.Toughness-40);assert.equal(g.kongfu.lychee.hits.at(-1)!.metal,true);
});
