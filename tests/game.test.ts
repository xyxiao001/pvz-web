import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, type Zombie } from '../src/game/model';
import { cellX, PLANTS, type LevelId, type PlantKind } from '../src/game/config';

function tick(game: Game, count: number) { for (let i = 0; i < count; i++) { game.step(); game.drainEvents(); } }
function play(game: Game, choices = game.config.seeds.slice(0, 6)) {
  if (game.needsSeedChoice) for (const kind of choices) game.chooseSeed(kind);
  game.start(); return game;
}
function zombie(row: number, x: number, health = 270): Zombie {
  return { id: 1000, kind: 'normal', armor: 0, row, x, health, speed: .3, biteIn: 4, eating: false, wave: 0, hitAt: -100, chillIn: 0, hasPole: false, vaultIn: 0, animationTime: 0, shield: 0, rageIn: 0, riseIn: 0 };
}
function plant(game: Game, kind: PlantKind, column: number, row: number) { game.select(kind); return game.plant(column, row); }

test('1–1 enforces its single row, seed unlock, cost, occupied cells, and 750-tick cooldown', () => {
  const game = play(new Game(1, 10));
  game.select('sunflower'); assert.equal(game.selected, null);
  game.select('peashooter');
  assert.equal(game.plant(0, 1), false);
  assert.equal(game.sun, 150);
  assert.equal(game.plant(0, 2), true);
  assert.equal(game.sun, 50);
  assert.equal(game.cooldowns.peashooter, 750);
  game.sun = 500;
  game.select('peashooter'); assert.equal(game.plant(1, 2), false);
  tick(game, 749); assert.equal(game.plant(1, 2), false);
  tick(game, 1); assert.equal(game.plant(0, 2), false);
  assert.equal(game.plant(1, 2), true);
});

test('pause freezes all simulation; expired suns cannot be collected twice', () => {
  const game = play(new Game(1, 11)); plant(game, 'peashooter', 0, 2);
  tick(game, 450); assert.ok(game.suns.length > 0);
  game.pause();
  const before = JSON.stringify(game);
  tick(game, 1000); assert.equal(JSON.stringify(game), before);
  game.collectSun(game.suns[0].id); assert.equal(JSON.stringify(game), before);
  game.resume(); const id = game.suns[0].id;
  game.collectSun(id); game.collectSun(id); assert.equal(game.sun, 75);
});

test('peas target only their lane, hit the nearest zombie once, and deal 20 damage', () => {
  const game = play(new Game(1, 12)); plant(game, 'peashooter', 0, 2);
  game.plants[0].actionIn = 1000;
  game.zombies = [zombie(1, 200), { ...zombie(2, 230), id: 1001 }, { ...zombie(2, 200), id: 1002 }];
  game.peas = [{ id: 3000, row: 2, x: 180, ice: false, puff: false, age: 0 }];
  tick(game, 1);
  assert.deepEqual(game.zombies.map(z => z.health), [270, 270, 250]);
  assert.equal(game.peas.length, 0);
});

test('normal zombie bites consume a plant; mower is single-use and a later breach loses', () => {
  const game = play(new Game(1, 14)); plant(game, 'peashooter', 4, 2);
  game.plants[0].actionIn = 10000;
  game.zombies = [zombie(2, cellX(4) + 20)];
  tick(game, 300); assert.equal(game.plants.length, 0);
  game.zombies = [zombie(2, 27)]; tick(game, 1);
  assert.equal(game.mowers[0].state, 'moving'); assert.equal(game.zombies.length, 0);
  tick(game, 260); assert.equal(game.mowers[0].state, 'spent');
  game.zombies = [zombie(2, -34.9)]; tick(game, 1); assert.equal(game.phase, 'lost');
});

