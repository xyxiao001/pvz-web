import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, type Zombie } from '../src/game/model';
import { LEVEL_IDS, LEVELS, PLANTS, cellX, type LevelId, type PlantKind, type ZombieKind } from '../src/game/config';
import { generateWaves } from '../src/game/waves';
import data from '../src/game/data/portable-adventure.json';
import { animationNames, combatTextureFiles } from '../src/rendering/asset-plan';
import { GameClock } from '../src/game/clock';
const tick=(g:Game,n:number)=>{for(let i=0;i<n;i++){g.step();g.drainEvents();}};
function game(seeds:PlantKind[]){const g=new Game(49,123456);for(const k of seeds)g.chooseSeed(k);g.start();g.sun=10000;return g;}
function plant(g:Game,k:PlantKind,c:number,r:number){g.cancelSelection();g.select(k);assert.ok(g.plant(c,r),`${k} ${c},${r}`);return g.plants.at(-1)!;}
const spawn=(g:Game,k:ZombieKind,r:number,x:number)=>(g as unknown as {spawnZombie(k:ZombieKind,r:number,x:number,w:number):Zombie}).spawnZombie(k,r,x,0);
const seeds:PlantKind[]=['umbrella','marigold','melonpult','flowerpot','chomper','pumpkin'];

test('5–6 through 5–9 preserve source waves and eligibility, with the original reward sequence',()=>{
 assert.deepEqual(LEVEL_IDS.slice(45,49),[46,47,48,49]);assert.deepEqual(data.waveCounts.slice(45,49),[20,30,20,30]);
 for(const l of LEVEL_IDS.slice(45,49))for(const seed of [0,.3,.8]){const waves=generateWaves(l,()=>seed);assert.equal(waves.length,LEVELS[l].waveCount);for(const k of waves.flat())assert.equal(data.zombies[k].allowedLevels[l-1],1,`${l}:${k}`);assert.ok(!waves.flat().includes('imp'));}
 for(const [l,k] of [[46,'catapult'],[48,'gargantuar']] as const){const waves=generateWaves(l,()=>.5);assert.ok(waves[Math.floor(waves.length/2)].includes(k));assert.ok(waves.at(-1)!.includes(k));}
 assert.equal(LEVELS[44].reward,null);assert.equal(LEVELS[45].reward,'garlic');assert.equal(LEVELS[46].reward,'umbrella');assert.equal(LEVELS[47].reward,'marigold');assert.equal(LEVELS[48].reward,'melonpult');assert.ok(!LEVELS[48].seeds.includes('melonpult'));assert.ok(LEVELS[49].seeds.includes('melonpult'));
 assert.deepEqual(['umbrella','marigold','melonpult'].map(k=>{const p=PLANTS[k as PlantKind];return[p.cost,p.cooldown,p.health];}),[[100,750,300],[50,3000,300],[300,750,300]]);
});
test('umbrella protects its nine cells from stealing and carrier bungees, not distant cells',()=>{
 const g=game(seeds);const u=plant(g,'umbrella',1,1),p=plant(g,'marigold',2,0);
 for(const drop of [undefined,'cone'] as const){const z=spawn(g,'bungee',0,cellX(2));z.row=0;z.x=cellX(2);z.bungee={phase:'down',remaining:1,column:2,drop};tick(g,101);assert.ok(g.plants.includes(p));assert.ok(!g.zombies.includes(z));assert.ok(!g.zombies.some(z=>z.kind==='cone'));}
 assert.ok(u.shotAt>0);
 const far=spawn(g,'bungee',4,cellX(2));far.row=4;far.x=cellX(2);far.bungee={phase:'down',remaining:1,column:2};tick(g,1);assert.equal(far.bungee.phase,'wait');
});
test('catapult targets the leftmost top plant, deals 75, and basketball respects umbrella coverage',()=>{
 for(const protectedCell of [false,true]){const g=game(seeds),p=plant(g,'marigold',0,0);plant(g,'pumpkin',0,0);if(protectedCell)plant(g,'umbrella',1,1);const z=spawn(g,'catapult',0,650);tick(g,192);assert.equal(z.health,850);assert.equal(p.health,protectedCell?300:225);assert.equal(g.plants.find(p=>p.kind==='pumpkin')!.health,4000);assert.equal(z.x,650);assert.equal(z.catapult!.ammo,19);}
});
test('catapult exhausts 20 balls then advances and crushes plants; cannot be swallowed',()=>{
 const g=game(seeds);plant(g,'umbrella',1,0);const z=spawn(g,'catapult',0,650);tick(g,6001);assert.equal(z.catapult!.ammo,0);const x=z.x;tick(g,10);assert.ok(z.x<x);z.x=cellX(1)+10;tick(g,1);assert.ok(!g.plants.some(p=>p.row===0&&p.column===1));
 const h=game(seeds),ch=plant(h,'chomper',2,0),car=spawn(h,'catapult',0,cellX(2)+80);car.speed=0;car.catapult!.phase='reload';car.catapult!.remaining=1000;tick(h,71);assert.equal(car.health,810);assert.equal(ch.chomp!.phase,'recover');
});
test('giant smash destroys pumpkin, plant and pot together after its windup',()=>{
 const g=game(seeds);plant(g,'marigold',2,0);plant(g,'pumpkin',2,0);const z=spawn(g,'gargantuar',0,cellX(2)+40);assert.equal(z.health,3000);tick(g,1);assert.equal(z.giant!.phase,'smash');tick(g,85);assert.equal(g.plants.filter(p=>p.column===2&&p.row===0).length,3);tick(g,1);assert.equal(g.plants.filter(p=>p.column===2&&p.row===0).length,0);
});
test('giant throws exactly one 270-health imp after losing half health; flight and landing precede walking',()=>{
 const g=game(seeds);plant(g,'umbrella',1,4);const z=spawn(g,'gargantuar',0,700);z.health=1499;tick(g,103);const imp=g.zombies.find(z=>z.kind==='imp')!;assert.ok(imp);assert.equal(imp.health,270);assert.ok(imp.flight);const end=imp.flight.endX;tick(g,140);assert.equal(imp.flight,undefined);assert.equal(imp.landingIn,0);assert.ok(imp.x<end);tick(g,1000);assert.equal(g.zombies.filter(z=>z.kind==='imp').length,1);
});
test('chomper bites giant for 40 instead of swallowing it',()=>{
 const g=game(seeds),p=plant(g,'chomper',2,0),z=spawn(g,'gargantuar',0,cellX(2)+80);z.speed=0;tick(g,71);assert.equal(z.health,2960);assert.equal(p.chomp!.phase,'recover');
});
test('melon deals 80 on impact and 26 splash across adjacent lanes, including shield and body',()=>{
 const g=game(seeds),p=plant(g,'melonpult',2,1);p.actionIn=1;
 const target=spawn(g,'ladder',1,650),near=spawn(g,'normal',2,660),far=spawn(g,'normal',3,650);for(const z of [target,near,far])z.speed=0;
 tick(g,101);assert.equal(target.health,420);assert.equal(target.shield,420);assert.equal(near.health,244);assert.equal(far.health,270);
});
test('marigold creates collectable money, never sun, and stops production 60 seconds into final wave',()=>{
 const g=game(seeds),p=plant(g,'marigold',0,0);p.actionIn=1;const before=g.sun;tick(g,1);assert.equal(g.coins.length,1);const c=g.coins[0];assert.ok([10,50].includes(c.value));assert.ok(c.y<c.targetY);g.pause();const y=c.y;tick(g,10);assert.equal(c.y,y);g.collectCoin(c.id);assert.equal(g.money,0);g.resume();g.collectCoin(c.id);assert.equal(g.money,c.value);assert.equal(g.sun,before);assert.equal(g.coins.length,0);
 g.wave=g.config.waveCount;spawn(g,'catapult',4,700).speed=0;p.productionEnding=g.ticks+2;p.actionIn=1;tick(g,1);assert.equal(g.coins.length,1);p.actionIn=1;tick(g,2);assert.equal(g.coins.length,1);
});
test('late-roof assets remain lazy and giant includes its spawned imp',()=>{
 const available=['gargantuar-walk','gargantuar-bare-walk','imp-thrown','imp-land','catapult-shoot','umbrella','melonpult'];
 assert.deepEqual(animationNames(new Game(1,1),available),[]);
 const g=game(seeds),names=animationNames(g,available);for(const n of available)assert.ok(names.includes(n),n);
 const files=combatTextureFiles(g);assert.ok(files.melon&&files.basketball&&files.coinGold);assert.equal(combatTextureFiles(new Game(1,1)).basketball,undefined);
});
test('giant, catapult, money and shots agree at 30/60/144Hz and freeze while paused',()=>{
 const results=[];
 for(const fps of [30,60,144]){const g=game(seeds);plant(g,'melonpult',2,0);plant(g,'marigold',0,1);spawn(g,'catapult',1,650);spawn(g,'gargantuar',0,700).health=1499;const clock=new GameClock();for(let f=0;f<fps*8;f++)clock.advance(g,1000/fps,()=>{});clock.advance(g,.001,()=>{});g.drainEvents();g.pause();const before=g.snapshot();tick(g,100);assert.deepEqual(g.snapshot(),before);results.push(before);}
 assert.deepEqual(results[0],results[1]);assert.deepEqual(results[1],results[2]);
});
import { playRoofFinale } from './helpers/roof-finale';
for(const level of [46,47,48,49] as const)for(const seed of [1,123456])test(`adventure ${level} clears with normal six-card commands (${seed})`,()=>{
 const g=playRoofFinale(level,seed);assert.equal(g.phase,'won',`wave ${g.wave}, ticks ${g.ticks}, sun ${g.sun}, foes ${g.zombies.map(z=>`${z.kind}:${Math.round(z.x)}:${z.row}:${z.health}`).join(',')}`);assert.equal(g.wave,g.config.waveCount);
});

test('melon breaking a ladder also cancels placement and slows the zombie',()=>{
 const g=game(seeds),p=plant(g,'melonpult',2,0),z=spawn(g,'ladder',0,650);p.actionIn=1;z.speed=0;z.shield=50;tick(g,101);assert.equal(z.shield,0);assert.equal(z.health,420);assert.equal(z.speed,.3);
});
test('catapult ignores ice and butter while a nearby giant is frozen',()=>{
 const g=game(['iceshroom','coffeebean','kernelpult','umbrella','flowerpot','melonpult']);const p=plant(g,'iceshroom',0,0);p.awake=true;p.actionIn=1;
 const car=spawn(g,'catapult',0,650),giant=spawn(g,'gargantuar',1,650);tick(g,1);assert.equal(car.frozenIn,undefined);assert.equal(car.chillIn,0);assert.ok(giant.frozenIn!>0);
 g.peas.push({id:999,row:0,x:650,y:100,ice:false,puff:false,age:99,lob:{kind:'butter',target:car.id,startX:200,endX:650,startY:100,endY:100,duration:100}});tick(g,1);assert.equal(car.butterIn,undefined);assert.equal(car.health,810);
});
