import { spawnSync } from 'node:child_process';
import { cp } from 'node:fs/promises';

// Each app builds and owns its files. Assemble only after PVZ1 has generated its
// offline manifest, so installing PVZ1 never downloads PVZ2 assets.
for (const script of ['build:pvz1', 'build:pvz2']) {
  const result = spawnSync('pnpm', ['run', script], { stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status);
}
await cp(new URL('../apps/pvz2/dist/', import.meta.url), new URL('../dist/pvz2/', import.meta.url), { recursive: true });
