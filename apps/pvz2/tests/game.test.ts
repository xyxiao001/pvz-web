import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, type Zombie } from '../src/game/model';
import { cellX, readLevel, type Properties, type SourceLevel } from '../src/game/level';

const read = (name: string) => JSON.parse(readFileSync(new URL(`../public/assets/${name}`, import.meta.url), 'utf8'));
const props: Properties = read('levels/properties.json');
const source: SourceLevel = read('levels/egypt1.source.json');
const timing = { shoot: 15 / 30, shootDuration: 26 / 30, produce: 23 / 30, produceDuration: 40 / 30 };
const create = () => new Game(readLevel(source), props, timing, 1234);
const tick = (game: Game, seconds: number) => { for (let i = 0; i < Math.round(seconds * 60); i++) game.tick(1 / 60); };
const mummy = (x: number, armor = 0): Zombie => ({ id: 9000, kind: 'mummy', row: 2, x, hp: 190, armor, eating: false, absorbed: 0, absorbUntil: 0 });

test('Egypt 1 retains all ten explicit spawn waves and the three source zombie types', () => {
  const level = readLevel(source);
  assert.equal(level.waves.length, 10);
  assert.deepEqual(level.waves[0], ['mummy']);
  assert.deepEqual(level.waves[9], ['mummy_armor1', 'mummy_armor1', 'ra', 'mummy', 'mummy', 'mummy']);
  assert.deepEqual([...new Set(level.waves.flat())].sort(), ['mummy', 'mummy_armor1', 'ra']);
});

test('planting consumes sun once, respects cells and cooldown, and pause freezes combat', () => {
  const game = create();
  assert.equal(game.plant('sunflower', 2, 0), true);
  assert.equal(game.sun, 100);
  assert.equal(game.plant('sunflower', 2, 1), false);
  assert.equal(game.plant('peashooter', 2, 0), false);
  assert.equal(game.plant('wallnut', -1, 0), false);
  assert.equal(game.plants.length, 1);
  game.phase = 'paused'; const snapshot = JSON.stringify(game);
  tick(game, 10); assert.equal(JSON.stringify(game), snapshot);
  assert.equal(game.plant('peashooter', 2, 1), false);
});

test('peashooter fires at the extracted Shoot event, not when its animation starts', () => {
  const game = create(); game.plant('peashooter', 2, 0);
  game.zombies.push(mummy(700));
  tick(game, .5); assert.equal(game.plants[0].action, 'shoot'); assert.equal(game.peas.length, 0);
  tick(game, .4); assert.equal(game.peas.length, 0);
  tick(game, .2); assert.equal(game.peas.length, 1);
  tick(game, 1.4); assert.ok(game.zombies[0].hp < 190);
});

test('sunflower first production is relative to planting time and sun collects only once', () => {
  const game = create(); tick(game, 10); game.plant('sunflower', 2, 0);
  tick(game, 4); assert.equal(game.suns.filter(s => s.from === 'plant').length, 0);
  tick(game, 8); const sun = game.suns.find(s => s.from === 'plant')!;
  assert.ok(sun); const before = game.sun;
  game.collect(sun.id); game.collect(sun.id); assert.equal(game.sun, before + 50);
});

test('cone armor absorbs hits before body health and plant food emits sixty peas', () => {
  const game = create(); game.plant('peashooter', 2, 0);
  game.zombies.push(mummy(700, 370));
  tick(game, 2.5); assert.equal(game.zombies[0].hp, 190); assert.ok(game.zombies[0].armor < 370);
  game.events.length = 0;
  assert.equal(game.plantFood(2, 0), true); assert.equal(game.food, 0);
  assert.equal(game.plantFood(2, 0), false);
  tick(game, 4); assert.equal(game.events.filter(e => e.type === 'shot').length, 60);
});

test('potato mine needs its charge time, then explodes against nearby zombies', () => {
  const game = create(); game.plant('potatomine', 2, 0);
  tick(game, 13); assert.equal(game.plants.length, 1);
  game.zombies.push(mummy(cellX(0) + 30));
  tick(game, .5); assert.equal(game.kills, 0);
  tick(game, .6); assert.equal(game.plants.length, 0); assert.equal(game.kills, 1);
  assert.ok(game.effects.some(e => e.kind === 'explode'));
});

test('ra steals nearby uncollected sun and releases it when killed', () => {
  const game = create();
  game.zombies.push({ ...mummy(600), kind: 'ra' });
  game.suns.push({ id: 999, x: 600, y: 400, targetY: 400, value: 50, age: 3, from: 'sky' });
  tick(game, .1); assert.equal(game.zombies[0].absorbed, 50); assert.equal(game.suns.length, 0);
  game.zombies[0].hp = 0; tick(game, .1);
  assert.equal(game.suns[0].value, 50); assert.equal(game.suns[0].from, 'ra');
});

test('mower clears its lane once; a later breach ends the game', () => {
  const game = create(); game.zombies.push(mummy(170)); tick(game, .1);
  assert.equal(game.kills, 1); assert.equal(game.mowers[2].active, true);
  tick(game, 2); assert.equal(game.mowers[2].spent, true);
  game.zombies.push(mummy(85)); tick(game, .1); assert.equal(game.phase, 'lost');
});

test('a legal planting and collection strategy can finish all ten waves', () => {
  const game = create();
  for (let frame = 0; frame < 60 * 500 && game.phase === 'playing'; frame++) {
    for (const sun of [...game.suns]) game.collect(sun.id);
    if (frame % 15 === 0) {
      const occupied = (row: number, column: number) => game.plants.some(p => p.row === row && p.column === column);
      const threatened = [...game.zombies].sort((a, b) => a.x - b.x);
      for (const z of threatened) {
        if (!game.plants.some(p => p.row === z.row && p.kind === 'peashooter')) game.plant('peashooter', z.row, 2);
        if (z.x < 450 && !occupied(z.row, 4)) game.plant('wallnut', z.row, 4);
      }
      for (let row = 0; row < 5; row++) if (!occupied(row, 0)) game.plant('sunflower', row, 0);
      for (let row = 0; row < 5; row++) if (!occupied(row, 2)) game.plant('peashooter', row, 2);
      for (let row = 0; row < 5; row++) if (!occupied(row, 3)) game.plant('peashooter', row, 3);
      const urgent = threatened.find(z => z.x < 600);
      if (urgent) game.plantFood(urgent.row, 2);
    }
    game.tick(1 / 60); game.events.length = 0;
  }
  assert.equal(game.phase, 'won'); assert.equal(game.wave, 10);
  assert.equal(game.kills, readLevel(source).waves.flat().length);
});
