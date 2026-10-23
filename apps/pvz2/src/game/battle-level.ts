import type { PlantKind } from './level';

export interface BattleLevel {
  id: string;
  endless?:import("./endless").EndlessWorld;
  world: string;
  worldName: string;
  day: number;
  source: string;
  assets: 'intro'|'campaign';
  bundles?:string[];
  presentation:{lawn:string;loading:string;music:string};
  plants: { id: number; kind: PlantKind }[];
  firstReward: { image: string; label: string; plant?:PlantKind; animation?:string; armature?:string };
  mode:'beghouled'|'airraid'|'seedbank'|'conveyor'|'powerups'|'match'|'preset'|'cannon';
  night:boolean;
  actors:PlantKind[];
  narrative:string|null;
  outro?:string;
}
