import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { loadInBatches } from '../src/platform/load-queue';
import { denseGame } from './helpers/performance';

test('asset loading bounds concurrent work and completes each requested file once', async () => {
  let active=0, peak=0; const seen:number[]=[];
  await loadInBatches(Array.from({length:25},(_,i)=>i),4,async item=>{
    active++;peak=Math.max(peak,active);await Promise.resolve();seen.push(item);active--;
  });
  assert.equal(peak,4);assert.equal(active,0);
  assert.deepEqual(seen.sort((a,b)=>a-b),Array.from({length:25},(_,i)=>i));
});
test('asset loading propagates a failed download without retries', async () => {
  let calls=0;const error=new Error('download failed');
  await assert.rejects(loadInBatches(['missing'],4,async()=>{calls++;throw error;}),e=>e===error);
  assert.equal(calls,1);
});
// Recorded against d23606d before changing target selection; omit only the newly added, unused upgrade cooldown state.
for (const [scene, hash] of Object.entries({
  day:'0566553a6f2b1f7aad5791d3b67a66480e78fd9b887bee23e8558f4d898a6472',
  pool:'b9b4f53ab54f73290687b86f31a2993060911eb46aa1c562c6145267ea87a907',
  roof:'7a8ec40bb85727bc232c2fb398c7fb66bc8f5d0f6fb3417308426a44bab94d5b',
}) as [Parameters<typeof denseGame>[0],string][]) test(`dense ${scene} simulation preserves the pre-optimization result`,()=>{
  const game=denseGame(scene);for(let i=0;i<1000;i++){game.step();game.drainEvents();}
  const { upgradeCooldowns, ...originalState } = game.snapshot();
  assert.deepEqual(upgradeCooldowns, { gatlingpea: 0, twinsunflower: 0 });
  assert.equal(createHash('sha256').update(JSON.stringify(originalState)).digest('hex'),hash);
});
