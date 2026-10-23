import test from 'node:test';
import assert from 'node:assert/strict';
import { Texture, TextureSource, Rectangle, Ticker } from 'pixi.js';
import { FrameRate, estimateTextureBytes, jsHeapBytes } from '../src/performance';
import { FrameTicker } from '../src/frame-ticker';
import { readFrameLimit, saveFrameLimit, type FrameLimit } from '../src/frame-limit';
import { ResourcePool, ResourceScope } from '../src/assets/resource-pool';

test('FPS counts wall-clock frames and publishes only once per second', () => {
  const meter = new FrameRate();
  assert.equal(meter.sample(0), null);
  for (let frame = 1; frame < 60; frame++) assert.equal(meter.sample(frame * 1000 / 60), null);
  assert.equal(meter.sample(1000), 60);
  for (let frame = 1; frame < 5; frame++) assert.equal(meter.sample(1000 + frame * 200), null);
  assert.equal(meter.sample(2000), 5, 'long frames must not be clamped to the simulation delta');
});

test('resuming starts a fresh FPS window instead of including the paused interval', () => {
  const meter = new FrameRate();
  meter.sample(0); meter.sample(500); meter.reset();
  assert.equal(meter.sample(10000), null);
  for (let frame = 1; frame < 30; frame++) assert.equal(meter.sample(10000 + frame * 1000 / 30), null);
  assert.equal(meter.sample(11000), 30);
});

test('texture estimate counts physical atlas pixels once, including enhanced art', () => {
  const source = new TextureSource({ resource: { width: 1024, height: 512 }, resolution: 2 });
  const first = new Texture({ source, frame: new Rectangle(0, 0, 64, 64) });
  const second = new Texture({ source, frame: new Rectangle(64, 0, 64, 64) });
  const other = new Texture({ source: new TextureSource({ resource: { width: 256, height: 256 } }) });
  assert.equal(estimateTextureBytes([first, second, first, other]), (1024 * 512 + 256 * 256) * 4);
  assert.equal(estimateTextureBytes([]), 0);
  first.destroy(); second.destroy(); source.destroy(); other.destroy(true);
});

test('a battle resource snapshot excludes released textures and textures owned only by the map', async () => {
  const pool = new ResourcePool(async path => ({ path }), async () => {});
  const map = new ResourceScope(pool), battle = new ResourceScope(pool);
  await map.load('map'); await map.load('cards');
  await battle.load('cards'); await battle.load('cards'); await battle.load('lawn');
  assert.deepEqual((await battle.values()).map(value => value.path), ['cards', 'lawn']);
  await battle.release('lawn');
  assert.deepEqual((await battle.values()).map(value => value.path), ['cards']);
  await battle.dispose(); assert.deepEqual(await battle.values(), []); await map.dispose();
});

test('a 60 FPS ticker avoids duplicate battle updates on a 120 Hz display', () => {
  const ticker = new Ticker(); ticker.maxFPS = 60;
  let frames = 0, seconds = 0;
  ticker.add(tick => { frames++; seconds += tick.deltaMS / 1000; });
  ticker.lastTime = 0;
  for (let frame = 1; frame <= 120; frame++) ticker.update(frame * 1000 / 120);
  assert.ok(frames >= 59 && frames <= 60, String(frames));
  assert.ok(Math.abs(seconds - 1) < 1 / 60, String(seconds));
  ticker.destroy();
});

test('frame limits persist, including zero for unlimited, while new profiles keep 60 FPS', () => {
  const values=new Map<string,string>();
  const storage={getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);}};
  assert.equal(readFrameLimit(storage),60);
  for(const limit of [0,120,60,30] as const){saveFrameLimit(storage,limit);assert.equal(readFrameLimit(storage),limit);}
});

test('changing the live ticker limit preserves elapsed simulation time at 30, 60, 120 and unlimited', () => {
  const ticker=new FrameTicker();let frames=0,seconds=0;
  ticker.add(tick=>{frames++;seconds+=tick.deltaMS/1000;});ticker.lastTime=0;
  const limits:FrameLimit[]=[60,30,120,0,60];
  for(const [second,limit] of limits.entries()){
    ticker.maxFPS=limit;const before=frames;
    for(let frame=1;frame<=240;frame++)ticker.update(second*1000+frame*1000/240);
    const expected=limit===0?240:limit;
    assert.ok(Math.abs(frames-before-expected)<=1,`${limit}: ${frames-before} frames`);
    assert.ok(Math.abs(seconds-(second+1))<1/30,`${limit}: ${seconds}s`);
  }
  ticker.destroy();
});

test('JS heap telemetry uses reported bytes and stays absent on unsupported browsers', () => {
  assert.equal(jsHeapBytes({}),undefined);
  assert.equal(jsHeapBytes({memory:{usedJSHeapSize:0}}),0);
  assert.equal(jsHeapBytes({memory:{usedJSHeapSize:128*1024*1024}}),128*1024*1024);
});

test('fractional frame deadlines do not lose updates on matching 60/120 Hz displays', () => {
  for(const rate of [60,120]){
    const ticker=new FrameTicker();ticker.maxFPS=rate;ticker.lastTime=123.456;
    let frames=0;ticker.add(()=>{frames++;});
    for(let i=1;i<=rate*10;i++)ticker.update(123.456+i*1000/rate);
    assert.equal(frames,rate*10);
    ticker.stop();ticker.lastTime=20000;
    ticker.update(20000+1000/rate);assert.equal(frames,rate*10+1);
    ticker.destroy();
  }
});
