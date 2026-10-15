import { hasPlantMotion } from '../src/rendering/plant-motion';
import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/game/model';
import { LEVEL_IDS, SURVIVAL_SCENES } from '../src/game/config';
import { animationNames, animationFrame, combatTextureFiles } from '../src/rendering/asset-plan';
import { soundFiles } from '../src/platform/audio-plan';
import hd from '../public/assets/hd/original/animations.json';
import runtime from '../public/assets/runtime/animations.json';

const names = Object.keys(runtime.animations);
test('first-level combat preparation excludes unrelated projectiles and special sounds', () => {
  const game = new Game(1, 1);
  assert.deepEqual(combatTextureFiles(game), { pea: 'pea.webp' });
  assert.deepEqual(Object.keys(soundFiles(game)), ['plant', 'sun', 'mower', 'wave', 'flag', 'win', 'lose']);
  assert.equal(soundFiles(game).win, 'winmusic-web.mp3');
});
test('survival preparation includes retained defenses, projectiles and craters after repicking', () => {
  const game = new Game(9, 1, 'endless', 'night');
  game.seeds = ['sunflower'];
  game.plants = ['chomper', 'fumeshroom', 'hypnoshroom', 'iceshroom'].map((kind, index) => ({
    id: index + 1, kind: kind as typeof game.seeds[number], row: index, column: 0, health: 300, actionIn: 100, born: 0, shotAt: 0,
  }));
  game.peas = [
    { id: 5, row: 0, x: 400, ice: false, puff: false, age: 10 },
    { id: 6, row: 1, x: 400, ice: true, puff: false, age: 10 },
    { id: 7, row: 2, x: 400, ice: false, puff: true, age: 10 },
  ];
  game.craters = [{ id: 8, row: 3, column: 3, remaining: 1000 }];
  const restored = Game.restore(game.snapshot());
  assert.deepEqual(Object.keys(combatTextureFiles(restored)), ['pea', 'ice', 'puff', 'crater']);
  const sounds = soundFiles(restored);
  for (const key of ['swallow', 'fume', 'hypnotize', 'freeze']) assert.ok(sounds[key]);
  assert.equal(sounds.explode, undefined);
});
test('special modes and newly chosen plants load their own combat resources', () => {
  const bowling = new Game(5, 1);
  assert.equal(soundFiles(bowling).explode, 'cherrybomb.mp3');
  assert.deepEqual(combatTextureFiles(bowling), {});
  assert.equal(soundFiles(new Game(15, 1)).whack, 'bonk.mp3');
  const game = new Game(9, 1, 'endless', 'fog');
  game.seeds = ['snowpea', 'puffshroom', 'doomshroom', 'chomper', 'fumeshroom', 'iceshroom'];
  assert.deepEqual(Object.keys(combatTextureFiles(game)), ['ice', 'puff', 'crater']);
  for (const key of ['explode', 'swallow', 'fume', 'freeze']) assert.ok(soundFiles(game)[key]);
});
test('first level only loads its plants, sun and ordinary zombie animations', () => {
  const clips = animationNames(new Game(1, 1), names);
  assert.ok(clips.includes('peashooter')); assert.ok(clips.includes('sun')); assert.ok(clips.includes('zombie-die'));
  for (const root of ['dancer','snorkel','ducky','sunflower','squash','football']) assert.ok(!clips.some(n => n.startsWith(root)));
});
test('all adventures and survival rosters include armor loss, death, summon and water forms', () => {
  for (const game of [...LEVEL_IDS.map(l => new Game(l, 1)), ...SURVIVAL_SCENES.map(s => new Game(9, 1, 'endless', s))]) {
    game.seeds = [...game.config.seeds];
    const clips = animationNames(game, names);
    for (const seed of game.seeds) assert.ok(clips.includes(seed) || hasPlantMotion(seed), seed);
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
