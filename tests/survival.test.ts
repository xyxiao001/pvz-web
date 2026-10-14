import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/model';
import { GameClock, type GameSpeed } from '../src/game/clock';
import { cellX, type PlantKind } from '../src/game/config';
import { generateSurvivalWaves, survivalRoster } from '../src/game/survival';
import data from '../src/game/data/portable-adventure.json';

const loadout: PlantKind[] = ['sunflower', 'peashooter', 'snowpea', 'repeater', 'wallnut', 'cherrybomb'];
function begin(seed = 12) {
  const game = new Game(9, seed, 'endless');
  for (const kind of loadout) game.chooseSeed(kind);
  game.start(); return game;
}
const step = (game: Game, count: number) => { for (let i = 0; i < count; i++) { game.step(); game.drainEvents(); } };

test('endless uses five rows, 50 sun, all migrated day plants and up to ten selected slots without adventure unlocks', () => {
  const game = new Game(1, 12, 'endless');
  assert.equal(game.sun, 50); assert.deepEqual(game.config.rows, [0,1,2,3,4]);
  assert.equal(game.config.seeds.length, 36); assert.equal(game.config.reward, null);
  game.start(); assert.equal(game.phase, 'ready');
  game.chooseSeed('lilypad'); assert.equal(game.seeds.length, 0);
  for (const kind of loadout) game.chooseSeed(kind);
  game.start(); game.toggleShovel(); assert.equal(game.digging, true);
  step(game, 400); assert.equal(game.suns.length, 1); // starts even without a first plant
  step(game, 1399); assert.equal(game.wave, 0);
  step(game, 1); assert.equal(game.wave, 1);
  step(game, 60000); assert.equal(game.phase, 'lost');
  const restarted = begin();
  assert.equal(restarted.survivalStage, 0); assert.equal(restarted.survivalFlags, 0);
  assert.equal(restarted.sun, 50); assert.equal(restarted.plants.length, 0);
});

test('survival roster matches initial types, then samples the explicitly migrated land roster', () => {
  assert.deepEqual(survivalRoster(0, () => .9), ['normal', 'cone', 'bucket']);
  for (const random of [0, .19, .2, .999]) {
    for (const stage of [1,2,3,50,1000]) {
      const roster = survivalRoster(stage, () => random);
      assert.equal(roster[0], 'normal'); assert.equal(roster[1], random < .2 ? 'newspaper' : 'cone');
      assert.equal(new Set(roster).size, roster.length);
      assert.equal(roster.length, 2 + Math.min(stage + 1 + (stage >= 3 ? 2 : 0), 9));
    }
  }
});

test('survival uses 20 waves, two flags, original point growth and original 50-zombie wave cap', () => {
  for (const stage of [0,1,2,25,1000]) {
    const waves = generateSurvivalWaves(stage, ['normal'], () => 0);
    assert.equal(waves.length, 20);
    assert.deepEqual(waves.flatMap((w,i) => w.includes('flag') ? [i+1] : []), [10,20]);
    for (const [index,wave] of waves.entries()) {
      const points = stage === 0 ? Math.floor(index/3)+1 : Math.floor((stage*20+index)*2/5)+1;
      assert.equal(wave.length, Math.min(50, index % 10 === 9 ? Math.trunc(points*2.5) : points));
    }
  }
  // Survival does not force bucketheads into the final wave like adventure.
  assert.equal(generateSurvivalWaves(0, survivalRoster(0, () => 0), () => 0)[19].includes('bucket'), false);
});

test('survival retains per-stage first-wave restrictions and advances them after 18 flags', () => {
  const waves = generateSurvivalWaves(1, ['normal','door'], () => .999);
  assert.ok(waves.slice(0,4).every(w => !w.includes('door')));
  assert.ok(waves[4].includes('door'));
  assert.ok(generateSurvivalWaves(25, ['normal','door'], () => .999)[0].includes('door'));
  const budget = generateSurvivalWaves(1, ['normal','bucket'], () => .999);
  assert.equal(budget[0].reduce((sum, kind) => sum + data.zombies[kind].value, 0), 9);
});

