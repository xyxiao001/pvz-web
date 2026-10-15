import type { LevelId } from '../game/config';

// Separate namespace; never touches Kingdom Rush progress.
export const ADVENTURE_KEY = 'pvz-web:adventure:v1';
export function completedLevel() {
  const record = localStorage.getItem(ADVENTURE_KEY);
  return record === null ? 0 : Number(record.split('-')[1]);
}
export function completeLevel(level: LevelId) {
  localStorage.setItem(ADVENTURE_KEY, `1-${Math.max(level, completedLevel())}-complete`);
}

export const ALL_LEVELS_KEY = 'pvz-web:all-levels';
// Existing players keep all 50 levels open until they choose progression in the picker.
export function allLevelsEnabled() { return localStorage.getItem(ALL_LEVELS_KEY) !== 'false'; }
export function setAllLevelsEnabled(enabled: boolean) { localStorage.setItem(ALL_LEVELS_KEY, String(enabled)); }

import { Game } from '../game/model';
import type { SurvivalScene } from '../game/config';
import type { GameSpeed } from '../game/clock';
export interface SurvivalSave { game: ReturnType<Game['snapshot']>; speed: GameSpeed }
export const survivalKey = (scene: SurvivalScene, mode: Game['scenario']) => mode === 'endless' ? `pvz-web:survival:v1:${scene}` : `pvz-web:survival:v1:${mode}:${scene}`;
export function saveSurvival(game: Game, speed: GameSpeed) {
  localStorage.setItem(survivalKey(game.survivalScene, game.scenario), JSON.stringify({ game: game.snapshot(), speed }));
}
export function loadSurvival(scene: SurvivalScene, mode: Game['scenario'] = 'endless'): SurvivalSave | null {
  const record = localStorage.getItem(survivalKey(scene, mode));
  return record === null ? null : JSON.parse(record) as SurvivalSave;
}
export function clearSurvival(scene: SurvivalScene, mode: Game['scenario'] = 'endless') { localStorage.removeItem(survivalKey(scene, mode)); }