test('sunflower generates collectible 25-point suns on the second level', () => {
  const game = play(new Game(2, 20));
  assert.equal(plant(game, 'sunflower', 0, 1), true);
  const initialDelay = game.plants[0].actionIn;
  assert.ok(initialDelay >= 300 && initialDelay <= 1250);
  assert.equal(game.sun, 0); tick(game, initialDelay);
  const produced = game.suns.find(sun => sun.x === cellX(0) + 12);
  assert.ok(produced); game.collectSun(produced.id); assert.equal(game.sun, 25);
  assert.ok(game.plants[0].actionIn >= PLANTS.sunflower.interval - 150 && game.plants[0].actionIn <= PLANTS.sunflower.interval);
});

test('a normal zombie below 90 health stops eating and dies before entering the house', () => {
  const game = play(new Game(1, 100)); plant(game, 'peashooter', 0, 2);
  game.plants[0].actionIn = 10000;
  game.zombies = [zombie(2, cellX(0) + 20, 70)];
  tick(game, 50); assert.equal(game.plants[0].health, 300);
  game.zombies[0].x = 34; tick(game, 1);
  assert.equal(game.zombies.length, 0);
  assert.equal(game.mowers[0].state, 'ready');
  assert.equal(game.phase, 'playing');
});

function runAdventure(level: LevelId, seed: number) {
  const game = play(new Game(level, seed));
  for (let i = 0; i < 60000 && game.phase === 'playing'; i++) {
    for (const sun of [...game.suns]) game.collectSun(sun.id);
    if (level > 1 && game.planted === 0) plant(game, 'sunflower', 1, 2);
    if (level === 1 && game.planted === 0) plant(game, 'peashooter', 0, 2);
    if (level >= 7 && game.sun >= 50 && game.cooldowns.sunflower === 0 && game.plants.filter(p => p.kind === 'sunflower').length < 8) {
      for (const column of [1, 2]) {
        const row = game.config.rows.find(row => !game.plants.some(p => p.column === column && p.row === row));
        if (row !== undefined) { plant(game, 'sunflower', column, row); break; }
      }
    }
    if (level >= 6 && game.sun >= 25 && game.cooldowns.potatomine === 0) {
      const threat = game.zombies.find(z => z.kind !== 'pole' && z.x > 590 && !game.plants.some(p => p.row === z.row && (p.kind === 'potatomine' || (level >= 7 && p.kind === 'snowpea'))));
      if (threat) plant(game, 'potatomine', 3, threat.row);
    }
    if (level >= 4 && (level < 7 || game.plants.filter(p => p.kind === 'snowpea').length === 5) && game.sun >= 50 && game.cooldowns.wallnut === 0) {
      const threat = game.zombies.find(z => z.armor > 0 && z.x < 650 && z.x > 270 && !game.plants.some(p => p.row === z.row && p.kind === 'wallnut'));
      if (threat) plant(game, 'wallnut', level >= 6 ? 6 : 3, threat.row);
    }
    if (level >= 3 && game.sun >= 150 && game.cooldowns.cherrybomb === 0) {
      const threat = game.zombies.find(z => z.x < 350 && z.health >= 90 && (z.armor > 0 || game.zombies.filter(other => Math.abs(other.row - z.row) <= 1 && Math.abs(other.x - z.x) < 100).length > 2));
      if (threat) {
        const column = Math.max(0, Math.round((threat.x - 80) / 80));
        const row = game.config.rows.find(row => Math.abs(row - threat.row) <= 1 && game.canPlant('cherrybomb', column, row));
        if (row !== undefined) plant(game, 'cherrybomb', column, row);
      }
    }
    if (level > 1 && game.sun >= 50 && game.cooldowns.sunflower === 0
      && game.plants.filter(p => p.kind === 'sunflower').length < (level >= 4 ? 8 : 5)
      && !game.zombies.some(z => z.health >= 90 && z.x < 720 && !game.plants.some(p => p.row === z.row && (p.kind === 'peashooter' || p.kind === 'snowpea' || (level >= 6 && p.kind === 'potatomine'))))) {
      for (const column of [1, 2]) {
        const row = game.config.rows.find(row => !game.plants.some(p => p.column === column && p.row === row));
        if (row !== undefined) { plant(game, 'sunflower', column, row); break; }
      }
    }
    const rows = [...game.config.rows].sort((a, b) => {
      const danger = (row: number) => game.zombies.some(z => z.row === row)
        ? game.plants.filter(p => p.row === row && p.kind === 'peashooter').length * 1000
          + game.zombies.filter(z => z.row === row).reduce((min, z) => Math.min(min, z.x), 1000)
        : 10000;
      return danger(a) - danger(b);
    });
    for (const row of rows) {
      const shooters = game.plants.filter(p => p.row === row && p.kind === 'peashooter');
      if (level >= 7 && !game.plants.some(p => p.row === row && p.kind === 'snowpea')) {
        const column = [0, 4, 5].find(column => game.canPlant('snowpea', column, row));
        if (game.zombies.some(z => z.row === row)) {
          if (column !== undefined) plant(game, 'snowpea', column, row);
          break;
        }
        continue;
      }
      if (level >= 7 && game.plants.filter(p => p.kind === 'snowpea').length < 5) continue;
      if (shooters.length < (level >= 6 && game.plants.filter(p => p.kind === 'sunflower').length >= 8 ? 4 : 2) && game.zombies.some(z => z.row === row) && game.sun >= 100 && game.cooldowns.peashooter === 0) {
        const column = (level >= 6 ? [0, 4, 5, 3, 7] : level > 1 ? [0, 3, 4, 5] : [0, 1, 2, 3]).find(column =>
          !game.plants.some(p => p.row === row && p.column === column))!;
        if (column !== undefined) plant(game, 'peashooter', column, row);
      }
    }
    tick(game, 1);
  }
  return game;
}

