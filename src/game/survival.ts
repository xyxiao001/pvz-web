import data from './data/portable-adventure.json';
import { isPool, type SurvivalScene, type ZombieKind } from './config';

export const isSurvivalFlagWave = (wave: number) => wave % 10 === 9;

// Challenge::InitZombieWaves + InitZombieWavesSurvival. Later stages draw only
// from the migrated land roster; this is intentionally a limited first release.
export function survivalRoster(stage: number, random: () => number, scene: SurvivalScene = 'day'): ZombieKind[] {
  if (stage === 0) return ['normal', 'cone', 'bucket'];
  const basic: ZombieKind = random() < .2 ? 'newspaper' : 'cone';
  const roster: ZombieKind[] = ['normal', basic];
  const migrated: ZombieKind[] = ['cone', 'pole', 'bucket', 'newspaper', 'door', 'football', 'dancer', ...(isPool(scene) ? ['snorkel' as const] : [])];
  const candidates = migrated.filter(kind => kind !== basic);
  const count = Math.min(stage + 1, candidates.length);
  for (let i = 0; i < count; i++) roster.push(candidates.splice(Math.floor(random() * candidates.length), 1)[0]);
  return roster;
}

// Board::PickZombieWaves, GetNumWavesPerSurvivalStage; Board.h caps each wave
// at 50. Original costs/weights are shared with adventure, but no intro or
// final-wave "all missing types" injection applies in survival.
export function generateSurvivalWaves(stage: number, roster: readonly ZombieKind[], random: () => number): ZombieKind[][] {
  const flags = stage * 2;
  const earlier = Math.round(15 * Math.max(0, Math.min(1, (flags - 18) / 32)));
  const decay = Math.max(0, Math.min(1, (flags - 10) / 40));
  const weight = (kind: ZombieKind) => Math.round(data.zombies[kind].weight * (1 - decay * (kind === 'normal' ? .9 : kind === 'cone' ? .75 : 0)));
  return Array.from({ length: 20 }, (_, index) => {
    const wave: ZombieKind[] = [];
    let points = stage === 0 ? Math.floor(index / 3) + 1 : Math.floor((stage * 20 + index) * 2 / 5) + 1;
    const put = (kind: ZombieKind) => { wave.push(kind); points -= data.zombies[kind].value; };
    if (isSurvivalFlagWave(index)) {
      const normals = Math.min(points, 8);
      points = Math.trunc(points * 2.5);
      for (let i = 0; i < normals; i++) put('normal');
      put('flag');
    }
    while (points > 0 && wave.length < 50) {
      const choices = roster.filter(kind => data.zombies[kind].value <= points
        && Math.max(1, data.zombies[kind].firstAllowedWave - earlier) <= index + 1);
      let pick = Math.floor(random() * choices.reduce((sum, kind) => sum + weight(kind), 0));
      for (const kind of choices) {
        pick -= weight(kind);
        if (pick < 0) { put(kind); break; }
      }
    }
    return wave;
  });
}
export const ZOMBIE_NAMES: Record<ZombieKind, string> = {
  dancer: '舞王僵尸', backup: '伴舞僵尸', ducky: '鸭子救生圈僵尸', snorkel: '潜水僵尸', football: '橄榄球僵尸', normal: '普通僵尸', flag: '旗帜僵尸', cone: '路障僵尸', pole: '撑杆僵尸',
  bucket: '铁桶僵尸', newspaper: '读报僵尸', door: '铁栅门僵尸',
};
