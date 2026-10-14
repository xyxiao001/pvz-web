import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, type Zombie } from '../src/game/model';
import { cellX, LEVELS, PLANTS, type PlantKind, type SurvivalScene } from '../src/game/config';
import { GameClock } from '../src/game/clock';
import { RowPicker } from '../src/game/row-picker';
import { loadSurvival, saveSurvival, clearSurvival, completeLevel } from '../src/platform/storage';
import data from '../src/game/data/portable-adventure.json';
const night: PlantKind[]=['puffshroom','sunshroom','fumeshroom','gravebuster','iceshroom','doomshroom'];
function start(scene:SurvivalScene='night',choices:PlantKind[]=night){const g=new Game(9,23,'endless',scene);for(const p of choices)g.chooseSeed(p);g.start();return g;}
const step=(g:Game,n:number)=>{for(let i=0;i<n;i++){g.step();g.drainEvents();}};
const plant=(g:Game,k:PlantKind,c:number,r:number)=>{g.cancelSelection();g.select(k);return g.plant(c,r);};
const zombie=(kind:Zombie['kind'],x:number,row=2):Zombie=>({id:900,kind,row,x,health:kind==='dancer'?500:270,armor:0,shield:0,speed:.3,biteIn:4,eating:false,wave:0,hitAt:-100,chillIn:0,hasPole:false,vaultIn:0,animationTime:0,rageIn:0,riseIn:0});

