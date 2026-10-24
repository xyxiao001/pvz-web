interface Point { clientX: number; clientY: number }
interface MapDrag {
  start(point: Point): void;
  move(point: Point): void;
  end(point: Point): void;
  cancel(): void;
}

// Touch has its own event stream; it does not depend on synthesized Pointer Events.
export function bindMapDrag(canvas: HTMLCanvasElement, drag: MapDrag) {
  let active: { kind: 'touch' | 'pointer'; id: number } | null = null;
  canvas.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch' || active) return;
    event.preventDefault();
    active = { kind: 'pointer', id: event.pointerId };
    canvas.setPointerCapture(event.pointerId);
    drag.start(event);
  });
  canvas.addEventListener('pointermove', event => {
    if (event.pointerType !== 'touch' && active?.kind === 'pointer' && active.id === event.pointerId) drag.move(event);
  });
  canvas.addEventListener('pointerup', event => {
    if (event.pointerType === 'touch' || active?.kind !== 'pointer' || active.id !== event.pointerId) return;
    active = null;
    drag.end(event);
  });
  canvas.addEventListener('pointercancel', event => {
    if (event.pointerType === 'touch' || active?.kind !== 'pointer' || active.id !== event.pointerId) return;
    active = null;
    drag.cancel();
  });
  canvas.addEventListener('touchstart', event => {
    event.preventDefault();
    if (active) return;
    const touch = event.changedTouches[0];
    active = { kind: 'touch', id: touch.identifier };
    drag.start(touch);
  }, { passive: false });
  canvas.addEventListener('touchmove', event => {
    event.preventDefault();
    if (active?.kind !== 'touch') return;
    const touch = Array.from(event.changedTouches).find(touch => touch.identifier === active!.id);
    if (touch) drag.move(touch);
  }, { passive: false });
  canvas.addEventListener('touchend', event => {
    event.preventDefault();
    if (active?.kind !== 'touch') return;
    const touch = Array.from(event.changedTouches).find(touch => touch.identifier === active!.id);
    if (!touch) return;
    active = null;
    drag.end(touch);
  }, { passive: false });
  canvas.addEventListener('touchcancel', event => {
    if (active?.kind !== 'touch' || !Array.from(event.changedTouches).some(touch => touch.identifier === active!.id)) return;
    active = null;
    drag.cancel();
  });
}
