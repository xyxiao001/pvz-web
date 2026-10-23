import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,props,read,tick} from './sky-fixture';
import {cellX,type PlantKind} from '../src/game/level';
import {BATTLE_LEVELS,availablePlants} from '../src/game/levels';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {LEVEL_ROUTES} from '../src/shell/navigation';
for(const day of [6,7,8,9,10])test(`Sky ${day}: controlled settlement and referenced resources`,()=>{
 const g=create(day);if(day===8)g.sky.airRaid.choose(0);
 for(let i=0;i<30000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);assert.equal(LEVEL_ROUTES[`sky${day}`],`sky${day}`);
 const config=BATTLE_LEVELS[`sky${day}`],l=level(day),catalogs=['battle','campaign',...config.bundles!].map(b=>read(b+'/catalog.json')),actors=Object.assign({},...catalogs.map(c=>c.actors)),rigs=Object.assign({},...catalogs.map(c=>c.rigs));
 const plants=[...new Set<PlantKind>([...config.plants.map(p=>p.kind),...(l.airRaid?.teams.flatMap(t=>t.members.map(m=>m.kind))??[]),...(l.chooserPlants??[]),...l.protectedPlants.map(p=>p.kind),...l.initialPlants.map(p=>p.kind),...(l.conveyor?.InitialPlantList.map(p=>p.PlantType)??[]),...l.actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[])])];
 for(const name of battleActors(l,plants)){const spec=actors[name],sk=read(spec?`${spec.group}/rigs/${spec.rig}/skeleton.json`:`actors/${name}/skeleton.json`);assert.ok(spec?sk.armature.some((a:{name:string})=>a.name===spec.armature):sk.armature.length,name);}
 for(const name of battleEffects(l,plants)){assert.ok(rigs[name],name);const spec=rigs[name],sk=read(`${spec.group}/rigs/${spec.rig}/skeleton.json`);assert.ok(sk.armature.some((a:{name:string})=>a.name===spec.armature),name);}
});


