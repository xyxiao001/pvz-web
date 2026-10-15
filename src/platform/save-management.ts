import { SURVIVAL_MODES, SURVIVAL_SCENES } from '../game/config';
import { ACHIEVEMENTS_KEY } from './achievements';
import { PlayerProfile, PROFILE_KEY } from './profile';
import { ADVENTURE_KEY, ALL_LEVELS_KEY, survivalKey } from './storage';

export type ProgressReset = 'adventure' | 'all';

// Called only by the player's final action in the save management panel.
// Enumerate game records: browser preferences and offline caches are not progress.
export function resetProgress(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>, scope: ProgressReset) {
  storage.removeItem(ADVENTURE_KEY);
  storage.setItem(ALL_LEVELS_KEY, 'false');
  if (scope === 'all') {
    storage.removeItem(PROFILE_KEY);
    storage.removeItem(ACHIEVEMENTS_KEY);
    for (const mode of SURVIVAL_MODES) for (const scene of SURVIVAL_SCENES)
      storage.removeItem(survivalKey(scene, mode));
    return new PlayerProfile(storage);
  }
  const profile = new PlayerProfile(storage);
  Object.assign(profile.data, {
    run: 1, nextLevel: 1, completed: 0, declinedSlots: 0, sawYeti: false,
    tacoReceived: false, tacoPending: false, storeIntroduced: false,
  });
  profile.save();
  return profile;
}
