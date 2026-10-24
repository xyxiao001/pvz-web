import test from 'node:test';
import assert from 'node:assert/strict';
import { bindMapDrag } from '../src/shell/map-input';
function fixture() {
  const canvas = new EventTarget(), captures: number[] = [], calls: unknown[][] = [];
  Object.assign(canvas, { setPointerCapture: (id: number) => captures.push(id) });
  bindMapDrag(canvas as HTMLCanvasElement, {
    start: point => calls.push(['start', point.clientX]), move: point => calls.push(['move', point.clientX]),
    end: point => calls.push(['end', point.clientX]), cancel: () => calls.push(['cancel']),
  });
  const send = (type: string, data: object) => {
    const event = Object.assign(new Event(type, { cancelable: true }), data);
    canvas.dispatchEvent(event); return event;
  };
  const touch = (type: string, x: number, id = 1) => send(type, { changedTouches: [{ identifier: id, clientX: x, clientY: 100 }] });
  const pointer = (type: string, x: number, pointerType = 'touch') => send(type, { pointerId: 1, pointerType, clientX: x, clientY: 100 });
  return { calls, captures, touch, pointer };
}
test('touch-only browsers can drag and tap without any Pointer Events', () => {
  const f = fixture();
  assert.ok(f.touch('touchstart', 300).defaultPrevented);
  assert.ok(f.touch('touchmove', 200).defaultPrevented);
  assert.ok(f.touch('touchend', 100).defaultPrevented);
  f.touch('touchstart', 50); f.touch('touchend', 50);
  assert.deepEqual(f.calls, [['start', 300], ['move', 200], ['end', 100], ['start', 50], ['end', 50]]);
  assert.deepEqual(f.captures, []);
});
test('browsers emitting touch and pointer events perform each gesture only once', () => {
  const f = fixture();
  f.pointer('pointerdown', 300); f.touch('touchstart', 300);
  f.pointer('pointermove', 200); f.touch('touchmove', 200);
  f.pointer('pointerup', 100); f.touch('touchend', 100);
  assert.deepEqual(f.calls, [['start', 300], ['move', 200], ['end', 100]]);
});
test('a second finger cannot replace or finish the active map drag', () => {
  const f = fixture();
  f.touch('touchstart', 300); f.touch('touchstart', 500, 2);
  f.touch('touchmove', 400, 2); f.touch('touchend', 400, 2);
  f.touch('touchmove', 200); f.touch('touchend', 100);
  assert.deepEqual(f.calls, [['start', 300], ['move', 200], ['end', 100]]);
});
test('touch cancellation ends the drag and permits the next gesture', () => {
  const f = fixture();
  f.touch('touchstart', 300); f.pointer('pointercancel', 300); f.touch('touchcancel', 300);
  f.touch('touchstart', 200); f.touch('touchend', 100);
  assert.deepEqual(f.calls, [['start', 300], ['cancel'], ['start', 200], ['end', 100]]);
});
test('mouse dragging retains pointer capture and cancellation', () => {
  const f = fixture();
  f.pointer('pointerdown', 300, 'mouse'); f.pointer('pointermove', 200, 'mouse'); f.pointer('pointerup', 100, 'mouse');
  f.pointer('pointerdown', 50, 'mouse'); f.pointer('pointercancel', 50, 'mouse');
  assert.deepEqual(f.calls, [['start', 300], ['move', 200], ['end', 100], ['start', 50], ['cancel']]);
  assert.deepEqual(f.captures, [1, 1]);
});
