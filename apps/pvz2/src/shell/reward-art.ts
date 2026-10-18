import type { Catalog, Draw, Island, ProgressionArt } from './types';

export function rewardPlantArt(island: Island, progression: ProgressionArt, catalog: Catalog, report: (error: Error) => void): Draw[] {
  const draws = progression.plants[island.plant];
  if (draws) return draws;
  report(new Error(`缺少植物奖励展示资源：plant=${island.plant}, node=${island.node}`));
  const card = catalog.plantCards[island.plant];
  return catalog.nodes.plantCard.map(draw => ({ ...draw, x: 0, y: -30, sx: .4, sy: .4,
    animation: draw.armature === 'plants' ? card.animation : card.background }));
}
