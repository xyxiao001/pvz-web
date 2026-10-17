import type { PlantKind } from './level';

export interface BattleLevel {
  id: string;
  world: string;
  worldName: string;
  day: number;
  source: string;
  plants: { id: number; kind: PlantKind }[];
  firstReward: { image: string; label: string };
}
// Only migrated battles are registered. Map unlocks do not make other levels playable.
export const BATTLE_LEVELS: Readonly<Record<string, BattleLevel>> = {
  egypt1: {
    id: 'egypt1', world: 'egypt', worldName: '神秘埃及', day: 1,
    source: 'levels/egypt1.source.json',
    plants: [{ id: 0, kind: 'peashooter' }, { id: 1, kind: 'sunflower' }, { id: 2, kind: 'wallnut' }, { id: 3, kind: 'potatomine' }],
    firstReward: { image: 'map', label: '世界地图' },
  },
};

export function availablePlants(level: BattleLevel, owned: ReadonlySet<number>) {
  return level.plants.filter(plant => owned.has(plant.id)).map(plant => plant.kind);
}
