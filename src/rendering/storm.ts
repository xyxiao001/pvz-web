// Portable Challenge::DrawStormNight / DrawStormFlash (2764, 2834).
// Rendering noise is independent of the gameplay RNG, stable for six simulation ticks.
export function stormOpacity(style: 1 | 2 | 3, remaining: number, ticks: number) {
  let time: number, amount: number;
  if (style === 1 && remaining < 300) {
    time = remaining > 150 ? remaining - 150 : remaining;
    amount = remaining > 150 ? 255 : 92;
  } else if (style === 2 && remaining < 300) {
    time = Math.floor(remaining / 2); amount = 255;
  } else if (style === 3 && remaining < 150) {
    time = remaining; amount = 255;
  } else return { dark: 1, white: 0 };
  const frame = Math.floor(ticks / 6);
  const noise = ((Math.imul(frame ^ 0x45d9f3b, 0x45d9f3b) >>> 16) & 63) - 32;
  return {
    dark: Math.max(0, Math.min(255, Math.round(255 - amount * time / 150) + noise)) / 255,
    white: Math.round(amount * Math.max(0, Math.min(1, (time - 75) / 75))) / 255,
  };
}
