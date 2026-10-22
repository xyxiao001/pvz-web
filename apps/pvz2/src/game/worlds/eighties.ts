import type {BattleLevel} from '../battle-level';
import {KONGFU_LEVELS} from './kongfu';
const inherited=KONGFU_LEVELS.kongfu48.plants;
export const EIGHTIES_LEVELS:Readonly<Record<string,BattleLevel>>=Object.fromEntries([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map(day=>{
 const plants:BattleLevel['plants']=[...inherited,...(day>=2?[{id:137,kind:'phatbeet' as const}]:[]),...(day>=10?[{id:139,kind:'thymewarp' as const}]:[])];
 const level:BattleLevel={id:`eighties${day}`,world:'eighties',worldName:'炫光魔音游',day,source:`eighties/eighties${day}.source.json`,assets:'campaign',bundles:['pirate','cowboy','future','dark','beach','iceage','lostcity','kongfu','eighties'],presentation:{lawn:'eighties/lawn.webp',loading:'eighties/lawn.webp',music:'eighties/music.mp3'},plants,actors:plants.map(p=>p.kind),mode:[3,6,10].includes(day)?'conveyor':[9,11,14].includes(day)?'preset':'seedbank',night:true,outro:day===15?'EIGHTIES_15_OUTRO':undefined,narrative:day<=3?`EIGHTIES_${day}_INTRO`:null,firstReward:day===1?{image:'',plant:'phatbeet',label:'魔音甜菜'}:day===5?{image:'',plant:'celerystalker',label:'潜伏芹菜'}:day===9?{image:'',plant:'thymewarp',label:'逆时草'}:[12,14].includes(day)?{image:'spine_eighties',animation:'Pinata',armature:'Upgrades',label:'炫光魔音游皮纳塔'}:{image:'',label:''}};
 return [level.id,level];
}));
