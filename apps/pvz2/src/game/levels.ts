import type { PlantKind } from './level';

export interface BattleLevel {
  id: string;
  world: string;
  worldName: string;
  day: number;
  source: string;
  plants: { id: number; kind: PlantKind }[];
  firstReward: { image: string; label: string; plant?:PlantKind };
  mode:'seedbank'|'conveyor'|'powerups'|'match'|'preset';
  night:boolean;
  actors:PlantKind[];
  narrative:string|null;
  outro?:string;
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
  ...Object.fromEntries([2,3,4,5,6,7,8,9,10,11,12,13,14,15,16].map(day=>{
    const plants=[{id:0,kind:'peashooter'},{id:1,kind:'sunflower'},{id:2,kind:'wallnut'},{id:3,kind:'potatomine'},{id:4,kind:'cabbagepult'},{id:5,kind:'bloomerang'},{id:6,kind:'iceburg'},{id:12,kind:'gravebuster'},{id:25,kind:'twinsunflower'},{id:7,kind:'bonkchoy'}] as {id:number;kind:PlantKind}[];
    const rewards:Record<number,BattleLevel['firstReward']>={2:{image:'',plant:'cabbagepult',label:'卷心菜投手'},3:{image:'',plant:'bloomerang',label:'回旋镖射手'},4:{image:'powerupgadget',label:'战术道具'},5:{image:'',plant:'iceburg',label:'冰冻生菜'},6:{image:'spine_egypt',label:'埃及皮纳塔'},7:{image:'note_egypt',label:'僵尸的便条'},8:{image:'worldkey',label:'世界钥匙'},9:{image:'',plant:'gravebuster',label:'噬碑藤'},10:{image:'CoinBag',label:'金币袋'},11:{image:'spine_egypt',label:'埃及皮纳塔'},12:{image:'dangerroom_egypt',label:'埃及无尽挑战'},13:{image:'',plant:'bonkchoy',label:'菜问'},14:{image:'CoinBag',label:'金币袋'},15:{image:'spine_egypt',label:'埃及皮纳塔'},16:{image:'CoinBag',label:'金币袋'}};
    const level:BattleLevel={id:`egypt${day}`,world:'egypt',worldName:'神秘埃及',day,source:`campaign/egypt${day}.source.json`,plants,firstReward:rewards[day],
      mode:day===4||day===8?'conveyor':day===5?'powerups':day===7||day===16?'match':day===11?'preset':'seedbank',night:[4,5,7,8,16].includes(day),actors:plants.map(p=>p.kind),
      narrative:day===4?'EGYPT_CHALLENGE_CONVEYOR_INTRO':day===5?'POWERUPS_TUTORIAL_INITIAL':day===8?'EGYPT_INTRO_GARGANTUAR':day===11?'EGYPT_CHALLENGE_PRESET_A':day===15?'EGYPT_CHALLENGE_PROTECTPLANTS_A':null,...(day===8?{outro:'EGYPT_OUTRO_GARGANTUAR'}:day===12?{outro:'EGYPT_OUTRO_DANGER_ROOM_KEY'}:{})};
    return [level.id,level];
  })),
};

export function availablePlants(level: BattleLevel, owned: ReadonlySet<number>) {
  return level.plants.filter(plant => owned.has(plant.id)).map(plant => plant.kind);
}
