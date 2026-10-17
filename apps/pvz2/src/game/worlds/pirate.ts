import type {BattleLevel} from '../battle-level';
const plants:BattleLevel['plants']=[{id:0,kind:'peashooter'},{id:1,kind:'sunflower'},{id:2,kind:'wallnut'},{id:3,kind:'potatomine'},{id:4,kind:'cabbagepult'},{id:5,kind:'bloomerang'},{id:6,kind:'iceburg'},{id:12,kind:'gravebuster'},{id:25,kind:'twinsunflower'},{id:7,kind:'bonkchoy'},{id:8,kind:'repeater'},{id:30,kind:'kernelpult'},{id:59,kind:'snapdragon'},{id:37,kind:'spikeweed'},{id:32,kind:'springbean'}];
const rewards:BattleLevel['firstReward'][]=[{image:'',plant:'kernelpult',label:'玉米投手'},{image:'',label:''},{image:'',plant:'snapdragon',label:'火龙草'},{image:'dangerroom_pirate',animation:'dangerroom_pirate',label:'海盗无尽挑战'},{image:'spine_pirate',animation:'Pinata',armature:'Upgrades',label:'海盗皮纳塔'},{image:'',plant:'spikeweed',label:'地刺'},{image:'note-pirate',label:'僵尸的纸条'},{image:'worldkey',animation:'worldkey',label:'世界钥匙'},{image:'',plant:'springbean',label:'弹簧豆'},{image:'',label:''}];
export const PIRATE_LEVELS:Readonly<Record<string,BattleLevel>>=Object.fromEntries([1,2,3,4,5,6,7,8,9,10].map(day=>{
 const level:BattleLevel={id:`pirate${day}`,world:'pirate',worldName:'海盗港湾',day,source:`pirate/pirate${day}.source.json`,assets:'campaign',bundle:'pirate',
  presentation:{lawn:'pirate/lawn.webp',loading:'pirate/lawn.webp',music:[3,5,8].includes(day)?'pirate/minigame.mp3':'pirate/music.mp3'},plants,actors:plants.map(p=>p.kind),
  mode:day===3?'cannon':day===5?'preset':day===8?'conveyor':'seedbank',night:false,firstReward:rewards[day-1],narrative:day===1?'PIRATE_INTRO_FIRSTLEVEL':day===5?'PIRATE_CHALLENGE_PRESET_A':day===8?'PIRATE_INTRO_GARGANTUAR':null,...(day===4?{outro:'PIRATE_OUTRO_DANGER_ROOM_KEY'}:{})};
 return [level.id,level];
}));
