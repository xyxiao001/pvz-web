import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { pvz2Pwa } from '../tools/build-pwa';

const source = readFileSync(new URL('../../../tools/pwa-worker.js', import.meta.url), 'utf8');
test('PVZ1 and PVZ2 cache, offline navigation and update activation remain separate', async () => {
  const storage = new Map<string, Map<string, Response>>();
  const caches = { open: async (name: string) => {
    if (!storage.has(name)) storage.set(name, new Map());
    const saved = storage.get(name)!;
    return { match: async (key: string) => saved.get(key)?.clone(), put: async (key: string, response: Response) => { saved.set(key, response); } };
  } };
  function worker(base: string, revision: string, online = true) {
    const callbacks = new Map<string, (event: any) => void>();
    let activated = 0, requests = 0;
    const self = { location: { href: `https://game.test${base}sw.js` }, clients: { claim: async () => {} }, skipWaiting: async () => { activated++; }, addEventListener: (name: string, fn: (event: any) => void) => callbacks.set(name, fn) };
    runInNewContext(source, { self, URL, caches, RELEASE: revision, SHELL: ['index.html'], ASSETS: { 'index.html': { revision, size: 10 }, 'assets/plant.webp': { revision: 'unchanged', size: 20 } }, fetch: async () => {
      requests++; if (!online) throw new Error('offline'); return new Response(`${base}:${revision}`);
    } });
    return {
      activated: () => activated, requests: () => requests,
      install: async () => { let pending!: Promise<unknown>; callbacks.get('install')!({ waitUntil: (p: Promise<unknown>) => pending = p }); await pending; },
      message: async (action: string) => { let pending!: Promise<unknown>; const messages: any[] = []; callbacks.get('message')!({ data: action, ports: [{ postMessage: (m: unknown) => messages.push(m) }], waitUntil: (p: Promise<unknown>) => pending = p }); await pending; return messages; },
      fetch: async (path: string, mode = 'navigate') => { let result: Promise<Response> | undefined; callbacks.get('fetch')!({ request: { url: `https://game.test${path}`, method: 'GET', mode }, respondWith: (p: Promise<Response>) => result = p, waitUntil: () => {} }); return result; },
    };
  }
  const first = worker('/', 'pvz1'), second = worker('/pvz2/', 'pvz2');
  await first.install(); await first.message('DOWNLOAD');
  await second.install();
  assert.equal((await second.message('STATUS')).at(-1).count, 1);
  await second.message('DOWNLOAD');
  assert.equal(storage.size, 2);
  assert.equal(await first.fetch('/pvz2/'), undefined);
  assert.equal(await first.fetch('/pvz2/assets/plant.webp', 'cors'), undefined);
  assert.equal(await second.fetch('/'), undefined);
  assert.equal(await second.fetch('/assets/plant.webp', 'cors'), undefined);
  const offline = worker('/pvz2/', 'pvz2', false);
  assert.equal(await (await offline.fetch('/pvz2/'))!.text(), '/pvz2/:pvz2');
  assert.equal(await (await offline.fetch('/pvz2/assets/plant.webp', 'cors'))!.text(), '/pvz2/:pvz2');
  assert.equal(offline.requests(), 0);
  const update = worker('/pvz2/', 'pvz2-new');
  await update.install(); await update.message('DOWNLOAD');
  assert.equal(update.requests(), 1, 'unchanged art is reused');
  assert.equal(update.activated(), 0, 'no activation before player accepts');
  await update.message('ACTIVATE');
  assert.equal(update.activated(), 1); assert.equal(first.activated(), 0);
  assert.equal(await (await first.fetch('/'))!.text(), '/:pvz1');
  assert.equal((await first.message('STATUS')).at(-1).release, 'pvz1');
});

test('PVZ2 build indexes only its output, keeps large game assets out of startup and versions content changes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'pvz2-pwa-'));
  try {
    await mkdir(join(dir, 'assets'));
    for (const [path, body] of Object.entries({ 'index.html': 'PVZ2', 'manifest.webmanifest': '{}', 'assets/entry.js': 'entry', 'assets/shared.js': 'shared', 'assets/battle.js': 'lazy', 'assets/lawn.webp': 'art', 'assets/music.ogg': 'music', 'assets/ui.css': 'css' })) await writeFile(join(dir, path), body);
    const plugin = pvz2Pwa();
    await (plugin.configResolved as Function)({ root: dir, build: { outDir: '.' } });
    await (plugin.generateBundle as Function)({}, {
      'assets/entry.js': { type: 'chunk', isEntry: true, fileName: 'assets/entry.js', imports: ['assets/shared.js'] },
      'assets/shared.js': { type: 'chunk', fileName: 'assets/shared.js', imports: [] },
    });
    const build = async () => {
      await (plugin.closeBundle as Function)();
      const generated = await readFile(join(dir, 'sw.js'), 'utf8');
      return runInNewContext(`${generated.split('\n')[0]}\n({RELEASE,ASSETS,SHELL})`);
    };
    const first = await build();
    assert.deepEqual([...first.SHELL].sort(), ['assets/entry.js', 'assets/shared.js', 'assets/ui.css', 'index.html', 'manifest.webmanifest']);
    assert.ok(first.ASSETS['assets/battle.js']); assert.ok(first.ASSETS['assets/music.ogg']);
    assert.equal(first.ASSETS['sw.js'], undefined);
    assert.equal(first.RELEASE, (await build()).RELEASE);
    await writeFile(join(dir, 'assets/lawn.webp'), 'new art');
    assert.notEqual(first.RELEASE, (await build()).RELEASE);
  } finally { await rm(dir, { recursive: true }); }
});

