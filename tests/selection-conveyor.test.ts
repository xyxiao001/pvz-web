import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/model';
import { cellX, type PlantKind } from '../src/game/config';
import { GameClock, type GameSpeed } from '../src/game/clock';
import data from '../src/game/data/portable-adventure.json';
import { generateWaves, isFlagWave } from '../src/game/waves';

const loadout: PlantKind[] = ['sunflower', 'repeater', 'snowpea', 'wallnut', 'chomper', 'cherrybomb'];

test('six-slot chooser requires six unique unlocked cards, preserves order, and allows putting cards back', () => {
  const game = new Game(9, 1);
  assert.equal(game.needsSeedChoice, true); assert.deepEqual(game.seeds, []);
  game.start(); assert.equal(game.phase, 'ready');
  game.chooseSeed('explodenut'); assert.deepEqual(game.seeds, []);
  for (const kind of loadout.slice(0, 5)) game.chooseSeed(kind);
  game.start(); assert.equal(game.phase, 'ready');
  game.chooseSeed('cherrybomb'); game.chooseSeed('peashooter');
  assert.deepEqual(game.seeds, loadout);
  game.chooseSeed('snowpea'); assert.equal(game.seeds.length, 5);
  game.chooseSeed('potatomine');
  assert.deepEqual(game.seeds, ['sunflower', 'repeater', 'wallnut', 'chomper', 'cherrybomb', 'potatomine']);
  game.start(); assert.equal(game.phase, 'playing');
  game.chooseSeed('sunflower'); assert.equal(game.seeds.length, 6);
  game.sun = 1000;
  assert.equal(game.canPlant('snowpea', 0, 0), false);
  game.select('peashooter'); assert.equal(game.selected, null);
  game.select('repeater'); assert.equal(game.plant(0, 0), true);
  assert.deepEqual(new Game(9, 1).seeds, []);
});

test('first adventure introduces choice at 1–8 and bypasses it on conveyor levels', () => {
  const eight = new Game(8, 1); eight.chooseSeed('repeater'); assert.deepEqual(eight.seeds, []);
  for (const level of [1, 2, 3, 4, 5, 6, 7, 10] as const) {
    const game = new Game(level, 1);
    assert.equal(game.needsSeedChoice, false); game.start(); assert.equal(game.phase, 'playing');
  }
});

test('1–10 imports seven supply weights and triples the remaining wave budget after flag reservation', () => {
  assert.deepEqual(data.conveyorTen, [
    { kind: 'peashooter', weight: 20 }, { kind: 'cherrybomb', weight: 20 }, { kind: 'wallnut', weight: 15 },
    { kind: 'repeater', weight: 20 }, { kind: 'snowpea', weight: 10 }, { kind: 'chomper', weight: 5 }, { kind: 'potatomine', weight: 10 },
  ]);
  const waves = generateWaves(10, () => 0);
  assert.equal(waves.length, 20);
  assert.deepEqual(waves.flatMap((wave, i) => wave.includes('flag') ? [i + 1] : []), [10, 20]);
  for (let index = 0; index < 20; index++) {
    const base = Math.floor(index / 3) + 1;
    const reserved = Math.min(base, 8) + 1;
    const expected = isFlagWave(10, index) ? reserved + (Math.trunc(base * 2.5) - reserved) * 3 : base * 3;
    assert.equal(waves[index].reduce((sum, kind) => sum + data.zombies[kind].value, 0), expected);
  }
  assert.ok(['normal', 'cone', 'pole', 'bucket', 'flag'].every(kind => waves[19].includes(kind as typeof waves[19][number])));
});

test('plant conveyor starts supply immediately, spawns at 1800 ticks, caps at ten and produces no sky sun', () => {
  const game = new Game(10, 8); game.start();
  assert.equal(game.conveyor.length, 0); game.step(); assert.equal(game.conveyor.length, 1);
  for (let i = 1; i < 400; i++) game.step();
  assert.equal(game.conveyor.length, 1); game.step(); assert.equal(game.conveyor.length, 2);
  for (let i = 401; i < 1799; i++) game.step();
  assert.equal(game.wave, 0); game.step(); assert.equal(game.wave, 1);
  for (let i = 0; i < 10000; i++) { game.zombies = []; game.step(); game.drainEvents(); }
  assert.equal(game.conveyor.length, 10);
  assert.ok(game.conveyor.every(packet => data.conveyorTen.some(choice => choice.kind === packet.kind)));
  assert.equal(game.sun, 0); assert.equal(game.suns.length, 0);
});

