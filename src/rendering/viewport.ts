import { BOARD } from '../game/config';

// Expand the camera, never the cells: one uniform scale for art and pointer input.
export function battleViewport(width: number, height: number) {
  const scale = Math.min(width / BOARD.width, height / BOARD.height);
  return { width, height, scale, x: (width - BOARD.width * scale) / 2, y: (height - BOARD.height * scale) / 2 };
}
export type BattleViewport = ReturnType<typeof battleViewport>;
export function viewportToWorld(view: BattleViewport, x: number, y: number) {
  return { x: (x - view.x) / view.scale, y: (y - view.y) / view.scale };
}
export function worldToViewport(view: BattleViewport, x: number, y: number) {
  return { x: x * view.scale + view.x, y: y * view.scale + view.y };
}
