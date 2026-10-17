import type {BattleLevel} from '../battle-level';
import {PIRATE_LEVELS} from './pirate';
const plants:BattleLevel['plants']=[...PIRATE_LEVELS.pirate1.plants,{id:61,kind:'splitpea'},{id:62,kind:'chilibean'}];
const rewards:BattleLevel['firstReward'][]=[{image:'',plant:'splitpea',label:'裂荚射手'},{image:'spine_cowboy',animation:'Pinata',armature:'Upgrades',label:'西部皮纳塔'},{image:'dangerroom_cowboy',animation:'dangerroom_cowboy',label:'西部无尽挑战'},{image:'',plant:'chilibean',label:'巴豆'},{image:'',label:''}];
export const COWBOY_LEVELS:Readonly<Record<string,BattleLevel>>=Object.fromEntries([1,2,3,4,5].map(day=>{
 const level:BattleLevel={id:`cowboy${day}`,world:'cowboy',worldName:'狂野西部',day,source:`cowboy/cowboy${day}.source.json`,assets:'campaign',bundles:['pirate','cowboy'],
 presentation:{lawn:'cowboy/lawn.webp',loading:'cowboy/lawn.webp',music:day===4?'cowboy/minigame.mp3':'cowboy/music.mp3'},plants,actors:plants.map(p=>p.kind),mode:day===4?'conveyor':'seedbank',night:false,firstReward:rewards[day-1],narrative:day===1?'COWBOY_INTRO_FIRSTLEVEL':null,...(day===3?{outro:'COWBOY_OUTRO_DANGER_ROOM_KEY'}:{})};
 return [level.id,level];
}));
