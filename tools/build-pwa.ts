import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import type { Plugin } from 'vite';

// Same build-time shell/content revision split as KR, scoped to this game's assets.
export function pwa(): Plugin {
  let out: string;
  return {
    name: 'pvz-pwa', apply: 'build',
    configResolved(config) { out = resolve(config.root, config.build.outDir); },
    async closeBundle() {
      const source = await readFile(new URL('./pwa-worker.js', import.meta.url), 'utf8');
      const files = (await readdir(out, { recursive: true, withFileTypes: true }))
        .filter(e => e.isFile()).map(e => relative(out, resolve(e.parentPath, e.name)).replaceAll('\\', '/'))
        .filter(p => p === 'index.html' || p === 'manifest.webmanifest' || p.startsWith('icons/') && p !== 'icons/icon-master.png'
          || /^assets\/[^/]+\.(js|css)$/.test(p) || p.startsWith('assets/hd/') || (/^assets\/original\/[^/]+\.(mp3|ogg)$/.test(p))).sort();
      const assets: Record<string, { revision: string; size: number }> = {};
      for (const path of files) { const body = await readFile(resolve(out, path)); assets[path] = { revision: createHash('sha256').update(body).digest('hex'), size: body.length }; }
      const shell = files.filter(p => !p.startsWith('assets/hd/') && !(/^assets\/original\/[^/]+\.(mp3|ogg)$/.test(p)));
      const release = createHash('sha256').update(source).update(JSON.stringify(assets)).digest('hex').slice(0, 16);
      await writeFile(resolve(out, 'sw.js'), `const RELEASE=${JSON.stringify(release)},ASSETS=${JSON.stringify(assets)},SHELL=${JSON.stringify(shell)};\n${source}`);
      console.log(`PWA ${release}: ${shell.length} startup files, ${files.length} offline files`);
    },
  };
}
