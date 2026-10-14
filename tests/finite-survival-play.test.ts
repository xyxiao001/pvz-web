import test from 'node:test';
import assert from 'node:assert/strict';
import { playFinite } from './helpers/finite-survival';
for(const mode of ['survival-normal','survival-hard'] as const)for(const scene of ['day','night','pool','roof'] as const){
  const seed=mode==='survival-hard'&&scene==='roof'?42:23;
  test(`${mode} ${scene}: real cards and produced sun complete all five rounds (seed ${seed})`,()=>{
    const {game,transitions}=playFinite(mode,scene,seed);
    assert.equal(game.phase,'won',`round ${game.survivalStage+1}, wave ${game.wave}`);
    assert.equal(transitions,4);
    assert.equal(game.survivalFlags,mode==='survival-normal'?5:10);
    assert.ok(game.kills>0&&game.planted>0);
  });
}
