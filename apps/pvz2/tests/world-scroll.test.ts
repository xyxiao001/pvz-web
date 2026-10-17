import test from 'node:test';
import assert from 'node:assert/strict';
import { WorldScrollGesture } from '../src/shell/world-scroll';

test('small trackpad movement accumulates before changing worlds', () => {
  const gesture = new WorldScrollGesture();
  assert.equal(gesture.step(8,0),0);
  assert.equal(gesture.step(16,16),0);
  assert.equal(gesture.step(24,32),1);
});

test('a long gesture and its momentum tail change only one world', () => {
  const gesture = new WorldScrollGesture();
  assert.equal(gesture.step(80,0),1);
  for(let time=16;time<=1600;time+=16) assert.equal(gesture.step(time<300?60:2,time),0);
  assert.equal(gesture.step(-48,1800),-1);
});

test('separate gestures discard tiny residual movement and support either direction', () => {
  const gesture = new WorldScrollGesture();
  assert.equal(gesture.step(20,0),0);
  assert.equal(gesture.step(-30,200),0);
  assert.equal(gesture.step(-18,216),-1);
  assert.equal(gesture.step(48,420),1);
  assert.equal(gesture.step(0,650),0);
});
