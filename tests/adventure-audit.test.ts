import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, type Plant, type Zombie } from '../src/game/model';
import { LEVELS, LEVEL_IDS, PLANTS, cellX, type PlantKind } from '../src/game/config';
import { GameClock } from '../src/game/clock';
import { stormOpacity } from '../src/rendering/storm';
import { animationNames } from '../src/rendering/asset-plan';
import animations from '../public/assets/runtime/animations.json';

const tick = (game: Game, count: number) => { for (let i = 0; i < count; i++) { game.step(); game.drainEvents(); } };
const plantFixture = (kind: PlantKind, column: number, row: number): Plant => ({ id: row * 9 + column + 100, kind, column, row, health: PLANTS[kind].health, born: 0, actionIn: 100, shotAt: -100 });
type ConveyorAccess = { random(): number; nextConveyorSeed(): PlantKind; lastConveyorSeed: PlantKind | null };
function draw(game: Game, random: number) {
  const internal = game as unknown as ConveyorAccess;
  internal.random = () => random; internal.lastConveyorSeed = null;
  return internal.nextConveyorSeed();
}

test('all 50 adventure rewards follow the source seed order and non-seed reward stages', () => {
  // ConstEnums.h:1037–1076; LawnApp::GetAwardSeedForLevel:2236.
  const order: PlantKind[] = ['peashooter','sunflower','cherrybomb','wallnut','potatomine','snowpea','chomper','repeater','puffshroom','sunshroom','fumeshroom','gravebuster','hypnoshroom','scaredyshroom','iceshroom','doomshroom','lilypad','squash','threepeater','tanglekelp','jalapeno','spikeweed','torchwood','tallnut','seashroom','plantern','cactus','blover','splitpea','starfruit','pumpkin','magnetshroom','cabbagepult','flowerpot','kernelpult','coffeebean','garlic','umbrella','marigold','melonpult'];
  const unlocked = new Set<PlantKind>(['peashooter']);
  for (const level of LEVEL_IDS) {
    const sub = (level - 1) % 10 + 1;
    const expected = sub === 4 || sub === 9 || level === 50 ? null : order[Math.floor((level - 1) / 10) * 8 + sub - (sub === 10 ? 2 : sub >= 5 ? 1 : 0)];
    assert.equal(LEVELS[level].reward, expected, `reward ${level}`);
    if (LEVELS[level].mode === 'lawn') for (const seed of LEVELS[level].seeds) assert.ok(unlocked.has(seed), `${level} must not unlock ${seed} early`);
    if (expected) unlocked.add(expected);
  }
});

test('2–10 does not supply excess gravebusters, even when repeat rules would give weight back', () => {
  const game = new Game(20, 1);
  assert.equal(draw(game, 0), 'gravebuster');
  game.graves = [];
  assert.equal(draw(game, 0), 'iceshroom');
  game.graves = [{ id: 900, column: 8, row: 0 }];
  game.plants = [plantFixture('gravebuster', 8, 0)];
  assert.equal(draw(game, 0), 'iceshroom');
  game.plants = [];
  game.conveyor = Array.from({ length: 4 }, (_, id) => ({ id, kind: 'gravebuster' as const, x: id * 50 }));
  assert.equal(draw(game, 0), 'iceshroom');
});

test('all pool conveyor finales reduce lily supply as the 18 water cells fill', () => {
  for (const level of [25, 30, 40] as const) {
    const game = new Game(level, 1);
    assert.equal(draw(game, .1), 'lilypad');
    game.plants = [2, 3].flatMap(row => Array.from({ length: 9 }, (_, column) => plantFixture('lilypad', column, row)));
    assert.notEqual(draw(game, .1), 'lilypad', `filled pool ${level}`);
    assert.equal(draw(game, 0), 'lilypad', 'source leaves a weight of one');
  }
});

test('5–10 rounds the source flowerpot weight instead of truncating it', () => {
  const game = new Game(50, 1);
  assert.equal(game.plants.filter(p => p.kind === 'flowerpot').length, 15);
  // 55 → 1 over 35 pots: 15 pots give 31.857… → 32, total weight 77.
  // A 0.41 draw is inside 32/77, but outside the old truncated 31/76.
  assert.equal(draw(game, .41), 'flowerpot');
});

