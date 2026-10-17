import '../src/shell/style.css';
import '../src/style.css';
import '../src/cursor.css';
import { WorldShell } from '../src/shell/controller';
import { ProgressStore } from '../src/shell/progression';
import { createBattle } from '../src/battle';
import { BATTLE_LEVELS } from '../src/game/levels';
const data = new Map<string,string>();
const storage={getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>{data.set(key,value);},removeItem:(key:string)=>{data.delete(key);}};
const progress=new ProgressStore(storage);
if(!new URL(location.href).searchParams.has('new-profile')) {
for(let day=1;day<=35;day++)storage.setItem(`pvz2-web:egypt${day}-complete`,'1');
storage.setItem('pvz2-web:map-rewards',JSON.stringify([4,5,6,12,25,7,8].map((id,node)=>({world:'egypt',node,kind:'plant',id}))));
}
const host=document.querySelector<HTMLElement>('#world')!,battleHost=document.querySelector<HTMLElement>('#battle')!;
const shell=new WorldShell(host,async level=>{
  const battle=createBattle(battleHost,()=>{battle.dispose();void shell.resume();},BATTLE_LEVELS[level],progress);
  await battle.enter();
},storage);
await shell.init();
