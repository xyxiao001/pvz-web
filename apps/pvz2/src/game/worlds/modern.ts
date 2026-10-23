import type {BattleLevel} from '../battle-level';
import {SKY_LEVELS} from './sky';
export const MODERN_LEVELS:Readonly<Record<string,BattleLevel>>=Object.fromEntries(Array.from({length:5},(_,i)=>i+1).map(day=>{
 const plants:BattleLevel['plants']=[...SKY_LEVELS.sky32.plants,...(day>=2?[{id:27,kind:'moonflower' as const}]:[]),...(day>=5?[{id:149,kind:'nightshade' as const}]:[])];
 const level:BattleLevel={id:`modern${day}`,world:'modern',worldName:'摩登世界',day,source:`modern/modern${day}.source.json`,assets:'campaign',bundles:[...SKY_LEVELS.sky32.bundles!,'modern'],presentation:{lawn:'modern/lawn.webp',loading:'modern/lawn.webp',music:day===3?'modern/minigame.mp3':'modern/music.mp3'},plants,actors:plants.map(p=>p.kind),mode:day===3?'conveyor':'seedbank',night:day===3,narrative:[1,2,3,5].includes(day)?`MODERN_${day}_INTRO`:null,firstReward:day===1?{image:'',plant:'moonflower',label:'月光花'}:day===4?{image:'',plant:'nightshade',label:'龙葵'}:{image:'',label:''}};
 return [level.id,level];
}));
