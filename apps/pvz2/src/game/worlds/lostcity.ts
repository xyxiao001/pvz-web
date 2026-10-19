import type {BattleLevel} from '../battle-level';
import {ICEAGE_LEVELS} from './iceage';
const plants:BattleLevel['plants']=[...ICEAGE_LEVELS.iceage1.plants,{id:107,kind:'redstinger'}];
export const LOSTCITY_LEVELS:Readonly<Record<string,BattleLevel>>=Object.fromEntries([1,2,3].map(day=>{
 const config:BattleLevel={id:`lostcity${day}`,world:'lostcity',worldName:'失落古城',day,source:`lostcity/lostcity${day}.source.json`,assets:'campaign',bundles:['pirate','cowboy','future','dark','beach','iceage','lostcity'],presentation:{lawn:day===3?'lostcity/lawn-night.webp':'lostcity/lawn.webp',loading:'lostcity/lawn.webp',music:day===3?'lostcity/minigame.mp3':'lostcity/music.mp3'},plants,actors:plants.map(p=>p.kind),mode:day===3?'conveyor':'seedbank',night:day===3,firstReward:day===1?{image:'',plant:'redstinger',label:'红针花'}:{image:'',label:''},narrative:`LOSTCITY_${day}_INTRO`};return [config.id,config];
}));
