import type {BattleLevel} from '../battle-level';
import {DINO_LEVELS} from './dino';
export const SKY_LEVELS:Readonly<Record<string,BattleLevel>>=Object.fromEntries([1,2,3,4,5].map(day=>{
 const plants:BattleLevel['plants']=[...DINO_LEVELS.dino42.plants,...(day>=2?[{id:108,kind:'skyshooter' as const}]:[])];
 const level:BattleLevel={id:`sky${day}`,world:'sky',worldName:'云端堡垒',day,source:`sky/sky${day}.source.json`,assets:'campaign',bundles:['pirate','cowboy','future','dark','beach','iceage','lostcity','kongfu','eighties','dino','sky'],presentation:{lawn:'sky/lawn.webp',loading:'sky/lawn.webp',music:[3,5].includes(day)?'sky/minigame.mp3':'sky/music.mp3'},plants,actors:plants.map(p=>p.kind),mode:[3,5].includes(day)?'conveyor':'seedbank',night:false,narrative:[1,2,3,5].includes(day)?`SKYCITY_${day}_INTRO`:null,firstReward:day===1?{image:'',plant:'skyshooter',label:'飞行豌豆'}:day===3?{image:'upgrade_sky_shield',animation:'Shield',armature:'Upgrades',label:'飞船护盾'}:{image:'',label:''}};
 return [level.id,level];
}));
