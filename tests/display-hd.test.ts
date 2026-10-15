import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import manifest from '../docs/display-hd-assets.json';
import { sceneryPlan } from '../src/rendering/scenery';
import { PLANTS } from '../src/game/config';
import { SHOP } from '../src/platform/profile';

const root = new URL('../', import.meta.url);
test('HD board art preserves the 800x600 street-free camera in every environment', () => {
  for (const environment of ['day','night','pool','fog','roof']) {
    for (const boss of [false, true]) {
      const low = sceneryPlan(environment, boss, 2), high = sceneryPlan(environment, boss, 2.01);
      assert.equal(low.sourceX, 220);
      assert.equal(high.sourceX, 0);
      assert.deepEqual(Object.keys(low.files), Object.keys(high.files));
      for (const file of Object.values(high.files)) {
        const info = manifest.files.find(item => `hd4/${item.file}` === file)!;
        assert.deepEqual(info.size, [3200,2400]);
        assert.deepEqual(info.crop, [220,0,1020,600]);
        assert.equal(info.size[0] / 4, 800);
        assert.equal(info.size[1] / 4, 600);
        assert.ok(existsSync(new URL(`public/assets/runtime/${file}`,root)));
      }
      for (const file of Object.values(low.files)) {
        assert.ok(!file.startsWith('hd4/'));
        assert.ok(existsSync(new URL(`public/assets/runtime/${file}`,root)));
      }
    }
  }
});
test('every plant and shop portrait resolves in the new DOM image directory', () => {
  for (const name of [...Object.keys(PLANTS), ...SHOP.map(item=>item.icon)]) {
    assert.ok(existsSync(new URL(`public/assets/runtime/hd4/original/${name}.webp`,root)),name);
  }
});
test('shipped HD files match their source and output manifest; original URLs remain deployed', () => {
  for (const item of manifest.files) {
    const source = readFileSync(new URL(item.source,root));
    const file = readFileSync(new URL(`public/assets/runtime/hd4/${item.file}`,root));
    assert.equal(createHash('sha256').update(source).digest('hex'),item.sourceSha256,item.source);
    assert.equal(createHash('sha256').update(file).digest('hex'),item.sha256,item.file);
    assert.equal(file.length,item.bytes,item.file);
    assert.ok(Math.max(...item.size)<=4096,item.file);
    if (item.role!=='scenery') assert.ok(existsSync(new URL(`public/assets/runtime/${item.file}`,root)));
  }
});
