import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, type Zombie } from '../src/game/model';
import { cellX, rowY, LEVELS, PLANTS, type PlantKind } from '../src/game/config';
import { generateWaves } from '../src/game/waves';
import { GameClock, type GameSpeed } from '../src/game/clock';
import { walkingSpeed } from '../src/game/zombie-motion';
import data from '../src/game/data/portable-adventure.json';
const loadout: PlantKind[] = ['sunshroom','puffshroom','fumeshroom','gravebuster','hypnoshroom','scaredyshroom'];
const tick = (g: Game,n: number) => {for(let i=0;i<n;i++){g.step();g.drainEvents();}};
function play(level: 15|16|17=17,seed=1) {const g=new Game(level,seed);if(g.needsSeedChoice)for(const kind of level===16? [...loadout.slice(0,5),'wallnut'] as PlantKind[]:loadout)g.chooseSeed(kind);g.start();return g;}
function plant(g:Game,kind:PlantKind,col:number,row:number){g.select(kind);return g.plant(col,row);}
function zombie(kind: Zombie['kind'], x: number, row=2): Zombie {
 return {id:900,kind,row,x,health:270,armor:kind==='football'?1400:kind==='bucket'?1100:kind==='cone'?370:0,shield:0,speed:.67,biteIn:4,eating:false,wave:0,hitAt:-100,chillIn:0,hasPole:false,vaultIn:0,animationTime:0,rageIn:0,riseIn:0};
}
test('2–5 … 2–7 use source wave counts, football eligibility, graves, costs and rewards',()=>{
 assert.deepEqual(data.waveCounts.slice(14,17),[8,10,20]);assert.equal(LEVELS[15].mode,'whack');
 assert.deepEqual({...data.zombies.football,allowedLevels:data.zombies.football.allowedLevels.slice(0,17)},{value:7,startingLevel:16,firstAllowedWave:5,weight:2000,allowedLevels:[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,1]});
 for(const level of [16,17] as const){const g=play(level);assert.equal(g.graves.length,level===16?7:11);assert.equal(new Set(g.graves.map(x=>`${x.column},${x.row}`)).size,g.graves.length);}
 const waves=generateWaves(16,()=>0);assert.ok(waves[5].includes('football'));assert.ok(waves[9].includes('football'));
 assert.equal(LEVELS[15].reward,'hypnoshroom');assert.equal(LEVELS[16].reward,'scaredyshroom');
 assert.equal(PLANTS.hypnoshroom.cost,75);assert.equal(PLANTS.hypnoshroom.cooldown,3000);assert.equal(PLANTS.scaredyshroom.cost,25);
});
test('whack starts with nine graves and three paid support cards, first emergence after 200 ticks',()=>{
 const g=play(15);assert.equal(g.sun,0);assert.equal(g.needsSeedChoice,false);assert.equal(g.hasConveyor,false);assert.equal(g.graves.length,9);
 assert.deepEqual(g.seeds,['potatomine','gravebuster','cherrybomb']);assert.ok(g.graves.every(x=>x.column>=3));
 tick(g,199);assert.equal(g.wave,0);g.step();assert.equal(g.wave,1);assert.equal(g.zombies.length,1);assert.equal(g.zombies[0].riseIn,50);
 const z=g.zombies[0];assert.ok(g.graves.some(gr=>gr.row===z.row&&cellX(gr.column)-35===z.x));
 tick(g,50);assert.equal(z.riseIn,0);assert.equal(g.suns.length,0);assert.equal(g.conveyor.length,0);
});
test('hammer needs one/two/three hits for normal/cone/bucket and never spends sun or hits while paused/planting',()=>{
 for(const [kind,hits] of [['normal',1],['cone',2],['bucket',3]] as const){
  const g=play(15),z=zombie(kind,400);g.zombies=[z];
  g.pause();g.whack(400,rowY(2)-60);assert.equal(z.health,270);g.resume();
  g.select('potatomine');g.whack(400,rowY(2)-60);assert.equal(z.health,270);g.cancelSelection();
  for(let i=0;i<hits;i++){g.whack(400,rowY(2)-60);if(i<hits-1)assert.equal(z.health,270);}
  assert.equal(z.health,0);assert.equal(g.sun,0);g.step();assert.equal(g.kills,1);
 }
});
test('all eight whack rounds can be completed through ordinary clicks without injecting money or damage',()=>{
 for(const seed of [1,23,123456]){
  const g=play(15,seed);let clicked=0;
  for(let t=0;t<20000&&g.phase==='playing';t++){
   for(const sun of [...g.suns])g.collectSun(sun.id);
   if(t%25===0){const z=g.zombies.filter(z=>z.riseIn===0&&z.health>=90).sort((a,b)=>a.x-b.x)[0];if(z){g.whack(z.x,rowY(z.row)-55);clicked++;}}
   g.step();g.drainEvents();
  }
  assert.equal(g.phase,'won',`seed ${seed}: wave ${g.wave}, ticks ${g.ticks}`);assert.equal(g.wave,8);assert.ok(g.ticks>=14499);assert.ok(clicked>50);assert.ok(g.graves.length>9);
 }
});
test('hypno consumption retains armor, turns zombies right, and does not damage plants, trigger mowers or take peas',()=>{
 const g=play();g.sun=150;plant(g,'hypnoshroom',2,2);const z=zombie('football',cellX(2)+10);g.zombies=[z];
 tick(g,4);assert.equal(z.hypnotized,true);assert.equal(z.armor,1400);assert.equal(z.health,270);assert.equal(z.speed,.17);assert.equal(g.plants.length,0);
 const x=z.x;tick(g,20);assert.ok(z.x>x);
 g.peas=[{id:909,row:2,x:z.x-19,ice:false,puff:false,age:0}];g.step();assert.equal(z.armor,1400);
 z.x=-40;g.step();assert.equal(g.phase,'playing');assert.equal(g.mowers[2].state,'ready');
 z.x=901;g.step();assert.equal(g.zombies.length,0);assert.equal(g.kills,0);
});
test('friendly and hostile zombies chew each other, and surviving allies do not prevent winning',()=>{
 const g=play();plant(g,'puffshroom',0,0);
 const ally={...zombie('football',400),hypnotized:true,speed:.17},enemy={...zombie('door',425),id:901,shield:1100};g.zombies=[ally,enemy];
 tick(g,4);assert.equal(ally.armor,1396);assert.equal(enemy.health,266);assert.equal(enemy.shield,1100);assert.equal(ally.eating,true);assert.equal(enemy.eating,true);
 g.wave=g.config.waveCount;g.zombies=[ally];g.step();assert.equal(g.phase,'won');
});
test('scaredy attacks distant enemies with lasting spores, hides near enemies in adjacent rows, and ignores allies',()=>{
 const g=play();g.sun=100;plant(g,'scaredyshroom',0,2);const p=g.plants[0];const z=zombie('normal',700);z.speed=0;g.zombies=[z];p.actionIn=1;
 g.step();assert.equal(g.peas.length,1);assert.equal(g.peas[0].longRange,true);tick(g,80);assert.ok(g.peas.length>0);tick(g,100);assert.equal(z.health,250);
 z.x=cellX(0)+40;z.row=1;p.actionIn=1;g.peas=[];g.step();assert.equal(p.scared,true);assert.equal(g.peas.length,0);
 z.hypnotized=true;g.step();assert.equal(p.scared,false);
});
test('football uses source helmet and ground-track mean movement; whack remains speed-independent',()=>{
 assert.ok(Math.abs(walkingSpeed(zombie('football',500)) - .67*.47*30/29)<1e-10);
 function run(speed:GameSpeed){const g=play(15,9),c=new GameClock();c.speed=speed;for(let n=0;n<500/speed;n++)c.advance(g,20,()=>{});return g;}
 assert.deepEqual(run(1),run(2));assert.deepEqual(run(1),run(4));
});

