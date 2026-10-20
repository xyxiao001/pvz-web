import type {BattleLevel} from '../battle-level';
import {LOSTCITY_LEVELS} from './lostcity';
const plants:BattleLevel['plants']=[...LOSTCITY_LEVELS.lostcity1.plants,{id:156,kind:'firegourd'}];
export const KONGFU_LEVELS:Readonly<Record<string,BattleLevel>>=Object.fromEntries(Array.from({length:16},(_,i)=>{
 const day=i+1,id=`kongfu${day}`,conveyor=[3,6,8,12,16].includes(day),available:BattleLevel['plants']=[...plants,...(day>=7?[{id:28,kind:'snowpea' as const}]:[]),...(day>=11?[{id:157,kind:'bambooshoot' as const}]:[]),...(day>=14?[{id:86,kind:'turnip' as const}]:[])];
 const level:BattleLevel={id,world:'kongfu',worldName:'武林寺庙',day,source:`kongfu/${id}.source.json`,assets:'campaign',bundles:['pirate','cowboy','future','dark','beach','iceage','lostcity','kongfu'],presentation:{lawn:'kongfu/lawn.webp',loading:'kongfu/lawn.webp',music:`kongfu/${conveyor||[10,13,15].includes(day)?'minigame':'music'}.mp3`},plants:available,actors:available.map(p=>p.kind),mode:conveyor?'conveyor':day===13?'preset':'seedbank',night:false,
  ...(day===13?{firstReward:{image:'',plant:'turnip' as const,label:'白萝卜'}}:day===14?{firstReward:{image:'dangerroom_kongfu',animation:'dangerroom_kongfu',label:'武林无尽挑战'}}:day===8?{firstReward:{image:'worldkey',animation:'worldkey',label:'世界钥匙'}}:day===10?{firstReward:{image:'',plant:'bambooshoot' as const,label:'竹笋'}}:day===1?{firstReward:{image:'',plant:'firegourd' as const,label:'火葫芦'}}:day===6?{firstReward:{image:'',plant:'snowpea' as const,label:'寒冰射手'}}:{firstReward:{image:'',label:''}}),
  outro:day===16?'KONGFU_OUTRO_BOSS1':undefined,narrative:day===16?'KONGFU_INTRO_BOSS1':[1,2,4,6,8,11,12].includes(day)?`KONGFU_${day}_INTRO`:null};return [id,level];
}));
