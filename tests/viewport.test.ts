import test from 'node:test';
import assert from 'node:assert/strict';
import { battleViewport, viewportToWorld, worldToViewport } from '../src/rendering/viewport';
import { Game } from '../src/game/model';
import { BOARD } from '../src/game/config';

for (const [width,height] of [[800,600],[1920,980],[844,332],[2560,980],[390,292.5]]) {
  test(`camera ${width}×${height} preserves cells and pointer targeting`, () => {
    const view = battleViewport(width,height);
    assert.ok(view.x >= 0 && view.y >= 0);
    assert.ok(view.x + 800*view.scale <= width + 1e-8);
    assert.ok(view.y + 600*view.scale <= height + 1e-8);
    for (const level of [1,21,41] as const) {
      const game = new Game(level,1);
      for (const row of game.config.rows) for (let col=0;col<9;col++) {
        const x=BOARD.left+col*80+40,y=game.rowY(row,x)-30;
        const screen=worldToViewport(view,x,y), point=viewportToWorld(view,screen.x,screen.y);
        assert.ok(Math.abs(point.x-x)<1e-8 && Math.abs(point.y-y)<1e-8);
        assert.equal(Math.floor((point.x-BOARD.left)/80),col);
        assert.equal(game.rowAt(point.y,point.x),row);
      }
    }
    const a=worldToViewport(view,0,0),b=worldToViewport(view,80,80);
    assert.ok(Math.abs((b.x-a.x)-(b.y-a.y))<1e-8);
  });
}
test('wide scenery does not create extra planting columns', () => {
  const view=battleViewport(1920,900);
  const outside=viewportToWorld(view,1910,450);
  const game=new Game(1,1);
  assert.ok(outside.x>800);
  assert.equal(game.canPlant('peashooter',Math.floor((outside.x-BOARD.left)/80),2),false);
});

for (const [width, height] of [[1920, 936], [844, 306], [2560, 936], [390, 292.5]]) {
  test(`fill ${width}×${height} fills ground and keeps all scene targets aligned`, () => {
    const view = battleViewport(width, height, 'fill');
    const origin = worldToViewport(view, 0, 0), edge = worldToViewport(view, 800, 600);
    assert.deepEqual(origin, { x: 0, y: 0 });
    assert.ok(Math.abs(edge.x - width) < 1e-8 && Math.abs(edge.y - height) < 1e-8);
    // A circular sprite remains circular; the distances between cells can expand.
    assert.ok(Math.abs(view.scaleX * view.artScaleX - view.scaleY * view.artScaleY) < 1e-8);
    for (const level of [1, 9, 19, 29, 39, 49] as const) {
      const game = new Game(level, 1);
      for (const row of game.config.rows) for (let column = 0; column < 9; column++) {
        const x = BOARD.left + column * 80 + 40, y = game.rowY(row, x) - 30;
        const screen = worldToViewport(view, x, y), pointer = viewportToWorld(view, screen.x, screen.y);
        assert.equal(Math.floor((pointer.x - BOARD.left) / 80), column);
        assert.equal(game.rowAt(pointer.y, pointer.x), row);
        // Switching back to contain does not change the logical position.
        const contain = battleViewport(width, height);
        const restored = worldToViewport(contain, pointer.x, pointer.y);
        const original = worldToViewport(contain, x, y);
        assert.ok(Math.abs(restored.x - original.x) < 1e-8 && Math.abs(restored.y - original.y) < 1e-8);
      }
    }
  });
}
