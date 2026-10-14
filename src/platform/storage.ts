import type { LevelId } from '../game/config';

// Separate namespace; never touches Kingdom Rush progress.
const KEY = 'pvz-web:adventure:v1';
export function completedLevel() {
  const record = localStorage.getItem(KEY);
  return record === null ? 0 : Number(record.split('-')[1]);
}
export function completeLevel(level: LevelId) {
  localStorage.setItem(KEY, `1-${Math.max(level, completedLevel())}-complete`);
}

import { Game } from '../game/model';
import type { SurvivalScene } from '../game/config';
import type { GameSpeed } from '../game/clock';
export interface SurvivalSave { game: ReturnType<Game['snapshot']>; speed: GameSpeed }
const survivalKey = (scene: SurvivalScene) => `pvz-web:survival:v1:${scene}`;
export function saveSurvival(game: Game, speed: GameSpeed) {
  localStorage.setItem(survivalKey(game.survivalScene), JSON.stringify({ game: game.snapshot(), speed }));
}
export function loadSurvival(scene: SurvivalScene): SurvivalSave | null {
  const record = localStorage.getItem(survivalKey(scene));
  return record === null ? null : JSON.parse(record) as SurvivalSave;
}
export function clearSurvival(scene: SurvivalScene) { localStorage.removeItem(survivalKey(scene)); }
