import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {create,level,tick} from './lostcity-fixture';
import {cellX,type PlantKind} from '../src/game/level';
import {isFlying} from '../src/game/pirate';
import {BATTLE_LEVELS} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {ProgressStore} from '../src/shell/progression';
const days=[9,10,11,12,13];
const read=(path:string)=>JSON.parse(readFileSync(new URL('../public/assets/'+path,import.meta.url),'utf8'));
test('Lost City 9–13 retain native modes, waves, gold tiles and rewards',()=>{
 assert.deepEqual(days.map(d=>level(d).waves.length),[12,12,12,12,12]);
 assert.deepEqual(days.map(d=>level(d).goldTiles.length),[0,5,5,13,0]);
 assert.deepEqual(level(10).chooserPlants,['endurian']);assert.equal(level(12).targetSun,5000);
 assert.deepEqual(level(9).conveyor!.InitialPlantList.map(p=>p.PlantType),['endurian']);
 assert.deepEqual(level(13).conveyor!.InitialPlantList.map(p=>p.PlantType),['akee','melonpult','redstinger','repeater','spikerock']);
 assert.equal(BATTLE_LEVELS.lostcity10.firstReward.plant,'endurian');assert.equal(BATTLE_LEVELS.lostcity13.night,true);
 const data=new Map<string,string>(),p=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 p.finish('lostcity','lostcity12');p.finish('lostcity','lostcity12');assert.deepEqual(p.campaignRewards().map(r=>r.id),['spine_lostcity']);
});
for(const day of days)test(`Lost City ${day} controlled-damage settlement smoke`,()=>{
 const g=create(day);
 if(day===12)for(let row=0;row<5;row++)for(let column=0;column<3;column++)g.addPlant('sunflower',row,column);
 for(let i=0;i<40000&&g.phase==='playing';i++){
  g.tick(1/60);
  for(const z of g.zombies)if(day===12&&g.wave===12&&g.sunProduced<5000)z.stunnedUntil=g.time+100;else g.damage(z,100000,'water');
 }
 assert.equal(g.phase,'won');assert.equal(g.wave,12);if(day===12)assert.ok(g.sunProduced>=5000);
});
test('Bug health shields body and armor without overflow; landing resumes ground movement',()=>{
 const g=create(11),z=g.spawnZombie('lostcity_bug_armor2',2,cellX(5)),armor=z.armor;
 g.damage(z,349);assert.equal(z.bug!.hp,1);assert.equal(z.hp,190);assert.equal(z.armor,armor);
 g.damage(z,500);assert.equal(z.hp,190);assert.equal(z.armor,armor);assert.equal(z.bug!.animation,'Land');
 tick(g,.2);assert.equal(isFlying(z),false);const x=z.x;tick(g,.5);assert.equal(z.x,x);tick(g,.5);assert.ok(z.x<x);
 g.damage(z,20);assert.equal(z.armor,armor-20);
});
test('Bugs pass wallnuts but descend to eat tallnuts',()=>{
 const g=create(11);g.addPlant('wallnut',1,4);g.addPlant('tallnut',3,4);
 const low=g.plants[0],tall=g.plants[1],a=g.spawnZombie('lostcity_bug',1,cellX(4)+40),b=g.spawnZombie('lostcity_bug',3,cellX(4)+35);
 tick(g,3);assert.ok(a.x<cellX(4));assert.equal(low.hp,g.props.plants.wallnut.Toughness);assert.ok(tall.hp<g.props.plants.tallnut.Toughness);assert.equal(b.eating,true);
});
test('Lost City giant burns plants, loses torch to cold, throws a Lost City imp once',()=>{
 const g=create(12);g.addPlant('endurian',2,4);const plant=g.plants[0],z=g.spawnZombie('lostcity_gargantuar',2,cellX(4)+60);
 tick(g,1.5);assert.ok(plant.hp<=0);assert.equal(g.lostcity.torches.get(z.id),true);
 g.chill(z,1);assert.equal(g.lostcity.torches.get(z.id),false);g.damage(z,1900);tick(g,5);
 const imps=g.zombies.filter(z=>z.kind==='lostcity_imp');assert.equal(imps.length,1);assert.equal(z.west!.imp,false);assert.equal(imps[0].leap,null);
});
for(const day of days)test(`Lost City ${day} required resource smoke`,()=>{
 const config=BATTLE_LEVELS[`lostcity${day}`],l=level(day),catalogs=['campaign',...config.bundles!].map(b=>read(b+'/catalog.json'));
 const actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...(l.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...l.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 for(const name of battleActors(l,plants)){const spec=actors[name],sk=read(spec?`${spec.group}/rigs/${spec.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(sk.armature.length,name);}
 for(const name of battleEffects(l,plants))assert.ok(rigs[name],name);
 if(day===12)assert.ok(battleActors(l,plants).includes('lostImp'));
});
