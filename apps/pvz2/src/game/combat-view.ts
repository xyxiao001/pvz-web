import {BOARD} from './level';

// Fit all nine columns and five rows, keeping the street spawn area outside combat view.
export const COMBAT_VIEW = {x: -48, y: 60, zoom: 1.18};
export const combatView = (boss: boolean) => boss ? {x: 0, y: 0, zoom: 1} : COMBAT_VIEW;
export function inCombatView(x: number, boss: boolean) {
  const view = combatView(boss);
  return x >= view.x && x <= view.x + BOARD.width / view.zoom;
}