test('final survivors must die before repick; plants, sun, health, timers, cooldowns and spent mowers survive stages', () => {
  const game = begin(); game.sun = 800;
  game.select('wallnut'); game.plant(3, 2); game.plants[0].health = 1234;
  game.mowers[0].state = 'spent';
  step(game, 1800); game.wave = 20;
  game.step(); assert.equal(game.phase, 'playing'); assert.equal(game.survivalFlags, 1);
  game.zombies = []; game.step();
  assert.equal(game.phase, 'intermission'); assert.equal(game.survivalFlags, 2);
  assert.ok(game.drainEvents().every(event => event.kind !== 'win'));
  const before = JSON.stringify(game); step(game, 100); assert.equal(JSON.stringify(game), before);
  const plants = structuredClone(game.plants), mowers = structuredClone(game.mowers);
  const sun = game.sun, cooldown = game.cooldowns.wallnut, ticks = game.ticks;
  game.nextSurvivalStage();
  assert.equal(game.phase, 'ready'); assert.equal(game.survivalStage, 1);
  assert.equal(game.wave, 0); assert.equal(game.survivalFlags, 2); assert.deepEqual(game.seeds, loadout);
  assert.deepEqual(game.plants, plants); assert.deepEqual(game.mowers, mowers);
  assert.equal(game.sun, sun); assert.equal(game.cooldowns.wallnut, cooldown); assert.equal(game.ticks, ticks);
  const ready = JSON.stringify(game); step(game, 100); assert.equal(JSON.stringify(game), ready);
  game.start(); step(game, 599); assert.equal(game.wave, 0);
  assert.equal(game.cooldowns.wallnut, cooldown - 599);
  step(game, 1); assert.equal(game.wave, 1);
});

test('continuous stage transitions have no final win and keep cumulative flag count', () => {
  const game = begin();
  // Isolate progression from combat, including the original stage-50 spawn cap.
  for (let stage = 0; stage < 55; stage++) {
    assert.equal(game.survivalStage, stage);
    game.wave = 10; assert.equal(game.survivalFlags, stage*2);
    game.wave = 11; assert.equal(game.survivalFlags, stage*2+1);
    game.wave = 20; game.zombies = []; game.step();
    assert.equal(game.phase, 'intermission'); assert.equal(game.survivalFlags, stage*2+2);
    assert.ok(game.drainEvents().every(event => event.kind !== 'win'));
    game.nextSurvivalStage();
    game.start();
  }
});

test('survival stays identical at 30/60/120 Hz and 1x/2x/4x, pauses, and stops the clock for repick', () => {
  const run = (hz: number, speed: GameSpeed) => {
    const game = begin(); game.autoCollectSun = true;
    const clock = new GameClock(); clock.speed = speed;
    for (let i = 0; i < hz * 24 / speed; i++) clock.advance(game, 1000/hz, () => {});
    return game;
  };
  const reference = run(60, 1);
  for (const hz of [30,60,120]) for (const speed of [1,2,4] as const) assert.deepEqual(run(hz, speed), reference);
  reference.drainEvents(); reference.pause(); const paused = JSON.stringify(reference); step(reference, 500);
  assert.equal(JSON.stringify(reference), paused);
  reference.resume(); reference.wave = 20; reference.zombies = [];
  const clock = new GameClock(); clock.speed = 4; const ticks = reference.ticks;
  assert.equal(clock.advance(reference, 100, () => {}), 1);
  assert.equal(reference.ticks, ticks + 1); assert.equal(clock.alpha, 0);
});

