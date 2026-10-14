import { TICK_MS } from './config';
import type { Game } from './model';
export type GameSpeed = 1 | 2 | 4;

// Speed changes wall time, never the 10 ms simulation step or its ordering.
export class GameClock {
  speed: GameSpeed = 1;
  private remainder = 0;
  reset() { this.remainder = 0; }
  advance(game: Game, elapsedMs: number, beforeStep: () => void) {
    if (game.phase !== 'playing') return 0;
    this.remainder += elapsedMs * this.speed;
    let steps = 0;
    while (this.remainder >= TICK_MS && game.phase === 'playing') {
      beforeStep(); game.step(); this.remainder -= TICK_MS; steps++;
    }
    if (game.phase !== 'playing') this.remainder = 0;
    return steps;
  }
  get alpha() { return this.remainder / TICK_MS; }
}
