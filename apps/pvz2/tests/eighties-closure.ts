import '../src/shell/style.css';
import '../src/style.css';
import {WorldShell} from '../src/shell/controller';
import {ProgressStore} from '../src/shell/progression';
import {NAVIGATION_KEY} from '../src/shell/navigation';
import {BATTLE_LEVELS} from '../src/game/levels';
import {Game} from '../src/game/model';
import {createBattle} from '../src/battle';
import {json} from '../src/assets/load';
import type {WorldMap} from '../src/shell/types';

const data=new Map<string,string>(),storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}};
const progress=new ProgressStore(storage),map=await json<WorldMap>('shell/maps/eighties.json');
const day=Number(new URLSearchParams(location.search).get('day')??1);
const node=map.islands.find(n=>n.levels.includes(`eighties${day}`))!;
storage.setItem(NAVIGATION_KEY,JSON.stringify({world:'eighties',chooser:0,cameras:{eighties:node.x}}));
storage.setItem('pvz2-web:unlocked-worlds',JSON.stringify(['eighties']));
if(day!==1)progress.temporaryUnlock=true;
let controlled=false,battle:ReturnType<typeof createBattle>|undefined;
const tick=Game.prototype.tick;
// Fixture-only control: keep the production battle, ending, dialogue and reward UI.
Game.prototype.tick=function(dt:number){
 for(let i=0;i<(controlled?30:1);i++){
  tick.call(this,dt);
  if(controlled)for(const z of this.zombies)this.damage(z,100000,'water');
 }
};
const control=document.querySelector<HTMLButtonElement>('#control')!;
control.onclick=()=>{controlled=!controlled;control.textContent=controlled?'关闭受控清场':'开启受控清场';};
const status=()=>{document.querySelector('#status')!.textContent=JSON.stringify({completed:[...progress.completed(map)],plants:[...progress.ownedPlants()],rewards:progress.rewards(),campaign:progress.campaignRewards(),pending:progress.pending()});};
document.querySelector<HTMLButtonElement>('#snapshot')!.onclick=status;
const host=document.querySelector<HTMLElement>('.world-shell')!,battleHost=document.querySelector<HTMLElement>('.battle-app')!;
const shell=new WorldShell(host,async(id,p)=>{
 battle=createBattle(battleHost,async()=>{await battle!.dispose();battle=undefined;await shell.resume();status();},BATTLE_LEVELS[id],p);
 await battle.enter();
},storage);
await shell.init();status();
