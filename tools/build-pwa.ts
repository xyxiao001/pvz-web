import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import type { Plugin } from 'vite';
import actorMotion from '../src/rendering/actor-motion-index.json';

const nativeClips = new Set(Object.keys(actorMotion));
function replacedAnimationPage(path: string): boolean {
  return path.startsWith('assets/runtime/clips/') && (
    nativeClips.has(path.slice(path.lastIndexOf('/') + 1).replace(/-\d+\.webp$/, '')) ||
    /\/(?:gargantuar-.+|peashooter|sunflower|threepeater|gatlingpea|twinsunflower|wintermelon|(?:cabbagepult|kernelpult|melonpult)(?:-attack)?)-\d+\.webp$/.test(path)
  );
}

// Same build-time shell/content revision split as KR, scoped to this game's assets.
export function pwa(): Plugin {
  let out: string;
  const startup = new Set<string>();
  return {
    name: 'pvz-pwa', apply: 'build',
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
      const source = await readFile(new URL('./pwa-worker.js', import.meta.url), 'utf8');
      const files = (await readdir(out, { recursive: true, withFileTypes: true }))
        .filter(e => e.isFile()).map(e => relative(out, resolve(e.parentPath, e.name)).replaceAll('\\', '/'))
        .filter(p => p === 'index.html' || p === 'manifest.webmanifest' || p.startsWith('icons/') && p !== 'icons/icon-master.png'
          || /^assets\/[^/]+\.(js|css)$/.test(p) || p.startsWith('assets/runtime/') || (/^assets\/(original|music)\/[^/]+\.(mp3|ogg)$/.test(p)))
        // Retain old URLs on the server without downloading unused baked pages in new installs.
        .filter(p => !replacedAnimationPage(p) && p !== 'assets/runtime/animations.json').sort();
      const assets: Record<string, { revision: string; size: number }> = {};
      for (const path of files) { const body = await readFile(resolve(out, path)); assets[path] = { revision: createHash('sha256').update(body).digest('hex'), size: body.length }; }
      const shell = files.filter(p => p === 'index.html' || p === 'manifest.webmanifest' || p.startsWith('icons/') || p.endsWith('.css') || startup.has(p));
      const release = createHash('sha256').update(source).update(JSON.stringify(assets)).digest('hex').slice(0, 16);
      await writeFile(resolve(out, 'sw.js'), `const RELEASE=${JSON.stringify(release)},ASSETS=${JSON.stringify(assets)},SHELL=${JSON.stringify(shell)};\n${source}`);
      console.log(`PWA ${release}: ${shell.length} startup files, ${files.length} offline files`);
    },
  };
}
