import runs from '../../public/assets/endless/runs.json';
import {BATTLE_LEVELS} from './levels';
import type {BattleLevel} from './battle-level';
import type {PlantKind} from './level';
import {endlessRandom} from './endless-generator';
export type EndlessWorld=keyof typeof runs;
export const ENDLESS_UNLOCK:Record<EndlessWorld,number>={egypt:12,pirate:4,cowboy:3,future:4,dark:12,beach:20,iceage:20,lostcity:20,kongfu:14,eighties:20,dino:20,sky:20,modern:20};
export const ENDLESS_WORLDS=Object.keys(runs) as EndlessWorld[];
export interface EndlessRun {round:number;seed:number;plants:PlantKind[];choices:PlantKind[];chosen:boolean;food:number;mowers:boolean[];best:number}
export const endlessRules=(world:EndlessWorld)=>runs[world];
export function newEndlessRun(world:EndlessWorld,seed:number,best=0):EndlessRun{return {round:1,seed,plants:[...runs[world].InitialPlants] as PlantKind[],choices:[],chosen:false,food:0,mowers:[true,true,true,true,true],best};}
export function offerEndlessPlants(world:EndlessWorld,run:EndlessRun,owned:ReadonlySet<PlantKind>){
 if(run.chosen||run.choices.length)return;
 const candidates=[...owned].filter(p=>!run.plants.includes(p)&&!runs[world].ExcludePlants.includes(p)),random=endlessRandom(run.seed^0x51ed270b);
 for(let i=candidates.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
 run.choices=candidates.slice(0,4);if(!run.choices.length)run.chosen=true;
}
export function advanceEndless(run:EndlessRun,food:number,mowers:boolean[]){run.best=Math.max(run.best,run.round);run.round++;run.seed=(Math.imul(run.seed,1664525)+1013904223)>>>0;run.chosen=false;run.choices=[];run.food=food;run.mowers=mowers;}
export function endlessLevel(world:EndlessWorld):BattleLevel {
 const base=Object.values(BATTLE_LEVELS).find(l=>l.world===world)!;
 const plants=BATTLE_LEVELS.modern25.plants;
 return {...base,id:`endless_${world}`,day:666,endless:world,source:`endless/${world}.source.json`,assets:'campaign',bundles:[...BATTLE_LEVELS.modern5.bundles!.filter(b=>b!==world),world==='egypt'?'campaign':world,'endless'],plants,actors:plants.map(p=>p.kind),mode:'seedbank',night:world==='dark',narrative:null,outro:undefined,firstReward:{image:'',label:''}};
}
export const ENDLESS_LEVELS:Readonly<Record<string,BattleLevel>>=Object.fromEntries(ENDLESS_WORLDS.map(w=>[`endless_${w}`,endlessLevel(w)]));
