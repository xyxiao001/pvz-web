import { isPool } from '../game/config';
import type { Game } from '../game/model';

// Include selected cards, retained defenses, wave enemies and their spawned forms.
export function animationNames(game: Game, available: string[]) {
  const roots = new Set<string>(['sun', 'zombie']);
  for (const kind of [...game.seeds, ...game.plants.map(p => p.kind), ...game.rollers.map(p => p.kind)]) roots.add(kind);
  if (roots.has('fumeshroom')) roots.add('fume-cloud');
  const enemies = new Set([...game.waves.flat(), ...game.zombies.map(z => z.kind)]);
  if (game.config.mode === 'whack') for (const kind of ['normal','cone','bucket'] as const) enemies.add(kind);
  if (game.config.environment === 'night' || isPool(game.config.environment)) { enemies.add('normal'); enemies.add('cone'); }
  for (const kind of enemies) {
    roots.add(kind === 'normal' || kind === 'ducky' ? 'zombie' : kind);
    if (kind === 'dancer') roots.add('backup');
  }
  if (isPool(game.config.environment)) {
    roots.add('ducky'); roots.add('ducky1');
    if (enemies.has('cone')) roots.add('ducky2');
    if (enemies.has('bucket')) roots.add('ducky3');
  }
  return available.filter(name => [...roots].some(root => name === root || name.startsWith(`${root}-`)));
}

// Return the first frame whose exclusive end lies after the animation clock.
export function animationFrame(ends: number[], position: number) {
  let left = 0, right = ends.length - 1;
  while (left < right) { const middle = (left + right) >>> 1; if (position < ends[middle]) right = middle; else left = middle + 1; }
  return left;
}
