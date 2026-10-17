import type { PlantKind } from './level';

export interface BattleLevel {
  id: string;
  world: string;
  worldName: string;
  day: number;
  source: string;
  plants: { id: number; kind: PlantKind }[];
  firstReward: { image: string; label: string; plant?:PlantKind };
  mode:'seedbank'|'conveyor'|'powerups';
  night:boolean;
  actors:PlantKind[];
  narrative:string|null;
}
// Only migrated battles are registered. Map unlocks do not make other levels playable.
export const BATTLE_LEVELS: Readonly<Record<string, BattleLevel>> = {
  egypt1: {
    mode:'seedbank',night:false,actors:['peashooter','sunflower','wallnut','potatomine'],narrative:'EGYPT_INTRO_FIRSTLEVEL',
    id: 'egypt1', world: 'egypt', worldName: '神秘埃及', day: 1,
    source: 'levels/egypt1.source.json',
    plants: [{ id: 0, kind: 'peashooter' }, { id: 1, kind: 'sunflower' }, { id: 2, kind: 'wallnut' }, { id: 3, kind: 'potatomine' }],
    firstReward: { image: 'map', label: '世界地图' },
  },
  ...Object.fromEntries([2,3,4,5,6].map(day=>{
    const plants=[{id:0,kind:'peashooter'},{id:1,kind:'sunflower'},{id:2,kind:'wallnut'},{id:3,kind:'potatomine'},{id:4,kind:'cabbagepult'},{id:5,kind:'bloomerang'},{id:6,kind:'iceburg'}] as {id:number;kind:PlantKind}[];
    const rewards:Record<number,BattleLevel['firstReward']>={2:{image:'',plant:'cabbagepult',label:'卷心菜投手'},3:{image:'',plant:'bloomerang',label:'回旋镖射手'},4:{image:'powerupgadget',label:'战术道具'},5:{image:'',plant:'iceburg',label:'冰冻生菜'},6:{image:'spine_egypt',label:'埃及皮纳塔'}};
    const level:BattleLevel={id:`egypt${day}`,world:'egypt',worldName:'神秘埃及',day,source:`campaign/egypt${day}.source.json`,plants,firstReward:rewards[day],
      mode:day===4?'conveyor':day===5?'powerups':'seedbank',night:day===4||day===5,actors:plants.map(p=>p.kind),
      narrative:day===4?'EGYPT_CHALLENGE_CONVEYOR_INTRO':day===5?'POWERUPS_TUTORIAL_INITIAL':null};
    return [level.id,level];
  })),
};

export function availablePlants(level: BattleLevel, owned: ReadonlySet<number>) {
  return level.plants.filter(plant => owned.has(plant.id)).map(plant => plant.kind);
}
