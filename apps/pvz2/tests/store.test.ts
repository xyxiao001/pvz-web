import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { LocalStore, type StoreCatalog } from '../src/shell/store';
import { ProgressStore } from '../src/shell/progression';
import { availablePlants, BATTLE_LEVELS } from '../src/game/levels';
const catalog: StoreCatalog = JSON.parse(readFileSync(new URL('../public/assets/shell/store.json', import.meta.url), 'utf8'));
function storage() { const data = new Map<string,string>(); return { getItem: (key:string) => data.get(key) ?? null, setItem: (key:string,value:string) => { data.set(key,value); }, removeItem: (key:string) => { data.delete(key); } }; }
const item = (name:string) => catalog.items.find(item => item.name === name)!;
test('local currency exchange persists and never resets the initial gem grant', () => {
  const data=storage(), store=new LocalStore(data), coins=catalog.items.find(i=>i.type==='coin'&&i.count===22000)!, gems=catalog.items.find(i=>i.type==='gem'&&i.count===20)!;
  assert.equal(store.read().gem,99999);
  assert.equal(store.buy(gems,()=>true),false);
  assert.equal(store.buy(coins,()=>true),true);
  assert.deepEqual([store.read().coin,store.read().gem],[22000,99927]);
  assert.equal(store.buy(gems,()=>true),true);
  assert.deepEqual([new LocalStore(data).read().coin,new LocalStore(data).read().gem],[6000,99947]);
});
test('one-time upgrades apply alongside earned upgrades and cannot be charged twice',()=>{
  const data=storage(), progress=new ProgressStore(data), store=progress.shop();
  data.setItem('pvz2-web:map-rewards',JSON.stringify([{world:'egypt',node:1,kind:'upgrade',id:0},{world:'egypt',node:2,kind:'upgrade',id:2}]));
  for(const name of ['upgrade_8_slots','upgrade_pf_slots_lvl2','upgrade_starting_sun_lvl2'])assert.equal(store.buy(item(name),()=>true),true);
  assert.equal(store.buy(item('upgrade_8_slots'),()=>true),false);
  assert.equal(store.read().gem,99909);
  assert.deepEqual(new ProgressStore(data).battleBonuses(),{seedSlots:7,foodLimit:5,startingSun:50});
});
test('native plant unlock prerequisites and purchased plants feed normal seed selection',()=>{
  const data=storage(), progress=new ProgressStore(data), store=progress.shop();
  assert.equal(store.buy(item('iceweed'),level=>progress.isComplete(level)),false);
  data.setItem('pvz2-web:egypt9-complete','1');
  assert.equal(store.buy(item('iceweed'),level=>progress.isComplete(level)),true);
  assert.equal(store.buy(item('iceweed'),()=>true),false);
  assert.equal(store.buy(item('snowdrop'),level=>progress.isComplete(level)),false);
  data.setItem('pvz2-web:egypt28-complete','1');
  assert.equal(store.buy(item('snowdrop'),level=>progress.isComplete(level)),true);
  assert.equal(store.read().gem,99939);
  assert.ok(availablePlants(BATTLE_LEVELS.egypt2,new ProgressStore(data).ownedPlants()).includes('iceweed'));
  assert.ok(availablePlants(BATTLE_LEVELS.egypt30,progress.ownedPlants()).includes('snowdrop'));
  assert.equal(availablePlants(BATTLE_LEVELS.egypt1,progress.ownedPlants()).includes('iceweed'),false);
});

test('store art and native prices retain pinned provenance', () => {
  const manifest = JSON.parse(readFileSync(new URL('../store-provenance.json', import.meta.url), 'utf8'));
  assert.equal(manifest.commit, '0e4a05348b6de328e2902a57afa24a3a454a4205');
  for (const [path, value] of Object.entries(manifest.outputs) as [string,{sha256:string}][]) {
    assert.equal(createHash('sha256').update(readFileSync(new URL('../public/assets/' + path, import.meta.url))).digest('hex'),value.sha256,path);
  }
  const skeleton=JSON.parse(readFileSync(new URL('../public/assets/shell/rigs/'+catalog.rig+'/skeleton.json',import.meta.url),'utf8'));
  for(const name of ['page_plant','page_trophy','page_coin','page_gem']) {
    const arm=skeleton.armature.find((a:{name:string})=>a.name===name);
    for(const animation of ['Idle','Chosen'])assert.ok(arm.animation.some((a:{name:string})=>a.name===animation));
  }
});
