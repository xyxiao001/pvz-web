import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, type Zombie } from '../src/game/model';
import { SURVIVAL_SCENES, cellX, type PlantKind } from '../src/game/config';
import { survivalRoster } from '../src/game/survival';
import { combatTextureFiles } from '../src/rendering/asset-plan';
import { hasPlantMotion } from '../src/rendering/plant-motion';
const cards: PlantKind[] = ['sunflower','twinsunflower','repeater','gatlingpea','pumpkin','wallnut','lilypad','snowpea','cherrybomb','torchwood'];
function begin(scene: 'pool' | 'roof' = 'pool') {
  const g = new Game(9, 15, 'endless', scene);
  for (const kind of cards) g.chooseSeed(kind);
  if (scene === 'roof') g.chooseSeed('flowerpot');
  g.start(); g.sun = 9000; return g;
}
function place(g: Game, kind: PlantKind, c: number, r: number) { g.cancelSelection(); g.select(kind); return g.plant(c,r); }
const step = (g:Game,n:number) => { for(let i=0;i<n;i++)g.step(); };

test('all five endless scenes offer both upgrades and 6–10 cards; adventure keeps six',()=>{
  for (const scene of SURVIVAL_SCENES) {
    const g=new Game(9,1,'endless',scene);
    assert.equal(g.seedCapacity,10);
    assert.ok(g.config.seeds.includes('gatlingpea')&&g.config.seeds.includes('twinsunflower'));
    for(const kind of g.config.seeds.slice(0,5))g.chooseSeed(kind);
    g.start();assert.equal(g.phase,'ready');
    for(const kind of g.config.seeds.slice(5,11))g.chooseSeed(kind);
    assert.equal(g.seeds.length,10);assert.ok(g.canStart);g.start();assert.equal(g.phase,'playing');
  }
  const adventure=new Game(9,1); for(const kind of adventure.config.seeds)adventure.chooseSeed(kind);
  assert.equal(adventure.seeds.length,6);assert.equal(adventure.config.seeds.includes('gatlingpea'),false);
});
test('upgrade consumes only its base plant, preserving lily pad, pumpkin and source prices',()=>{
  const g=begin();assert.equal(place(g,'gatlingpea',0,0),false);
  assert.ok(place(g,'lilypad',0,2));assert.ok(place(g,'repeater',0,2));assert.ok(place(g,'pumpkin',0,2));
  const pad=g.plants[0], shell=g.plants[2],sun=g.sun;
  assert.ok(place(g,'gatlingpea',0,2));assert.equal(g.sun,sun-250);
  assert.deepEqual(g.plants.map(p=>p.kind),['lilypad','pumpkin','gatlingpea']);
  assert.equal(g.plants[0],pad);assert.equal(g.plants[1],shell);
  assert.equal(g.cooldown('gatlingpea'),5000);assert.equal(g.plantCost('gatlingpea'),300);
  assert.equal(place(g,'twinsunflower',0,2),false);
  g.toggleShovel();g.dig(0,2);g.toggleShovel();g.dig(0,2);
  assert.equal(g.plantCost('gatlingpea'),250);assert.equal(g.plants[0],pad);
});
test('gatling fires four separate 20-damage peas with source 17/16/17 tick spacing',()=>{
  const g=begin();place(g,'repeater',0,0);place(g,'gatlingpea',0,0);
  const z:Zombie={id:900,kind:'bucket',row:0,x:780,health:270,armor:1100,shield:0,speed:0,biteIn:4,eating:false,wave:0,hitAt:-100,chillIn:0,hasPole:false,vaultIn:0,animationTime:0,rageIn:0,riseIn:0};g.zombies=[z];g.drainEvents();
  const shots:number[]=[];
  for(let i=0;i<100;i++){g.step();if(g.drainEvents().some(e=>e.kind==='shoot'))shots.push(g.ticks);}
  assert.deepEqual(shots,[32,49,65,82]);assert.equal(g.peas.length,4);
  step(g,250);assert.ok(z.armor<=1020);
});
test('twin sunflower produces two falling suns and preserves its pot on a roof',()=>{
  const g=begin('roof');const pot=g.plants.find(p=>p.column===0&&p.row===0)!;
  assert.ok(place(g,'sunflower',0,0));assert.ok(place(g,'twinsunflower',0,0));
  const twin=g.plants.find(p=>p.kind==='twinsunflower')!;twin.actionIn=1;step(g,1);
  assert.equal(g.plants.find(p=>p.id===pot.id),pot);assert.equal(g.suns.length,2);
  assert.deepEqual(g.suns.map(s=>s.value),[25,25]);assert.ok(g.suns.every(s=>s.y<s.targetY));
});
test('ten-card saves and round transitions retain upgrade cooldowns, plants and pricing',()=>{
  const g=begin();place(g,'sunflower',0,0);place(g,'twinsunflower',0,0);step(g,10);
  g.pause();const restored=Game.restore(g.snapshot());assert.deepEqual(restored.snapshot(),g.snapshot());
  assert.equal(restored.seeds.length,10);assert.equal(restored.plantCost('twinsunflower'),200);assert.equal(restored.cooldown('twinsunflower'),4990);
  restored.resume();restored.wave=20;restored.zombies=[];restored.step();restored.nextSurvivalStage();
  assert.equal(restored.seeds.length,10);assert.ok(restored.canStart);assert.equal(restored.plants[0].kind,'twinsunflower');
});
test('upgrade actors remain lazy and pea texture is included without a base shooter',()=>{
  const g=begin();g.seeds=['gatlingpea','twinsunflower'];
  assert.ok(hasPlantMotion('gatlingpea'));assert.ok(hasPlantMotion('twinsunflower'));
  assert.equal(combatTextureFiles(g).pea,'pea.webp');
});
test('sled teams are drawn with ice machines only on supported scenes; later rosters are broader',()=>{
  let seen=false;
  for(const scene of SURVIVAL_SCENES)for(let seed=0;seed<100;seed++){
    let state=seed;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;};
    const roster=survivalRoster(4,random,scene);
    assert.equal(new Set(roster).size,roster.length);
    if(scene==='night'||scene==='roof')assert.ok(!roster.includes('bobsled'));
    if(roster.includes('bobsled')){seen=true;assert.ok(roster.includes('zomboni'));}
  }
  assert.ok(seen);assert.equal(survivalRoster(3,()=>.4,'pool').length,8);
});
test('an endless sled wave creates a four-member team on its retained ice track',()=>{
  const g=begin();g.iceTrails=[{row:0,x:cellX(6),remaining:3000}];g.waves[0]=['bobsled'];step(g,1800);
  assert.equal(g.zombies.filter(z=>z.kind==='bobsled').length,4);
  assert.ok(g.zombies.every(z=>z.row===0&&z.sled));
});
