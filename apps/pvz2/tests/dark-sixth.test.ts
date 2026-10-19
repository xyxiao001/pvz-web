import test from 'node:test';
import assert from 'node:assert/strict';
import {create,level,props,tick} from './dark-fixture';
import {cellX} from '../src/game/level';
import {battleEffects} from '../src/rendering/resource-plan';
import {DARK_LEVELS} from '../src/game/worlds/dark';
import {ProgressStore} from '../src/shell/progression';

test('Dark 26–30 retain native modes, budgets, rewards and boss stages',()=>{
 assert.deepEqual([26,27,28,29,30].map(d=>level(d).waves.length),[18,10,20,9,0]);
 assert.deepEqual(level(26).preset,['sunshroom','coconutcannon','iceburg','cherry_bomb','gravebuster']);
 assert.equal(level(27).lastStand!.sun,2750);assert.ok(level(27).blacklist.includes('sunshroom'));
 assert.equal(level(28).extraPotions[0].InitialPotionCount,6);
 assert.deepEqual(props.zombies.zombossmech_dark2.ZombossStages.map(s=>s.HitPoints),[9000,12000,15000]);
 assert.equal(DARK_LEVELS.dark30.narrative,'DARK_30_INTRO');
 const data=new Map<string,string>(),store=new ProgressStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);},removeItem:k=>{data.delete(k);}});
 for(const day of [26,27,29])store.finish('dark','dark'+day);
 assert.deepEqual(store.campaignRewards().map(r=>r.id),['dangerroom_dark2','dangerroom_dark_potion','spine_dark']);
});

for(const day of [26,27,28])test(`Dark ${day} wave and settlement smoke with controlled damage`,()=>{
 const g=create(day);if(g.preparing)g.startLastStand();
 for(let i=0;i<60000&&g.phase==='playing';i++){g.tick(1/60);for(const z of g.zombies)g.damage(z,100000);}
 assert.equal(g.phase,'won');assert.equal(g.wave,g.level.waves.length);
});

test('Dark 29 is playable with revealed locations and the actual limited packets',()=>{
 assert.ok(battleEffects(level(29),['gravebuster']).includes('dirtSpawn'));
 const g=create(29);let seen:{row:number;column:number}[]=[];
 for(let i=0;i<30000&&g.phase==='playing';i++){
  g.tick(1/60);if(g.darkMemory.markers.length)seen=g.darkMemory.markers.map(m=>({row:m.row,column:m.column}));
  while(g.conveyor.length&&seen.length){const c=seen.shift()!;assert.ok(g.plant('gravebuster',c.row,c.column,g.conveyor[0].id));}
 }
 assert.equal(g.phase,'won');assert.equal(g.wave,9);assert.equal(g.kills,0);
 const missed=create(29);tick(missed,25);assert.equal(missed.phase,'lost');
});

test('Veteran king keeps granted zombies abilities; invisibility ends while eating',()=>{
 const g=create(28);g['nextWave']=Infinity;g.graves=[];g.dark.potions=[];
 const king=g.spawnZombie('dark_king_veteran',2,cellX(8)),jester=g.spawnZombie('dark_juggler',2,cellX(7));jester.frozenUntil=100;
 tick(g,6);assert.equal(jester.kind,'dark_juggler');assert.ok(jester.knighted);assert.ok(jester.armor>0);assert.equal(king.hp,1500);
 const potion={id:g.nextEntityId(),group:1,kind:'zombiepotion_invisibility' as const,row:0,column:6,animation:'Idle' as const,at:g.time,dropped:true};g.dark.potions.push(potion);
 const z=g.spawnZombie('dark',0,cellX(6)+8);assert.ok(g.dark.eatPotion(z));z.eating=false;assert.equal(g.dark.invisible(z),true);assert.equal(g.inLane(z,0),false);z.eating=true;assert.equal(g.dark.invisible(z),false);
});

test('Dark 30 plants attack, plant food completes and dragon can settle',()=>{
 const g=create(30);g.graves=[];g.addPlant('guacodile',0,1);g.addPlant('jackolantern',4,1);
 const a=g.spawnZombie('dark',0,cellX(4)),b=g.spawnZombie('dark_armor4',4,cellX(3));a.frozenUntil=b.frozenUntil=100;
 tick(g,3);assert.ok(a.hp<props.zombies.dark.Toughness);assert.ok(b.armor<props.armors.dark_armor4.Toughness);
 g.food=2;assert.ok(g.plantFood(0,1));assert.ok(g.plantFood(4,1));tick(g,4);assert.ok(g.darkFinale.runners.length);assert.ok(g.darkFinale.fires.length);assert.ok(g.plants.every(p=>p.action!=='food'));
 for(let i=0;i<3000&&g.phase==='playing';i++){g.tick(1/60);if(i%60===0)for(const z of g.zombies)g.damage(z,100000);}
 assert.equal(g.phase,'won');
});
