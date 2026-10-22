import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,props,read,tick} from './dino-fixture';
import {cellX,type PlantKind} from '../src/game/level';
import {BATTLE_LEVELS} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {LEVEL_ROUTES} from '../src/shell/navigation';
for(const day of [21,22,23,24,25])test(`Dino ${day}: controlled settlement and referenced resources`,()=>{
 const g=create(day);if(day===22)g.startLastStand();
 for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);assert.equal(LEVEL_ROUTES[`dino${day}`],`dino${day}`);
 const config=BATTLE_LEVELS[`dino${day}`],l=level(day),catalogs=['battle','campaign',...config.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...(l.chooserPlants??[]),...(l.preset??[]),...l.protectedPlants.map(p=>p.kind),...l.initialPlants.map(p=>p.kind),...(l.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...l.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 for(const name of battleActors(l,plants)){const spec=actors[name],sk=read(spec?`${spec.group}/rigs/${spec.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(spec?sk.armature.some((a:{name:string})=>a.name===spec.armature):sk.armature.length,name);}
 for(const name of battleEffects(l,plants)){assert.ok(rigs[name],name);const spec=rigs[name],sk=read(`${spec.group}/rigs/${spec.rig}/skeleton.json`);assert.ok(sk.armature.some((a:{name:string})=>a.name===spec.armature),name);}
});
test('Dino 21–25 preserve nine waves, last stand, dinosaurs, intros and rewards',()=>{
 assert.deepEqual([21,22,23,24,25].map(d=>level(d).waves.length),[9,9,9,9,9]);assert.deepEqual([21,22,23,24,25].map(d=>level(d).flagInterval),[3,9,3,3,3]);
 const l=level(22),g=create(22);assert.equal(g.preparing,true);assert.equal(g.sun,3000);assert.equal(g.food,3);assert.equal(l.sunDrops,false);assert.ok(l.blacklist.includes('primalsunflower'));const time=g.time;tick(g,2);assert.equal(g.time,time);g.startLastStand();tick(g,.1);assert.ok(g.time>time);
 assert.deepEqual(level(23).chooserPlants,['primalpotatomine']);assert.equal(BATTLE_LEVELS.dino23.firstReward.plant,'primalpotatomine');assert.equal(BATTLE_LEVELS.dino24.firstReward.image,'spine_dino');
 assert.equal(BATTLE_LEVELS.dino21.narrative,'DINO_21_INTRO');assert.equal(BATTLE_LEVELS.dino23.narrative,'DINO_23_INTRO');assert.ok(read('shell/progression.json').plants[54]);
 assert.ok(level(25).actions.flat().some(a=>a.dinosaur?.kind==='ankylo'&&a.dinosaur.delay===3));assert.ok(Object.keys(BATTLE_LEVELS).length>=409);
});
const isolated=(day=25)=>{const g=create(day);Object.assign(g,{nextWave:Infinity});g.plants=[];return g;};
test('Primal mine arms after six seconds plus Grow, then deals 2700 across three rows',()=>{
 const g=isolated();g.addPlant('primalpotatomine',2,4);const p=g.plants[0];tick(g,5.9);assert.ok(!p.rootGrown);tick(g,.2);assert.equal(p.animation,'Grow');assert.equal(p.fired,false);tick(g,.7);assert.equal(p.fired,true);
 const zs=[1,2,3].map(row=>g.spawnZombie('dino_bully',row,cellX(4)));for(const z of zs){z.hp=4000;z.stunnedUntil=Infinity;}const far=g.spawnZombie('dino_bully',0,cellX(4));far.stunnedUntil=Infinity;
 tick(g,.4);assert.equal(zs[0].hp,4000);tick(g,.2);for(const z of zs)assert.equal(z.hp,1300);assert.equal(far.hp,1100);assert.ok(!g.plants.includes(p));
});
test('Primal mine food throws two ready children at its throw event and keeps parent',()=>{
 const g=isolated();g.addPlant('primalpotatomine',2,4);const p=g.plants[0];const z=g.spawnZombie('dino',0,cellX(7));z.stunnedUntil=Infinity;g.food=1;assert.ok(g.plantFood(2,4));tick(g,.9);assert.equal(g.plants.length,1);tick(g,.2);assert.equal(g.plants.length,3);const children=g.plants.filter(q=>q!==p);assert.ok(children.some(q=>q.row===0&&q.column===7));assert.ok(children.every(q=>q.animation==='Flying'&&q.leap));tick(g,.9);assert.ok(children.every(q=>q.rootGrown&&!q.leap));g.damage(z,100000);tick(g,.8);assert.ok(children.every(q=>q.fired));assert.equal(p.action,'idle');assert.ok(g.plants.includes(p));
});
test('Bully takes primal pea damage and stun but resists its knockback; dinosaurs still affect it',()=>{
 const g=isolated();const z=g.spawnZombie('dino_bully',2,cellX(7));g.iceageCombat.primalPeas.push({id:g.nextEntityId(),kind:'pea_primal_pf',row:2,x:z.x-5,y:0});tick(g,.02);assert.ok(z.hp<1100);assert.ok(z.stunnedUntil!>g.time);assert.equal(z.leap,null);
 g.dino.add({kind:'ankylo',row:2,delay:0});tick(g,5.6);assert.ok(g.dino.ankylo.slides.has(z));tick(g,.8);assert.ok(z.x>=cellX(1.7)&&z.x<=cellX(2.3));
});
test('Ankylo slide pushes a plant and stops, while rooted plants take failed-push damage',()=>{
 for(const kind of ['wallnut','turnip'] as const){const g=isolated();g.addPlant(kind,2,5);const p=g.plants[0],hp=p.hp,z=g.spawnZombie('dino',2,cellX(7));g.dino.ankylo.slides.set(z,{from:z.x,to:cellX(2),at:g.time});for(let i=0;i<60&&g.dino.ankylo.slides.has(z);i++)tick(g,1/60);assert.equal(g.dino.ankylo.slides.has(z),false);if(kind==='wallnut')assert.equal(p.column,4);else {assert.equal(p.column,5);assert.equal(p.hp,hp-500);}}
});
test('Perfume charms Ankylo, resets throws and bounces a group; idle Ankylo leaves',()=>{
 const g=isolated();g.dino.add({kind:'ankylo',row:2,delay:0});tick(g,3.6);g.addPlant('perfumeshroom',2,6);tick(g,1);const d=g.dino.ankylo.items[0];assert.equal(d.charmed,true);const zs=Array.from({length:5},()=>g.spawnZombie('dino',2,cellX(7)));for(const z of zs)z.stunnedUntil=Infinity;tick(g,10);assert.ok(zs.every(z=>z.hp===0&&z.deathCause==='toss'));assert.equal(g.dino.ankylo.items.length,0);
 const h=isolated();h.dino.add({kind:'ankylo',row:0,delay:0});tick(h,29);assert.equal(h.dino.ankylo.items.length,1);tick(h,8);assert.equal(h.dino.ankylo.items.length,0);
});
test('First 25 map nodes advance with mine unlock and day 24 pinata only once',async()=>{
 const {ProgressStore,completionEvents}=await import('../src/shell/progression'),{islandStates}=await import('../src/shell/navigation');const map=read('shell/maps/dino.json'),data=new Map<string,string>(),p=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 for(let day=1;day<=25;day++){const id=`dino${day}`,node=map.islands.find((n:{levels:string[]})=>n.levels.includes(id))!;assert.equal(islandStates(map,p.completed(map),p.rewardNodes('dino')).get(node.node),'open',id);p.finish('dino',id);const events=completionEvents(map,id,p.completed(map),p.rewardNodes('dino'));for(const e of events)if(e.action==='reward')p.award('dino',map.islands.find((n:{node:number})=>n.node===e.node)!);p.finishPresentation();const before=JSON.stringify([p.rewards(),p.campaignRewards()]);p.finish('dino',id);for(const e of events)if(e.action==='reward')p.award('dino',map.islands.find((n:{node:number})=>n.node===e.node)!);assert.equal(JSON.stringify([p.rewards(),p.campaignRewards()]),before);}
 assert.equal(p.completed(map).size,25);assert.ok(p.ownedPlants().has(54));assert.equal(p.campaignRewards().filter(r=>r.level==='dino24'&&r.id==='spine_dino').length,1);
});
test('Mature primal mine is not a giant smash target; baby mine remains vulnerable',()=>{
 const g=isolated();g.addPlant('primalpotatomine',2,4);const p=g.plants[0];p.age=6;tick(g,.8);const z=g.spawnZombie('dino_gargantuar',2,cellX(4)+70);tick(g,.1);assert.equal(z.west!.animation,'Walk');assert.equal(p.hp,300);
 g.addPlant('primalpotatomine',0,4);const other=g.spawnZombie('dino_gargantuar',0,cellX(4)+70);tick(g,.1);assert.equal(other.west!.animation,'Smash');
});
