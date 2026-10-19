import '../src/shell/style.css';
import '../src/errors.css';
import {WorldShell} from '../src/shell/controller';
import {ProgressStore} from '../src/shell/progression';
import {NAVIGATION_KEY} from '../src/shell/navigation';
import {createBattle} from '../src/battle';
import {BATTLE_LEVELS} from '../src/game/levels';
import {installErrorReporting} from '../src/errors';
installErrorReporting();
const data=new Map<string,string>(),storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}};
data.set(NAVIGATION_KEY,JSON.stringify({world:'egypt',chooser:0,cameras:{egypt:1378.648}}));
const progress=new ProgressStore(storage);progress.finish('egypt','egypt7');progress.finish('egypt','egypt1');progress.finishPresentation();
const map=document.querySelector<HTMLElement>('#map')!,host=document.querySelector<HTMLElement>('#battle')!,status=document.querySelector('#status')!;
let battle:ReturnType<typeof createBattle>|undefined;
async function play(id:string){shell['renderer'].stop();map.hidden=true;host.hidden=false;battle=createBattle(host,async()=>{await battle!.dispose();battle=undefined;host.hidden=true;map.hidden=false;await shell.resume();},BATTLE_LEVELS[id],progress);await battle.enter();}
const shell=new WorldShell(map,play,storage);await shell.init();
document.querySelector<HTMLButtonElement>('#reload-map')!.onclick=async()=>{await battle?.dispose();battle=undefined;host.hidden=true;map.hidden=false;await shell.resume();status.textContent=JSON.stringify(progress.costumeRewards());};
document.querySelector<HTMLButtonElement>('#day8')!.onclick=()=>play('egypt8');
document.querySelector<HTMLButtonElement>('#day1')!.onclick=()=>play('egypt1');
