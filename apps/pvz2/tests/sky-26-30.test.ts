import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,props,read,tick} from './sky-fixture';
import {cellX,type PlantKind} from '../src/game/level';
import {BATTLE_LEVELS,availablePlants} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {LEVEL_ROUTES} from '../src/shell/navigation';
for(const day of [26,27,28,29,30])test(`Sky ${day}: controlled settlement and referenced resources`,()=>{
 const g=create(day);if(g.preparing)g.startLastStand();if(day===28)g.sky.airRaid.choose(0);if(day===30)for(const p of g.plants)p.hp=100000;
 for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);assert.equal(LEVEL_ROUTES[`sky${day}`],`sky${day}`);
 const config=BATTLE_LEVELS[`sky${day}`],l=level(day),catalogs=['battle','campaign',...config.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...(l.airRaid?.teams.flatMap(t=>t.members.map(m=>m.kind))??[]),...(l.chooserPlants??[]),...l.protectedPlants.map(p=>p.kind),...l.initialPlants.map(p=>p.kind),...(l.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...l.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 for(const name of battleActors(l,plants)){const spec=actors[name],sk=read(spec?`${spec.group}/rigs/${spec.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(spec?sk.armature.some((a:{name:string})=>a.name===spec.armature):sk.armature.length,name);}
 for(const name of battleEffects(l,plants)){assert.ok(rigs[name],name);const spec=rigs[name],sk=read(`${spec.group}/rigs/${spec.rig}/skeleton.json`);assert.ok(sk.armature.some((a:{name:string})=>a.name===spec.armature),name);}
});
const isolated=()=>{const g=create(28);Object.assign(g,{nextWave:Infinity});g.sky.airRaid.choose(0);return g;};
test('Sky 26–30 preserve native cards, budgets, restrictions and protection',()=>{
 assert.deepEqual([26,27,28,29,30].map(n=>level(n).waves.length),[18,16,12,12,18]);assert.deepEqual(level(26).preset,['primalsunflower','loquat','peacommando','bulbkekengi']);
 assert.equal(level(27).maxPlantsLost,8);assert.deepEqual(level(27).mold.map(p=>p.column),[0,0,0,0,0]);assert.deepEqual(level(29).lastStand,{sun:4000,food:3});assert.ok(level(29).blacklist.includes('sunflower'));
 assert.equal(level(30).mustProtect,5);assert.deepEqual(level(30).protectedPlants.map(p=>[p.kind,p.row,p.column]),[0,1,2,3,4].map(r=>['xshot',r,3]));assert.ok(availablePlants(BATTLE_LEVELS.sky27,new Set([204])).includes('peacommando'));
});
test('Sky27 allows eight losses, blocks mold, and sky30 fails on protected loss',()=>{
 const g=create(27);g.sun=10000;assert.equal(g.plant('sunflower',2,0),false);g.plantsLost=8;tick(g,.02);assert.equal(g.phase,'playing');g.plantsLost=9;tick(g,.02);assert.equal(g.lossReason,'plantsLost');
 const h=create(30);h.plants[0].hp=0;tick(h,.02);assert.equal(h.lossReason,'protected');assert.equal(h.phase,'lost');
});
test('Sky29 waits with the authored budget and excludes sun producers',()=>{
 const g=create(29);tick(g,5);assert.equal(g.wave,0);assert.equal(g.sun,4000);assert.equal(g.food,3);assert.equal(g.plant('sunflower',2,1),false);assert.ok(g.plant('peacommando',2,3));assert.equal(g.sun,3550);g.startLastStand();tick(g,10);assert.ok(g.wave>0);
});
test('Sky28 sides repeat until EndingWave and escape in their authored direction',()=>{
 const g=isolated(),r=g.sky.airRaid;r.move(100,650);const schedule=level(28).actions[0].find(a=>a.airRaidSchedule)!.airRaidSchedule!;r.schedule(schedule);tick(g,.02);assert.equal(g.zombies.length,2);const first=g.zombies.map(z=>z.id);tick(g,5.1);assert.ok(g.zombies.some(z=>!first.includes(z.id)));r.startWave(1);g.zombies=[];tick(g,6);assert.equal(g.zombies.length,0);
 const score=r.score;const z=g.spawnZombie('sky',2,1299,'walk','sky_lift_t');tick(g,.02);assert.ok(z.airRaid!.escaped);assert.equal(r.score,score);
});
test('Sky28 ignored side reinforcements do not block final victory',()=>{
 const g=create(28);g.sky.airRaid.choose(0);g.sky.airRaid.player!.hp=100000;g.sky.airRaid.move(100,650);
 for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)if(!z.airRaid!.props.IgnoredInWaves)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');assert.ok(g.zombies.some(z=>z.airRaid!.props.IgnoredInWaves));
});
test('Sky28 giants chase, throw two armored escorts and smash at animation event',()=>{
 const g=isolated(),r=g.sky.airRaid;r.move(100,650);r.player!.hp=10000;const z=g.spawnZombie('sky_gargantuar_armor2_thrower',0,900,'walk','sky_gargantuar_t');tick(g,.2);assert.ok(z.x<900&&z.row>0);z.hp=1399;tick(g,1.1);let escorts=g.zombies.filter(z=>z.airRaid!.props.IgnoredInWaves);assert.equal(escorts.length,1);assert.ok(escorts[0].leap);assert.ok(escorts[0].armor>0);tick(g,1);z.hp=599;tick(g,1.1);escorts=g.zombies.filter(z=>z.airRaid!.props.IgnoredInWaves);assert.equal(escorts.length,2);
 const h=isolated(),q=h.sky.airRaid;q.player!.hp=10000;const giant=h.spawnZombie('sky_gargantuar_armor2_thrower',q.player!.row,cellX(q.player!.column)+50,'walk','sky_gargantuar_t');tick(h,.9);assert.equal(q.player!.hp,10000);tick(h,.2);assert.equal(q.player!.hp,8500);assert.equal(giant.sky!.animation,'Smash');
});
test('All three Sky28 arbiter variants retain their routes, fog and finite bullet patterns',()=>{
 for(const variant of [0,1,2]){const g=isolated(),r=g.sky.airRaid;r.move(100,650);const z=g.spawnZombie('sky_airraid_arbiterx',2,850,'walk',`sky_airraid_arbiterx${variant}_t`);assert.equal(z.hp,3000);assert.equal(z.route!.points.length,80);let fired=false;for(let i=0;i<120;i++){g.tick(1/60);fired ||= r.bullets.length>0;}assert.ok(fired);assert.ok(r.bullets.every(b=>Number.isFinite(b.damage)&&Number.isFinite(b.vx)&&Number.isFinite(b.vy)));assert.ok(g.sky.special.fog.length>0);assert.equal(z.sky!.animation,'Walk');}
});
test('Sky28 local bullets use ship damage and native scale',()=>{
 const g=isolated(),r=g.sky.airRaid;r.move(100,650);g.spawnZombie('sky_airraid_arbiterx',2,850,'walk','sky_airraid_arbiterx1_t');for(let i=0;i<120&&!r.bullets.some(b=>b.scale===4);i++)g.tick(1/60);const b=r.bullets.find(b=>b.scale===4)!;assert.ok(b);assert.equal(b.damage,20);b.x=cellX(r.player!.column);b.y=240+r.player!.row*98-35;b.vx=0;b.vy=0;tick(g,.02);assert.equal(r.player!.hp,280);
});
test('Sky28 new members attack, use food and evolve at 10000 points',()=>{
 for(const [team,member] of [[1,1],[2,0],[2,1]]){const g=isolated(),r=g.sky.airRaid;r.choose(team);if(member){r.score=9999;const z=g.spawnZombie('sky',0,1200,'walk','sky_t');r.killed(z);g.zombies=[];}assert.equal(r.member,member);const p=r.player!,z=g.spawnZombie('sky_armor2',p.row,cellX(p.column)+100,'walk','sky_armor2_t');z.armor=0;z.hp=20000;z.frozenUntil=Infinity;tick(g,1);assert.ok(z.hp<20000,`${team}/${member}`);const hp=z.hp;g.food=1;assert.ok(r.food());tick(g,2.2);assert.equal(g.food,0);assert.ok(z.hp<hp);assert.ok(Number.isFinite(z.hp));}
});
test('Sky map through 30 awards Commando once with native display rigs',async()=>{
 const {ProgressStore,completionEvents}=await import('../src/shell/progression'),{islandStates}=await import('../src/shell/navigation');const map=read('shell/maps/sky.json'),store=new Map<string,string>(),p=new ProgressStore({getItem:k=>store.get(k)??null,setItem:(k,v)=>{store.set(k,v);},removeItem:k=>{store.delete(k);}});
 for(let day=1;day<=30;day++){const id=`sky${day}`,node=map.islands.find((n:{levels:string[]})=>n.levels.includes(id))!;assert.equal(islandStates(map,p.completed(map),p.rewardNodes('sky')).get(node.node),'open');p.finish('sky',id);for(const e of completionEvents(map,id,p.completed(map),p.rewardNodes('sky')))if(e.action==='reward')p.award('sky',map.islands.find((n:{node:number})=>n.node===e.node)!);p.finishPresentation();const before=JSON.stringify(p.rewards());p.finish('sky',id);assert.equal(JSON.stringify(p.rewards()),before);}
 for(const id of [204]){assert.ok(p.ownedPlants().has(id));const draws=read('shell/progression.json').plants[id];assert.ok(draws.length);for(const d of draws)if(d.kind==='rig')assert.ok(read(`shell/rigs/${d.rig}/skeleton.json`).armature.some((a:{name:string})=>a.name===d.armature));}
 assert.equal(Object.keys(BATTLE_LEVELS).length,456);
});


test('Sky28 left escorts retain zero contact damage and homing exclusion',()=>{
 const g=isolated(),r=g.sky.airRaid;r.choose(1);const p=r.player!,z=g.spawnZombie('sky',p.row,cellX(p.column)+20,'walk','sky_lift_t');z.sky!.animation='Shoot';z.airRaid!.next=Infinity;tick(g,.1);assert.equal(p.hp,300);assert.ok(r.shots.every(s=>s.target!==z.id));
});
