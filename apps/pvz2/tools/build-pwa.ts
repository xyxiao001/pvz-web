import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import type { Plugin } from 'vite';

// Share only the worker implementation. Each app generates its own file index,
// release and scope-specific cache; PVZ2 never includes PVZ1's resources.
export function pvz2Pwa(): Plugin {
  let out: string;
  const startup = new Set<string>();
  return {
    name: 'pvz2-pwa', apply: 'build',
    configResolved(config) { out = resolve(config.root, config.build.outDir); },
    generateBundle(_options, bundle) {
      const visit = (name: string) => {
        if (startup.has(name)) return;
        startup.add(name);
        const item = bundle[name];
        if (item.type === 'chunk') for (const dependency of item.imports) visit(dependency);
      };
      for (const item of Object.values(bundle)) if (item.type === 'chunk' && item.isEntry) visit(item.fileName);
    },
    async closeBundle() {
      const source = await readFile(new URL('../../../tools/pwa-worker.js', import.meta.url), 'utf8');
      const files = (await readdir(out, { recursive: true, withFileTypes: true }))
        .filter(entry => entry.isFile())
        .map(entry => relative(out, resolve(entry.parentPath, entry.name)).replaceAll('\\', '/'))
        .filter(path => path === 'index.html' || path === 'manifest.webmanifest' || path.startsWith('icons/') || path.startsWith('assets/')).sort();
      const assets: Record<string, { revision: string; size: number }> = {};
      for (const path of files) {
        const body = await readFile(resolve(out, path));
        assets[path] = { revision: createHash('sha256').update(body).digest('hex'), size: body.length };
      }
      const shell = files.filter(path => path === 'index.html' || path === 'manifest.webmanifest' || path.startsWith('icons/') || path.endsWith('.css') || startup.has(path));
      const release = createHash('sha256').update(source).update(JSON.stringify(assets)).digest('hex').slice(0, 16);
      await writeFile(resolve(out, 'sw.js'), `const RELEASE=${JSON.stringify(release)},ASSETS=${JSON.stringify(assets)},SHELL=${JSON.stringify(shell)};\n${source}`);
      console.log(`PVZ2 PWA ${release}: ${shell.length} startup files, ${files.length} offline files`);
    },
  };
}
