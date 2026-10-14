import test from 'node:test';
import assert from 'node:assert/strict';
import { GameClock } from '../src/game/clock';
import { Game, type Zombie } from '../src/game/model';
import { SURVIVAL_SCENES, type PlantKind } from '../src/game/config';
import { combatTextureFiles } from '../src/rendering/asset-plan';
import { hasPlantMotion, motionFrame } from '../src/rendering/plant-motion';
import motion from '../public/assets/runtime/plant-motion/wintermelon.json';

function begin(scene: 'pool' | 'roof' = 'pool') {
  const game = new Game(49, 123, 'endless', scene);
  for (const kind of ['sunflower','melonpult','wintermelon','pumpkin',scene === 'pool' ? 'lilypad' : 'flowerpot','wallnut'] as PlantKind[]) game.chooseSeed(kind);
  game.start(); game.sun = 9000; return game;
}
function place(g: Game, kind: PlantKind, c = 0, r = 0) { g.cancelSelection(); g.select(kind); return g.plant(c,r); }
function step(g: Game, count: number) { for(let i=0;i<count;i++)g.step(); }
function zombie(id: number, row=0, extra: Partial<Zombie> = {}): Zombie {
  return { id,kind:'normal',row,x:650,health:270,armor:0,shield:0,speed:0,biteIn:4,eating:false,wave:0,hitAt:-100,chillIn:0,hasPole:false,vaultIn:0,animationTime:0,rageIn:0,riseIn:0,...extra };
}
function winter(g: Game) {
  assert.ok(place(g,'melonpult')); assert.ok(place(g,'wintermelon'));
  const plant=g.plants.find(p=>p.kind==='wintermelon')!; plant.actionIn=1; return plant;
}
test('winter melon is available in five endless scenes and upgrades only a melon-pult',()=>{
  for(const scene of SURVIVAL_SCENES)assert.ok(new Game(49,1,'endless',scene).config.seeds.includes('wintermelon'));
  assert.ok(!new Game(49,1).config.seeds.includes('wintermelon'));
  const g=begin();assert.equal(place(g,'wintermelon'),false);
  assert.ok(place(g,'lilypad',0,2));assert.ok(place(g,'melonpult',0,2));assert.ok(place(g,'pumpkin',0,2));
  const sun=g.sun;assert.ok(place(g,'wintermelon',0,2));
  assert.deepEqual(g.plants.map(p=>p.kind),['lilypad','pumpkin','wintermelon']);
  assert.equal(g.sun,sun-200);assert.equal(g.plantCost('wintermelon'),250);assert.equal(g.cooldown('wintermelon'),5000);
});
test('winter melon winds up for 35 ticks, then launches with native shooting timing',()=>{
  const g=begin();const plant=winter(g);g.zombies=[zombie(800)];
  step(g,1);assert.equal(plant.winterLaunchIn,36);assert.equal(plant.shotAt,1);assert.equal(g.peas.length,0);
  step(g,34);assert.equal(g.peas.length,0);step(g,1);
  assert.equal(g.peas[0].lob?.kind,'wintermelon');assert.equal(g.peas[0].age,1);assert.equal(plant.shotAt,1);
  assert.equal(motion.shooting.duration,38/35*100);
  assert.deepEqual(motionFrame(1000,motion.shooting.duration,38,false),{frame:37,next:37,fraction:0});
});
test('winter melon damages shield and body, splashes adjacent rows and chills for 1000 ticks',()=>{
  const g=begin();winter(g);
  const target=zombie(800,0,{kind:'door',shield:1100}), adjacent=zombie(801,1),outside=zombie(802,2);
  g.zombies=[target,adjacent,outside];step(g,135);
  assert.equal(target.health,190);assert.equal(target.shield,1020);assert.equal(target.chillIn,1000);
  assert.equal(adjacent.health,244);assert.equal(adjacent.chillIn,1000);
  assert.equal(outside.health,270);assert.equal(outside.chillIn,0);
});
test('winter splash preserves longer chill, respects ice machines and sleds, and chills catapults',()=>{
  const g=begin();winter(g);
  const target=zombie(800,0,{chillIn:2000}), ice=zombie(801,1,{kind:'zomboni',health:1350}),sled=zombie(802,1,{kind:'bobsled',armor:300,sled:802,sledLeader:802}), catapult=zombie(803,1,{kind:'catapult',health:850,catapult:{ammo:0,remaining:1000,phase:'reload'}});
  g.iceTrails=[{row:1,x:500,remaining:3000}];g.zombies=[target,ice,sled,catapult];step(g,135);
  assert.equal(target.chillIn,1865);assert.equal(ice.chillIn,0);assert.equal(sled.chillIn,0);
  assert.equal(catapult.health,824);assert.equal(catapult.chillIn,1000);
});
test('pause and restore retain the windup, projectile, cooldown and roof base',()=>{
  const g=begin('roof');winter(g);g.zombies=[zombie(800)];step(g,20);g.pause();
  const saved=g.snapshot();step(g,20);assert.deepEqual(g.snapshot(),saved);
  const restored=Game.restore(saved);assert.deepEqual(restored.snapshot(),saved);g.resume();restored.resume();step(g,60);step(restored,60);
  assert.deepEqual(restored.snapshot(),g.snapshot());assert.equal(restored.peas[0].lob?.kind,'wintermelon');
  const inFlight=Game.restore(restored.snapshot());assert.deepEqual(inFlight.snapshot(),restored.snapshot());
  assert.ok(restored.plants.some(p=>p.kind==='flowerpot'&&p.column===0&&p.row===0));
  restored.wave=20;restored.zombies=[];restored.peas=[];restored.step();restored.nextSurvivalStage();
  assert.equal(restored.plantCost('wintermelon'),250);assert.equal(restored.cooldown('wintermelon'),4919);
});
test('winter parts and projectile are lazy, including an in-flight shot without a retained plant',()=>{
  const g=begin();assert.equal(combatTextureFiles(g).wintermelon,'original/wintermelon-projectile.webp');
  assert.ok(hasPlantMotion('wintermelon'));
  winter(g);g.zombies=[zombie(800)];step(g,36);g.seeds=['wallnut'];g.plants=[];
  assert.ok(combatTextureFiles(g).wintermelon);g.peas=[];assert.equal(combatTextureFiles(g).wintermelon,undefined);
  for(const group of [...motion.groups,...motion.shooting.groups])for(const track of group.tracks){
    assert.equal(track.poses.length,group.length);
    for(const pose of track.poses)if(pose[8])assert.ok(pose[8] as string in motion.frames);
  }
});

test('winter windup, flight, splash and chill are identical across render rates and speed settings',()=>{
  const run=(hz:number,speed:1|2|4)=>{
    const g=begin();winter(g);g.zombies=[zombie(800,0,{kind:'bucket',armor:1100}),zombie(801,1)];
    const clock=new GameClock();clock.speed=speed;
    const duration=8000/speed;let elapsed=0;
    while(elapsed<duration){const frame=Math.min(1000/hz,duration-elapsed);clock.advance(g,frame,()=>{});elapsed+=frame;}
    // Resolve floating-point frame partitioning at the exact final 10 ms boundary.
    clock.advance(g,1e-6,()=>{});return g.snapshot();
  };
  const expected=run(60,1);
  for(const hz of [30,60,144])for(const speed of [1,2,4] as const)assert.deepEqual(run(hz,speed),expected);
});
