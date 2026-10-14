import test from 'node:test';
import assert from 'node:assert/strict';
import { Matrix, Sprite, Texture } from 'pixi.js';
import { giantFrame, GiantRig, GIANT_CLIPS, type GiantDefinition } from '../src/rendering/giant-motion';
import { poseMatrix } from '../src/rendering/plant-motion';
import giant from '../public/assets/runtime/giant-motion/gargantuar.json';
import original from '../public/assets/runtime/animations.json';

const definition = giant as unknown as GiantDefinition;
const loaded = { definition, textures: Object.fromEntries(Object.keys(giant.frames).map(name => [name, Texture.EMPTY])) };

test('all seven giant states retain baked clip duration, keyframe timestamps and anchor origin', () => {
  assert.deepEqual(giant.origin, [-50, -145]); // Original import offset (190,180) minus anchor (240,325).
  for (const name of GIANT_CLIPS) {
    const action = name.slice(name.lastIndexOf('-') + 1) as keyof typeof giant.clips;
    const clip = giant.clips[action], before = original.animations[name];
    assert.equal(clip.duration, before.durations.reduce((sum, value) => sum + value, 0));
    assert.equal(clip.length, before.frames.length);
    let tick = 0;
    for (let i = 0; i < clip.length; i++) {
      for (const loop of [true, false]) assert.equal(giantFrame(tick, clip.duration, clip.length, loop).frame, i);
      tick += before.durations[i];
    }
    assert.equal(giantFrame(clip.duration, clip.duration, clip.length, true).frame, 0);
    assert.equal(giantFrame(clip.duration + 100, clip.duration, clip.length, false).frame, clip.length - 1);
  }
});

test('native giant poses interpolate in source draw order and hide only imp/white-rope after throwing', () => {
  const rig = new GiantRig(loaded), expected = new Matrix();
  for (const name of GIANT_CLIPS) {
    const clip = definition.clips[name.slice(name.lastIndexOf('-') + 1) as keyof GiantDefinition['clips']];
    for (let i = 0; i < clip.length; i++) {
      for (const fraction of [0, .5]) {
        rig.render(name, (i + fraction) * 10, true);
        for (let j = 0; j < rig.root.children.length; j++) {
          const part = rig.root.children[j] as Sprite;
          if (j >= clip.tracks.length) { assert.equal(part.visible, false); continue; }
          const track = clip.tracks[j], a = track.poses[i], b = track.poses[(i + 1) % clip.length];
          const hidden = name.includes('-bare-') && /^(Zombie_imp|Zombie_gargantuar_whiterope)/.test(track.name);
          assert.equal(part.visible, !!a[8] && a[6] >= 0 && a[7] > 0 && !hidden);
          if (!part.visible) continue;
          assert.ok(a[8] in loaded.textures);
          part.updateLocalTransform(); poseMatrix(expected, a, b, fraction);
          for (const key of ['a','b','c','d','tx','ty'] as const) assert.ok(Math.abs(part.localTransform[key] - expected[key]) < 1e-8, `${name} ${track.name} ${key}`);
          assert.equal(part.alpha, a[7] + (b[7] - a[7]) * fraction);
        }
      }
    }
  }
  rig.root.destroy({ children: true });
});
