import type {BattleLevel} from '../battle-level';
import {DARK_LEVELS} from './dark';
const plants:BattleLevel['plants']=[...DARK_LEVELS.dark1.plants,{id:23,kind:'lilypad'},{id:114,kind:'tanglekelp'}];
export const BEACH_LEVELS:Readonly<Record<string,BattleLevel>>=Object.fromEntries([1,2,3,4,5,6,7,8,9,10].map(day=>{
 const config:BattleLevel={id:`beach${day}`,world:'beach',worldName:'巨浪沙滩',day,source:`beach/beach${day}.source.json`,assets:'campaign',bundles:['pirate','cowboy','future','dark','beach'],presentation:{lawn:'beach/lawn.webp',loading:'beach/lawn.webp',music:day===10?'beach/ultimate.mp3':[3,5,8].includes(day)?'beach/minigame.mp3':'beach/music.mp3'},plants,actors:plants.map(p=>p.kind),mode:[3,5,8,10].includes(day)?'conveyor':'seedbank',night:false,firstReward:day===1?{image:'',plant:'lilypad',label:'睡莲'}:day===6?{image:'',plant:'tanglekelp',label:'缠绕海带'}:[4,8].includes(day)?{image:'spine_beach',animation:'Pinata',armature:'Upgrades',label:'巨浪沙滩皮纳塔'}:{image:'',label:''},narrative:day===1?'BEACH_INTRO_FIRSTLEVEL':day===2?'BEACH_INTRO_TIDES':day===3?'BEACH_INTRO_CHOMPER':day===8?'BEACH_INTRO_BOWLING':null};return [config.id,config];
}));
