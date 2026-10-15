import { LEVELS, MUSHROOMS, isNight, isPool, isUpgrade, type LevelId, type PlantKind } from './config';
import { adventureWaveCount } from './waves';

// Account-owned rules are explicit inputs; headless battles and survival keep their own rules.
export interface CampaignRules {
  sawYeti:boolean;
  rake: boolean;
  run: number;
  slots: number;
  upgrades: PlantKind[];
  roofCleaner: boolean;
  poolCleaner: boolean;
  firstAid: boolean;
  tutorial: boolean;
}
export function campaignConfig(level: LevelId, rules: CampaignRules) {
  const base = LEVELS[level];
  const repeat = rules.run > 1;
  const seeds = base.mode === 'lawn' && (repeat || level>7)
    ? [...(repeat ? LEVELS[49].seeds : base.seeds), ...rules.upgrades]
    : base.seeds;
  return { ...base, seeds, rows: repeat && level < 4 ? [0,1,2,3,4] : base.rows,
    initialSun: repeat && base.mode === 'lawn' ? 50 : base.initialSun,
    waveCount: adventureWaveCount(level, repeat), reward: repeat ? null : base.reward };
}
// SeedChooserScreen::CrazyDavePickSeeds; Web RNG is intentionally independent of combat RNG.
export function daveSeeds(level: LevelId, choices: readonly PlantKind[], enemies: string[], random: () => number) {
  const environment = LEVELS[level].environment;
  const candidates = choices.filter(kind => !isUpgrade(kind) && kind !== 'imitater'
    && !(isNight(environment) ? kind === 'coffeebean' : MUSHROOMS.includes(kind))
    && !(isPool(environment) === false && ['lilypad','tanglekelp','seashroom'].includes(kind))
    && !(environment !== 'night' && kind === 'gravebuster')
    && !(environment !== 'fog' && kind === 'plantern')
    && !(kind === 'umbrella' && !enemies.includes('bungee') && !enemies.includes('catapult'))
    && !(kind === 'blover' && environment !== 'fog' && !enemies.includes('balloon'))
    && !(environment === 'roof' && ['torchwood','spikeweed'].includes(kind))
    && !(environment !== 'roof' && kind === 'flowerpot'));
  const picked: PlantKind[] = [];
  for (let i=0;i<3;i++) picked.push(candidates.splice(Math.floor(random()*candidates.length),1)[0]);
  return picked;
}
