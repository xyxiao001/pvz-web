import '../src/shell/style.css';
import '../src/style.css';
import '../src/cursor.css';
import { WorldShell } from '../src/shell/controller';
import { ProgressStore } from '../src/shell/progression';
import { createBattle } from '../src/battle';
import { BATTLE_LEVELS } from '../src/game/levels';
import { GardenProgress, GARDEN_KEY, GROWTH_TIME } from '../src/outer/garden';
import { json } from '../src/assets/load';
import type { OuterCatalog } from '../src/outer/types';
const data = new Map<string,string>();
const storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);},removeItem:(key:string)=>{data.delete(key);}};
const progress=new ProgressStore(storage);
if(!new URL(location.href).searchParams.has('new-profile')) {
for(let day=1;day<=35;day++)storage.setItem(`pvz2-web:egypt${day}-complete`,'1');
storage.setItem('pvz2-web:map-rewards',JSON.stringify([4,5,6,12,25,7,8].map((id,node)=>({world:'egypt',node,kind:'plant',id}))));
}
if(new URL(location.href).searchParams.has('garden-fixture')){
  const catalog=await json<OuterCatalog>('outer/catalog.json'),garden=new GardenProgress(storage,catalog.garden.gardens,progress.shop()),state=garden.read();
  state.sprouts=3;state.areas[0][0].plant={kind:'peashooter',grown:GROWTH_TIME*.75+1,time:Date.now(),stuck:false,water:0,cooldown:0,requirement:'fertilizerPar'};
  state.areas[0][1].plant={kind:'wallnut',grown:GROWTH_TIME*.75-1,time:Date.now(),stuck:true,water:-1,cooldown:0,requirement:'fertilizerPar'};
  storage.setItem(GARDEN_KEY,JSON.stringify(state));progress.shop().credit('coin',8000);
}
const host=document.querySelector<HTMLElement>('#world')!,battleHost=document.querySelector<HTMLElement>('#battle')!;
const shell=new WorldShell(host,async level=>{
  const battle=createBattle(battleHost,async ()=>{await battle.dispose();await shell.resume();},BATTLE_LEVELS[level],progress);
  await battle.enter();
},storage);
await shell.init();