const isolated=(day=10)=>{const g=create(day);Object.assign(g,{nextWave:Infinity});g.plants=[];return g;};
test('Sky 6–10 preserve presets, flower line, native airraid wave count and rewards',()=>{
 assert.deepEqual(level(6).preset,['sunshroom','pineapple','skyshooter','xshot','phatbeet']);
 assert.equal(level(7).flowerLine,2);assert.equal(level(8).waves.length,12);
 assert.deepEqual(level(8).airRaid!.teams.map(t=>t.members.map(m=>m.threshold)),[[2000,4000,8000,undefined],[3000,6000,9000,undefined],[3000,6000,9000,undefined]]);
 assert.deepEqual(level(10).actions.flat().filter(a=>a.thunder).map(a=>a.thunder!.Thunders.length),[2,2,1,1,2,4]);
 assert.equal(BATTLE_LEVELS.sky6.firstReward.plant,'pineapple');assert.equal(BATTLE_LEVELS.sky8.firstReward.plant,'moonbean');
 assert.ok(availablePlants(BATTLE_LEVELS.sky9,new Set([147])).includes('moonbean'));
 assert.deepEqual(level(10).actions.flat().flatMap(a=>a.add?.map(p=>p.PlantType)??[]),['anthurium','skyshooter','anthurium','pineapple','fumeshroom']);
});
test('Airraid movement, auto-fire, score upgrades, escaped enemies and health loss',()=>{
 const g=isolated(8),raid=g.sky.airRaid;raid.choose(0);raid.move(400,400);tick(g,.1);
 assert.equal(cellX(raid.player!.column),400);assert.ok(raid.shots.length>0);
 raid.keys.add('ArrowRight');tick(g,.1);raid.keys.clear();assert.ok(cellX(raid.player!.column)>440);
 const z=g.spawnZombie('sky_battleplane',2,cellX(8));g.damage(z,3000);tick(g,.02);assert.equal(raid.score,1000);assert.equal(raid.member,0);
 const z2=g.spawnZombie('sky_battleplane',2,cellX(8));g.damage(z2,3000);tick(g,.02);assert.equal(raid.member,1);assert.equal(raid.player!.kind,'splitpea');assert.equal(raid.player!.hp,300);
 const escape=g.spawnZombie('sky',0,-100);tick(g,.02);assert.equal(escape.airRaid!.escaped,true);assert.equal(raid.score,2000);
 raid.player!.hp=0;tick(g,.02);assert.equal(g.phase,'lost');
});
test('All twelve airraid members use loaded projectile art and finite damage',()=>{
 for(let team=0;team<3;team++)for(let member=0;member<4;member++){
  const g=isolated(8),r=g.sky.airRaid;r.choose(team);
  for(let i=0;i<member;i++){r.score=r.current.threshold!-100;r.killed(g.spawnZombie('sky',0,1200));}
  tick(g,.6);assert.ok(r.shots.length>0,`${team}/${member}`);assert.ok(r.shots.every(s=>Number.isFinite(s.damage)&&(Number.isFinite(s.pierce)||s.pierce===Infinity)));
  g.food=1;assert.ok(r.food());tick(g,2.2);assert.equal(g.food,0);assert.ok(r.shots.every(s=>Number.isFinite(s.damage)));
 }
});
test('Airraid armor2 fires seven aimed bullets; planes follow repeated routes and radial bursts',()=>{
 const g=isolated(8);g.sky.airRaid.choose(0);g.sky.airRaid.move(100,600);
 const z=g.spawnZombie('sky_armor2',2,700);z.airRaid!.next=0;tick(g,.7);
 assert.equal(g.sky.airRaid.bullets.length,7);assert.ok(g.sky.airRaid.bullets.some(b=>b.vy>0));
 g.sky.airRaid.bullets=[];g.zombies=[];const plane=g.spawnZombie('sky_battleplane',2,1000);assert.equal(plane.hp,2000);assert.equal(plane.route!.points.length,200);
 tick(g,.1);assert.equal(g.sky.airRaid.bullets.length,5);assert.ok(g.sky.airRaid.bullets.some(b=>b.vx>0));assert.notEqual(plane.x,1000);
});
test('Airraid requires score after the final wave and ignores the large ship hull',()=>{
 const g=isolated(8);g.sky.airRaid.choose(0);g.wave=g.level.waves.length;g.sky.damageShip(30000);assert.equal(g.sky.health,20000);tick(g,.02);assert.equal(g.phase,'lost');assert.equal(g.lossReason,'score');
});
test('Twin hulls paralyze separately, transfer half damage and are destroyed together',()=>{
 const g=isolated(9),lower=g.spawnZombie('sky_twin',0,cellX(7)),upper=g.zombies.find(z=>z.id===lower.twin!.partner)!;
 assert.equal(lower.row,1);assert.equal(upper.row,0);g.damage(lower,1500);assert.equal(lower.twin!.paralyzed,true);assert.equal(lower.hp,1);assert.equal(upper.hp,1500);
 g.damage(lower,100);assert.equal(upper.hp,1450);g.damage(upper,1450);assert.equal(lower.hp,0);assert.equal(upper.hp,0);tick(g,.02);assert.equal(g.zombies.length,0);
});
test('Twin crash damages the ship once after its native backward and forward motion',()=>{
 const g=isolated(9);g.spawnZombie('sky_twin',2,g.sky.edge+20);tick(g,.7);assert.equal(g.sky.health,20000);tick(g,.2);assert.equal(g.sky.health,18000);assert.equal(g.zombies.length,0);
});
test('Charges link occupied neighbours, combine signs, expire and apply native damage events',()=>{
 const g=isolated();for(const column of [0,1,2])g.addPlant('wallnut',2,column);
 g.sky.thunder.strike(1,3);assert.equal(g.sky.thunder.charges.length,3);
 g.sky.thunder.add(2,0,1);g.sky.thunder.add(2,1,-1);g.sky.thunder.add(2,2,-1);assert.deepEqual(g.sky.thunder.charges.map(c=>c.value).sort(),[0,0,2]);
 const hp=g.plants[0].hp;tick(g,2.3);assert.equal(g.plants[0].hp,hp-30);
 tick(g,60);assert.equal(g.sky.thunder.charges.length,0);
});
test('Double negative charge stops plant attacks; mixed charge slows the attack clock',()=>{
 const g=isolated();g.addPlant('skyshooter',2,1);const p=g.plants[0],z=g.spawnZombie('sky',2,cellX(7));z.frozenUntil=Infinity;
 g.sky.thunder.add(2,1,-1);g.sky.thunder.add(2,1,-1);tick(g,3);assert.equal(g.sky.plants.shots.length,0);assert.equal(p.action,'idle');
 g.sky.thunder.remove(g.sky.thunder.charges[0]);g.sky.thunder.add(2,1,1);g.sky.thunder.add(2,1,-1);const before=p.nextAction;tick(g,.5);assert.ok(p.nextAction>=before+.25-1e-6);
});
test('Anthurium absorbs a nearby charge for a 400-damage bolt and food clears all charges',()=>{
 const g=isolated();g.addPlant('anthurium',2,1);g.addPlant('wallnut',2,2);g.sky.thunder.add(2,2,1);const z=g.spawnZombie('sky',2,cellX(5));z.hp=5000;z.frozenUntil=Infinity;
 tick(g,1.7);assert.equal(g.sky.thunder.charges.length,0);assert.equal(z.hp,4600);
 g.sky.thunder.add(2,2,-1);g.food=1;assert.ok(g.plantFood(2,1));tick(g,.6);assert.equal(g.sky.thunder.charges.length,0);assert.ok(z.hp<=3000);assert.ok(g.sky.thunder.effects.some(e=>e.rig==='anthuriumLightning'));
});
test('Moonbean remains alive until eaten, leaves a clickable bomb, and food drops three bombs',()=>{
 const g=isolated(9);g.addPlant('moonbean',2,3);const p=g.plants[0];tick(g,2);assert.equal(g.suns.filter(s=>s.bomb).length,0);
 p.hp=0;tick(g,.75);const bomb=g.suns.find(s=>s.bomb)!;assert.ok(bomb);assert.equal(bomb.bombProps!.ZombieDamage,900);assert.equal(bomb.bombProps!.PlantDamage,500);
 const z=g.spawnZombie('sky',2,cellX(3));z.hp=2000;z.frozenUntil=Infinity;g.collect(bomb.id);tick(g,1.3);assert.equal(z.hp,1100);
 g.addPlant('moonbean',1,4);g.food=1;assert.ok(g.plantFood(1,4));tick(g,.7);assert.equal(g.suns.filter(s=>s.bomb).length,3);assert.ok(g.suns.filter(s=>s.bomb).every(s=>s.bombProps!.PlantDamage===0&&s.bombProps!.ZombieDamage===1250));
});

