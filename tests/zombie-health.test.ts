import test from 'node:test';
import assert from 'node:assert/strict';
import { zombieHealthFraction } from '../src/rendering/zombie-health';

test('health bars include body, armor and shields, including separate mini rounding', () => {
  assert.equal(zombieHealthFraction({kind:'normal',health:270,armor:0,shield:0}),1);
  assert.equal(zombieHealthFraction({kind:'cone',health:270,armor:370,shield:0}),1);
  assert.equal(zombieHealthFraction({kind:'cone',health:270,armor:0,shield:0}),270/640);
  assert.equal(zombieHealthFraction({kind:'bucket',health:270,armor:1100,shield:0}),1);
  assert.equal(zombieHealthFraction({kind:'door',health:270,armor:0,shield:1100}),1);
  assert.equal(zombieHealthFraction({kind:'ladder',health:500,armor:0,shield:500}),1);
  assert.equal(zombieHealthFraction({kind:'gargantuar',health:1500,armor:0,shield:0}),.5);
  assert.equal(zombieHealthFraction({kind:'cone',mini:true,health:67,armor:92,shield:0}),1);
  assert.equal(zombieHealthFraction({kind:'normal',health:0,armor:0,shield:0}),0);
});
