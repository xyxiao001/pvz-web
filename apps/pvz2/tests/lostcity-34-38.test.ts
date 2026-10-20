import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {create,level,tick} from './lostcity-fixture';
import {cellX,type PlantKind} from '../src/game/level';
import {BATTLE_LEVELS} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {ProgressStore} from '../src/shell/progression';
const days=[34,35,36,37,38];
const read=(path:string)=>JSON.parse(readFileSync(new URL('../public/assets/'+path,import.meta.url),'utf8'));
test('Lost City 34–38 native configuration and rewards',()=>{
 assert.deepEqual(days.map(d=>level(d).goldTiles.length),[10,5,0,10,8]);
 assert.equal(level(34).mold.length,20);assert.equal(level(37).mold.length,10);
 assert.equal(level(35).trapTiles.length,6);assert.equal(level(35).protectedPlants.length,3);assert.equal(level(35).mustProtect,5);
 assert.deepEqual(level(37).preset,['sunflower','zoybeanpod','snowpea','chilibean','stunion']);
 assert.deepEqual(level(36).conveyor!.InitialPlantList.map(p=>p.PlantType),['repeater','bloominghearts']);
 assert.ok(read('lostcity/catalog.json').narratives.LOSTCITY_37_INTRO.length);
 const data=new Map<string,string>(),p=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 for(const d of [34,35,36,38]){p.finish('lostcity','lostcity'+d);p.finish('lostcity','lostcity'+d);}assert.equal(p.campaignRewards().length,4);
});
for(const day of days)test(`Lost City ${day} controlled-damage settlement smoke`,()=>{
 const g=create(day);for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);
});
test('Lost City 35 protection is checked when an authored nut dies',()=>{const g=create(35);tick(g,.1);assert.equal(g.phase,'playing');g.plants.find(p=>p.endangered)!.hp=0;tick(g,.1);assert.equal(g.lossReason,'protected');});
test('Thunder reaches gold tiles, bypasses bricks and leaves temporary scorched cells',()=>{
 const g=create(35),z=g.spawnZombie('lostcity_armor4',0,cellX(6));assert.equal(z.armor,2200);g.addPlant('puffshroom',2,1);tick(g,1);
 assert.ok(z.hp<=0);assert.equal(z.armor,2200);assert.ok(g.lostcity.cracks.some(c=>c.row===0&&c.column===6));assert.equal(g.plant('sunflower',0,6),false);tick(g,10);assert.equal(g.plant('sunflower',0,6),true);
});
test('Blooming hearts increase subsequent damage and preserve conveyor changes',()=>{
 const g=create(36);g.addPlant('bloominghearts',1,1);const z=g.spawnZombie('lostcity_armor4',1,cellX(6));tick(g,2);assert.equal(z.heartDefence!.length,1);const before=z.armor;g.damage(z,90);assert.ok(Math.abs(before-z.armor-100)<.001);
 assert.deepEqual(g.level.actions[2].find(a=>a.mode==='conveyor')!.remove,[]);
});
test('Zoybean pod grows allies and plant food summons a smashing giant',()=>{
 const g=create(37);g.addPlant('zoybeanpod',2,1);tick(g,15);assert.ok(g.westFinale.allies.some(a=>a.kind.startsWith('zoybean')));
 g.food=1;assert.equal(g.plantFood(2,1),true);tick(g,2);const giant=g.westFinale.allies.find(a=>a.kind==='zoybean_gargantuar')!;assert.ok(giant);const target=g.spawnZombie('lostcity_armor4',2,giant.x+45);tick(g,2);assert.ok(target.armor<2200);assert.equal(giant.west!.imp,false);
});
test('Snow pea fires and chills enemies',()=>{const g=create(37);g.addPlant('snowpea',1,1);const z=g.spawnZombie('lostcity_armor4',1,cellX(5));tick(g,2);assert.ok(z.chilledUntil>g.time);g.food=1;assert.equal(g.plantFood(1,1),true);tick(g,4);assert.ok(z.armor<2100);});
for(const day of days)test(`Lost City ${day} required resource smoke`,()=>{
 const config=BATTLE_LEVELS[`lostcity${day}`],l=level(day),catalogs=['campaign',...config.bundles!].map(b=>read(b+'/catalog.json'));
 const actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...(l.preset??[]),...(l.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...l.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 for(const name of battleActors(l,plants)){const spec=actors[name],sk=read(spec?`${spec.group}/rigs/${spec.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(sk.armature.length,name);}
 for(const name of battleEffects(l,plants))assert.ok(rigs[name],name);
});

test('Veteran parachuters bring authored cargo to the specified cells',()=>{
 const g=create(37);g.wave=3;tick(g,15.6);
 assert.ok(g.zombies.some(z=>z.kind==='lostcity_lostpilot_veteran'&&z.row===4));
 assert.ok(g.zombies.some(z=>z.kind==='lostcity_impporter'&&z.row===4&&z.leap));
});
