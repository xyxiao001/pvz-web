import { cp, mkdir, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';
import actorMotion from '../src/rendering/actor-motion-index.json';
const nativeClips = new Set(Object.keys(actorMotion));

// Authoring PNG atlases and source art stay in public for local asset tools only.
export function runtimePublicAssets(): Plugin {
  let source: string, output: string;
  return {
    name: 'runtime-public-assets', apply: 'build',
    configResolved(config) { source = resolve(config.root, 'public'); output = resolve(config.root, config.build.outDir); },
    async writeBundle() {
      const copy = async (path: string) => { await mkdir(resolve(output, path, '..'), { recursive: true }); await cp(resolve(source, path), resolve(output, path), {
        recursive: true,
        // Native plant/giant rigs replace these baked pages; keep masters for authoring comparisons.
        filter: file => !(file.startsWith(resolve(source, 'assets/runtime/clips/')) && (nativeClips.has(file.slice(file.lastIndexOf('/') + 1).replace(/-\d+\.webp$/, '')) || /\/(?:gargantuar-.+|peashooter|sunflower|threepeater|gatlingpea|twinsunflower|wintermelon|(?:cabbagepult|kernelpult|melonpult)(?:-attack)?)-\d+\.webp$/.test(file))),
      }); };
      const sounds = (await readdir(resolve(source, 'assets/original'))).filter(file => /\.mp3$/.test(file) && file !== 'winmusic.mp3');
      const icons = (await readdir(resolve(source, 'icons'))).filter(file => file !== 'icon-master.png');
      await Promise.all(['assets/runtime', 'assets/music', 'manifest.webmanifest', ...sounds.map(file => `assets/original/${file}`), ...icons.map(file => `icons/${file}`)].map(copy));
    },
  };
}
