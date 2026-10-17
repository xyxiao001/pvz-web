import test from 'node:test';
import assert from 'node:assert/strict';
import { WorldScrollGesture } from '../src/shell/world-scroll';

test('small trackpad movement accumulates before changing worlds', () => {
  const gesture = new WorldScrollGesture();
  assert.equal(gesture.step(8,0),0);
  assert.equal(gesture.step(16,16),0);
  assert.equal(gesture.step(24,32),1);
});

test('a short swipe and its long low-speed momentum tail change only one world', () => {
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

test('sustained scrolling continues without a click and waits between world changes', () => {
  const gesture = new WorldScrollGesture(), steps:number[]=[];
  for(let time=0;time<=1600;time+=16)if(gesture.step(60,time))steps.push(time);
  assert.deepEqual(steps,[0,352,704,1056,1408]);
});

test('a fresh swipe works during the previous momentum tail without needing a pause', () => {
  const gesture = new WorldScrollGesture();
  assert.equal(gesture.step(80,0),1);
  for(let time=16;time<=640;time+=16)assert.equal(gesture.step(2,time),0);
  assert.equal(gesture.step(60,656),1);
  for(let time=672;time<=1056;time+=16)assert.equal(gesture.step(2,time),0);
  assert.equal(gesture.step(-80,1072),-1);
});
