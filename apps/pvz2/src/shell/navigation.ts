import {BATTLE_LEVELS} from '../game/levels';
import type { Island, WorldMap } from './types';

export const NAVIGATION_KEY = 'pvz2-web:world-navigation';
export const LEVEL_ROUTES: Readonly<Record<string,string>> = Object.fromEntries(Object.keys(BATTLE_LEVELS).map(id=>[id,id]));
export function levelRoute(island:Island,random=Math.random){
  const choices=island.levels.filter(id=>LEVEL_ROUTES[id]);
  return choices.length>1?choices[Math.floor(random()*choices.length)]:choices[0];
}
const migratedWorlds = new Set(Object.values(BATTLE_LEVELS).map(level=>level.world));
export const isWorldMigrated = (world: string) => migratedWorlds.has(world);
export interface Navigation { world: string | null; chooser: number; cameras: Record<string, number> }
export const initialNavigation = (): Navigation => ({ world: null, chooser: 0, cameras: {} });

// Map progression and the port's implementation status are separate. Browsing a map
// never unlocks its levels, grants world keys, or writes battle completion.
export function islandStates(map: WorldMap, completed: ReadonlySet<string>, rewards: ReadonlySet<number> = new Set(), temporaryUnlock = false) {
  const states = new Map<number, 'locked' | 'open' | 'finished'>();
  for (const island of map.islands) states.set(island.node, (island.kind === 0 ? island.levels.some(id => completed.has(id)) : rewards.has(island.node)) ? 'finished'
    : island.levels.some(id => LEVEL_ROUTES[id] && map.startingLevels.includes(id)) ? 'open' : 'locked');
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
  if (temporaryUnlock) for (const island of map.islands) if (island.kind === 0 && island.levels.some(id=>LEVEL_ROUTES[id]) && states.get(island.node) === 'locked') states.set(island.node, 'open');
  return states;
}
export function bounds(map: WorldMap) {
  const xs = map.islands.filter(n => n.affectsBounds).map(n => n.x);
  return { min: Math.min(0, ...xs), max: Math.max(0, ...xs) };
}
export function clampCamera(map: WorldMap, value: number) {
  const range = bounds(map); return Math.max(range.min, Math.min(range.max, value));
}

// Leave room around an unlocking island instead of centering every nearby node.
export function cameraToReveal(map: WorldMap, camera: number, islandX: number) {
  const screenX = 512 + islandX - camera;
  return clampCamera(map, camera + (screenX < 256 ? screenX - 256 : screenX > 768 ? screenX - 768 : 0));
}