test('conveyor plants consume one selected packet, cost no sun, retain plant timers, and can use all columns', () => {
  const game = new Game(10, 2); game.start();
  // Isolate planting from random supply. No game code uses these fixture cards.
  game.conveyor = [{ id: 900, kind: 'potatomine', x: 0 }, { id: 901, kind: 'potatomine', x: 50 }, { id: 902, kind: 'repeater', x: 100 }];
  game.selectPacket(900); assert.equal(game.plant(8, 4), true);
  assert.equal(game.plants[0].actionIn, 1500); assert.equal(game.sun, 0); assert.equal(game.cooldowns.potatomine, 0);
  game.selectPacket(901); assert.equal(game.plant(8, 4), false); assert.equal(game.conveyor.length, 2);
  assert.equal(game.plant(0, 0), true); assert.equal(game.conveyor.length, 1); assert.equal(game.rollers.length, 0);
  game.selectPacket(902); game.toggleShovel(); assert.equal(game.selectedPacket, null);
  game.dig(8, 4); assert.equal(game.plants.length, 1);
  game.toggleShovel(); game.selectPacket(902); assert.equal(game.digging, false);
  assert.equal(game.plant(8, 4), true); assert.equal(game.cooldowns.repeater, 0);
  game.select('repeater'); assert.equal(game.selected, null);
  assert.equal(game.canPlant('repeater', 4, 4), false);
});

test('1–10 supply, movement and waves stay identical at all speeds and stop when paused', () => {
  function run(speed: GameSpeed, frames: number) {
    const game = new Game(10, 12); game.start(); const clock = new GameClock(); clock.speed = speed;
    for (let i = 0; i < frames; i++) clock.advance(game, 20, () => {});
    return game;
  }
  const one = run(1, 1400);
  assert.deepEqual(run(2, 700), one); assert.deepEqual(run(4, 350), one);
  one.pause(); const snapshot = JSON.stringify(one);
  for (let i = 0; i < 100; i++) one.step(); assert.equal(JSON.stringify(one), snapshot);
});

test('1–10 can be won using only supplied cards and ordinary planting commands', () => {
  for (const seed of [1, 23, 123456]) {
    const game = new Game(10, seed); game.start();
    for (let tick = 0; tick < 90000 && game.phase === 'playing'; tick++) {
      for (const packet of [...game.conveyor]) {
        game.selectPacket(packet.id);
        const targets = game.zombies.filter(z => z.health >= (z.kind === 'pole' ? 500 : 270) / 3).sort((a, b) => a.x - b.x);
        if (packet.kind === 'cherrybomb') {
          const target = targets.find(z => z.x < 610 && (z.x < 360 || game.zombies.filter(other => Math.abs(other.row - z.row) <= 1 && Math.abs(other.x - z.x) < 100).length >= 3));
          if (target) {
            const places = game.config.rows.flatMap(row => Array.from({ length: 9 }, (_, column) => ({ row, column })))
              .filter(p => Math.abs(p.row - target.row) <= 1 && Math.abs(cellX(p.column) - target.x) < 100 && game.canPlant(packet.kind, p.column, p.row));
            places.sort((a, b) => Math.abs(cellX(a.column) - target.x) - Math.abs(cellX(b.column) - target.x));
            if (places[0]) game.plant(places[0].column, places[0].row);
          }
        } else {
          const firepower = (row: number) => game.plants.filter(p => p.row === row).reduce((n, p) => n + (p.kind === 'repeater' ? 2 : p.kind === 'peashooter' || p.kind === 'snowpea' ? 1 : 0), 0);
          const rows = [...game.config.rows].sort((a, b) => {
            const urgency = (row: number) => firepower(row) * 1000 + (targets.find(z => z.row === row)?.x ?? 900);
            return urgency(a) - urgency(b);
          });
          const columns = packet.kind === 'wallnut' ? [6, 7, 8] : packet.kind === 'chomper' ? [5, 4, 3] : packet.kind === 'potatomine' ? [4, 3, 5] : [0, 1, 2, 3, 4];
          let placed = false;
          for (const row of rows) {
            for (const column of columns) if (game.canPlant(packet.kind, column, row)) {
              placed = game.plant(column, row); break;
            }
            if (placed) break;
          }
        }
      }
      game.step(); game.drainEvents();
    }
    assert.equal(game.phase, 'won', `seed ${seed}, wave ${game.wave}, kills ${game.kills}, ticks ${game.ticks}`);
    assert.equal(game.kills, game.waves.flat().length); assert.equal(game.sun, 0);
  }
});