test('all eight lawn adventures can be won through normal planting and collection commands', () => {
  for (const level of [1, 2, 3, 4, 6, 7, 8, 9] as const) {
    for (const seed of [1, 23, 123456]) {
      const game = runAdventure(level, seed);
      assert.equal(game.phase, 'won', `level ${level}, seed ${seed}: ${JSON.stringify({ticks:game.ticks,sun:game.sun,plants:game.plants,zombies:game.zombies,mowers:game.mowers})}`);
      assert.equal(game.wave, game.config.waveCount);
      assert.equal(game.kills, game.waves.reduce((sum, wave) => sum + wave.length, 0));
    }
  }
});

test('a seeded sequence is deterministic and the unplanted tutorial does not spawn enemies', () => {
  const idle = play(new Game(1, 1)); tick(idle, 5000);
  assert.equal(idle.zombies.length, 0); assert.equal(idle.suns.length, 0);
  const a = runAdventure(2, 42); const b = runAdventure(2, 42);
  assert.equal(JSON.stringify(a), JSON.stringify(b));
});

test('cone armor absorbs peas before body health and passes excess damage through', () => {
  const game = play(new Game(3, 3)); plant(game, 'sunflower', 0, 2);
  game.zombies = [{ ...zombie(2, 200), kind: 'cone', armor: 30 }];
  game.peas = [{ id: 3000, row: 2, x: 180, ice: false, puff: false, age: 0 }]; tick(game, 1);
  assert.equal(game.zombies[0].armor, 10); assert.equal(game.zombies[0].health, 270);
  game.peas = [{ id: 3001, row: 2, x: 180, ice: false, puff: false, age: 0 }]; tick(game, 1);
  assert.equal(game.zombies[0].armor, 0); assert.equal(game.zombies[0].health, 260);
});

test('cherry explodes after 100 ticks, clears nearby three lanes, consumes itself and recharges', () => {
  const game = play(new Game(3, 7)); game.sun = 150;
  assert.equal(plant(game, 'cherrybomb', 4, 2), true);
  game.zombies = [1, 2, 3, 4].map((row, index) => ({ ...zombie(row, cellX(4) + 50), id: 1000 + index, speed: 0, kind: 'cone', armor: 370 }));
  game.zombies.push({ ...zombie(2, cellX(4) + 160), id: 1005, speed: 0 });
  tick(game, 99); assert.equal(game.zombies.length, 5); assert.equal(game.plants.length, 1);
  game.step();
  assert.equal(game.kills, 3); assert.deepEqual(game.zombies.map(z => z.id), [1003, 1005]);
  assert.equal(game.plants.length, 0); assert.equal(game.cooldowns.cherrybomb, 4900);
  assert.equal(game.events.filter(e => e.kind === 'explode').length, 1);
});

