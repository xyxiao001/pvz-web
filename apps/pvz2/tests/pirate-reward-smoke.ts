import '../src/shell/style.css';
import '../src/style.css';
import {ProgressStore} from '../src/shell/progression';
import {BATTLE_LEVELS} from '../src/game/levels';
import {Game} from '../src/game/model';
import {createBattle} from '../src/battle';
const data=new Map<string,string>(),storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}};
const progress=new ProgressStore(storage);
let controlled=false;
const tick=Game.prototype.tick;
Game.prototype.tick=function(dt:number){tick.call(this,dt);if(controlled&&this.phase==='playing')this.phase='won';};
document.querySelector<HTMLButtonElement>('#control')!.onclick=()=>{controlled=true;};
const battle=createBattle(document.querySelector<HTMLElement>('.battle-app')!,async()=>{
 await battle.dispose();document.querySelector('#status')!.textContent=JSON.stringify({rewards:progress.campaignRewards(),completed:progress.isComplete('pirate4')});
},BATTLE_LEVELS.pirate4,progress);
document.querySelector<HTMLButtonElement>('#start')!.onclick=()=>battle.enter();
