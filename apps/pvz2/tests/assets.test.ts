import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';

const root = new URL('../public/assets/', import.meta.url);
const read = (path: string) => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
test('all exported files match pinned source provenance', () => {
  const manifest = JSON.parse(readFileSync(new URL('../asset-provenance.json', import.meta.url), 'utf8'));
  assert.equal(manifest.commit, '0e4a05348b6de328e2902a57afa24a3a454a4205');
  for (const [path, expected] of Object.entries(manifest.outputs) as [string, { bytes: number; sha256: string }][]) {
    const data = readFileSync(new URL(path, root));
    assert.equal(data.length, expected.bytes, path);
    assert.equal(createHash('sha256').update(data).digest('hex'), expected.sha256, path);
  }
  assert.ok(readdirSync(root).includes('actors'));
});

test('skeletal image displays resolve to the extracted atlas, with explicit animation events', () => {
  for (const name of ['peashooter', 'sunflower', 'wallnut', 'potatomine', 'mummy', 'ra']) {
    const skeleton = read(`actors/${name}/skeleton.json`), atlas = read(`actors/${name}/atlas.json`);
    const names = new Set(atlas.SubTexture.map((t: { name: string }) => t.name));
    const armatures = new Set(skeleton.armature.map((a: { name: string }) => a.name));
    for (const armature of skeleton.armature) for (const skin of armature.skin) for (const slot of skin.slot) for (const display of slot.display) {
      if (display.type === 'armature') assert.ok(armatures.has(display.path ?? display.name), `${name}: armature ${display.name}`);
      else if (!display.type || display.type === 'image' || display.type === 'mesh') assert.ok(names.has(display.path ?? display.name), `${name}: texture ${display.name}`);
    }
    for (const part of atlas.SubTexture) {
      assert.ok(part.x >= 0 && part.y >= 0 && part.x + part.width <= atlas.width && part.y + part.height <= atlas.height);
    }
  }
  const pea = read('actors/peashooter/skeleton.json').armature[0];
  const shoot = pea.animation.find((a: { name: string }) => a.name === 'Shoot');
  assert.equal(shoot.frame[0].duration / pea.frameRate, 15 / 30);
  assert.equal(shoot.frame[1].events[0].name, 'Shoot');
});