test('wallnut has 4000 health and holds an eating zombie in place', () => {
  const game = play(new Game(4, 4)); assert.equal(plant(game, 'wallnut', 4, 2), true);
  const x = cellX(4) + 20; game.zombies = [zombie(2, x)];
  tick(game, 1000); assert.equal(game.plants[0].health, 3000); assert.equal(game.zombies[0].x, x);
  assert.equal(game.cooldowns.wallnut, 2000);
});

test('the final wave has a 750-tick warning and one flag zombie, and victory waits for cleanup', () => {
  const game = play(new Game(2, 5)); plant(game, 'sunflower', 0, 2);
  let warning = false; let flag = false;
  for (let i = 0; i < 25000 && game.phase === 'playing'; i++) {
    game.step();
    for (const event of game.drainEvents()) {
      if (event.kind === 'flag') { warning = true; assert.equal(game.flagWarningIn, 750); assert.equal(game.wave, 5); }
      if (event.kind === 'wave' && game.wave === 6) {
        assert.ok(warning); assert.equal(game.flagWarningIn, 0); assert.equal(game.zombies.filter(z => z.kind === 'flag').length, 1);
        assert.equal(game.phase, 'playing'); flag = true;
      }
    }
    // This case isolates wave transitions; full games above kill via normal actions.
    game.zombies = [];
  }
  assert.ok(flag); assert.equal(game.phase, 'won');
});

test('bowling uses a capped conveyor, no sun, and the left three columns', () => {
  const game = play(new Game(5, 17));
  assert.equal(game.conveyor.length, 1);
  game.selectPacket(game.conveyor[0].id);
  assert.equal(game.plant(3, 2), false);
  assert.equal(game.plant(2, 2), true);
  assert.equal(game.conveyor.length, 0); assert.equal(game.plants.length, 0);
  assert.equal(game.rollers.length, 1); assert.equal(game.sun, 0);
  tick(game, 200); assert.equal(game.wave, 1);
  tick(game, 200); assert.equal(game.conveyor.length, 1);
  for (let i = 0; i < 8000; i++) { game.zombies = []; game.step(); game.drainEvents(); }
  assert.equal(game.suns.length, 0); assert.equal(game.sun, 0);
  assert.ok(game.conveyor.length <= 10);
});

test('rolling nuts hit once and bounce lanes; red nuts explode across nearby lanes', () => {
  const game = play(new Game(5, 1));
  game.selectPacket(game.conveyor[0].id); game.plant(2, 2);
  game.zombies = [zombie(2, cellX(2) + 35)];
  game.step(); assert.equal(game.kills, 1); assert.notEqual(game.rollers[0].direction, 0);
  const oldY = game.rollers[0].y; tick(game, 10); assert.equal(Math.abs(game.rollers[0].y - oldY), 20);
  game.rollers = [{ id: 900, kind: 'explodenut', x: 350, y: 358, row: 2, direction: 0, hit: [] }];
  game.zombies = [1, 2, 3, 4].map((row, index) => ({ ...zombie(row, 380), id: 1000 + index, speed: 0, kind: 'cone', armor: 370 }));
  game.step(); assert.deepEqual(game.zombies.map(z => z.row), [4]); assert.equal(game.rollers.length, 0);
});

