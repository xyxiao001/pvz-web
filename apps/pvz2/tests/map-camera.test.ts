import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cameraToReveal, bounds } from '../src/shell/navigation';
import { completionEvents } from '../src/shell/progression';
import type { WorldMap } from '../src/shell/types';
const map: WorldMap = JSON.parse(readFileSync(new URL('../public/assets/shell/maps/pirate.json', import.meta.url), 'utf8'));

test('unlocking a comfortably visible island keeps the existing camera', () => {
  for (const x of [544, 650, 800, 1056]) assert.equal(cameraToReveal(map, 800, x), 800);
});
test('unlocking an island at either edge moves it inside the viewport with room for its art', () => {
  assert.equal(cameraToReveal(map, 500, 1000), 744);
  assert.equal(cameraToReveal(map, 1000, 500), 756);
  assert.equal(cameraToReveal(map, 0, 2000), 1744);
});
test('unlock camera remains within the source map bounds', () => {
  const range = bounds(map);
  assert.equal(cameraToReveal(map, 0, -10000), range.min);
  assert.equal(cameraToReveal(map, 0, 100000), range.max);
});
test('pirate 5 completion exposes level 6 beyond the gift island', () => {
  const completed = new Set(['pirate1', 'pirate2', 'pirate3', 'pirate4', 'pirate5']);
  const events = completionEvents(map, 'pirate5', completed, new Set());
  const open = events.find(event => event.action === 'open')!;
  const island = map.islands.find(node => node.node === open.node)!;
  assert.deepEqual(island.levels, ['pirate6']);
  const camera = cameraToReveal(map, 600, island.x);
  assert.ok(camera > 600);
  assert.equal(512 + island.x - camera, 768);
});
