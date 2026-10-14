import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/model';
import { LEVEL_IDS, SURVIVAL_SCENES } from '../src/game/config';
import { animationNames, animationFrame } from '../src/rendering/asset-plan';
import hd from '../public/assets/hd/original/animations.json';
import runtime from '../public/assets/runtime/animations.json';

const names = Object.keys(runtime.animations);
test('first level only loads its plants, sun and ordinary zombie animations', () => {
  const clips = animationNames(new Game(1, 1), names);
  assert.ok(clips.includes('peashooter')); assert.ok(clips.includes('sun')); assert.ok(clips.includes('zombie-die'));
  for (const root of ['dancer','snorkel','ducky','sunflower','squash','football']) assert.ok(!clips.some(n => n.startsWith(root)));
});
test('all adventures and survival rosters include armor loss, death, summon and water forms', () => {
  for (const game of [...LEVEL_IDS.map(l => new Game(l, 1)), ...SURVIVAL_SCENES.map(s => new Game(9, 1, 'endless', s))]) {
    game.seeds = [...game.config.seeds];
    const clips = animationNames(game, names);
    for (const seed of game.seeds) assert.ok(clips.includes(seed), seed);
    if (clips.includes('dancer-walk')) assert.ok(clips.includes('backup-walk'));
    if (clips.includes('cone-walk')) assert.ok(clips.includes('zombie-walk'));
    if (game.config.mode === 'whack') assert.ok(clips.includes('bucket-walk'));
    if (game.waterRow(2)) assert.ok(clips.includes('ducky2-eat'));
  }
  const game=new Game(9,1,'endless','fog');game.seeds=['puffshroom'];
  game.plants=[{id:1,kind:'fumeshroom',row:0,column:0,health:300,actionIn:100,born:0,shotAt:0}];
  const clips=animationNames(game,names);assert.ok(clips.includes('fumeshroom-attack'));assert.ok(clips.includes('fume-cloud'));
});
test('runtime packing keeps every pose, duration, anchor and logical extent', () => {
  assert.deepEqual(names,Object.keys(hd.animations));
  for (const name of names as (keyof typeof hd.animations)[]) {
    const a=hd.animations[name],b=runtime.animations[name];
    assert.deepEqual(b.durations,a.durations,name);assert.deepEqual(b.anchor,a.anchor,name);
    assert.deepEqual(b.frames.map(f=>f.slice(3)),a.frames.map(f=>f.slice(3)),name);
    for (const [page,x,y,w,h] of b.frames) {const [pw,ph]=b.sizes[page];assert.ok((x+w)*2<=pw&&(y+h)*2<=ph,name);}
  }
});
test('binary animation selection preserves exact frame boundaries and sub-tick sampling', () => {
  for (const clip of Object.values(hd.animations)) {
    let total=0;const ends=clip.durations.map(d=>total+=d);
    for(let t=0;t<total;t+=.25)assert.equal(animationFrame(ends,t),ends.findIndex(end=>t<end));
  }
});
