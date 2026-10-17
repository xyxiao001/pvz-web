import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,tick,props} from './cowboy-fixture';
import {cellX} from '../src/game/level';
import {battleActors,battleEffects} from '../src/rendering/resource-plan';
import {COWBOY_LEVELS} from '../src/game/worlds/cowboy';

test('West 31–35 retain native modes, challenges, rails and reinforced boss',()=>{
 assert.deepEqual([31,32,33,34,35].map(d=>level(d).waves.length),[10,10,12,12,0]);
 assert.equal(level(31).flowerLine,4);assert.equal(level(31).mold.length,15);
 assert.deepEqual(level(31).conveyor!.InitialPlantList.map(p=>p.PlantType),['bonkchoy','celerystalker','shadowshroom','stallia']);
 assert.ok(level(31).actions[5].some(a=>a.add?.some(p=>p.PlantType==='hurrikale')));
 assert.deepEqual(level(32).lastStand,{sun:2000,food:2});assert.equal(level(32).sunDrops,false);
 assert.deepEqual(level(34).preset,['sunshroom','puffshroom','wintermelon','banana']);assert.equal(level(34).mustProtect,2);
 assert.equal(level(35).boss!.kind,'zombossmech_cowboy2');assert.deepEqual(props.zombies.zombossmech_cowboy2.ZombossStages.map(s=>s.HitPoints),[8000,12000,10000]);
 assert.equal(COWBOY_LEVELS.cowboy35.narrative,'COWBOY_35_INTRO');
});
function quiet(day=32){const g=create(day);g['nextWave']=Infinity;g.preparing=false;g.plants=[];g.level.mustProtect=0;g.level.waves=[[]];g.sun=9999;return g;}
test('sunshroom grows twice, increases production and food grows fully before triple production',()=>{
 const g=quiet();g.addPlant('sunshroom',2,4);const p=g.plants[0];tick(g,17);assert.equal(g.westFinale.states.get(p.id)!.stage,0);assert.equal(g.sunProduced,25);
 tick(g,2);assert.equal(g.westFinale.states.get(p.id)!.stage,1);tick(g,55);assert.equal(g.westFinale.states.get(p.id)!.stage,2);
 const before=g.sunProduced;g.food=1;g.plantFood(2,4);tick(g,2);assert.equal(g.sunProduced-before,225);
});
test('puffshroom plant food renews every puff lifetime and plants expire after sixty seconds',()=>{
 const g=quiet();g.addPlant('puffshroom',0,4);g.addPlant('puffshroom',2,4);tick(g,59);assert.ok(g.plants.every(p=>g.westFinale.states.get(p.id)!.life<2));
 g.food=1;assert.equal(g.plantFood(0,4),true);tick(g,3);assert.equal(g.plants.length,2);assert.ok(g.plants.every(p=>g.westFinale.states.get(p.id)!.life>58));tick(g,61);assert.equal(g.plants.length,0);
});
test('shadow poison bypasses armor, lasts thirty seconds and second food detonates poison',()=>{
 const g=quiet();g.addPlant('shadowshroom',2,4);const z=g.spawnZombie('cowboy_armor4',2,cellX(4));tick(g,.6);assert.equal(g.plants.length,0);assert.equal(z.armor,2200);assert.ok(z.poison);
 tick(g,1);assert.ok(z.hp<170);g.addPlant('shadowshroom',0,4);g.food=1;g.plantFood(0,4);tick(g,2);assert.equal(g.zombies.length,0);
});
test('stallia slows nearby rows for twelve seconds and hurrikale pushes and chills the whole lane',()=>{
 const g=quiet();g.addPlant('stallia',2,4);const z=g.spawnZombie('cowboy_armor4',2,cellX(4));const near=g.spawnZombie('cowboy',1,cellX(5)),far=g.spawnZombie('cowboy',0,cellX(6));tick(g,1.4);assert.ok(z.perfumeUntil!>g.time+10);assert.ok(near.perfumeUntil);assert.equal(far.perfumeUntil,undefined);
 g.addPlant('hurrikale',2,3);const before=z.x;tick(g,3);assert.ok(z.x>before+BOARD_WIDTH*3);assert.ok(z.chilledUntil>g.time);assert.ok(!g.plants.some(p=>p.kind==='hurrikale'));
});
const BOARD_WIDTH=82;
test('banana uses selection, explicit target, native 1200 area damage and twenty second rest',()=>{
 const g=quiet();g.addPlant('banana',2,4);const z=g.spawnZombie('cowboy_armor4',2,cellX(7)),off=g.spawnZombie('cowboy_armor4',1,cellX(7));
 assert.equal(g.westFinale.select(2,4),true);assert.equal(g.westFinale.fire(2,7),true);tick(g,1.5);assert.equal(z.armor,1000);assert.equal(off.armor,2200);assert.equal(g.westFinale.select(2,4),false);g.damage(z,9999);g.damage(off,9999);tick(g,20);assert.equal(g.westFinale.select(2,4),true);g.westFinale.cancel();assert.equal(g.westFinale.selected,null);
});
test('currant connects orthogonal nearest neighbours, moves with carts, and keeps its permanent food upgrade',()=>{
 const g=quiet(35);g.boss=null;g.zombies=[];g.addPlant('electriccurrant',2,2);g.addPlant('electriccurrant',2,3);tick(g,.1);assert.equal(g.westFinale.lines.length,2);
 g.cowboy.select(2,2);g.cowboy.move(1);tick(g,.1);assert.equal(g.westFinale.lines.length,0);
 g.cowboy.select(1,2);g.cowboy.move(2);g.food=1;g.plantFood(2,2);tick(g,6);assert.equal(g.plants[0].action,'idle');assert.equal(g.plants[0].animation,'Idle_Food');assert.ok(g.westFinale.lines.every(c=>c.damage===20));
});
test('hypnoshroom converts an eater, transfers food once, and empowered mushroom produces allied giant',()=>{
 const g=quiet(35);g.boss=null;g.zombies=[];g.addPlant('hypnoshroom',1,4);const z=g.spawnZombie('cowboy_armor2',1,cellX(4));z.food=true;tick(g,.6);assert.equal(g.zombies.length,0);assert.equal(g.westFinale.allies[0].kind,'cowboy_armor2');assert.equal(g.westFinale.allies[0].reversed,true);assert.equal(g.pickups.length,1);
 g.addPlant('hypnoshroom',3,4);g.food=1;g.plantFood(3,4);tick(g,2);assert.equal(g.plantFood(3,4),false);g.spawnZombie('cowboy',3,cellX(4));tick(g,.6);assert.equal(g.westFinale.allies[1].kind,'cowboy_gargantuar');
 const foe=g.spawnZombie('cowboy_armor4',3,cellX(4)+65);tick(g,4);assert.ok(foe.armor<2200);
});
test('currant food cannot repeat and death bounces nearby zombies at the native event',()=>{
 const g=quiet();g.addPlant('electriccurrant',2,4);const p=g.plants[0];g.food=2;assert.equal(g.plantFood(2,4),true);tick(g,6);assert.equal(g.plantFood(2,4),false);assert.equal(g.food,1);
 const z=g.spawnZombie('cowboy_armor4',2,cellX(4)),before=z.x;p.hp=0;tick(g,.3);assert.equal(z.leap,null);tick(g,.2);assert.ok(z.leap);tick(g,.5);assert.ok(z.x>before+40);assert.equal(g.westFinale.states.has(p.id),false);
});
test('hypnotized giant throws friendly rider, and enemy giant uses smash against allies',()=>{
 const g=quiet(35);g.boss=null;g.zombies=[];const ally=g.spawnZombie('cowboy_gargantuar',2,cellX(4));ally.reversed=true;g.westFinale.adopt(ally);g.damage(ally,1900);tick(g,3);assert.equal(g.zombies.length,0);assert.ok(g.westFinale.allies.some(z=>z.kind==='west_bullrider'));
 const foe=g.spawnZombie('cowboy_gargantuar',2,ally.x+65),hp=ally.hp;tick(g,3);assert.ok(ally.hp<hp);assert.ok(foe.hp<3600);
});
test('reinforced mech crushes hypnotized zombies as well as its own troops',()=>{
 const g=quiet(35),boss=g.boss!;g.addPlant('hypnoshroom',1,4);const ally=g.spawnZombie('cowboy',boss.zombie.row,boss.zombie.x);g.westFinale.adopt(ally);boss['crush']();assert.equal(ally.hp,0);
});
test('black bull has native faster charge, native smash, repeat charge and full render resources',()=>{
 const g=quiet(32);g.addPlant('tallnut',2,5);const z=g.spawnZombie('west_bull_veteran',2,cellX(7));tick(g,15);assert.equal(g.plants.length,0);assert.ok(z.west!.bull!.delay>0||z.west!.animation);
 const actors=battleActors(level(35),COWBOY_LEVELS.cowboy35.plants.map(p=>p.kind));assert.ok(actors.includes('blackBull'));const effects=battleEffects(level(35),['electriccurrant','hypnoshroom']);for(const n of ['currantLine','currantHit','cowboyBricks','bossMissile'])assert.ok(effects.includes(n));
});

import {playCowboySeventh,setupCowboySeventh} from './cowboy-seventh-strategy';
for(const day of [31,32,33,34,35])test(`West ${day} legal player inputs replay`,()=>{
 const g=create(day);setupCowboySeventh(g);for(let f=0;f<60000&&g.phase==='playing';f++){playCowboySeventh(g,f);g.tick(1/60);g.events.length=0;}
 console.log(`cowboy${day}`,g.phase,g.lossReason,g.time.toFixed(1),'wave',g.wave,'sun',g.sun,'lost',g.plantsLost,'boss',g.boss?.zombie.hp);
 assert.equal(g.phase,'won');
});
