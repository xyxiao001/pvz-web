// RELEASE, ASSETS and SHELL are supplied by the build plugin.
const ROOT = new URL('./', self.location.href);
const CACHE = 'pvz-web:pwa:files-v1:' + ROOT.pathname;
const paths = new Map(Object.keys(ASSETS).map(path => [new URL(path, ROOT).pathname, path]));
const key = path => { const url = new URL(path, ROOT); url.searchParams.set('__pvz_revision', ASSETS[path].revision); return url.href; };
async function cachedFile(path) {
  const cache = await caches.open(CACHE), stored = await cache.match(key(path));
  if (stored) return stored;
  const response = await fetch(new URL(path, ROOT), { cache: 'no-cache' });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  await cache.put(key(path), response.clone());
  return response;
}
self.addEventListener('install', event => event.waitUntil(Promise.all(SHELL.map(cachedFile))));
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== ROOT.origin) return;
  const path = event.request.mode === 'navigate' && url.pathname === ROOT.pathname ? 'index.html' : paths.get(url.pathname);
  if (path) event.respondWith(cachedFile(path));
});
self.addEventListener('message', event => {
  if (event.data === 'ACTIVATE') { event.waitUntil(self.skipWaiting()); return; }
  const port = event.ports[0];
  if (event.data !== 'DOWNLOAD' && event.data !== 'STATUS') return;
  event.waitUntil((async () => {
    try {
      const cache = await caches.open(CACHE), files = Object.keys(ASSETS);
      const total = files.reduce((sum, path) => sum + ASSETS[path].size, 0);
      let bytes = 0, count = 0;
      for (const path of files) {
        if (event.data === 'DOWNLOAD') await cachedFile(path);
        if (await cache.match(key(path))) { bytes += ASSETS[path].size; count++; }
        if (event.data === 'DOWNLOAD') port.postMessage({ type: 'progress', bytes, total, count, files: files.length, release: RELEASE });
      }
      port.postMessage({ type: 'done', bytes, total, count, files: files.length, release: RELEASE });
    } catch (error) { port.postMessage({ type: 'error', message: String(error) }); }
  })());
});
