// Only this development harness uses a memory profile; real player storage is untouched.
import '../src/shell/style.css';
import {createBattle} from '../src/battle';
import {BATTLE_LEVELS} from '../src/game/levels';
import {ProgressStore} from '../src/shell/progression';
import {json} from '../src/assets/load';
import type {WorldMap} from '../src/shell/types';
const font=new FontFace('PvZMap',`url('/pvz2/assets/shell/map-font.woff2')`);document.fonts.add(await font.load());
const map=await json<WorldMap>('shell/maps/egypt.json');
const host=document.querySelector<HTMLElement>('.battle-app')!;
let battle:ReturnType<typeof createBattle>;
const state=document.querySelector<HTMLElement>('#state')!;
for(const button of document.querySelectorAll<HTMLButtonElement>('[data-day]'))button.onclick=async()=>{
 for(const b of document.querySelectorAll<HTMLButtonElement>('[data-day]'))b.disabled=true;
 battle?.dispose();
 const day=Number(button.dataset.day),data=new Map<string,string>();
 const progress=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 for(let i=1;i<day;i++)progress.finish('egypt',`egypt${i}`);
 for(const node of map.islands)if(node.kind===1&&((node.plant===4&&day>2)||(node.plant===5&&day>3)||(node.plant===6&&day>5)||(node.plant===12&&day>9)||(node.plant===7&&day>13)||(node.plant===8&&day>19)||(node.plant===25&&day>24)))progress.award('egypt',node);
 for(const node of map.islands)if(node.kind===3&&((node.upgrade===2&&day>17)||(node.upgrade===0&&day>21)))progress.award('egypt',node);
 progress.finishPresentation();
 battle=createBattle(host,()=>{state.textContent=`返回地图 · 已完成 ${progress.isComplete('egypt'+day)} · 植物 ${[...progress.ownedPlants()].join(',')}`;},BATTLE_LEVELS['egypt'+day],progress);
 await battle.enter();state.textContent=`第 ${day} 关 · 独立测试存档`;
 for(const b of document.querySelectorAll<HTMLButtonElement>('[data-day]'))b.disabled=false;
};
