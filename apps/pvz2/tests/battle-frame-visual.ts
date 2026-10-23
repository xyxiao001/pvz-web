// Exercise the real battle controller with synthetic display frames and an in-memory save.
import { createBattle } from '../src/battle';
import { Scene } from '../src/rendering/scene';
import { BATTLE_LEVELS } from '../src/game/levels';
import { ProgressStore } from '../src/shell/progression';
import { cellX, rowY } from '../src/game/level';
import type { Game } from '../src/game/model';

const host=document.querySelector<HTMLElement>('.battle-app')!;
const output=document.querySelector<HTMLElement>('#result')!;
const data=new Map<string,string>();
const progress=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
progress.finishPresentation();
let scene:Scene,game:Game,syncs=0;
const start=Scene.prototype.start,sync=Scene.prototype.sync;
Scene.prototype.start=function(){scene=this;};
Scene.prototype.sync=function(model,dt){game=model;syncs++;return sync.call(this,model,dt);};
const battle=createBattle(host,()=>{},BATTLE_LEVELS.egypt2,progress);
const results:Record<string,unknown>={};
const check=(ok:boolean,message:string)=>{if(!ok)throw new Error(message);};
const button=(selector:string)=>host.querySelector<HTMLButtonElement>(selector)!;
try {
  await battle.enter();
  for(let i=0;i<1200&&host.dataset.screen!=='choosing';i++)scene!.onTick(1/60);
  for(const card of host.querySelectorAll<HTMLButtonElement>('[data-choose]'))card.click();
  button('#start').click();
  for(let i=0;i<1200&&host.dataset.screen!=='playing';i++)scene!.onTick(1/60);
  check(host.dataset.screen==='playing','battle did not start');
  scene!.onTick(0);
  for(const rate of [30,60,120,144,240]){
    syncs=0;const time=game!.time;
    for(let i=0;i<rate;i++)scene!.onTick(1/rate);
    const advanced=game!.time-time;
    check(Math.abs(advanced-1)<1/60+.000001,`${rate} Hz changed simulation speed: ${advanced}`);
    check(syncs<=Math.min(rate,61),`${rate} Hz repeated unchanged syncs: ${syncs}`);
    results[`${rate}Hz`]={syncs,simulationSeconds:advanced};
  }
  game!.sun=9999;scene!.onTick(1/60);scene!.onTick(0);
  button('[data-slot="0"]').click();syncs=0;scene!.onTick(0);
  check(syncs===1,'selection did not refresh without a simulation step');
  const before=game!.plants.length;scene!.onPoint(cellX(0),rowY(2));syncs=0;scene!.onTick(0);
  check(game!.plants.length===before+1&&syncs===1,'planting did not refresh immediately');
  scene!.onHover(cellX(1),rowY(1));syncs=0;scene!.onTick(0);check(syncs===1,'pointer did not refresh');
  scene!.onRelease();syncs=0;scene!.onTick(0);check(syncs===1,'release did not refresh');
  syncs=0;for(let i=0;i<20;i++)scene!.onTick(0);check(syncs===0,'idle frames repeated synchronization');
  button('#pause').click();const paused=game!.time;scene!.onTick(1);check(game!.time===paused,'pause advanced simulation');
  button('#resume').click();scene!.onTick(0);
  button('#speed').click();const beforeFast=game!.time;syncs=0;
  for(let i=0;i<120;i++)scene!.onTick(1/120);
  check(Math.abs(game!.time-beforeFast-2)<1/60+.000001,'double speed changed');
  results.doubleSpeed={syncs,simulationSeconds:game!.time-beforeFast};
  scene!.render();results.interaction='selection, planting, pointer, release, pause/resume passed';
  output.textContent=JSON.stringify({passed:true,...results},null,2);
} catch(error) {
  output.textContent=JSON.stringify({passed:false,error:String(error),...results},null,2);
  throw error;
} finally {
  Scene.prototype.start=start;Scene.prototype.sync=sync;
}
window.addEventListener('pagehide',()=>{void battle.dispose();},{once:true});
