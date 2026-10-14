import test, { type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { GameMusic, battleMusic } from '../src/platform/music';
import { Game } from '../src/game/model';
import { SURVIVAL_SCENES } from '../src/game/config';
import tracks from '../src/platform/music-tracks.json';
import manifest from '../docs/music-assets.json';

function harness(t: TestContext) {
  const requests: string[] = [], sources: any[] = [];
  t.mock.method(globalThis, 'fetch', async (url: string) => { requests.push(url); return new Response(new Uint8Array([1])); });
  const context = {
    currentTime: 0, destination: {}, resume: async () => {},
    createGain: () => ({ gain: { value: 0 }, connect() {} }),
    decodeAudioData: async () => ({ duration: 120 }),
    createBufferSource: () => {
      const source = { buffer: null, loop: false, loopStart: 0, started: [] as number[], stopped: false,
        connect() {}, disconnect() {}, start(_when: number, offset: number) { this.started.push(offset); }, stop() { this.stopped = true; } };
      sources.push(source); return source;
    },
  };
  return { requests, sources, context, music: new GameMusic('/', () => context as unknown as AudioContext) };
}
const settle = () => new Promise(resolve => setImmediate(resolve));
test('music stays lazy until interaction and reuses the current tune on pause and toggle', async t => {
  const {music,requests,sources,context}=harness(t);
  music.setTrack('menu'); await settle(); assert.equal(requests.length,0);
  await music.activate(); assert.equal(requests.length,1); assert.equal(sources.length,1); assert.equal(sources[0].loop,true);
  context.currentTime=15; music.setPaused(true); assert.equal(sources[0].stopped,true);
  context.currentTime=45; music.setPaused(false); await settle(); assert.equal(sources[1].started[0],15);
  music.enabled=false; assert.equal(sources[1].stopped,true); music.enabled=true; await settle();
  assert.equal(requests.length,1); assert.equal(sources.length,3);
  music.setTrack('menu'); await settle(); assert.equal(sources.length,3);
});
test('pause after multiple loops resumes at the original loop position',async t=>{
  const {music,sources,context}=harness(t);music.setTrack('day');await music.activate();
  context.currentTime=300;music.setPaused(true);music.setPaused(false);await settle();
  const loop=tracks.day.loopStart;
  assert.equal(sources[1].started[0],loop+(300-loop)%(120-loop));
});
test('a completed old download cannot play over the new scene or resume while paused',async t=>{
  const {music,sources,context}=harness(t);
  const pending: ((value:any)=>void)[]=[];
  t.mock.method(context,'decodeAudioData',()=>new Promise(resolve=>pending.push(resolve)));
  music.setTrack('menu');const activation=music.activate();await settle();
  music.setTrack('night');await settle();
  pending[0]({duration:120});await activation;assert.equal(sources.length,0);
  music.setPaused(true);pending[1]({duration:120});await settle();assert.equal(sources.length,0);
  music.setPaused(false);await settle();assert.equal(sources.length,1);
  music.setTrack(null);assert.equal(sources[0].stopped,true);
});
test('music follows the scene and Portable special-level choices',()=>{
  for(const scene of SURVIVAL_SCENES)assert.equal(battleMusic(new Game(9,1,'endless',scene)),scene);
  assert.equal(battleMusic(new Game(35,1)),'puzzle');
  for(const level of [5,15,25] as const)assert.equal(battleMusic(new Game(level,1)),'minigame');
  for(const level of [10,20] as const)assert.equal(battleMusic(new Game(level,1)),'conveyor');
});
test('all nine committed tunes have reproducible hashes and valid loop markers',()=>{
  assert.equal(Object.keys(tracks).length,9);
  for(const [name,track] of Object.entries(tracks)){
    const metadata=manifest.tracks[name as keyof typeof manifest.tracks];
    const body=readFileSync(new URL('../public/assets/music/'+track.file,import.meta.url));
    assert.equal(createHash('sha256').update(body).digest('hex'),metadata.sha256);
    assert.ok(track.loopStart>=0&&track.loopStart<metadata.duration);
    assert.ok(metadata.duration>20);
  }
});
