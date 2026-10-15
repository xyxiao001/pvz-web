import { BOARD } from '../game/config';
type Point = { x: number; y: number };
type Controls = {
  point(event: PointerEvent): Point;
  enabled(): boolean;
  action(): string | null;
  collecting(x: number, y: number): boolean;
  preview(point: Point | null): void;
  operate(x: number, y: number): void;
};
// Mouse retains click-to-place. Touch/pen can aim before release; pickups stay immediate.
export function bindBattlePointer(canvas: HTMLCanvasElement, controls: Controls) {
  let aiming: {id:number; action:string} | null = null;
  canvas.addEventListener('pointermove', event => {
    if (aiming === null || aiming.id === event.pointerId) controls.preview(controls.point(event));
  });
  canvas.addEventListener('pointerleave', () => { if (aiming === null) controls.preview(null); });
  canvas.addEventListener('pointerdown', event => {
    if (!controls.enabled() || event.button !== 0 || aiming !== null) return;
    const {x,y} = controls.point(event), action=controls.action();
    controls.preview({x,y});
    if (event.pointerType !== 'mouse' && action !== null && !controls.collecting(x,y)) {
      aiming={id:event.pointerId,action};canvas.setPointerCapture(event.pointerId);
    } else controls.operate(x,y);
  });
  canvas.addEventListener('pointerup', event => {
    if (aiming?.id !== event.pointerId) return;
    const {x,y}=controls.point(event), originalAction=aiming.action;
    aiming=null;canvas.releasePointerCapture(event.pointerId);
    if (controls.enabled() && originalAction===controls.action() && x>=0 && x<BOARD.width && y>=0 && y<BOARD.height) controls.operate(x,y);
    controls.preview(null);
  });
  const cancel = (event: PointerEvent) => {
    if (aiming?.id === event.pointerId) { aiming=null;controls.preview(null); }
  };
  canvas.addEventListener('pointercancel',cancel);
  canvas.addEventListener('lostpointercapture',cancel);
}
