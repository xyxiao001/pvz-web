import type {BattleLevel} from '../battle-level';
import {LOSTCITY_LEVELS} from './lostcity';
const plants:BattleLevel['plants']=[...LOSTCITY_LEVELS.lostcity1.plants,{id:156,kind:'firegourd'}];
export const KONGFU_LEVELS:Readonly<Record<string,BattleLevel>>={kongfu1:{id:'kongfu1',world:'kongfu',worldName:'武林寺庙',day:1,source:'kongfu/kongfu1.source.json',assets:'campaign',bundles:['pirate','cowboy','future','dark','beach','iceage','lostcity','kongfu'],presentation:{lawn:'kongfu/lawn.webp',loading:'kongfu/lawn.webp',music:'kongfu/music.mp3'},plants,actors:plants.map(p=>p.kind),mode:'seedbank',night:false,firstReward:{image:'',plant:'firegourd',label:'火葫芦'},narrative:'KONGFU_1_INTRO'}};
