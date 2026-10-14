import { Game } from '../../src/game/model';
export function denseGame(scene: 'day' | 'pool' | 'roof') {
  const game = new Game(9, 123456, 'endless', scene);
  game.seeds = ['sunflower', 'melonpult', 'wallnut', 'pumpkin', 'flowerpot', 'lilypad']; game.start();
  for (const row of game.config.rows) for (let column = 0; column < 6; column++) {
    game.plants.push({ id: 1000+row*20+column*2, kind:'wallnut', row, column, health:4000, actionIn:100, born:0, shotAt:0 });
    game.plants.push({ id: 1001+row*20+column*2, kind:'pumpkin', row, column, health:4000, actionIn:100, born:0, shotAt:0 });
  }
  for (let i=0;i<100;i++) game['spawnZombie'](i%3===0?'bucket':'normal', i%game.config.rows.length, 450+i%10*5, 0);
  return game;
}
