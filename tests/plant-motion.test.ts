import test from 'node:test';
import assert from 'node:assert/strict';
import { Container, Matrix } from 'pixi.js';
import { applyPose, motionFrame, poseMatrix, type Pose } from '../src/rendering/plant-motion';
import { renderResolution } from '../src/rendering/resolution';
import pea from '../public/assets/runtime/plant-motion/peashooter.json';
import sunflower from '../public/assets/runtime/plant-motion/sunflower.json';
import threepeater from '../public/assets/runtime/plant-motion/threepeater.json';
import gatling from '../public/assets/runtime/plant-motion/gatlingpea.json';
import twin from '../public/assets/runtime/plant-motion/twinsunflower.json';
import winter from '../public/assets/runtime/plant-motion/wintermelon.json';

test('direct Pixi transforms preserve every native pose, interpolated frame and mirrored scale', () => {
  const part = new Container(), expected = new Matrix();
  const compare = (a: Pose, b: Pose, fraction: number) => {
    applyPose(part, a, b, fraction); part.updateLocalTransform();
    poseMatrix(expected, a, b, fraction);
    for (const component of ['a','b','c','d','tx','ty'] as const)
      assert.ok(Math.abs(part.localTransform[component] - expected[component]) < 1e-8, component);
  };
  for (const group of [...[pea, sunflower, threepeater, gatling, twin, winter].flatMap(d => d.groups), ...winter.shooting.groups]) {
    for (const track of group.tracks) for (let i=0;i<track.poses.length;i++)
      for (const fraction of [0, .25, .5, .75, 1]) compare(track.poses[i] as Pose, track.poses[(i+1)%track.poses.length] as Pose, fraction);
  }
  const a: Pose = [10, -20, -2, 0, 180, -270, 0, 1, 'part'];
  const b: Pose = [-40, 50, 0, -3, 350, 20, 0, 1, 'part'];
  for (const fraction of [0, .25, .5, .75, 1]) compare(a,b,fraction);
  part.destroy();
});

test('native plant motion interpolates between poses without changing cycle duration at 1x/2x/4x', () => {
  for (const definition of [pea, sunflower, threepeater, gatling, twin]) {
    for (const speed of [1, 2, 4]) {
      const duration = definition.duration, length = definition.groups[0].length;
      assert.deepEqual(motionFrame(duration, duration, length), { frame: 0, next: 1, fraction: 0 });
      const first = motionFrame(1 / 6 * speed, duration, length);
      assert.ok(first.fraction > 0 && first.fraction < 1);
      const nearEnd = motionFrame(duration - .001, duration, length);
      assert.equal(nearEnd.frame, length - 1); assert.equal(nearEnd.next, 0);
      const wrapped = motionFrame(-.001, duration, length);
      assert.equal(wrapped.frame, length - 1); assert.equal(wrapped.next, 0);
    }
  }
});
test('interpolated parts and attachment bind pose follow original affine transforms', () => {
  const a: Pose = [10, 20, 1, 1, 0, 0, 0, 1, 'part'];
  const b: Pose = [30, 40, 2, 2, 90, 90, 0, 1, 'part'];
  const m = poseMatrix(new Matrix(), a, b, .5);
  assert.equal(m.tx, 20); assert.equal(m.ty, 30);
  assert.ok(Math.abs(m.a - Math.cos(Math.PI / 4) * 1.5) < 1e-10);
  assert.ok(Math.abs(m.c + Math.sin(Math.PI / 4) * 1.5) < 1e-10);
  for (const group of threepeater.groups) if ('attachment' in group) {
    const pose = group.attachment![0] as Pose;
    const base = poseMatrix(new Matrix(), pose, pose, 0);
    const bound = base.clone().append(base.clone().invert());
    for (const [actual, expected] of [[bound.a, 1], [bound.b, 0], [bound.c, 0], [bound.d, 1], [bound.tx, 0], [bound.ty, 0]]) assert.ok(Math.abs(actual - expected) < 1e-10);
    assert.equal(group.attachment!.length, group.length);
  }
});
test('every plant image track resolves to its own atlas and complete pose sequence', () => {
  for (const definition of [pea, sunflower, threepeater, gatling, twin]) {
    for (const group of definition.groups) for (const track of group.tracks) {
      assert.equal(track.poses.length, group.length);
      for (const pose of track.poses) if (pose[8]) assert.ok(pose[8] as string in definition.frames);
    }
  }
});
test('framebuffer matches small displays and stops at native 2x detail on high density fullscreen', () => {
  assert.equal(renderResolution(400, 1), .5);
  assert.equal(renderResolution(400, 3), 1);
  assert.equal(renderResolution(520, 3), 1.3);
  assert.equal(renderResolution(800, 2), 2);
  assert.equal(renderResolution(1920, 2), 2);
  assert.equal(renderResolution(1280, 1), 1.6);
});
