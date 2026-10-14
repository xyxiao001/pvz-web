import data from './data/portable-adventure.json';
import type { LevelId, ZombieKind } from './config';

const kinds: ZombieKind[] = ['normal', 'flag', 'cone', 'pole', 'bucket', 'newspaper', 'door', 'football', 'dancer', 'backup', 'ducky', 'snorkel', 'zomboni', 'bobsled', 'dolphin', 'jack', 'balloon', 'digger', 'pogo', 'bungee', 'ladder'];
export function isFlagWave(level: LevelId, wave: number) {
  const perFlag = Math.min(data.waveCounts[level - 1], 10);
  return level !== 1 && wave % perFlag === perFlag - 1;
}

// Board::PickZombieWaves / PutInMissingZombies / PickZombieType.
// Scope: first-time adventure 1–1 … 5–5. The supplied RNG is this port's RNG.
export function generateWaves(level: LevelId, random: () => number): ZombieKind[][] {
  const count = data.waveCounts[level - 1];
  // Whack spawns timed groups from graves, not this adventure wave list.
  if (level === 15 || level === 35) return Array.from({ length: level === 35 ? 3 : count }, () => []);
  const allowed: ZombieKind[] = level === 25 ? ['normal','cone','football','snorkel'] : kinds.filter(kind => {
    const def = data.zombies[kind];
    return def.startingLevel <= level && def.weight !== 0 && def.allowedLevels[level - 1] !== 0;
  });
  const introduced = level === 1 ? undefined : kinds.find(kind => data.zombies[kind].startingLevel === level);
  return Array.from({ length: count }, (_, index) => {
    const wave: ZombieKind[] = [];
    // Board.cpp:624: Bungee Blitz flag waves include five stealing bungees.
    if (level === 45 && isFlagWave(level, index)) {
      wave.push('bungee','bungee','bungee','bungee','bungee');
      if (index !== count - 1) return wave;
    }
    let points = Math.floor(index / 3) + 1;
    const put = (kind: ZombieKind) => { wave.push(kind); points -= data.zombies[kind].value; };
    if (isFlagWave(level, index)) {
      const normals = Math.min(points, 8);
      points = Math.trunc(points * 2.5);
      for (let i = 0; i < normals; i++) put('normal');
      put('flag');
    }
    if (level === 5 || level === 25) points *= 4;
    if (level === 10 || level === 20 || level === 30 || level === 40) points *= 3;
    if (level === 45) points *= 2;
    if (introduced && (index === (introduced === 'digger' ? 6 : Math.floor(count / 2)) || index === count - 1)) put(introduced);
    if (index === count - 1) for (const kind of allowed) if (!wave.includes(kind)) put(kind);
    while (points > 0) {
      const choices = allowed.filter(kind => data.zombies[kind].value <= points && data.zombies[kind].firstAllowedWave <= index + 1);
      const weight = choices.reduce((sum, kind) => sum + data.zombies[kind].weight, 0);
      let pick = Math.floor(random() * weight);
      for (const kind of choices) {
        pick -= data.zombies[kind].weight;
        if (pick < 0) { put(kind); break; }
      }
    }
    return wave;
  });
}
