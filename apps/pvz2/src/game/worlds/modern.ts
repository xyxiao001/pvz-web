import type {BattleLevel} from '../battle-level';
import {SKY_LEVELS} from './sky';
export const MODERN_LEVELS:Readonly<Record<string,BattleLevel>>=Object.fromEntries(Array.from({length:10},(_,i)=>i+1).map(day=>{
 const plants:BattleLevel['plants']=[...SKY_LEVELS.sky32.plants,...(day>=2?[{id:27,kind:'moonflower' as const}]:[]),...(day>=5?[{id:149,kind:'nightshade' as const}]:[])];
 const level:BattleLevel={id:`modern${day}`,world:'modern',worldName:'摩登世界',day,source:`modern/modern${day}.source.json`,assets:'campaign',bundles:[...SKY_LEVELS.sky32.bundles!,'modern',...(day>=6?['endless']:[])],presentation:{lawn:'modern/lawn.webp',loading:'modern/lawn.webp',music:[3,8,9].includes(day)?'modern/minigame.mp3':'modern/music.mp3'},plants,actors:plants.map(p=>p.kind),mode:day===8?'beghouled':day===9?'preset':day===3?'conveyor':'seedbank',night:[3,8].includes(day),narrative:day===8?'BEGHOULED_INTRO':[1,2,3,5,9].includes(day)?`MODERN_${day}_INTRO`:null,firstReward:day===1?{image:'',plant:'moonflower',label:'月光花'}:day===4?{image:'',plant:'nightshade',label:'龙葵'}:day===10?{image:'',plant:'shadowshroom',label:'毒影菇'}:{image:'',label:''}};
 return [level.id,level];
}));
