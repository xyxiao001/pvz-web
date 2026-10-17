import type { PlantKind } from '../level';
import type { BattleLevel } from '../battle-level';

// Only migrated battles are registered. Map unlocks do not make other levels playable.
export const EGYPT_LEVELS: Readonly<Record<string, BattleLevel>> = {
  egypt1: {
    mode:'seedbank',night:false,actors:['peashooter','sunflower','wallnut','potatomine'],narrative:'EGYPT_INTRO_FIRSTLEVEL',
    id: 'egypt1', world: 'egypt', worldName: '神秘埃及', day: 1,
    source: 'levels/egypt1.source.json',assets:'intro',presentation:{lawn:'egypt/lawn.webp',loading:'egypt/preview.webp',music:'egypt/music.mp3'},
    plants: [{ id: 0, kind: 'peashooter' }, { id: 1, kind: 'sunflower' }, { id: 2, kind: 'wallnut' }, { id: 3, kind: 'potatomine' }],
    firstReward: { image: 'map', label: '世界地图' },
  },
  ...Object.fromEntries([2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,35].map(day=>{
    const plants=[{id:0,kind:'peashooter'},{id:1,kind:'sunflower'},{id:2,kind:'wallnut'},{id:3,kind:'potatomine'},{id:4,kind:'cabbagepult'},{id:5,kind:'bloomerang'},{id:6,kind:'iceburg'},{id:12,kind:'gravebuster'},{id:25,kind:'twinsunflower'},{id:7,kind:'bonkchoy'},{id:8,kind:'repeater'}] as {id:number;kind:PlantKind}[];
    const rewards:Record<number,BattleLevel['firstReward']>={2:{image:'',plant:'cabbagepult',label:'卷心菜投手'},3:{image:'',plant:'bloomerang',label:'回旋镖射手'},4:{image:'powerupgadget',label:'战术道具'},5:{image:'',plant:'iceburg',label:'冰冻生菜'},6:{image:'spine_egypt',label:'埃及皮纳塔'},7:{image:'note_egypt',label:'僵尸的便条'},8:{image:'worldkey',label:'世界钥匙'},9:{image:'',plant:'gravebuster',label:'噬碑藤'},10:{image:'CoinBag',label:'金币袋'},11:{image:'spine_egypt',label:'埃及皮纳塔'},12:{image:'dangerroom_egypt',label:'埃及无尽挑战'},13:{image:'',plant:'bonkchoy',label:'菜问'},14:{image:'CoinBag',label:'金币袋'},15:{image:'spine_egypt',label:'埃及皮纳塔'},16:{image:'CoinBag',label:'金币袋'},17:{image:'PlantfoodSlot',label:'能量豆栏位'},18:{image:'CoinBag',label:'金币袋'},19:{image:'',plant:'repeater',label:'双发射手'},20:{image:'CoinBag',label:'金币袋'},21:{image:'StartingSun',label:'初始阳光提升'},22:{image:'spine_egypt',label:'埃及皮纳塔'},23:{image:'dangerroom_egypt_minigame',label:'骆驼无尽挑战'},24:{image:'',plant:'twinsunflower',label:'双胞向日葵'},25:{image:'worldtrophy_egypt',label:'埃及世界奖杯'},26:{image:'',label:''},27:{image:'spine_egypt',label:'埃及皮纳塔'},28:{image:'',label:''},29:{image:'',label:''},30:{image:'spine_egypt',label:'埃及皮纳塔'},31:{image:'dangerroom_egypt2',label:'埃及进阶无尽挑战'},32:{image:'',label:''},33:{image:'',label:''},34:{image:'spine_egypt',label:'埃及皮纳塔'},35:{image:'',label:''}};
    const night=[4,5,7,8,16,18,23,24,25,29,33,35].includes(day);
    const level:BattleLevel={assets:'campaign',presentation:{lawn:night?'campaign/night.webp':'egypt/lawn.webp',loading:'egypt/preview.webp',music:night||[11,15,21,28,34].includes(day)?'campaign/minigame.mp3':'egypt/music.mp3'},id:`egypt${day}`,world:'egypt',worldName:'神秘埃及',day,source:`campaign/egypt${day}.source.json`,plants,firstReward:rewards[day],
      mode:[4,8,25,29,35].includes(day)?'conveyor':day===5?'powerups':[7,16,23].includes(day)?'match':[11,21,28,34].includes(day)?'preset':'seedbank',night,actors:plants.map(p=>p.kind),
      narrative:day===25?'EGYPT_INTRO_ZOMBOSS':day===26?'EGYPT_26_INTRO':day===31?'EGYPT_31_INTRO':day===35?'EGYPT_35_INTRO':day===18?'EGYPT_CHALLENGE_LASTSTAND_A':day===4?'EGYPT_CHALLENGE_CONVEYOR_INTRO':day===5?'POWERUPS_TUTORIAL_INITIAL':day===8?'EGYPT_INTRO_GARGANTUAR':day===11?'EGYPT_CHALLENGE_PRESET_A':day===15?'EGYPT_CHALLENGE_PROTECTPLANTS_A':null,...(day===25?{outro:'EGYPT_OUTRO_ZOMBOSS'}:day===35?{outro:'EGYPT_35_OUTRO'}:day===8?{outro:'EGYPT_OUTRO_GARGANTUAR'}:day===12?{outro:'EGYPT_OUTRO_DANGER_ROOM_KEY'}:{})};
    return [level.id,level];
  })),
};
