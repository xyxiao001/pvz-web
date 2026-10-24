import test from 'node:test';
import assert from 'node:assert/strict';
import { installGameGestures } from '../src/game-gestures';

test('standalone Safari zoom gestures are canceled without canceling taps or drags', () => {
  const target = new EventTarget();
  installGameGestures(target as Document);
  for (const type of ['gesturestart', 'gesturechange']) {
    const event = new Event(type, { cancelable: true });
    target.dispatchEvent(event);
    assert.equal(event.defaultPrevented, true, type);
  }
  for (const type of ['click', 'touchstart', 'touchmove', 'touchend']) {
    const event = new Event(type, { cancelable: true });
    target.dispatchEvent(event);
    assert.equal(event.defaultPrevented, false, type);
  }
});
