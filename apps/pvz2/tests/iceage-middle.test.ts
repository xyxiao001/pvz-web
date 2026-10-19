import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,tick} from './iceage-fixture';
import {cellX} from '../src/game/level';
import {BATTLE_LEVELS} from '../src/game/levels';
import {ProgressStore} from '../src/shell/progression';

test('Iceage 9–13 preserve native waves, preselected chooser, last stand, flowers and rewards',()=>{
 assert.deepEqual([9,10,11,12,13].map(d=>level(d).waves.length),[12,12,16,10,16]);
 assert.deepEqual(level(11).chooserPlants,['sunshroom','threepeater','chilibean','hotpotato','chardguard']);assert.equal(level(11).frozenZombies.length,4);
 assert.equal(level(12).lastStand!.sun,1900);assert.equal(level(12).lastStand!.food,1);assert.equal(level(13).flowerLine,1);
 assert.equal(BATTLE_LEVELS.iceage11.firstReward.plant,'chardguard');assert.equal(BATTLE_LEVELS.iceage10.narrative,'ICEAGE_INTRO_CHARDGUARD');
 const data=new Map<string,string>(),store=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});store.finish('iceage','iceage12');store.finish('iceage','iceage12');assert.equal(store.campaignRewards().filter(r=>r.id==='spine_iceage').length,1);
});
for(const day of [9,10,11,12,13])test(`iceage${day} controlled-damage wave and settlement smoke`,()=>{
 const g=create(day);if(g.preparing)g.startLastStand();for(let i=0;i<60000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);
});
test('dodo flies over a wallnut, ignores sliders and lands past the obstacle',()=>{
 const g=create(9);g.addPlant('wallnut',2,4);const p=g.plants[0],z=g.spawnZombie('iceage_dodo',2,cellX(5));tick(g,1.5);assert.equal(z.dodo!.flying,true);tick(g,7);assert.equal(p.hp,g.props.plants.wallnut.Toughness);assert.ok(z.x<cellX(4));assert.equal(z.dodo!.flying,false);
 const slider=g.level.sliders[0],other=g.spawnZombie('iceage_dodo',slider.row,cellX(slider.column));g.iceage.tickZombie(other);assert.equal(g.iceage.slides.has(other.id),false);
});
test('iceage giant throws three imps at native health thresholds then smashes plants',()=>{
 const g=create(13),z=g.spawnZombie('iceage_gargantuar',2,cellX(7));
 for(const hp of [2800,2100,1400]){g.damage(z,z.hp-hp);tick(g,1.6);}
 assert.equal(z.west!.iceageImps,3);assert.equal(z.west!.imp,false);assert.equal(g.zombies.filter(z=>z.kind==='iceage_imp').length,3);
 g.addPlant('wallnut',2,6);z.x=cellX(6)+40;tick(g,1.5);assert.equal(g.plants.filter(p=>p.kind==='wallnut').length,0);
});
