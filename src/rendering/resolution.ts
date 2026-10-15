// Sample transformed parts at display resolution, even when their source art is 2×.
// Bound the framebuffer to one 4K screen; DPR alone would allocate 8K on a 4K/2× display.
export function renderResolution(width: number, height: number, pixelRatio: number) {
  return Math.min(2, pixelRatio, Math.sqrt(3840 * 2160 / (width * height)));
}
