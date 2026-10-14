import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/model';
import { Achievements } from '../src/platform/achievements';
import { allLevelsEnabled, setAllLevelsEnabled, completedLevel, completeLevel } from '../src/platform/storage';

class MemoryStorage implements Storage {
  data = new Map<string, string>();
  writes = 0;
  get length() { return this.data.size; }
  key(index: number) { return [...this.data.keys()][index] ?? null; }
  clear() { this.data.clear(); }
  getItem(key: string) { return this.data.get(key) ?? null; }
  setItem(key: string, value: string) { this.writes++; this.data.set(key, value); }
  removeItem(key: string) { this.data.delete(key); }
}

test('Sunny Days uses held sun, persists once and does not unlock from cumulative collection', () => {
  const storage = new MemoryStorage(), achievements = new Achievements(storage), game = new Game(1, 1);
  game.start(); game.collected = 10000; game.sun = 7999;
  assert.deepEqual(achievements.update(game), []);
  game.sun = 8000;
  assert.deepEqual(achievements.update(game).map(item => item.id), ['sunny-days']);
  const earned = achievements.earned['sunny-days'];
  assert.equal(typeof earned, 'number');
  assert.deepEqual(achievements.update(game), []);
  assert.equal(storage.writes, 1);
  const restored = new Achievements(storage);
  assert.equal(restored.earned['sunny-days'], earned);
  assert.deepEqual(restored.update(game), []);
});

test('Home Lawn Security requires winning the adventure finale, not entering it or losing', () => {
  const achievements = new Achievements(new MemoryStorage()), game = new Game(50, 1);
  for (const phase of ['ready', 'playing', 'lost'] as const) {
    game.phase = phase; assert.deepEqual(achievements.update(game), []);
  }
  const earlier = new Game(49, 1); earlier.phase = 'won';
  assert.deepEqual(achievements.update(earlier), []);
  game.phase = 'won';
  assert.deepEqual(achievements.update(game).map(item => item.id), ['home-security']);
});

test('Immortal counts 20 cleared flags, not 20 waves or an unfinished final flag, and survives a saved game', () => {
  for (const scene of ['day', 'night', 'pool', 'fog', 'roof'] as const) {
    const achievements = new Achievements(new MemoryStorage()), game = new Game(9, 1, 'endless', scene);
    game.wave = 20; game.phase = 'intermission';
    assert.deepEqual(achievements.update(game), []);
    game.survivalStage = 9; game.phase = 'playing';
    assert.equal(game.survivalFlags, 19);
    assert.deepEqual(achievements.update(game), []);
    game.phase = 'intermission';
    const restored = Game.restore(game.snapshot());
    assert.equal(restored.survivalFlags, 20);
    assert.deepEqual(achievements.update(restored).map(item => item.id), ['immortal']);
  }
});

test('all-level preference preserves existing availability and never writes completion or achievement records', () => {
  const storage = new MemoryStorage();
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true });
  try {
    assert.equal(allLevelsEnabled(), true);
    completeLevel(8);
    const completed = storage.getItem('pvz-web:adventure:v1');
    setAllLevelsEnabled(false); assert.equal(allLevelsEnabled(), false);
    setAllLevelsEnabled(true); assert.equal(allLevelsEnabled(), true);
    assert.equal(completedLevel(), 8);
    assert.equal(storage.getItem('pvz-web:adventure:v1'), completed);
    assert.equal(storage.getItem('pvz-web:achievements:v1'), null);
  } finally { Reflect.deleteProperty(globalThis, 'localStorage'); }
});
