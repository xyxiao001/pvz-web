import type {BattleLevel} from '../battle-level';
const plants:BattleLevel['plants']=[{id:0,kind:'peashooter'},{id:1,kind:'sunflower'},{id:2,kind:'wallnut'},{id:3,kind:'potatomine'},{id:4,kind:'cabbagepult'},{id:5,kind:'bloomerang'},{id:6,kind:'iceburg'},{id:12,kind:'gravebuster'},{id:25,kind:'twinsunflower'},{id:7,kind:'bonkchoy'},{id:8,kind:'repeater'},{id:30,kind:'kernelpult'},{id:59,kind:'snapdragon'}];
const rewards:BattleLevel['firstReward'][]=[{image:'',plant:'kernelpult',label:'玉米投手'},{image:'',label:''},{image:'',plant:'snapdragon',label:'火龙草'},{image:'dangerroom_pirate',animation:'dangerroom_pirate',label:'海盗无尽挑战'},{image:'spine_pirate',animation:'Pinata',armature:'Upgrades',label:'海盗皮纳塔'}];
export const PIRATE_LEVELS:Readonly<Record<string,BattleLevel>>=Object.fromEntries([1,2,3,4,5].map(day=>{
 const level:BattleLevel={id:`pirate${day}`,world:'pirate',worldName:'海盗港湾',day,source:`pirate/pirate${day}.source.json`,assets:'campaign',bundle:'pirate',
  presentation:{lawn:'pirate/lawn.webp',loading:'pirate/lawn.webp',music:day>=3&&day!==4?'pirate/minigame.mp3':'pirate/music.mp3'},plants,actors:plants.map(p=>p.kind),
  mode:day===3?'cannon':day===5?'preset':'seedbank',night:false,firstReward:rewards[day-1],narrative:day===1?'PIRATE_INTRO_FIRSTLEVEL':day===5?'PIRATE_CHALLENGE_PRESET_A':null,...(day===4?{outro:'PIRATE_OUTRO_DANGER_ROOM_KEY'}:{})};
 return [level.id,level];
}));
