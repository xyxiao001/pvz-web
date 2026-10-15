import { BOARD } from '../game/config';

export type BattleDisplayMode = 'contain' | 'fill';

// Simulation stays in 800×600 coordinates. Fill stretches the ground, not actor art.
export function battleViewport(width: number, height: number, mode: BattleDisplayMode = 'contain') {
  const scale = Math.min(width / BOARD.width, height / BOARD.height);
  const scaleX = mode === 'fill' ? width / BOARD.width : scale;
  const scaleY = mode === 'fill' ? height / BOARD.height : scale;
  return { width, height, scale, scaleX, scaleY,
    artScaleX: scale / scaleX, artScaleY: scale / scaleY,
    x: (width - BOARD.width * scaleX) / 2, y: (height - BOARD.height * scaleY) / 2 };
}
export type BattleViewport = ReturnType<typeof battleViewport>;
export function viewportToWorld(view: BattleViewport, x: number, y: number) {
  return { x: (x - view.x) / view.scaleX, y: (y - view.y) / view.scaleY };
}
export function worldToViewport(view: BattleViewport, x: number, y: number) {
  return { x: x * view.scaleX + view.x, y: y * view.scaleY + view.y };
}
