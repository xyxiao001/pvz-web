import type { PlantKind } from './level';
import type { BattleLevel } from './battle-level';
import {MODERN_LEVELS} from './worlds/modern';
import {SKY_LEVELS} from './worlds/sky';
import {DINO_LEVELS} from './worlds/dino';
import {EIGHTIES_LEVELS} from './worlds/eighties';
import {KONGFU_LEVELS} from './worlds/kongfu';
import {LOSTCITY_LEVELS} from './worlds/lostcity';
import {ICEAGE_LEVELS} from './worlds/iceage';
import {BEACH_LEVELS} from './worlds/beach';
import {DARK_LEVELS} from './worlds/dark';
import {FUTURE_LEVELS} from './worlds/future';
import {COWBOY_LEVELS} from './worlds/cowboy';
import { PIRATE_LEVELS } from './worlds/pirate';
import { EGYPT_LEVELS } from './worlds/egypt';
export type { BattleLevel } from './battle-level';

export const BATTLE_LEVELS: Readonly<Record<string,BattleLevel>> = { ...EGYPT_LEVELS, ...PIRATE_LEVELS, ...COWBOY_LEVELS, ...FUTURE_LEVELS, ...DARK_LEVELS, ...BEACH_LEVELS, ...ICEAGE_LEVELS, ...LOSTCITY_LEVELS, ...KONGFU_LEVELS, ...EIGHTIES_LEVELS, ...DINO_LEVELS, ...SKY_LEVELS, ...MODERN_LEVELS };

export function availablePlants(level: BattleLevel, owned: ReadonlySet<number>) {
  const plants = level.id === 'egypt1' ? level.plants : [...level.plants, { id: 165, kind: 'iceweed' as const }, { id: 158, kind: 'snowdrop' as const }, { id: 83, kind: 'imitater' as const }];
  return plants.filter(plant => owned.has(plant.id)).map(plant => plant.kind);
}