test('bowling can be won using only the supplied packets', () => {
  for (const seed of [1, 23, 123456]) {
    const game = play(new Game(5, seed));
    for (let i = 0; i < 60000 && game.phase === 'playing'; i++) {
      const target = game.zombies.filter(z => z.health >= 90 && z.x < 760).sort((a, b) => a.x - b.x)[0];
      if (target && game.conveyor.length && !game.rollers.some(nut => nut.row === target.row && nut.x < target.x && target.x - nut.x < 200)) {
        game.selectPacket(game.conveyor[0].id); game.plant(Math.max(0, Math.min(2, Math.floor((target.x - 120) / 80))), target.row);
      }
      tick(game, 1);
    }
    assert.equal(game.phase, 'won', `bowling seed ${seed}, wave ${game.wave}, kills ${game.kills}`);
    assert.equal(game.kills, game.waves.flat().length);
  }
});

test('potato arms after 1500 ticks and triggers only against grounded enemies in its lane', () => {
  const game = play(new Game(6, 1)); plant(game, 'potatomine', 4, 2);
  tick(game, 1499); assert.equal(game.plants[0].actionIn, 1);
  const mineX = cellX(4);
  game.zombies = [{ ...zombie(2, mineX + 20), speed: 0 }, { ...zombie(1, mineX + 20), id: 1001, speed: 0 }];
  game.step(); assert.equal(game.kills, 0);
  game.step(); assert.equal(game.kills, 1); assert.equal(game.plants.length, 0);
  assert.equal(game.zombies[0].row, 1); assert.equal(game.cooldowns.potatomine, 1499);
});

test('snow peas chill for 1000 ticks, reduce walking to 40%, and double the bite interval', () => {
  const game = play(new Game(7, 1)); plant(game, 'sunflower', 0, 0);
  game.zombies = [zombie(2, 300)];
  game.peas = [{ id: 5000, row: 2, x: 280, ice: true, puff: false, age: 0 }]; game.step();
  assert.equal(game.zombies[0].chillIn, 1000); assert.equal(game.zombies[0].health, 250);
  const x = game.zombies[0].x; game.step(); assert.ok(Math.abs(x - game.zombies[0].x - .05762608695652174) < 1e-8);
  game.sun = 50; plant(game, 'wallnut', 3, 2); game.zombies[0].x = cellX(3) + 20; game.zombies[0].biteIn = 1;
  game.step(); assert.equal(game.zombies[0].biteIn, 8);
  const health = game.plants.find(p => p.kind === 'wallnut')!.health;
  tick(game, 7); assert.equal(game.plants.find(p => p.kind === 'wallnut')!.health, health);
  game.step(); assert.equal(game.plants.find(p => p.kind === 'wallnut')!.health, health - 4);
});

test('a pole vaulter jumps one plant then walks and eats the next; shovel removes without refund', () => {
  const game = play(new Game(6, 1)); plant(game, 'wallnut', 4, 2);
  const front = game.plants[0];
  game.sun = 50; plant(game, 'sunflower', 2, 2);
  game.zombies = [{ ...zombie(2, cellX(4) + 90, 500), kind: 'pole', hasPole: true, speed: .67 }];
  game.step(); assert.equal(game.zombies[0].vaultIn, 168); assert.equal(game.zombies[0].hasPole, false);
  tick(game, 168); assert.equal(game.zombies[0].vaultIn, 0); assert.ok(game.zombies[0].speed < .38);
  assert.equal(front.health, 4000);
  tick(game, 600); assert.equal(game.zombies[0].eating, true);
  assert.ok(game.plants.find(p => p.kind === 'sunflower')!.health < 300);
  const sun = game.sun; game.toggleShovel(); game.dig(4, 2);
  assert.ok(!game.plants.includes(front)); assert.equal(game.sun, sun); assert.equal(game.digging, false);
});