test('2–6 and 2–7 can be won with ordinary six-slot selection, planting and actual collected sun',()=>{
 for(const level of [16,17] as const)for(const seed of [1,23,123456]){
  const shooter:PlantKind=level===16?'repeater':'scaredyshroom';
  const g=new Game(level,seed);
  for(const kind of ['puffshroom','sunshroom','fumeshroom',shooter,'hypnoshroom','gravebuster'] as PlantKind[])g.chooseSeed(kind);
  g.start();g.autoCollectSun=true;
  const place=(k:PlantKind,c:number,r:number)=>g.canPlant(k,c,r)&&plant(g,k,c,r);
  for(let n=0;n<110000&&g.phase==='playing';n++){
   const enemies=g.zombies.filter(z=>!z.hypnotized&&z.health>=90).sort((a,b)=>a.x-b.x);
   for(const z of enemies)if(z.kind==='football'&&z.armor>0&&z.x<660&&z.x>250){
    const col=Math.floor((z.x-80)/80);
    if(col>=0)place('hypnoshroom',col,z.row);
   }
   const rows=[...g.config.rows].sort((a,b)=>{
    const pressure=(r:number)=>g.plants.filter(p=>p.row===r&&p.kind==='puffshroom').length*900+(enemies.find(z=>z.row===r)?.x??900);return pressure(a)-pressure(b);
   });
   for(const row of rows){let placed=false;for(const col of [5,4,6,3,7,2,8])if(place('puffshroom',col,row)){placed=true;break;}if(placed)break;}
   for(const row of g.config.rows)if(place('sunshroom',0,row))break;
   if(g.plants.filter(p=>p.kind==='sunshroom').length>=4){
    for(const row of rows)if(place(shooter,1,row))break;
    for(const row of rows)if(place('fumeshroom',2,row))break;
    for(const grave of g.graves)if(place('gravebuster',grave.column,grave.row))break;
   }
   g.step();g.drainEvents();
  }
  assert.equal(g.phase,'won',`level ${level}, seed ${seed}, wave ${g.wave}, ticks ${g.ticks}`);
 }
});