test('six additional adventure levels use original counts, introductions, graves and conveyor weights',()=>{
 assert.deepEqual(data.waveCounts.slice(17,23),[10,20,20,10,20,20]);
 assert.equal(data.zombies.dancer.startingLevel,18);assert.equal(data.zombies.snorkel.startingLevel,23);
 assert.deepEqual(data.conveyorTwenty.map(x=>x.weight),[20,15,15,10,15,15,10]);
 assert.equal(LEVELS[17].reward,'iceshroom');assert.equal(LEVELS[20].reward,'lilypad');
 assert.equal(new Game(18,1).graves.length,11);assert.equal(new Game(20,1).graves.length,13);
 assert.equal(PLANTS.threepeater.cost,325);assert.equal(PLANTS.doomshroom.cooldown,5000);
});
test('four endless scenes have correct rows, sky sun, graves and aquatic selection',()=>{
 for(const scene of ['day','night','pool','fog'] as const){
  const g=new Game(9,1,'endless',scene);for(const kind of g.config.seeds.slice(0,6))g.chooseSeed(kind);g.start();step(g,400);
  assert.equal(g.config.rows.length,scene==='pool'||scene==='fog'?6:5);
  assert.equal(g.suns.length,scene==='day'||scene==='pool'?1:0);
  assert.equal(g.graves.length,scene==='night'?9:0);
  assert.equal(g.config.seeds.includes('lilypad'),scene==='pool'||scene==='fog');
  assert.equal(g.config.seeds.includes('plantern'),scene==='fog');
 }
});
test('water plants require a lily pad; layering, top-first shoveling and bite targeting preserve the pad',()=>{
 const g=start('pool',['lilypad','sunflower','peashooter','wallnut','potatomine','squash']);g.sun=1000;
 assert.equal(plant(g,'peashooter',1,2),false);assert.equal(plant(g,'lilypad',1,0),false);
 assert.ok(plant(g,'lilypad',1,2));assert.equal(plant(g,'potatomine',1,2),false);assert.ok(plant(g,'peashooter',1,2));
 const pad=g.plants[0],top=g.plants[1];g.zombies=[zombie('normal',cellX(1)+10)];step(g,4);
 assert.equal(pad.health,300);assert.equal(top.health,296);
 g.toggleShovel();g.dig(1,2);assert.deepEqual(g.plants.map(p=>p.kind),['lilypad']);
 g.toggleShovel();g.dig(1,2);assert.equal(g.plants.length,0);
 assert.equal(g.rowAt(g.rowY(5)-30),5);assert.equal(g.rowY(5),573);
});
test('ice freezes and damages through shields, halts movement, then thaws with chill',()=>{
 const g=start();g.sun=500;plant(g,'iceshroom',0,2);const z=zombie('door',600);z.shield=1100;g.zombies=[z];
 step(g,100);assert.equal(z.health,250);assert.equal(z.shield,1100);assert.ok(z.frozenIn!>=399&&z.frozenIn!<=599);
 const x=z.x;step(g,z.frozenIn!);assert.equal(z.x,x);assert.ok(z.chillIn>0);step(g,1);assert.ok(z.x<x);
});
test('doom damages a radius and leaves a three-minute unplantable crater',()=>{
 const g=start();g.sun=500;plant(g,'doomshroom',2,2);const a=zombie('normal',cellX(2)+40),b={...zombie('normal',740),id:901,speed:0};g.zombies=[a,b];
 step(g,100);assert.ok(!g.zombies.some(z=>z.id===a.id));assert.equal(b.health,270);assert.equal(g.craters[0].remaining,18000);
 assert.equal(g.canPlant('puffshroom',2,2),false);g.craters[0].remaining=1;step(g,1);assert.ok(g.canPlant('puffshroom',2,2));
});
test('daytime mushrooms sleep and cannot hypnotize a biting zombie',()=>{
 const g=new Game(21,1);for(const kind of ['puffshroom','sunshroom','hypnoshroom','iceshroom','doomshroom','lilypad'] as PlantKind[])g.chooseSeed(kind);g.start();g.sun=1000;
 plant(g,'sunshroom',0,0);plant(g,'puffshroom',1,0);plant(g,'hypnoshroom',2,0);plant(g,'iceshroom',0,1);plant(g,'doomshroom',1,1);
 const z=zombie('normal',cellX(2)+10,0);g.zombies=[z];step(g,100);
 assert.equal(g.peas.length,0);assert.equal(z.hypnotized,undefined);assert.equal(z.frozenIn,undefined);assert.equal(g.craters.length,0);assert.ok(g.plants.some(p=>p.kind==='doomshroom'));
});
test('dancer summons four followers and replaces missing dancers without duplicating survivors',()=>{
 const g=start();const z={...zombie('dancer',600),summonIn:0,dancePhase:'point' as const,danceIn:1};g.zombies=[z];step(g,1);
 assert.equal(g.zombies.filter(x=>x.kind==='backup').length,4);
 const follower=g.zombies.find(x=>x.kind==='backup')!;g.zombies=g.zombies.filter(x=>x!==follower);step(g,750);
 assert.equal(g.zombies.filter(x=>x.kind==='backup').length,4);assert.ok(g.zombies.every(x=>g.config.rows.includes(x.row)));
});
test('snorkel is hidden from peas while swimming, but can be attacked when eating',()=>{
 const g=start('pool',['lilypad','sunflower','peashooter','wallnut','squash','threepeater']);const z=zombie('snorkel',400);z.speed=0;g.zombies=[z];
 g.peas=[{id:901,row:2,x:380,ice:false,puff:false,age:0}];step(g,10);assert.equal(z.health,270);
 g.peas=[];g.sun=500;plant(g,'lilypad',4,2);plant(g,'wallnut',4,2);z.x=cellX(4)+10;step(g,1);assert.equal(z.eating,true);
 g.peas=[{id:902,row:2,x:z.x-20,ice:false,puff:false,age:0}];step(g,2);assert.equal(z.health,250);
});
test('row selection never puts land-only zombies into water even at random zero',()=>{
 const picker=new RowPicker([0,1,2,3,4,5]);for(const random of [0,.01,.5,.999])for(let i=0;i<20;i++)assert.ok([2,3].includes(picker.pick(i,random,[2,3])));
});
test('JSON save restores every timer and RNG, and continues identically at all speeds',()=>{
 for(const scene of ['day','night','pool','fog'] as const)for(const speed of [1,2,4] as const){
  const g=new Game(9,123456,'endless',scene);for(const p of g.config.seeds.slice(0,6))g.chooseSeed(p);g.start();g.autoCollectSun=true;step(g,2200);g.pause();
  const snapshot=JSON.parse(JSON.stringify(g.snapshot()));const copy=Game.restore(snapshot);assert.equal(copy.phase,'paused');
  step(copy,100);assert.deepEqual(JSON.parse(JSON.stringify(copy.snapshot())),snapshot);
  g.resume();copy.resume();const a=new GameClock(),b=new GameClock();a.speed=b.speed=speed;
  for(let i=0;i<1000;i++){a.advance(g,16,()=>{});b.advance(copy,16,()=>{});g.drainEvents();copy.drainEvents();}
  assert.deepEqual(JSON.parse(JSON.stringify(copy.snapshot())),JSON.parse(JSON.stringify(g.snapshot())));
 }
});
test('scene saves are independent, survive reload and keep adventure progress separate',()=>{
 const records=new Map<string,string>();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>records.get(k)??null,setItem:(k:string,v:string)=>records.set(k,v),removeItem:(k:string)=>records.delete(k)}});
 completeLevel(23);for(const scene of ['day','night','pool','fog'] as const){const g=new Game(9,2,'endless',scene);saveSurvival(g,4);assert.equal(loadSurvival(scene)!.game.survivalScene,scene);assert.equal(loadSurvival(scene)!.speed,4);}
 clearSurvival('pool');assert.equal(loadSurvival('pool'),null);assert.ok(loadSurvival('night'));assert.equal(records.get('pvz-web:adventure:v1'),'1-23-complete');
});

test('threepeater fires on all three rows when any row has a target; squash deals 1800 at its landing',()=>{
 const g=start('pool',['lilypad','sunflower','threepeater','squash','wallnut','peashooter']);g.sun=1000;
 plant(g,'threepeater',0,1);const shooter=g.plants[0];shooter.actionIn=1;const target=zombie('normal',700,0);target.speed=0;g.zombies=[target];g.step();
 assert.deepEqual(g.peas.map(p=>p.row),[0,1,2]);g.peas=[];
 plant(g,'squash',2,4);const z={...zombie('bucket',cellX(2)+55,4),armor:1100,id:905,speed:0};g.zombies=[z];step(g,186);assert.ok(!g.zombies.includes(z));assert.ok(!g.plants.some(p=>p.kind==='squash'));
});
test('dancer and followers stop during the original raise-arms half of the 460-tick dance cycle',()=>{
 const g=start();g.ticks=240;const z={...zombie('backup',600),id:902};g.zombies=[z];step(g,200);assert.equal(z.x,600);step(g,40);assert.ok(z.x<600);
});
