import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { plantAlmanac, zombieAlmanac, ZOMBIE_ENTRIES } from '../src/game/almanac';
import { PLANTS, type ZombieKind } from '../src/game/config';
import { ZOMBIE_NAMES } from '../src/game/survival';
import { Game } from '../src/game/model';
import { BOSS_HEALTH } from '../src/game/boss';

test('almanac covers every playable plant and zombie with existing portrait assets', () => {
  const plants=plantAlmanac(), zombies=zombieAlmanac();
  assert.deepEqual(plants.map(e=>e.id).sort(),Object.keys(PLANTS).sort());
  assert.deepEqual(zombies.map(e=>e.id).sort(),[...Object.keys(ZOMBIE_NAMES),'boss'].sort());
  for(const entry of [...plants,...zombies]) assert.ok(existsSync(`public/assets/runtime/${entry.image}`),entry.image);
  assert.equal(zombies.find(e=>e.id==='boss')!.stats[0][1],String(BOSS_HEALTH));
});

test('zombie almanac health and equipment match actual battle spawns', () => {
  const game=new Game(1,10);
  for(const kind of Object.keys(ZOMBIE_ENTRIES) as ZombieKind[]) {
    const actual=game['spawnZombie'](kind,2,800,0), entry=ZOMBIE_ENTRIES[kind];
    assert.deepEqual([entry.health,entry.armor,entry.shield],[actual.health,actual.armor,actual.shield],kind);
  }
});
