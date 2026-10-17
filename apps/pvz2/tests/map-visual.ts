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
