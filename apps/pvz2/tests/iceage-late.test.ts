import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,tick} from './iceage-fixture';
import {cellX} from '../src/game/level';
import {ICEAGE_LEVELS} from '../src/game/worlds/iceage';
import {ProgressStore} from '../src/shell/progression';
test('Iceage 19–23 retain native placements, conveyor, protection and rewards',()=>{
 assert.deepEqual([19,20,21,22,23].map(d=>level(d).waves.length),[12,12,14,10,12]);
 assert.equal(level(19).frozenPlants.length,8);assert.deepEqual(level(19).chooserPlants,['sunflower','pepperpult','hotpotato','stunion']);assert.equal(ICEAGE_LEVELS.iceage19.firstReward.plant,'stunion');assert.ok(ICEAGE_LEVELS.iceage19.plants.some(p=>p.id===131));
 assert.deepEqual(level(21).conveyor!.InitialPlantList.map(p=>p.PlantType),['firepeashooter']);assert.equal(level(21).frozenPlants.length,6);assert.equal(level(22).frozenPlants.length,3);assert.equal(level(23).mustProtect,5);assert.equal(level(23).protectedPlants.length,5);
 const data=new Map<string,string>(),store=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 for(const day of [20,22]){store.finish('iceage',`iceage${day}`);store.finish('iceage',`iceage${day}`);}assert.deepEqual(store.campaignRewards().map(r=>r.id),['dangerroom_iceage','spine_iceage']);
});
for(const day of [19,20,21,22,23])test(`iceage${day} controlled-damage wave and settlement smoke`,()=>{
 const g=create(day);for(let i=0;i<60000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);
});
test('fire peashooter shoots, warms adjacent ice and completes lane plant food',()=>{
 const g=create(21);g.plants=[];g.zombies=[];g.iceage.blocks=[];g.addPlant('firepeashooter',2,2);g.addPlant('wallnut',1,2);g.iceage.freeze(1,2);const z=g.spawnZombie('iceage_armor2',2,cellX(5)),hp=z.hp+z.armor;tick(g,2);assert.ok(z.hp+z.armor<hp);assert.equal(g.iceage.blocks[0].hp,400);
 g.food=1;g.plantFood(2,2);tick(g,6);assert.ok(z.hp<=0);assert.equal(g.plants.find(p=>p.kind==='firepeashooter')!.animation,'Idle');assert.equal(g.iceage.blocks.length,0);
});
test('weasel hoarder releases once after damage; lethal damage waits for release and weasels ignore sliders',()=>{
 const g=create(22);g.zombies=[];g.plants=[];g.iceage.blocks=[];const z=g.spawnZombie('iceage_weaselhoarder',2,cellX(7));g.damage(z,45);assert.ok(z.weasel!.exploding);tick(g,2.5);assert.ok(g.zombies.some(z=>z.kind==='iceage_weasel'));g.damage(z,1000);tick(g,3);assert.ok(!g.zombies.includes(z));assert.equal(g.iceageCombat.weaselThrowers.length,0);
 const slider=g.level.sliders[0],w=g.spawnZombie('iceage_weasel',slider.row,cellX(slider.column));tick(g,1);assert.equal(w.row,slider.row);assert.ok(w.x<cellX(slider.column)-80);g.freeze(w,2);assert.equal(w.frozenUntil,0);assert.ok(w.chilledUntil>g.time);
});