test('4–5 held cards keep aging, first put-back grants three seconds, repeated put-back does not', () => {
  const game = new Game(35, 1); game.start();
  const vase = game.vases.find(v => v.content.type === 'seed')!;
  game.openVase(vase.column, vase.row);
  const drop = game.seedDrops[0]; game.selectDrop(drop.id);
  tick(game, 1600);
  assert.equal(drop.remaining, -100); assert.ok(game.seedDrops.includes(drop));
  game.pause(); tick(game, 100); assert.equal(drop.remaining, -100); game.resume();
  game.cancelSelection(); assert.equal(drop.remaining, 300); assert.equal(drop.timesDropped, 1);
  tick(game, 250); game.selectDrop(drop.id); tick(game, 100);
  game.toggleShovel(); assert.equal(drop.remaining, -50); assert.equal(drop.timesDropped, 2);
  tick(game, 1); assert.ok(!game.seedDrops.includes(drop));
});

test('4–5 held expired cards can still be planted without leaving a duplicate card', () => {
  const game = new Game(35, 2); game.start();
  const vase = game.vases.find(v => v.content.type === 'seed')!;
  game.openVase(vase.column, vase.row); const drop = game.seedDrops[0]; game.selectDrop(drop.id);
  tick(game, 1600); assert.ok(game.plant(0, 0));
  assert.equal(game.seedDrops.length, 0); assert.equal(game.plants[0].kind, drop.kind); assert.equal(game.sun, 0);
});

test('roof potato mine needs a pot, arms, explodes, and loads its existing animation', () => {
  const game = new Game(46, 1);
  for (const kind of ['potatomine','sunflower','cabbagepult','flowerpot','cherrybomb','squash'] as const) game.chooseSeed(kind);
  game.start(); assert.equal(game.phase, 'playing'); game.sun = 200;
  assert.equal(game.canPlant('potatomine', 5, 0), false);
  game.select('flowerpot'); assert.ok(game.plant(5, 0));
  game.select('potatomine'); assert.ok(game.plant(5, 0)); tick(game, 1500);
  const spawn = game as unknown as { spawnZombie(kind: 'normal', row: number, x: number, wave: number): Zombie };
  const zombie = spawn.spawnZombie('normal', 0, cellX(5), 0); tick(game, 1);
  assert.ok(zombie.health <= 0); assert.ok(!game.plants.some(p => p.kind === 'potatomine'));
  assert.ok(game.plants.some(p => p.kind === 'flowerpot' && p.column === 5 && p.row === 0));
  assert.ok(animationNames(game, Object.keys(animations.animations)).includes('potatomine-unarmed'));
});

test('4–10 starts with paired flashes and thunder at source timer boundaries', () => {
  const game = new Game(40, 1); game.start();
  assert.equal(game.stormIn, 400); assert.equal(game.stormFlash, 1);
  const thunders: number[] = [];
  for (let i = 0; i < 400; i++) { game.step(); if (game.drainEvents().some(e => e.kind === 'thunder')) thunders.push(game.ticks); }
  assert.deepEqual(thunders, [100, 250]);
  assert.ok(game.stormIn >= 450 && game.stormIn <= 900);
  for (const style of [1, 2, 3] as const) {
    game.stormFlash = style; game.stormIn = 301;
    const heard: number[] = [];
    for (let i = 0; i < 151; i++) { game.step(); if (game.drainEvents().some(e => e.kind === 'thunder')) heard.push(game.stormIn); }
    assert.deepEqual(heard, style === 1 ? [300, 150] : style === 2 ? [300] : [150]);
  }
  assert.deepEqual(stormOpacity(3, 200, 12), { dark: 1, white: 0 });
  assert.ok(stormOpacity(2, 299, 12).white > .9);
  assert.ok(stormOpacity(1, 150, 12).white < .4);
  assert.ok(stormOpacity(3, 149, 12).white > .9);
  assert.equal(stormOpacity(3, 75, 12).white, 0);
  assert.deepEqual(stormOpacity(3, 75, 12), stormOpacity(3, 75, 17));
});

test('storm state and gameplay stay identical at 30/60/144 Hz and 1/2/4 speed', () => {
  const snapshots = [];
  for (const fps of [30, 60, 144]) for (const speed of [1, 2, 4] as const) {
    const game = new Game(40, 12); game.start(); const clock = new GameClock(); clock.speed = speed;
    for (let frame = 0; frame < fps * 12 / speed; frame++) clock.advance(game, 1000 / fps, () => {});
    clock.advance(game, .001, () => {}); assert.equal(game.ticks, 1200);
    game.drainEvents(); game.pause(); const before = game.snapshot(); tick(game, 50); assert.deepEqual(game.snapshot(), before); snapshots.push(before);
  }
  for (const snapshot of snapshots) assert.deepEqual(snapshot, snapshots[0]);
});
