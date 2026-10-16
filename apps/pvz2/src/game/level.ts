export const PLANT_KINDS = ['sunflower', 'peashooter', 'wallnut', 'potatomine'] as const;
export type PlantKind = typeof PLANT_KINDS[number];
export type ZombieKind = 'mummy' | 'mummy_armor1' | 'mummy_flag' | 'ra';
export const BOARD = { width: 1200, height: 700, left: 190, top: 160, cellWidth: 82, cellHeight: 98, columns: 9, rows: 5 };
export const cellX = (column: number) => BOARD.left + (column + .5) * BOARD.cellWidth;
export const rowY = (row: number) => BOARD.top + row * BOARD.cellHeight + 80;

export interface PlantProperties {
  SunCost: number; Cooldown: number; CooldownFrom: number; Toughness: number;
  ShootInterval: number; ShootIntervalAdditional: number; PlantfoodPeaCount: number;
  SunValue: number; ProduceInterval: number; ProduceIntervalAdditional: number;
  ProduceCountdownStart: number; ProduceCountdownStartAdditional: number;
  ChargeTime: number; Damage: number; ArmorToughness: number;
}
export interface ZombieProperties { Toughness: number; WalkSPS: number; EatDPS: number; MaxAbsorbValue: number }
export interface Properties {
  plants: Record<PlantKind, PlantProperties>;
  zombies: Record<ZombieKind, ZombieProperties>;
  armors: { egypt_armor1: { Toughness: number } };
}
export interface SourceLevel {
  objects: { objclass: string; aliases?: string[]; objdata: Record<string, unknown> }[];
}
export interface Level { waves: ZombieKind[][]; minHealth: number; maxHealth: number; flagInterval: number }
const reference = (value: string) => value.slice(5, value.indexOf('@'));

// Interpret the explicit spawn lists of the pinned Egypt 1 level. Other world modules
// stay outside this first slice; there is no substitution for unsupported zombie types.
export function readLevel(source: SourceLevel): Level {
  const manager = source.objects.find(o => o.objclass === 'WaveManagerProperties')!.objdata;
  const byName = new Map(source.objects.flatMap(o => (o.aliases ?? []).map(name => [name, o.objdata] as const)));
  return {
    waves: (manager.Waves as string[][]).map(wave => wave.flatMap(action =>
      (byName.get(reference(action))!.Zombies as { Type: string }[]).map(zombie => reference(zombie.Type) as ZombieKind))),
    minHealth: manager.MinNextWaveHealthPercentage as number,
    maxHealth: manager.MaxNextWaveHealthPercentage as number,
    flagInterval: manager.FlagWaveInterval as number,
  };
}

export interface AnimationTiming { shoot: number; shootDuration: number; produce: number; produceDuration: number }
export const plantLabels: Record<PlantKind, string> = { peashooter: '豌豆射手', sunflower: '向日葵', wallnut: '坚果', potatomine: '土豆地雷' };
