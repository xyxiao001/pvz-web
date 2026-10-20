import test from 'node:test';import assert from 'node:assert/strict';
import {create,level,props,read,tick} from './kongfu-fixture';
import {cellX,type PlantKind} from '../src/game/level';
import {BATTLE_LEVELS} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
for(const day of [37,38,39,40,41])test(`Kongfu ${day}: controlled damage reaches settlement and resources resolve`,()=>{
 const g=create(day);g.preparing=false;if(day===37){g.dropSun(cellX(0),0,g.level.targetSun!,'plant');for(let i=0;i<8;i++)g.spawnZombie('abbot',0,cellX(8));}
 for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);
 const config=BATTLE_LEVELS[`kongfu${day}`],l=level(day),catalogs=['battle','campaign',...config.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 if(day===32)actors.boss=actors.bossBlade;
 const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...(l.preset??[]),...l.protectedPlants.map(p=>p.kind),...l.initialPlants.map(p=>p.kind),...(l.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...l.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 for(const name of battleActors(l,plants)){const spec=actors[name],sk=read(spec?`${spec.group}/rigs/${spec.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(spec?sk.armature.some((a:{name:string})=>a.name===spec.armature):sk.armature.length,name);}
 for(const name of battleEffects(l,plants))assert.ok(rigs[name],name);
});
test('37–41 retain objectives, protected turnips, authored waves, statues and fan racks',()=>{
 assert.deepEqual([37,38,39,40,41].map(d=>level(d).waves.length),[10,12,16,12,14]);
 assert.equal(level(37).targetSun,4750);assert.equal(level(38).protectedPlants.length,5);
 assert.deepEqual(level(39).preset,['twinsunflower','solarsage','firegourd','snowpea','turnip','stunion']);
 assert.equal(level(40).bronzeStatues.length,15);assert.ok(battleEffects(level(40),[]).includes('zombossicon'));assert.ok(level(41).graves.some(t=>t.kind==='kongfu_rack_fan'));
 for(const key of ['KONGFU_38_INTRO','KONGFU_40_INTRO'])assert.ok(read('kongfu/catalog.json').narratives[key].length);
});
test('Bamboozle fires five baskets, protects a turnip, reloads and launches plant food in five lanes',()=>{
 const g=create(38);g.graves=[];g.zombies=[];g.addPlant('bamboozle',2,1);const bamboo=g.plants.find(p=>p.kind==='bamboozle')!,turnip=g.plants.find(p=>p.kind==='turnip'&&p.row===2)!;
 for(let i=0;i<5;i++){assert.equal(g.kongfu.bamboozle.select(2,1),true);assert.equal(g.kongfu.bamboozle.fire(2,4),true);tick(g,.6);}
 assert.equal(g.kongfu.bamboozle.select(2,1),false);assert.equal(g.kongfu.bamboozle.states.get(bamboo.id)!.left,0);
 const basket=g.plants.find(p=>p.kind==='bamboobusket')!;assert.equal(basket.hp,2000);const z=g.spawnZombie('abbot',2,cellX(4)+10);tick(g,1);assert.ok(basket.hp<2000);assert.equal(turnip.hp,props.plants.turnip.Toughness);z.hp=0;
 g.kongfu.bamboozle.repair(bamboo);assert.equal(g.kongfu.bamboozle.states.get(bamboo.id)!.left,5);g.food=1;assert.equal(g.plantFood(2,1),true);tick(g,1.2);assert.equal(g.plants.filter(p=>p.kind==='bamboobusket').length,5);assert.equal(bamboo.action,'idle');assert.equal(g.kongfu.bamboozle.select(2,1),true);bamboo.hp=0;tick(g,.1);assert.equal(g.kongfu.bamboozle.selected,null);
});
test('fan rack equips an abbot and its storm moves one walking ally forward',()=>{
 const g=create(41);g.graves=[];g.zombies=[];g.graves.push({id:g.nextEntityId(),row:2,column:8,hp:1000,kind:'kongfu_rack_fan'} as typeof g.graves[number]);const fan=g.spawnZombie('abbot',2,cellX(8)),ally=g.spawnZombie('abbot_armor2',2,cellX(6));tick(g,.1);assert.equal(fan.kind,'abbot_fan');fan.kongfu!.next=0;tick(g,4);assert.ok(g.kongfu.abbots.storms.some(s=>s.carrying===ally.id));assert.ok(ally.x<cellX(4));tick(g,2);assert.equal(g.kongfu.abbots.carried(ally),false);
});
test('bronze chi awakens, summons three allies, then pulls a plant',()=>{
 const g=create(40);g.graves=[];g.zombies=[];const statue=g.spawnZombie('kongfu_bronze_statue',2,cellX(7));Object.assign(statue.kongfu!,{life:.01,duration:1,awakens:'kongfu_bronze_chi'});tick(g,3.6);assert.equal(statue.kind,'kongfu_bronze_chi');statue.kongfu!.next=0;statue.kongfu!.count=0;tick(g,4.4);assert.equal(g.zombies.length,4);
 g.zombies=[statue];g.addPlant('wallnut',2,2);const p=g.plants[0];statue.kongfu!.next=0;statue.kongfu!.count=1;tick(g,3.5);assert.equal(p.column,3);
});