test('PVZ2 has its own install identity, start URL and icon', () => {
  const manifest = JSON.parse(readFileSync(new URL('../public/manifest.webmanifest', import.meta.url), 'utf8'));
  assert.equal(manifest.id, '/pvz2/'); assert.equal(manifest.scope, '/pvz2/'); assert.equal(manifest.start_url, '/pvz2/');
  assert.equal(manifest.display, 'standalone');
  for (const icon of manifest.icons) assert.ok(readFileSync(new URL(`../public/${icon.src}`, import.meta.url)).length);
});

test('client waits for PVZ2 activation even with a PVZ1 controller and reloads only its own accepted update', async () => {
  const { transpileModule, ScriptTarget, ModuleKind } = await import('typescript');
  const input = readFileSync(new URL('../src/pwa.ts', import.meta.url), 'utf8').replace("import './pwa.css';", '').replaceAll('import.meta.env.PROD', 'true').replaceAll('import.meta.env.BASE_URL', "'/pvz2/'").replaceAll('export ', '');
  const code = transpileModule(input, { compilerOptions: { target: ScriptTarget.ES2022, module: ModuleKind.ESNext } }).outputText;
  class Element extends EventTarget {
    textContent = ''; disabled = true; hidden = false; onclick?: () => void;
    children = new Map<string, Element>();
    append() {} setAttribute() {} close() {} showModal() {}
    querySelector(selector: string) { if (!this.children.has(selector)) this.children.set(selector, new Element()); return this.children.get(selector)!; }
  }
  const elements: Element[] = [];
  const document = Object.assign(new EventTarget(), { body: new Element(), createElement: () => { const el = new Element(); elements.push(el); return el; } });
  class Worker extends EventTarget {
    state = 'installing'; scriptURL = 'https://game.test/pvz2/sw.js'; activated = false;
    postMessage(action: string, ports?: any[]) {
      if (action === 'ACTIVATE') this.activated = true;
      else ports![0].peer.onmessage({ data: { type: 'done', bytes: 10, total: 10, count: 1, files: 1, release: 'pvz2' } });
    }
  }
  const initial = new Worker();
  const registration = Object.assign(new EventTarget(), { active: null as Worker | null, waiting: null as Worker | null, installing: initial as Worker | null });
  let readyReads = 0, reloads = 0;
  const serviceWorker = Object.assign(new EventTarget(), { controller: { scriptURL: 'https://game.test/sw.js' }, register: async (url: string, options: { scope: string }) => {
    assert.equal(url, '/pvz2/sw.js'); assert.equal(options.scope, '/pvz2/'); return registration;
  } });
  Object.defineProperty(serviceWorker, 'ready', { get: () => { readyReads++; return Promise.resolve({ scope: '/' }); } });
  class Channel {
    port1 = { onmessage: (_message: unknown) => {}, close() {} };
    port2 = { peer: this.port1 };
  }
  const context = { document, window: new EventTarget(), navigator: { serviceWorker }, URL, location: { href: 'https://game.test/pvz2/', reload: () => reloads++ }, MessageChannel: Channel };
  const started = runInNewContext(`${code}\nregisterPwa();`, context);
  await Promise.resolve();
  initial.state = 'installed'; initial.dispatchEvent(new Event('statechange'));
  assert.equal(elements[1].hidden, true, 'first PVZ2 install is not a PVZ1 update');
  assert.equal(elements[0].querySelector('#pwa-download').disabled, true);
  registration.active = initial; registration.installing = null;
  initial.state = 'activated'; initial.dispatchEvent(new Event('statechange'));
  await started;
  assert.equal(readyReads, 0);
  assert.equal(elements[0].querySelector('#pwa-download').disabled, false);
  assert.equal(elements[0].querySelector('#pwa-release').textContent, '当前版本 pvz2');
  const next = new Worker(); registration.installing = next; registration.dispatchEvent(new Event('updatefound'));
  registration.waiting = next; next.state = 'installed'; next.dispatchEvent(new Event('statechange'));
  assert.equal(elements[1].hidden, false); assert.equal(reloads, 0);
  elements[1].querySelector('#update-now').onclick!(); assert.equal(next.activated, true);
  serviceWorker.dispatchEvent(new Event('controllerchange')); assert.equal(reloads, 0, 'PVZ1 controller does not trigger reload');
  serviceWorker.controller = next; serviceWorker.dispatchEvent(new Event('controllerchange')); assert.equal(reloads, 1);
});
