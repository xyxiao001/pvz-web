import test from 'node:test';import assert from 'node:assert/strict';
import {create,level,props,read,tick} from './kongfu-fixture';
import {cellX,type PlantKind} from '../src/game/level';
import {BATTLE_LEVELS} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {ProgressStore} from '../src/shell/progression';
test('native waves, chooser, last stand and rewards',()=>{
 assert.deepEqual([7,8,9,10,11].map(d=>level(d).waves.length),[16,12,14,14,18]);
 assert.deepEqual(level(7).chooserPlants,['snowpea']);assert.equal(level(8).bronzeStatues.length,4);assert.ok(battleEffects(level(8),[]).includes('zombossicon'));
 assert.deepEqual(level(10).lastStand,{sun:2500,food:1});assert.equal(level(10).sunDrops,false);
 assert.equal(BATTLE_LEVELS.kongfu8.firstReward.image,'worldkey');assert.equal(BATTLE_LEVELS.kongfu10.firstReward.plant,'bambooshoot');assert.ok(BATTLE_LEVELS.kongfu11.plants.some(p=>p.kind==='bambooshoot'));
 for(const d of [8,11])assert.ok(read('kongfu/catalog.json').narratives[`KONGFU_${d}_INTRO`].length);
 const data=new Map<string,string>(),store=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v)},removeItem:k=>{data.delete(k)}});store.finish('kongfu','kongfu8');assert.ok(store.campaignRewards().some(r=>r.level==='kongfu8'&&r.id==='worldkey'));
});
for(const day of [7,8,9,10,11])test(`Kongfu ${day}: controlled damage reaches settlement and resources resolve`,()=>{
 const g=create(day);g.preparing=false;
 for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);
 const config=BATTLE_LEVELS[`kongfu${day}`],l=level(day),catalogs=['campaign',...config.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...l.initialPlants.map(p=>p.kind),...(l.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...l.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 for(const name of battleActors(l,plants)){const spec=actors[name],sk=read(spec?`${spec.group}/rigs/${spec.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(spec?sk.armature.some((a:{name:string})=>a.name===spec.armature):sk.armature.length,name);}
 for(const name of battleEffects(l,plants))assert.ok(rigs[name],name);
});
test('bomb contact explosion, cold extinguishing and fire ignition',()=>{
 const g=create(7);g.graves=[];g.addPlant('wallnut',2,3);const z=g.spawnZombie('kongfu_bomb',2,cellX(3)+20);tick(g,.1);assert.equal(z.kongfu!.animation,'Explode');g.chill(z,5);tick(g,2.1);assert.ok(g.plants[0].hp>0);assert.equal(z.kongfu!.ignited,false);g.kongfu.heat(z);tick(g,5);assert.ok(!g.plants.some(p=>p.column===3&&p.row===2));assert.ok(z.hp<=0);
});
test('drink reduces damage and accelerates after drinking',()=>{
 const g=create(9);g.graves=[];const z=g.spawnZombie('kongfu_drink',2,cellX(6));g.damage(z,310);tick(g,.1);assert.equal(z.kongfu!.animation,'Drink');const hp=z.hp;g.damage(z,40);assert.equal(z.hp,hp-10);tick(g,4.5);assert.equal(z.kongfu!.drunk,true);const x=z.x;tick(g,1);assert.ok(x-z.x>30);const hp2=z.hp;g.damage(z,40);assert.equal(z.hp,hp2-20);
});
test('statues retain damage on awakening and strong zombies smash',()=>{
 const g=create(8),z=g.zombies[1];assert.equal(z.kind,'kongfu_bronze_statue');g.damage(z,4500);g.freeze(z,100);assert.equal(z.frozenUntil,0);z.kongfu!.life=.05;tick(g,.1);assert.equal(z.kind,'kongfu_bronze_strong');assert.equal(z.hp,3000);tick(g,3.6);g.addPlant('wallnut',z.row,6);tick(g,1.5);assert.ok(g.plants[0].hp<props.plants.wallnut.Toughness);
});
test('gong summons bombs, helmets replace armor and flags call reinforcements',()=>{
 const g=create(11);g.graves=[];const z=g.spawnZombie('kongfu_gong',2,cellX(6));z.kongfu!.next=0;tick(g,2);assert.ok(g.zombies.filter(z=>z.kind==='kongfu_bomb').length>=2);
 const base=g.spawnZombie('kongfu_armor1',0,cellX(4));g.graves.push({id:g.nextEntityId(),row:0,column:4,kind:'kongfu_rack_helmet',hp:800,stage:0});tick(g,.1);assert.equal(base.kind,'kongfu_armor3');assert.equal(base.armor,1600);
 base.armor=0;g.graves.push({id:g.nextEntityId(),row:0,column:4,kind:'kongfu_rack_flag',hp:800,stage:0});const count=g.zombies.length;tick(g,.1);assert.equal(base.kind,'kongfu_flag');assert.equal(g.zombies.length,count+3);
});
test('bamboo hits on outward and return sweeps; plantfood reaches distant targets',()=>{
 const g=create(11);g.graves=[];g.addPlant('bambooshoot',2,1);const p=g.plants[0],z=g.spawnZombie('kongfu_armor2',2,cellX(3));z.frozenUntil=100;const hp=z.hp+z.armor;tick(g,2.5);assert.equal(z.hp+z.armor,hp-60);
 const far=g.spawnZombie('kongfu_armor2',2,cellX(8));far.frozenUntil=100;const before=far.hp+far.armor;g.kongfu.bamboo.start(p,true);tick(g,1.2);assert.ok(far.hp+far.armor<before);
});
