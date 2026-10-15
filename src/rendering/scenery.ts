// Select once when entering a board. Both tiers use the same simulation coordinates.
export function sceneryPlan(environment: string, boss: boolean, pixelsPerWorldUnit: number) {
  const high = pixelsPerWorldUnit > 2;
  const file = (name: string, standard: string) => high ? `hd4/scenery/${name}.webp` : standard;
  const files: Record<string, string> = environment === 'day'
    ? { yard: file('day', 'yard.webp'), lawn: file('lawn', 'lawn.webp') }
    : { [environment]: file(environment, `original/${environment}.webp`) };
  if (boss) files.bossBackground = file('boss', 'boss/background.webp');
  return { files, sourceX: high ? 0 : 220 };
}
