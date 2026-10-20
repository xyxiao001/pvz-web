import type {BattleLevel} from '../battle-level';
import {LOSTCITY_LEVELS} from './lostcity';
const plants:BattleLevel['plants']=[...LOSTCITY_LEVELS.lostcity1.plants,{id:156,kind:'firegourd'}];
export const KONGFU_LEVELS:Readonly<Record<string,BattleLevel>>=Object.fromEntries(Array.from({length:6},(_,i)=>{
 const day=i+1,id=`kongfu${day}`,conveyor=day===3||day===6;
 const level:BattleLevel={id,world:'kongfu',worldName:'武林寺庙',day,source:`kongfu/${id}.source.json`,assets:'campaign',bundles:['pirate','cowboy','future','dark','beach','iceage','lostcity','kongfu'],presentation:{lawn:'kongfu/lawn.webp',loading:'kongfu/lawn.webp',music:`kongfu/${conveyor?'minigame':'music'}.mp3`},plants,actors:plants.map(p=>p.kind),mode:conveyor?'conveyor':'seedbank',night:false,
  ...(day===1?{firstReward:{image:'',plant:'firegourd' as const,label:'火葫芦'}}:day===6?{firstReward:{image:'',plant:'snowpea' as const,label:'寒冰射手'}}:{firstReward:{image:'',label:''}}),
  narrative:[1,2,4,6].includes(day)?`KONGFU_${day}_INTRO`:null};return [id,level];
}));
