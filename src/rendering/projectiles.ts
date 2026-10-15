import firePea from './fire-pea.json';

// Source uses 50–80 fps. Stable visual variation avoids consuming gameplay RNG.
export function firePeaFrame(ticks: number, id: number) {
  const fps = 50 + (Math.imul(id, 2654435761) >>> 0) % 31;
  return Math.floor(ticks * fps / 100) % firePea.frames;
}
