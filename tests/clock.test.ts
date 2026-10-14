import test from 'node:test';
import assert from 'node:assert/strict';
import { GameClock, type GameSpeed } from '../src/game/clock';
import { Game } from '../src/game/model';

function run(speed: GameSpeed, frameMs: number, frames: number) {
  const game = new Game(3, 321); const clock = new GameClock(); clock.speed = speed;
  game.start(); game.select('sunflower'); game.plant(0, 2);
  let captures = 0;
  for (let i = 0; i < frames; i++) clock.advance(game, frameMs, () => captures++);
  assert.equal(captures, game.ticks);
  return game;
}

test('1×, 2× and 4× produce identical state/events for identical game time', () => {
  const one = run(1, 20, 1200); const two = run(2, 20, 600); const four = run(4, 20, 300);
  assert.equal(one.ticks, 2400);
  assert.deepEqual(two, one); assert.deepEqual(four, one);
});

test('frame rate and irregular frame lengths do not change fixed-step results', () => {
  assert.deepEqual(run(4, 10, 600), run(4, 40, 150));
  const game = new Game(1, 9); const clock = new GameClock(); game.start();
  for (const dt of [7, 21, 5, 16, 31]) clock.advance(game, dt, () => {});
  assert.equal(game.ticks, 8); assert.equal(clock.alpha, 0);
  clock.advance(game, 5, () => {}); assert.equal(clock.alpha, .5);
});

test('changing speed preserves fractional time; pause never accrues game time', () => {
  const game = new Game(1, 10); const clock = new GameClock(); game.start();
  clock.advance(game, 5, () => {}); clock.speed = 4;
  clock.advance(game, 10, () => {}); assert.equal(game.ticks, 4); assert.equal(clock.alpha, .5);
  game.pause(); const state = JSON.stringify(game);
  clock.advance(game, 1000, () => {}); assert.equal(JSON.stringify(game), state);
  clock.reset(); game.resume(); clock.advance(game, 10, () => {}); assert.equal(game.ticks, 8);
});

test('bowling conveyor, rolling nuts and waves share the speed clock and pause state', () => {
  function bowling(speed: GameSpeed, frames: number) {
    const game = new Game(5, 52); const clock = new GameClock(); clock.speed = speed; game.start();
    game.selectPacket(game.conveyor[0].id); game.plant(0, 2);
    for (let i = 0; i < frames; i++) clock.advance(game, 20, () => {});
    return game;
  }
  const one = bowling(1, 400);
  assert.deepEqual(bowling(2, 200), one); assert.deepEqual(bowling(4, 100), one);
  const state = JSON.stringify(one.conveyor); one.pause();
  const clock = new GameClock(); clock.speed = 4; clock.advance(one, 1000, () => {});
  assert.equal(JSON.stringify(one.conveyor), state);
});
