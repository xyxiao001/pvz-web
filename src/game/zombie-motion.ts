import type { ZombieKind } from './config';

type Walker = { kind: ZombieKind; hasPole: boolean; speed: number; mini?: boolean; flying?: boolean; sled?: number; dolphin?: boolean };

// Zombie::UpdateAnimSpeed uses mVelX * frameCount / groundDistance * 47.
// Frame counts/distances come from the source .reanim _ground tracks.
const NORMAL = { frames: 47, distance: 49.8 };
const POLE_RUN = { frames: 37, distance: 30 };
const POLE_WALK = { frames: 45, distance: 67.8 };
const FOOTBALL = { frames: 30, distance: 30 };
const DANCER = { frames: 21, distance: 28.6 };
const SNORKEL = { frames: 37, distance: 59.9 };
const PAPER = { frames: 47, distance: 57.8 };
const GIANT = { frames: 49, distance: 124.1 };
const IMP = { frames: 33, distance: 62.9 };
const track = (zombie: Walker) => zombie.kind === 'gargantuar' ? GIANT : zombie.kind === 'imp' ? IMP : zombie.kind === 'dancer' || zombie.kind === 'backup' ? DANCER : zombie.kind === 'snorkel' ? SNORKEL : zombie.kind === 'football' ? FOOTBALL : zombie.kind === 'newspaper' ? PAPER : zombie.kind === 'pole' ? zombie.hasPole ? POLE_RUN : POLE_WALK : NORMAL;

export function walkingCycleTicks(zombie: Walker) {
  return track(zombie).distance / (zombie.speed * .47) * (zombie.mini ? .5 : 1);
}

// The port still walks uniformly. Use the source cycle's mean displacement,
// including REANIM_LOOP's frameCount - 1 intervals, rather than raw mVelX.
export function walkingSpeed(zombie: Walker) {
  if (zombie.kind === 'zomboni' || zombie.kind === 'catapult' || zombie.sled || zombie.flying) return zombie.speed;
  const { frames } = track(zombie);
  return zombie.speed * .47 * frames / (frames - 1);
}
