import test from 'node:test';
import assert from 'node:assert/strict';
import { resetProgress } from '../src/platform/save-management';
import { PlayerProfile, PROFILE_KEY } from '../src/platform/profile';
import { Achievements, ACHIEVEMENTS_KEY } from '../src/platform/achievements';
import { ADVENTURE_KEY, ALL_LEVELS_KEY, survivalKey } from '../src/platform/storage';
import { SURVIVAL_MODES, SURVIVAL_SCENES } from '../src/game/config';
import { Game } from '../src/game/model';

function fixture() {
  const values = new Map<string, string>();
  const storage: Storage = {
    get length() { return values.size; },
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => { values.set(key, value); },
    removeItem: key => { values.delete(key); },
    key: index => [...values.keys()][index] ?? null,
    clear: () => { throw new Error('Reset must never clear the whole origin'); },
  };
  const profile = new PlayerProfile(storage);
  Object.assign(profile.data, { run:3, nextLevel:35, completed:34, money:12345, declinedSlots:2,
    sawYeti:true, tacoReceived:true, tacoPending:true, storeIntroduced:true });
  Object.assign(profile.data.purchases, {slots:4,rake:2,gatlingpea:1,roofCleaner:1});
  profile.save();
  storage.setItem(ADVENTURE_KEY,'1-50-complete');
  storage.setItem(ALL_LEVELS_KEY,'true');
  storage.setItem(ACHIEVEMENTS_KEY,JSON.stringify({'home-security':123}));
  for (const mode of SURVIVAL_MODES) for (const scene of SURVIVAL_SCENES)
    storage.setItem(survivalKey(scene,mode),JSON.stringify({scene,mode,round:7}));
  storage.setItem('pvz-battle-display','fill');
  storage.setItem('kr-progress','unrelated');
  return {storage,profile};
}

test('restart resets the adventure and story, preserving purchases, wallet, achievements and all survival saves',()=>{
  const {storage,profile}=fixture();
  const purchases=structuredClone(profile.data.purchases);
  const saves=SURVIVAL_MODES.flatMap(mode=>SURVIVAL_SCENES.map(scene=>survivalKey(scene,mode)))
    .map(key=>[key,storage.getItem(key)] as const);
  const restarted=resetProgress(storage,'adventure');
  assert.equal(restarted.data.run,1);assert.equal(restarted.data.nextLevel,1);assert.equal(restarted.data.completed,0);
  assert.equal(restarted.data.money,12345);assert.deepEqual(restarted.data.purchases,purchases);
  assert.equal(restarted.data.declinedSlots,0);
  for(const key of ['sawYeti','tacoReceived','tacoPending','storeIntroduced'] as const) assert.equal(restarted.data[key],false);
  assert.equal(storage.getItem(ADVENTURE_KEY),null);assert.equal(storage.getItem(ALL_LEVELS_KEY),'false');
  assert.deepEqual(new Achievements(storage).earned,{'home-security':123});
  for(const [key,value] of saves)assert.equal(storage.getItem(key),value,key);
  assert.equal(storage.getItem('pvz-battle-display'),'fill');assert.equal(storage.getItem('kr-progress'),'unrelated');
  assert.deepEqual(new PlayerProfile(storage).data,restarted.data);
  const first=new Game(1,1,'adventure','day',restarted.rules());
  first.start();assert.equal(first.tutorial,'pea');assert.equal(first.repeatAdventure,false);
});

test('clear removes all game progress without legacy reimport or changing unrelated storage',()=>{
  const {storage}=fixture();
  const cleared=resetProgress(storage,'all');
  const fresh = fixture().storage;
  // The expected new profile uses the existing new-player initialization path.
  fresh.removeItem(PROFILE_KEY);fresh.removeItem(ADVENTURE_KEY);
  assert.deepEqual(cleared.data,new PlayerProfile(fresh).data);
  assert.equal(storage.getItem(ADVENTURE_KEY),null);assert.equal(storage.getItem(ALL_LEVELS_KEY),'false');
  assert.equal(storage.getItem(ACHIEVEMENTS_KEY),null);assert.deepEqual(new Achievements(storage).earned,{});
  for(const mode of SURVIVAL_MODES)for(const scene of SURVIVAL_SCENES) assert.equal(storage.getItem(survivalKey(scene,mode)),null);
  assert.equal(storage.getItem('pvz-battle-display'),'fill');assert.equal(storage.getItem('kr-progress'),'unrelated');
  assert.deepEqual(new PlayerProfile(storage).data,cleared.data);
  assert.equal(cleared.data.run,1);assert.equal(cleared.data.money,0);
  assert.ok(Object.values(cleared.data.purchases).every(count=>count===0));
});
