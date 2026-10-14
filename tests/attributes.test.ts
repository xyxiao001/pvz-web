import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, type Zombie } from '../src/game/model';
import { GameClock, type GameSpeed } from '../src/game/clock';
import { PLANTS } from '../src/game/config';
import { walkingCycleTicks, walkingSpeed } from '../src/game/zombie-motion';

function walkingGame(kind: Zombie['kind'] = 'normal', chilled = false) {
  const game = new Game(7, 321); game.start(); game.select('sunflower'); game.plant(0, 2);
  game.plants = []; game.wave = game.config.waveCount;
  game.zombies = [{ id: 1000, kind, row: 1, x: 800, health: kind === 'pole' ? 500 : 270,
    armor: kind === 'cone' ? 370 : 0, speed: kind === 'flag' ? .45 : kind === 'pole' ? .67 : .3,
    biteIn: 4, eating: false, wave: 0, hitAt: -100, chillIn: chilled ? 10000 : 0,
    hasPole: kind === 'pole', vaultIn: 0, animationTime: 0, shield: 0, rageIn: 0, riseIn: 0 }];
  return game;
}

// Derived from Portable UpdateAnimSpeed + GetTrackVelocity + GetFrameTime,
// and the source normal/run/post-vault _ground tracks (47/37/45 poses).
test('zombie 10-second distances match the source ground-cycle means, not raw mVelX', () => {
  const expected = { normal: 144.06521739130434, cone: 144.06521739130434,
    flag: 216.09782608695653, pole: 323.64722222222224 };
  for (const kind of ['normal', 'cone', 'flag', 'pole'] as const) {
    const game = walkingGame(kind);
    for (let i = 0; i < 1000; i++) game.step();
    assert.ok(Math.abs(800 - game.zombies[0].x - expected[kind]) < 1e-8, kind);
  }
  const landed = { ...walkingGame('pole').zombies[0], hasPole: false, speed: .3 };
  assert.ok(Math.abs(walkingSpeed(landed) * 1000 - 144.20454545454547) < 1e-8);
});

test('walking visual cycle follows source speed and preserves all poses regardless of atlas fps', () => {
  const normal = walkingGame().zombies[0];
  assert.ok(Math.abs(walkingCycleTicks(normal) - 353.1914893617021) < 1e-8);
  for (const sourceClipTicks of [188, 330]) {
    const playbackRate = sourceClipTicks / walkingCycleTicks(normal);
    assert.ok(Math.abs(walkingCycleTicks(normal) * playbackRate - sourceClipTicks) < 1e-10);
  }
});

test('30/60/120/144 Hz produce identical movement, sun, cooldown and wave state at every speed', () => {
  function run(fps: number, speed: GameSpeed) {
    const game = new Game(7, 321); game.start(); game.select('sunflower'); game.plant(0, 2);
    const clock = new GameClock(); clock.speed = speed; let last = 0;
    for (let frame = 1; frame <= fps * 30 / speed; frame++) {
      const now = Math.round(frame * 1000 / fps);
      clock.advance(game, now - last, () => {}); last = now;
    }
    assert.equal(game.ticks, 3000); return game;
  }
  const reference = run(60, 1);
  for (const speed of [1, 2, 4] as const) for (const fps of [30, 60, 120, 144]) assert.deepEqual(run(fps, speed), reference);
});

test('chill retains 40% walking speed after ground conversion', () => {
  const normal = walkingGame(); const chilled = walkingGame('normal', true);
  for (let i = 0; i < 1000; i++) { normal.step(); chilled.step(); }
  assert.ok(Math.abs((800 - chilled.zombies[0].x) / (800 - normal.zombies[0].x) - .4) < 1e-10);
});

test('six available lawn plants retain Portable cost, refresh and health values', () => {
  const expected = { peashooter: [100, 750, 300], sunflower: [50, 750, 300], cherrybomb: [150, 5000, 300],
    wallnut: [50, 3000, 4000], potatomine: [25, 3000, 300], snowpea: [175, 750, 300] };
  for (const kind of Object.keys(expected) as (keyof typeof expected)[]) {
    const plant = PLANTS[kind]; assert.deepEqual([plant.cost, plant.cooldown, plant.health], expected[kind]);
  }
});

test('sunflower produces 25 sun at 3–12.5 seconds then at 23.5–25 second intervals', () => {
  const firstDelays = new Set<number>(); const laterDelays = new Set<number>();
  for (const seed of [1, 200, 1000, 20000, 900000]) {
    const game = new Game(2, seed); game.start(); game.select('sunflower'); game.plant(0, 2);
    const plant = game.plants[0]; const first = plant.actionIn;
    assert.ok(first >= 300 && first <= 1250); firstDelays.add(first);
    for (let i = 0; i < first; i++) game.step();
    const produced = game.suns.find(sun => sun.x === 92)!;
    assert.ok(produced); game.collectSun(produced.id); assert.equal(game.sun, 25);
    assert.ok(plant.actionIn >= 2350 && plant.actionIn <= 2500); laterDelays.add(plant.actionIn);
  }
  assert.ok(firstDelays.size > 1 && laterDelays.size > 1);
});
