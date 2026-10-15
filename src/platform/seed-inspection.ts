// Touch/pen: hold to inspect without also selecting; movement leaves scrolling intact.
export function bindSeedInspection(button: HTMLButtonElement, inspect: () => void, select: () => void) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let held = false;
  let origin: { x: number; y: number } | null = null;
  const stop = () => { clearTimeout(timer); timer = undefined; origin = null; };
  button.addEventListener('pointerdown', event => {
    stop(); held = false;
    if (event.pointerType === 'mouse') return;
    origin = { x: event.clientX, y: event.clientY };
    timer = setTimeout(() => { held = true; inspect(); }, 420);
  });
  button.addEventListener('pointermove', event => {
    if (origin && Math.hypot(event.clientX-origin.x,event.clientY-origin.y)>10) stop();
  });
  button.addEventListener('pointerup', stop);
  button.addEventListener('pointercancel', stop);
  button.addEventListener('pointerleave', stop);
  button.addEventListener('contextmenu', event => { event.preventDefault(); });
  button.addEventListener('click', event => {
    stop();
    if (held && event.detail !== 0) { held = false; return; }
    inspect(); select();
  });
  button.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') inspect(); });
  button.addEventListener('focus', inspect);
}
