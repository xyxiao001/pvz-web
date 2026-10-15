import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runInNewContext } from 'node:vm';
import { build } from 'vite';
import { runtimePublicAssets } from '../tools/build-public-assets';
import { pwa } from '../tools/build-pwa';

test('deployment keeps old animation URLs while new offline downloads use native rigs', async () => {
  const temporary = await mkdtemp(join(tmpdir(), 'pvz-deployed-assets-'));
  const root = fileURLToPath(new URL('../', import.meta.url));
  const output = join(temporary, 'dist');
  try {
    const entry = join(temporary, 'entry.js');
    await writeFile(entry, 'export const version = 1;');
    await build({
      root, configFile: false, publicDir: false, logLevel: 'silent',
      plugins: [runtimePublicAssets(), pwa()],
      build: { outDir: output, emptyOutDir: true, rollupOptions: { input: entry } },
    });
    const manifest = JSON.parse(await readFile(join(output, 'assets/runtime/animations.json'), 'utf8'));
    const pages = new Set<string>(Object.values(manifest.animations).flatMap(animation => (animation as { pages: string[] }).pages));
    for (const page of pages) {
      assert.deepEqual(
        await readFile(join(output, 'assets/runtime', page)),
        await readFile(join(root, 'public/assets/runtime', page)),
        `Previously published animation must remain available: ${page}`,
      );
    }
    assert.ok(pages.has('clips/sunshroom-0.webp'));

    const worker = await readFile(join(output, 'sw.js'), 'utf8');
    const assets = runInNewContext(`${worker.split('\n')[0]}; ASSETS;`) as Record<string, unknown>;
    for (const path of ['clips/sunshroom-0.webp', 'clips/peashooter-0.webp', 'clips/melonpult-attack-0.webp']) {
      assert.ok(!(`assets/runtime/${path}` in assets), `New offline bundle must not download replaced clip: ${path}`);
    }
    for (const path of ['actor-motion/sunshroom.json', 'actor-motion/sunshroom.webp', 'plant-motion/melonpult.json', 'plant-motion/melonpult.webp', 'clips/sun-0.webp']) {
      assert.ok(`assets/runtime/${path}` in assets, `Current renderer resource must remain offline: ${path}`);
    }
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
});
