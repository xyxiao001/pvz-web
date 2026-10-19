import type {BattleLevel} from '../battle-level';
import {ICEAGE_LEVELS} from './iceage';
const plants:BattleLevel['plants']=[...ICEAGE_LEVELS.iceage1.plants,{id:107,kind:'redstinger'},{id:133,kind:'akee'}];
export const LOSTCITY_LEVELS:Readonly<Record<string,BattleLevel>>=Object.fromEntries([1,2,3,4,5,6,7,8].map(day=>{
 const config:BattleLevel={id:`lostcity${day}`,world:'lostcity',worldName:'失落古城',day,source:`lostcity/lostcity${day}.source.json`,assets:'campaign',bundles:['pirate','cowboy','future','dark','beach','iceage','lostcity'],presentation:{lawn:[3,5].includes(day)?'lostcity/lawn-night.webp':'lostcity/lawn.webp',loading:'lostcity/lawn.webp',music:[3,5].includes(day)?'lostcity/minigame.mp3':day===8?'lostcity/ultimate.mp3':'lostcity/music.mp3'},plants,actors:plants.map(p=>p.kind),mode:[3,5].includes(day)?'conveyor':day===8?'preset':'seedbank',night:[3,5].includes(day),firstReward:[4,8].includes(day)?{image:'spine_lostcity',animation:'Pinata',armature:'Upgrades',label:'失落古城皮纳塔'}:day===6?{image:'',plant:'akee',label:'阿开木'}:day===1?{image:'',plant:'redstinger',label:'红针花'}:{image:'',label:''},narrative:day<=4?`LOSTCITY_${day}_INTRO`:null};return [config.id,config];
}));
