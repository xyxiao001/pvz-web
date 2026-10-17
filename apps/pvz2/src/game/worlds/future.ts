import type {BattleLevel} from '../battle-level';
import {COWBOY_LEVELS} from './cowboy';
const plants:BattleLevel['plants']=[...COWBOY_LEVELS.cowboy1.plants,{id:89,kind:'laser_bean'},{id:36,kind:'blover'}];
const rewards:BattleLevel['firstReward'][]=[{image:'',plant:'laser_bean',label:'激光豆'},{image:'',label:''},{image:'',plant:'blover',label:'三叶草'},{image:'dangerroom_future',animation:'dangerroom_future',label:'未来无尽挑战'},{image:'spine_future',animation:'Pinata',armature:'Upgrades',label:'未来皮纳塔'}];
export const FUTURE_LEVELS:Readonly<Record<string,BattleLevel>>=Object.fromEntries([1,2,3,4,5].map(day=>{
 const level:BattleLevel={id:`future${day}`,world:'future',worldName:'遥远未来',day,source:`future/future${day}.source.json`,assets:'campaign',bundles:['pirate','cowboy','future'],presentation:{lawn:day===4?'future/lawn-night.webp':'future/lawn.webp',loading:day===4?'future/lawn-night.webp':'future/lawn.webp',music:day===4?'future/minigame.mp3':'future/music.mp3'},plants,actors:plants.map(p=>p.kind),mode:'seedbank',night:day===4,firstReward:rewards[day-1],narrative:day===1?'FUTURE_INTRO_FIRSTLEVEL':day===4?'FUTURE_CHALLENGE_SUNBOMBS_A':null,...(day===4?{outro:'FUTURE_OUTRO_DANGER_ROOM_KEY'}:{})};return [level.id,level];
}));
