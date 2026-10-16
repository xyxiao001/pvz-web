// Resolved defaults from the pinned levelController.ts / SunDropperProperties.
// Egypt 1 does not override StartingSun or ZombieCountdownFirstWaveSecs.
export const EGYPT_RULES = {
  startingSun: 50, startingFood: 0, firstWaveDelay: 15,
  waveDelay: 25, waveDelayRange: 5, waveDamageDelay: 4, waveDamageRange: 1,
  normalWaveEntrance: .5, flagWaveEntrance: 5,
  initialSunDelay: 2, sunBase: 6, sunRange: 3, sunIncrease: .1, sunMax: 12,
} as const;
