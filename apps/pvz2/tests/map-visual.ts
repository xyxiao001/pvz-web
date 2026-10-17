import { json, assetUrl } from '../src/assets/load';
import { MapRenderer } from '../src/shell/renderer';
import { ProgressStore, completionEvents } from '../src/shell/progression';
import { islandStates } from '../src/shell/navigation';
import type { Catalog, WorldMap, ProgressionArt } from '../src/shell/types';
const [catalog,map,art] = await Promise.all([json<Catalog>('shell/catalog.json'),json<WorldMap>('shell/maps/egypt.json'),json<ProgressionArt>('shell/progression.json')]);
const data = new Map<string,string>();
const progress = new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
const font = new FontFace('PvZMap',`url('${assetUrl('shell/map-font.woff2')}')`);document.fonts.add(await font.load());
const renderer = new MapRenderer(document.querySelector('#map')!,catalog);await renderer.init();
const busy = (value:boolean) => document.querySelectorAll<HTMLButtonElement>('button').forEach(b=>{b.disabled=value;});
const status = () => {
  document.querySelector('#status')!.textContent=JSON.stringify({completed:[...progress.completed(map)],plants:[...progress.ownedPlants()],rewards:progress.rewards(),pending:progress.pending(),levels:map.islands.filter(n=>n.kind===0).slice(0,4).map(n=>[n.name,islandStates(map,progress.completed(map),progress.rewardNodes('egypt')).get(n.node)])});
};
async function show(level?: string) {
  busy(true);
  if(level)progress.finish('egypt',level);
  const pending=progress.pending(),completed=progress.completed(map),rewards=progress.rewardNodes('egypt');
  const events=pending ? completionEvents(map,pending.level,completed,rewards) : [];
  const shown=new Set(completed);if(pending)shown.delete(pending.level);
  await renderer.showMap(map,level==='egypt3'?250:0,shown,false,rewards,art,events);
  if(events.length){
    await renderer.presentCompletion(events,event=>{if(event.action==='reward')progress.award('egypt',map.islands.find(n=>n.node===event.node)!);},name=>{void new Audio(assetUrl(art.sounds[name][0])).play();});
    progress.finishPresentation();
  }
  status();busy(false);
}
document.querySelector('#first')!.addEventListener('click',()=>{void show('egypt1');});
document.querySelector('#second')!.addEventListener('click',()=>{void show('egypt2');});
document.querySelector('#third')!.addEventListener('click',()=>{void show('egypt3');});
document.querySelector('#reload')!.addEventListener('click',()=>{void show();});
await show();

// Exercise two live Pixi applications. Destroying battle must not release map batches.
document.querySelector<HTMLButtonElement>('#lifecycle')!.onclick=async()=>{
 await show('egypt1');
 busy(true);
 const [{Scene},{Game},{readLevel},base,campaign,flag]=await Promise.all([
  import('../src/rendering/scene'),import('../src/game/model'),import('../src/game/level'),
  json<import('../src/game/level').Properties>('levels/properties.json'),
  json<import('../src/game/level').Properties>('campaign/properties.json'),
  json<import('../src/game/level').ZombieProperties>('battle/flag.json'),
 ]);
 const props={...campaign,plants:{...base.plants,...campaign.plants},zombies:{...base.zombies,...campaign.zombies,mummy_flag:flag},armors:{...base.armors,...campaign.armors}};
 const mapHost=document.querySelector<HTMLElement>('#map')!,battleHost=document.querySelector<HTMLElement>('#battle')!,result=document.querySelector('#lifecycle-status')!;
 for(const [index,day] of [2,3,2].entries()){
  result.textContent=`第 ${index+1}/3 次：加载第 ${day} 关`;
  renderer.stop();mapHost.hidden=true;battleHost.hidden=false;
  const scene=new Scene(),level=readLevel(await json<import('../src/game/level').SourceLevel>(`campaign/egypt${day}.source.json`));
  await scene.init(battleHost,()=>{},day,['peashooter','sunflower','wallnut','potatomine','cabbagepult'],level);
  const game=new Game(level,props,scene.timing,z=>scene.absorptionTarget(z),42,false);game.sun=500;game.plant('peashooter',2,0);game.plant('sunflower',1,0);game.food=1;game.plantFood(2,0);
  scene.frameCombat();for(let frame=0;frame<60;frame++){game.tick(1/60);scene.sync(game,1/60);}scene.render();
  scene.dispose();battleHost.hidden=true;mapHost.hidden=false;
  if(battleHost.querySelector('canvas'))throw new Error('Battle canvas was not removed');
  // Cover both cached instructions and a rebuilt map/reward instruction set.
  renderer.app.render();
  await show(`egypt${day}`);busy(true);
  mapHost.style.width='min(90vw,960px)';await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
  renderer.app.render();mapHost.style.width='';await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
  renderer.app.render();
 }
 result.textContent='通过：3 次战斗销毁、地图恢复、植物奖励与画布缩放；战斗画布均已移除。';busy(false);
};
