import { Scene } from '../src/rendering/scene';
import { Game } from '../src/game/model';
import { json } from '../src/assets/load';
import { readLevel, rowY, type SourceLevel, type Properties } from '../src/game/level';
import { BATTLE_LEVELS } from '../src/game/levels';
import { ProgressStore } from '../src/shell/progression';
import type { StoreCatalog } from '../src/shell/store';
const data=new Map<string,string>(),storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}};
const progress=new ProgressStore(storage),catalog=await json<StoreCatalog>('shell/store.json');
for(const name of ['upgrade_sunshovel_lvl3','upgrade_manual_mowers_2'])progress.shop().buy(catalog.items.find(i=>i.name===name)!,()=>true);
const level=readLevel(await json<SourceLevel>('levels/egypt1.source.json')),props=await json<Properties>('levels/properties.json'),scene=new Scene();
props.zombies.mummy_flag=await json('battle/flag.json');
await scene.init(document.querySelector('#canvas')!,()=>{},BATTLE_LEVELS.egypt1,['peashooter','sunflower','wallnut','potatomine'],level);
let game:Game;const state=document.querySelector('#state')!;
function render(){scene.sync(game,0);scene.render();state.textContent=`阳光 ${game.sun} · 手动次数 ${game.manualMowers} · 蓄力 ${game.mowers[2].hold.toFixed(2)} · 启动剩余 ${game.mowers[2].starting.toFixed(2)} · 位置 ${game.mowers[2].x.toFixed(0)}`;}
function reset(){scene.reset();scene.frameCombat();game=new Game(level,props,scene.timing,z=>scene.absorptionTarget(z));Object.assign(game,{shovelRefund:progress.battleBonuses().shovelRefund,manualMowers:progress.battleBonuses().manualMowers,sun:100});game.plant('peashooter',2,1);render();}
function advance(seconds:number){for(let i=0;i<Math.round(seconds*60);i++){game.tick(1/60);scene.sync(game,1/60);}render();}
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-action]'))button.onclick=()=>{
 switch(button.dataset.action){case 'hold':game.mowerPointer(game.mowers[2].x,rowY(2)-35,true,true);advance(.5);break;case 'launch':advance(.6);break;case 'step':advance(.4);break;case 'shovel':game.shovel(2,1);render();break;case 'reset':reset();}
};
reset();document.querySelector('fieldset')!.disabled=false;
