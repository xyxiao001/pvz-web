import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,props,read,tick} from './sky-fixture';
import {cellX,type PlantKind} from '../src/game/level';
import {BATTLE_LEVELS} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {LEVEL_ROUTES} from '../src/shell/navigation';
for(const day of [16,17,18,19,20])test(`Sky ${day}: controlled settlement and referenced resources`,()=>{
 const g=create(day);if(day===19)g.sky.airRaid.choose(0);
 for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);assert.equal(LEVEL_ROUTES[`sky${day}`],`sky${day}`);
 const config=BATTLE_LEVELS[`sky${day}`],l=level(day),catalogs=['battle','campaign',...config.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...(l.airRaid?.teams.flatMap(t=>t.members.map(m=>m.kind))??[]),...(l.chooserPlants??[]),...l.protectedPlants.map(p=>p.kind),...l.initialPlants.map(p=>p.kind),...(l.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...l.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 for(const name of battleActors(l,plants)){const spec=actors[name],sk=read(spec?`${spec.group}/rigs/${spec.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(spec?sk.armature.some((a:{name:string})=>a.name===spec.armature):sk.armature.length,name);}
 for(const name of battleEffects(l,plants)){assert.ok(rigs[name],name);const spec=rigs[name],sk=read(`${spec.group}/rigs/${spec.rig}/skeleton.json`);assert.ok(sk.armature.some((a:{name:string})=>a.name===spec.armature),name);}
});


const isolated=(day=17)=>{const g=create(day);Object.assign(g,{nextWave:Infinity});g.plants=[];return g;};
test('Sky 16 disables owned shield, preserves remove-only conveyor event and key',()=>{
 const g=create(16);g.sky.setShield(true);assert.equal(g.sky.shield,0);const normal=create(17);normal.sky.setShield(true);assert.equal(normal.sky.shield,10000);
 assert.ok(g.level.actions.flat().some(a=>a.remove?.includes('moonbean')&&!a.add));assert.equal(BATTLE_LEVELS.sky16.firstReward.image,'worldkey');assert.ok(battleEffects(g.level,[]).includes('zombossicon'));
});
test('Sky 18 parses native bare plant references and Sky 20 keeps duplicate preset slots',()=>{
 const l=level(18);assert.deepEqual(l.conveyor!.InitialPlantList.map(p=>p.PlantType),['banana']);
 assert.deepEqual(l.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[]),['loquat','endurian','snapdragon','endurian','pineapple','banana','pineapple']);
 assert.deepEqual(l.actions.flat().flatMap(a=>a.remove??[]),['banana']);assert.deepEqual(level(20).preset,['primalsunflower','peach','pineapple','pineapple','loquat','loquat']);
 assert.equal(BATTLE_LEVELS.sky20.outro,'SKYCITY_20_OUTRO');for(const name of ['SKYCITY_16_INTRO','SKYCITY_18_INTRO','SKYCITY_20_OUTRO'])assert.ok(read('sky/catalog.json').narratives[name].length);
});
test('Drone maker stays on column eight and equips a native 1600-point helmet',()=>{
 const g=isolated(),host=g.spawnZombie('sky_armor2',2,cellX(5));host.frozenUntil=Infinity;const maker=g.spawnZombie('sky_dronemaker',2,1300);tick(g,25);
 assert.equal(maker.x,cellX(8));assert.ok(host.skyHelmet);assert.equal(host.armor,1600);assert.ok(g.zombies.some(z=>z.drone&&!z.drone.carrying));
 g.damage(host,5000);tick(g,.1);assert.equal(g.zombies.filter(z=>z.kind==='sky_drone').length,0);
});
test('Drone leaves the helmet, bites a plant and returns after its target dies',()=>{
 const g=isolated(),host=g.spawnZombie('sky',2,cellX(5));host.frozenUntil=Infinity;const drone=g.spawnZombie('sky_drone',2,cellX(5));drone.drone!.host=host.id;
 g.addPlant('wallnut',1,1);const p=g.plants[0];tick(g,16);assert.ok(p.hp<props.plants.wallnut.Toughness);assert.equal(drone.drone!.animation,'Eat');p.hp=0;tick(g,4);assert.equal(drone.drone!.plant,0);assert.equal(drone.drone!.returning,false);assert.equal(drone.x,host.x);
});
test('Airraid 19 retains local variants, routes, health and kill scores',()=>{
 const g=isolated(19),r=g.sky.airRaid;r.choose(0);
 const a=g.spawnZombie('sky_battleplane',1,1000,'walk','sky_battleplane_0_t'),b=g.spawnZombie('sky_battleplane',3,1000,'walk','sky_battleplane_1_t');
 assert.equal(a.airRaid!.props.WavePointCost,40);assert.equal(b.airRaid!.props.WavePointCost,1000);assert.notEqual(a.route!.points[0].y,b.route!.points[0].y);assert.equal(a.hp,1500);
 g.damage(a,5000);g.damage(b,5000);tick(g,.02);assert.equal(r.score,1040);assert.ok(level(19).actions.flat().flatMap(a=>a.zombies).every(z=>z.airRaidType));
});
test('All six airraid members have finite health, attacks and food projectiles',()=>{
 for(let team=0;team<3;team++)for(let member=0;member<2;member++){
  const g=isolated(19),r=g.sky.airRaid;r.choose(team);r.move(100,650);
  if(member){r.score=5000;r.killed(g.spawnZombie('sky',0,1200,'walk','sky_t'));}
  assert.equal(r.player!.hp,300);const z=g.spawnZombie('sky_airraid_twin',2,850,'walk','sky_airraid_twin1_t');z.frozenUntil=Infinity;
  let fired=false;for(let i=0;i<320;i++){g.tick(1/60);fired ||= r.shots.length>0||r.rays.length>0||z.hp<4000;}assert.ok(fired,`${team}/${member}`);assert.ok(r.shots.every(s=>Number.isFinite(s.damage)&&Number.isFinite(s.vx)&&Number.isFinite(s.vy)));
  g.food=1;assert.ok(r.food());tick(g,2.1);assert.equal(g.food,0);assert.ok(Number.isFinite(z.hp));assert.ok(r.shots.every(s=>Number.isFinite(s.damage)));
 }
});
test('Airraid twin shoots radial bullets and splits timed stars into five bullets',()=>{
 const g=isolated(19),r=g.sky.airRaid;r.choose(0);r.move(100,650);
 const a=g.spawnZombie('sky_airraid_twin',2,850,'walk','sky_airraid_twin1_t');tick(g,.3);assert.ok(r.bullets.length>=16);assert.ok(r.bullets.every(b=>Number.isFinite(b.vx)&&Number.isFinite(b.vy)));
 a.hp=0;r.bullets=[];const b=g.spawnZombie('sky_airraid_twin',2,850,'walk','sky_airraid_twin2_t');tick(g,1.1);assert.ok(r.bullets.some(b=>b.rig==='skyAirRaidStar'));b.frozenUntil=Infinity;const star=r.bullets.find(b=>b.rig==='skyAirRaidStar')!;r.bullets=[star];star.x=600;star.y=350;star.life=.01;tick(g,.02);assert.equal(r.bullets.length,5);assert.ok(r.bullets.every(b=>b.rig==='airRaid1'));assert.ok(r.bullets.every(b=>Math.abs(Math.hypot(b.vx,b.vy)-Math.hypot(star.vx,star.vy))<1e-8));
});
test('Airraid electric variants shoot the authored signs with finite aimed velocity',()=>{
 const g=isolated(19),r=g.sky.airRaid;r.choose(0);r.move(100,650);
 g.spawnZombie('sky_electric',1,900,'walk','sky_electric_up_t');g.spawnZombie('sky_electric',3,900,'walk','sky_electric_down_t');tick(g,3.7);
 assert.ok(r.bullets.some(b=>b.rig==='skyBoltPositive'));assert.ok(r.bullets.some(b=>b.rig==='skyBoltNegative'));assert.ok(r.bullets.every(b=>Number.isFinite(b.vx)&&Number.isFinite(b.vy)&&b.damage===props.projectiles.airraid_2.Damage));
});
test('Sky 16 and 20 award campaign items once and expose native trophy art',async()=>{
 const {ProgressStore,completionEvents}=await import('../src/shell/progression'),{islandStates}=await import('../src/shell/navigation');
 const map=read('shell/maps/sky.json'),data=new Map<string,string>(),p=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 for(let day=1;day<=20;day++){
  const id=`sky${day}`,node=map.islands.find((n:{levels:string[]})=>n.levels.includes(id))!;assert.equal(islandStates(map,p.completed(map),p.rewardNodes('sky')).get(node.node),'open',id);p.finish('sky',id);
  for(const e of completionEvents(map,id,p.completed(map),p.rewardNodes('sky')))if(e.action==='reward')p.award('sky',map.islands.find((n:{node:number})=>n.node===e.node)!);
  p.finishPresentation();const before=JSON.stringify(p.campaignRewards());p.finish('sky',id);assert.equal(JSON.stringify(p.campaignRewards()),before);
 }
 assert.deepEqual(p.campaignRewards().filter(r=>['sky16','sky20'].includes(r.level)).map(r=>r.id),['worldkey','dangerroom_sky']);assert.equal(Object.keys(BATTLE_LEVELS).length,451);
});

test('Drone factory landing clears its cell, blocks planting, and does not hold final victory',()=>{
 const g=isolated();g.addPlant('skyshooter',2,8);const p=g.plants[0];g.spawnZombie('sky_dronemaker',2,cellX(8));tick(g,.6);assert.ok(p.hp<=0);assert.equal(g.sky.canPlant('skyshooter',8,2),false);
 g.wave=g.level.waves.length;tick(g,.02);assert.equal(g.phase,'won');assert.ok(g.zombies.some(z=>z.droneMaker&&z.hp>0));
});
