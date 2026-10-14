import test from 'node:test';
import assert from 'node:assert/strict';
import data from '../src/game/data/portable-adventure.json';
import { generateWaves, isFlagWave } from '../src/game/waves';

test('Portable tables retain source values and first-adventure eligibility', () => {
  assert.equal(data.source.commit, '141c1476dd462ac3526f796e303177616f4de6bc');
  assert.deepEqual(data.waveCounts.slice(0, 10), [4, 6, 8, 10, 8, 10, 20, 10, 20, 20]);
  assert.deepEqual({ ...data.zombies.cone, allowedLevels: data.zombies.cone.allowedLevels.slice(0, 10) }, { value: 2, startingLevel: 3, firstAllowedWave: 1, weight: 4000, allowedLevels: [0, 0, 1, 1, 1, 1, 1, 1, 1, 1] });
  assert.equal(data.zombies.normal.weight, 4000); assert.equal(data.zombies.flag.weight, 0);
});

test('1–1 has 1/1/1/2 normal zombies; 1–2 spends final flag budget on four normals and a flag', () => {
  assert.deepEqual(generateWaves(1, () => 0), [['normal'], ['normal'], ['normal'], ['normal', 'normal']]);
  assert.deepEqual(generateWaves(2, () => .9), [['normal'], ['normal'], ['normal'], ['normal', 'normal'], ['normal', 'normal'], ['normal', 'normal', 'flag', 'normal', 'normal']]);
});

test('cone introduction is forced at wave 5 and final wave of 1–3; other waves obey weighted budget', () => {
  const normals = generateWaves(3, () => 0); const cones = generateWaves(3, () => .999);
  assert.deepEqual(normals.map(wave => wave.length), [1, 1, 1, 2, 1, 2, 3, 6]);
  assert.deepEqual(cones.map(wave => wave.length), [1, 1, 1, 1, 1, 1, 2, 6]);
  assert.deepEqual(normals[4], ['cone']);
  assert.deepEqual(normals[7], ['normal', 'normal', 'normal', 'flag', 'cone', 'normal']);
  assert.deepEqual(cones[6], ['cone', 'normal']);
});

test('1–4 final wave reserves every eligible type and flag before spending the remaining budget', () => {
  const normals = generateWaves(4, () => 0); const cones = generateWaves(4, () => .999);
  assert.deepEqual(normals[9], ['normal', 'normal', 'normal', 'normal', 'flag', 'cone', 'normal', 'normal', 'normal']);
  assert.deepEqual(cones[9], ['normal', 'normal', 'normal', 'normal', 'flag', 'cone', 'cone', 'normal']);
  for (const level of [1, 2, 3, 4] as const) {
    const waves = generateWaves(level, () => .42);
    waves.forEach((wave, index) => {
      assert.equal(wave.includes('flag'), isFlagWave(level, index));
      if (!isFlagWave(level, index)) assert.equal(wave.reduce((sum, kind) => sum + data.zombies[kind].value, 0), Math.floor(index / 3) + 1);
    });
  }
});

test('1–5 bowling applies its fourfold budget and retains first-adventure zombie eligibility', () => {
  const waves = generateWaves(5, () => 0);
  assert.deepEqual(waves.map(w => w.length), [4, 4, 4, 8, 8, 8, 12, 15]);
  assert.equal(waves.flat().filter(z => z === 'pole').length, 0);
  assert.equal(waves[7].filter(z => z === 'cone').length, 1);
});

test('pole introduction and two-flag 1–7 are imported from Portable', () => {
  assert.deepEqual({ ...data.zombies.pole, allowedLevels: data.zombies.pole.allowedLevels.slice(0, 10) }, { value: 2, startingLevel: 6, firstAllowedWave: 5, weight: 2000, allowedLevels: [0, 0, 0, 0, 0, 1, 1, 0, 1, 1] });
  const six = generateWaves(6, () => 0); assert.ok(six[5].includes('pole')); assert.ok(six[9].includes('pole'));
  const seven = generateWaves(7, () => .999);
  assert.equal(seven.length, 20);
  assert.deepEqual(seven.flatMap((wave, index) => wave.includes('flag') ? [index + 1] : []), [10, 20]);
  assert.ok(seven.slice(0, 4).every(wave => !wave.includes('pole')));
  assert.ok(seven[19].includes('normal') && seven[19].includes('cone') && seven[19].includes('pole'));
});


test('1–8 introduces bucketheads without pole vaulters; 1–9 allows both and has two flags', () => {
  assert.deepEqual({ ...data.zombies.bucket, allowedLevels: data.zombies.bucket.allowedLevels.slice(0, 10) }, { value: 4, startingLevel: 8, firstAllowedWave: 1, weight: 3000, allowedLevels: [0,0,0,0,0,0,0,1,1,1] });
  const eight = generateWaves(8, () => 0); const nine = generateWaves(9, () => .999);
  assert.equal(eight.length, 10); assert.ok(eight[5].includes('bucket') && eight[9].includes('bucket'));
  assert.ok(!eight.flat().includes('pole'));
  assert.equal(nine.length, 20); assert.ok(nine.flat().includes('pole') && nine.flat().includes('bucket'));
  assert.deepEqual(nine.flatMap((wave, i) => wave.includes('flag') ? [i + 1] : []), [10, 20]);
});