test('starter loadouts establish two flags; adaptive cards reach six against late enemies', () => {
const choices: PlantKind[] = ['sunflower','potatomine','snowpea','repeater','wallnut','cherrybomb'];
const plant = (g: Game, kind: PlantKind, column: number, row: number) => {
  if (!g.canPlant(kind,column,row)) return false;
  g.select(kind); return g.plant(column,row);
};
for (const [seed, finalStage] of [[1,2],[23,0],[123456,0]]) {
 const g = new Game(9,seed,'endless'); g.autoCollectSun=true;
 for (const kind of choices) g.chooseSeed(kind); g.start();
 for(let frame=0;frame<200000 && g.phase!=='lost';frame++) {
  if(g.seeds.includes('blover')&&g.zombies.some(z=>z.flying&&z.x<650))for(const row of g.config.rows)for(let col=2;col<9;col++)plant(g,'blover',col,row);
  if(g.seeds.includes('splitpea'))for(const row of g.config.rows)if(!g.plants.some(p=>p.row===row&&p.kind==='splitpea')){const old=g.plants.find(p=>p.column===2&&p.row===row);if(old&&g.sun>=125&&g.cooldowns.splitpea===0){g.cancelSelection();g.toggleShovel();g.dig(2,row);}plant(g,'splitpea',2,row);}
  if(g.seeds.includes('jalapeno')&&g.cooldowns.jalapeno===0&&g.sun>=125){const danger=g.zombies.filter(z=>!z.hypnotized&&!z.underground&&z.x<350).sort((a,b)=>a.x-b.x)[0];if(danger){let placed=false;for(let col=0;col<9;col++)if(plant(g,'jalapeno',col,danger.row)){placed=true;break;}if(!placed){g.cancelSelection();g.toggleShovel();g.dig(0,danger.row);plant(g,'jalapeno',0,danger.row);}}}
  if(g.seeds.includes('tallnut'))for(const row of g.config.rows){const old=g.plants.find(p=>p.column===7&&p.row===row&&p.kind==='wallnut');if(old&&g.sun>=125&&g.cooldowns.tallnut===0){g.cancelSelection();g.toggleShovel();g.dig(7,row);}plant(g,'tallnut',7,row);}
  const threats=g.zombies.filter(z=>z.health>=(z.kind==='pole'?167:90)).sort((a,b)=>a.x-b.x);
  if(g.plants.filter(p=>p.kind==='sunflower').length<10) {
   for(const col of [0,1]) for(const row of g.config.rows) plant(g,'sunflower',col,row);
  }
  for(const z of threats) {
   if(z.kind!=='pole'&&z.x>600&&!g.plants.some(p=>p.row===z.row&&(p.kind==='potatomine'||p.kind==='snowpea')))plant(g,'potatomine',4,z.row);
   if(z.kind==='jack'&&z.x<650 || z.x<400 || (z.x<630&&threats.filter(o=>Math.abs(o.row-z.row)<=1&&Math.abs(o.x-z.x)<100).length>=5)) {
    for(const row of g.config.rows) for(let col=2;col<9;col++) if(Math.abs(row-z.row)<=1&&Math.abs(cellX(col)-z.x)<100){
     if(g.sun>=150&&g.cooldowns.cherrybomb===0&&g.plants.some(p=>p.column===col&&p.row===row)){g.cancelSelection();g.toggleShovel();g.dig(col,row);}
     plant(g,'cherrybomb',col,row);
    }
   }
  }
  const rows=[...g.config.rows].sort((a,b)=>{
   const danger=(row:number)=>g.plants.filter(p=>p.row===row&&(p.kind==='snowpea'||p.kind==='repeater')).length*1000+(threats.find(z=>z.row===row)?.x??900);
   return danger(a)-danger(b);
  });
  for(const row of rows) {
   if(!g.plants.some(p=>p.row===row&&p.kind==='snowpea'))plant(g,'snowpea',2,row);
   if(g.plants.filter(p=>p.kind==='snowpea').length===5) {
    for(const col of [3,5,4,6])plant(g,'repeater',col,row);
    plant(g,'wallnut',7,row);
   }
  }
  g.step();g.drainEvents();
  if(g.phase==='intermission') {
   assert.equal(g.survivalFlags, (g.survivalStage + 1) * 2);
   assert.ok(g.plants.length > 0);
   if(g.survivalStage===finalStage)break;
   g.nextSurvivalStage();
   const next:PlantKind[]=[...choices];next[4]='jalapeno';
   if(g.survivalEnemies.includes('pogo'))next[0]='tallnut';
   if(g.survivalEnemies.includes('digger'))next[1]='splitpea';
   if(g.survivalEnemies.includes('balloon'))next[4]='blover';
   for(const kind of [...g.seeds])if(!next.includes(kind))g.chooseSeed(kind);
   for(const kind of next)if(!g.seeds.includes(kind))g.chooseSeed(kind);
   g.start();
  }
 }
 assert.equal(g.phase, 'intermission', `seed ${seed}: stage ${g.survivalStage}, wave ${g.wave}, enemies ${g.survivalEnemies}, survivors ${g.zombies.filter(z=>z.x<100).map(z=>z.kind)}`);
 assert.equal(g.survivalStage, finalStage);
}
});
