import test from 'node:test';
import assert from 'node:assert/strict';
import { run } from './helpers/scenes-play';
import { Game } from '../src/game/model';

test('2–8 through 3–3 finish with normal six-slot/conveyor commands for two seeds',()=>{
 for(const level of [18,19,20,21,22,23] as const)for(const seed of [1,123456]){
  const game=run(level,seed);assert.equal(game.phase,'won',`${level} seed ${seed}, wave ${game.wave}`);
 }
});

test('each endless scene clears its first two flags, saves the interval, repicks and resumes',()=>{
 for(const scene of ['day','night','pool','fog'] as const){
  const game=run(9,scene==='pool'?23:1,scene);assert.equal(game.phase,'intermission',`${scene} wave ${game.wave}`);assert.equal(game.survivalFlags,2);
  const copy=Game.restore(JSON.parse(JSON.stringify(game.snapshot())));
  assert.equal(copy.phase,'intermission');assert.deepEqual(copy.plants,game.plants);assert.deepEqual(copy.mowers,game.mowers);
  game.nextSurvivalStage();copy.nextSurvivalStage();assert.equal(copy.phase,'ready');
  const kinds=copy.config.seeds.slice(0,6);for(const kind of kinds.slice(0,3)){game.chooseSeed(kind);copy.chooseSeed(kind);}
  const repick=Game.restore(JSON.parse(JSON.stringify(copy.snapshot())));
  assert.deepEqual(repick.seeds,copy.seeds);
  for(const kind of kinds.slice(3)){game.chooseSeed(kind);repick.chooseSeed(kind);}game.start();repick.start();
  for(let i=0;i<1000;i++){game.step();repick.step();game.drainEvents();repick.drainEvents();}
  assert.deepEqual(JSON.parse(JSON.stringify(repick.snapshot())),JSON.parse(JSON.stringify(game.snapshot())));
 }
});