test('auto sun waits for sky and plant suns to land, respects pause and disabling; manual collection works in flight', () => {
  const game = play(new Game(2, 20)); plant(game, 'sunflower', 0, 1);
  assert.equal(game.autoCollectSun, false); game.plants[0].actionIn = 1;
  game.step(); assert.equal(game.sun, 0); assert.equal(game.suns.length, 1);
  game.autoCollectSun = true; game.pause(); tick(game, 10); assert.equal(game.sun, 0);
  const pausedY = game.suns[0].y;
  game.resume(); tick(game, 60); assert.equal(game.sun, 0); assert.ok(game.suns[0].y > pausedY);
  assert.ok(game.suns[0].y < game.suns[0].targetY);
  game.step(); assert.equal(game.sun, 25); assert.equal(game.suns.length, 0);
  tick(game, 338); assert.equal(game.sun, 25); assert.equal(game.suns.length, 1);
  const sky = game.suns[0]; assert.equal(sky.y, 70);
  const flightTicks = Math.ceil((sky.targetY - sky.y) / .65);
  tick(game, flightTicks - 1); assert.equal(game.sun, 25); assert.ok(sky.y < sky.targetY);
  game.step(); assert.equal(game.sun, 50); assert.equal(game.suns.length, 0);
  game.autoCollectSun = false; game.plants[0].actionIn = 1; game.step();
  assert.equal(game.sun, 50); assert.equal(game.suns.length, 1);
  assert.ok(game.suns[0].y < game.suns[0].targetY);
  const id = game.suns[0].id; game.collectSun(id); game.collectSun(id); assert.equal(game.sun, 75);
});

test('chomper swallows bucket armor, digests for 4000 ticks, and does not swallow another meanwhile', () => {
  const game = play(new Game(8, 24), ['peashooter', 'sunflower', 'cherrybomb', 'wallnut', 'potatomine', 'chomper']); game.sun = 150; plant(game, 'chomper', 2, 2);
  const p = game.plants[0];
  game.zombies = [{ ...zombie(2, cellX(2) + 70), kind: 'bucket', armor: 1100 }];
  game.step(); assert.equal(p.chomp!.phase, 'bite'); tick(game, 69); assert.equal(game.kills, 0);
  game.step(); assert.equal(game.kills, 1); assert.equal(p.chomp!.phase, 'digest'); assert.equal(p.chomp!.remaining, 4000);
  assert.ok(game.drainEvents().some(e => e.kind === 'swallow' && e.zombieId === 1000));
  game.zombies = [zombie(2, cellX(2) + 20)]; tick(game, 8);
  assert.equal(game.kills, 1); assert.ok(p.health < 300);
  game.zombies = []; game.wave = 0; tick(game, 3991); assert.equal(p.chomp!.phase, 'digest');
  game.step(); assert.equal(p.chomp!.phase, 'ready');
});

test('chomper bite misses a vaulted or vanished target without entering digestion', () => {
  for (const vaulted of [false, true]) {
    const game = play(new Game(8, 25), ['peashooter', 'sunflower', 'cherrybomb', 'wallnut', 'potatomine', 'chomper']); game.sun = 150; plant(game, 'chomper', 2, 2);
    game.zombies = [zombie(2, cellX(2) + 70)]; game.step();
    if (vaulted) { game.zombies[0].vaultIn = 168; game.zombies[0].kind = 'pole'; game.zombies[0].health = 500; }
    else game.zombies = [];
    tick(game, 70); assert.equal(game.plants[0].chomp!.phase, 'recover'); assert.equal(game.kills, 0);
    tick(game, 30); assert.equal(game.plants[0].chomp!.phase, 'ready');
  }
});

test('repeater fires two 20-damage peas 25 ticks apart, retargeting each shot', () => {
  const game = play(new Game(9, 26), ['peashooter', 'sunflower', 'cherrybomb', 'wallnut', 'potatomine', 'repeater']); game.sun = 200; plant(game, 'repeater', 0, 2);
  const p = game.plants[0]; p.actionIn = 26; game.zombies = [zombie(2, 700)];
  game.step(); assert.equal(game.peas.length, 1); const first = p.shotAt;
  tick(game, 24); assert.equal(game.peas.length, 1); game.step();
  assert.equal(game.peas.length, 2); assert.equal(p.shotAt - first, 25);
  p.actionIn = 26; game.zombies = []; game.step(); assert.equal(game.peas.length, 2);
  assert.equal(PLANTS.repeater.cost, 200); assert.equal(PLANTS.repeater.cooldown, 750);
});
