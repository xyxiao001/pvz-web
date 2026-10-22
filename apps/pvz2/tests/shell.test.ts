import { ProgressStore } from '../src/shell/progression';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { bounds, clampCamera, initialNavigation, islandStates, isWorldMigrated, LEVEL_ROUTES } from '../src/shell/navigation';
import type { Catalog, Draw, WorldMap } from '../src/shell/types';
const root = new URL('../public/assets/', import.meta.url);
const read = <T>(path: string): T => JSON.parse(readFileSync(new URL(path, root), 'utf8'));
const catalog = read<Catalog>('shell/catalog.json');
const maps = catalog.worlds.filter(w => w.enterable).map(w => read<WorldMap>(`shell/maps/${w.id}.json`));

test('13 native maps retain connected graphs and only the 342 migrated battles have routes', () => {
  assert.equal(maps.length,13);
  assert.equal(catalog.worlds.length,15);
  const counts={egypt:35,pirate:35,cowboy:35,future:35,dark:30,beach:42,iceage:40,lostcity:42,kongfu:48};
  assert.deepEqual(Object.keys(LEVEL_ROUTES),Object.entries(counts).flatMap(([world,count])=>Array.from({length:count},(_,i)=>`${world}${i+1}`)));
  for (const map of maps) {
    const nodes = new Set(map.islands.map(n => n.node));
    assert.equal(nodes.size,map.islands.length);
    assert.ok(map.islands.length > 40, map.id);
    for (const island of map.islands) for (const next of island.next) assert.ok(nodes.has(next),`${map.id}: ${next}`);
    assert.ok(map.islands.filter(n => n.kind === 0).every(n=>n.levels.length > 0));
  }
});

test('completion opens the next source node, browsing other worlds does not unlock them', () => {
  const egypt=maps.find(m=>m.id==='egypt')!;
  const first=egypt.islands.find(n=>n.levels.includes('egypt1'))!;
  const second=egypt.islands.find(n=>n.levels.includes('egypt2'))!;
  const before=islandStates(egypt,new Set());
  assert.equal(before.get(first.node),'open');assert.equal(before.get(second.node),'locked');
  const future=maps.find(m=>m.id==='future')!;assert.equal(islandStates(future,new Set()).get(future.islands.find(n=>n.levels.includes('future1'))!.node),'open');
  const after=islandStates(egypt,new Set(['egypt1']));
  assert.equal(after.get(first.node),'finished');assert.equal(after.get(second.node),'open');
  for(const map of maps.filter(m=>m.id!=='egypt'))for(const island of map.islands) {
    const expected=island.levels.some(id=>LEVEL_ROUTES[id]&&map.startingLevels.includes(id))?'open':'locked';
    assert.equal(islandStates(map,new Set(['egypt1'])).get(island.node),expected,`${map.id}/${island.node}`);
  }
});

test('map scroll limits use native island bounds and worlds have independent camera positions', () => {
  const nav=initialNavigation();nav.cameras.egypt=600;nav.cameras.pirate=1200;
  assert.equal(nav.cameras.egypt,600);
  for(const map of maps){const range=bounds(map);assert.equal(clampCamera(map,-Infinity),range.min);assert.equal(clampCamera(map,Infinity),range.max);assert.equal(clampCamera(map,0),0);}
});

test('map drawings and dynamic marker animations resolve to exported armatures', () => {
  const rigs=read<Record<string,{armatures:Record<string,string[]>}>>('shell/rigs.json');
  const validate=(draw:Draw)=>{
    if(draw.kind==='rig'){
      const animations=rigs[draw.rig!].armatures[draw.armature!];assert.ok(animations, `${draw.rig}/${draw.armature}`);
      if(draw.animation)assert.ok(animations.includes(draw.animation),`${draw.rig}/${draw.armature}/${draw.animation}`);
    }
    if(draw.kind==='sprite')assert.ok(readFileSync(new URL(draw.image!,root)).length>0);
  };
  for(const draw of [...catalog.chooser,...catalog.toolbar,...catalog.lock,...Object.values(catalog.nodes).flat(),...maps.flatMap(m=>m.draws)])validate(draw);
  const card=catalog.nodes.plantCard.find(d=>d.armature==='plants')!;
  const bg=catalog.nodes.plantCard.find(d=>d.armature==='background')!;
  for(const map of maps)for(const island of map.islands)if(island.kind===1){
    const plant=catalog.plantCards[island.plant];
    validate({...card,animation:plant.animation});validate({...bg,animation:plant.background});
  }
  for(const style of ['normalNode','minigameNode','gargantuarNode'])for(const draw of catalog.nodes[style])if(draw.kind==='rig')for(const animation of ['IdleUnopen','IdleUnfinish','IdleFinished'])validate({...draw,animation});
});

