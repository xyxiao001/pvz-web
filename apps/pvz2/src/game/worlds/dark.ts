import type {BattleLevel} from '../battle-level';
import {FUTURE_LEVELS} from './future';
const plants:BattleLevel['plants']=[...FUTURE_LEVELS.future1.plants,{id:11,kind:'fumeshroom'}];
export const DARK_LEVELS:Readonly<Record<string,BattleLevel>>=Object.fromEntries([1,2,3,4,5].map(day=>{
 const reward:BattleLevel['firstReward']=day===1?{image:'',plant:'sunshroom',label:'阳光菇'}:day===2?{image:'',plant:'puffshroom',label:'小喷菇'}:day===4?{image:'',plant:'fumeshroom',label:'大喷菇'}:{image:'',label:''};
 const config:BattleLevel={id:`dark${day}`,world:'dark',worldName:'黑暗时代',day,source:`dark/dark${day}.source.json`,assets:'campaign',bundles:['pirate','cowboy','future','dark'],presentation:{lawn:'dark/lawn.webp',loading:'dark/lawn.webp',music:day===4?'dark/minigame.mp3':'dark/music.mp3'},plants,actors:plants.map(p=>p.kind),mode:day===4?'conveyor':'seedbank',night:true,firstReward:reward,narrative:day===1?'DARK_INTRO_FIRSTLEVEL':day===4?'DARK_INTRO_HYPNOSHROOM':day===5?'DARK_INTRO_FUMESHROOM':null};return [config.id,config];
}));
