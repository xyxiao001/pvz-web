import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { ProgressStore, completionEvents } from '../src/shell/progression';
import { islandStates, LEVEL_ROUTES } from '../src/shell/navigation';
import { BATTLE_LEVELS, availablePlants } from '../src/game/levels';
import type { WorldMap, ProgressionArt } from '../src/shell/types';
const read = <T>(path: string): T => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const egypt = read<WorldMap>('../public/assets/shell/maps/egypt.json');
const island = (level: string) => egypt.islands.find(n => n.kind === 0 && n.levels.includes(level))!;
const reward = (level: string) => egypt.islands.find(n => n.node === island(level).next[0])!;
function profile() {
  const data = new Map<string,string>();
  const storage = { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => { data.set(k,v); }, removeItem: (k: string) => { data.delete(k); } };
  return { data, storage, progress: new ProgressStore(storage) };
}

test('existing first-level completion keeps its original key and does not replay first-clear presentation', () => {
  const {data,progress} = profile(); data.set('pvz2-web:egypt1-complete','1');
  assert.ok(progress.isComplete('egypt1'));
  progress.finish('egypt','egypt1'); assert.equal(progress.pending(),null);
  assert.deepEqual([...progress.ownedPlants()],[0,1,2,3]);
});

test('first clear persists independently for each level and follows the native finish/path/open timing', () => {
  const {progress,storage} = profile(); progress.finish('egypt','egypt1');
  assert.deepEqual(new ProgressStore(storage).pending(),{world:'egypt',level:'egypt1'});
  assert.deepEqual(completionEvents(egypt,'egypt1',progress.completed(egypt),progress.rewardNodes('egypt')),[
    {at:0,node:island('egypt1').node,action:'finish'},
    {at:.5,node:island('egypt1').node,action:'path'},
    {at:1,node:island('egypt2').node,action:'open'},
  ]);
  progress.finishPresentation(); progress.finish('egypt','egypt2');
  assert.deepEqual([...progress.completed(egypt)],['egypt1','egypt2']);
  assert.equal(progress.pending()!.level,'egypt2');
});

test('Egypt 2 and 3 grant their native plants before opening the following level; replay never duplicates rewards', () => {
  const {progress,storage} = profile(); progress.finish('egypt','egypt1'); progress.finishPresentation();
  for (const [level,next,id] of [['egypt2','egypt3',4],['egypt3','egypt4',5]] as const) {
    progress.finish('egypt',level);
    const r = reward(level);
    assert.equal(r.plant,id);
    assert.equal(islandStates(egypt,progress.completed(egypt),progress.rewardNodes('egypt')).get(island(next).node),'locked');
    const events = completionEvents(egypt,level,progress.completed(egypt),progress.rewardNodes('egypt'));
    assert.deepEqual(events.map(e=>[e.at,e.action]),[[0,'finish'],[.5,'path'],[1,'reward'],[1,'path'],[1.5,'open']]);
    progress.award('egypt',r); progress.award('egypt',r);
    assert.ok(new ProgressStore(storage).ownedPlants().has(id));
    assert.equal(islandStates(egypt,progress.completed(egypt),progress.rewardNodes('egypt')).get(island(next).node),'open');
    progress.finishPresentation(); progress.finish('egypt',level); assert.equal(progress.pending(),null);
  }
  assert.equal(progress.rewards().length,2);
  assert.ok(Object.keys(LEVEL_ROUTES).every(id=>Object.hasOwn(BATTLE_LEVELS,id)));
  assert.equal(LEVEL_ROUTES.egypt2,'egypt2');
});

test('pending reward presentation survives reload without granting the plant twice', () => {
  const {progress,storage} = profile(); progress.finish('egypt','egypt2'); progress.award('egypt',reward('egypt2'));
  const restored = new ProgressStore(storage);
  const events = completionEvents(egypt,restored.pending()!.level,restored.completed(egypt),restored.rewardNodes('egypt'));
  for (const event of events) if(event.action==='reward') restored.award('egypt',egypt.islands.find(n=>n.node===event.node)!);
  restored.finishPresentation();
  assert.equal(restored.rewards().length,1); assert.equal(restored.pending(),null);
});

test('map progression assets retain source provenance and playable idle/transition animations', () => {
  const manifest = read<{outputs:Record<string,{bytes:number;sha256:string}>}>('../progression-provenance.json');
  for(const [path,expected] of Object.entries(manifest.outputs)) {
    const data=readFileSync(new URL('../public/assets/'+path,import.meta.url));
    assert.equal(data.length,expected.bytes);assert.equal(createHash('sha256').update(data).digest('hex'),expected.sha256);
  }
  const art=read<ProgressionArt>('../public/assets/shell/progression.json');
  for(const draw of Object.values(art.plants).flat()) if(draw.kind==='rig') {
    const rig=read<{armature:{name:string;animation:{name:string}[]}[]}>('../public/assets/shell/rigs/'+draw.rig+'/skeleton.json');
    assert.ok(rig.armature.find(a=>a.name===draw.armature)!.animation.some(a=>a.name===draw.animation));
  }
  const rig=read<{armature:{name:string;animation:{name:string}[]}[]}>('../public/assets/shell/rigs/c8bc39c9-9119-4717-bba6-5b54733e98d8/skeleton.json');
  for(const [name,animations] of [['LevelNode',['Finish','Open']],['Path',['Push']]] as const)
    for(const animation of animations) assert.ok(rig.armature.find(a=>a.name===name)!.animation.some(a=>a.name===animation));
});

test('seed choice includes only owned plants registered for the battle and updates on the next entry', () => {
  const level = BATTLE_LEVELS.egypt1;
  assert.deepEqual(availablePlants(level,new Set([0,1])),['peashooter','sunflower']);
  assert.deepEqual(availablePlants(level,new Set([0,1,2,3,4,5])),['peashooter','sunflower','wallnut','potatomine']);
});
