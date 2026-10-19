import type {BattleLevel} from '../battle-level';
import {BEACH_LEVELS} from './beach';
const plants:BattleLevel['plants']=[...BEACH_LEVELS.beach1.plants,{id:130,kind:'hotpotato'}];
export const ICEAGE_LEVELS:Readonly<Record<string,BattleLevel>>=Object.fromEntries([1,2,3].map(day=>{
 const config:BattleLevel={id:`iceage${day}`,world:'iceage',worldName:'极寒冰窟',day,source:`iceage/iceage${day}.source.json`,assets:'campaign',bundles:['pirate','cowboy','future','dark','beach','iceage'],presentation:{lawn:'iceage/lawn.webp',loading:'iceage/lawn.webp',music:day===3?'iceage/ultimate.mp3':'iceage/music.mp3'},plants,actors:plants.map(p=>p.kind),mode:day===3?'conveyor':'seedbank',night:false,firstReward:day===1?{image:'',plant:'hotpotato',label:'热土豆'}:{image:'',label:''},narrative:['ICEAGE_INTRO_FIRSTLEVEL','ICEAGE_INTRO_ICEBLOCKS','ICEAGE_INTRO_HURRIKALE'][day-1]};return [config.id,config];
}));
