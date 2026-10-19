import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {create,level,tick} from './lostcity-fixture';
import {cellX,type PlantKind} from '../src/game/level';
import {BATTLE_LEVELS} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {ProgressStore} from '../src/shell/progression';
const days=[19,20,21,22,23];
const read=(path:string)=>JSON.parse(readFileSync(new URL('../public/assets/'+path,import.meta.url),'utf8'));
test('Lost City 19–23 native challenges, narratives and rewards',()=>{
 assert.deepEqual(days.map(d=>level(d).waves.length),[10,15,12,12,12]);
 assert.deepEqual(days.map(d=>level(d).goldTiles.length),[8,13,10,0,7]);
 assert.deepEqual(level(21).preset,['sunbean','toadstool','stallia']);
 assert.deepEqual(level(22).preset,['sunshroom','redstinger','stallia','puffshroom','iceburg']);
 assert.equal(level(22).trapTiles.length,5);assert.equal(create(20).graves.length,0);
 assert.equal(BATTLE_LEVELS.lostcity19.firstReward.plant,'stallia');
 const catalog=read('lostcity/catalog.json');assert.ok(catalog.narratives[BATTLE_LEVELS.lostcity22.narrative!].length);assert.ok(catalog.narratives[BATTLE_LEVELS.lostcity20.outro!].length);
 const data=new Map<string,string>(),p=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 for(const day of [20,23]){p.finish('lostcity','lostcity'+day);p.finish('lostcity','lostcity'+day);}
 assert.deepEqual(p.campaignRewards().map(r=>r.id),['dangerroom_lostcity','spine_lostcity']);
});
for(const day of days)test(`Lost City ${day} controlled-damage settlement smoke`,()=>{
 const g=create(day);for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);
});
test('Toadstool swallows armored zombies then produces sun after digestion',()=>{
 const g=create(21);g.addPlant('toadstool',2,1);const z=g.spawnZombie('lostcity_armor2',2,cellX(4));tick(g,2);assert.ok(!g.zombies.includes(z));
 assert.equal(g.toadstool.states.get(g.plants[0].id)!.chews.length,1);tick(g,31);assert.ok(g.suns.some(s=>s.from==='plant'&&s.value===50));
});
test('Toadstool plant food reaches other lanes and produces sun',()=>{
 const g=create(21);g.addPlant('toadstool',2,1);g.food=1;assert.ok(g.plantFood(2,1));const zombies=[0,1,3,4].map(r=>g.spawnZombie('lostcity',r,cellX(4)));tick(g,12);assert.ok(zombies.every(z=>!g.zombies.includes(z)));assert.ok(g.suns.some(s=>s.from==='plant'));
});
test('Trap tiles activate from plants or grounded zombies and recover after 7.5 seconds',()=>{
 const g=create(22);g.addPlant('puffshroom',0,4);const z=g.spawnZombie('lostcity_armor2',0,cellX(6));tick(g,.3);assert.ok(z.hp<=0);assert.ok(!g.plants.some(p=>p.row===0));assert.equal(g.lostcity.flames.length,1);
 g.addPlant('puffshroom',2,4);tick(g,.1);assert.equal(g.lostcity.boulders.length,1);const victim=g.spawnZombie('lostcity',3,cellX(5));tick(g,4);assert.ok(victim.hp<=0);
 const airborne=g.spawnZombie('lostcity_bug',4,cellX(4));tick(g,.1);assert.ok(airborne.hp>0);assert.ok(!g.lostcity.trapCooldown.has(4));
 tick(g,3.5);g.spawnZombie('lostcity',0,cellX(4));tick(g,.1);assert.ok(g.lostcity.flames.some(f=>f.row===0));
});
test('Relic hunter swings into an authored landing column then walks',()=>{
 const g=create(23),z=g.spawnZombie('lostcity_relichunter',2,1100);assert.ok([3,4,5].some(c=>z.x===cellX(c)));assert.ok(z.swing);const x=z.x;tick(g,4);assert.equal(z.x,x);tick(g,1);assert.equal(z.swing,undefined);assert.ok(z.x<x);
});
for(const day of days)test(`Lost City ${day} required resource smoke`,()=>{
 const config=BATTLE_LEVELS[`lostcity${day}`],l=level(day),catalogs=['campaign',...config.bundles!].map(b=>read(b+'/catalog.json'));
 const actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...(l.preset??[])])];
 for(const name of battleActors(l,plants)){const spec=actors[name],sk=read(spec?`${spec.group}/rigs/${spec.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(sk.armature.length,name);}
 for(const name of battleEffects(l,plants))assert.ok(rigs[name],name);
});
