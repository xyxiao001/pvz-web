import type {BattleLevel} from '../battle-level';
import {PIRATE_LEVELS} from './pirate';
const plants:BattleLevel['plants']=[...PIRATE_LEVELS.pirate1.plants,{id:61,kind:'splitpea'},{id:62,kind:'chilibean'},{id:35,kind:'wintermelon'},{id:58,kind:'peapod'},{id:29,kind:'lightningreed'}];
const rewards:BattleLevel['firstReward'][]=[{image:'',plant:'splitpea',label:'裂荚射手'},{image:'spine_cowboy',animation:'Pinata',armature:'Upgrades',label:'西部皮纳塔'},{image:'dangerroom_cowboy',animation:'dangerroom_cowboy',label:'西部无尽挑战'},{image:'',plant:'chilibean',label:'巴豆'},{image:'',label:''},{image:'',plant:'peapod',label:'豌豆荚'},{image:'note-cowboy',label:'僵尸的信'},{image:'worldkey',animation:'worldkey',label:'世界钥匙'},{image:'',plant:'lightningreed',label:'闪电芦苇'},{image:'',label:''}];
export const COWBOY_LEVELS:Readonly<Record<string,BattleLevel>>=Object.fromEntries([1,2,3,4,5,6,7,8,9,10].map(day=>{
 const level:BattleLevel={id:`cowboy${day}`,world:'cowboy',worldName:'狂野西部',day,source:`cowboy/cowboy${day}.source.json`,assets:'campaign',bundles:['pirate','cowboy'],
 presentation:{lawn:'cowboy/lawn.webp',loading:'cowboy/lawn.webp',music:[4,6,8,9].includes(day)?'cowboy/minigame.mp3':'cowboy/music.mp3'},plants,actors:plants.map(p=>p.kind),mode:[4,8].includes(day)?'conveyor':day===9?'preset':'seedbank',night:false,firstReward:rewards[day-1],narrative:({1:'COWBOY_INTRO_FIRSTLEVEL',6:'COWBOY_CHALLENGE_LASTSTAND_A',7:'COWBOY_INTRO_LEVEL7',8:'COWBOY_INTRO_GARGANTUAR',9:'COWBOY_CHALLENGE_PRESET_A'} as Record<number,string>)[day]??null,...(day===3?{outro:'COWBOY_OUTRO_DANGER_ROOM_KEY'}:day===8?{outro:'COWBOY_OUTRO_GARGANTUAR'}:{})};
 return [level.id,level];
}));
