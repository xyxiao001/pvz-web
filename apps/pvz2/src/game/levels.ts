import type { PlantKind } from './level';
import type { BattleLevel } from './battle-level';
import { EGYPT_LEVELS } from './worlds/egypt';
export type { BattleLevel } from './battle-level';

export const BATTLE_LEVELS: Readonly<Record<string,BattleLevel>> = { ...EGYPT_LEVELS };

export function availablePlants(level: BattleLevel, owned: ReadonlySet<number>) {
  const plants = level.day === 1 ? level.plants : [...level.plants, { id: 165, kind: 'iceweed' as const }, { id: 158, kind: 'snowdrop' as const }];
  return plants.filter(plant => owned.has(plant.id)).map(plant => plant.kind);
}
