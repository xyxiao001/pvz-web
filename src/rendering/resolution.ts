// The current art is 2×. More framebuffer pixels add GPU work without source detail.
export function renderResolution(displayWidth: number, pixelRatio: number) {
  return Math.min(2, displayWidth / 800 * pixelRatio);
}
