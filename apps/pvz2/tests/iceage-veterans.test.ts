import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,tick,props} from './iceage-fixture';
import {cellX} from '../src/game/level';
import {ICEAGE_LEVELS} from '../src/game/worlds/iceage';
import {ProgressStore} from '../src/shell/progression';

test('Iceage 34–38 keep fixed cards, ice, challenges and rewards',()=>{
 assert.deepEqual([34,35,36,37,38].map(d=>level(d).waves.length),[15,16,10,15,10]);
 assert.ok([34,35,36,37,38].every(d=>ICEAGE_LEVELS['iceage'+d].narrative===null));
 assert.deepEqual(level(34).preset,['sunflower','jackolantern','endurian','stunion']);
 assert.equal(level(34).frozenZombies.length,9);assert.equal(level(35).maxPlantsLost,3);assert.equal(level(35).flowerLine,5);
 assert.equal(level(36).frozenPlants.length,3);assert.equal(level(36).frozenZombies.length,10);
 assert.deepEqual([36,37,38].map(d=>level(d).mowers),[false,false,false]);
 assert.equal(level(37).mustProtect,5);assert.equal(level(37).protectedPlants.length,3);
 assert.deepEqual(level(38).lastStand,{sun:2750,food:2});assert.ok(level(38).blacklist.includes('sunshroom'));assert.ok(level(38).blacklist.includes('sunbean'));assert.equal(level(38).frozenZombies.length,7);
 const data=new Map<string,string>(),store=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 for(const d of [34,35,35])store.finish('iceage','iceage'+d);
 assert.equal(store.campaignRewards().filter(r=>r.id==='spine_iceage').length,1);assert.equal(store.campaignRewards().filter(r=>r.id==='dangerroom_iceage2').length,1);
});
for(const day of [34,35,36,37,38])test(`iceage${day} controlled-damage settlement smoke`,()=>{
 const g=create(day);if(g.preparing)g.startLastStand();
 for(let i=0;i<60000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);
});
test('Endurian stabs on contact, gains armor and can be replanted when damaged',()=>{
 const g=create(34);g.iceage.blocks=[];g.zombies=[];g.addPlant('endurian',2,2);const p=g.plants.at(-1)!,z=g.spawnZombie('iceage_armor2',2,cellX(2)+35),armor=z.armor;
 tick(g,1);assert.ok(z.armor<=armor-20);assert.ok(p.hp<props.plants.endurian.Toughness);
 p.hp=1000;g.sun=1000;g.cooldowns.endurian=0;assert.ok(g.plant('endurian',2,2));assert.equal(p.hp,3000);
 g.zombies=[];g.food=2;assert.ok(g.plantFood(2,2));tick(g,1);assert.equal(p.armor,6000);assert.equal(p.action,'idle');assert.equal(g.plantFood(2,2),false);
});
test('Veteran hunter lobs over the front plant and freezes the leftmost target',()=>{
 const g=create(35);g.plants=[];g.zombies=[];g.iceage.blocks=[];g.addPlant('wallnut',2,1);g.addPlant('wallnut',2,3);const z=g.spawnZombie('iceage_hunter_veteran',2,cellX(7));
 tick(g,2);assert.equal(g.iceage.cold.get('2:1'),1);assert.equal(g.iceage.cold.has('2:3'),false);
 tick(g,12);assert.ok(g.iceage.blocks.some(b=>b.row===2&&b.column===1));g.freeze(z,4);assert.equal(z.frozenUntil,0);assert.ok(z.chilledUntil>g.time);
});
test('Veteran troglobite pushes three frozen hunters that release on thaw',()=>{
 const g=create(36);g.plants=[];g.zombies=[];g.iceage.blocks=[];const z=g.spawnZombie('iceage_troglobite_veteran',2,cellX(4));z.x=cellX(7);
 const blocks=[...g.iceage.blocks];assert.equal(blocks.length,3);assert.ok(g.zombies.filter(t=>t!==z).every(t=>['iceage_hunter','iceage_hunter_veteran'].includes(t.kind)));
 const columns=blocks.map(b=>b.column);tick(g,3);assert.ok(blocks.some((b,i)=>b.column<columns[i]));for(const b of blocks)b.hp=0;tick(g,.1);assert.ok(g.zombies.some(t=>t!==z&&t.hp>0));assert.equal(g.iceage.blocks.length,0);
});
test('Iceage 37 loses only after a protected plant dies; 38 pauses for setup',()=>{
 const g=create(37);tick(g,.1);assert.equal(g.phase,'playing');g.plants.find(p=>p.endangered)!.hp=0;tick(g,.1);assert.equal(g.phase,'lost');assert.equal(g.lossReason,'protected');
 const setup=create(38);tick(setup,5);assert.equal(setup.time,0);assert.equal(setup.sun,2750);assert.ok(setup.plant('peashooter',1,2));setup.startLastStand();tick(setup,1);assert.ok(setup.time>0);
});
