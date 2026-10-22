import type {BattleLevel} from '../battle-level';
import {EIGHTIES_LEVELS} from './eighties';
export const DINO_LEVELS:Readonly<Record<string,BattleLevel>>=Object.fromEntries([1,2,3,4,5].map(day=>{
 const plants:BattleLevel['plants']=[...EIGHTIES_LEVELS.eighties42.plants,...(day>=2?[{id:18,kind:'primalpeashooter' as const}]:[]),...(day>=5?[{id:41,kind:'primalwallnut' as const}]:[])];
 const level:BattleLevel={id:`dino${day}`,world:'dino',worldName:'侏罗纪沼泽',day,source:`dino/dino${day}.source.json`,assets:'campaign',bundles:['pirate','cowboy','future','dark','beach','iceage','lostcity','kongfu','eighties','dino'],presentation:{lawn:'dino/lawn.webp',loading:'dino/lawn.webp',music:day===3?'dino/minigame.mp3':'dino/music.mp3'},plants,actors:plants.map(p=>p.kind),mode:day===3?'conveyor':'seedbank',night:false,narrative:day<=2?`DINO_${day}_INTRO`:null,firstReward:day===1?{image:'',plant:'primalpeashooter',label:'原始豌豆射手'}:day===4?{image:'',plant:'primalwallnut',label:'原始坚果墙'}:{image:'',label:''}};
 return [level.id,level];
}));