test('Sky map unlocks six through ten and grants both plant rewards once',async()=>{
 const {ProgressStore,completionEvents}=await import('../src/shell/progression'),{islandStates}=await import('../src/shell/navigation');
 const map=read('shell/maps/sky.json'),data=new Map<string,string>(),p=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 for(let day=1;day<=10;day++){
  const id=`sky${day}`,node=map.islands.find((n:{levels:string[]})=>n.levels.includes(id))!;
  assert.equal(islandStates(map,p.completed(map),p.rewardNodes('sky')).get(node.node),'open',id);p.finish('sky',id);
  const events=completionEvents(map,id,p.completed(map),p.rewardNodes('sky'));
  for(const e of events)if(e.action==='reward')p.award('sky',map.islands.find((n:{node:number})=>n.node===e.node)!);
  p.finishPresentation();const rewards=JSON.stringify(p.rewards());p.finish('sky',id);
  for(const e of events)if(e.action==='reward')p.award('sky',map.islands.find((n:{node:number})=>n.node===e.node)!);
  assert.equal(JSON.stringify(p.rewards()),rewards);
 }
 for(const id of [200,147]){assert.ok(p.ownedPlants().has(id));assert.ok(read('shell/progression.json').plants[id].some((d:{kind:string})=>d.kind==='rig'));}
});

test('Lethal airraid bullets lose before final-wave settlement',()=>{
 const g=isolated(8),r=g.sky.airRaid;r.choose(0);g.wave=g.level.waves.length;r.score=10000;r.player!.hp=5;
 r.bullets.push({id:99,x:cellX(r.player!.column),y:240+r.player!.row*98-35,vx:0,vy:0,damage:10,rig:'airRaid0',animation:'i',hits:[],pierce:1,life:1});
 tick(g,.02);assert.equal(g.phase,'lost');assert.equal(g.lossReason,'airRaid');
});