test('world assets are reproducible from pinned upstream inputs', () => {
  const manifest=JSON.parse(readFileSync(new URL('../shell-provenance.json',import.meta.url),'utf8'));
  assert.equal(manifest.commit,'0e4a05348b6de328e2902a57afa24a3a454a4205');
  for(const [path,expected] of Object.entries(manifest.outputs) as [string,{bytes:number;sha256:string}][]){
    const data=readFileSync(new URL(path,root));assert.equal(data.length,expected.bytes,path);assert.equal(createHash('sha256').update(data).digest('hex'),expected.sha256,path);
  }
});

test('portal light armatures are resolved without global atlas overrides', () => {
  const portal=read<{armature:{name:string}[]}>('shell/rigs/ce8294b0-7c76-4c91-939a-12540455d8f9/skeleton.json');
  const names=new Set(portal.armature.map(a=>a.name));
  assert.ok(names.has('ray_green'));assert.ok(names.has('ray_blue'));
});

test('Saved free play opens maps across reloads without granting completion, rewards or world keys',()=>{
 const data=new Map<string,string>(),storage={getItem:(k:string)=>data.get(k)??null,setItem:(k:string,v:string)=>{data.set(k,v);},removeItem:(k:string)=>{data.delete(k);}},store=new ProgressStore(storage);
 const dark=maps.find(m=>m.id==='dark')!,first=dark.islands.find(n=>n.levels.includes('dark1'))!,tenth=dark.islands.find(n=>n.levels.includes('dark10'))!;
 assert.equal(store.worldUnlocked('dark'),false);assert.equal(islandStates(dark,new Set()).get(first.node),'open');assert.equal(islandStates(dark,new Set()).get(tenth.node),'locked');
 const before=[...data];store.temporaryUnlock=true;
 for(const map of maps){
   assert.equal(store.worldUnlocked(map.id),isWorldMigrated(map.id),map.id);
   const states=islandStates(map,store.completed(map),store.rewardNodes(map.id),store.temporaryUnlock);
   for(const node of map.islands.filter(n=>n.kind===0))assert.equal(states.get(node.node),node.levels.some(id=>LEVEL_ROUTES[id])?'open':'locked',`${map.id}/${node.name}`);
 }
 assert.equal(data.get('pvz2-web:free-play'),'1');assert.deepEqual([...data].filter(([k])=>k!=='pvz2-web:free-play'),before);assert.equal(store.isComplete('dark10'),false);assert.deepEqual(store.rewards(),[]);assert.equal(store.worldKeys(),5);
 store.temporaryUnlock=false;assert.equal(store.worldUnlocked('dark'),false);assert.equal(islandStates(dark,new Set(),new Set(),store.temporaryUnlock).get(tenth.node),'locked');
 assert.equal(new ProgressStore(storage).temporaryUnlock,false);assert.deepEqual([...data],before);
 store.temporaryUnlock=true;assert.equal(new ProgressStore(storage).temporaryUnlock,true);
 store.finish('dark','dark10');assert.equal(store.isComplete('dark10'),true);assert.equal(islandStates(dark,store.completed(dark),new Set(),true).get(tenth.node),'finished');
});

test('unmigrated worlds remain unavailable with free play and a previously saved world unlock',()=>{
 const data=new Map([['pvz2-web:free-play','1'],['pvz2-web:unlocked-worlds',JSON.stringify(['modern','sky','dino','eighties'])]]);
 const store=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 const unavailable=maps.filter(m=>!isWorldMigrated(m.id));assert.equal(unavailable.length,4);
 for(const map of unavailable){assert.equal(store.worldUnlocked(map.id),false);assert.ok([...islandStates(map,new Set(),new Set(),true).values()].every(state=>state==='locked'));}
});
