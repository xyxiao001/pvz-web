import type { PlantKind } from './level';
import type { BattleLevel } from './battle-level';
import {COWBOY_LEVELS} from './worlds/cowboy';
import { PIRATE_LEVELS } from './worlds/pirate';
import { EGYPT_LEVELS } from './worlds/egypt';
export type { BattleLevel } from './battle-level';

export const BATTLE_LEVELS: Readonly<Record<string,BattleLevel>> = { ...EGYPT_LEVELS, ...PIRATE_LEVELS, ...COWBOY_LEVELS };

export function availablePlants(level: BattleLevel, owned: ReadonlySet<number>) {
  const plants = level.id === 'egypt1' ? level.plants : [...level.plants, { id: 165, kind: 'iceweed' as const }, { id: 158, kind: 'snowdrop' as const }, { id: 83, kind: 'imitater' as const }];
  return plants.filter(plant => owned.has(plant.id)).map(plant => plant.kind);
}
