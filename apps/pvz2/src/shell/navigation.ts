import type { Island, WorldMap } from './types';

export const NAVIGATION_KEY = 'pvz2-web:world-navigation';
export const LEVEL_ROUTES: Readonly<Record<string, string>> = Object.fromEntries([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24].map(day=>[`egypt${day}`,`egypt${day}`]));
export interface Navigation { world: string | null; chooser: number; cameras: Record<string, number> }
export const initialNavigation = (): Navigation => ({ world: null, chooser: 0, cameras: {} });

// Map progression and the port's implementation status are separate. Browsing a map
// never unlocks its levels, grants world keys, or writes battle completion.
export function islandStates(map: WorldMap, completed: ReadonlySet<string>, rewards: ReadonlySet<number> = new Set()) {
  const states = new Map<number, 'locked' | 'open' | 'finished'>();
  for (const island of map.islands) states.set(island.node, (island.kind === 0 ? island.levels.some(id => completed.has(id)) : rewards.has(island.node)) ? 'finished'
    : map.id === 'egypt' && island.levels.some(id => map.startingLevels.includes(id)) ? 'open' : 'locked');
  const propagated = new Set<number>();
  const advance = (island: Island) => {
    if (propagated.has(island.node)) return;
    propagated.add(island.node);
    for (const id of island.next) {
      const next = map.islands.find(node => node.node === id)!;
      if (next.kind === 0) { if (states.get(id) !== 'finished') states.set(id, 'open'); }
      else if (next.kind === 1 || next.kind === 3) {
        if (rewards.has(id)) { states.set(id, 'finished'); advance(next); }
        else states.set(id, 'open');
      } else { states.set(id, 'finished'); advance(next); }
    }
  };
  for (const island of map.islands) if (states.get(island.node) === 'finished') advance(island);
  return states;
}
export function bounds(map: WorldMap) {
  const xs = map.islands.filter(n => n.affectsBounds).map(n => n.x);
  return { min: Math.min(0, ...xs), max: Math.max(0, ...xs) };
}
export function clampCamera(map: WorldMap, value: number) {
  const range = bounds(map); return Math.max(range.min, Math.min(range.max, value));
}
