import type { PlantKind } from './level';

export interface BattleLevel {
  id: string;
  world: string;
  worldName: string;
  day: number;
  source: string;
  assets: 'intro'|'campaign';
  presentation:{lawn:string;loading:string;music:string};
  plants: { id: number; kind: PlantKind }[];
  firstReward: { image: string; label: string; plant?:PlantKind };
  mode:'seedbank'|'conveyor'|'powerups'|'match'|'preset';
  night:boolean;
  actors:PlantKind[];
  narrative:string|null;
  outro?:string;
}
