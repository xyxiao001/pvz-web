import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,tick,props} from './iceage-fixture';
import {IceageBoss} from '../src/game/iceage-boss';
import {cellX} from '../src/game/level';
import {ICEAGE_LEVELS} from '../src/game/worlds/iceage';
import {ProgressStore} from '../src/shell/progression';

test('Iceage 29–33 retain native cards, placements, mold and first rewards',()=>{
 assert.deepEqual([29,31,32,33].map(d=>level(d).waves.length),[16,12,16,16]);
 assert.ok([29,31,32,33].every(d=>ICEAGE_LEVELS['iceage'+d].narrative===null));
 assert.deepEqual(level(29).preset,['sunflower','wallnut','firepeashooter','xshot','stunion']);
 assert.equal(level(29).frozenPlants.length,2);assert.equal(level(29).frozenZombies.length,2);
 assert.equal(level(31).frozenZombies.length,9);assert.equal(level(32).mold.length,14);
 assert.ok(level(32).actions[7].length>0);assert.ok(level(33).actions[2].some(a=>a.mode==='conveyor'));assert.ok(level(33).actions[2].some(a=>a.mode==='storm'));
 assert.equal(level(30).boss!.reserved,3);assert.equal(level(33).conveyor!.InitialPlantList[0].PlantType,'primalpeashooter');
 assert.ok(level(33).waves.flat().includes('iceage_armor4'));
 const data=new Map<string,string>(),store=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 for(const d of [29,30,31,30])store.finish('iceage','iceage'+d);
 assert.equal(store.campaignRewards().filter(r=>r.id==='spine_iceage').length,2);assert.equal(store.campaignRewards().filter(r=>r.id==='worldtrophy_iceage').length,1);assert.equal(ICEAGE_LEVELS.iceage30.firstReward.animation,'iceage');
});
for(const day of [29,30,31,32,33])test(`iceage${day} controlled-damage settlement smoke`,()=>{
 const g=create(day);
 for(let i=0;i<60000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000,'water');}
 assert.equal(g.phase,'won');if(day===30)assert.equal(g.boss!.defeated,true);else assert.equal(g.wave,g.level.waves.length);
});
test('Iceage boss shield, regeneration, glacier release and native attacks',()=>{
 const g=create(30),boss=g.boss as IceageBoss;tick(g,5);const hp=boss.zombie.hp;
 boss.hit(2000);assert.equal(boss.shield,0);assert.equal(boss.zombie.hp,hp);assert.equal(boss.animation,'StunStart');
 tick(g,9);assert.equal(boss.shield,1750);assert.equal(g.iceage.blocks.filter(b=>b.glacier).length,5);
 const b=g.iceage.blocks[0];b.hp=0;tick(g,.1);assert.ok(g.zombies.some(z=>z!==boss.zombie));
 const seen=new Set<string>();
 for(let i=0;i<60*90;i++){g.tick(1/60);seen.add(boss.animation);for(const z of g.zombies)if(z!==boss.zombie)g.damage(z,100000);}
 assert.ok([...seen].some(s=>s.startsWith('Summon')));assert.ok([...seen].some(s=>s.startsWith('Wind')));assert.ok(seen.has('Shoot'));assert.equal(g.phase,'playing');
 boss.hit(2000);boss.hit(100000);assert.equal(boss.stage,1);assert.equal(boss.zombie.hp,8000);
});
test('primal peas damage brick armor, stun and fire five plant-food shots',()=>{
 const g=create(33);g.addPlant('primalpeashooter',2,2);const z=g.spawnZombie('iceage_armor4',2,cellX(5));const armor=z.armor;
 tick(g,2);assert.ok(z.armor<armor);assert.ok(z.stunnedUntil!>0);assert.equal(armor,props.armors.iceage_armor4.Toughness);
 g.food=1;assert.ok(g.plantFood(2,2));tick(g,2);const p=g.plants.find(p=>p.kind==='primalpeashooter')!;assert.equal(p.burst,5);assert.notEqual(p.action,'food');
});
